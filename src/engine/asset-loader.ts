import { Assets } from 'pixi.js';
import { ASSET_REGISTRY } from './asset-registry';

// ---------------------------------------------------------------------------
// Preloader — loads all textures at init with progress tracking
// Loads each texture individually so a single missing file never
// takes down an entire category of assets.
// ---------------------------------------------------------------------------

export async function loadAllAssets(
  onProgress?: (progress: number) => void,
): Promise<void> {
  const entries = [...ASSET_REGISTRY.values()];
  const total = entries.length;
  let loaded = 0;

  // Load textures in small batches for performance + granular progress
  const BATCH_SIZE = 50;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (entry) => {
        try {
          await Assets.load(entry.textureKey);
        } catch {
          // Missing texture — skip silently, don't crash
        }
      }),
    );

    loaded += batch.length;
    onProgress?.(loaded / total);
  }
}
