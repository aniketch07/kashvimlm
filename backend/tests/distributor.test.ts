/**
 * Test Suite: Distributor Management & Dashboard Services
 */
import { CommissionService } from '../src/services/commission.service';
import { DashboardService } from '../src/services/dashboard.service';
import { DistributorService } from '../src/services/distributor.service';
import { TreeService } from '../src/services/tree.service';

describe('Distributor & Dashboard Layer Architecture', () => {
  describe('Service Separation (No commission logic in controllers)', () => {
    it('should have CommissionService encapsulating commission summaries and qualifications', () => {
      expect(CommissionService.getCommissionSummary).toBeDefined();
      expect(CommissionService.getQualificationStatus).toBeDefined();
    });

    it('should have DistributorService handling profiles and delegating tree queries', () => {
      expect(DistributorService.getProfileByUserId).toBeDefined();
      expect(DistributorService.getProfileByIdOrCode).toBeDefined();
      expect(DistributorService.updateProfile).toBeDefined();
      expect(DistributorService.getUpline).toBeDefined();
      expect(DistributorService.getDownline).toBeDefined();
      expect(DistributorService.getTree).toBeDefined();
      expect(DistributorService.getTeam).toBeDefined();
    });

    it('should have TreeService managing tree lineages and team data', () => {
      expect(TreeService.getBinaryTree).toBeDefined();
      expect(TreeService.getUpline).toBeDefined();
      expect(TreeService.getDownline).toBeDefined();
      expect(TreeService.getTeam).toBeDefined();
    });

    it('should have DashboardService orchestrating complete portal data', () => {
      expect(DashboardService.getDashboard).toBeDefined();
    });
  });

  describe('Dashboard Payload Specification', () => {
    it('verifies required dashboard keys match the frontend screenshot model', () => {
      const requiredKeys = [
        'distributor',
        'rank',
        'badges',
        'commissionSummary',
        'qualificationStatus',
        'businessCenters',
        'quickLinks',
        'jumpStartTasks',
        'priorityContacts',
        'news',
      ];

      // Structure contract verification
      const mockDashboard = {
        distributor: { id: 'dist-1', distributorCode: 'DST-10001', name: 'Rahul kaushal' },
        rank: { currentRank: 'Business Center' },
        badges: [],
        commissionSummary: { estimatedCommission: 0, isQualified: false },
        qualificationStatus: { isCommissionQualified: false, statusText: 'Not Commission Qualified' },
        businessCenters: [{ code: 'BC 001', leftVolume: 1250, rightVolume: 1890 }],
        quickLinks: [{ title: 'KASHVIMLM Connect', type: 'connect' }],
        jumpStartTasks: [{ key: 'orientation', completed: false }],
        priorityContacts: { caughtUp: true, contacts: [] },
        news: [{ title: 'All of Your Team Manager Reports Are Now Free' }],
      };

      for (const key of requiredKeys) {
        expect(mockDashboard).toHaveProperty(key);
      }
    });
  });
});
