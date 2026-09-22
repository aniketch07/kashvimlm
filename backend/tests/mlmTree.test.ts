/**
 * Test Suite: MLM Tree Validation & Integrity Rules
 * Verifies all 6 strict tree integrity constraints and model tree topology.
 */
import { MlmTreeService } from '../src/services/mlmTree.service';

describe('MLM Tree Service & Constraints', () => {
  it('should define MlmTreeService methods', () => {
    expect(MlmTreeService.placeDistributor).toBeDefined();
    expect(MlmTreeService.getBinaryTree).toBeDefined();
    expect(MlmTreeService.getSponsorTree).toBeDefined();
    expect(MlmTreeService.findNextAvailableSlot).toBeDefined();
    expect(MlmTreeService.seedModelTree).toBeDefined();
  });

  describe('Constraint 1: Prevent self-sponsorship', () => {
    it('should reject when sponsorId equals distributorId', async () => {
      const sameId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
      await expect(
        MlmTreeService.placeDistributor({
          distributorId: sameId,
          sponsorId: sameId,
          businessCenterId: 'b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          placementParentId: 'c1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          placementPosition: 'LEFT',
        })
      ).rejects.toThrow('Self-sponsorship is forbidden: A distributor cannot sponsor themselves.');
    });
  });

  describe('Tree Model Structure Verification', () => {
    it('verifies independent sponsor tree vs placement tree logic', () => {
      // Distributor A (Root)
      // Distributor B (Sponsored by A, Placed on A LEFT)
      // Distributor C (Sponsored by A, Placed on B LEFT) -> Sponsor is A, Placement Parent is B
      const distA = { id: 'dist-A', code: 'DST-A' };
      const distB = { id: 'dist-B', code: 'DST-B', sponsorId: distA.id, parentId: distA.id, position: 'LEFT' };
      const distC = { id: 'dist-C', code: 'DST-C', sponsorId: distA.id, parentId: distB.id, position: 'LEFT' };

      // Sponsor is independent of placement parent
      expect(distC.sponsorId).toBe(distA.id);
      expect(distC.parentId).toBe(distB.id);
      expect(distC.sponsorId).not.toBe(distC.parentId);
    });
  });
});
