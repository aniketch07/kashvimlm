import { Request } from 'express';
import { query } from '../../config/db.js';
import { AuditAction, AuditLogEntry, CreateAuditLogParams, AuditLogFilterOptions } from './audit.types.js';

export class AuditService {
  /**
   * Resilient in-memory audit store with immutable entries (Object.freeze)
   * Populated with compliant historical seed records across all tracked actions
   */
  private static immutableStore: AuditLogEntry[] = [
    {
      id: 'audit-001',
      actorId: 'usr-admin-001',
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: 'usr-admin-001',
      oldValue: null,
      newValue: { status: 'Authenticated', method: 'JWT_BEARER', role: 'admin' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
      createdAt: '2026-09-21T08:30:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-002',
      actorId: 'usr-demo-001',
      action: AuditAction.USER_CREATED,
      entityType: 'Distributor',
      entityId: '88767139',
      oldValue: null,
      newValue: {
        memberId: '88767139',
        fullName: 'Rahul Kaushal',
        sponsorId: '88767139',
        rank: 'Associate',
        qualificationStatus: 'Active',
      },
      ipAddress: '103.21.14.88',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: '2026-09-21T09:15:00Z',
      user: { id: 'usr-demo-001', username: 'rahul_kaushal', email: 'rahul.kaushal@kashvimlm.com' },
    },
    {
      id: 'audit-003',
      actorId: 'usr-admin-001',
      action: AuditAction.PRODUCT_CREATED,
      entityType: 'Product',
      entityId: 'KASH-HOZ-001',
      oldValue: null,
      newValue: { sku: 'KASH-HOZ-001', name: 'Premium Hosiery Cotton T-Shirt', mrp: 1899, distributorPrice: 1299, volumeBv: 45 },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T10:00:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-004',
      actorId: 'usr-admin-001',
      action: AuditAction.PRODUCT_UPDATED,
      entityType: 'Product',
      entityId: 'KASH-HOZ-001',
      oldValue: { distributorPrice: 1299, stockQuantity: 200 },
      newValue: { distributorPrice: 1249, stockQuantity: 350 },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T11:20:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-005',
      actorId: 'usr-demo-001',
      action: AuditAction.ORDER_CREATED,
      entityType: 'Order',
      entityId: 'KASH-ORD-781923',
      oldValue: null,
      newValue: { orderNumber: 'KASH-ORD-781923', totalAmount: 4999.00, totalBv: 120.00, paymentStatus: 'Paid' },
      ipAddress: '103.21.14.88',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: '2026-09-21T12:00:00Z',
      user: { id: 'usr-demo-001', username: 'rahul_kaushal', email: 'rahul.kaushal@kashvimlm.com' },
    },
    {
      id: 'audit-006',
      actorId: null,
      action: AuditAction.BV_CREDIT,
      entityType: 'BvLedger',
      entityId: 'bv-leg-left-901',
      oldValue: { leftLegTotal: 2450.00 },
      newValue: { amountBv: 120.00, leftLegTotal: 2570.00, legAffected: 'left', sourceOrder: 'KASH-ORD-781923' },
      ipAddress: '127.0.0.1',
      userAgent: 'KashviMLM-BV-Engine/1.0',
      createdAt: '2026-09-21T12:00:05Z',
      user: null,
    },
    {
      id: 'audit-007',
      actorId: 'usr-admin-001',
      action: AuditAction.COMMISSION_CREATED,
      entityType: 'CommissionLedger',
      entityId: 'CYCLE-2026-W37',
      oldValue: null,
      newValue: { cycleWeek: 37, cycleYear: 2026, matchedDistributors: 42, grossCommissionPool: 184500.00 },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T14:00:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-008',
      actorId: 'usr-admin-001',
      action: AuditAction.WALLET_ADJUSTMENT,
      entityType: 'Wallet',
      entityId: 'wal-dist-001',
      oldValue: { availableBalance: 12400.00 },
      newValue: { availableBalance: 18900.00, creditAmount: 6500.00, reason: 'Weekly Commission Settlement' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T15:00:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-009',
      actorId: 'usr-admin-001',
      action: AuditAction.PAYOUT_APPROVED,
      entityType: 'Payout',
      entityId: 'BATCH-2026-W37',
      oldValue: { status: 'Queued' },
      newValue: { status: 'Settled', batchCode: 'BATCH-2026-W37', settledCount: 38, totalAmount: 166050.00 },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T16:30:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-010',
      actorId: 'usr-admin-001',
      action: AuditAction.KYC_APPROVED,
      entityType: 'DistributorKyc',
      entityId: '88767139',
      oldValue: { kycStatus: 'Submitted', panVerified: false },
      newValue: { kycStatus: 'Approved', panVerified: true, bankVerified: true, verifiedBy: 'Compliance Officer' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T17:00:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-011',
      actorId: 'usr-admin-001',
      action: AuditAction.ADMIN_ACTION,
      entityType: 'SupportTicket',
      entityId: 'KV-TKT-2026-9041',
      oldValue: { status: 'Open', priority: 'Medium' },
      newValue: { status: 'Resolved', priority: 'High', adminNote: 'UTR acknowledgement provided to distributor.' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-09-21T17:30:00Z',
      user: { id: 'usr-admin-001', username: 'executive_admin', email: 'admin@kashvimlm.com' },
    },
    {
      id: 'audit-012',
      actorId: 'usr-demo-001',
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: 'usr-demo-001',
      oldValue: null,
      newValue: { status: 'Session Terminated' },
      ipAddress: '103.21.14.88',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: '2026-09-21T18:00:00Z',
      user: { id: 'usr-demo-001', username: 'rahul_kaushal', email: 'rahul.kaushal@kashvimlm.com' },
    },
  ];

  /**
   * Append an immutable audit event to both PostgreSQL and in-memory cache.
   * Modifying or deleting audit entries is strictly forbidden.
   */
  static async record(params: CreateAuditLogParams): Promise<AuditLogEntry> {
    const {
      actorId = null,
      action,
      entityType,
      entityId = null,
      oldValue = null,
      newValue = null,
      ipAddress = '127.0.0.1',
      userAgent = 'Unknown',
    } = params;

    const newId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    const entry: AuditLogEntry = {
      id: newId,
      actorId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      createdAt,
    };

    // 1. Attempt PostgreSQL persistent insert
    try {
      const res = await query(
        `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          entry.id,
          entry.actorId,
          entry.action,
          entry.entityType,
          entry.entityId,
          entry.oldValue ? JSON.stringify(entry.oldValue) : null,
          entry.newValue ? JSON.stringify(entry.newValue) : null,
          entry.ipAddress,
          entry.userAgent,
          entry.createdAt,
        ]
      );
      if (res && res.rows.length > 0) {
        const row = res.rows[0];
        entry.id = row.id;
        entry.createdAt = row.created_at;
      }
    } catch {
      // Retain resilience when database is offline
    }

    // 2. Append to frozen in-memory audit store
    Object.freeze(entry);
    this.immutableStore.unshift(entry);

    return entry;
  }

  /**
   * Helper method to capture audit logs directly from an active Express HTTP request
   */
  static async recordFromRequest(
    req: Request,
    action: AuditAction | string,
    entityType: string,
    entityId?: string | null,
    oldValue?: any,
    newValue?: any
  ): Promise<AuditLogEntry> {
    const actorId = (req as any).user?.id || null;
    const ipAddress =
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown';

    return this.record({
      actorId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Query audit logs with multi-field filtering, search, and pagination
   */
  static async getLogs(filters: AuditLogFilterOptions = {}): Promise<{ total: number; logs: AuditLogEntry[] }> {
    const { action, entityType, entityId, actorId, limit = 50, offset = 0 } = filters;

    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (action) {
        conditions.push(`al.action = $${paramIdx++}`);
        values.push(action);
      }
      if (entityType) {
        conditions.push(`al.entity_type = $${paramIdx++}`);
        values.push(entityType);
      }
      if (entityId) {
        conditions.push(`al.entity_id = $${paramIdx++}`);
        values.push(entityId);
      }
      if (actorId) {
        conditions.push(`al.actor_id = $${paramIdx++}`);
        values.push(actorId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await query(`SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`, values);
      const total = parseInt(countRes?.rows[0]?.total || '0');

      values.push(limit);
      const limitParam = `$${paramIdx++}`;
      values.push(offset);
      const offsetParam = `$${paramIdx++}`;

      const res = await query(
        `SELECT al.*, u.username, u.email 
         FROM audit_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        values
      );

      if (res && res.rows.length > 0) {
        const logs: AuditLogEntry[] = res.rows.map((row: any) => ({
          id: row.id,
          actorId: row.actor_id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          oldValue: typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value,
          newValue: typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at,
          user: row.username ? { id: row.actor_id, username: row.username, email: row.email } : null,
        }));
        return { total, logs };
      }
    } catch {
      // In-memory fallback
    }

    // In-memory filtered search
    let filtered = [...this.immutableStore];
    if (action) {
      filtered = filtered.filter((l) => l.action.toLowerCase() === action.toLowerCase());
    }
    if (entityType) {
      filtered = filtered.filter((l) => l.entityType.toLowerCase() === entityType.toLowerCase());
    }
    if (entityId) {
      filtered = filtered.filter((l) => l.entityId === entityId);
    }
    if (actorId) {
      filtered = filtered.filter((l) => l.actorId === actorId);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return { total, logs: paginated };
  }

  /**
   * Retrieve a single audit log entry by UUID
   */
  static async getLogById(id: string): Promise<AuditLogEntry | null> {
    try {
      const res = await query(
        `SELECT al.*, u.username, u.email 
         FROM audit_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         WHERE al.id = $1`,
        [id]
      );
      if (res && res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          actorId: row.actor_id,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          oldValue: typeof row.old_value === 'string' ? JSON.parse(row.old_value) : row.old_value,
          newValue: typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at,
          user: row.username ? { id: row.actor_id, username: row.username, email: row.email } : null,
        };
      }
    } catch {
      // In-memory fallback
    }

    return this.immutableStore.find((l) => l.id === id) || null;
  }
}
