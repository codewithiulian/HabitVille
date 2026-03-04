import Dexie from 'dexie';
import type { EntityTable } from 'dexie';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CityBuilding {
  id: string;
  row: number;
  col: number;
  assetKey: string;
  placedAt: Date;
}

export interface GameStateRow {
  id: string;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  lastSaved: Date;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const db = new Dexie('habitville') as Dexie & {
  city: EntityTable<CityBuilding, 'id'>;
  gameState: EntityTable<GameStateRow, 'id'>;
};

db.version(1).stores({
  city: 'id',
  gameState: 'id',
});

export { db };
