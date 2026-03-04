import { Application } from 'pixi.js';
import { createApp } from './create-app';
import { setupStage, type SceneContainers } from './setup-stage';
import { createGrid, renderGrid, destroyGrid } from './grid';
import { initCamera, destroyCamera } from './camera';
import { initBuildSystem, destroyBuildSystem } from './build-system';
import { gridToScreen } from './iso-utils';
import { loadAllAssets } from './asset-loader';
import { GRID_SIZE } from '../config/grid-constants';
import { CAMERA_DEFAULT_ZOOM } from '../config/camera-constants';
import { destroyBackground } from './create-background';

let app: Application | null = null;
let containers: SceneContainers | null = null;

export async function initGame(): Promise<HTMLCanvasElement> {
  if (app) return app.canvas;

  app = await createApp();
  containers = setupStage(app);

  // Load all assets with progress bar
  await loadAllAssets((progress) => {
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  });

  createGrid();
  await renderGrid(containers.groundLayer, containers.decorLayer);

  // Apply default zoom
  containers.gameWorld.scale.set(CAMERA_DEFAULT_ZOOM);

  // Center the grid diamond on screen, accounting for zoom
  const center = gridToScreen(GRID_SIZE / 2, GRID_SIZE / 2);
  containers.gameWorld.position.set(
    app.screen.width / 2 - center.x * CAMERA_DEFAULT_ZOOM,
    app.screen.height / 2 - center.y * CAMERA_DEFAULT_ZOOM,
  );

  initCamera(app, containers.gameWorld);
  initBuildSystem(app, containers);

  return app.canvas;
}

export function destroyGame(): void {
  if (!app) return;

  destroyBuildSystem();
  destroyCamera();
  destroyGrid();
  destroyBackground(app);
  app.destroy(true, { children: true });
  app = null;
  containers = null;
}

export function getApp(): Application | null {
  return app;
}

export function getContainers(): SceneContainers | null {
  return containers;
}
