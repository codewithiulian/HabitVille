import { Assets } from 'pixi.js';
import { ASSET_REGISTRY, getAsset, getAssetsByCategory } from './asset-registry';
import type { BuildCategory } from '../stores/build-store';
import type { AssetCategory } from '../types/assets';

// ---------------------------------------------------------------------------
// BuildCategory → AssetCategory[] mapping
// ---------------------------------------------------------------------------

const BUILD_CATEGORY_ASSETS: Record<BuildCategory, AssetCategory[]> = {
  roads: ['road', 'sidewalk'],
  residential: ['building-residential'],
  commercial: ['building-commercial', 'restaurant'],
  public: ['building-public'],
  decorations: ['decor', 'plant', 'fence', 'vehicle'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;

async function loadBatch(textureKeys: string[]): Promise<void> {
  for (let i = 0; i < textureKeys.length; i += BATCH_SIZE) {
    const batch = textureKeys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (key) => {
        try {
          await Assets.load(key);
        } catch {
          // Missing texture — skip silently, don't crash
        }
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Essential assets — loaded at startup (grid tiles + saved buildings)
// ---------------------------------------------------------------------------

export async function loadEssentialAssets(
  savedAssetKeys: string[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  // Grass + Dirt are the only textures grid.ts needs
  const essentialKeys = new Set<string>();

  const grass = ASSET_REGISTRY.get('Grass');
  const dirt = ASSET_REGISTRY.get('Dirt');
  if (grass) essentialKeys.add(grass.textureKey);
  if (dirt) essentialKeys.add(dirt.textureKey);

  // Add textures for saved buildings so restoreCity() works
  for (const assetKey of savedAssetKeys) {
    const asset = getAsset(assetKey);
    if (asset) essentialKeys.add(asset.textureKey);
  }

  const keys = [...essentialKeys];
  const total = keys.length;
  let loaded = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (key) => {
        try {
          await Assets.load(key);
        } catch {
          // Missing texture — skip silently
        }
      }),
    );
    loaded += batch.length;
    onProgress?.(loaded / total);
  }
}

// ---------------------------------------------------------------------------
// Per-category lazy loading — called when toolbar tab is tapped
// ---------------------------------------------------------------------------

export async function loadBuildCategory(buildCategory: BuildCategory): Promise<void> {
  const assetCategories = BUILD_CATEGORY_ASSETS[buildCategory];
  const textureKeys: string[] = [];

  for (const cat of assetCategories) {
    const assets = getAssetsByCategory(cat);
    for (const asset of assets) {
      textureKeys.push(asset.textureKey);
    }
  }

  await loadBatch(textureKeys);
}
