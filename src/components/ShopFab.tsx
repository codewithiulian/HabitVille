'use client';

import { Store } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function ShopFab() {
  const currentMode = useGameStore((s) => s.currentMode);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);

  if (!initialized || currentMode === 'build' || activeScreen !== 'city' || showOnboarding) {
    return null;
  }

  return (
    <button
      onClick={() => useGameStore.getState().openScreen('shop')}
      className="fixed flex items-center justify-center rounded-full bg-amber-500 text-white shadow-lg active:scale-95 transition-transform"
      style={{
        bottom: 88,
        right: 16,
        width: 48,
        height: 48,
        zIndex: 90,
      }}
      aria-label="Open shop"
    >
      <Store size={22} />
    </button>
  );
}
