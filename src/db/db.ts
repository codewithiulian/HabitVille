import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Habit, Checkin } from '@/types/habits';

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

export interface CityRoad {
  id: string;        // "row,col" — one road per tile
  row: number;
  col: number;
  roadType: string;
  tileNum: number;
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
  roads: EntityTable<CityRoad, 'id'>;
  gameState: EntityTable<GameStateRow, 'id'>;
  habits: EntityTable<Habit, 'id'>;
  checkins: EntityTable<Checkin, 'id'>;
};

db.version(1).stores({
  city: 'id',
  gameState: 'id',
});

db.version(2).stores({
  city: 'id',
  roads: 'id',
  gameState: 'id',
});

db.version(4).stores({
  city: 'id',
  roads: 'id',
  sidewalks: 'id',
  accessories: 'id',
  gameState: 'id',
  habits: 'id, sortOrder',
  checkins: 'id, [habitId+date], habitId',
});

export { db };
