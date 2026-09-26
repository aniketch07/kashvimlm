import { Request, Response, NextFunction } from 'express';
import { DistributorService } from './distributor.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { sanitizeProfileOutput } from '../../utils/masking.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/audit.types.js';

export class DistributorController {
  static async getMeReferralLink(req: any, res: Response): Promise<void> {
    const targetMemberId = req.user?.distributorId || req.user?.memberId || 'KV-1001';
    const baseUrl = req.query.baseUrl || req.headers['x-base-url'];
    const data = await DistributorService.getReferralLink(targetMemberId, baseUrl);
    res.status(200).json({ success: true, data });
  }

  static async getReferralLink(req: any, res: Response): Promise<void> {
    const targetMemberId = req.params.memberId || req.user?.distributorId || req.user?.memberId || 'KV-1001';
    const baseUrl = req.query.baseUrl || req.headers['x-base-url'];
    const data = await DistributorService.getReferralLink(targetMemberId, baseUrl);
    res.status(200).json({ success: true, data });
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Do not trust frontend IDs: fallback to authenticated user's member ID
      const targetMemberId = req.params.memberId || req.user?.memberId;
      if (!targetMemberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      const isOwner = req.user?.memberId === targetMemberId || req.user?.id === targetMemberId;

      // Non-admin requesting another user's profile: reject
      if (!isOwner && !isAdmin && req.params.memberId) {
        res.status(403).json({
          success: false,
          message: 'Ownership verification failed: You cannot access private profile details of another distributor.',
        });
        return;
      }

      const profile = await DistributorService.getProfile(targetMemberId);
      if (!profile) {
        res.status(404).json({ success: false, message: 'Distributor profile not found.' });
        return;
      }

      // Sensitive Field Masking: Mask bank accounts, PAN numbers, and private KYC artifacts
      const sanitized = sanitizeProfileOutput(profile, isOwner || isAdmin);
      res.status(200).json({ success: true, data: sanitized });
    } catch (err) {
      next(err);
    }
  }

  static async getBusinessCenters(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetMemberId = req.params.memberId || req.user?.memberId;
      if (!targetMemberId) {
        res.status(400).json({ success: false, message: 'Member ID required.' });
        return;
      }

      const isAdmin = req.user?.role?.toLowerCase() === 'admin';
      const isOwner = req.user?.memberId === targetMemberId || req.user?.id === targetMemberId;

      if (!isOwner && !isAdmin && req.params.memberId) {
        res.status(403).json({
          success: false,
          message: 'Ownership verification failed: You cannot access business center volume for another distributor.',
        });
        return;
      }

      const centers = await DistributorService.getBusinessCenters(targetMemberId);
      res.status(200).json({ success: true, data: centers });
    } catch (err) {
      next(err);
    }
  }

  static async updateKycAndBank(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Strict ownership: Always use authenticated user's memberId, NEVER trust frontend body memberId
      const memberId = req.user?.memberId;
      if (!memberId) {
        res.status(401).json({ success: false, message: 'Unauthenticated.' });
        return;
      }

      const updated = await DistributorService.updateKycAndBank(memberId, req.body);

      // Immutable Audit Log: KYC_APPROVED / USER_UPDATED
      await AuditService.recordFromRequest(
        req,
        AuditAction.KYC_APPROVED,
        'DistributorKyc',
        memberId,
        null,
        { bankUpdated: Boolean(req.body.bankAccountNumber), panUpdated: Boolean(req.body.panNumber) }
      );

      const sanitized = sanitizeProfileOutput(updated, true);
      res.status(200).json({
        success: true,
        message: 'KYC & Bank details updated and queued for compliance verification.',
        data: sanitized,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listDistributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const list = await DistributorService.getAll(limit, offset);
      // Mask all sensitive banking & PAN details in administrative list
      const sanitized = list.map((d: any) => sanitizeProfileOutput(d, false));
      res.status(200).json({ success: true, data: sanitized });
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DistributorService.registerDistributor(req.body);
      res.status(201).json({
        success: true,
        message: 'Distributor registered successfully',
        distributor: {
          id: result.distributor.distributorId,
          uuid: result.distributor.id,
          name: result.distributor.name,
          email: result.distributor.email,
          phone: result.distributor.phone,
          sponsorId: result.treePlacement.sponsorId,
          parentId: result.treePlacement.parentId,
          position: result.treePlacement.position,
          level: result.treePlacement.level,
        },
        treePlacement: result.treePlacement,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Distributor registration failed.',
      });
    }
  }

  static async getById(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ success: false, message: 'Distributor ID required.' });
        return;
      }

      const distributor = await DistributorService.getDistributorById(id);
      if (!distributor) {
        res.status(404).json({ success: false, message: 'Distributor not found.' });
        return;
      }

      const isOwnerOrAdmin = req.user?.memberId === distributor.distributorId || req.user?.role?.toLowerCase() === 'admin';
      const sanitized = sanitizeProfileOutput(distributor, isOwnerOrAdmin);
      res.status(200).json({ success: true, data: sanitized });
    } catch (err) {
      next(err);
    }
  }
}

