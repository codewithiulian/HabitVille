'use client';

import { useEffect } from 'react';
import { db } from '@/db/db';
import { usePlayerStore } from '@/stores/player-store';
import { useHabitStore } from '@/stores/habit-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useGameStore } from '@/stores/game-store';
import { useThemeStore } from '@/stores/theme-store';
import { formatDateString, isScheduledForDate } from '@/lib/schedule-utils';
import { shouldTriggerWeeklyReport, generateAndAwardWeeklyReport } from '@/lib/weekly-report-engine';

export default function AppInitializer() {
  useEffect(() => {
    async function init() {
      useThemeStore.getState().initialize();

      const isFirstUse = (await db.playerProfile.count()) === 0;

      await usePlayerStore.getState().initialize();
      await Promise.all([
        useHabitStore.getState().initialize(),
        useInventoryStore.getState().initialize(),
      ]);
      await useGameStore.getState().initialize();

      if (isFirstUse) {
        useGameStore.getState().setShowOnboarding(true);
        return;
      }

      // Check if weekly report should trigger (before auto-open check-in)
      const { trigger, weekStart } = shouldTriggerWeeklyReport(new Date());
      if (trigger) {
        const existing = await db.weeklySnapshots
          .where('weekStart')
          .equals(weekStart)
          .first();
        if (!existing || !existing.delivered) {
          try {
            const snapshot = await generateAndAwardWeeklyReport(weekStart);
            useGameStore.getState().setWeeklyReportSnapshot(snapshot);
            useGameStore.getState().openScreen('weekly-report');
            return; // Don't auto-open check-in — show report first
          } catch {
            // Silently continue if report generation fails
          }
        }
      }

      // Auto-open check-in if there are pending habits and user hasn't dismissed
      const today = formatDateString(new Date());
      const playerState = usePlayerStore.getState();
      if (playerState.dontShowCheckInToday === today) return;

      const habits = useHabitStore.getState().habits;
      const scheduled = habits.filter((h) => isScheduledForDate(h, today));
      if (scheduled.length === 0) return;

      const todayCheckIns = await db.checkIns.where('date').equals(today).toArray();
      const checkedInIds = new Set(
        todayCheckIns.filter((c) => c.completed || c.skipped).map((c) => c.habitId),
      );
      const hasPending = scheduled.some((h) => !checkedInIds.has(h.id));

      if (hasPending) {
        useGameStore.getState().openScreen('check-in');
      }
    }
    init();
  }, []);

  return null;
}
