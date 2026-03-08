import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Habit } from '@/types/habit';
import type { CheckIn } from '@/types/check-in';
import type { PlayerProfile } from '@/types/player';
import type { InventoryItem, PlacedAsset } from '@/types/inventory';
import type { WeeklySnapshot } from '@/types/weekly-snapshot';

// ---------------------------------------------------------------------------
// Interfaces (city layer — existing)
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
  habits: EntityTable<Habit, 'id'>;
  checkIns: EntityTable<CheckIn, 'id'>;
  playerProfile: EntityTable<PlayerProfile, 'id'>;
  inventory: EntityTable<InventoryItem, 'id'>;
  placedAssets: EntityTable<PlacedAsset, 'id'>;
  weeklySnapshots: EntityTable<WeeklySnapshot, 'id'>;
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

db.version(5).stores({
  city: 'id',
  roads: 'id',
  sidewalks: 'id',
  accessories: 'id',
  gameState: 'id',
  habits: 'id, archived',
  checkIns: 'id, [habitId+date], date',
  playerProfile: 'id',
  inventory: 'id, assetId',
  placedAssets: 'id, assetId',
  weeklySnapshots: 'id, weekStart',
});

db.version(6).stores({
  city: 'id',
  roads: 'id',
  sidewalks: 'id',
  accessories: 'id',
  gameState: 'id',
  habits: 'id, archived',
  checkIns: 'id, [habitId+date], date',
  playerProfile: 'id',
  inventory: 'id, assetId',
  placedAssets: 'id, assetId',
  weeklySnapshots: 'id, weekStart',
});

export { db };
