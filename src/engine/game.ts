import { Application } from 'pixi.js';
import { createApp } from './create-app';
import { setupStage, type SceneContainers } from './setup-stage';

let app: Application | null = null;
let containers: SceneContainers | null = null;

export async function initGame(): Promise<HTMLCanvasElement> {
  if (app) return app.canvas;

  app = await createApp();
  containers = setupStage(app);

  return app.canvas;
}

export function destroyGame(): void {
  if (!app) return;

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
