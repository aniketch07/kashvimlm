import { PlacementPosition, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/appError';
import { PlaceDistributorInput } from '../validators/mlmTree.validators';

export interface BinaryTreeNode {
  nodeId: string;
  depth: number;
  position: PlacementPosition | null;
  binaryPath: string | null;
  businessCenter: {
    id: string;
    centerCode: string;
    centerNumber: number;
    status: string;
    leftVolume: number;
    rightVolume: number;
    accumulatedLeftVolume: number;
    accumulatedRightVolume: number;
  };
  distributor: {
    id: string;
    distributorCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    status: string;
    rankName?: string;
    sponsorCode?: string;
  };
  leftChild: BinaryTreeNode | null;
  rightChild: BinaryTreeNode | null;
}

export class MlmTreeService {
  /**
   * Places a Distributor's Business Center into the Binary MLM Tree.
   * Enforces 6 strict validation constraints:
   * 1. Prevent self-sponsorship
   * 2. Prevent self-placement
   * 3. Prevent duplicate placement
   * 4. Prevent invalid parent
   * 5. Prevent circular relationships (both binary & sponsor trees)
   * 6. Prevent position collision (both LEFT & RIGHT occupied or target leg occupied)
   */
  public static async placeDistributor(input: PlaceDistributorInput) {
    const { distributorId, businessCenterId, sponsorId, placementParentId, placementPosition } = input;

    // ----------------------------------------------------
    // CONSTRAINT 1: Prevent self-sponsorship
    // ----------------------------------------------------
    if (distributorId === sponsorId) {
      throw AppError.badRequest('Self-sponsorship is forbidden: A distributor cannot sponsor themselves.');
    }

    // Verify distributor exists
    const distributor = await prisma.distributorProfile.findUnique({
      where: { id: distributorId },
      include: { user: true },
    });
    if (!distributor) {
      throw AppError.notFound('Distributor not found.');
    }

    // Verify sponsor exists
    const sponsor = await prisma.distributorProfile.findUnique({
      where: { id: sponsorId },
    });
    if (!sponsor) {
      throw AppError.notFound('Sponsor not found: The specified sponsor does not exist.');
    }

    // ----------------------------------------------------
    // CONSTRAINT 5A: Prevent circular sponsorship
    // ----------------------------------------------------
    const circularSponsorCheck = await prisma.sponsorRelationship.findUnique({
      where: {
        ancestorId_descendantId: {
          ancestorId: distributorId,
          descendantId: sponsorId,
        },
      },
    });
    if (circularSponsorCheck) {
      throw AppError.badRequest(
        'Circular sponsorship forbidden: Proposed sponsor is already a descendant in this distributor’s sponsorship downline.'
      );
    }

    // Verify Business Center belongs to distributor
    const businessCenter = await prisma.businessCenter.findUnique({
      where: { id: businessCenterId },
    });
    if (!businessCenter) {
      throw AppError.notFound('Business Center not found.');
    }
    if (businessCenter.distributorId !== distributorId) {
      throw AppError.badRequest('Business Center does not belong to the specified distributor.');
    }

    // ----------------------------------------------------
    // CONSTRAINT 3: Prevent duplicate placement
    // ----------------------------------------------------
    const existingNode = await prisma.mLMNode.findUnique({
      where: { businessCenterId },
    });
    if (existingNode) {
      throw AppError.conflict(
        'Duplicate placement forbidden: This business center is already placed in the binary tree.'
      );
    }

    // ----------------------------------------------------
    // CONSTRAINT 4: Prevent invalid parent
    // ----------------------------------------------------
    const placementParent = await prisma.mLMNode.findUnique({
      where: { id: placementParentId },
      include: {
        distributor: true,
        businessCenter: true,
        children: true,
      },
    });
    if (!placementParent) {
      throw AppError.notFound('Invalid parent: The specified placement parent node does not exist in the binary tree.');
    }

    // ----------------------------------------------------
    // CONSTRAINT 2: Prevent self-placement
    // ----------------------------------------------------
    if (placementParent.distributorId === distributorId) {
      throw AppError.badRequest(
        'Self-placement is forbidden: A distributor cannot place a node under their own node directly.'
      );
    }

    // ----------------------------------------------------
    // CONSTRAINT 5B: Prevent circular binary placement
    // ----------------------------------------------------
    await this.validateNoBinaryCircularReference(placementParent.id, distributorId);

    // ----------------------------------------------------
    // CONSTRAINT 6: Prevent both LEFT & RIGHT occupied / Position collision
    // ----------------------------------------------------
    const children = placementParent.children;
    if (children.length >= 2) {
      throw AppError.conflict(
        'Both LEFT and RIGHT positions under this placement parent are already occupied.'
      );
    }

    const occupiedPosition = children.find((c) => c.placementPosition === placementPosition);
    if (occupiedPosition) {
      throw AppError.conflict(
        `The ${placementPosition} position under placement parent (ID: ${placementParentId}) is already occupied.`
      );
    }

    // ----------------------------------------------------
    // TRANSACTION: Atomic Node Placement & Sponsor Lineage
    // ----------------------------------------------------
    const nodeDepth = placementParent.depth + 1;
    const parentPath = placementParent.binaryPath || 'ROOT';
    const legIndicator = placementPosition === 'LEFT' ? 'L' : 'R';
    const binaryPath = `${parentPath}/${legIndicator}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Create MLM Node
      const newNode = await tx.mLMNode.create({
        data: {
          businessCenterId,
          distributorId,
          placementParentId,
          placementPosition,
          depth: nodeDepth,
          binaryPath,
        },
        include: {
          businessCenter: true,
          distributor: true,
          placementParent: {
            include: {
              distributor: true,
            },
          },
        },
      });

      // 2. Set sponsorId on DistributorProfile if not already established
      if (!distributor.sponsorId) {
        await tx.distributorProfile.update({
          where: { id: distributorId },
          data: { sponsorId },
        });
      }

      // 3. Update Sponsor Relationships (Lineage Hierarchy)
      // Direct relationship (Depth 1)
      await tx.sponsorRelationship.upsert({
        where: {
          ancestorId_descendantId: {
            ancestorId: sponsorId,
            descendantId: distributorId,
          },
        },
        update: { depth: 1, isDirect: true },
        create: {
          ancestorId: sponsorId,
          descendantId: distributorId,
          depth: 1,
          isDirect: true,
        },
      });

      // Propagate all ancestors of the sponsor down to this distributor
      const sponsorAncestors = await tx.sponsorRelationship.findMany({
        where: { descendantId: sponsorId },
      });

      for (const ancestor of sponsorAncestors) {
        await tx.sponsorRelationship.upsert({
          where: {
            ancestorId_descendantId: {
              ancestorId: ancestor.ancestorId,
              descendantId: distributorId,
            },
          },
          update: { depth: ancestor.depth + 1, isDirect: false },
          create: {
            ancestorId: ancestor.ancestorId,
            descendantId: distributorId,
            depth: ancestor.depth + 1,
            isDirect: false,
          },
        });
      }

      logger.info(
        {
          nodeId: newNode.id,
          distributorId,
          sponsorId,
          placementParentId,
          placementPosition,
          binaryPath,
        },
        'Distributor successfully placed in binary tree'
      );

      return newNode;
    });
  }

  /**
   * Helper to ensure the target parent is not already a descendant of the distributor's nodes.
   * Walks up the placement parent chain to ensure no cycle is introduced.
   */
  private static async validateNoBinaryCircularReference(parentId: string, targetDistributorId: string): Promise<void> {
    let currentParentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw AppError.badRequest('Circular reference detected in existing binary tree structure.');
      }
      visited.add(currentParentId);

      const node: { id: string; distributorId: string; placementParentId: string | null } | null =
        await prisma.mLMNode.findUnique({
          where: { id: currentParentId },
          select: { id: true, distributorId: true, placementParentId: true },
        });

      if (!node) break;

      if (node.distributorId === targetDistributorId) {
        throw AppError.badRequest(
          'Circular relationships forbidden: Proposed placement parent is a descendant of this distributor in the binary tree.'
        );
      }

      currentParentId = node.placementParentId;
    }
  }

  /**
   * Fetches the visual binary tree structure up to the requested depth.
   */
  public static async getBinaryTree(rootNodeIdOrBcId: string, maxDepth = 3): Promise<BinaryTreeNode> {
    // Look up by node ID or by businessCenterId
    const rootNode = await prisma.mLMNode.findFirst({
      where: {
        OR: [{ id: rootNodeIdOrBcId }, { businessCenterId: rootNodeIdOrBcId }],
      },
      include: {
        businessCenter: true,
        distributor: {
          include: {
            currentRank: true,
            sponsor: true,
          },
        },
      },
    });

    if (!rootNode) {
      throw AppError.notFound('Root node for binary tree not found.');
    }

    return await this.buildSubtree(rootNode, 1, maxDepth);
  }

  /**
   * Recursively builds a subtree representation up to maxDepth.
   */
  private static async buildSubtree(node: any, currentDepth: number, maxDepth: number): Promise<BinaryTreeNode> {
    let leftChild: BinaryTreeNode | null = null;
    let rightChild: BinaryTreeNode | null = null;

    if (currentDepth < maxDepth) {
      const children = await prisma.mLMNode.findMany({
        where: { placementParentId: node.id },
        include: {
          businessCenter: true,
          distributor: {
            include: {
              currentRank: true,
              sponsor: true,
            },
          },
        },
      });

      const left = children.find((c) => c.placementPosition === 'LEFT');
      const right = children.find((c) => c.placementPosition === 'RIGHT');

      if (left) {
        leftChild = await this.buildSubtree(left, currentDepth + 1, maxDepth);
      }
      if (right) {
        rightChild = await this.buildSubtree(right, currentDepth + 1, maxDepth);
      }
    }

    return {
      nodeId: node.id,
      depth: node.depth,
      position: node.placementPosition,
      binaryPath: node.binaryPath,
      businessCenter: {
        id: node.businessCenter.id,
        centerCode: node.businessCenter.centerCode,
        centerNumber: node.businessCenter.centerNumber,
        status: node.businessCenter.status,
        leftVolume: Number(node.businessCenter.leftVolume),
        rightVolume: Number(node.businessCenter.rightVolume),
        accumulatedLeftVolume: Number(node.businessCenter.accumulatedLeftVolume),
        accumulatedRightVolume: Number(node.businessCenter.accumulatedRightVolume),
      },
      distributor: {
        id: node.distributor.id,
        distributorCode: node.distributor.distributorCode,
        firstName: node.distributor.firstName,
        lastName: node.distributor.lastName,
        displayName: node.distributor.displayName,
        status: node.distributor.status,
        rankName: node.distributor.currentRank?.name,
        sponsorCode: node.distributor.sponsor?.distributorCode,
      },
      leftChild,
      rightChild,
    };
  }

  /**
   * Finds the next available placement slot in the binary tree.
   * Strategies:
   * - 'LEFT': Follows the extreme left edge of the tree.
   * - 'RIGHT': Follows the extreme right edge of the tree.
   * - 'BALANCED': Chooses the leg with less volume and finds the next open spot.
   */
  public static async findNextAvailableSlot(
    rootNodeId: string,
    preferredLeg: 'LEFT' | 'RIGHT' | 'BALANCED' = 'BALANCED'
  ): Promise<{ targetParentNodeId: string; recommendedPosition: PlacementPosition; reason: string }> {
    const root = await prisma.mLMNode.findUnique({
      where: { id: rootNodeId },
      include: { businessCenter: true, children: true },
    });

    if (!root) {
      throw AppError.notFound('Root node not found.');
    }

    // If root has an empty position right away
    const rootLeft = root.children.find((c) => c.placementPosition === 'LEFT');
    const rootRight = root.children.find((c) => c.placementPosition === 'RIGHT');

    if (!rootLeft && (preferredLeg === 'LEFT' || preferredLeg === 'BALANCED')) {
      return {
        targetParentNodeId: root.id,
        recommendedPosition: 'LEFT',
        reason: 'Immediate LEFT position is open on root node.',
      };
    }
    if (!rootRight && (preferredLeg === 'RIGHT' || preferredLeg === 'BALANCED')) {
      return {
        targetParentNodeId: root.id,
        recommendedPosition: 'RIGHT',
        reason: 'Immediate RIGHT position is open on root node.',
      };
    }

    // Determine traversal direction
    let targetPosition: PlacementPosition = 'LEFT';
    if (preferredLeg === 'RIGHT') {
      targetPosition = 'RIGHT';
    } else if (preferredLeg === 'BALANCED') {
      const leftVol = Number(root.businessCenter.leftVolume);
      const rightVol = Number(root.businessCenter.rightVolume);
      targetPosition = leftVol <= rightVol ? 'LEFT' : 'RIGHT';
    }

    // Walk down the selected leg to the deepest open slot
    let currentNode = targetPosition === 'LEFT' ? rootLeft! : rootRight!;

    while (currentNode) {
      const children = await prisma.mLMNode.findMany({
        where: { placementParentId: currentNode.id },
      });

      const hasLeft = children.some((c) => c.placementPosition === 'LEFT');
      const hasRight = children.some((c) => c.placementPosition === 'RIGHT');

      if (!hasLeft) {
        return {
          targetParentNodeId: currentNode.id,
          recommendedPosition: 'LEFT',
          reason: `Spillover leaf on ${targetPosition} leg with open LEFT position.`,
        };
      }
      if (!hasRight) {
        return {
          targetParentNodeId: currentNode.id,
          recommendedPosition: 'RIGHT',
          reason: `Spillover leaf on ${targetPosition} leg with open RIGHT position.`,
        };
      }

      // Continue descending down the preferred leg
      const nextChild = children.find((c) => c.placementPosition === targetPosition);
      if (!nextChild) {
        return {
          targetParentNodeId: currentNode.id,
          recommendedPosition: targetPosition,
          reason: `Open slot found at ${targetPosition} position.`,
        };
      }
      currentNode = nextChild;
    }

    return {
      targetParentNodeId: root.id,
      recommendedPosition: 'LEFT',
      reason: 'Fallback to left position.',
    };
  }

  /**
   * Fetches the unilevel sponsorship tree for a distributor.
   */
  public static async getSponsorTree(distributorId: string, maxDepth = 3) {
    const relationships = await prisma.sponsorRelationship.findMany({
      where: {
        ancestorId: distributorId,
        depth: { lte: maxDepth },
      },
      include: {
        descendant: {
          include: {
            user: { select: { email: true, phone: true } },
            currentRank: true,
          },
        },
      },
      orderBy: [{ depth: 'asc' }, { createdAt: 'asc' }],
    });

    const directReferrals = relationships.filter((r) => r.isDirect);
    const indirectReferrals = relationships.filter((r) => !r.isDirect);

    return {
      distributorId,
      totalDownlineCount: relationships.length,
      directReferralsCount: directReferrals.length,
      levels: {
        level1: directReferrals.map((r) => this.mapReferral(r)),
        level2: relationships.filter((r) => r.depth === 2).map((r) => this.mapReferral(r)),
        level3: relationships.filter((r) => r.depth === 3).map((r) => this.mapReferral(r)),
      },
    };
  }

  private static mapReferral(rel: any) {
    return {
      distributorId: rel.descendant.id,
      distributorCode: rel.descendant.distributorCode,
      firstName: rel.descendant.firstName,
      lastName: rel.descendant.lastName,
      displayName: rel.descendant.displayName,
      email: rel.descendant.user.email,
      rank: rel.descendant.currentRank?.name || 'Unranked',
      lifetimePV: Number(rel.descendant.lifetimePV),
      lifetimeGV: Number(rel.descendant.lifetimeGV),
      isDirect: rel.isDirect,
      depth: rel.depth,
      joinedAt: rel.descendant.joinedAt,
    };
  }

  /**
   * Specifically seeds and builds the exact tree structure requested:
   * Distributor A
   *    │
   *    ├── LEFT
   *    │     ├── Distributor B
   *    │     └── Distributor C
   *    │
   *    └── RIGHT
   *          ├── Distributor D
   *          └── Distributor E
   */
  public static async seedModelTree() {
    logger.info('Seeding the exact Distributor A/B/C/D/E MLM model tree...');

    return await prisma.$transaction(async (tx) => {
      // Clean up previous model tree entries if any exist
      const testEmails = [
        'distributor.a@kashvimlm.test',
        'distributor.b@kashvimlm.test',
        'distributor.c@kashvimlm.test',
        'distributor.d@kashvimlm.test',
        'distributor.e@kashvimlm.test',
      ];

      for (const email of testEmails) {
        const u = await tx.user.findUnique({ where: { email } });
        if (u) {
          await tx.user.delete({ where: { id: u.id } });
        }
      }

      // 1. Create Distributor A (Root)
      const userA = await tx.user.create({
        data: {
          email: 'distributor.a@kashvimlm.test',
          passwordHash: 'dummy_hash_for_test',
          roleName: 'DISTRIBUTOR',
          distributorProfile: {
            create: {
              distributorCode: 'DST-A',
              firstName: 'Distributor',
              lastName: 'A',
              displayName: 'Distributor A (Root)',
              status: 'ACTIVE',
              businessCenters: {
                create: {
                  centerNumber: 1,
                  centerCode: 'DST-A-BC1',
                  status: 'ACTIVE',
                  leftVolume: new Prisma.Decimal('1500.00'),
                  rightVolume: new Prisma.Decimal('1800.00'),
                },
              },
            },
          },
        },
        include: {
          distributorProfile: {
            include: { businessCenters: true },
          },
        },
      });

      const distA = userA.distributorProfile!;
      const bcA = distA.businessCenters[0];

      // Node A (Root Node)
      const nodeA = await tx.mLMNode.create({
        data: {
          businessCenterId: bcA.id,
          distributorId: distA.id,
          depth: 0,
          binaryPath: 'ROOT',
        },
      });

      // 2. Create Distributor B (Sponsored by A, Placed on A's LEFT)
      const userB = await tx.user.create({
        data: {
          email: 'distributor.b@kashvimlm.test',
          passwordHash: 'dummy_hash_for_test',
          roleName: 'DISTRIBUTOR',
          distributorProfile: {
            create: {
              distributorCode: 'DST-B',
              firstName: 'Distributor',
              lastName: 'B',
              displayName: 'Distributor B',
              status: 'ACTIVE',
              sponsorId: distA.id, // Sponsor tree: sponsored by A
              businessCenters: {
                create: {
                  centerNumber: 1,
                  centerCode: 'DST-B-BC1',
                  status: 'ACTIVE',
                  leftVolume: new Prisma.Decimal('800.00'),
                  rightVolume: new Prisma.Decimal('700.00'),
                },
              },
            },
          },
        },
        include: {
          distributorProfile: {
            include: { businessCenters: true },
          },
        },
      });

      const distB = userB.distributorProfile!;
      const bcB = distB.businessCenters[0];

      // Node B (Placed on A's LEFT)
      const nodeB = await tx.mLMNode.create({
        data: {
          businessCenterId: bcB.id,
          distributorId: distB.id,
          placementParentId: nodeA.id,
          placementPosition: 'LEFT',
          depth: 1,
          binaryPath: 'ROOT/L',
        },
      });

      // Sponsor Relationship: A -> B
      await tx.sponsorRelationship.create({
        data: {
          ancestorId: distA.id,
          descendantId: distB.id,
          depth: 1,
          isDirect: true,
        },
      });

      // 3. Create Distributor C (Sponsored by A, Placed under B)
      const userC = await tx.user.create({
        data: {
          email: 'distributor.c@kashvimlm.test',
          passwordHash: 'dummy_hash_for_test',
          roleName: 'DISTRIBUTOR',
          distributorProfile: {
            create: {
              distributorCode: 'DST-C',
              firstName: 'Distributor',
              lastName: 'C',
              displayName: 'Distributor C',
              status: 'ACTIVE',
              sponsorId: distA.id, // Sponsor is still A! Proves sponsor != placement parent
              businessCenters: {
                create: {
                  centerNumber: 1,
                  centerCode: 'DST-C-BC1',
                  status: 'ACTIVE',
                  leftVolume: new Prisma.Decimal('400.00'),
                  rightVolume: new Prisma.Decimal('300.00'),
                },
              },
            },
          },
        },
        include: {
          distributorProfile: {
            include: { businessCenters: true },
          },
        },
      });

      const distC = userC.distributorProfile!;
      const bcC = distC.businessCenters[0];

      // Node C (Placed under B's LEFT)
      const nodeC = await tx.mLMNode.create({
        data: {
          businessCenterId: bcC.id,
          distributorId: distC.id,
          placementParentId: nodeB.id,
          placementPosition: 'LEFT',
          depth: 2,
          binaryPath: 'ROOT/L/L',
        },
      });

      // Sponsor Relationship: A -> C (direct referral by A, even though placed under B!)
      await tx.sponsorRelationship.create({
        data: {
          ancestorId: distA.id,
          descendantId: distC.id,
          depth: 1,
          isDirect: true,
        },
      });

      // 4. Create Distributor D (Sponsored by A, Placed on A's RIGHT)
      const userD = await tx.user.create({
        data: {
          email: 'distributor.d@kashvimlm.test',
          passwordHash: 'dummy_hash_for_test',
          roleName: 'DISTRIBUTOR',
          distributorProfile: {
            create: {
              distributorCode: 'DST-D',
              firstName: 'Distributor',
              lastName: 'D',
              displayName: 'Distributor D',
              status: 'ACTIVE',
              sponsorId: distA.id, // Sponsor: A
              businessCenters: {
                create: {
                  centerNumber: 1,
                  centerCode: 'DST-D-BC1',
                  status: 'ACTIVE',
                  leftVolume: new Prisma.Decimal('900.00'),
                  rightVolume: new Prisma.Decimal('900.00'),
                },
              },
            },
          },
        },
        include: {
          distributorProfile: {
            include: { businessCenters: true },
          },
        },
      });

      const distD = userD.distributorProfile!;
      const bcD = distD.businessCenters[0];

      // Node D (Placed on A's RIGHT)
      const nodeD = await tx.mLMNode.create({
        data: {
          businessCenterId: bcD.id,
          distributorId: distD.id,
          placementParentId: nodeA.id,
          placementPosition: 'RIGHT',
          depth: 1,
          binaryPath: 'ROOT/R',
        },
      });

      // Sponsor Relationship: A -> D
      await tx.sponsorRelationship.create({
        data: {
          ancestorId: distA.id,
          descendantId: distD.id,
          depth: 1,
          isDirect: true,
        },
      });

      // 5. Create Distributor E (Sponsored by D, Placed under D's RIGHT)
      const userE = await tx.user.create({
        data: {
          email: 'distributor.e@kashvimlm.test',
          passwordHash: 'dummy_hash_for_test',
          roleName: 'DISTRIBUTOR',
          distributorProfile: {
            create: {
              distributorCode: 'DST-E',
              firstName: 'Distributor',
              lastName: 'E',
              displayName: 'Distributor E',
              status: 'ACTIVE',
              sponsorId: distD.id, // Sponsor: D
              businessCenters: {
                create: {
                  centerNumber: 1,
                  centerCode: 'DST-E-BC1',
                  status: 'ACTIVE',
                  leftVolume: new Prisma.Decimal('500.00'),
                  rightVolume: new Prisma.Decimal('400.00'),
                },
              },
            },
          },
        },
        include: {
          distributorProfile: {
            include: { businessCenters: true },
          },
        },
      });

      const distE = userE.distributorProfile!;
      const bcE = distE.businessCenters[0];

      // Node E (Placed under D's RIGHT)
      const nodeE = await tx.mLMNode.create({
        data: {
          businessCenterId: bcE.id,
          distributorId: distE.id,
          placementParentId: nodeD.id,
          placementPosition: 'RIGHT',
          depth: 2,
          binaryPath: 'ROOT/R/R',
        },
      });

      // Sponsor Relationships: D -> E (direct), A -> E (indirect)
      await tx.sponsorRelationship.createMany({
        data: [
          {
            ancestorId: distD.id,
            descendantId: distE.id,
            depth: 1,
            isDirect: true,
          },
          {
            ancestorId: distA.id,
            descendantId: distE.id,
            depth: 2,
            isDirect: false,
          },
        ],
      });

      return {
        model: 'Distributor A -> LEFT (B -> C) & RIGHT (D -> E)',
        rootNodeId: nodeA.id,
        nodes: {
          A: { nodeId: nodeA.id, distributorCode: 'DST-A', position: 'ROOT' },
          B: { nodeId: nodeB.id, distributorCode: 'DST-B', parentId: nodeA.id, position: 'LEFT', sponsor: 'DST-A' },
          C: { nodeId: nodeC.id, distributorCode: 'DST-C', parentId: nodeB.id, position: 'LEFT', sponsor: 'DST-A' },
          D: { nodeId: nodeD.id, distributorCode: 'DST-D', parentId: nodeA.id, position: 'RIGHT', sponsor: 'DST-A' },
          E: { nodeId: nodeE.id, distributorCode: 'DST-E', parentId: nodeD.id, position: 'RIGHT', sponsor: 'DST-D' },
        },
      };
    });
  }
}
