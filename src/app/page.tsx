'use client';

import dynamic from 'next/dynamic';

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), {
  ssr: false,
});

const BuildToolbar = dynamic(() => import('@/components/BuildToolbar'), {
  ssr: false,
});

const Toast = dynamic(() => import('@/components/Toast'), {
  ssr: false,
});

const BuildingPopup = dynamic(() => import('@/components/BuildingPopup'), {
  ssr: false,
});

const RoadPopup = dynamic(() => import('@/components/RoadPopup'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <GameCanvas />
      <Toast />
      <BuildingPopup />
      <RoadPopup />
      <BuildToolbar />
    </>
  );
}
