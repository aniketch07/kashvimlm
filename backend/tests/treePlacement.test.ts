/**
 * Test Suite: TreePlacementService Automated Tests
 *
 * Covers:
 * 1. LEFT placement
 * 2. RIGHT placement
 * 3. occupied LEFT
 * 4. occupied RIGHT
 * 5. self-placement
 * 6. circular placement
 * 7. invalid parent
 * 8. inactive parent
 * 9. concurrent placement
 * 10. getAvailablePositions & getChildren
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreePlacementService } from '../src/services/treePlacement.service';
import { prisma } from '../src/config/database';
import { PlacementPosition, Prisma } from '@prisma/client';

describe('TREE PLACEMENT SERVICE TESTS (TreePlacementService)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const parentDistId = 'dist-parent-001';
  const childDistId1 = 'dist-child-001';
  const childDistId2 = 'dist-child-002';
  const parentNodeId = 'node-parent-001';
  const parentBcId = 'bc-parent-001';

  // --------------------------------------------------------------------------
  // TEST 1: LEFT Placement
  // --------------------------------------------------------------------------
  describe('1. LEFT Placement', () => {
    it('should successfully place a distributor on the LEFT leg', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorId: 'KV-CHILD-1',
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-child-1', centerNumber: 1 }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorId: 'KV-PARENT',
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst')
        .mockResolvedValueOnce({
          id: parentNodeId,
          distributorId: parentDistId,
          depth: 1,
          binaryPath: 'ROOT',
          distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
          children: [],
        } as any);

      vi.spyOn(prisma.mLMNode, 'findUnique').mockResolvedValue(null);

      const mockCreatedNode = {
        id: 'node-child-1',
        distributorId: childDistId1,
        placementParentId: parentNodeId,
        placementPosition: PlacementPosition.LEFT,
        depth: 2,
        binaryPath: 'ROOT/L',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          mLMNode: {
            findFirst: vi.fn().mockResolvedValue(null),
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCreatedNode),
          },
          distributorProfile: {
            update: vi.fn().mockResolvedValue({}),
          },
          sponsorRelationship: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(txMock);
      });

      const result = await TreePlacementService.placeDistributor(childDistId1, parentNodeId, 'LEFT');

      expect(result.success).toBe(true);
      expect(result.data.placementPosition).toBe('LEFT');
      expect(result.data.depth).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 2: RIGHT Placement
  // --------------------------------------------------------------------------
  describe('2. RIGHT Placement', () => {
    it('should successfully place a distributor on the RIGHT leg', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId2,
          distributorId: 'KV-CHILD-2',
          distributorCode: 'KV-CHILD-2',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-child-2', centerNumber: 1 }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorId: 'KV-PARENT',
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        depth: 1,
        binaryPath: 'ROOT',
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [{ id: 'child-1', placementPosition: 'LEFT' as const }],
      } as any);

      vi.spyOn(prisma.mLMNode, 'findUnique').mockResolvedValue(null);

      const mockCreatedNode = {
        id: 'node-child-2',
        distributorId: childDistId2,
        placementParentId: parentNodeId,
        placementPosition: PlacementPosition.RIGHT,
        depth: 2,
        binaryPath: 'ROOT/R',
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          mLMNode: {
            findFirst: vi.fn().mockResolvedValue(null),
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCreatedNode),
          },
          distributorProfile: {
            update: vi.fn().mockResolvedValue({}),
          },
          sponsorRelationship: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(txMock);
      });

      const result = await TreePlacementService.placeDistributor({
        distributorId: childDistId2,
        placementParentId: parentNodeId,
        placementPosition: 'RIGHT',
      });

      expect(result.success).toBe(true);
      expect(result.data.placementPosition).toBe('RIGHT');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 3: Occupied LEFT Position
  // --------------------------------------------------------------------------
  describe('3. Occupied LEFT Position', () => {
    it('should return POSITION_ALREADY_OCCUPIED when LEFT leg is already taken', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId2,
          distributorCode: 'KV-CHILD-2',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-2' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [{ id: 'existing-left', placementPosition: 'LEFT' as const }],
      } as any);

      const result = await TreePlacementService.placeDistributor(childDistId2, parentNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('POSITION_ALREADY_OCCUPIED');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 4: Occupied RIGHT Position
  // --------------------------------------------------------------------------
  describe('4. Occupied RIGHT Position', () => {
    it('should return POSITION_ALREADY_OCCUPIED when RIGHT leg is already taken', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-1' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [{ id: 'existing-right', placementPosition: 'RIGHT' as const }],
      } as any);

      const result = await TreePlacementService.placeDistributor(childDistId1, parentNodeId, 'RIGHT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('POSITION_ALREADY_OCCUPIED');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 5: Self-Placement Prevention
  // --------------------------------------------------------------------------
  describe('5. Self-Placement Prevention', () => {
    it('should return SELF_PLACEMENT_FORBIDDEN when distributor places under themselves', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          sponsorId: 'sponsor-001',
          businessCenters: [{ id: parentBcId }],
        } as any)
        .mockResolvedValueOnce({
          id: 'sponsor-001',
          distributorCode: 'KV-SPONSOR',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId, // SAME DISTRIBUTOR!
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [],
      } as any);

      const result = await TreePlacementService.placeDistributor(parentDistId, parentNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SELF_PLACEMENT_FORBIDDEN');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 6: Circular Placement Prevention
  // --------------------------------------------------------------------------
  describe('6. Circular Placement Prevention', () => {
    it('should return CIRCULAR_PLACEMENT_FORBIDDEN when parent is already a descendant', async () => {
      const ancestorId = 'dist-ancestor-1';
      const descendantNodeId = 'node-descendant-3';

      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: ancestorId,
          distributorCode: 'KV-ANCESTOR',
          sponsorId: 'sponsor-001',
          businessCenters: [{ id: 'bc-ancestor' }],
        } as any)
        .mockResolvedValueOnce({
          id: 'sponsor-001',
          distributorCode: 'KV-SPONSOR',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: descendantNodeId,
        distributorId: 'dist-downline-member',
        distributor: { status: 'ACTIVE', distributorCode: 'KV-DOWNLINE' },
        children: [],
      } as any);

      // Walk up tree: descendantNodeId -> node-2 -> node-ancestor (matches ancestorId!)
      vi.spyOn(prisma.mLMNode, 'findUnique')
        .mockResolvedValueOnce({
          id: descendantNodeId,
          distributorId: 'dist-downline-member',
          placementParentId: 'node-ancestor',
        } as any)
        .mockResolvedValueOnce({
          id: 'node-ancestor',
          distributorId: ancestorId, // CIRCLE FOUND!
          placementParentId: null,
        } as any);

      const result = await TreePlacementService.placeDistributor(ancestorId, descendantNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('CIRCULAR_PLACEMENT_FORBIDDEN');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 7: Invalid Parent
  // --------------------------------------------------------------------------
  describe('7. Invalid Parent', () => {
    it('should return PARENT_NOT_FOUND when placement parent does not exist', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-1' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce(null); // Parent node does not exist

      const result = await TreePlacementService.placeDistributor(childDistId1, 'NONEXISTENT_PARENT', 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PARENT_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 8: Inactive Parent
  // --------------------------------------------------------------------------
  describe('8. Inactive Parent', () => {
    it('should return PARENT_INACTIVE when placement parent status is not ACTIVE', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-1' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        distributor: { status: 'INACTIVE', distributorCode: 'KV-PARENT' }, // INACTIVE PARENT!
        children: [],
      } as any);

      const result = await TreePlacementService.placeDistributor(childDistId1, parentNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PARENT_INACTIVE');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 9: Concurrent Placement (Collision Handled by DB Unique Constraint)
  // --------------------------------------------------------------------------
  describe('9. Concurrent Placement & Re-verification', () => {
    it('should return POSITION_ALREADY_OCCUPIED if concurrent transaction filled the slot', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-1' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      // Pre-flight sees 0 children
      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [],
      } as any);

      // But inside transaction, row lock discovers someone took LEFT immediately before us!
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          mLMNode: {
            findFirst: vi.fn().mockResolvedValue({ id: 'concurrent-node', placementPosition: 'LEFT' }),
          },
        };
        return await callback(txMock);
      });

      const result = await TreePlacementService.placeDistributor(childDistId1, parentNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('POSITION_ALREADY_OCCUPIED');
    });

    it('should catch Prisma P2002 unique constraint and return POSITION_ALREADY_OCCUPIED', async () => {
      vi.spyOn(prisma.distributorProfile, 'findFirst')
        .mockResolvedValueOnce({
          id: childDistId1,
          distributorCode: 'KV-CHILD-1',
          sponsorId: parentDistId,
          businessCenters: [{ id: 'bc-1' }],
        } as any)
        .mockResolvedValueOnce({
          id: parentDistId,
          distributorCode: 'KV-PARENT',
          status: 'ACTIVE',
        } as any);

      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
        distributorId: parentDistId,
        distributor: { status: 'ACTIVE', distributorCode: 'KV-PARENT' },
        children: [],
      } as any);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`placementParentId`,`placementPosition`)',
        { code: 'P2002', clientVersion: '6.4.1' }
      );

      vi.spyOn(prisma, '$transaction').mockRejectedValue(p2002Error);

      const result = await TreePlacementService.placeDistributor(childDistId1, parentNodeId, 'LEFT');

      expect(result.success).toBe(false);
      expect(result.code).toBe('POSITION_ALREADY_OCCUPIED');
    });
  });

  // --------------------------------------------------------------------------
  // TEST 10: Helper Methods: getAvailablePositions & getChildren
  // --------------------------------------------------------------------------
  describe('10. Helper Methods', () => {
    it('getAvailablePositions should return ["LEFT", "RIGHT"] when node has 0 children', async () => {
      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
      } as any);
      vi.spyOn(prisma.mLMNode, 'findMany').mockResolvedValueOnce([]);

      const positions = await TreePlacementService.getAvailablePositions(parentNodeId);
      expect(positions).toEqual(['LEFT', 'RIGHT']);
    });

    it('getAvailablePositions should return ["RIGHT"] when LEFT is occupied', async () => {
      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
      } as any);
      vi.spyOn(prisma.mLMNode, 'findMany').mockResolvedValueOnce([
        { placementPosition: 'LEFT' as const },
      ] as any);

      const positions = await TreePlacementService.getAvailablePositions(parentNodeId);
      expect(positions).toEqual(['RIGHT']);
    });

    it('getChildren should return list of child nodes', async () => {
      vi.spyOn(prisma.mLMNode, 'findFirst').mockResolvedValueOnce({
        id: parentNodeId,
      } as any);
      vi.spyOn(prisma.mLMNode, 'findMany').mockResolvedValueOnce([
        {
          id: 'child-1',
          placementPosition: 'LEFT',
          distributor: { id: 'dist-1', firstName: 'Child', lastName: 'One' },
          businessCenter: { centerCode: 'BC-1' },
        },
      ] as any);

      const children = await TreePlacementService.getChildren(parentNodeId);
      expect(children).toHaveLength(1);
      expect(children[0].placementPosition).toBe('LEFT');
    });
  });
});
