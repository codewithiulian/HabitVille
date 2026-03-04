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
import { restoreCity, restoreCameraState, restoreRoads } from '../db/city-restore';
import { roadAssetKey } from './road-tiles';

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

  // Load essential assets (grid tiles + saved buildings + saved roads) with progress bar
  const [savedBuildings, savedRoads] = await Promise.all([
    db.city.toArray(),
    db.roads.toArray(),
  ]);
  const savedAssetKeys = [...new Set([
    ...savedBuildings.map((b) => b.assetKey),
    ...savedRoads.map((r) => roadAssetKey(r.roadType, r.tileNum)),
  ])];
  await loadEssentialAssets(savedAssetKeys, (progress) => {
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  });

  createGrid();
  await renderGrid(containers.groundLayer, containers.decorLayer);

  // Init road system before restoring
  initRoadSystem(app, containers);

  // Restore persisted buildings and roads
  await restoreCity(containers);
  await restoreRoads();

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

  return app.canvas;
}

export function destroyGame(): void {
  if (!app) return;

  destroyBuildSystem();
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
