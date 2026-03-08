// ---------------------------------------------------------------------------
// Sidewalk system — auto-generates 1-tile-wide sidewalk overlays on top of
// grass tiles adjacent to roads.  Sidewalks are NEW sprites placed above the
// ground layer — the grass texture is never touched.
// ---------------------------------------------------------------------------

import { Assets, Sprite, Text, Texture } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { getGrid } from './grid';
import { getAsset } from './asset-registry';
import { gridToScreen } from './iso-utils';
import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from '../config/grid-constants';
import { hasRoad } from './road-system';
import { isOccupied } from './build-system';
import { CARDINAL_DIRS } from './road-tiles';
import { sidewalkAssetKey } from './sidewalk-tiles';

const DIAGONAL_DIRS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

import {
  persistSidewalkBatch,
  persistSidewalkDeleteBatch,
} from '../db/city-persistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidewalkEntry {
  sprite: Sprite;
  sprite2?: Sprite;      // second Tile3 when using double-Tile3 instead of Tile5
  tileNum: number;
  flipX: boolean;
  double?: boolean;       // true when NE side uses 2× Tile3
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const sidewalkMap = new Map<string, SidewalkEntry>();

let containers: SceneContainers | null = null;

const GROUND_ANCHOR = { x: 0.5, y: 0 };

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function hasSidewalk(row: number, col: number): boolean {
  return sidewalkMap.has(tileKey(row, col));
}

export function getSidewalkKeys(): IterableIterator<string> {
  return sidewalkMap.keys();
}

// ---------------------------------------------------------------------------
// Tile variant computation
// ---------------------------------------------------------------------------

function isSecondSELayer(row: number, col: number): boolean {
  // Tile is 2 steps SE from a road (road is at row-2 or col-2)
  if (hasRoad(row - 2, col)) return true; // 2 south of road
  if (hasRoad(row, col - 2)) return true; // 2 east of road
  return false;
}

function computeRoadDirs(row: number, col: number): string {
  // Show where THIS tile sits relative to the road (opposite of road direction)
  const dirs: string[] = [];
  if (hasRoad(row + 1, col)) dirs.push('NE');  // road to SW → tile is NE
  if (hasRoad(row, col - 1)) dirs.push('SE');  // road to NW → tile is SE
  if (hasRoad(row - 1, col)) dirs.push('SW');  // road to NE → tile is SW
  if (hasRoad(row, col + 1)) dirs.push('NW');  // road to SE → tile is NW
  return dirs.length > 0 ? dirs.join('+') : 'none';
}

function computeVariant(row: number, col: number): { tileNum: number; flipX: boolean; double?: boolean } {
  // NE side (road is to S): 2× Tile3 side-by-side (one normal + one flipX)
  if (hasRoad(row + 1, col)) return { tileNum: 3, flipX: false, double: true };
  // NW side (road is to E): Tile5
  if (hasRoad(row, col + 1)) return { tileNum: 5, flipX: false };
  // SE side (road is to N or W): Tile4
  if (hasRoad(row - 1, col) || hasRoad(row, col - 1)) return { tileNum: 4, flipX: false };
  // Corner fill (diagonal road): use Tile3 double like NE side
  return { tileNum: 3, flipX: false, double: true };
}

// ---------------------------------------------------------------------------
// Sidewalk sprite management — overlay sprites on top of grass
// ---------------------------------------------------------------------------

function createSidewalkSprite(
  row: number,
  col: number,
  tileNum: number,
  flipX = false,
): Sprite | null {
  if (!containers) return null;

  const assetKey = sidewalkAssetKey(tileNum);
  const asset = getAsset(assetKey);
  if (!asset) return null;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return null;

  const sprite = new Sprite(texture);
  sprite.anchor.set(GROUND_ANCHOR.x, GROUND_ANCHOR.y);
  sprite.label = `sidewalk_${row}_${col}`;
  sprite.eventMode = 'none';
  sprite.scale.x = flipX ? -1 : 1;

  const pos = gridToScreen(row, col);
  sprite.position.set(pos.x, pos.y);

  // Debug label: tile name + road direction (localhost only)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const dirs = computeRoadDirs(row, col);
    const debugText = new Text({
      text: `Tile${tileNum}\n${dirs}`,
      style: {
        fontSize: 9,
        fill: 0xffffff,
        align: 'center',
      },
    });
    debugText.anchor.set(0.5, 0.5);
    debugText.position.set(0, texture.height * 0.5);
    const bg = new Sprite(Texture.WHITE);
    bg.tint = 0xff0000;
    bg.anchor.set(0.5, 0.5);
    bg.position.set(0, texture.height * 0.5);
    bg.width = debugText.width + 4;
    bg.height = debugText.height + 2;
    sprite.addChild(bg);
    sprite.addChild(debugText);
  }

  containers.roadLayer.addChild(sprite);
  return sprite;
}

