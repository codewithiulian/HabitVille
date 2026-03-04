import { Assets, Sprite } from 'pixi.js';
import { db } from './db';
import type { GameStateRow } from './db';
import type { SceneContainers } from '../engine/setup-stage';
import { getAsset } from '../engine/asset-registry';
import { placeOnGrid } from '../engine/place-on-grid';
import { markOccupied } from '../engine/build-system';
import { restoreRoadSprite, depthSortAfterRestore } from '../engine/road-system';

// ---------------------------------------------------------------------------
// Restore buildings from IndexedDB
// ---------------------------------------------------------------------------

export async function restoreCity(containers: SceneContainers): Promise<void> {
  const buildings = await db.city.toArray();

  for (const b of buildings) {
    const asset = getAsset(b.assetKey);
    if (!asset) continue;

    const texture = Assets.get(asset.textureKey);
    if (!texture) continue;

    const sprite = new Sprite(texture);
    sprite.label = `building_${b.assetKey}_${b.row}_${b.col}`;
    placeOnGrid(sprite, b.row, b.col, b.assetKey);
    containers.buildingLayer.addChild(sprite);
    markOccupied(b.row, b.col, sprite, b.assetKey, b.id);
  }

  // Depth sort once after all buildings restored
  containers.buildingLayer.children.sort((a, b) => a.position.y - b.position.y);
}

// ---------------------------------------------------------------------------
// Restore roads from IndexedDB
// ---------------------------------------------------------------------------

export async function restoreRoads(): Promise<void> {
  const roads = await db.roads.toArray();

  for (const r of roads) {
    restoreRoadSprite(r.row, r.col, r.roadType, r.tileNum);
  }

  depthSortAfterRestore();
}

// ---------------------------------------------------------------------------
// Restore camera state
// ---------------------------------------------------------------------------

export async function restoreCameraState(): Promise<GameStateRow | undefined> {
  return db.gameState.get('current');
}
