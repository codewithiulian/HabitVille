import type { Sprite } from 'pixi.js';
import { gridToScreen } from './iso-utils';
import { getAsset } from './asset-registry';

/**
 * Position a sprite on the isometric grid using registry metadata.
 *
 * - Looks up the asset entry for anchor/offset values
 * - Converts (row, col) to screen position via gridToScreen
 * - Sets sprite anchor and position accordingly
 */
export function placeOnGrid(
  sprite: Sprite,
  row: number,
  col: number,
  assetKey: string,
): void {
  const asset = getAsset(assetKey);
  if (!asset) {
    console.warn(`[placeOnGrid] Unknown asset key: "${assetKey}"`);
    return;
  }

  sprite.anchor.set(asset.anchor.x, asset.anchor.y);

  const pos = gridToScreen(row, col);
  sprite.position.set(
    pos.x + asset.gridOffset.x,
    pos.y + asset.gridOffset.y,
  );
}
