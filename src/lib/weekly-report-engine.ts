import { formatDateString } from '@/lib/schedule-utils';
import { generateWeeklySnapshot } from '@/lib/weekly-engine';
import { db } from '@/db/db';
import { usePlayerStore } from '@/stores/player-store';
import type { WeeklySnapshot } from '@/types/weekly-snapshot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Monday (ISO date) of the most recently completed week.
 * A week is "completed" once Sunday 21:00 has passed.
 */
export function getCompletedWeekStart(now: Date): string {
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const hour = now.getHours();

  // If Sunday >= 21:00, the just-ended week's Monday is 6 days ago
  // Otherwise, the completed week is the one before the current week
  let daysBack: number;

  if (day === 0 && hour >= 21) {
    // Sunday after 9pm — this week just ended
    daysBack = 6;
  } else if (day === 0) {
    // Sunday before 9pm — previous week
    daysBack = 13;
  } else {
    // Mon-Sat — previous week's Monday
    // Current week's Monday is (day - 1) days ago
    // Previous week's Monday is (day - 1 + 7) days ago
    daysBack = day - 1 + 7;
  }

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysBack);
  return formatDateString(monday);
}

/**
 * Determine if the weekly report should trigger.
 */
export function shouldTriggerWeeklyReport(now: Date): { trigger: boolean; weekStart: string } {
  const day = now.getDay();
  const hour = now.getHours();

  // Only trigger after Sunday 21:00 (or any day in the following week)
  // Effectively: always trigger — the real guard is whether a delivered snapshot exists
  const isSundayBefore9pm = day === 0 && hour < 21;

  if (isSundayBefore9pm) {
    // Too early — current week hasn't ended yet, check previous week
  }

  const weekStart = getCompletedWeekStart(now);
  return { trigger: true, weekStart };
}

/**
 * Generate the weekly snapshot, award bonuses, and save to DB.
 */
export async function generateAndAwardWeeklyReport(weekStart: string): Promise<WeeklySnapshot> {
  // Load all habits (including archived — they may have been active during the week)
  const allHabits = await db.habits.toArray();
  // Filter to habits that existed before or during the week
  const weekEndDate = new Date(weekStart + 'T00:00:00');
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = formatDateString(weekEndDate);

  const habits = allHabits.filter((h) => {
    // Include if habit was created before or during the week
    const created = h.createdAt.slice(0, 10);
    return created <= weekEnd;
  });

  // Load check-ins for the week
  const checkIns = await db.checkIns
    .where('date')
    .between(weekStart, weekEnd, true, true)
    .toArray();

  // Sum base earnings from check-ins
  let baseXP = 0;
  let baseCoins = 0;
  for (const ci of checkIns) {
    if (ci.completed) {
      baseXP += ci.xpEarned;
      baseCoins += ci.coinsEarned;
    }
  }

  // Generate the snapshot
  const snapshot = generateWeeklySnapshot(weekStart, habits, checkIns, baseXP, baseCoins);
  snapshot.delivered = true;

  // Save to DB (fire-and-forget pattern)
  db.weeklySnapshots.put(snapshot).catch(() => {});

  // Award bonus XP and coins
  const playerStore = usePlayerStore.getState();
  if (snapshot.bonusXPEarned > 0) {
    playerStore.addXP(snapshot.bonusXPEarned);
  }
  if (snapshot.bonusCoinEarned > 0) {
    playerStore.addCoins(snapshot.bonusCoinEarned);
  }

  return snapshot;
}
