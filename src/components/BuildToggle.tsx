'use client';

import { Wrench, Eye } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';

export default function BuildToggle() {
  const currentMode = useGameStore((s) => s.currentMode);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode);
  const initialized = useGameStore((s) => s.initialized);

  if (!initialized || showOnboarding || activeScreen !== 'city') return null;

  const isBuild = currentMode === 'build';
  const Icon = isBuild ? Eye : Wrench;

  return (
    <button
      onClick={toggleBuildMode}
      className="fixed bottom-6 left-4 flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200"
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        zIndex: 90,
        background: isBuild ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: isBuild ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.1)',
      }}
      aria-label={isBuild ? 'View mode' : 'Build mode'}
    >
      <Icon size={22} color={isBuild ? '#fbbf24' : 'white'} />
    </button>
  );
}
