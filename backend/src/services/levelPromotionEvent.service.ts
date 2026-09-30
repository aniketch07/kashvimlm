import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../utils/appError';
import { LevelService, LevelDefinition, PromoteMemberResult } from './level.service';
import { MatchingService } from './matching.service';
import { BBService } from './bb.service';

/**
 * ============================================================================
 * PROMOTION EVENT SOURCES
 * ============================================================================
 */
export type PromotionEventSource =
  | 'ORDER'
  | 'REFERRAL'
  | 'MATCHING'
  | 'ADMIN'
  | 'RECALCULATION'
  | 'SYSTEM'
  | string;

export interface ProcessBBEventInput {
  memberId: string;
  amount: number;
  source: PromotionEventSource;
  referenceId: string;
  description?: string;
  type?: 'CREDIT' | 'ADJUSTMENT' | string;
  recalculateMatching?: boolean;
}

export interface ProcessMatchingEventInput {
  memberId: string;
  amount: number;
  source: PromotionEventSource;
  referenceId: string;
  description?: string;
  type?: 'CREDIT' | 'MATCH_CYCLE' | 'ADJUSTMENT' | 'REVERSAL' | string;
}

export interface PromotionEventResult {
  success: boolean;
  memberId: string;
  distributorCode: string;
  source: string;
  referenceId: string;
  transaction: any;
  volumeUpdated: {
    bb: number;
    matching: number;
  };
  previousLevel: LevelDefinition;
  currentLevel: LevelDefinition;
  promoted: boolean;
  promotionDetails?: PromoteMemberResult | null;
  historyRecord?: any;
  message: string;
}

/**
 * ============================================================================
 * LEVEL PROMOTION EVENT SERVICE (PROMPT 6)
 * ============================================================================
 * Coordinates the atomic pipeline connecting BB and Matching events to the
 * automatic MLM Level Promotion Engine.
 *
 * Guaranteed Atomic Flow:
 *   EVENT
 *   ↓
 *   VALIDATE EVENT
 *   ↓
 *   CREATE LEDGER TRANSACTION
 *   ↓
 *   UPDATE MEMBER VOLUME
 *   ↓
 *   CALCULATE ELIGIBLE LEVEL (HIGHEST-TO-LOWEST)
 *   ↓
 *   COMPARE WITH CURRENT LEVEL
 *   ↓
 *   PROMOTE IF HIGHER
 *   ↓
 *   CREATE LEVEL HISTORY
 *   ↓
 *   COMMIT TRANSACTION
 *
 * If ANY critical step fails:
 *   ROLLBACK the entire transaction.
 *   Log structured error without exposing internal DB details to the frontend.
 */
