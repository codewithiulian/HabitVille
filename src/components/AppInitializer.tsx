'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useHabitStore } from '@/stores/habit-store';
import { useInventoryStore } from '@/stores/inventory-store';
import { useGameStore } from '@/stores/game-store';

export default function AppInitializer() {
  useEffect(() => {
    async function init() {
      await usePlayerStore.getState().initialize();
      await Promise.all([
        useHabitStore.getState().initialize(),
        useInventoryStore.getState().initialize(),
      ]);
      await useGameStore.getState().initialize();
    }
    init();
  }, []);

  return null;
}
