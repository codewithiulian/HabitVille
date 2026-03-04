import { Application } from 'pixi.js';

export async function createApp(): Promise<Application> {
  const app = new Application();

  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio ?? 1,
    antialias: true,
    powerPreference: 'high-performance',
  });

  return app;
}
