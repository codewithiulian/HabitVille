export interface WeeklySnapshotHabit {
  habitId: string;
  habitName: string;
  completed: number;
  scheduled: number;
}

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
  delivered: boolean;
  perHabitBreakdown: WeeklySnapshotHabit[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
