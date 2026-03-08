'use client';

import dynamic from 'next/dynamic';
import { useGameStore } from '@/stores/game-store';

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

const TopHudBar = dynamic(() => import('@/components/TopHudBar'), {
  ssr: false,
});

const MenuButton = dynamic(() => import('@/components/MenuButton'), {
  ssr: false,
});

const ShopScreen = dynamic(() => import('@/components/ShopScreen'), {
  ssr: false,
});

const StatsScreen = dynamic(() => import('@/components/StatsScreen'), {
  ssr: false,
});

const SettingsScreen = dynamic(() => import('@/components/SettingsScreen'), {
  ssr: false,
});

const RewardReveal = dynamic(() => import('@/components/RewardReveal'), {
  ssr: false,
});

const CheckInScreen = dynamic(() => import('@/components/CheckInScreen'), {
  ssr: false,
});

const HabitList = dynamic(() => import('@/components/HabitList'), {
  ssr: false,
});

function HabitListFromMenu() {
  const show = useGameStore((s) => s.showHabitList);
  if (!show) return null;
  return <HabitList onClose={() => useGameStore.getState().setShowHabitList(false)} />;
}

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
      <TopHudBar />
      <HabitFab />
      <MenuButton />
      <ShopScreen />
      <StatsScreen />
      <SettingsScreen />
      <RewardReveal />
      <CheckInScreen />
      <HabitListFromMenu />
      <Onboarding />
      <TutorialOverlay />
    </>
  );
}
