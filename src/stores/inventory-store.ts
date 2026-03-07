import { create } from 'zustand';
import { db } from '@/db/db';
import type { InventoryItem, PlacedAsset } from '@/types/inventory';

interface InventoryState {
  ownedAssets: InventoryItem[];
  placedAssets: PlacedAsset[];
  initialized: boolean;

  initialize: () => Promise<void>;
  purchaseAsset: (assetId: string, colorVariant?: string) => void;
  placeAsset: (assetId: string, gridX: number, gridY: number, colorVariant?: string) => string;
  demolishAsset: (placedAssetId: string) => void;
  grantFreeAsset: (assetId: string, colorVariant?: string) => void;
  getAvailableForPlacement: () => InventoryItem[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ownedAssets: [],
  placedAssets: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const [inventory, placed] = await Promise.all([
      db.inventory.toArray(),
      db.placedAssets.toArray(),
    ]);

    set({
      ownedAssets: inventory,
      placedAssets: placed,
      initialized: true,
    });
  },

  purchaseAsset: (assetId, colorVariant) => {
    const now = new Date().toISOString();
    const state = get();
    const existing = state.ownedAssets.find(
      (a) => a.assetId === assetId && (a.colorVariant ?? null) === (colorVariant ?? null)
    );

    if (existing) {
      const updated: InventoryItem = {
        ...existing,
        quantity: existing.quantity + 1,
        totalPurchased: existing.totalPurchased + 1,
        updatedAt: now,
      };
      set((s) => ({
        ownedAssets: s.ownedAssets.map((a) => (a.id === existing.id ? updated : a)),
      }));
      db.inventory.update(existing.id, {
        quantity: updated.quantity,
        totalPurchased: updated.totalPurchased,
        updatedAt: now,
      }).catch(() => {});
    } else {
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        assetId,
        colorVariant: colorVariant ?? null,
        quantity: 1,
        totalPurchased: 1,
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ ownedAssets: [...s.ownedAssets, item] }));
      db.inventory.put(item).catch(() => {});
    }
  },

  placeAsset: (assetId, gridX, gridY, colorVariant) => {
    const now = new Date().toISOString();
    const state = get();
    const invItem = state.ownedAssets.find(
      (a) => a.assetId === assetId && (a.colorVariant ?? null) === (colorVariant ?? null) && a.quantity > 0
    );

    if (invItem) {
      set((s) => ({
        ownedAssets: s.ownedAssets.map((a) =>
          a.id === invItem.id ? { ...a, quantity: a.quantity - 1, updatedAt: now } : a
        ),
      }));
      db.inventory.update(invItem.id, {
        quantity: invItem.quantity - 1,
        updatedAt: now,
      }).catch(() => {});
    }

    const placedId = crypto.randomUUID();
    const placed: PlacedAsset = {
      id: placedId,
      assetId,
      colorVariant: colorVariant ?? null,
      gridX,
      gridY,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({ placedAssets: [...s.placedAssets, placed] }));
    db.placedAssets.put(placed).catch(() => {});

    return placedId;
  },

  demolishAsset: (placedAssetId) => {
    const state = get();
    const placed = state.placedAssets.find((a) => a.id === placedAssetId);
    if (!placed) return;

    const now = new Date().toISOString();

    // Remove from placed
    set((s) => ({
      placedAssets: s.placedAssets.filter((a) => a.id !== placedAssetId),
    }));
    db.placedAssets.delete(placedAssetId).catch(() => {});

    // Return to inventory
    const invItem = state.ownedAssets.find(
      (a) => a.assetId === placed.assetId && (a.colorVariant ?? null) === (placed.colorVariant ?? null)
    );

    if (invItem) {
      set((s) => ({
        ownedAssets: s.ownedAssets.map((a) =>
          a.id === invItem.id ? { ...a, quantity: a.quantity + 1, updatedAt: now } : a
        ),
      }));
      db.inventory.update(invItem.id, {
        quantity: invItem.quantity + 1,
        updatedAt: now,
      }).catch(() => {});
    } else {
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        assetId: placed.assetId,
        colorVariant: placed.colorVariant ?? null,
        quantity: 1,
        totalPurchased: 0,
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ ownedAssets: [...s.ownedAssets, item] }));
      db.inventory.put(item).catch(() => {});
    }
  },

  grantFreeAsset: (assetId, colorVariant) => {
    get().purchaseAsset(assetId, colorVariant);
  },

  getAvailableForPlacement: () => {
    return get().ownedAssets.filter((a) => a.quantity > 0);
  },
}));
