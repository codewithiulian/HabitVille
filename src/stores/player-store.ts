import { create } from 'zustand';
import { db } from '@/db/db';
import { getLevelFromXP, detectLevelUps } from '@/lib/leveling-engine';
import { ASSET_CATALOG } from '@/config/asset-catalog';
import type { PlayerProfile } from '@/types/player';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface PlayerState {
  xp: number;
  coins: number;
  level: number;
  totalPoints: number;
  population: number;
  firstUseDate: string | null;
  dontShowCheckInToday: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  setPopulation: (count: number) => void;
  setDontShowCheckInToday: (date: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  xp: 0,
  coins: 0,
  level: 1,
  totalPoints: 0,
  population: 0,
  firstUseDate: null,
  dontShowCheckInToday: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const rows = await db.playerProfile.toArray();
    let profile: PlayerProfile;

    if (rows.length > 0) {
      profile = rows[0];
    } else {
      const now = new Date().toISOString();
      profile = {
        id: crypto.randomUUID(),
        totalXP: 0,
        currentCoins: 0,
        totalCoins: 0,
        spentCoins: 0,
        level: 1,
        totalPoints: 0,
        population: 0,
        firstUseDate: now,
        dontShowCheckInToday: null,
        createdAt: now,
        updatedAt: now,
      };
      db.playerProfile.put(profile).catch(() => {});
    }

    set({
      xp: profile.totalXP,
      coins: profile.currentCoins,
      level: profile.level,
      totalPoints: profile.totalPoints,
      population: profile.population,
      firstUseDate: profile.firstUseDate,
      dontShowCheckInToday: profile.dontShowCheckInToday ?? null,
      initialized: true,
    });
  },

  addXP: (amount) => {
    const state = get();
    const newXP = state.xp + amount;
    const newLevel = getLevelFromXP(newXP);
    const now = new Date().toISOString();

    set({
      xp: newXP,
      level: newLevel,
      totalPoints: newXP,
    });

    // Detect level-ups and grant free assets
    if (newLevel > state.level) {
      const result = detectLevelUps(state.xp, newXP, ASSET_CATALOG);
      if (result.unlockedAssets.length > 0) {
        // Lazy-import to avoid circular dependencies
        import('@/stores/inventory-store').then(({ useInventoryStore }) => {
          for (const asset of result.unlockedAssets) {
            useInventoryStore.getState().grantFreeAsset(asset.assetId);
          }
        });
        import('@/stores/shop-store').then(({ useShopStore }) => {
          useShopStore.getState().addNewlyUnlocked(
            result.unlockedAssets.map((a) => a.assetId),
          );
        });
      }
      import('@/stores/game-store').then(({ useGameStore }) => {
        if (!useGameStore.getState().deferLevelUps) {
          useGameStore.getState().queueReward({
            type: 'level-up',
            payload: { level: newLevel, unlockedAssets: result.unlockedAssets },
          });
        }
      });
    }

    db.playerProfile.toArray().then((rows) => {
      if (rows.length > 0) {
        db.playerProfile.update(rows[0].id, {
          totalXP: newXP,
          level: newLevel,
          totalPoints: newXP,
          updatedAt: now,
        }).catch(() => {});
      }
    }).catch(() => {});
  },

  addCoins: (amount) => {
    const state = get();
    const newCoins = state.coins + amount;
    const now = new Date().toISOString();

    set({ coins: newCoins });

    db.playerProfile.toArray().then((rows) => {
      if (rows.length > 0) {
        db.playerProfile.update(rows[0].id, {
          currentCoins: newCoins,
          totalCoins: rows[0].totalCoins + amount,
          updatedAt: now,
        }).catch(() => {});
      }
    }).catch(() => {});
  },

  spendCoins: (amount) => {
    const state = get();
    if (state.coins < amount) return false;

    const newCoins = state.coins - amount;
    const now = new Date().toISOString();

    set({ coins: newCoins });

    db.playerProfile.toArray().then((rows) => {
      if (rows.length > 0) {
        db.playerProfile.update(rows[0].id, {
          currentCoins: newCoins,
          spentCoins: rows[0].spentCoins + amount,
          updatedAt: now,
        }).catch(() => {});
      }
    }).catch(() => {});

    return true;
  },

  setPopulation: (count) => {
    set({ population: count });

    db.playerProfile.toArray().then((rows) => {
      if (rows.length > 0) {
        db.playerProfile.update(rows[0].id, {
          population: count,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }).catch(() => {});
  },

  setDontShowCheckInToday: (date) => {
    set({ dontShowCheckInToday: date });

    db.playerProfile.toArray().then((rows) => {
      if (rows.length > 0) {
        db.playerProfile.update(rows[0].id, {
          dontShowCheckInToday: date,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }).catch(() => {});
  },
}));