function removeSidewalkSpriteAt(row: number, col: number): void {
  const key = tileKey(row, col);
  const entry = sidewalkMap.get(key);
  if (!entry) return;
  entry.sprite.removeFromParent();
  entry.sprite.destroy();
  if (entry.sprite2) {
    entry.sprite2.removeFromParent();
    entry.sprite2.destroy();
  }
  sidewalkMap.delete(key);
}

/** Update an existing sidewalk's tile variant if it changed. Returns true if updated. */
function updateSidewalkVariant(row: number, col: number): boolean {
  const key = tileKey(row, col);
  const entry = sidewalkMap.get(key);
  if (!entry) return false;

  const { tileNum, flipX, double } = computeVariant(row, col);
  if (entry.tileNum === tileNum && entry.flipX === flipX && !!entry.double === !!double) return false;

  const assetKey = sidewalkAssetKey(tileNum);
  const asset = getAsset(assetKey);
  if (!asset) return false;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return false;

  entry.sprite.texture = texture;
  entry.sprite.scale.x = flipX ? -1 : 1;
  entry.tileNum = tileNum;
  entry.flipX = flipX;

  // Handle double ↔ single transitions
  if (double && !entry.sprite2) {
    const s2 = createSidewalkSprite(row, col, tileNum, true);
    if (s2) {
      s2.position.x += TILE_WIDTH / 4;
      s2.position.y -= TILE_HEIGHT / 4;
      entry.sprite2 = s2;
    }
  } else if (!double && entry.sprite2) {
    entry.sprite2.removeFromParent();
    entry.sprite2.destroy();
    entry.sprite2 = undefined;
  } else if (double && entry.sprite2) {
    entry.sprite2.texture = texture;
    entry.sprite2.scale.x = -1;
  }
  entry.double = double;

  return true;
}

// ---------------------------------------------------------------------------
// Sidewalk invariant check
// ---------------------------------------------------------------------------

function isBuildableTile(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
  const grid = getGrid();
  if (!grid) return false;
  return grid[row][col].buildable;
}

function shouldHaveSidewalk(_row: number, _col: number): boolean {
  // Sidewalks disabled — roads render without sidewalk overlays
  return false;
}

// ---------------------------------------------------------------------------
// Core: syncSidewalksForArea
// ---------------------------------------------------------------------------

export function syncSidewalksForArea(
  positions: Array<{ row: number; col: number }>,
): void {
  // 1. Expand affected positions to include cardinal + diagonal neighbors
  const affected = new Set<string>();
  for (const p of positions) {
    affected.add(tileKey(p.row, p.col));
    for (const dir of CARDINAL_DIRS) {
      affected.add(tileKey(p.row + dir.dr, p.col + dir.dc));
    }
    for (const diag of DIAGONAL_DIRS) {
      affected.add(tileKey(p.row + diag.dr, p.col + diag.dc));
    }
  }

  const toAdd: Array<{ row: number; col: number }> = [];
  const toRemove: Array<{ row: number; col: number }> = [];

  // 2. Compare "should exist" vs "does exist"
  for (const key of affected) {
    const [row, col] = key.split(',').map(Number);
    const should = shouldHaveSidewalk(row, col);
    const exists = sidewalkMap.has(key);

    if (should && !exists) {
      if (!isOccupied(row, col)) {
        toAdd.push({ row, col });
      }
    } else if (!should && exists) {
      toRemove.push({ row, col });
    }
  }

  // 3. Remove orphaned sidewalks
  const removeDbKeys: string[] = [];
  for (const { row, col } of toRemove) {
    removeSidewalkSpriteAt(row, col);
    removeDbKeys.push(tileKey(row, col));
  }

  // 4. Add missing sidewalks — compute correct tile variant via bitmask
  const addSidewalks: Array<{ row: number; col: number; tileNum: number }> = [];
  for (const { row, col } of toAdd) {
    const { tileNum, flipX, double } = computeVariant(row, col);
    const sprite = createSidewalkSprite(row, col, tileNum, flipX);
    if (!sprite) continue;

    let sprite2: Sprite | undefined;
    if (double) {
      const s2 = createSidewalkSprite(row, col, tileNum, true);
      if (s2) {
        s2.position.x -= TILE_WIDTH / 4;
        s2.position.y -= TILE_HEIGHT / 4;
        sprite2 = s2;
      }
    }

    sidewalkMap.set(tileKey(row, col), { sprite, sprite2, tileNum, flipX, double });
    addSidewalks.push({ row, col, tileNum });
  }

  // 5. Recalculate tile variants for all existing sidewalks in the affected area
  //    (neighbors may have changed due to adds/removes above)
  const variantUpdates: Array<{ row: number; col: number; tileNum: number }> = [];
  for (const key of affected) {
    const [row, col] = key.split(',').map(Number);
    if (updateSidewalkVariant(row, col)) {
      const entry = sidewalkMap.get(key)!;
      variantUpdates.push({ row, col, tileNum: entry.tileNum });
    }
  }

  // 6. Persist deltas to IndexedDB
  const allPersist = [...addSidewalks, ...variantUpdates];
  if (allPersist.length > 0) {
    persistSidewalkBatch(allPersist);
  }
  if (removeDbKeys.length > 0) {
    persistSidewalkDeleteBatch(removeDbKeys);
  }
}

