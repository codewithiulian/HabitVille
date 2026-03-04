import { Application } from 'pixi.js';

export async function createApp(): Promise<Application> {
  const app = new Application();

  await app.init({
    background: '#0f2a4a',
    resizeTo: window,
    autoDensity: true,
    resolution: window.devicePixelRatio ?? 1,
    antialias: true,
    powerPreference: 'high-performance',
  });

  return app;
}
