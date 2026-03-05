import { db } from './db';
import type { CameraState } from '../types/camera';

// ---------------------------------------------------------------------------
// Building persistence — fire-and-forget
// ---------------------------------------------------------------------------

export function persistPlace(id: string, row: number, col: number, assetKey: string): void {
  db.city.put({ id, row, col, assetKey, placedAt: new Date() }).catch(() => {});
}

export function persistMove(id: string, row: number, col: number): void {
  db.city.update(id, { row, col }).catch(() => {});
}

export function persistDelete(id: string): void {
  db.city.delete(id).catch(() => {});
}

// ---------------------------------------------------------------------------
// Road persistence — fire-and-forget
// ---------------------------------------------------------------------------

export function persistRoad(row: number, col: number, roadType: string, tileNum: number): void {
  db.roads
    .put({ id: `${row},${col}`, row, col, roadType, tileNum, placedAt: new Date() })
    .catch(() => {});
}

export function persistRoadBatch(
  roads: Array<{ row: number; col: number; roadType: string; tileNum: number }>,
): void {
  db.roads
    .bulkPut(
      roads.map((r) => ({
        id: `${r.row},${r.col}`,
        row: r.row,
        col: r.col,
        roadType: r.roadType,
        tileNum: r.tileNum,
        placedAt: new Date(),
      })),
    )
    .catch(() => {});
}

export function persistRoadDelete(row: number, col: number): void {
  db.roads.delete(`${row},${col}`).catch(() => {});
}

export function persistRoadDeleteBatch(keys: string[]): void {
  db.roads.bulkDelete(keys).catch(() => {});
}

// ---------------------------------------------------------------------------
// Sidewalk persistence — fire-and-forget
// ---------------------------------------------------------------------------

export function persistSidewalkBatch(
  sidewalks: Array<{ row: number; col: number; tileNum: number }>,
): void {
  db.sidewalks
    .bulkPut(
      sidewalks.map((s) => ({
        id: `${s.row},${s.col}`,
        row: s.row,
        col: s.col,
        tileNum: s.tileNum,
        parentRoadId: '',
        placedAt: new Date(),
      })),
    )
    .catch(() => {});
}

export function persistSidewalkDeleteBatch(keys: string[]): void {
  db.sidewalks.bulkDelete(keys).catch(() => {});
}

// ---------------------------------------------------------------------------
// Accessory persistence — fire-and-forget
// ---------------------------------------------------------------------------

export function persistAccessoryBatch(
  accessories: Array<{ row: number; col: number; assetKey: string }>,
): void {
  db.accessories
    .bulkPut(
      accessories.map((a) => ({
        id: `${a.row},${a.col}`,
        row: a.row,
        col: a.col,
        assetKey: a.assetKey,
        parentSidewalkId: `${a.row},${a.col}`,
        placedAt: new Date(),
      })),
    )
    .catch(() => {});
}

export function persistAccessoryDeleteBatch(keys: string[]): void {
  db.accessories.bulkDelete(keys).catch(() => {});
}

// ---------------------------------------------------------------------------
// Camera persistence — debounced 500ms
// ---------------------------------------------------------------------------

let cameraTimer: ReturnType<typeof setTimeout> | null = null;

export function persistCamera(state: CameraState): void {
  if (cameraTimer) clearTimeout(cameraTimer);
  cameraTimer = setTimeout(() => {
    db.gameState
      .put({
        id: 'current',
        cameraX: state.x,
        cameraY: state.y,
        cameraZoom: state.zoom,
        lastSaved: new Date(),
      })
      .catch(() => {});
  }, 500);
}
