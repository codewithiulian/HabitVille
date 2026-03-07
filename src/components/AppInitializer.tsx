'use client';

import { useEffect } from 'react';
import { db } from '@/db/db';
import { usePlayerStore } from '@/stores/player-store';
import { useHabitStore } from '@/stores/habit-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useGameStore } from '@/stores/game-store';
import { formatDateString, isScheduledForDate } from '@/lib/schedule-utils';

export default function AppInitializer() {
  useEffect(() => {
    async function init() {
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
