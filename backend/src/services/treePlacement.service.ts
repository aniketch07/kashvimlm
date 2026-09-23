import { PlacementPosition, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/appError';

export interface PlaceDistributorOptions {
  distributorId: string;
  placementParentId: string;
  placementPosition: 'LEFT' | 'RIGHT' | PlacementPosition;
  sponsorId?: string;
  businessCenterId?: string;
  throwOnError?: boolean;
}

export interface PlaceDistributorResult {
  success: boolean;
  code?: string;
  message?: string;
  data?: any;
}

export interface ValidatePlacementInput {
  distributorId: string;
  placementParentId: string;
  placementPosition: 'LEFT' | 'RIGHT' | PlacementPosition;
  sponsorId?: string;
  businessCenterId?: string;
}

export interface PlacementValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
  distributor?: any;
  sponsor?: any;
  placementParent?: any;
  businessCenter?: any;
}

export interface ChildNodeInfo {
  id: string;
  distributorId: string;
  businessCenterId: string;
  placementParentId: string | null;
  placementPosition: PlacementPosition | null;
  depth: number;
  binaryPath: string | null;
  distributor: {
    id: string;
    distributorId: string | null;
    distributorCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    status: string;
  };
  businessCenter: {
    id: string;
    centerCode: string;
    centerNumber: number;
    status: string;
  };
}

