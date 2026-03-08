import type { Habit } from '@/types/habit';

/**
 * Format a Date to YYYY-MM-DD string.
 */
export function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Check whether a habit is scheduled for a given date string (YYYY-MM-DD).
 * Respects start/end date bounds and frequency config.
 */
export function isScheduledForDate(habit: Habit, dateStr: string): boolean {
  // Use startDate if set, otherwise fall back to createdAt
  const effectiveStart = habit.startDate ?? habit.createdAt;
  if (effectiveStart && dateStr < effectiveStart.slice(0, 10)) return false;
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
