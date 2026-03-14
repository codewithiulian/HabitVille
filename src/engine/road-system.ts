import { Assets, Sprite, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { screenToGrid, gridToScreen } from './iso-utils';
import { getGameWorld } from './camera';
import { getAsset } from './asset-registry';
import { getGrid, getGroundSprite } from './grid';
import { GRID_SIZE } from '../config/grid-constants';
import { isOccupied } from './build-system';
import { useBuildStore } from '../stores/build-store';
import {
  persistRoad,
  persistRoadBatch,
  persistRoadDelete,
  persistRoadDeleteBatch,
} from '../db/city-persistence';
import {
  ALL_ROAD_TYPES,
  roadAssetKey,
  computeBitmask,
  bitmaskToTile,
  bitmaskToFlipX,
  CARDINAL_DIRS,
} from './road-tiles';
import {
  syncSidewalksForArea,
  hasSidewalk,
  removeSidewalkBeforeRoad,
} from './sidewalk-system';

// ---------------------------------------------------------------------------
// Road map — in-memory road state
// ---------------------------------------------------------------------------

interface RoadEntry {
  sprite: Sprite;
  roadType: string;
  tileNum: number;
  flipX: boolean;
}

const roadMap = new Map<string, RoadEntry>();
const originalGroundTextures = new Map<string, { texture: Texture; label: string }>();

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getRoadAt(
  row: number,
  col: number,
): { sprite: Sprite; roadType: string; tileNum: number } | undefined {
  return roadMap.get(tileKey(row, col));
}

export function hasRoad(row: number, col: number): boolean {
  return roadMap.has(tileKey(row, col));
}

export function getAllRoadKeys(): string[] {
  return Array.from(roadMap.keys());
}

/** Used by computeBitmask — returns roadType at (r,c) or undefined */
function getRoadTypeAt(r: number, c: number): string | undefined {
  return roadMap.get(tileKey(r, c))?.roadType;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let containers: SceneContainers | null = null;
let pixiApp: Application | null = null;
let suppressSidewalkSync = false;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUND_ANCHOR = { x: 0.5, y: 0 };
const DRAG_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// Sprite management
// ---------------------------------------------------------------------------

function createRoadSprite(
  row: number,
  col: number,
  roadType: string,
  tileNum: number,
  flipX = false,
): Sprite | null {
  const assetKey = roadAssetKey(roadType, tileNum);
  const asset = getAsset(assetKey);
  if (!asset) return null;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return null;

  const groundSprite = getGroundSprite(row, col);
  if (!groundSprite) return null;

  // If there's a sidewalk here, remove it first so we save the original grass texture
  if (hasSidewalk(row, col)) {
    removeSidewalkBeforeRoad(row, col);
  }

  // Save original ground texture if not already saved
  const key = tileKey(row, col);
  if (!originalGroundTextures.has(key)) {
    originalGroundTextures.set(key, { texture: groundSprite.texture, label: groundSprite.label });
  }

  // Swap texture on the existing ground sprite
  groundSprite.texture = texture;
  groundSprite.label = `road_${roadType}_${row}_${col}`;
  groundSprite.scale.x = flipX ? -1 : 1;

  return groundSprite;
}

function updateRoadSprite(entry: RoadEntry, newTileNum: number, newFlipX: boolean): void {
  if (entry.tileNum === newTileNum && entry.flipX === newFlipX) return;

  const assetKey = roadAssetKey(entry.roadType, newTileNum);
  const asset = getAsset(assetKey);
  if (!asset) return;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return;

  entry.sprite.texture = texture;
  entry.sprite.scale.x = newFlipX ? -1 : 1;
  entry.tileNum = newTileNum;
  entry.flipX = newFlipX;
}

function restoreGroundTexture(row: number, col: number): void {
  const key = tileKey(row, col);
  const saved = originalGroundTextures.get(key);
  const entry = roadMap.get(key);
  if (saved && entry) {
    entry.sprite.texture = saved.texture;
    entry.sprite.label = saved.label;
    entry.sprite.scale.x = 1; // Reset flip
    entry.sprite.tint = 0xffffff;
    entry.sprite.alpha = 1;
  }
  originalGroundTextures.delete(key);
}

// ---------------------------------------------------------------------------
// Auto-tile recalculation
// ---------------------------------------------------------------------------

interface TileChange {
  row: number;
  col: number;
  roadType: string;
  tileNum: number;
}

function recalcTileAndNeighbors(row: number, col: number): TileChange[] {
  const changes: TileChange[] = [];

  // Recalc the tile itself
  const self = roadMap.get(tileKey(row, col));
  if (self) {
    const mask = computeBitmask(row, col, self.roadType, getRoadTypeAt);
    const newTile = bitmaskToTile(mask);
    const newFlip = bitmaskToFlipX(mask);
    if (newTile !== self.tileNum || newFlip !== self.flipX) {
      updateRoadSprite(self, newTile, newFlip);
      changes.push({ row, col, roadType: self.roadType, tileNum: newTile });
    }
  }

  // Recalc 4 cardinal neighbors
  for (const dir of CARDINAL_DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    const neighbor = roadMap.get(tileKey(nr, nc));
    if (!neighbor) continue;

    const mask = computeBitmask(nr, nc, neighbor.roadType, getRoadTypeAt);
    const newTile = bitmaskToTile(mask);
    const newFlip = bitmaskToFlipX(mask);
    if (newTile !== neighbor.tileNum || newFlip !== neighbor.flipX) {
      updateRoadSprite(neighbor, newTile, newFlip);
      changes.push({ row: nr, col: nc, roadType: neighbor.roadType, tileNum: newTile });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Depth sort
// ---------------------------------------------------------------------------

function depthSortRoads(): void {
  // No-op: road textures are on ground sprites (already depth-sorted)
}

// ---------------------------------------------------------------------------
// Tile validation
// ---------------------------------------------------------------------------

function isRoadTileValid(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
  const grid = getGrid();
  if (!grid) return false;
  if (!grid[row][col].buildable) return false;
  if (isOccupied(row, col)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

export function placeRoad(row: number, col: number, roadType: string): TileChange[] | null {
  if (!isRoadTileValid(row, col)) return null;

  // Don't place if same road type already there
  const existing = roadMap.get(tileKey(row, col));
  if (existing && existing.roadType === roadType) return null;

  // Remove existing road of different type if present
  if (existing) {
    restoreGroundTexture(row, col);
    roadMap.delete(tileKey(row, col));
  }

  // Initial tile number (will be recalculated)
  const initialMask = computeBitmask(row, col, roadType, getRoadTypeAt);
  const initialTile = bitmaskToTile(initialMask);
  const initialFlip = bitmaskToFlipX(initialMask);
  const sprite = createRoadSprite(row, col, roadType, initialTile, initialFlip);
  if (!sprite) return null;

  roadMap.set(tileKey(row, col), { sprite, roadType, tileNum: initialTile, flipX: initialFlip });

  const changes = recalcTileAndNeighbors(row, col);
  depthSortRoads();

  // Persist placed tile + any neighbor changes
  const selfEntry = roadMap.get(tileKey(row, col))!;
  persistRoad(row, col, roadType, selfEntry.tileNum);
  if (changes.length > 0) {
    persistRoadBatch(changes);
  }

  if (!suppressSidewalkSync) {
    syncSidewalksForArea([{ row, col }]);
  }

  return changes;
}

export function removeRoad(row: number, col: number): TileChange[] | null {
  const entry = roadMap.get(tileKey(row, col));
  if (!entry) return null;

  restoreGroundTexture(row, col);
  roadMap.delete(tileKey(row, col));

  const changes = recalcTileAndNeighbors(row, col);

  persistRoadDelete(row, col);
  if (changes.length > 0) {
    persistRoadBatch(changes);
  }

  if (!suppressSidewalkSync) {
    syncSidewalksForArea([{ row, col }]);
  }

  return changes;
}

export function placeRoadBatch(
  tiles: Array<{ row: number; col: number }>,
  roadType: string,
): { placed: Array<{ row: number; col: number }>; neighborChanges: TileChange[] } {
  const placed: Array<{ row: number; col: number }> = [];
  const allNeighborChanges: TileChange[] = [];

  for (const t of tiles) {
    if (!isRoadTileValid(t.row, t.col)) continue;

    const existing = roadMap.get(tileKey(t.row, t.col));
    if (existing && existing.roadType === roadType) continue;

    // Remove existing road of different type
    if (existing) {
      restoreGroundTexture(t.row, t.col);
      roadMap.delete(tileKey(t.row, t.col));
    }

    const initMask = computeBitmask(t.row, t.col, roadType, getRoadTypeAt);
    const initialTile = bitmaskToTile(initMask);
    const initialFlip = bitmaskToFlipX(initMask);
    const sprite = createRoadSprite(t.row, t.col, roadType, initialTile, initialFlip);
    if (!sprite) continue;

    roadMap.set(tileKey(t.row, t.col), { sprite, roadType, tileNum: initialTile, flipX: initialFlip });
    placed.push({ row: t.row, col: t.col });
  }

  // Recalc all placed tiles + neighbors in bulk
  const recalced = new Set<string>();
  for (const t of placed) {
    // Recalc self
    const self = roadMap.get(tileKey(t.row, t.col));
    if (self) {
      const mask = computeBitmask(t.row, t.col, self.roadType, getRoadTypeAt);
      const newTile = bitmaskToTile(mask);
      const newFlip = bitmaskToFlipX(mask);
      if (newTile !== self.tileNum || newFlip !== self.flipX) {
        updateRoadSprite(self, newTile, newFlip);
      }
      recalced.add(tileKey(t.row, t.col));
    }

    // Recalc neighbors
    for (const dir of CARDINAL_DIRS) {
      const nr = t.row + dir.dr;
      const nc = t.col + dir.dc;
      const nk = tileKey(nr, nc);
      if (recalced.has(nk)) continue;
      const neighbor = roadMap.get(nk);
      if (!neighbor) continue;

      const mask = computeBitmask(nr, nc, neighbor.roadType, getRoadTypeAt);
      const newTile = bitmaskToTile(mask);
      const newFlip = bitmaskToFlipX(mask);
      if (newTile !== neighbor.tileNum || newFlip !== neighbor.flipX) {
        updateRoadSprite(neighbor, newTile, newFlip);
        allNeighborChanges.push({ row: nr, col: nc, roadType: neighbor.roadType, tileNum: newTile });
      }
      recalced.add(nk);
    }
  }

  depthSortRoads();

  // Persist all at once
  const allPersist: Array<{ row: number; col: number; roadType: string; tileNum: number }> = [];
  for (const t of placed) {
    const e = roadMap.get(tileKey(t.row, t.col));
    if (e) allPersist.push({ row: t.row, col: t.col, roadType: e.roadType, tileNum: e.tileNum });
  }
  for (const c of allNeighborChanges) {
    allPersist.push(c);
  }
  if (allPersist.length > 0) {
    persistRoadBatch(allPersist);
  }

  if (placed.length > 0) {
    syncSidewalksForArea(placed);
  }

  return { placed, neighborChanges: allNeighborChanges };
}

// ---------------------------------------------------------------------------
// Restore (for startup — no auto-tile recalc needed)
// ---------------------------------------------------------------------------

export function restoreRoadSprite(
  row: number,
  col: number,
  roadType: string,
  tileNum: number,
): void {
  // flipX will be corrected in depthSortAfterRestore once all roads are loaded
  const sprite = createRoadSprite(row, col, roadType, tileNum);
  if (!sprite) return;
  roadMap.set(tileKey(row, col), { sprite, roadType, tileNum, flipX: false });
}

export function depthSortAfterRestore(): void {
  // Apply flipX for E+W straight roads now that all roads are loaded
  for (const [key, entry] of roadMap) {
    const [row, col] = key.split(',').map(Number);
    const mask = computeBitmask(row, col, entry.roadType, getRoadTypeAt);
    const flipX = bitmaskToFlipX(mask);
    if (flipX !== entry.flipX) {
      entry.sprite.scale.x = flipX ? -1 : 1;
      entry.flipX = flipX;
    }
  }
}

// ---------------------------------------------------------------------------
// L-path calculation
// ---------------------------------------------------------------------------

export function computeLPath(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): Array<{ row: number; col: number }> {
  const path: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();

  // Col direction first (E/W)
  const colStep = endCol >= startCol ? 1 : -1;
  for (let c = startCol; c !== endCol + colStep; c += colStep) {
    const key = `${startRow},${c}`;
    if (!seen.has(key)) {
      seen.add(key);
      path.push({ row: startRow, col: c });
    }
  }

  // Row direction (N/S) — from start row to end row at endCol
  const rowStep = endRow >= startRow ? 1 : -1;
  for (let r = startRow; r !== endRow + rowStep; r += rowStep) {
    const key = `${r},${endCol}`;
    if (!seen.has(key)) {
      seen.add(key);
      path.push({ row: r, col: endCol });
    }
  }

  return path;
}

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

interface RoadDragState {
  roadType: string;
  startRow: number;
  startCol: number;
  currentPath: Array<{ row: number; col: number }>;
  previewSprites: Sprite[];
  startScreenX: number;
  startScreenY: number;
}

let roadDrag: RoadDragState | null = null;

function screenToWorld(screenX: number, screenY: number): { x: number; y: number } | null {
  const world = getGameWorld();
  if (!world) return null;
  return {
    x: (screenX - world.x) / world.scale.x,
    y: (screenY - world.y) / world.scale.y,
  };
}

function screenToGridPos(screenX: number, screenY: number): { row: number; col: number } | null {
  const worldPos = screenToWorld(screenX, screenY);
  if (!worldPos) return null;
  return screenToGrid(worldPos.x, worldPos.y);
}

function createPreviewSprite(
  row: number,
  col: number,
  roadType: string,
  tileNum: number,
  valid = true,
  flipX = false,
): Sprite | null {
  const assetKey = roadAssetKey(roadType, tileNum);
  const asset = getAsset(assetKey);
  if (!asset) return null;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return null;

  const sprite = new Sprite(texture);
  sprite.anchor.set(GROUND_ANCHOR.x, GROUND_ANCHOR.y);
  sprite.alpha = 0.5;
  sprite.tint = valid ? 0xffffff : 0xff0000;
  sprite.label = 'road_preview';
  sprite.eventMode = 'none';
  sprite.scale.x = flipX ? -1 : 1;

  const pos = gridToScreen(row, col);
  sprite.position.set(pos.x, pos.y);

  containers?.roadLayer.addChild(sprite);
  return sprite;
}

function clearPreviewSprites(): void {
  if (!roadDrag) return;
  for (const s of roadDrag.previewSprites) {
    s.removeFromParent();
    s.destroy();
  }
  roadDrag.previewSprites = [];
}

/** Compute preview auto-tile: treats existing roads + preview path as placed */
function previewBitmask(
  row: number,
  col: number,
  roadType: string,
  pathSet: Set<string>,
): number {
  let mask = 0;
  for (const dir of CARDINAL_DIRS) {
    const nr = row + dir.dr;
    const nc = col + dir.dc;
    const nk = tileKey(nr, nc);
    // Count if neighbor is in preview path or already placed with same type
    if (pathSet.has(nk)) {
      mask |= dir.bit;
    } else {
      const existing = roadMap.get(nk);
      if (existing && existing.roadType === roadType) {
        mask |= dir.bit;
      }
    }
  }
  return mask;
}

function updatePreview(screenX: number, screenY: number): void {
  if (!roadDrag || !containers) return;

  const gridPos = screenToGridPos(screenX, screenY);
  if (!gridPos) return;

  clearPreviewSprites();

  const path = computeLPath(roadDrag.startRow, roadDrag.startCol, gridPos.row, gridPos.col);
  roadDrag.currentPath = path;

  // Build set of preview positions — valid tiles go into pathSet for bitmask,
  // invalid tiles are shown as red ghosts but excluded from pathSet
  const previewTiles: Array<{ row: number; col: number; valid: boolean }> = [];
  const pathSet = new Set<string>();
  for (const t of path) {
    const valid = isRoadTileValid(t.row, t.col);
    const existing = roadMap.get(tileKey(t.row, t.col));
    if (existing && existing.roadType === roadDrag.roadType) continue;
    if (valid) {
      pathSet.add(tileKey(t.row, t.col));
    }
    previewTiles.push({ ...t, valid });
  }

  // Also include already-placed same-type roads in the path set for bitmask calculation
  for (const t of path) {
    const existing = roadMap.get(tileKey(t.row, t.col));
    if (existing && existing.roadType === roadDrag.roadType) {
      pathSet.add(tileKey(t.row, t.col));
    }
  }

  for (const t of previewTiles) {
    const mask = previewBitmask(t.row, t.col, roadDrag.roadType, pathSet);
    const tileNum = bitmaskToTile(mask);
    const flipX = bitmaskToFlipX(mask);
    const sprite = createPreviewSprite(t.row, t.col, roadDrag.roadType, tileNum, t.valid, flipX);
    if (sprite) {
      roadDrag.previewSprites.push(sprite);
    }
  }
}

// ---------------------------------------------------------------------------
// Drag pointer handlers
// ---------------------------------------------------------------------------

function onRoadDragMove(e: PointerEvent): void {
  if (!roadDrag) return;
  updatePreview(e.clientX, e.clientY);
}

function onRoadDragUp(e: PointerEvent): void {
  if (!roadDrag) {
    cleanupRoadDragListeners();
    return;
  }

  const drag = roadDrag;
  roadDrag = null;

  // Clear previews
  for (const s of drag.previewSprites) {
    s.removeFromParent();
    s.destroy();
  }

  // Detect single-tap (no significant movement)
  const dx = e.clientX - drag.startScreenX;
  const dy = e.clientY - drag.startScreenY;
  const isTap = Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD;

  if (isTap) {
    // Single tap → place one tile at start position
    const existing = roadMap.get(tileKey(drag.startRow, drag.startCol));
    if (!existing || existing.roadType !== drag.roadType) {
      const changes = placeRoad(drag.startRow, drag.startCol, drag.roadType);
      if (changes !== null) {
        useBuildStore.getState().pushPlacement({
          type: 'road-place',
          tiles: [{ row: drag.startRow, col: drag.startCol, roadType: drag.roadType }],
          neighborChanges: changes,
        });
      }
    }
  } else {
    // Drag → batch place all tiles in path
    const gridPos = screenToGridPos(e.clientX, e.clientY);
    if (gridPos) {
      const path = computeLPath(drag.startRow, drag.startCol, gridPos.row, gridPos.col);
      const { placed, neighborChanges } = placeRoadBatch(path, drag.roadType);
      if (placed.length > 0) {
        useBuildStore.getState().pushPlacement({
          type: 'road-place',
          tiles: placed.map((t) => ({ ...t, roadType: drag.roadType })),
          neighborChanges,
        });
      }
    }
  }

  cleanupRoadDragListeners();
}

function cleanupRoadDragListeners(): void {
  document.removeEventListener('pointermove', onRoadDragMove);
  document.removeEventListener('pointerup', onRoadDragUp);
}

// ---------------------------------------------------------------------------
// Road pointer-down handler (called from build-system)
// ---------------------------------------------------------------------------

export function handleRoadPointerDown(screenX: number, screenY: number): boolean {
  if (!containers) return false;

  const { selectedRoadType } = useBuildStore.getState();
  if (!selectedRoadType) return false;

  const gridPos = screenToGridPos(screenX, screenY);
  if (!gridPos) return false;

  // Check if tapping existing road of same type → initiate road selection for removal
  const existing = roadMap.get(tileKey(gridPos.row, gridPos.col));
  if (existing && existing.roadType === selectedRoadType) {
    // Set up tap candidate for road selection (will confirm on pointerup if no drag)
    roadTapCandidate = {
      row: gridPos.row,
      col: gridPos.col,
      entry: existing,
      startX: screenX,
      startY: screenY,
    };
    document.addEventListener('pointermove', onRoadTapCandidateMove);
    document.addEventListener('pointerup', onRoadTapCandidateUp);
    return false; // allow camera pan; tap detected on pointer-up
  }

  // Valid buildable tile → start drag
  if (!isRoadTileValid(gridPos.row, gridPos.col)) return false;

  roadDrag = {
    roadType: selectedRoadType,
    startRow: gridPos.row,
    startCol: gridPos.col,
    currentPath: [{ row: gridPos.row, col: gridPos.col }],
    previewSprites: [],
    startScreenX: screenX,
    startScreenY: screenY,
  };

  // Show initial preview
  updatePreview(screenX, screenY);

  document.addEventListener('pointermove', onRoadDragMove);
  document.addEventListener('pointerup', onRoadDragUp);

  return true; // claim pointer, prevent camera pan
}

// ---------------------------------------------------------------------------
// Road tap candidate (for selecting existing roads)
// ---------------------------------------------------------------------------

let roadTapCandidate: {
  row: number;
  col: number;
  entry: RoadEntry;
  startX: number;
  startY: number;
} | null = null;

function onRoadTapCandidateMove(e: PointerEvent): void {
  if (!roadTapCandidate) return;
  const dx = e.clientX - roadTapCandidate.startX;
  const dy = e.clientY - roadTapCandidate.startY;
  if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
    roadTapCandidate = null;
    cleanupRoadTapListeners();
  }
}

function onRoadTapCandidateUp(): void {
  if (!roadTapCandidate) {
    cleanupRoadTapListeners();
    return;
  }

  const hit = roadTapCandidate;
  roadTapCandidate = null;
  cleanupRoadTapListeners();

  selectRoadForRemoval(hit.row, hit.col, hit.entry);
}

function cleanupRoadTapListeners(): void {
  document.removeEventListener('pointermove', onRoadTapCandidateMove);
  document.removeEventListener('pointerup', onRoadTapCandidateUp);
}

// ---------------------------------------------------------------------------
// Road selection for removal popup
// ---------------------------------------------------------------------------

export function selectRoadForRemoval(row: number, col: number, entry: RoadEntry): void {
  const assetKey = roadAssetKey(entry.roadType, entry.tileNum);
  const asset = getAsset(assetKey);
  const displayName = entry.roadType === 'DirtRoad'
    ? 'Dirt Road'
    : entry.roadType === 'GrassRoad'
      ? 'Grass Road'
      : 'Road';

  useBuildStore.getState().selectRoad({
    row,
    col,
    roadType: entry.roadType,
    tileNum: entry.tileNum,
    displayName,
    textureKey: asset?.textureKey ?? '',
  });
}

export function deleteSelectedRoad(): void {
  const { selectedRoad } = useBuildStore.getState();
  if (!selectedRoad) return;

  const entry = roadMap.get(tileKey(selectedRoad.row, selectedRoad.col));
  if (!entry) return;

  const savedTileNum = entry.tileNum;
  const savedRoadType = entry.roadType;

  const neighborChanges = removeRoad(selectedRoad.row, selectedRoad.col);

  useBuildStore.getState().deselectRoad();

  useBuildStore.getState().pushPlacement({
    type: 'road-delete',
    row: selectedRoad.row,
    col: selectedRoad.col,
    roadType: savedRoadType,
    tileNum: savedTileNum,
    neighborChanges: neighborChanges ?? [],
  });
}

// ---------------------------------------------------------------------------
// Road popup position ticker
// ---------------------------------------------------------------------------

let lastRoadPopupX = 0;
let lastRoadPopupY = 0;

function updateRoadPopupPosition(): void {
  const { selectedRoad } = useBuildStore.getState();
  if (!selectedRoad) return;

  const entry = roadMap.get(tileKey(selectedRoad.row, selectedRoad.col));
  if (!entry) return;

  const bounds = entry.sprite.getBounds();
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y;
  if (Math.abs(x - lastRoadPopupX) > 0.5 || Math.abs(y - lastRoadPopupY) > 0.5) {
    lastRoadPopupX = x;
    lastRoadPopupY = y;
    useBuildStore.getState().updateRoadPopupPos(x, y);
  }
}

// ---------------------------------------------------------------------------
// Undo helpers (called from build-system)
// ---------------------------------------------------------------------------

export function undoRoadPlace(
  tiles: Array<{ row: number; col: number; roadType: string }>,
  neighborChanges: TileChange[],
): void {
  // Remove placed roads in reverse
  const deleteKeys: string[] = [];
  for (let i = tiles.length - 1; i >= 0; i--) {
    const t = tiles[i];
    const entry = roadMap.get(tileKey(t.row, t.col));
    if (entry) {
      restoreGroundTexture(t.row, t.col);
      roadMap.delete(tileKey(t.row, t.col));
      deleteKeys.push(`${t.row},${t.col}`);
    }
  }

  // Restore neighbor tile numbers
  for (const nc of neighborChanges) {
    const entry = roadMap.get(tileKey(nc.row, nc.col));
    if (!entry) continue;
    // Recalculate from current state (after removal)
    const mask = computeBitmask(nc.row, nc.col, entry.roadType, getRoadTypeAt);
    const newTile = bitmaskToTile(mask);
    const newFlip = bitmaskToFlipX(mask);
    updateRoadSprite(entry, newTile, newFlip);
    persistRoad(nc.row, nc.col, entry.roadType, entry.tileNum);
  }

  if (deleteKeys.length > 0) {
    persistRoadDeleteBatch(deleteKeys);
  }

  syncSidewalksForArea(tiles);
}

export function undoRoadDelete(
  row: number,
  col: number,
  roadType: string,
  _tileNum: number,
  neighborChanges: TileChange[],
): void {
  // Re-place the road (tileNum will be recalculated)
  placeRoad(row, col, roadType);

  // Neighbor changes are already handled by placeRoad's recalc
  // But if there were specific neighbor states to restore, they're now correct
  void neighborChanges;
}

// ---------------------------------------------------------------------------
// Road delete mode — highlight, pointer handler, batch delete
// ---------------------------------------------------------------------------

const deleteHighlightedTiles = new Set<string>();

export function highlightRoadForDelete(row: number, col: number): void {
  const entry = roadMap.get(tileKey(row, col));
  if (!entry) return;
  entry.sprite.tint = 0xff4444;
  entry.sprite.alpha = 0.7;
  deleteHighlightedTiles.add(tileKey(row, col));
}

export function unhighlightRoad(row: number, col: number): void {
  const entry = roadMap.get(tileKey(row, col));
  if (!entry) return;
  entry.sprite.tint = 0xffffff;
  entry.sprite.alpha = 1;
  deleteHighlightedTiles.delete(tileKey(row, col));
}

export function clearDeleteHighlights(): void {
  for (const key of deleteHighlightedTiles) {
    const entry = roadMap.get(key);
    if (entry) {
      entry.sprite.tint = 0xffffff;
      entry.sprite.alpha = 1;
    }
  }
  deleteHighlightedTiles.clear();
}

/** Drag state for delete mode — selects every road tile dragged over */
let deleteDrag: {
  startX: number;
  startY: number;
  dragging: boolean;
} | null = null;

function selectRoadTileForDelete(row: number, col: number): void {
  const key = tileKey(row, col);
  const entry = roadMap.get(key);
  if (!entry) return;
  const store = useBuildStore.getState();
  if (store.roadDeleteSelection.has(key)) return; // already selected
  highlightRoadForDelete(row, col);
  store.toggleRoadDeleteTile(row, col);
}

function onDeleteDragMove(e: PointerEvent): void {
  if (!deleteDrag) return;

  if (!deleteDrag.dragging) {
    const dx = e.clientX - deleteDrag.startX;
    const dy = e.clientY - deleteDrag.startY;
    if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
    deleteDrag.dragging = true;
  }

  const gridPos = screenToGridPos(e.clientX, e.clientY);
  if (!gridPos) return;
  selectRoadTileForDelete(gridPos.row, gridPos.col);
}

function onDeleteDragUp(e: PointerEvent): void {
  if (!deleteDrag) {
    cleanupDeleteDragListeners();
    return;
  }

  // If no significant drag, treat as single tap on the start tile
  if (!deleteDrag.dragging) {
    const gridPos = screenToGridPos(deleteDrag.startX, deleteDrag.startY);
    if (gridPos) {
      const key = tileKey(gridPos.row, gridPos.col);
      const store = useBuildStore.getState();
      if (store.roadDeleteSelection.has(key)) {
        unhighlightRoad(gridPos.row, gridPos.col);
        store.toggleRoadDeleteTile(gridPos.row, gridPos.col);
      } else {
        selectRoadTileForDelete(gridPos.row, gridPos.col);
      }
    }
  }

  deleteDrag = null;
  cleanupDeleteDragListeners();
}

function cleanupDeleteDragListeners(): void {
  document.removeEventListener('pointermove', onDeleteDragMove);
  document.removeEventListener('pointerup', onDeleteDragUp);
}

export function handleRoadDeletePointerDown(screenX: number, screenY: number): boolean {
  const gridPos = screenToGridPos(screenX, screenY);
  if (!gridPos) return false;

  const entry = roadMap.get(tileKey(gridPos.row, gridPos.col));
  if (!entry) return false;

  // Select the initial tile immediately
  selectRoadTileForDelete(gridPos.row, gridPos.col);

  deleteDrag = {
    startX: screenX,
    startY: screenY,
    dragging: false,
  };

  document.addEventListener('pointermove', onDeleteDragMove);
  document.addEventListener('pointerup', onDeleteDragUp);

  return true; // claim pointer — prevent camera pan during drag-select
}

export function deleteRoadBatch(tileKeys: string[]): void {
  const deletedTiles: Array<{ row: number; col: number; roadType: string; tileNum: number }> = [];
  const allNeighborChanges: Array<{ row: number; col: number; roadType: string; tileNum: number }> = [];
  const deleteDbKeys: string[] = [];

  // First, collect info for undo before removing
  for (const key of tileKeys) {
    const entry = roadMap.get(key);
    if (!entry) continue;
    const [row, col] = key.split(',').map(Number);
    deletedTiles.push({ row, col, roadType: entry.roadType, tileNum: entry.tileNum });
  }

  // Remove all roads
  for (const tile of deletedTiles) {
    restoreGroundTexture(tile.row, tile.col);
    roadMap.delete(tileKey(tile.row, tile.col));
    deleteDbKeys.push(`${tile.row},${tile.col}`);
  }

  // Recalc neighbors of all deleted tiles
  const recalced = new Set<string>();
  for (const tile of deletedTiles) {
    for (const dir of CARDINAL_DIRS) {
      const nr = tile.row + dir.dr;
      const nc = tile.col + dir.dc;
      const nk = tileKey(nr, nc);
      if (recalced.has(nk)) continue;
      recalced.add(nk);

      const neighbor = roadMap.get(nk);
      if (!neighbor) continue;

      const mask = computeBitmask(nr, nc, neighbor.roadType, getRoadTypeAt);
      const newTile = bitmaskToTile(mask);
      const newFlip = bitmaskToFlipX(mask);
      if (newTile !== neighbor.tileNum || newFlip !== neighbor.flipX) {
        updateRoadSprite(neighbor, newTile, newFlip);
        allNeighborChanges.push({ row: nr, col: nc, roadType: neighbor.roadType, tileNum: newTile });
      }
    }
  }

  // Persist
  if (deleteDbKeys.length > 0) {
    persistRoadDeleteBatch(deleteDbKeys);
  }
  if (allNeighborChanges.length > 0) {
    persistRoadBatch(allNeighborChanges);
  }

  // Sync sidewalks after batch road removal
  if (deletedTiles.length > 0) {
    syncSidewalksForArea(deletedTiles);
  }

  // Push single undo entry
  if (deletedTiles.length > 0) {
    useBuildStore.getState().pushPlacement({
      type: 'road-batch-delete',
      tiles: deletedTiles,
      neighborChanges: allNeighborChanges,
    });
  }

  // Clear highlights
  deleteHighlightedTiles.clear();
}

export function undoRoadBatchDelete(
  tiles: Array<{ row: number; col: number; roadType: string; tileNum: number }>,
  _neighborChanges: Array<{ row: number; col: number; roadType: string; tileNum: number }>,
): void {
  // Suppress per-road sidewalk sync during batch re-placement
  suppressSidewalkSync = true;
  for (const tile of tiles) {
    placeRoad(tile.row, tile.col, tile.roadType);
  }
  suppressSidewalkSync = false;

  // One bulk sidewalk sync at the end
  syncSidewalksForArea(tiles);

  void _neighborChanges;
}

// ---------------------------------------------------------------------------
// Find road at screen position (for non-road-mode tapping)
// ---------------------------------------------------------------------------

export function findRoadAtScreen(
  screenX: number,
  screenY: number,
): { row: number; col: number; entry: RoadEntry } | null {
  const gridPos = screenToGridPos(screenX, screenY);
  if (!gridPos) return null;

  const entry = roadMap.get(tileKey(gridPos.row, gridPos.col));
  if (!entry) return null;

  return { row: gridPos.row, col: gridPos.col, entry };
}

// ---------------------------------------------------------------------------
// Init / Destroy
// ---------------------------------------------------------------------------

export function initRoadSystem(app: Application, sceneContainers: SceneContainers): void {
  pixiApp = app;
  containers = sceneContainers;

  app.ticker.add(updateRoadPopupPosition);
}

export function destroyRoadSystem(): void {
  if (pixiApp) {
    pixiApp.ticker.remove(updateRoadPopupPosition);
  }

  // Clean up any active drag
  if (roadDrag) {
    for (const s of roadDrag.previewSprites) {
      s.removeFromParent();
      s.destroy();
    }
    roadDrag = null;
  }
  cleanupRoadDragListeners();

  roadTapCandidate = null;
  cleanupRoadTapListeners();

  deleteDrag = null;
  cleanupDeleteDragListeners();
  clearDeleteHighlights();

  lastRoadPopupX = 0;
  lastRoadPopupY = 0;

  // Restore all ground textures
  for (const [key] of roadMap) {
    const [r, c] = key.split(',').map(Number);
    restoreGroundTexture(r, c);
  }
  roadMap.clear();
  originalGroundTextures.clear();

  pixiApp = null;
  containers = null;
}