// ---------------------------------------------------------------------------
// Called by road-system when placing a road on a sidewalk tile
// ---------------------------------------------------------------------------

export function removeSidewalkBeforeRoad(row: number, col: number): void {
  const key = tileKey(row, col);
  if (!sidewalkMap.has(key)) return;

  removeSidewalkSpriteAt(row, col);
  persistSidewalkDeleteBatch([key]);
}

// ---------------------------------------------------------------------------
// Restore helpers (called from city-restore.ts during startup)
// ---------------------------------------------------------------------------

export function restoreSidewalkSprite(row: number, col: number, tileNum: number): void {
  // Place with the persisted tileNum; flipX, variant, and double will be corrected
  // in recalcSidewalksAfterRestore once all roads & sidewalks are loaded.
  const sprite = createSidewalkSprite(row, col, tileNum, false);
  if (!sprite) return;
  sidewalkMap.set(tileKey(row, col), { sprite, tileNum, flipX: false });
}

export function restoreAccessorySprite(_row: number, _col: number, _assetKey: string): void {
  // Accessories removed — no-op
}

export function recalcSidewalksAfterRestore(): void {
  // Remove sidewalks that no longer belong (e.g. not adjacent to a road)
  const staleSidewalkKeys: string[] = [];
  for (const key of sidewalkMap.keys()) {
    const [row, col] = key.split(',').map(Number);
    if (!shouldHaveSidewalk(row, col)) {
      staleSidewalkKeys.push(key);
    }
  }

  for (const key of staleSidewalkKeys) {
    const [row, col] = key.split(',').map(Number);
    removeSidewalkSpriteAt(row, col);
  }

  if (staleSidewalkKeys.length > 0) {
    persistSidewalkDeleteBatch(staleSidewalkKeys);
  }

  // Recalculate tile variants for all remaining sidewalks
  const variantUpdates: Array<{ row: number; col: number; tileNum: number }> = [];
  for (const [key, _entry] of sidewalkMap) {
    const [row, col] = key.split(',').map(Number);
    if (updateSidewalkVariant(row, col)) {
      const entry = sidewalkMap.get(key)!;
      variantUpdates.push({ row, col, tileNum: entry.tileNum });
    }
  }

  if (variantUpdates.length > 0) {
    persistSidewalkBatch(variantUpdates);
  }
}

// ---------------------------------------------------------------------------
// Init / Destroy
// ---------------------------------------------------------------------------

export function initSidewalkSystem(sceneContainers: SceneContainers): void {
  containers = sceneContainers;
}

export function destroySidewalkSystem(): void {
  for (const [, entry] of sidewalkMap) {
    entry.sprite.removeFromParent();
    entry.sprite.destroy();
    if (entry.sprite2) {
      entry.sprite2.removeFromParent();
      entry.sprite2.destroy();
    }
  }
  sidewalkMap.clear();
  containers = null;
}
