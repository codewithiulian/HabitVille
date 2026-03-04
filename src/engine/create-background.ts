import { Container, Graphics, FillGradient, TilingSprite, Application, Ticker } from 'pixi.js';

// Background extends well beyond the isometric world bounds
// so edges are never visible when panning at any zoom level.
const BG_X = -23000;
const BG_Y = -15000;
const BG_W = 46000;
const BG_H = 39000;

let oceanTiling: TilingSprite | null = null;
let tickerCallback: ((ticker: Ticker) => void) | null = null;

/**
 * Creates a large blue gradient background with diamond grid overlay
 * that lives inside gameWorld so it moves with the camera.
 */
export function createBackground(app: Application): Container {
  const container = new Container();
  container.label = 'backgroundLayer';

  // --- Darker blue gradient fill ---
  const gradient = new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: '#5BA8C8' },
      { offset: 0.5, color: '#2A6BA3' },
      { offset: 1, color: '#0F3A6E' },
    ],
  });

  const bg = new Graphics();
  bg.rect(BG_X, BG_Y, BG_W, BG_H);
  bg.fill(gradient);
  container.addChild(bg);

  // --- Diamond pattern overlay using TilingSprite ---
  const tileSize = 90;
  const tileGfx = new Graphics();

  // 30px-spaced subtle lines (alpha 0.04)
  tileGfx.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.04 });
  for (let i = 0; i <= tileSize; i += 30) {
    tileGfx.moveTo(i, 0);
    tileGfx.lineTo(0, i);
    tileGfx.stroke();
    if (i > 0) {
      tileGfx.moveTo(tileSize, tileSize - i);
      tileGfx.lineTo(tileSize - i, tileSize);
      tileGfx.stroke();
    }
    tileGfx.moveTo(tileSize - i, 0);
    tileGfx.lineTo(tileSize, i);
    tileGfx.stroke();
    if (i > 0) {
      tileGfx.moveTo(0, tileSize - i);
      tileGfx.lineTo(i, tileSize);
      tileGfx.stroke();
    }
  }

  // 90px-spaced accent lines (alpha 0.06, 2px wide)
  tileGfx.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.06 });
  tileGfx.moveTo(tileSize, 0);
  tileGfx.lineTo(0, tileSize);
  tileGfx.stroke();
  tileGfx.moveTo(0, 0);
  tileGfx.lineTo(tileSize, tileSize);
  tileGfx.stroke();

  const tileTexture = app.renderer.generateTexture({
    target: tileGfx,
    resolution: 1,
  });

  const tiling = new TilingSprite({
    texture: tileTexture,
    width: BG_W,
    height: BG_H,
  });
  tiling.position.set(BG_X, BG_Y);
  container.addChild(tiling);

  tileGfx.destroy();

  // Store reference for ocean drift animation
  oceanTiling = tiling;

  // Animate ocean drift
  tickerCallback = () => {
    if (oceanTiling) {
      oceanTiling.tilePosition.x += 0.5;
      oceanTiling.tilePosition.y += 0.15;
    }
  };
  app.ticker.add(tickerCallback);

  return container;
}

/**
 * Clean up ocean animation ticker callback.
 */
export function destroyBackground(app: Application): void {
  if (tickerCallback) {
    app.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  oceanTiling = null;
}
