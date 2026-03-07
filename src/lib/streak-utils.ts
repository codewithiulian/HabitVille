import { isScheduledForDate, formatDateString } from '@/lib/schedule-utils';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';

/**
 * Walk backward from today through scheduled days only.
 * If today is scheduled but unchecked, start from yesterday.
 * Count consecutive scheduled days with check-ins; stop at first miss.
 */
export function calculateStreak(habit: Habit, checkIns: CheckIn[]): number {
  const completedDates = new Set(
    checkIns.filter((c) => c.completed).map((c) => c.date),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDateString(today);
  let cursor = new Date(today);

  // If today is scheduled but not yet checked in, start from yesterday
  if (isScheduledForDate(habit, todayStr) && !completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // Walk back up to 400 days max to avoid infinite loops
  for (let i = 0; i < 400; i++) {
    const dateStr = formatDateString(cursor);

    // Don't count days before habit was created
    if (dateStr < habit.createdAt.slice(0, 10)) break;

    if (isScheduledForDate(habit, dateStr)) {
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    // Non-scheduled days are skipped (don't break streak)
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