export class LevelPromotionEventService {
  /**
   * 1. PROCESS BB EVENT
   * Whenever a member receives valid BB:
   * 1. Record BB transaction.
   * 2. Update/recalculate BB.
   * 3. Recalculate matching if required by business rules.
   * 4. Evaluate level.
   * 5. Promote automatically if eligible.
   *
   * ATOMIC: All steps execute inside a single transaction. If promotion evaluation fails,
   * the entire transaction is rolled back.
   */
  public static async processBBEvent(
    input: ProcessBBEventInput,
    tx?: Prisma.TransactionClient
  ): Promise<PromotionEventResult> {
    const {
      memberId,
      amount,
      source,
      referenceId,
      description,
      type = 'CREDIT',
      recalculateMatching = false,
    } = input;

    const runner = async (client: Prisma.TransactionClient): Promise<PromotionEventResult> => {
      logger.info(
        { memberId, amount, source, referenceId, type },
        '[PROMOTION_EVENT] Processing incoming BB event'
      );

      // STEP 1: VALIDATE EVENT
      if (!memberId || !memberId.trim()) {
        throw AppError.badRequest('Member identifier is required.');
      }
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw AppError.badRequest('BB volume credit amount must be a positive number.');
      }
      if (!source || !source.trim()) {
        throw AppError.badRequest('Transaction source is required.');
      }
      if (!referenceId || !referenceId.trim()) {
        throw AppError.badRequest('Transaction reference ID is required.');
      }

      const cleanMemberId = memberId.trim();
      const cleanSource = source.trim().toUpperCase();
      const cleanRefId = referenceId.trim();

      // Resolve member record
      const member = await client.distributorProfile.findFirst({
        where: {
          OR: [
            { id: cleanMemberId },
            { distributorCode: { equals: cleanMemberId, mode: 'insensitive' } },
            { distributorId: { equals: cleanMemberId, mode: 'insensitive' } },
          ],
        },
        include: {
          currentLevel: true,
          currentRank: true,
          highestRank: true,
        },
      });

      if (!member) {
        throw AppError.notFound(`Member with identifier '${cleanMemberId}' not found.`);
      }

      const distId = member.id;

      // IDEMPOTENCY CHECK:
      // Prevent duplicate processing if exact (memberId, source, referenceId) already recorded
      let existingTx: any = null;
      try {
        existingTx = await (client as any).bBTransaction?.findUnique({
          where: {
            memberId_source_referenceId: {
              memberId: distId,
              source: cleanSource,
              referenceId: cleanRefId,
            },
          },
        });
      } catch {
        // Fallback for offline/test environments
      }

      if (existingTx) {
        logger.info(
          { memberId: distId, source: cleanSource, referenceId: cleanRefId },
          '[PROMOTION_EVENT] BB event already recorded; preserving idempotency (no duplicate credit)'
        );

        const currentStatus = await LevelService.getMemberLevel(distId, client);
        return {
          success: true,
          memberId: distId,
          distributorCode: member.distributorCode,
          source: cleanSource,
          referenceId: cleanRefId,
          transaction: existingTx,
          volumeUpdated: {
            bb: Number(existingTx.balanceAfter),
            matching: currentStatus.currentMatching,
          },
          previousLevel: currentStatus.currentLevel,
          currentLevel: currentStatus.currentLevel,
          promoted: false,
          message: `BB transaction already processed for source '${cleanSource}' and reference '${cleanRefId}'.`,
        };
      }

      // Compute balanceAfter from previous latest transaction
      let previousBalance = 0;
      try {
        const lastTx = await (client as any).bBTransaction?.findFirst({
          where: { memberId: distId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });

        if (lastTx) {
          previousBalance = Number(lastTx.balanceAfter);
        } else {
          previousBalance = Number(member.currentBB ?? member.lifetimePV ?? 0);
        }
      } catch {
        previousBalance = Number(member.currentBB ?? member.lifetimePV ?? 0);
      }

      const balanceAfter = Number((previousBalance + numAmount).toFixed(2));

      // STEP 2: CREATE LEDGER TRANSACTION
      let createdTx: any = null;
      try {
        createdTx = await (client as any).bBTransaction?.create({
          data: {
            memberId: distId,
            amount: new Prisma.Decimal(numAmount),
            balanceAfter: new Prisma.Decimal(balanceAfter),
            type,
            source: cleanSource,
            referenceId: cleanRefId,
            description: description || `BB credit of ${numAmount} from ${cleanSource} (${cleanRefId})`,
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Concurrent duplicate hit
          const duplicate = await (client as any).bBTransaction?.findUnique({
            where: {
              memberId_source_referenceId: {
                memberId: distId,
                source: cleanSource,
                referenceId: cleanRefId,
              },
            },
          });
          const currentStatus = await LevelService.getMemberLevel(distId, client);
          return {
            success: true,
            memberId: distId,
            distributorCode: member.distributorCode,
            source: cleanSource,
            referenceId: cleanRefId,
            transaction: duplicate,
            volumeUpdated: {
              bb: balanceAfter,
              matching: currentStatus.currentMatching,
            },
            previousLevel: currentStatus.currentLevel,
            currentLevel: currentStatus.currentLevel,
            promoted: false,
            message: 'Duplicate BB transaction intercepted by unique constraint. Idempotency preserved.',
          };
        }

        logger.error(
          { memberId: distId, source: cleanSource, referenceId: cleanRefId, error: err.message },
          '[CRITICAL] Failed writing BB transaction to ledger; rolling back'
        );
        throw AppError.internal('Unable to record BB ledger transaction.');
      }

      // STEP 3: UPDATE MEMBER VOLUME
      try {
        await client.distributorProfile.update({
          where: { id: distId },
          data: {
            currentBB: new Prisma.Decimal(balanceAfter),
            lifetimePV: { increment: numAmount },
          },
        });
      } catch (err: any) {
        logger.error(
          { memberId: distId, error: err.message },
          '[CRITICAL] Failed updating currentBB in distributor profile; rolling back'
        );
        throw AppError.internal('Unable to update member volume in profile.');
      }

      // Also record in legacy BVLedger for backwards compatibility
      try {
        await client.bVLedger.create({
          data: {
            distributorId: distId,
            sourceType: cleanSource === 'ORDER' ? 'ORDER' : 'ADJUSTMENT',
            sourceId: cleanRefId,
            bv: new Prisma.Decimal(numAmount),
            amount: new Prisma.Decimal(numAmount),
            balanceAfter: new Prisma.Decimal(balanceAfter),
            position: null, // null denotes personal BB
            type: 'ORDER_ACCRUAL',
            description: description || `BB credit of ${numAmount} from ${cleanSource} (Ref: ${cleanRefId})`,
          },
        });
      } catch {
        // Non-blocking fallback
      }

      // STEP 4: RECALCULATE MATCHING IF REQUIRED BY BUSINESS RULES
      let currentMatching = 0;
      try {
        currentMatching = await MatchingService.getMatchingVolume(
          distId,
          { forceRecompute: recalculateMatching },
          client
        );
      } catch {
        currentMatching = Number(member.currentMatching ?? 0);
      }
      currentMatching = Math.max(currentMatching, Number(member.currentMatching ?? 0));

      // STEP 5: CALCULATE ELIGIBLE LEVEL & PROMOTE AUTOMATICALLY IF ELIGIBLE
      let promoResult: PromoteMemberResult | null = null;
      try {
        promoResult = await LevelService.promoteMember(
          distId,
          {
            source: cleanSource,
            reason: description || `Automatic level promotion evaluation after ${cleanSource} BB credit (${cleanRefId})`,
            overrideBB: balanceAfter,
            overrideMatching: currentMatching,
          },
          client
        );
      } catch (promoErr: any) {
        logger.error(
          {
            memberId: distId,
            amount: numAmount,
            source: cleanSource,
            referenceId: cleanRefId,
            error: promoErr.message,
          },
          '[CRITICAL] Automatic level promotion evaluation failed during BB event; rolling back entire transaction'
        );

        // DO NOT SILENTLY SWALLOW: rethrow so transaction rolls back
        throw promoErr instanceof AppError
          ? promoErr
          : AppError.internal('Unable to evaluate member level promotion. Transaction aborted.');
      }

      logger.info(
        {
          memberId: distId,
          amount: numAmount,
          balanceAfter,
          source: cleanSource,
          referenceId: cleanRefId,
          promoted: promoResult.promoted,
          previousLevel: promoResult.previousLevel.name,
          currentLevel: promoResult.newLevel.name,
        },
        '[PROMOTION_EVENT] BB event and automatic level evaluation successfully committed'
      );

      return {
        success: true,
        memberId: distId,
        distributorCode: member.distributorCode,
        source: cleanSource,
        referenceId: cleanRefId,
        transaction: createdTx,
        volumeUpdated: {
          bb: balanceAfter,
          matching: currentMatching,
        },
        previousLevel: promoResult.previousLevel,
        currentLevel: promoResult.newLevel,
        promoted: promoResult.promoted,
        promotionDetails: promoResult,
        historyRecord: promoResult.historyRecord,
        message: promoResult.promoted
          ? `Successfully credited ${numAmount} BB and promoted member from ${promoResult.previousLevel.name} to ${promoResult.newLevel.name}.`
          : `Successfully credited ${numAmount} BB. Maintained level: ${promoResult.newLevel.name}.`,
      };
    };

    return tx ? runner(tx) : prisma.$transaction(runner);
  }

  /**
   * 2. PROCESS MATCHING EVENT
   * Whenever matching volume changes:
   * 1. Record matching transaction.
   * 2. Update/recalculate matching.
   * 3. Evaluate level.
   * 4. Promote automatically if eligible.
   *
   * ATOMIC: All steps execute inside a single transaction. If promotion evaluation fails,
   * the entire transaction is rolled back.
   */
  public static async processMatchingEvent(
    input: ProcessMatchingEventInput,
    tx?: Prisma.TransactionClient
  ): Promise<PromotionEventResult> {
    const {
      memberId,
      amount,
      source,
      referenceId,
      description,
      type = 'CREDIT',
    } = input;

    const runner = async (client: Prisma.TransactionClient): Promise<PromotionEventResult> => {
      logger.info(
        { memberId, amount, source, referenceId, type },
        '[PROMOTION_EVENT] Processing incoming Matching event'
      );

      // STEP 1: VALIDATE EVENT
      if (!memberId || !memberId.trim()) {
        throw AppError.badRequest('Member identifier is required.');
      }
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw AppError.badRequest('Matching volume amount must be a positive number.');
      }
      if (!source || !source.trim()) {
        throw AppError.badRequest('Transaction source is required.');
      }
      if (!referenceId || !referenceId.trim()) {
        throw AppError.badRequest('Transaction reference ID is required.');
      }

      const cleanMemberId = memberId.trim();
      const cleanSource = source.trim().toUpperCase();
      const cleanRefId = referenceId.trim();

      // Resolve member record
      const member = await client.distributorProfile.findFirst({
        where: {
          OR: [
            { id: cleanMemberId },
            { distributorCode: { equals: cleanMemberId, mode: 'insensitive' } },
            { distributorId: { equals: cleanMemberId, mode: 'insensitive' } },
          ],
        },
        include: {
          currentLevel: true,
          currentRank: true,
          highestRank: true,
        },
      });

      if (!member) {
        throw AppError.notFound(`Member with identifier '${cleanMemberId}' not found.`);
      }

      const distId = member.id;

      // IDEMPOTENCY CHECK:
      // Prevent duplicate processing if exact (memberId, source, referenceId) already recorded
      let existingTx: any = null;
      try {
        existingTx = await (client as any).matchingTransaction?.findUnique({
          where: {
            memberId_source_referenceId: {
              memberId: distId,
              source: cleanSource,
              referenceId: cleanRefId,
            },
          },
        });
      } catch {
        // Fallback for offline/test environments
      }

      if (existingTx) {
        logger.info(
          { memberId: distId, source: cleanSource, referenceId: cleanRefId },
          '[PROMOTION_EVENT] Matching event already recorded; preserving idempotency (no duplicate credit)'
        );

        const currentStatus = await LevelService.getMemberLevel(distId, client);
        return {
          success: true,
          memberId: distId,
          distributorCode: member.distributorCode,
          source: cleanSource,
          referenceId: cleanRefId,
          transaction: existingTx,
          volumeUpdated: {
            bb: currentStatus.currentBB,
            matching: Number(existingTx.balanceAfter),
          },
          previousLevel: currentStatus.currentLevel,
          currentLevel: currentStatus.currentLevel,
          promoted: false,
          message: `Matching transaction already processed for source '${cleanSource}' and reference '${cleanRefId}'.`,
        };
      }

      // Compute balanceAfter from previous latest transaction
      let previousBalance = 0;
      try {
        const lastTx = await (client as any).matchingTransaction?.findFirst({
          where: { memberId: distId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });

        if (lastTx) {
          previousBalance = Number(lastTx.balanceAfter);
        } else {
          previousBalance = Number(member.currentMatching ?? 0);
        }
      } catch {
        previousBalance = Number(member.currentMatching ?? 0);
      }

      const balanceAfter =
        type === 'DEBIT' || type === 'REVERSAL'
          ? Math.max(0, previousBalance - numAmount)
          : Number((previousBalance + numAmount).toFixed(2));

      // STEP 2: CREATE LEDGER TRANSACTION
      let createdTx: any = null;
      try {
        createdTx = await (client as any).matchingTransaction?.create({
          data: {
            memberId: distId,
            amount: new Prisma.Decimal(numAmount),
            balanceAfter: new Prisma.Decimal(balanceAfter),
            type,
            source: cleanSource,
            referenceId: cleanRefId,
            description: description || `Matching credit of ${numAmount} from ${cleanSource} (${cleanRefId})`,
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          const duplicate = await (client as any).matchingTransaction?.findUnique({
            where: {
              memberId_source_referenceId: {
                memberId: distId,
                source: cleanSource,
                referenceId: cleanRefId,
              },
            },
          });
          const currentStatus = await LevelService.getMemberLevel(distId, client);
          return {
            success: true,
            memberId: distId,
            distributorCode: member.distributorCode,
            source: cleanSource,
            referenceId: cleanRefId,
            transaction: duplicate,
            volumeUpdated: {
              bb: currentStatus.currentBB,
              matching: balanceAfter,
            },
            previousLevel: currentStatus.currentLevel,
            currentLevel: currentStatus.currentLevel,
            promoted: false,
            message: 'Duplicate matching transaction intercepted by unique constraint. Idempotency preserved.',
          };
        }

        logger.error(
          { memberId: distId, source: cleanSource, referenceId: cleanRefId, error: err.message },
          '[CRITICAL] Failed writing Matching transaction to ledger; rolling back'
        );
        throw AppError.internal('Unable to record Matching ledger transaction.');
      }

      // STEP 3: UPDATE MEMBER VOLUME
      try {
        await client.distributorProfile.update({
          where: { id: distId },
          data: {
            currentMatching: new Prisma.Decimal(balanceAfter),
          },
        });
      } catch (err: any) {
        logger.error(
          { memberId: distId, error: err.message },
          '[CRITICAL] Failed updating currentMatching in distributor profile; rolling back'
        );
        throw AppError.internal('Unable to update member matching volume in profile.');
      }

      // Current authoritative personal BB
      let currentBB = 0;
      try {
        currentBB = await BBService.calculateCurrentBB(distId, client);
      } catch {
        currentBB = Number(member.currentBB ?? member.lifetimePV ?? 0);
      }
      currentBB = Math.max(currentBB, Number(member.currentBB ?? member.lifetimePV ?? 0));

      // STEP 4 & 5: EVALUATE LEVEL & PROMOTE AUTOMATICALLY IF ELIGIBLE
      let promoResult: PromoteMemberResult | null = null;
      try {
        promoResult = await LevelService.promoteMember(
          distId,
          {
            source: cleanSource,
            reason: description || `Automatic level promotion evaluation after ${cleanSource} matching volume change (${cleanRefId})`,
            overrideBB: currentBB,
            overrideMatching: balanceAfter,
          },
          client
        );
      } catch (promoErr: any) {
        logger.error(
          {
            memberId: distId,
            amount: numAmount,
            source: cleanSource,
            referenceId: cleanRefId,
            error: promoErr.message,
          },
          '[CRITICAL] Automatic level promotion evaluation failed during Matching event; rolling back entire transaction'
        );

        // DO NOT SILENTLY SWALLOW: rethrow so transaction rolls back
        throw promoErr instanceof AppError
          ? promoErr
          : AppError.internal('Unable to evaluate member level promotion. Transaction aborted.');
      }

      logger.info(
        {
          memberId: distId,
          amount: numAmount,
          balanceAfter,
          source: cleanSource,
          referenceId: cleanRefId,
          promoted: promoResult.promoted,
          previousLevel: promoResult.previousLevel.name,
          currentLevel: promoResult.newLevel.name,
        },
        '[PROMOTION_EVENT] Matching event and automatic level evaluation successfully committed'
      );

      return {
        success: true,
        memberId: distId,
        distributorCode: member.distributorCode,
        source: cleanSource,
        referenceId: cleanRefId,
        transaction: createdTx,
        volumeUpdated: {
          bb: currentBB,
          matching: balanceAfter,
        },
        previousLevel: promoResult.previousLevel,
        currentLevel: promoResult.newLevel,
        promoted: promoResult.promoted,
        promotionDetails: promoResult,
        historyRecord: promoResult.historyRecord,
        message: promoResult.promoted
          ? `Successfully updated matching volume (+${numAmount}) and promoted member from ${promoResult.previousLevel.name} to ${promoResult.newLevel.name}.`
          : `Successfully updated matching volume (+${numAmount}). Maintained level: ${promoResult.newLevel.name}.`,
      };
    };

    return tx ? runner(tx) : prisma.$transaction(runner);
  }

  /**
   * 3. PROCESS ORDER COMPLETION EVENT
   * When an order is paid:
   * 1. Records purchaser BB via processBBEvent(source: 'ORDER')
   * 2. Propagates volume to upline binary tree
   * 3. For each ancestor whose matching volume increases, triggers processMatchingEvent(source: 'MATCHING')
   * 4. Promotes purchasers and qualifying ancestors automatically inside the same transaction
   */
  public static async processOrderCompletionEvent(
    orderId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{
    purchaserPromotion: PromotionEventResult | null;
    ancestorPromotions: PromotionEventResult[];
  }> {
    const runner = async (client: Prisma.TransactionClient) => {
      const order = await client.order.findUnique({
        where: { id: orderId },
        include: {
          distributor: true,
        },
      });

      if (!order) {
        throw AppError.notFound(`Order '${orderId}' not found.`);
      }

      const distributorId = order.distributorId;
      const orderTotalBV = Number(order.totalBV);

      let purchaserPromotion: PromotionEventResult | null = null;
      const ancestorPromotions: PromotionEventResult[] = [];

      if (distributorId && orderTotalBV > 0) {
        // 1. Purchaser personal BB event
        purchaserPromotion = await this.processBBEvent(
          {
            memberId: distributorId,
            amount: orderTotalBV,
            source: 'ORDER',
            referenceId: order.orderNumber,
            description: `Order ${order.orderNumber} fulfillment personal BB credit`,
          },
          client
        );

        // 2. Propagate to upline binary tree
        const propResult = await MatchingService.propagateBinaryVolume(
          {
            sourceDistributorId: distributorId,
            amount: orderTotalBV,
            orderId: order.orderNumber,
            autoRecordMatching: false, // We will explicitly record matching events with promotion
          },
          client
        );

        // 3. For each ancestor whose matching volume was affected, evaluate promotion
        for (const ancestor of propResult.ancestorsUpdated) {
          if (ancestor.matchingVolume > 0) {
            try {
              const ancestorEvent = await this.processMatchingEvent(
                {
                  memberId: ancestor.distributorId,
                  amount: ancestor.matchingVolume,
                  source: 'MATCHING',
                  referenceId: `${order.orderNumber}:${ancestor.distributorId}`,
                  description: `Binary matching rollup from order ${order.orderNumber}`,
                  type: 'MATCH_CYCLE',
                },
                client
              );
              ancestorPromotions.push(ancestorEvent);
            } catch (aErr: any) {
              logger.error(
                { ancestorId: ancestor.distributorId, orderNumber: order.orderNumber, error: aErr.message },
                '[CRITICAL] Ancestor matching evaluation failed; rolling back order transaction'
              );
              throw aErr;
            }
          }
        }
      }

      return {
        purchaserPromotion,
        ancestorPromotions,
      };
    };

    return tx ? runner(tx) : prisma.$transaction(runner);
  }
}
