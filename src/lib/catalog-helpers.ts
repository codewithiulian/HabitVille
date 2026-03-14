import { ASSET_CATALOG } from '@/config/asset-catalog';
import type { CatalogAsset } from '@/types/catalog';

const BASE = 'assets/GiantCityBuilder';

const catalogMap = new Map<string, CatalogAsset>();
for (const a of ASSET_CATALOG) {
  catalogMap.set(a.assetId, a);
}

export function getCatalogAsset(assetId: string): CatalogAsset | undefined {
  return catalogMap.get(assetId);
}

export function getCatalogAssetsByCategory(category: string): CatalogAsset[] {
  return ASSET_CATALOG.filter((a) => a.category === category);
}

export function isHouseAsset(asset: CatalogAsset): boolean {
  return (asset.colorVariants ?? 0) > 0;
}

/**
 * Map a catalog asset ID + optional color to an asset registry key.
 * e.g. ("houses_House_Type1", "Blue") -> "House_Blue_Type1"
 *      ("decorations_ATM") -> "Decor_ATM"
 *      ("plants_Tree1") -> "Tree1"
 *      ("fences_Hedge1") -> "Hedge1"
 */
export function catalogToRegistryKey(catalogAssetId: string, color?: string): string {
  const asset = catalogMap.get(catalogAssetId);
  if (!asset) return catalogAssetId;

  switch (asset.category) {
    case 'houses': {
      // houses_House_Type1 -> House_{Color}_Type1
      const houseType = catalogAssetId.replace('houses_', '');
      const c = color ?? 'Blue';
      // House_Type1 -> House_{Color}_Type1
      return houseType.replace('House_', `House_${c}_`);
    }
    case 'decorations': {
      // decorations_ATM -> Decor_ATM
      const name = catalogAssetId.replace('decorations_', '');
      return `Decor_${name}`;
    }
    case 'plants': {
      // plants_Tree1 -> Tree1
      return catalogAssetId.replace('plants_', '');
    }
    case 'fences': {
      // fences_Hedge1 -> Hedge1
      return catalogAssetId.replace('fences_', '');
    }
    case 'vehicles': {
      // vehicles_CarType1_Blue -> CarType1_Blue_Front (show Front sprite for display)
      return catalogAssetId.replace('vehicles_', '') + '_Front';
    }
    case 'apartments': {
      // apartments_Appartment_Blue_1x1_Level1 -> Appartment_Blue_1x1_Level1
      return catalogAssetId.replace('apartments_', '');
    }
    case 'public_buildings': {
      // public_buildings_Airport_Hangar -> Airport_Hangar
      return catalogAssetId.replace('public_buildings_', '');
    }
    case 'restaurants': {
      // restaurants_Restaurant_Pizza -> Restaurant_Pizza
      return catalogAssetId.replace('restaurants_', '');
    }
    case 'shopping': {
      // shopping_Shop_Butcher_OneFloor -> Shop_Butcher_OneFloor
      return catalogAssetId.replace('shopping_', '');
    }
    default:
      return catalogAssetId;
  }
}

/**
 * Reverse mapping: registry key -> catalog asset ID.
 * e.g. "House_Blue_Type1" -> "houses_House_Type1"
 *      "Decor_ATM" -> "decorations_ATM"
 */
export function registryKeyToCatalogId(registryKey: string): string | null {
  // Houses: House_{Color}_Type{N} -> houses_House_Type{N}
  const houseMatch = registryKey.match(/^House_(?:Blue|Brown|Green|Grey|Pink|Red|White|Yellow)_(Type\d+)$/);
  if (houseMatch) {
    const catalogId = `houses_House_${houseMatch[1]}`;
    return catalogMap.has(catalogId) ? catalogId : null;
  }

  // Decor: Decor_{Name} -> decorations_{Name}
  if (registryKey.startsWith('Decor_')) {
    const name = registryKey.replace('Decor_', '');
    const catalogId = `decorations_${name}`;
    return catalogMap.has(catalogId) ? catalogId : null;
  }

  // Try direct category prefixes
  const prefixMap: Array<[string, string]> = [
    ['apartments_', 'Appartment_'],
    ['public_buildings_', ''],
    ['restaurants_', 'Restaurant_'],
    ['shopping_', 'Shop_'],
    ['vehicles_', ''],
    ['plants_', ''],
    ['fences_', ''],
  ];

  for (const [catPrefix, keyPrefix] of prefixMap) {
    if (keyPrefix && !registryKey.startsWith(keyPrefix)) continue;
    const catalogId = `${catPrefix}${registryKey}`;
    if (catalogMap.has(catalogId)) return catalogId;
  }

  // Brute force: search catalog for matching spriteKey stem
  for (const asset of ASSET_CATALOG) {
    const derived = catalogToRegistryKey(asset.assetId);
    if (derived === registryKey) return asset.assetId;
  }

  return null;
}

/**
 * Extract color from a house registry key.
 * e.g. "House_Blue_Type1" -> "Blue", "Decor_ATM" -> undefined
 */
export function extractHouseColor(registryKey: string): string | undefined {
  const m = registryKey.match(/^House_(Blue|Brown|Green|Grey|Pink|Red|White|Yellow)_Type\d+$/);
  return m ? m[1] : undefined;
}

/**
 * Get the sprite path for a specific house type + color.
 */
export function houseSpriteKey(houseType: string, color: string): string {
  // houseType: "House_Type1", color: "Blue"
  return `${BASE}/Houses/${color}/${houseType}.png`;
}
