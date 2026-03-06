import type { Sprite } from 'pixi.js';
import { gridToScreen } from './iso-utils';
import { getAsset } from './asset-registry';
import { TILE_WIDTH } from '../config/grid-constants';

/**
 * Grass tile images are 512×512 (equal to TILE_WIDTH).
 * Building images are taller; their bottom TILE_WIDTH pixels
 * correspond to the grass-tile area on screen.
 *
 * anchor_y = (textureHeight - TILE_WIDTH) / textureHeight
 * puts the "tile-area top" at gridToScreen.y when offset is 0.
 */
export function computeUprightAnchorY(textureHeight: number): number {
  return (textureHeight - TILE_WIDTH) / textureHeight;
}

/**
 * Position a sprite on the isometric grid using registry metadata.
 *
 * For upright sprites the Y anchor is computed from the texture height
 * so that the lower portion of the image aligns with the grass tile.
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

  const anchorY = asset.anchor.y === 0
    ? 0 // ground tile — keep as-is
    : computeUprightAnchorY(sprite.texture.height);

  sprite.anchor.set(asset.anchor.x, anchorY);

  const pos = gridToScreen(row, col);
  sprite.position.set(
    pos.x + asset.gridOffset.x,
    pos.y + asset.gridOffset.y,
  );
}