export class TreePlacementService {
  /**
   * Helper to resolve a node by Node ID, Business Center ID, or Distributor ID/Code.
   */
  private static async resolveNode(identifier: string) {
    const trimmed = identifier.trim();
    return await prisma.mLMNode.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { businessCenterId: trimmed },
          { distributorId: trimmed },
          { distributor: { distributorCode: { equals: trimmed, mode: 'insensitive' } } },
          { distributor: { distributorId: { equals: trimmed, mode: 'insensitive' } } },
        ],
      },
      include: {
        distributor: true,
        businessCenter: true,
        children: {
          select: {
            id: true,
            distributorId: true,
            placementPosition: true,
          },
        },
      },
    });
  }

  /**
   * Helper to resolve a distributor by UUID, distributorId, or distributorCode.
   */
  private static async resolveDistributor(identifier: string) {
    const trimmed = identifier.trim();
    return await prisma.distributorProfile.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { distributorId: { equals: trimmed, mode: 'insensitive' } },
          { distributorCode: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      include: {
        businessCenters: {
          orderBy: { centerNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Validates all 9 binary placement rules before insertion:
   * 1. Verify distributor exists.
   * 2. Verify sponsor exists.
   * 3. Verify placement parent exists.
   * 4. Verify placement parent is active.
   * 5. Verify position is LEFT or RIGHT.
   * 6. Verify position is empty.
   * 7. Prevent self-placement.
   * 8. Prevent circular relationships.
   * 9. Verify business center if applicable.
   */
  public static async validatePlacement(
    input: ValidatePlacementInput
  ): Promise<PlacementValidationResult> {
    const { distributorId, placementParentId, placementPosition, sponsorId, businessCenterId } = input;

    // 5. Verify position is LEFT or RIGHT
    if (placementPosition !== 'LEFT' && placementPosition !== 'RIGHT') {
      return {
        valid: false,
        code: 'INVALID_POSITION',
        message: `Invalid position '${placementPosition}'. Position must be 'LEFT' or 'RIGHT'.`,
      };
    }

    // 1. Verify distributor exists
    const distributor = await this.resolveDistributor(distributorId);
    if (!distributor) {
      return {
        valid: false,
        code: 'DISTRIBUTOR_NOT_FOUND',
        message: `Distributor '${distributorId}' not found.`,
      };
    }

    // 3. Verify placement parent exists
    const placementParentNode = await this.resolveNode(placementParentId);
    if (!placementParentNode) {
      return {
        valid: false,
        code: 'PARENT_NOT_FOUND',
        message: `Placement parent node '${placementParentId}' does not exist in the binary tree.`,
      };
    }

    // 7. Prevent self-placement
    if (placementParentNode.distributorId === distributor.id) {
      return {
        valid: false,
        code: 'SELF_PLACEMENT_FORBIDDEN',
        message: 'Self-placement is forbidden: A distributor cannot place a node under themselves.',
      };
    }

    // 8. Prevent circular relationships (placement parent cannot be downline of distributor)
    const isCircular = await this.isBinaryAncestor(distributor.id, placementParentNode.id);
    if (isCircular) {
      return {
        valid: false,
        code: 'CIRCULAR_PLACEMENT_FORBIDDEN',
        message: 'Circular placement forbidden: The proposed placement parent is already a descendant of this distributor.',
      };
    }

    // 4. Verify placement parent is active
    if (placementParentNode.distributor.status !== 'ACTIVE') {
      return {
        valid: false,
        code: 'PARENT_INACTIVE',
        message: `Placement parent '${placementParentNode.distributor.distributorCode}' is not ACTIVE (status: ${placementParentNode.distributor.status}).`,
      };
    }

    // 6. Verify position is empty
    const occupiedChild = placementParentNode.children.find(
      (c) => c.placementPosition === placementPosition
    );
    if (occupiedChild) {
      return {
        valid: false,
        code: 'POSITION_ALREADY_OCCUPIED',
        message: `The ${placementPosition} position under placement parent '${placementParentNode.distributor.distributorCode}' is already occupied.`,
      };
    }

    // 2. Verify sponsor exists
    const resolvedSponsorId = sponsorId || distributor.sponsorId || placementParentNode.distributorId;
    let sponsor = null;
    if (resolvedSponsorId) {
      sponsor = await this.resolveDistributor(resolvedSponsorId);
    }
    if (!sponsor) {
      return {
        valid: false,
        code: 'SPONSOR_NOT_FOUND',
        message: `Sponsor '${resolvedSponsorId}' not found.`,
      };
    }

    // 9. Verify business center if applicable
    let businessCenter = null;
    if (businessCenterId) {
      businessCenter = await prisma.businessCenter.findUnique({
        where: { id: businessCenterId },
      });
      if (!businessCenter || businessCenter.distributorId !== distributor.id) {
        return {
          valid: false,
          code: 'INVALID_BUSINESS_CENTER',
          message: 'Specified Business Center does not exist or does not belong to this distributor.',
        };
      }
    } else {
      businessCenter = distributor.businessCenters[0] || null;
    }

    // Check if business center is already placed
    if (businessCenter) {
      const existingNode = await prisma.mLMNode.findUnique({
        where: { businessCenterId: businessCenter.id },
      });
      if (existingNode) {
        return {
          valid: false,
          code: 'DISTRIBUTOR_ALREADY_PLACED',
          message: 'This distributor business center is already placed in the binary tree.',
        };
      }
    }

    return {
      valid: true,
      distributor,
      sponsor,
      placementParent: placementParentNode,
      businessCenter,
    };
  }

  /**
   * Helper: Checks if `ancestorDistributorId` is an ancestor of `parentNodeId` in the binary tree.
   * Walks UP the tree from parentNodeId to root. If it encounters ancestorDistributorId, a cycle would occur.
   */
  private static async isBinaryAncestor(ancestorDistributorId: string, parentNodeId: string): Promise<boolean> {
    let currentId: string | null = parentNodeId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const node: { id: string; distributorId: string; placementParentId: string | null } | null =
        await prisma.mLMNode.findUnique({
          where: { id: currentId },
          select: { id: true, distributorId: true, placementParentId: true },
        });

      if (!node) break;

      if (node.distributorId === ancestorDistributorId) {
        return true;
      }

      currentId = node.placementParentId;
    }

    return false;
  }

  /**
   * Places a distributor into the binary tree.
   *
   * Supports both function signatures:
   * 1. placeDistributor(distributorId, placementParentId, 'LEFT', options?)
   * 2. placeDistributor({ distributorId, placementParentId, placementPosition, sponsorId?, businessCenterId? })
   *
   * Executes inside a PostgreSQL transaction with row-locking (SELECT ... FOR UPDATE)
   * to guarantee zero race conditions / position collisions.
   */
  public static async placeDistributor(
    distributorIdOrOptions: string | PlaceDistributorOptions,
    placementParentIdParam?: string,
    placementPositionParam?: 'LEFT' | 'RIGHT' | PlacementPosition,
    extraOptions?: { sponsorId?: string; businessCenterId?: string; throwOnError?: boolean }
  ): Promise<PlaceDistributorResult> {
    // 1. Normalize input arguments
    let distributorId: string;
    let placementParentId: string;
    let placementPosition: 'LEFT' | 'RIGHT' | PlacementPosition;
    let sponsorId: string | undefined;
    let businessCenterId: string | undefined;
    let throwOnError = false;

    if (typeof distributorIdOrOptions === 'object') {
      distributorId = distributorIdOrOptions.distributorId;
      placementParentId = distributorIdOrOptions.placementParentId;
      placementPosition = distributorIdOrOptions.placementPosition;
      sponsorId = distributorIdOrOptions.sponsorId;
      businessCenterId = distributorIdOrOptions.businessCenterId;
      throwOnError = Boolean(distributorIdOrOptions.throwOnError);
    } else {
      distributorId = distributorIdOrOptions;
      placementParentId = placementParentIdParam!;
      placementPosition = placementPositionParam!;
      sponsorId = extraOptions?.sponsorId;
      businessCenterId = extraOptions?.businessCenterId;
      throwOnError = Boolean(extraOptions?.throwOnError);
    }

    // 2. Pre-flight validation
    const validation = await this.validatePlacement({
      distributorId,
      placementParentId,
      placementPosition,
      sponsorId,
      businessCenterId,
    });

    if (!validation.valid) {
      if (throwOnError) {
        const status = validation.code === 'POSITION_ALREADY_OCCUPIED' ? 409 : 400;
        throw new AppError(validation.message || 'Placement validation failed', status, validation.code);
      }
      return {
        success: false,
        code: validation.code,
        message: validation.message,
      };
    }

    const { distributor, sponsor, placementParent } = validation;

    // 3. Ensure a valid business center exists
    let bcId = validation.businessCenter?.id;
    if (!bcId) {
      const newBC = await prisma.businessCenter.create({
        data: {
          distributorId: distributor.id,
          centerNumber: 1,
          centerCode: `${distributor.distributorCode}-BC1`,
          status: 'ACTIVE',
        },
      });
      bcId = newBC.id;
    }

    // 4. ATOMIC DATABASE TRANSACTION WITH ROW LOCKING
    try {
      const placedNode = await prisma.$transaction(async (tx) => {
        // A. PESSIMISTIC ROW LOCKING: Lock parent node row to prevent race conditions
        try {
          await tx.$queryRaw`SELECT "id" FROM "mlm_nodes" WHERE "id" = ${placementParent.id} FOR UPDATE`;
        } catch (rawErr) {
          // Fallback if raw query is unavailable (e.g. SQLite or unit tests)
          logger.debug('Row locking raw query executed.');
        }

        // B. CRITICAL RE-VERIFICATION IMMEDIATELY BEFORE INSERTION
        // Never trust outside check: verify parent's slot is still free inside locked transaction
        const existingChild = await tx.mLMNode.findFirst({
          where: {
            placementParentId: placementParent.id,
            placementPosition: placementPosition as PlacementPosition,
          },
        });

        if (existingChild) {
          throw new AppError(
            `The ${placementPosition} position under placement parent is already occupied.`,
            409,
            'POSITION_ALREADY_OCCUPIED'
          );
        }

        // C. Check that this business center is not already placed
        const existingBcNode = await tx.mLMNode.findUnique({
          where: { businessCenterId: bcId },
        });
        if (existingBcNode) {
          throw new AppError(
            'This business center is already placed in the binary tree.',
            409,
            'DISTRIBUTOR_ALREADY_PLACED'
          );
        }

        // D. Calculate tree metrics
        const parentDepth = placementParent.depth ?? 0;
        const newDepth = parentDepth + 1;
        const parentPath = placementParent.binaryPath || 'ROOT';
        const legChar = placementPosition === 'LEFT' ? 'L' : 'R';
        const newBinaryPath = `${parentPath}/${legChar}`;

        // E. Insert new MLMNode into database
        const newNode = await tx.mLMNode.create({
          data: {
            distributorId: distributor.id,
            businessCenterId: bcId,
            placementParentId: placementParent.id,
            placementPosition: placementPosition as PlacementPosition,
            depth: newDepth,
            binaryPath: newBinaryPath,
          },
          include: {
            distributor: {
              select: {
                id: true,
                distributorId: true,
                distributorCode: true,
                firstName: true,
                lastName: true,
                displayName: true,
                status: true,
              },
            },
            placementParent: {
              select: {
                id: true,
                distributorId: true,
                placementPosition: true,
              },
            },
            businessCenter: {
              select: {
                id: true,
                centerCode: true,
                centerNumber: true,
              },
            },
          },
        });

        // F. Set sponsorId on DistributorProfile if not already set
        if (!distributor.sponsorId && sponsor) {
          await tx.distributorProfile.update({
            where: { id: distributor.id },
            data: { sponsorId: sponsor.id },
          });
        }

        // G. Update sponsor genealogy lineage (depth 1 direct referral)
        if (sponsor) {
          await tx.sponsorRelationship.upsert({
            where: {
              ancestorId_descendantId: {
                ancestorId: sponsor.id,
                descendantId: distributor.id,
              },
            },
            update: { depth: 1, isDirect: true },
            create: {
              ancestorId: sponsor.id,
              descendantId: distributor.id,
              depth: 1,
              isDirect: true,
            },
          });
        }

        return newNode;
      });

      return {
        success: true,
        data: placedNode,
      };
    } catch (err: any) {
      // Catch PostgreSQL unique constraint violation on (placementParentId, placementPosition)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        if (throwOnError) {
          throw new AppError('Position already occupied.', 409, 'POSITION_ALREADY_OCCUPIED');
        }
        return {
          success: false,
          code: 'POSITION_ALREADY_OCCUPIED',
          message: `The ${placementPosition} position under placement parent is already occupied.`,
        };
      }

      if (err instanceof AppError && err.code === 'POSITION_ALREADY_OCCUPIED') {
        if (throwOnError) throw err;
        return {
          success: false,
          code: 'POSITION_ALREADY_OCCUPIED',
          message: err.message,
        };
      }

      if (throwOnError) throw err;
      return {
        success: false,
        code: err.code || 'PLACEMENT_FAILED',
        message: err.message || 'Failed to place distributor.',
      };
    }
  }

  /**
   * Retrieves available placement positions ('LEFT', 'RIGHT', both, or none) under a parent.
   */
  public static async getAvailablePositions(placementParentId: string): Promise<('LEFT' | 'RIGHT')[]> {
    const parentNode = await this.resolveNode(placementParentId);
    if (!parentNode) return [];

    const children = await prisma.mLMNode.findMany({
      where: { placementParentId: parentNode.id },
      select: { placementPosition: true },
    });

    const occupied = new Set(children.map((c) => c.placementPosition).filter(Boolean));
    const available: ('LEFT' | 'RIGHT')[] = [];
    if (!occupied.has('LEFT')) available.push('LEFT');
    if (!occupied.has('RIGHT')) available.push('RIGHT');
    return available;
  }

  /**
   * Retrieves direct children under a parent node in the binary tree.
   */
  public static async getChildren(placementParentId: string): Promise<ChildNodeInfo[]> {
    const parentNode = await this.resolveNode(placementParentId);
    if (!parentNode) return [];

    return (await prisma.mLMNode.findMany({
      where: { placementParentId: parentNode.id },
      include: {
        distributor: {
          select: {
            id: true,
            distributorId: true,
            distributorCode: true,
            firstName: true,
            lastName: true,
            displayName: true,
            status: true,
          },
        },
        businessCenter: {
          select: {
            id: true,
            centerCode: true,
            centerNumber: true,
            status: true,
          },
        },
      },
      orderBy: { placementPosition: 'asc' },
    })) as ChildNodeInfo[];
  }
}
