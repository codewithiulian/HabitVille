import { create } from 'zustand';
import { GAME_CONFIG } from '@/config/game-config';
import { usePlayerStore } from './player-store';
import type { GameMode, ActiveScreen, PendingReward } from '@/types/game';

interface GameState {
  currentMode: GameMode;
  activeScreen: ActiveScreen;
  pendingRewards: PendingReward[];
  deferLevelUps: boolean;
  doubleXPEventActive: boolean;
  firstWeekBoostActive: boolean;
  showOnboarding: boolean;
  tutorialStep: number | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  toggleBuildMode: () => void;
  openScreen: (screen: ActiveScreen) => void;
  queueReward: (reward: PendingReward) => void;
  dequeueReward: () => PendingReward | undefined;
  setDeferLevelUps: (defer: boolean) => void;
  setDoubleXPEvent: (active: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setTutorialStep: (step: number | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentMode: 'view',
  activeScreen: 'city',
  pendingRewards: [],
  deferLevelUps: false,
  doubleXPEventActive: false,
  firstWeekBoostActive: false,
  showOnboarding: false,
  tutorialStep: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const playerState = usePlayerStore.getState();
    let firstWeekBoost = false;

    if (playerState.firstUseDate) {
      const firstUse = new Date(playerState.firstUseDate);
      const now = new Date();
      const diffMs = now.getTime() - firstUse.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      firstWeekBoost =
        GAME_CONFIG.bonuses.first_week_boost.enabled &&
        diffDays < GAME_CONFIG.bonuses.first_week_boost.duration_days;
    }

    set({
      currentMode: 'view',
      activeScreen: 'city',
      firstWeekBoostActive: firstWeekBoost,
      initialized: true,
    });
  },

  toggleBuildMode: () => {
    set((s) => ({
      currentMode: s.currentMode === 'build' ? 'view' : 'build',
    }));
  },

  openScreen: (screen) => {
    set({ activeScreen: screen });
  },

  queueReward: (reward) => {
    set((s) => ({ pendingRewards: [...s.pendingRewards, reward] }));
  },

  dequeueReward: () => {
    const state = get();
    if (state.pendingRewards.length === 0) return undefined;
    const [first, ...rest] = state.pendingRewards;
    set({ pendingRewards: rest });
    return first;
  },

  setDeferLevelUps: (defer) => {
    set({ deferLevelUps: defer });
  },

  setDoubleXPEvent: (active) => {
    set({ doubleXPEventActive: active });
  },

  setShowOnboarding: (show) => {
    set({ showOnboarding: show });
  },

  setTutorialStep: (step) => {
    set({ tutorialStep: step });
  },
}));
