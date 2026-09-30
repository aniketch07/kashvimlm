import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/appError';
import { BBService } from './bb.service';
import { MatchingService } from './matching.service';
import { MemberLevelStatus, MlmLevelConfig } from './level.types';

export const DEFAULT_MLM_LEVELS: MlmLevelConfig[] = [
  {
    level: 0,
    code: 'RANK_STARTER',
    name: 'Starter',
    requiredBB: 0,
    requiredMatching: 0,
    binaryWeeklyCap: 500,
    oneTimeBonus: 0,
    description: 'Initial entry tier upon distributor registration.',
  },
  {
    level: 1,
    code: 'RANK_SILVER',
    name: 'Silver',
    requiredBB: 250,
    requiredMatching: 2000,
    binaryWeeklyCap: 3000,
    oneTimeBonus: 150,
    description: 'Silver leadership tier requiring 250 BB and 2,000 Matching volume.',
  },
  {
    level: 2,
    code: 'RANK_GOLD',
    name: 'Gold',
    requiredBB: 250,
    requiredMatching: 5000,
    binaryWeeklyCap: 10000,
    oneTimeBonus: 500,
    description: 'Gold leadership tier requiring 250 BB and 5,000 Matching volume.',
  },
  {
    level: 3,
    code: 'RANK_PLATINUM',
    name: 'Platinum',
    requiredBB: 500,
    requiredMatching: 50000,
    binaryWeeklyCap: 25000,
    oneTimeBonus: 1500,
    description: 'Platinum leadership tier requiring 500 BB and 50,000 Matching volume.',
  },
  {
    level: 4,
    code: 'RANK_DIAMOND',
    name: 'Diamond',
    requiredBB: 1000,
    requiredMatching: 60000,
    binaryWeeklyCap: 50000,
    oneTimeBonus: 3000,
    description: 'Diamond executive tier requiring 1,000 BB and 60,000 Matching volume.',
  },
  {
    level: 5,
    code: 'RANK_RUBY',
    name: 'Ruby',
    requiredBB: 1000,
    requiredMatching: 100000,
    binaryWeeklyCap: 100000,
    oneTimeBonus: 5000,
    description: 'Ruby executive tier requiring 1,000 BB and 100,000 Matching volume.',
  },
];

export class LevelQualificationService {
  /**
   * Ensures the 6 canonical MLM levels exist in the database Rank table.
   * Maps requiredBB -> minPersonalBV, requiredMatching -> minGroupBV.
   */
  public static async ensureRanks(tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;

    for (const lvl of DEFAULT_MLM_LEVELS) {
      const existing = await db.rank.findFirst({
        where: {
          OR: [{ rankCode: lvl.code }, { level: lvl.level }],
        },
      });

      if (!existing) {
        await db.rank.create({
          data: {
            rankCode: lvl.code,
            name: lvl.name,
            level: lvl.level,
            minPersonalBV: new Prisma.Decimal(lvl.requiredBB),
            minGroupBV: new Prisma.Decimal(lvl.requiredMatching),
            binaryWeeklyCap: new Prisma.Decimal(lvl.binaryWeeklyCap || 0),
            oneTimeBonus: new Prisma.Decimal(lvl.oneTimeBonus || 0),
          },
        });
        logger.info({ levelCode: lvl.code, name: lvl.name }, 'Initialized canonical MLM level in database');
      } else {
        // Update requirements if outdated
        await db.rank.update({
          where: { id: existing.id },
          data: {
            name: lvl.name,
            rankCode: lvl.code,
            minPersonalBV: new Prisma.Decimal(lvl.requiredBB),
            minGroupBV: new Prisma.Decimal(lvl.requiredMatching),
            binaryWeeklyCap: new Prisma.Decimal(lvl.binaryWeeklyCap || 0),
            oneTimeBonus: new Prisma.Decimal(lvl.oneTimeBonus || 0),
          },
        });
      }
    }
  }

