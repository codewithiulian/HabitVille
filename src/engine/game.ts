import { Application, Assets, Sprite } from 'pixi.js';
import { createApp } from './create-app';
import { setupStage, type SceneContainers } from './setup-stage';
import { createGrid, renderGrid, destroyGrid } from './grid';
import { initCamera, destroyCamera } from './camera';
import { gridToScreen } from './iso-utils';
import { loadAllAssets } from './asset-loader';
import { getAsset } from './asset-registry';
import { placeOnGrid } from './place-on-grid';
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

  // Place test buildings
  placeTestBuildings(containers);

  // Apply default zoom
  containers.gameWorld.scale.set(CAMERA_DEFAULT_ZOOM);

  // Center the grid diamond on screen, accounting for zoom
  const center = gridToScreen(GRID_SIZE / 2, GRID_SIZE / 2);
  containers.gameWorld.position.set(
    app.screen.width / 2 - center.x * CAMERA_DEFAULT_ZOOM,
    app.screen.height / 2 - center.y * CAMERA_DEFAULT_ZOOM,
  );

  initCamera(app, containers.gameWorld);

  return app.canvas;
}

function placeTestBuildings(c: SceneContainers): void {
  const testPlacements: Array<{ key: string; row: number; col: number }> = [
    { key: 'House_Blue_Type1', row: 12, col: 12 },
    { key: 'Appartment_Green_1x1_Level1', row: 14, col: 14 },
    { key: 'Shop_Butcher_OneFloor', row: 16, col: 12 },
    { key: 'Restaurant_Pizza', row: 12, col: 16 },
  ];

  for (const { key, row, col } of testPlacements) {
    const asset = getAsset(key);
    if (!asset) {
      console.warn(`[game] Test building "${key}" not found in registry`);
      continue;
    }

    const texture = Assets.get(asset.textureKey);
    if (!texture) {
      console.warn(`[game] Texture not loaded for "${key}" (${asset.textureKey})`);
      continue;
    }

    const sprite = new Sprite(texture);
    sprite.label = `building_${key}_${row}_${col}`;
    placeOnGrid(sprite, row, col, key);
    c.buildingLayer.addChild(sprite);
  }

  // Depth-sort building layer by y position (bottom of sprite)
  c.buildingLayer.children.sort((a, b) => a.position.y - b.position.y);
}

export function destroyGame(): void {
  if (!app) return;

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
