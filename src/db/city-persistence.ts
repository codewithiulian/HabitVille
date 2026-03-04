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
