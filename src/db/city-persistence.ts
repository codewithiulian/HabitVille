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
