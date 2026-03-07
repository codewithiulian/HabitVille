'use client';

import { Settings } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function BuildToggle() {
  const currentMode = useGameStore((s) => s.currentMode);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode);
  const initialized = useGameStore((s) => s.initialized);

  if (!initialized || showOnboarding) return null;

  const active = currentMode === 'build';

  return (
    <button
      onClick={toggleBuildMode}
      className="fixed bottom-6 left-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{
        zIndex: 90,
        background: active ? '#DC2626' : 'rgba(0, 0, 0, 0.6)',
        backdropFilter: active ? 'none' : 'blur(8px)',
      }}
      aria-label={active ? 'Exit build mode' : 'Build mode'}
    >
      <Settings size={24} color="white" className={active ? 'animate-spin-slow' : ''} />
    </button>
  );
}
