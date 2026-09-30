export interface MlmLevelConfig {
  id?: string;
  level: number;
  code: string;
  name: string;
  requiredBB: number;
  requiredMatching: number;
  binaryWeeklyCap?: number;
  oneTimeBonus?: number;
  iconUrl?: string | null;
  description?: string;
}

export interface MemberLevelStatus {
  distributorId: string;
  distributorCode: string;
  displayName: string | null;
  currentBB: number;
  totalMatching: number;
  accumulatedLeftVolume: number;
  accumulatedRightVolume: number;
  currentLevel: MlmLevelConfig;
  highestLevel: MlmLevelConfig;
  nextLevel: MlmLevelConfig | null;
  isMaxLevel: boolean;
  progress: {
    bbGap: number;
    matchingGap: number;
    bbProgressPercentage: number;
    matchingProgressPercentage: number;
    isQualifiedForNext: boolean;
  };
  achievedAt: Date | null;
}

export interface LevelPromotionResult {
  distributorId: string;
  distributorCode: string;
  promoted: boolean;
  previousLevel: MlmLevelConfig;
  newLevel: MlmLevelConfig;
  snapshot: {
    qualifiedBB: number;
    qualifiedMatching: number;
    timestamp: Date;
  };
  message: string;
}

export interface LevelHistoryEntry {
  id: string;
  distributorId: string;
  distributorCode?: string;
  level: number;
  levelCode: string;
  levelName: string;
  qualifiedBB: number;
  qualifiedMatching: number;
  promotedBy: string;
  achievedAt: Date;
}

export interface RecalculationSummary {
  totalEvaluated: number;
  totalPromoted: number;
  promotions: Array<{
    distributorId: string;
    distributorCode: string;
    previousLevel: string;
    newLevel: string;
    qualifiedBB: number;
    qualifiedMatching: number;
  }>;
  errors: Array<{
    distributorId: string;
    error: string;
  }>;
  durationMs: number;
}