  /**
   * Retrieves all configured levels ordered by level ascending (0 to 5).
   */
  public static async getAllLevels(tx?: Prisma.TransactionClient): Promise<MlmLevelConfig[]> {
    const db = tx || prisma;
    try {
      const ranks = await db.rank.findMany({
        orderBy: { level: 'asc' },
      });

      if (ranks && ranks.length > 0) {
        return ranks.map((r) => ({
          id: r.id,
          level: r.level,
          code: r.rankCode,
          name: r.name,
          requiredBB: Number(r.minPersonalBV),
          requiredMatching: Number(r.minGroupBV),
          binaryWeeklyCap: Number(r.binaryWeeklyCap || 0),
          oneTimeBonus: Number(r.oneTimeBonus || 0),
          iconUrl: r.iconUrl,
        }));
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to fetch ranks from database; falling back to default level definitions');
    }

    return DEFAULT_MLM_LEVELS;
  }

  /**
   * Retrieves a specific level config by level number or code.
   */
  public static async getLevelByNumberOrCode(
    levelNumberOrCode: number | string,
    tx?: Prisma.TransactionClient
  ): Promise<MlmLevelConfig | null> {
    const all = await this.getAllLevels(tx);
    if (typeof levelNumberOrCode === 'number') {
      return all.find((l) => l.level === levelNumberOrCode) || null;
    }
    const clean = levelNumberOrCode.trim().toUpperCase();
    return (
      all.find(
        (l) =>
          l.code.toUpperCase() === clean ||
          l.name.toUpperCase() === clean ||
          l.code.toUpperCase() === `RANK_${clean}`
      ) || null
    );
  }

  /**
   * Checks whether a member qualifies for a given level according to the strict rule:
   * member.currentBB >= level.requiredBB AND member.totalMatching >= level.requiredMatching
   */
  public static isQualifiedForLevel(
    currentBB: number,
    totalMatching: number,
    level: MlmLevelConfig
  ): boolean {
    return currentBB >= level.requiredBB && totalMatching >= level.requiredMatching;
  }

  /**
   * Evaluates qualification status and progress toward next level for a distributor.
   */
  public static async evaluateQualification(
    distributorId: string,
    tx?: Prisma.TransactionClient
  ): Promise<MemberLevelStatus> {
    const db = tx || prisma;

    const distributor = await db.distributorProfile.findUnique({
      where: { id: distributorId },
      include: {
        currentRank: true,
        highestRank: true,
      },
    });

    if (!distributor) {
      throw AppError.notFound(`Distributor ${distributorId} not found`);
    }

    // 1. Calculate BB and Matching independently
    const [currentBB, matchingResult, levels] = await Promise.all([
      BBService.calculateCurrentBB(distributorId, db),
      MatchingService.calculateTotalMatching(distributorId, db),
      this.getAllLevels(db),
    ]);

    const totalMatching = matchingResult.totalMatching;

    // 2. Determine highest level qualified for based on strict qualification formula:
    // currentBB >= level.requiredBB && totalMatching >= level.requiredMatching
    let highestEligibleLevel = levels[0]; // defaults to STARTER / BASE

    for (const lvl of levels) {
      if (this.isQualifiedForLevel(currentBB, totalMatching, lvl)) {
        if (lvl.level >= highestEligibleLevel.level) {
          highestEligibleLevel = lvl;
        }
      }
    }

    // Resolve current member rank from DB if already set, or fallback to highest eligible
    let currentLevel = levels.find((l) => l.id === distributor.currentRankId || l.level === distributor.currentRank?.level) || highestEligibleLevel;

    // If distributor currently has a higher rank recorded, maintain continuity
    if (distributor.currentRank && distributor.currentRank.level > currentLevel.level) {
      const dbLvl = levels.find((l) => l.level === distributor.currentRank!.level);
      if (dbLvl) currentLevel = dbLvl;
    }

    // Resolve highest rank
    const highestLevel = levels.find((l) => l.id === distributor.highestRankId || l.level === distributor.highestRank?.level) || currentLevel;

    // 3. Determine Next Level
    const nextLevel = levels.find((l) => l.level === currentLevel.level + 1) || null;
    const isMaxLevel = nextLevel === null;

    // 4. Calculate progress metrics towards next level
    let bbGap = 0;
    let matchingGap = 0;
    let bbProgressPercentage = 100;
    let matchingProgressPercentage = 100;
    let isQualifiedForNext = false;

    if (nextLevel) {
      bbGap = Math.max(0, Number((nextLevel.requiredBB - currentBB).toFixed(2)));
      matchingGap = Math.max(0, Number((nextLevel.requiredMatching - totalMatching).toFixed(2)));

      bbProgressPercentage =
        nextLevel.requiredBB > 0
          ? Math.min(100, Math.round((currentBB / nextLevel.requiredBB) * 100))
          : 100;

      matchingProgressPercentage =
        nextLevel.requiredMatching > 0
          ? Math.min(100, Math.round((totalMatching / nextLevel.requiredMatching) * 100))
          : 100;

      isQualifiedForNext = this.isQualifiedForLevel(currentBB, totalMatching, nextLevel);
    }

    return {
      distributorId: distributor.id,
      distributorCode: distributor.distributorCode,
      displayName: distributor.displayName || `${distributor.firstName} ${distributor.lastName}`.trim(),
      currentBB,
      totalMatching,
      accumulatedLeftVolume: matchingResult.accumulatedLeftVolume,
      accumulatedRightVolume: matchingResult.accumulatedRightVolume,
      currentLevel,
      highestLevel,
      nextLevel,
      isMaxLevel,
      progress: {
        bbGap,
        matchingGap,
        bbProgressPercentage,
        matchingProgressPercentage,
        isQualifiedForNext,
      },
      achievedAt: distributor.updatedAt,
    };
  }
}
