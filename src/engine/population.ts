import { registryKeyToCatalogId } from '../lib/catalog-helpers';
import { getCatalogAsset } from '../lib/catalog-helpers';
import { GAME_CONFIG } from '../config/game-config';

// ---------------------------------------------------------------------------
// Housing classifier — pure functions, no React imports
// ---------------------------------------------------------------------------

const APARTMENT_SIZE_RE = /_(\d+x\d+)_/;

/**
 * Return the population contribution for a single placed asset.
 * Houses → per_housing_type.house (4)
 * Apartments → small_apartment (20) or large_apartment (40) based on grid size
 * Everything else → 0
 */
export function getPopulationContribution(assetKey: string): number {
  const catalogId = registryKeyToCatalogId(assetKey);
  if (!catalogId) return 0;

  const asset = getCatalogAsset(catalogId);
  if (!asset) return 0;

  const { per_housing_type } = GAME_CONFIG.population;

  if (asset.category === 'houses') {
    return per_housing_type.house ?? 0;
  }

  if (asset.category === 'apartments') {
    const match = assetKey.match(APARTMENT_SIZE_RE);
    if (match) {
      const size = match[1]; // "1x1", "1x2", or "2x2"
      if (size === '1x1') return per_housing_type.small_apartment ?? 0;
      return per_housing_type.large_apartment ?? 0; // 1x2, 2x2
    }
    // Fallback if size can't be parsed
    return per_housing_type.small_apartment ?? 0;
  }

  return 0;
}

/**
 * Recalculate total population from an array of asset registry keys.
 * Used for self-healing on game load.
 */
export function recalcPopulation(assetKeys: string[]): number {
  let total = 0;
  for (const key of assetKeys) {
    total += getPopulationContribution(key);
  }
  return total;
}
