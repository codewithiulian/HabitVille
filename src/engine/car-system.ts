import { Application, Assets, Sprite, Texture } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { gridToScreen } from './iso-utils';
import { hasRoad, getAllRoadKeys } from './road-system';
import { GRID_SIZE, TILE_HEIGHT } from '../config/grid-constants';
import { GAME_CONFIG } from '../config/game-config';
import { getVehicleTexturePaths } from './asset-registry';
import { useCarStore } from '../stores/car-store';
import { useBuildStore } from '../stores/build-store';
import { sortBuildingLayer } from './npc-system';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Direction = 'SE' | 'SW' | 'NE' | 'NW';

interface Car {
  sprite: Sprite;
  frontTexture: Texture;
  backTexture: Texture;
  assetId: string;
  recordId: string;
  currentRow: number;
  currentCol: number;
  targetRow: number;
  targetCol: number;
  progress: number;     // 0..1
  direction: Direction;
  idle: boolean;
  idleUntil: number;
  path: string[];
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let pixiApp: Application | null = null;
let sceneContainers: SceneContainers | null = null;
let cars: Car[] = [];
let roadGraph: Map<string, string[]> = new Map(); // "r,c" → connected road neighbor keys
let paused = false;
let unsubBuildMode: (() => void) | null = null;

// Texture cache: assetId → { front, back }
const textureCache = new Map<string, { front: Texture; back: Texture }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

function parseKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number);
  return [r, c];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const CARDINALS: [number, number][] = [
  [-1, 0], // north
  [1, 0],  // south
  [0, -1], // west
  [0, 1],  // east
];

function directionFromDelta(dRow: number, dCol: number): Direction {
  if (dCol > 0) return 'SE'; // grid east  → screen SE
  if (dRow > 0) return 'SW'; // grid south → screen SW
  if (dRow < 0) return 'NE'; // grid north → screen NE
  return 'NW';               // grid west  → screen NW
}

function carScreenPos(row: number, col: number): { x: number; y: number } {
  const base = gridToScreen(row, col);
  return { x: base.x, y: base.y + TILE_HEIGHT / 2 };
}

function tileDepthY(row: number, col: number): number {
  return gridToScreen(row, col).y;
}

// ---------------------------------------------------------------------------
// Apply direction to sprite (texture swap + flipX)
// ---------------------------------------------------------------------------

function applyDirection(car: Car, dir: Direction): void {
  car.direction = dir;
  switch (dir) {
    case 'SE': // +col → Front, no flip
      car.sprite.texture = car.frontTexture;
      car.sprite.scale.x = Math.abs(car.sprite.scale.x);
      break;
    case 'SW': // +row → Front, flipX
      car.sprite.texture = car.frontTexture;
      car.sprite.scale.x = -Math.abs(car.sprite.scale.x);
      break;
    case 'NE': // -row → Back, flipX
      car.sprite.texture = car.backTexture;
      car.sprite.scale.x = -Math.abs(car.sprite.scale.x);
      break;
    case 'NW': // -col → Back, no flip
      car.sprite.texture = car.backTexture;
      car.sprite.scale.x = Math.abs(car.sprite.scale.x);
      break;
  }
}

// ---------------------------------------------------------------------------
// Road graph
// ---------------------------------------------------------------------------

function buildRoadGraph(): void {
  roadGraph.clear();
  const roadKeys = getAllRoadKeys();

  // Populate graph nodes
  for (const key of roadKeys) {
    roadGraph.set(key, []);
  }

  // Connect cardinal neighbors
  for (const key of roadKeys) {
    const [row, col] = parseKey(key);
    const neighbors: string[] = [];
    for (const [dr, dc] of CARDINALS) {
      const nk = tileKey(row + dr, col + dc);
      if (roadGraph.has(nk)) {
        neighbors.push(nk);
      }
    }
    roadGraph.set(key, neighbors);
  }
}

// ---------------------------------------------------------------------------
// Texture loading
// ---------------------------------------------------------------------------

