import { create } from 'zustand';
import type { Sprite } from 'pixi.js';

export type BuildCategory = 'roads' | 'residential' | 'commercial' | 'public' | 'decorations';

export interface PlacementEntry {
  type: 'place' | 'move';
  sprite: Sprite;
  row: number;
  col: number;
  assetKey: string;
  fromRow?: number;  // only for 'move'
  fromCol?: number;  // only for 'move'
}

interface BuildState {
  buildMode: boolean;
  selectedCategory: BuildCategory | null;
  selectedAsset: string | null; // asset registry key
  placementHistory: PlacementEntry[];
  toastMessage: string | null;

  selectCategory: (category: BuildCategory) => void;
  selectAsset: (assetKey: string) => void;
  deselectAsset: () => void;
  exitBuildMode: () => void;
  pushPlacement: (entry: PlacementEntry) => void;
  popPlacement: () => PlacementEntry | undefined;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  buildMode: false,
  selectedCategory: null,
  selectedAsset: null,
  placementHistory: [],
  toastMessage: null,

  selectCategory: (category) =>
    set({ selectedCategory: category, selectedAsset: null, buildMode: true }),

  selectAsset: (assetKey) => {
    if (get().selectedAsset === assetKey) {
      set({ selectedAsset: null, buildMode: false });
    } else {
      set({ selectedAsset: assetKey, buildMode: true });
    }
  },

  deselectAsset: () =>
    set({ selectedAsset: null, buildMode: false }),

  exitBuildMode: () =>
    set({ buildMode: false, selectedCategory: null, selectedAsset: null }),

  pushPlacement: (entry) =>
    set((s) => ({ placementHistory: [...s.placementHistory, entry] })),

  popPlacement: () => {
    const history = get().placementHistory;
    if (history.length === 0) return undefined;
    const last = history[history.length - 1];
    set({ placementHistory: history.slice(0, -1) });
    return last;
  },

  showToast: (msg) => set({ toastMessage: msg }),
  dismissToast: () => set({ toastMessage: null }),
}));
