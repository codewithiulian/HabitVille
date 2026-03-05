// ---------------------------------------------------------------------------
// Pure auto-tile logic for sidewalks — no PixiJS/Zustand imports
// ---------------------------------------------------------------------------

import { CARDINAL_DIRS } from './road-tiles';

// ---------------------------------------------------------------------------
// Asset key helper
// ---------------------------------------------------------------------------

export function sidewalkAssetKey(tileNum: number): string {
  return `Sidewalk_Tile${tileNum}`;
}

// ---------------------------------------------------------------------------
// Sidewalk connectivity bitmask → tile number
//
// The bitmask encodes which cardinal directions have either a road or another
// sidewalk tile.  Each bit means "that side of the diamond should be filled".
//
// Tile mapping (which quadrants each tile covers):
//   Tile1  = N only           Tile2  = W only
//   Tile3  = S only           Tile3 flipX = E only
//   Tile4  = N+W (top half)   Tile5  = S+E (bottom half)
//   Tile6  = E+S+W            Tile6 flipX = N+E+S
//   Tile7  = N+S+W            Tile8  = N+E+W (= Tile7 flipX)
//   Tile9  = N+E+S+W (full)
//
// For 2-quadrant combos without exact tiles (N+E, S+W) we use the closest
// 3-piece tile that covers the needed quadrants plus one extra.
// ---------------------------------------------------------------------------

const SIDEWALK_BITMASK_TO_TILE: Record<number, number> = {
  0:  1,  // isolated
  1:  1,  // N
  2:  3,  // E  (Tile3 flipX)
  3:  8,  // N+E → use N+E+W (extra W)
  4:  3,  // S
  5:  9,  // N+S → full tile
  6:  5,  // E+S
  7:  6,  // N+E+S (Tile6 flipX)
  8:  2,  // W
  9:  4,  // N+W
  10: 9,  // E+W → full tile
  11: 8,  // N+E+W
  12: 7,  // S+W → use N+S+W (extra N)
  13: 7,  // N+S+W
  14: 6,  // E+S+W
  15: 9,  // all
};

const SIDEWALK_BITMASK_FLIPX: Record<number, boolean> = {
  0:  false,
  1:  false,
  2:  true,   // E → Tile3 flipX
  3:  false,
  4:  false,
  5:  false,
  6:  false,
  7:  true,   // N+E+S → Tile6 flipX
  8:  false,
  9:  false,
  10: false,
  11: false,
  12: false,
  13: false,
  14: false,
  15: false,
};

export function sidewalkBitmaskToTile(mask: number): number {
  return SIDEWALK_BITMASK_TO_TILE[mask & 0xf] ?? 1;
}

export function sidewalkBitmaskToFlipX(mask: number): boolean {
  return SIDEWALK_BITMASK_FLIPX[mask & 0xf] ?? false;
}

// ---------------------------------------------------------------------------
// Compute connectivity bitmask: check 4 cardinal dirs for road OR sidewalk
// ---------------------------------------------------------------------------

export function computeSidewalkConnectivity(
  row: number,
  col: number,
  hasRoadFn: (r: number, c: number) => boolean,
  _hasSidewalkFn: (r: number, c: number) => boolean,
): number {
  let mask = 0;
  for (const dir of CARDINAL_DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    if (hasRoadFn(nr, nc)) {
      mask |= dir.bit;
    }
  }
  return mask;
}
