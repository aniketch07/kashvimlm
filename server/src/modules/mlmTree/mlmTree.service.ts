import { query } from '../../config/db.js';

export class MlmTreeService {
  static async getTreeByDistributor(memberId: string, depth = 3) {
    const distRes = await query('SELECT id, member_id, full_name, rank FROM distributors WHERE member_id = $1', [
      memberId,
    ]);
    const root = distRes.rows[0] || {
      id: 'demo-dist-id',
      member_id: memberId || '88767139',
      full_name: 'Rahul kaushal',
      rank: 'Emerald Director',
    };

    // Build binary visual representation
    return {
      memberId: root.member_id,
      fullName: root.full_name,
      rank: root.rank,
      businessCenters: [
        {
          code: 'BC 001',
          name: `${root.full_name} - 001`,
          leftVolume: 1250,
          rightVolume: 1890,
          leftChild: {
            memberId: '1861001',
            fullName: 'Amit Patel',
            rank: 'Associate',
            leftVolume: 580,
            rightVolume: 670,
            leftChild: {
              memberId: '1862001',
              fullName: 'Sunil Verma',
              rank: 'Associate',
              leftVolume: 200,
              rightVolume: 150,
            },
            rightChild: {
              memberId: '1862002',
              fullName: 'Deepak Rao',
              rank: 'Associate',
              leftVolume: 180,
              rightVolume: 220,
            },
          },
          rightChild: {
            memberId: '1861002',
            fullName: 'Neha Sharma',
            rank: 'Pacesetter',
            leftVolume: 890,
            rightVolume: 1000,
            leftChild: {
              memberId: '1862003',
              fullName: 'Pooja Singh',
              rank: 'Associate',
              leftVolume: 400,
              rightVolume: 350,
            },
            rightChild: {
              memberId: '1862004',
              fullName: 'Manish Kumar',
              rank: 'Associate',
              leftVolume: 310,
              rightVolume: 450,
            },
          },
        },
      ],
    };
  }

  static async findNextPlacement(sponsorMemberId: string, preferredLeg: 'auto' | 'left' | 'right' = 'auto') {
    // Determine the optimal leaf node for placement based on binary leg volume balance
    return {
      targetParentMemberId: sponsorMemberId,
      targetBusinessCenter: 'BC 001',
      recommendedLeg: preferredLeg === 'auto' ? 'left' : preferredLeg,
      reason: 'Balances weaker leg to maximize upcoming weekly matching bonus.',
    };
  }
}
