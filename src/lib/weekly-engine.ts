import { GAME_CONFIG } from '@/config/game-config';
import { isScheduledForDate } from '@/lib/schedule-utils';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';
import type { WeeklySnapshot } from '@/types/weekly-snapshot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyCompletion {
  percentage: number;
  completed: number;
  total: number;
  perHabit: Map<string, { completed: number; scheduled: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Get habits scheduled for a specific date.
 */
export function getScheduledHabitsForDate(date: string, habits: Habit[]): Habit[] {
  return habits.filter((h) => isScheduledForDate(h, date));
}

/**
 * Get scheduled habits per day for a full week (Mon–Sun).
 */
export function getScheduledHabitsForWeek(
  weekStart: string,
  habits: Habit[],
): Map<string, Habit[]> {
  const result = new Map<string, Habit[]>();
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    result.set(date, getScheduledHabitsForDate(date, habits));
  }
  return result;
}

/**
 * Calculate weekly completion percentage and per-habit breakdown.
 */
export function calculateWeeklyCompletion(
  weekStart: string,
  habits: Habit[],
  checkIns: CheckIn[],
): WeeklyCompletion {
  const completedByDateAndHabit = new Set<string>();
  for (const ci of checkIns) {
    if (ci.completed) {
      completedByDateAndHabit.add(`${ci.date}:${ci.habitId}`);
    }
  }

  const perHabit = new Map<string, { completed: number; scheduled: number }>();
  let total = 0;
  let completed = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const scheduled = getScheduledHabitsForDate(date, habits);

    for (const habit of scheduled) {
      total++;
      const wasCompleted = completedByDateAndHabit.has(`${date}:${habit.id}`);
      if (wasCompleted) completed++;

      const entry = perHabit.get(habit.id) ?? { completed: 0, scheduled: 0 };
      entry.scheduled++;
      if (wasCompleted) entry.completed++;
      perHabit.set(habit.id, entry);
    }
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { percentage, completed, total, perHabit };
}

/**
 * Look up the weekly bonus multiplier from config tiers.
 */
export function getWeeklyBonusMultiplier(percentage: number): number {
  const tiers = GAME_CONFIG.bonuses.weekly_consistency.tiers;
  for (const tier of tiers) {
    if (percentage >= tier.min_percentage && percentage <= tier.max_percentage) {
      return tier.multiplier;
    }
  }
  return 0;
}

/**
 * Calculate the weekly bonus reward from base earnings and multiplier.
 */
export function calculateWeeklyBonus(
  baseXP: number,
  baseCoins: number,
  multiplier: number,
): { xp: number; coins: number } {
  return {
    xp: Math.round(baseXP * multiplier),
    coins: Math.round(baseCoins * multiplier),
  };
}

/**
 * Generate a complete weekly snapshot record for DB storage.
 */
export function generateWeeklySnapshot(
  weekStart: string,
  habits: Habit[],
  checkIns: CheckIn[],
  baseXPEarned: number,
  baseCoinEarned: number,
): WeeklySnapshot {
  const completion = calculateWeeklyCompletion(weekStart, habits, checkIns);
  const multiplier = getWeeklyBonusMultiplier(completion.percentage);
  const bonus = calculateWeeklyBonus(baseXPEarned, baseCoinEarned, multiplier);

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    weekStart,
    totalScheduled: completion.total,
    totalCompleted: completion.completed,
    completionPercentage: completion.percentage,
    baseXPEarned,
    baseCoinEarned,
    bonusXPEarned: bonus.xp,
    bonusCoinEarned: bonus.coins,
    consistencyTier: `${multiplier}x`,
    createdAt: now,
    updatedAt: now,
  };
}
