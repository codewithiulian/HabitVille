'use client';

import { useEffect, useRef } from 'react';
import { initGame, destroyGame } from '@/engine/game';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      const canvas = await initGame();
      if (cancelled || !containerRef.current) return;
      containerRef.current.appendChild(canvas);
    }

    mount();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) containerRef.current.removeChild(canvas);
      }
      destroyGame();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  );
}
