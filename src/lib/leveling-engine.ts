import { GAME_CONFIG } from '@/config/game-config';
import type { LevelTier } from '@/config/game-config';
import type { CatalogAsset } from '@/types/catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XPProgress {
  current: number;
  required: number;
  percentage: number;
}

export interface LevelUpResult {
  levelsGained: number[];
  newLevel: number;
  unlockedAssets: CatalogAsset[];
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

const tiers = (): LevelTier[] => GAME_CONFIG.levels.tiers;

/**
 * Determine the player's level from cumulative XP.
 * Walks the tier table; beyond the last tier, uses uncapped leveling.
 */
export function getLevelFromXP(totalXP: number): number {
  const tierList = tiers();
  let remaining = totalXP;
  let level = 1;

  for (const tier of tierList) {
    const levelsInTier = tier.to - tier.from + 1;
    const xpForTier = levelsInTier * tier.xp_required;

    if (remaining >= xpForTier) {
      remaining -= xpForTier;
      level = tier.to + 1;
    } else {
      const levelsEarned = Math.floor(remaining / tier.xp_required);
      return tier.from + levelsEarned;
    }
  }

  if (GAME_CONFIG.levels.uncapped_leveling && tierList.length > 0) {
    const lastTier = tierList[tierList.length - 1];
    const extraLevels = Math.floor(remaining / lastTier.xp_required);
    level += extraLevels;
  }

  return level;
}

/**
 * Total cumulative XP required to reach a given level.
 * Level 1 requires 0 XP. Level 2 requires the first tier's xp_required, etc.
 */
export function getXPForLevel(level: number): number {
  const tierList = tiers();
  let totalXP = 0;

  for (const tier of tierList) {
    if (level <= tier.from) break;

    const levelsInTier = Math.min(level, tier.to + 1) - tier.from;
    totalXP += levelsInTier * tier.xp_required;

    if (level <= tier.to) break;
  }

  // Beyond last tier (uncapped)
  if (tierList.length > 0) {
    const lastTier = tierList[tierList.length - 1];
    if (level > lastTier.to) {
      const extraLevels = level - lastTier.to - 1;
      totalXP += extraLevels * lastTier.xp_required;
    }
  }

  return totalXP;
}

/**
 * XP progress within the current level.
 */
export function getXPProgressInCurrentLevel(totalXP: number): XPProgress {
  const currentLevel = getLevelFromXP(totalXP);
  const xpForCurrent = getXPForLevel(currentLevel);
  const xpForNext = getXPForLevel(currentLevel + 1);

  const current = totalXP - xpForCurrent;
  const required = xpForNext - xpForCurrent;
  const percentage = required > 0 ? Math.round((current / required) * 100) : 0;

  return { current, required, percentage };
}

/**
 * Detect all level-ups between oldXP and newXP.
 * Returns levels gained, the new level, and all assets unlocked across those levels.
 */
export function detectLevelUps(
  oldXP: number,
  newXP: number,
  catalog: CatalogAsset[],
): LevelUpResult {
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);

  if (newLevel <= oldLevel) {
    return { levelsGained: [], newLevel: oldLevel, unlockedAssets: [] };
  }

  const levelsGained: number[] = [];
  for (let l = oldLevel + 1; l <= newLevel; l++) {
    levelsGained.push(l);
  }

  const unlockedAssets = catalog.filter(
    (a) => a.unlockLevel > oldLevel && a.unlockLevel <= newLevel,
  );

  return { levelsGained, newLevel, unlockedAssets };
}
