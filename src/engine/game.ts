import { Application } from 'pixi.js';
import { createApp } from './create-app';
import { setupStage, type SceneContainers } from './setup-stage';
import { createGrid, renderGrid, destroyGrid } from './grid';
import { initCamera, destroyCamera } from './camera';
import { initBuildSystem, destroyBuildSystem } from './build-system';
import { initRoadSystem, destroyRoadSystem } from './road-system';
import { gridToScreen } from './iso-utils';
import { loadEssentialAssets } from './asset-loader';
import { GRID_SIZE } from '../config/grid-constants';
import { db } from '../db/db';
import { CAMERA_DEFAULT_ZOOM } from '../config/camera-constants';
import { destroyBackground } from './create-background';
import {
  restoreCity,
  restoreCameraState,
  restoreRoads,
  restoreSidewalks,
  restoreAccessories,
  recalcSidewalksAfterRestore,
} from '../db/city-restore';
import { roadAssetKey } from './road-tiles';
import { sidewalkAssetKey } from './sidewalk-tiles';
import { initSidewalkSystem, destroySidewalkSystem } from './sidewalk-system';
import { initNpcSystem, destroyNpcSystem, respawnNPCs } from './npc-system';

let app: Application | null = null;
let containers: SceneContainers | null = null;
let initPromise: Promise<HTMLCanvasElement> | null = null;

export async function initGame(): Promise<HTMLCanvasElement> {
  // De-dup concurrent calls (React strict-mode double-mount)
  if (!initPromise) {
    initPromise = doInitGame();
  }
  return initPromise;
}

async function doInitGame(): Promise<HTMLCanvasElement> {
  app = await createApp();
  containers = setupStage(app);

  // Load essential assets (grid tiles + saved buildings + saved roads + sidewalks + accessories)
  const [savedBuildings, savedRoads, savedSidewalks, savedAccessories] = await Promise.all([
    db.city.toArray(),
    db.roads.toArray(),
    db.sidewalks.toArray(),
    db.accessories.toArray(),
  ]);
  const savedAssetKeys = [...new Set([
    ...savedBuildings.map((b) => b.assetKey),
    ...savedRoads.map((r) => roadAssetKey(r.roadType, r.tileNum)),
    ...savedSidewalks.map((s) => sidewalkAssetKey(s.tileNum)),
    ...savedAccessories.map((a) => a.assetKey),
  ])];
  await loadEssentialAssets(savedAssetKeys, (progress) => {
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  });

  createGrid();
  await renderGrid(containers.groundLayer, containers.decorLayer);

  // Init road + sidewalk systems before restoring
  initRoadSystem(app, containers);
  initSidewalkSystem(containers);

  // Restore persisted buildings, roads, sidewalks, accessories
  await restoreCity(containers);
  await restoreRoads();
  await restoreSidewalks();
  await restoreAccessories();
  recalcSidewalksAfterRestore();

  // Restore camera or use defaults
  const savedCamera = await restoreCameraState();
  if (savedCamera) {
    containers.gameWorld.scale.set(savedCamera.cameraZoom);
    containers.gameWorld.position.set(savedCamera.cameraX, savedCamera.cameraY);
  } else {
    // Apply default zoom
    containers.gameWorld.scale.set(CAMERA_DEFAULT_ZOOM);

    // Center the grid diamond on screen, accounting for zoom
    const center = gridToScreen(GRID_SIZE / 2, GRID_SIZE / 2);
    containers.gameWorld.position.set(
      app.screen.width / 2 - center.x * CAMERA_DEFAULT_ZOOM,
      app.screen.height / 2 - center.y * CAMERA_DEFAULT_ZOOM,
    );
  }

  initCamera(app, containers.gameWorld);
  initBuildSystem(app, containers);

  // NPC system: init and spawn initial NPCs based on restored population
  initNpcSystem(app, containers);
  respawnNPCs().catch((err) => console.error('[NPC] initial spawn failed:', err));

  return app.canvas;
}

export function destroyGame(): void {
  if (!app) return;

  destroyNpcSystem();
  destroyBuildSystem();
  destroySidewalkSystem();
  destroyRoadSystem();
  destroyCamera();
  destroyGrid();
  destroyBackground(app);
  app.destroy(true, { children: true });
  app = null;
  containers = null;
  initPromise = null;
}

export function getApp(): Application | null {
  return app;
}

export function getContainers(): SceneContainers | null {
  return containers;
}
