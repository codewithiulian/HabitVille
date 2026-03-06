import type { Sprite } from 'pixi.js';
import { gridToScreen } from './iso-utils';
import { getAsset } from './asset-registry';
import { TILE_WIDTH, TILE_HEIGHT } from '../config/grid-constants';

/**
 * For a building spanning w rows × h cols the combined tile-area
 * in the image is taller than a single grass tile:
 *
 *   tileAreaH = TILE_WIDTH + (w + h - 2) × (TILE_HEIGHT / 2)
 *
 * anchor_y = (textureHeight - tileAreaH) / textureHeight
 * puts the origin tile's top vertex at gridToScreen.y.
 */
export function computeUprightAnchorY(
  textureHeight: number,
  sizeW: number,
  sizeH: number,
): number {
  const tileAreaH = TILE_WIDTH + (sizeW + sizeH - 2) * (TILE_HEIGHT / 2);
  return (textureHeight - tileAreaH) / textureHeight;
}

/**
 * For multi-tile buildings the origin (top vertex of the base diamond)
 * is not at the image center. For a building spanning w rows × h cols:
 *   anchor_x = w / (w + h)
 *
 * 1×1 → 0.5, 1×2 → 0.333, 2×1 → 0.667, 2×2 → 0.5
 */
export function computeUprightAnchorX(sizeW: number, sizeH: number): number {
  return sizeW / (sizeW + sizeH);
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
      computeUprightAnchorX(asset.size.w, asset.size.h),
      computeUprightAnchorY(sprite.texture.height, asset.size.w, asset.size.h),
    );
  }

  const pos = gridToScreen(row, col);
  sprite.position.set(
    pos.x + asset.gridOffset.x,
    pos.y + asset.gridOffset.y,
  );
}
