import { create } from 'zustand';

export type BuildCategory = 'roads' | 'residential' | 'commercial' | 'public' | 'decorations';

interface BuildState {
  buildMode: boolean;
  selectedCategory: BuildCategory | null;
  selectedAsset: string | null; // asset registry key

  selectCategory: (category: BuildCategory) => void;
  selectAsset: (assetKey: string) => void;
  deselectAsset: () => void;
  exitBuildMode: () => void;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  buildMode: false,
  selectedCategory: null,
  selectedAsset: null,

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
}));
