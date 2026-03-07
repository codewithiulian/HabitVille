import { create } from 'zustand';
import { db } from '@/db/db';
import { GAME_CONFIG } from '@/config/game-config';
import type { LevelTier } from '@/config/game-config';
import type { PlayerProfile } from '@/types/player';

// ---------------------------------------------------------------------------
// Pure helper
// ---------------------------------------------------------------------------

export function calculateLevel(totalXP: number, tiers: LevelTier[]): number {
  let remaining = totalXP;
  let level = 1;

  for (const tier of tiers) {
    const levelsInTier = tier.to - tier.from + 1;
    const xpForTier = levelsInTier * tier.xp_required;

    if (remaining >= xpForTier) {
      remaining -= xpForTier;
      level = tier.to + 1;
    } else {
      const levelsEarned = Math.floor(remaining / tier.xp_required);
      level = tier.from + levelsEarned;
      return level;
    }
  }

  // Uncapped leveling beyond last tier
  if (GAME_CONFIG.levels.uncapped_leveling && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    const extraLevels = Math.floor(remaining / lastTier.xp_required);
    level += extraLevels;
  }

  return level;
}

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
    const newLevel = calculateLevel(newXP, GAME_CONFIG.levels.tiers);
    const now = new Date().toISOString();

    set({
      xp: newXP,
      level: newLevel,
      totalPoints: newXP,
    });

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
