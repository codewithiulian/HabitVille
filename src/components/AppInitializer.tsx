'use client';

import { useEffect } from 'react';
import { db } from '@/db/db';
import { usePlayerStore } from '@/stores/player-store';
import { useHabitStore } from '@/stores/habit-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useGameStore } from '@/stores/game-store';

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
      }
    }
    init();
  }, []);

  return null;
}
