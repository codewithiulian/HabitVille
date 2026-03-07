export interface WeeklySnapshot {
  id: string;
  weekStart: string;           // ISO date string (Monday)
  totalScheduled: number;
  totalCompleted: number;
  completionPercentage: number;
  baseXPEarned: number;
  baseCoinEarned: number;
  bonusXPEarned: number;
  bonusCoinEarned: number;
  consistencyTier: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
