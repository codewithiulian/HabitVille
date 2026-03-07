import { GAME_CONFIG } from '@/config/game-config';
import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';
import { calculateStreak } from '@/lib/streak-utils';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

/**
 * Current streak for a specific habit.
 * Filters check-ins to the given habit, then delegates to the existing streak algorithm.
 */
export function calculateCurrentStreak(
  habitId: string,
  checkIns: CheckIn[],
  habit: Habit,
): number {
  const filtered = checkIns.filter((c) => c.habitId === habitId);
  return calculateStreak(habit, filtered);
}

/**
 * Longest streak ever achieved for a habit.
 * Walks all scheduled days from habit creation to today, tracking max consecutive completions.
 */
export function calculateLongestStreak(
  habitId: string,
  checkIns: CheckIn[],
  habit: Habit,
): number {
  const completedDates = new Set(
    checkIns
      .filter((c) => c.habitId === habitId && c.completed)
      .map((c) => c.date),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(habit.createdAt.slice(0, 10) + 'T00:00:00');
  let longest = 0;
  let current = 0;

  while (cursor <= today) {
    const dateStr = formatDateString(cursor);

    if (isScheduledForDate(habit, dateStr)) {
      if (completedDates.has(dateStr)) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    // Non-scheduled days don't break streak

    cursor.setDate(cursor.getDate() + 1);
  }

  return longest;
}

/**
 * Check if the current streak just hit a milestone threshold.
 * Returns the milestone value if it matches exactly, otherwise null.
 */
export function checkStreakMilestone(currentStreak: number): number | null {
  const thresholds = GAME_CONFIG.streaks.milestone_thresholds;
  return thresholds.includes(currentStreak) ? currentStreak : null;
}
