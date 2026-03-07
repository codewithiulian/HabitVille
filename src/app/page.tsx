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

const RoadDeleteConfirm = dynamic(() => import('@/components/RoadDeleteConfirm'), {
  ssr: false,
});

const AppInitializer = dynamic(() => import('@/components/AppInitializer'), {
  ssr: false,
});

const BuildToggle = dynamic(() => import('@/components/BuildToggle'), {
  ssr: false,
});

const HabitFab = dynamic(() => import('@/components/HabitFab'), {
  ssr: false,
});

const Onboarding = dynamic(() => import('@/components/Onboarding'), {
  ssr: false,
});

const TutorialOverlay = dynamic(() => import('@/components/TutorialOverlay'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <AppInitializer />
      <GameCanvas />
      <Toast />
      <BuildingPopup />
      <RoadPopup />
      <RoadDeleteConfirm />
      <BuildToolbar />
      <BuildToggle />
      <HabitFab />
      <Onboarding />
      <TutorialOverlay />
    </>
  );
}
