'use client';

import { Settings } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function BuildToggle() {
  const currentMode = useGameStore((s) => s.currentMode);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode);
  const initialized = useGameStore((s) => s.initialized);

  if (!initialized || showOnboarding || currentMode === 'build') return null;

  return (
    <button
      onClick={toggleBuildMode}
      className="fixed bottom-6 left-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{
        zIndex: 90,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label="Build mode"
    >
      <Settings size={24} color="white" />
    </button>
  );
}
