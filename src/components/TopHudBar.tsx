'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { useGameStore } from '@/stores/game-store';
import { getXPProgressInCurrentLevel } from '@/lib/leveling-engine';

// ---------------------------------------------------------------------------
// useAnimatedCounter — ease-out cubic count animation
// ---------------------------------------------------------------------------

function useAnimatedCounter(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = target;
    if (prev === target) return;

    const start = performance.now();
    const from = prev;
    const to = target;

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

// ---------------------------------------------------------------------------
// TopHudBar
// ---------------------------------------------------------------------------

export default function TopHudBar() {
  const coins = usePlayerStore((s) => s.coins);
  const level = usePlayerStore((s) => s.level);
  const xp = usePlayerStore((s) => s.xp);
  const population = usePlayerStore((s) => s.population);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const showOnboarding = useGameStore((s) => s.showOnboarding);
  const initialized = useGameStore((s) => s.initialized);

  const displayCoins = useAnimatedCounter(coins);
  const displayPop = useAnimatedCounter(population);

  const [xpPulse, setXpPulse] = useState(false);
  const [coinFlash, setCoinFlash] = useState(false);
  const [levelPulse, setLevelPulse] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const prevXpRef = useRef(xp);
  const prevCoinsRef = useRef(coins);
  const prevLevelRef = useRef(level);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // XP pulse
  useEffect(() => {
    if (prevXpRef.current !== xp && prevXpRef.current !== 0) {
      setXpPulse(true);
      const t = setTimeout(() => setXpPulse(false), 200);
      return () => clearTimeout(t);
    }
    prevXpRef.current = xp;
  }, [xp]);

  // Coin spend flash
  useEffect(() => {
    if (prevCoinsRef.current > coins && prevCoinsRef.current !== 0) {
      setCoinFlash(true);
      const t = setTimeout(() => setCoinFlash(false), 300);
      return () => clearTimeout(t);
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  // Level-up pulse
  useEffect(() => {
    if (prevLevelRef.current !== level && prevLevelRef.current !== 0) {
      setLevelPulse(true);
      const t = setTimeout(() => setLevelPulse(false), 300);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  const handleXpTap = useCallback(() => {
    setShowTooltip(true);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(false), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  if (!initialized || activeScreen !== 'city' || showOnboarding) return null;

  const progress = getXPProgressInCurrentLevel(xp);

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(env(safe-area-inset-top), 8px)',
        left: 8,
        right: 8,
        zIndex: 85,
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: 14,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        userSelect: 'none',
      }}
    >
      {/* Level badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'transform 0.3s ease',
          transform: levelPulse ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1, letterSpacing: 1 }}>
          LVL
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>
          {level}
        </span>
      </div>

      {/* XP section */}
      <div
        onClick={handleXpTap}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'rgba(0, 0, 0, 0.45)',
            fontWeight: 500,
            transition: 'transform 0.2s ease',
            transform: xpPulse ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: 'left center',
          }}
        >
          {progress.current} / {progress.required} XP
        </span>
        <div
          style={{
            width: '100%',
            height: 5,
            borderRadius: 3,
            background: 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress.percentage}%`,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.8)',
              whiteSpace: 'nowrap',
              zIndex: 86,
            }}
          >
            {progress.current} / {progress.required} XP to Level {level + 1}
          </div>
        )}
      </div>

      {/* Coin counter */}
      <div
        onClick={() => useGameStore.getState().openScreen('shop')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <img src="/assets/coin/coin.svg" alt="coin" style={{ width: 20, height: 20 }} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: coinFlash ? '#ef4444' : '#ca8a04',
            transition: 'color 0.3s ease',
          }}
        >
          {displayCoins.toLocaleString()}
        </span>
      </div>

      {/* Population counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <Users size={16} color="rgba(0, 0, 0, 0.35)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(0, 0, 0, 0.45)',
          }}
        >
          {displayPop.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
