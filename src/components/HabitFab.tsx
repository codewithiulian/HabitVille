'use client';

import { ClipboardList } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function HabitFab() {
  const currentMode = useGameStore((s) => s.currentMode);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);
  const openScreen = useGameStore((s) => s.openScreen);

  if (!initialized || currentMode === 'build' || showOnboarding || activeScreen === 'check-in') return null;

  return (
    <button
      onClick={() => openScreen('check-in')}
      className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{ zIndex: 90 }}
      aria-label="Check in habits"
    >
      <ClipboardList size={24} />
    </button>
  );
}
