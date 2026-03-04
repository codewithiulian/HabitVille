// ---------------------------------------------------------------------------
// Pure auto-tile logic for roads — no PixiJS/Zustand imports
// ---------------------------------------------------------------------------

export type RoadType = 'Road' | 'DirtRoad' | 'GrassRoad';

export const ALL_ROAD_TYPES: ReadonlySet<string> = new Set<string>([
  'Road',
  'DirtRoad',
  'GrassRoad',
]);

// ---------------------------------------------------------------------------
// Asset key helpers
// ---------------------------------------------------------------------------

export function roadAssetKey(roadType: string, tileNum: number): string {
  return `${roadType}_Tile${tileNum}`;
}

export function parseRoadAssetKey(
  assetKey: string,
): { roadType: string; tileNum: number } | undefined {
  const m = assetKey.match(/^(Road|DirtRoad|GrassRoad)_Tile(\d)$/);
  if (!m) return undefined;
  return { roadType: m[1], tileNum: Number(m[2]) };
}

// ---------------------------------------------------------------------------
// Cardinal directions (isometric grid coords)
// N = row-1 (iso upper-right), E = col+1 (iso lower-right),
// S = row+1 (iso lower-left),  W = col-1 (iso upper-left)
// ---------------------------------------------------------------------------

export const CARDINAL_DIRS = [
  { bit: 1, dr: -1, dc: 0 }, // N
  { bit: 2, dr: 0, dc: 1 },  // E
  { bit: 4, dr: 1, dc: 0 },  // S
  { bit: 8, dr: 0, dc: -1 }, // W
] as const;

// ---------------------------------------------------------------------------
// Bitmask → tile number lookup (0–15)
// ---------------------------------------------------------------------------

export const BITMASK_TO_TILE: Record<number, number> = {
  0: 8,   // isolated → E+W straight
  1: 7,   // N dead-end → N+S straight
  2: 8,   // E dead-end → E+W straight
  3: 6,   // N+E corner
  4: 7,   // S dead-end → N+S straight
  5: 7,   // N+S straight
  6: 9,   // E+S corner
  7: 1,   // N+E+S missing T → crossroads
  8: 8,   // W dead-end → E+W straight
  9: 4,   // N+W corner
  10: 7,  // E+W straight (flipX)
  11: 1,  // N+E+W missing T → crossroads
  12: 5,  // S+W corner
  13: 2,  // N+S+W T-junction
  14: 3,  // E+S+W T-junction
  15: 1,  // N+E+S+W crossroads
};

export function bitmaskToTile(mask: number): number {
  return BITMASK_TO_TILE[mask & 0xf] ?? 8;
}

/** Returns true when the tile sprite should be flipped horizontally. */
export function bitmaskToFlipX(mask: number): boolean {
  return (mask & 0xf) === 10; // E+W straight uses Tile7 flipped
}

// ---------------------------------------------------------------------------
// Compute bitmask for a tile by checking 4 cardinal neighbors
// ---------------------------------------------------------------------------

export function computeBitmask(
  row: number,
  col: number,
  roadType: string,
  getRoadType: (r: number, c: number) => string | undefined,
): number {
  let mask = 0;
  for (const dir of CARDINAL_DIRS) {
    const neighborType = getRoadType(row + dir.dr, col + dir.dc);
    if (neighborType === roadType) {
      mask |= dir.bit;
    }
  }
  return mask;
}
