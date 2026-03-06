import type { Sprite } from 'pixi.js';
import { gridToScreen } from './iso-utils';
import { getAsset } from './asset-registry';
import { TILE_WIDTH, TILE_HEIGHT } from '../config/grid-constants';

/**
 * Derive the tile footprint sum (w + h) from the texture width.
 * Expected image widths: 1×1 → 512, 1×2 → 768, 2×2 → 1024.
 *   w + h = textureWidth * 2 / TILE_WIDTH
 */
function tileSum(textureWidth: number): number {
  return (textureWidth * 2) / TILE_WIDTH;
}

/**
 * Compute anchor_y from texture dimensions so the tile area at the
 * bottom of the image aligns with the grass tiles.
 *
 *   tileAreaH = TILE_WIDTH + (w + h - 2) × (TILE_HEIGHT / 2)
 *   anchor_y  = (textureHeight - tileAreaH) / textureHeight
 */
export function computeUprightAnchorY(
  textureHeight: number,
  textureWidth: number,
): number {
  const wPlusH = tileSum(textureWidth);
  const tileAreaH = TILE_WIDTH + (wPlusH - 2) * (TILE_HEIGHT / 2);
  return (textureHeight - tileAreaH) / textureHeight;
}

/**
 * Compute anchor_x from texture width.
 * For even w+h (1×1, 2×2) → 0.5.  For odd w+h (1×2) → 1/3.
 */
export function computeUprightAnchorX(textureWidth: number): number {
  const wPlusH = tileSum(textureWidth);
  // Square footprint when w+h is even, otherwise assume w=1
  const w = wPlusH % 2 === 0 ? wPlusH / 2 : 1;
  return w / wPlusH;
}

/**
 * Position a sprite on the isometric grid using registry metadata.
 *
 * For upright sprites both anchors are computed from texture dimensions
 * and the asset's tile size so the building aligns with the grass tiles.
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

  if (asset.anchor.y === 0) {
    // Ground tile — use registry anchor as-is
    sprite.anchor.set(asset.anchor.x, 0);
  } else {
    sprite.anchor.set(
      computeUprightAnchorX(sprite.texture.width),
      computeUprightAnchorY(sprite.texture.height, sprite.texture.width),
    );
  }

  const pos = gridToScreen(row, col);
  sprite.position.set(
    pos.x + asset.gridOffset.x,
    pos.y + asset.gridOffset.y,
  );
}
