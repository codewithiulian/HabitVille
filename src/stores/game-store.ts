import { create } from 'zustand';
import { GAME_CONFIG } from '@/config/game-config';
import { usePlayerStore } from './player-store';
import { useBuildStore } from './build-store';
import type { GameMode, ActiveScreen, PendingReward } from '@/types/game';
import type { WeeklySnapshot } from '@/types/weekly-snapshot';

interface GameState {
  currentMode: GameMode;
  activeScreen: ActiveScreen;
  pendingRewards: PendingReward[];
  deferLevelUps: boolean;
  doubleXPEventActive: boolean;
  firstWeekBoostActive: boolean;
  showOnboarding: boolean;
  showHabitList: boolean;
  weeklyReportSnapshot: WeeklySnapshot | null;
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
  setShowHabitList: (show: boolean) => void;
  setWeeklyReportSnapshot: (snapshot: WeeklySnapshot | null) => void;
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
  showHabitList: false,
  weeklyReportSnapshot: null,
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
    const leaving = get().currentMode === 'build';
    set({ currentMode: leaving ? 'view' : 'build' });
    if (leaving) {
      useBuildStore.getState().exitBuildMode();
    }
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

  setShowHabitList: (show) => {
    set({ showHabitList: show });
  },

  setWeeklyReportSnapshot: (snapshot) => {
    set({ weeklyReportSnapshot: snapshot });
  },

  setTutorialStep: (step) => {
    set({ tutorialStep: step });
  },
}));
