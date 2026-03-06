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

export interface CityRoad {
  id: string;        // "row,col" — one road per tile
  row: number;
  col: number;
  roadType: string;
  tileNum: number;
  placedAt: Date;
}

export interface CitySidewalk {
  id: string;        // "row,col"
  row: number;
  col: number;
  tileNum: number;
  parentRoadId: string; // "row,col" of nearest road
  placedAt: Date;
}

export interface CityAccessory {
  id: string;        // "row,col"
  row: number;
  col: number;
  assetKey: string;
  parentSidewalkId: string; // "row,col" of sidewalk this sits on
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
  sidewalks: EntityTable<CitySidewalk, 'id'>;
  accessories: EntityTable<CityAccessory, 'id'>;
  gameState: EntityTable<GameStateRow, 'id'>;
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

db.version(3).stores({
  city: 'id',
  roads: 'id',
  sidewalks: 'id',
  accessories: 'id',
  gameState: 'id',
});

db.version(4).stores({
  city: 'id',
  roads: 'id',
  sidewalks: 'id',
  accessories: 'id',
  gameState: 'id',
});

export { db };
