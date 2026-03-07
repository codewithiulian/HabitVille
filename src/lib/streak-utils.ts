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

  const todayStr = formatDate(today);
  let cursor = new Date(today);

  // If today is scheduled but not yet checked in, start from yesterday
  if (isScheduled(habit, todayStr) && !completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  // Walk back up to 400 days max to avoid infinite loops
  for (let i = 0; i < 400; i++) {
    const dateStr = formatDate(cursor);

    // Don't count days before habit was created
    if (dateStr < habit.createdAt.slice(0, 10)) break;

    if (isScheduled(habit, dateStr)) {
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

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isScheduled(habit: Habit, dateStr: string): boolean {
  if (habit.startDate && dateStr < habit.startDate.slice(0, 10)) return false;
  if (habit.endDate && dateStr > habit.endDate.slice(0, 10)) return false;

  const freq = habit.frequency;
  if (freq.type === 'daily') return true;
  if (freq.type === 'weekly' || freq.type === 'monthly') return true;
  if (freq.type === 'times_per_week') return true;

  if (freq.type === 'specific_days' && freq.specificDays) {
    const date = new Date(dateStr + 'T00:00:00');
    const jsDay = date.getDay();
    const day = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
    return freq.specificDays.includes(day);
  }

  return true;
}