async function loadCarTextures(assetId: string): Promise<{ front: Texture; back: Texture } | null> {
  const cached = textureCache.get(assetId);
  if (cached) return cached;

  const paths = getVehicleTexturePaths(assetId);
  if (!paths) return null;

  const [front, back] = await Promise.all([
    Assets.load(paths.front),
    Assets.load(paths.back),
  ]);

  const entry = { front, back };
  textureCache.set(assetId, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Path generation — random walk along road graph
// ---------------------------------------------------------------------------

function generatePath(startRow: number, startCol: number): string[] {
  const cfg = GAME_CONFIG.cars;
  const path: string[] = [];
  const steps = randomInt(cfg.path_min, cfg.path_max);
  let row = startRow;
  let col = startCol;
  let prevKey = '';

  for (let i = 0; i < steps; i++) {
    const key = tileKey(row, col);
    const neighbors = roadGraph.get(key);
    if (!neighbors || neighbors.length === 0) break;

    const forward = neighbors.filter((n) => n !== prevKey);
    const choices = forward.length > 0 ? forward : neighbors;

    const nextKey = choices[randomInt(0, choices.length - 1)];
    path.push(nextKey);
    prevKey = key;
    [row, col] = parseKey(nextKey);
  }

  return path;
}

// ---------------------------------------------------------------------------
// Spawn / Despawn
// ---------------------------------------------------------------------------

function destroyAllCars(): void {
  for (const car of cars) {
    car.sprite.removeFromParent();
    car.sprite.destroy();
  }
  cars = [];
}

export async function respawnCars(): Promise<void> {
  if (!sceneContainers) return;
  destroyAllCars();
  buildRoadGraph();

  const cfg = GAME_CONFIG.cars;
  const ownedCars = useCarStore.getState().ownedCars;
  const roadKeys = Array.from(roadGraph.keys());
  const count = Math.min(ownedCars.length, cfg.max_visible, roadKeys.length);

  if (count <= 0) return;

  // Shuffle road keys for starting positions
  const shuffled = roadKeys.sort(() => Math.random() - 0.5);

  // Load textures for all unique assetIds
  const uniqueAssetIds = [...new Set(ownedCars.slice(0, count).map((c) => c.assetId))];
  await Promise.all(uniqueAssetIds.map((id) => loadCarTextures(id)));

  for (let i = 0; i < count; i++) {
    const ownedCar = ownedCars[i];
    const textures = textureCache.get(ownedCar.assetId);
    if (!textures) continue;

    const [row, col] = parseKey(shuffled[i % shuffled.length]);
    const direction: Direction = (['SE', 'SW', 'NE', 'NW'] as Direction[])[randomInt(0, 3)];

    const sprite = new Sprite(textures.front);
    sprite.anchor.set(0.5, 1.0);
    sprite.scale.set(cfg.scale);

    const screen = carScreenPos(row, col);
    sprite.position.set(screen.x, screen.y);
    (sprite as any)._sortY = tileDepthY(row, col);

    sceneContainers.buildingLayer.addChild(sprite);

    const car: Car = {
      sprite,
      frontTexture: textures.front,
      backTexture: textures.back,
      assetId: ownedCar.assetId,
      recordId: ownedCar.id,
      currentRow: row,
      currentCol: col,
      targetRow: row,
      targetCol: col,
      progress: 0,
      direction,
      idle: true,
      idleUntil: performance.now() + randomFloat(0, cfg.idle_max_ms),
      path: [],
    };

    applyDirection(car, direction);
    cars.push(car);
  }

  sortBuildingLayer();
}

export async function spawnSingleCar(assetId: string, recordId: string): Promise<void> {
  if (!sceneContainers) return;

  const cfg = GAME_CONFIG.cars;

  // Ensure road graph is current
  buildRoadGraph();
  const roadKeys = Array.from(roadGraph.keys());
  if (roadKeys.length === 0) return;

  // Check max_visible limit
  if (cars.length >= cfg.max_visible) return;

  const textures = await loadCarTextures(assetId);
  if (!textures) return;

  const startKey = roadKeys[randomInt(0, roadKeys.length - 1)];
  const [row, col] = parseKey(startKey);
  const direction: Direction = (['SE', 'SW', 'NE', 'NW'] as Direction[])[randomInt(0, 3)];

  const sprite = new Sprite(textures.front);
  sprite.anchor.set(0.5, 1.0);
  sprite.scale.set(cfg.scale);

  const screen = carScreenPos(row, col);
  sprite.position.set(screen.x, screen.y);
  (sprite as any)._sortY = tileDepthY(row, col);

  sceneContainers.buildingLayer.addChild(sprite);

  const car: Car = {
    sprite,
    frontTexture: textures.front,
    backTexture: textures.back,
    assetId,
    recordId,
    currentRow: row,
    currentCol: col,
    targetRow: row,
    targetCol: col,
    progress: 0,
    direction,
    idle: true,
    idleUntil: performance.now() + randomFloat(0, cfg.idle_max_ms),
    path: [],
  };

  applyDirection(car, direction);
  cars.push(car);
  sortBuildingLayer();
}

export function removeCar(recordId: string): void {
  const idx = cars.findIndex((c) => c.recordId === recordId);
  if (idx === -1) return;

  const car = cars[idx];
  car.sprite.removeFromParent();
  car.sprite.destroy();
  cars.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Ticker update
// ---------------------------------------------------------------------------

function updateCars(ticker: Ticker): void {
  if (paused || cars.length === 0) return;

  const cfg = GAME_CONFIG.cars;
  const dtSec = ticker.elapsedMS / 1000;
  const now = performance.now();
  let needSort = false;

  for (const car of cars) {
    if (car.idle) {
      if (now < car.idleUntil) continue;

      if (car.path.length === 0) {
        car.path = generatePath(car.currentRow, car.currentCol);
        if (car.path.length === 0) {
          car.idleUntil = now + randomFloat(cfg.idle_min_ms, cfg.idle_max_ms);
          continue;
        }
      }

      const nextKey = car.path.shift()!;
      const [tr, tc] = parseKey(nextKey);

      car.targetRow = tr;
      car.targetCol = tc;
      car.progress = 0;
      car.idle = false;

      const dir = directionFromDelta(tr - car.currentRow, tc - car.currentCol);
      if (dir !== car.direction) {
        applyDirection(car, dir);
      }
    } else {
      car.progress += cfg.speed * dtSec;

      if (car.progress >= 1) {
        car.currentRow = car.targetRow;
        car.currentCol = car.targetCol;
        car.progress = 0;
        car.idle = true;
        car.idleUntil = car.path.length > 0
          ? now + 50
          : now + randomFloat(cfg.idle_min_ms, cfg.idle_max_ms);

        const screen = carScreenPos(car.currentRow, car.currentCol);
        car.sprite.position.set(screen.x, screen.y);
        (car.sprite as any)._sortY = tileDepthY(car.currentRow, car.currentCol);
        needSort = true;
      } else {
        const from = carScreenPos(car.currentRow, car.currentCol);
        const to = carScreenPos(car.targetRow, car.targetCol);
        car.sprite.position.set(
          from.x + (to.x - from.x) * car.progress,
          from.y + (to.y - from.y) * car.progress,
        );
        (car.sprite as any)._sortY = Math.max(
          tileDepthY(car.currentRow, car.currentCol),
          tileDepthY(car.targetRow, car.targetCol),
        );
        needSort = true;
      }
    }
  }

  if (needSort) sortBuildingLayer();
}

// ---------------------------------------------------------------------------
// Build mode lifecycle
// ---------------------------------------------------------------------------

function onBuildModeChange(buildMode: boolean): void {
  if (buildMode) {
    paused = true;
    for (const car of cars) {
      car.sprite.visible = false;
    }
  } else {
    paused = false;
    respawnCars().catch((err) => console.error('[Car] respawn failed:', err));
  }
}

// ---------------------------------------------------------------------------
// Init / Destroy
// ---------------------------------------------------------------------------

let prevBuildMode = false;

export function initCarSystem(app: Application, containers: SceneContainers): void {
  pixiApp = app;
  sceneContainers = containers;
  paused = false;

  app.ticker.add(updateCars);

  prevBuildMode = useBuildStore.getState().buildMode;
  unsubBuildMode = useBuildStore.subscribe((state) => {
    if (prevBuildMode !== state.buildMode) {
      onBuildModeChange(state.buildMode);
    }
    prevBuildMode = state.buildMode;
  });
}

export function destroyCarSystem(): void {
  if (pixiApp) {
    pixiApp.ticker.remove(updateCars);
  }

  if (unsubBuildMode) {
    unsubBuildMode();
    unsubBuildMode = null;
  }

  destroyAllCars();
  textureCache.clear();
  roadGraph.clear();

  pixiApp = null;
  sceneContainers = null;
  paused = false;
}
