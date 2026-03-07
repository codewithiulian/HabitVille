import { create } from 'zustand';
import type { ShopCategoryId } from '@/config/shop-categories';
import type { CatalogAsset } from '@/types/catalog';

interface ShopState {
  selectedCategory: ShopCategoryId;
  detailAsset: CatalogAsset | null;
  previewColor: string;
  newlyUnlockedIds: Set<string>;

  selectCategory: (category: ShopCategoryId) => void;
  openDetail: (asset: CatalogAsset) => void;
  closeDetail: () => void;
  setPreviewColor: (color: string) => void;
  markSeen: (assetId: string) => void;
  addNewlyUnlocked: (assetIds: string[]) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  selectedCategory: 'houses',
  detailAsset: null,
  previewColor: 'Blue',
  newlyUnlockedIds: new Set(),

  selectCategory: (category) => set({ selectedCategory: category }),

  openDetail: (asset) => set({ detailAsset: asset, previewColor: 'Blue' }),

  closeDetail: () => set({ detailAsset: null }),

  setPreviewColor: (color) => set({ previewColor: color }),

  markSeen: (assetId) =>
    set((s) => {
      const next = new Set(s.newlyUnlockedIds);
      next.delete(assetId);
      return { newlyUnlockedIds: next };
    }),

  addNewlyUnlocked: (assetIds) =>
    set((s) => {
      const next = new Set(s.newlyUnlockedIds);
      for (const id of assetIds) next.add(id);
      return { newlyUnlockedIds: next };
    }),
}));
