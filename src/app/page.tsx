'use client';

import dynamic from 'next/dynamic';

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), {
  ssr: false,
});

const BuildToolbar = dynamic(() => import('@/components/BuildToolbar'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <GameCanvas />
      <BuildToolbar />
    </>
  );
}
