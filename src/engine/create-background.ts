import { Container, Graphics, FillGradient, RenderTexture, TilingSprite, Application } from 'pixi.js';

// Background extends well beyond the isometric world bounds
// so edges are never visible when panning at any zoom level.
const BG_X = -23000;
const BG_Y = -15000;
const BG_W = 46000;
const BG_H = 39000;

/**
 * Creates a large blue gradient background with diamond grid overlay
 * that lives inside gameWorld so it moves with the camera.
 */
export function createBackground(app: Application): Container {
  const container = new Container();
  container.label = 'backgroundLayer';

  // --- Blue gradient fill ---
  const gradient = new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: '#7EC8E3' },
      { offset: 0.5, color: '#3B82C4' },
      { offset: 1, color: '#1B4F8A' },
    ],
  });

  const bg = new Graphics();
  bg.rect(BG_X, BG_Y, BG_W, BG_H);
  bg.fill(gradient);
  container.addChild(bg);

  // --- Diamond pattern overlay using TilingSprite ---
  // Create a small 90x90 tile that contains both the 30px and 90px diamond lines.
  // 90 is the LCM so both patterns tile perfectly.
  const tileSize = 90;
  const tileGfx = new Graphics();

  // 30px-spaced subtle lines (alpha 0.04)
  tileGfx.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.04 });
  for (let i = 0; i <= tileSize; i += 30) {
    // 45deg: top edge to left edge
    tileGfx.moveTo(i, 0);
    tileGfx.lineTo(0, i);
    tileGfx.stroke();
    // 45deg: bottom-right continuations
    if (i > 0) {
      tileGfx.moveTo(tileSize, tileSize - i);
      tileGfx.lineTo(tileSize - i, tileSize);
      tileGfx.stroke();
    }
    // -45deg: top edge to right edge
    tileGfx.moveTo(tileSize - i, 0);
    tileGfx.lineTo(tileSize, i);
    tileGfx.stroke();
    // -45deg: bottom-left continuations
    if (i > 0) {
      tileGfx.moveTo(0, tileSize - i);
      tileGfx.lineTo(i, tileSize);
      tileGfx.stroke();
    }
  }

  // 90px-spaced accent lines (alpha 0.06, 2px wide)
  // These appear once per tile at the borders
  tileGfx.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.06 });
  // 45deg line corner to corner
  tileGfx.moveTo(tileSize, 0);
  tileGfx.lineTo(0, tileSize);
  tileGfx.stroke();
  // -45deg line corner to corner
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

  return container;
}
