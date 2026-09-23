import { prisma } from '../config/database';
import { AppError } from '../utils/appError';

export interface SponsorValidationData {
  sponsor: {
    id: string;
    distributorId: string;
    name: string;
    status: string;
  };
  availablePositions: ('LEFT' | 'RIGHT')[];
}

export class SponsorService {
  /**
   * Validates a sponsor by Distributor ID, Code, or UUID.
   *
   * 1. Finds sponsor by distributorId, distributorCode, or id.
   * 2. Verifies sponsor existence (throws SPONSOR_NOT_FOUND if missing).
   * 3. Checks sponsor status (throws SPONSOR_INACTIVE if not ACTIVE).
   * 4. Retrieves safe basic information (no private credentials or personal data).
   * 5. Checks available binary tree positions (LEFT, RIGHT, or both/none).
   */
  public static async validateSponsor(sponsorIdentifier: string): Promise<SponsorValidationData> {
    const identifier = sponsorIdentifier.trim();

    if (!identifier) {
      throw AppError.badRequest('Sponsor ID is required', 'SPONSOR_ID_REQUIRED');
    }

    // 1. Find sponsor by distributorId, distributorCode, or id
    const sponsor = await prisma.distributorProfile.findFirst({
      where: {
        OR: [
          { distributorId: { equals: identifier, mode: 'insensitive' } },
          { distributorCode: { equals: identifier, mode: 'insensitive' } },
          { id: identifier },
        ],
      },
      select: {
        id: true,
        distributorId: true,
        distributorCode: true,
        firstName: true,
        lastName: true,
        displayName: true,
        status: true,
        mlmNodes: {
          select: {
            id: true,
            children: {
              select: {
                placementPosition: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // 2. Check if sponsor exists
    if (!sponsor) {
      throw new AppError('Sponsor not found', 404, 'SPONSOR_NOT_FOUND');
    }

    // 3. Check sponsor status
    if (sponsor.status !== 'ACTIVE') {
      throw new AppError('Sponsor is inactive', 400, 'SPONSOR_INACTIVE');
    }

    // 4. Calculate available LEFT / RIGHT binary placement positions under primary node
    const primaryNode = sponsor.mlmNodes[0];
    const availablePositions: ('LEFT' | 'RIGHT')[] = [];

    if (primaryNode && primaryNode.children) {
      const occupiedPositions = new Set(
        primaryNode.children
          .map((c) => c.placementPosition)
          .filter((pos): pos is 'LEFT' | 'RIGHT' => Boolean(pos))
      );

      if (!occupiedPositions.has('LEFT')) {
        availablePositions.push('LEFT');
      }
      if (!occupiedPositions.has('RIGHT')) {
        availablePositions.push('RIGHT');
      }
    } else {
      // If sponsor has no tree node yet, both positions are available by default
      availablePositions.push('LEFT', 'RIGHT');
    }

    // 5. Build clean, non-sensitive public sponsor object
    const displayName =
      sponsor.displayName?.trim() ||
      `${sponsor.firstName} ${sponsor.lastName}`.trim() ||
      'Distributor';

    const distributorId = sponsor.distributorId || sponsor.distributorCode;

    return {
      sponsor: {
        id: sponsor.id,
        distributorId,
        name: displayName,
        status: sponsor.status,
      },
      availablePositions,
    };
  }
}
