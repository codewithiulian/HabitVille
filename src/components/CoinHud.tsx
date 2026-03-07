'use client';

import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useGameStore } from '@/stores/game-store';
import { getXPProgressInCurrentLevel } from '@/lib/leveling-engine';

export default function CoinHud() {
  const coins = usePlayerStore((s) => s.coins);
  const level = usePlayerStore((s) => s.level);
  const xp = usePlayerStore((s) => s.xp);
  const currentMode = useGameStore((s) => s.currentMode);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);

  const [displayCoins, setDisplayCoins] = useState(coins);
  const prevCoinsRef = useRef(coins);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCoinsRef.current;
    prevCoinsRef.current = coins;
    if (prev === coins) {
      return;
    }

    const start = performance.now();
    const duration = 400;
    const from = prev;
    const to = coins;

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayCoins(Math.round(from + (to - from) * eased));
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [coins]);

  if (!initialized || currentMode === 'build' || activeScreen !== 'city' || showOnboarding) {
    return null;
  }

  const progress = getXPProgressInCurrentLevel(xp);

  return (
    <div
      onClick={() => useGameStore.getState().openScreen('shop')}
      style={{
        position: 'fixed',
        top: 'max(env(safe-area-inset-top), 12px)',
        left: 12,
        zIndex: 85,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Level badge */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {level}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 60 }}>
        {/* Coin count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14 }}>&#x1FA99;</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
            {displayCoins.toLocaleString()}
          </span>
        </div>

        {/* XP bar */}
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percentage}%`,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
