import { create } from 'zustand';
import type { Sprite } from 'pixi.js';
import { loadBuildCategory as loadBuildCategoryAssets } from '../engine/asset-loader';
import { ALL_ROAD_TYPES, parseRoadAssetKey } from '../engine/road-tiles';
import type { RoadType } from '../engine/road-tiles';

export type BuildCategory = 'roads' | 'residential' | 'commercial' | 'public' | 'decorations';

export interface BuildingPlacementEntry {
  type: 'place' | 'move' | 'delete';
  sprite: Sprite;
  row: number;
  col: number;
  assetKey: string;
  buildingId: string;
  fromRow?: number;  // only for 'move'
  fromCol?: number;  // only for 'move'
  catalogAssetId?: string;  // for inventory tracking on undo
}

export interface RoadPlacementEntry {
  type: 'road-place';
  tiles: Array<{ row: number; col: number; roadType: string }>;
  neighborChanges: Array<{ row: number; col: number; roadType: string; tileNum: number }>;
}

export interface RoadDeleteEntry {
  type: 'road-delete';
  row: number;
  col: number;
  roadType: string;
  tileNum: number;
  neighborChanges: Array<{ row: number; col: number; roadType: string; tileNum: number }>;
}

export interface RoadBatchDeleteEntry {
  type: 'road-batch-delete';
  tiles: Array<{ row: number; col: number; roadType: string; tileNum: number }>;
  neighborChanges: Array<{ row: number; col: number; roadType: string; tileNum: number }>;
}

export type PlacementEntry = BuildingPlacementEntry | RoadPlacementEntry | RoadDeleteEntry | RoadBatchDeleteEntry;

export interface SelectedBuildingInfo {
  row: number;
  col: number;
  assetKey: string;
  displayName: string;
  textureKey: string;
}

export interface SelectedRoadInfo {
  row: number;
  col: number;
  roadType: string;
  tileNum: number;
  displayName: string;
  textureKey: string;
}

type CategoryLoadState = 'idle' | 'loading' | 'loaded';

interface BuildState {
  buildMode: boolean;
  selectedCategory: BuildCategory | null;
  selectedAsset: string | null; // asset registry key
  selectedRoadType: RoadType | null; // derived from selectedAsset
  placementHistory: PlacementEntry[];
  toastMessage: string | null;
  selectedBuilding: SelectedBuildingInfo | null;
  popupScreenPos: { x: number; y: number } | null;
  selectedRoad: SelectedRoadInfo | null;
  roadPopupScreenPos: { x: number; y: number } | null;
  categoryLoadState: Record<BuildCategory, CategoryLoadState>;
  selectedColorVariant: string | null;
  roadDeleteMode: boolean;
  roadDeleteSelection: Set<string>;

  selectCategory: (category: BuildCategory) => void;
  selectAsset: (assetKey: string) => void;
  selectColorVariant: (color: string | null) => void;
  deselectAsset: () => void;
  exitBuildMode: () => void;
  pushPlacement: (entry: PlacementEntry) => void;
  popPlacement: () => PlacementEntry | undefined;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  selectBuilding: (info: SelectedBuildingInfo) => void;
  deselectBuilding: () => void;
  updatePopupPos: (x: number, y: number) => void;
  selectRoad: (info: SelectedRoadInfo) => void;
  deselectRoad: () => void;
  updateRoadPopupPos: (x: number, y: number) => void;
  loadCategory: (category: BuildCategory) => Promise<void>;
  enterRoadDeleteMode: () => void;
  exitRoadDeleteMode: () => void;
  toggleRoadDeleteTile: (row: number, col: number) => void;
  clearRoadDeleteSelection: () => void;
}

function deriveRoadType(assetKey: string | null): RoadType | null {
  if (!assetKey) return null;
  const parsed = parseRoadAssetKey(assetKey);
  if (parsed && ALL_ROAD_TYPES.has(parsed.roadType)) {
    return parsed.roadType as RoadType;
  }
  return null;
}

export const useBuildStore = create<BuildState>((set, get) => ({
  buildMode: false,
  selectedCategory: null,
  selectedAsset: null,
  selectedRoadType: null,
  placementHistory: [],
  toastMessage: null,
  selectedBuilding: null,
  popupScreenPos: null,
  selectedRoad: null,
  roadPopupScreenPos: null,
  categoryLoadState: {
    roads: 'idle',
    residential: 'idle',
    commercial: 'idle',
    public: 'idle',
    decorations: 'idle',
  },
  selectedColorVariant: null,
  roadDeleteMode: false,
  roadDeleteSelection: new Set<string>(),

  selectCategory: (category) =>
    set({ selectedCategory: category, selectedAsset: null, selectedRoadType: null, selectedColorVariant: null, buildMode: true, roadDeleteMode: false, roadDeleteSelection: new Set() }),

  selectAsset: (assetKey) => {
    if (get().selectedAsset === assetKey) {
      set({ selectedAsset: null, selectedRoadType: null, selectedColorVariant: null, buildMode: false });
    } else {
      set({ selectedAsset: assetKey, selectedRoadType: deriveRoadType(assetKey), selectedColorVariant: null, buildMode: true, roadDeleteMode: false, roadDeleteSelection: new Set() });
    }
  },

  selectColorVariant: (color) => set({ selectedColorVariant: color }),

  deselectAsset: () =>
    set({ selectedAsset: null, selectedRoadType: null, selectedColorVariant: null, buildMode: false }),

  exitBuildMode: () =>
    set({ buildMode: false, selectedCategory: null, selectedAsset: null, selectedRoadType: null, selectedColorVariant: null, selectedRoad: null, roadPopupScreenPos: null, roadDeleteMode: false, roadDeleteSelection: new Set() }),

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

  selectRoad: (info) => set({ selectedRoad: info, roadPopupScreenPos: null }),
  deselectRoad: () => set({ selectedRoad: null, roadPopupScreenPos: null }),
  updateRoadPopupPos: (x, y) => set({ roadPopupScreenPos: { x, y } }),

  enterRoadDeleteMode: () =>
    set({ roadDeleteMode: true, roadDeleteSelection: new Set(), selectedAsset: null, selectedRoadType: null, buildMode: true }),

  exitRoadDeleteMode: () =>
    set({ roadDeleteMode: false, roadDeleteSelection: new Set() }),

  toggleRoadDeleteTile: (row, col) => {
    const key = `${row},${col}`;
    const prev = get().roadDeleteSelection;
    const next = new Set(prev);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    set({ roadDeleteSelection: next });
  },

  clearRoadDeleteSelection: () =>
    set({ roadDeleteSelection: new Set() }),

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
