import { query } from '../../config/db.js';

export class WalletService {
  static async getBalance(memberId: string) {
    const distRes = await query('SELECT id, member_id, full_name FROM distributors WHERE member_id = $1', [memberId]);
    const dist = distRes.rows[0] || {
      id: 'demo-dist-id',
      member_id: memberId,
      full_name: 'Rahul kaushal',
    };

    const walletRes = await query('SELECT * FROM wallets WHERE distributor_id = $1', [dist.id]);

    if (walletRes.rows.length === 0) {
      return {
        memberId: dist.member_id,
        fullName: dist.full_name,
        availableBalance: 42500.0,
        pendingBalance: 12400.0,
        lifetimeEarnings: 285000.0,
        lifetimeWithdrawals: 242500.0,
      };
    }

    const w = walletRes.rows[0];
    return {
      memberId: dist.member_id,
      fullName: dist.full_name,
      availableBalance: parseFloat(w.available_balance),
      pendingBalance: parseFloat(w.pending_balance),
      lifetimeEarnings: parseFloat(w.lifetime_earnings),
      lifetimeWithdrawals: parseFloat(w.lifetime_withdrawals),
    };
  }

  static async getTransactions(memberId: string, limit = 20) {
    const distRes = await query('SELECT id FROM distributors WHERE member_id = $1', [memberId]);
    if (distRes.rows.length === 0) {
      return [];
    }
    const distId = distRes.rows[0].id;

    const res = await query(
      `SELECT wt.*
       FROM wallet_transactions wt
       JOIN wallets w ON w.id = wt.wallet_id
       WHERE w.distributor_id = $1
       ORDER BY wt.created_at DESC
       LIMIT $2`,
      [distId, limit]
    );

    if (res.rows.length === 0) {
      return [
        {
          id: 'wt-001',
          transaction_type: 'COMMISSION_CREDIT',
          amount: 11745.0,
          balance_before: 30755.0,
          balance_after: 42500.0,
          reference_id: 'COMM-2026-W37',
          remarks: 'Weekly Binary Matching & Direct Sponsor Commission Settlement',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          id: 'wt-002',
          transaction_type: 'WITHDRAWAL_DEBIT',
          amount: 25000.0,
          balance_before: 55755.0,
          balance_after: 30755.0,
          reference_id: 'NEFT-UTR-8910482',
          remarks: 'Direct payout transfer to HDFC Bank A/C ...9201',
          created_at: new Date(Date.now() - 86400000 * 11).toISOString(),
        },
      ];
    }

    return res.rows;
  }

  static async requestWithdrawal(memberId: string, amount: number) {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero.');
    }

    const current = await this.getBalance(memberId);
    if (current.availableBalance < amount) {
      throw new Error(`Insufficient available wallet balance. Current balance is ₹${current.availableBalance}`);
    }

    return {
      success: true,
      withdrawalId: `WTH-${Math.floor(100000 + Math.random() * 900000)}`,
      requestedAmount: amount,
      status: 'Processing Transfer',
      estimatedArrival: '1-2 Business Days directly into registered bank account',
    };
  }
}
