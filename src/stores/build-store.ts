import { create } from 'zustand';
import type { Sprite } from 'pixi.js';
import { loadBuildCategory as loadBuildCategoryAssets } from '../engine/asset-loader';

export type BuildCategory = 'roads' | 'residential' | 'commercial' | 'public' | 'decorations';

export interface PlacementEntry {
  type: 'place' | 'move' | 'delete';
  sprite: Sprite;
  row: number;
  col: number;
  assetKey: string;
  buildingId: string;
  fromRow?: number;  // only for 'move'
  fromCol?: number;  // only for 'move'
}

export interface SelectedBuildingInfo {
  row: number;
  col: number;
  assetKey: string;
  displayName: string;
  textureKey: string;
}

type CategoryLoadState = 'idle' | 'loading' | 'loaded';

interface BuildState {
  buildMode: boolean;
  selectedCategory: BuildCategory | null;
  selectedAsset: string | null; // asset registry key
  placementHistory: PlacementEntry[];
  toastMessage: string | null;
  selectedBuilding: SelectedBuildingInfo | null;
  popupScreenPos: { x: number; y: number } | null;
  categoryLoadState: Record<BuildCategory, CategoryLoadState>;

  selectCategory: (category: BuildCategory) => void;
  selectAsset: (assetKey: string) => void;
  deselectAsset: () => void;
  exitBuildMode: () => void;
  pushPlacement: (entry: PlacementEntry) => void;
  popPlacement: () => PlacementEntry | undefined;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  selectBuilding: (info: SelectedBuildingInfo) => void;
  deselectBuilding: () => void;
  updatePopupPos: (x: number, y: number) => void;
  loadCategory: (category: BuildCategory) => Promise<void>;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  buildMode: false,
  selectedCategory: null,
  selectedAsset: null,
  placementHistory: [],
  toastMessage: null,
  selectedBuilding: null,
  popupScreenPos: null,
  categoryLoadState: {
    roads: 'idle',
    residential: 'idle',
    commercial: 'idle',
    public: 'idle',
    decorations: 'idle',
  },

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

  selectBuilding: (info) => set({ selectedBuilding: info, popupScreenPos: null }),
  deselectBuilding: () => set({ selectedBuilding: null, popupScreenPos: null }),
  updatePopupPos: (x, y) => set({ popupScreenPos: { x, y } }),

  loadCategory: async (category) => {
    const current = get().categoryLoadState[category];
    if (current !== 'idle') return;

    set((s) => ({
      categoryLoadState: { ...s.categoryLoadState, [category]: 'loading' },
    }));

    try {
      await loadBuildCategoryAssets(category);
      set((s) => ({
        categoryLoadState: { ...s.categoryLoadState, [category]: 'loaded' },
      }));
    } catch {
      // Reset to idle so user can retry
      set((s) => ({
        categoryLoadState: { ...s.categoryLoadState, [category]: 'idle' },
      }));
    }
  },
}));
