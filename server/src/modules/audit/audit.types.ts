/**
 * Immutable Audit Log Definitions & Tracked Action Types
 * For Enterprise Compliance, KYC, Financial Audits, and Security Forensics
 */

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  BV_CREDIT = 'BV_CREDIT',
  BV_DEBIT = 'BV_DEBIT',
  COMMISSION_CREATED = 'COMMISSION_CREATED',
  COMMISSION_REVERSED = 'COMMISSION_REVERSED',
  WALLET_ADJUSTMENT = 'WALLET_ADJUSTMENT',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  PAYOUT_REJECTED = 'PAYOUT_REJECTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  ADMIN_ACTION = 'ADMIN_ACTION',
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string | null;
  oldValue: any | null;
  newValue: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  } | null;
}

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilterOptions {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
