import { Application, Assets, Texture, Rectangle, AnimatedSprite } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { gridToScreen } from './iso-utils';
import { hasRoad } from './road-system';
import { isOccupied } from './build-system';
import { GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from '../config/grid-constants';
import { GAME_CONFIG } from '../config/game-config';
import { usePlayerStore } from '../stores/player-store';
import { useBuildStore } from '../stores/build-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NPC_SPRITE_POOL = [
  'assets/NPC/NpcReadymade_Alien.png',
  'assets/NPC/NpcReadymade_BellHop.png',
  'assets/NPC/NpcReadymade_Busdriver.png',
  'assets/NPC/NpcReadymade_Character1.png',
  'assets/NPC/NpcReadymade_Character2.png',
  'assets/NPC/NpcReadymade_Character3.png',
  'assets/NPC/NpcReadymade_Character4.png',
  'assets/NPC/NpcReadymade_Character5.png',
  'assets/NPC/NpcReadymade_Character6.png',
  'assets/NPC/NpcReadymade_Character7.png',
  'assets/NPC/NpcReadymade_Character8.png',
  'assets/NPC/NpcReadymade_Character9.png',
  'assets/NPC/NpcReadymade_Character10.png',
  'assets/NPC/NpcReadymade_Character11.png',
  'assets/NPC/NpcReadymade_Character12.png',
  'assets/NPC/NpcReadymade_Character13.png',
  'assets/NPC/NpcReadymade_Character14.png',
  'assets/NPC/NpcReadymade_Character15.png',
  'assets/NPC/NpcReadymade_Character16.png',
  'assets/NPC/NpcReadymade_Chef.png',
  'assets/NPC/NpcReadymade_ConstructionWorker.png',
  'assets/NPC/NpcReadymade_Doctor.png',
  'assets/NPC/NpcReadymade_Fireman.png',
  'assets/NPC/NpcReadymade_Mailman.png',
  'assets/NPC/NpcReadymade_Mayor.png',
  'assets/NPC/NpcReadymade_Police.png',
  'assets/NPC/NpcReadymade_SportsPlayer1.png',
  'assets/NPC/NpcReadymade_SportsPlayer2.png',
  'assets/NPC/NpcReadymade_SportsPlayer3.png',
  'assets/NPC/NpcReadymade_SportsPlayer4.png',
  'assets/NPC/NpcReadymade_Teacher.png',
  'assets/NPC/NpcReadymade_Waiter.png',
];

const SHEET_COLS = 8;
const SHEET_ROWS = 5;         // 8x5 grid, 220x220 per frame (row 4 unused)
const DIR_ROWS = 4;           // only rows 0-3 are directional walking
const NPC_SPEED = 0.5;         // tiles per second
const NPC_SCALE = 0.65;        // visual scale relative to tile
const PATH_MIN = 8;            // min tiles per wander path
const PATH_MAX = 20;           // max tiles per wander path
const IDLE_MIN_MS = 500;
const IDLE_MAX_MS = 2000;
const ANIM_SPEED = 0.12;

// Spritesheet row → direction mapping
// Row 0 = facing down (south), Row 1 = facing left (west),
// Row 2 = facing right (east), Row 3 = facing up (north), Row 4 = unused
type Direction = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// NPC state
// ---------------------------------------------------------------------------

interface NPC {
  sprite: AnimatedSprite;
  directions: Texture[][];   // [4][8] — cached direction frame arrays
  currentRow: number;
  currentCol: number;
  targetRow: number;
  targetCol: number;
  progress: number;          // 0..1 interpolation toward target
  direction: Direction;
  idle: boolean;
  idleUntil: number;         // performance.now() timestamp
  path: string[];            // queue of tile keys to follow
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let pixiApp: Application | null = null;
let sceneContainers: SceneContainers | null = null;
let npcs: NPC[] = [];
let walkableGraph: Map<string, string[]> = new Map(); // "r,c" → neighbor keys
let unsubBuildMode: (() => void) | null = null;
let paused = false;

// Spritesheet texture cache: sprite path → Texture[4][8]
const sheetCache = new Map<string, Texture[][]>();

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

// Cardinal offsets: [dRow, dCol]
const CARDINALS: [number, number][] = [
  [-1, 0], // north
  [1, 0],  // south
  [0, -1], // west
  [0, 1],  // east
];

function directionFromDelta(dRow: number, dCol: number): Direction {
  // Isometric: south = +row, north = -row, east = +col, west = -col
  if (dRow > 0) return 0; // south / down
  if (dCol < 0) return 1; // west / left
  if (dCol > 0) return 2; // east / right
  return 3;               // north / up
}

// ---------------------------------------------------------------------------
// Spritesheet loading
// ---------------------------------------------------------------------------

async function loadSheetTextures(spritePath: string): Promise<Texture[][]> {
  const cached = sheetCache.get(spritePath);
  if (cached) return cached;

  const baseTexture = await Assets.load(spritePath);
  const frameW = baseTexture.width / SHEET_COLS;
  const frameH = baseTexture.height / SHEET_ROWS;

  const directions: Texture[][] = [];
  for (let row = 0; row < DIR_ROWS; row++) {
    const frames: Texture[] = [];
    for (let col = 0; col < SHEET_COLS; col++) {
      frames.push(
        new Texture({
          source: baseTexture.source,
          frame: new Rectangle(col * frameW, row * frameH, frameW, frameH),
        }),
      );
    }
    directions.push(frames);
  }

  sheetCache.set(spritePath, directions);
  return directions;
}

// ---------------------------------------------------------------------------
// Walkable graph
// ---------------------------------------------------------------------------

// Edge midpoints for each road direction, relative to gridToScreen (top vertex).
// [dRow, dCol, midpointX, midpointY]
const EDGE_MID: [number, number, number, number][] = [
  [-1, 0,  128,  73],   // north road → top-right edge
  [ 1, 0, -128, 219],   // south road → bottom-left edge
  [ 0, 1,  128, 219],   // east road  → bottom-right edge
  [ 0,-1, -128,  73],   // west road  → top-left edge
];

// How far from edge midpoint toward tile center (0 = on edge, 1 = at center).
// Asymmetric to compensate for sprite height (anchor at feet, body extends up):
//   Top edges (NPC visually below road): body extends up INTO road → push further inward
//   Bottom edges (NPC visually above road): body extends up AWAY from road → stay near edge
const EDGE_LERP_TOP = 0.65;
const EDGE_LERP_BOTTOM = -0.5;
const TILE_CY = TILE_HEIGHT / 2; // tile center Y offset from gridToScreen

function npcScreenPos(row: number, col: number): { x: number; y: number } {
  const base = gridToScreen(row, col);
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const [dr, dc, mx, my] of EDGE_MID) {
    if (hasRoad(row + dr, col + dc)) {
      const lerp = my < TILE_CY ? EDGE_LERP_TOP : EDGE_LERP_BOTTOM;
      sumX += mx * (1 - lerp);
      sumY += my + (TILE_CY - my) * lerp;
      count++;
    }
  }
  if (count === 0) {
    return { x: base.x, y: base.y + TILE_CY };
  }
  return { x: base.x + sumX / count, y: base.y + sumY / count };
}

function buildWalkableGraph(): void {
  walkableGraph.clear();

  // Walkable = tiles directly adjacent to a road, not roads or buildings.
  // A pixel offset (computeRoadOffset) shifts NPCs off the road texture.
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!hasRoad(row, col)) continue;
      for (const [dr, dc] of CARDINALS) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        if (hasRoad(nr, nc) || isOccupied(nr, nc)) continue;
        walkableGraph.set(tileKey(nr, nc), []);
      }
    }
  }

  // Build adjacency: connect walkable tiles that are cardinal neighbors
  for (const key of walkableGraph.keys()) {
    const [row, col] = parseKey(key);
    const neighbors: string[] = [];
    for (const [dr, dc] of CARDINALS) {
      const nk = tileKey(row + dr, col + dc);
      if (walkableGraph.has(nk)) {
        neighbors.push(nk);
      }
    }
    walkableGraph.set(key, neighbors);
  }
}

// ---------------------------------------------------------------------------
// Spawn / despawn
// ---------------------------------------------------------------------------

function destroyAllNPCs(): void {
  for (const npc of npcs) {
    npc.sprite.stop();
    npc.sprite.removeFromParent();
    npc.sprite.destroy();
  }
  npcs = [];
}

export async function respawnNPCs(): Promise<void> {
  if (!sceneContainers) {
    console.warn('[NPC] respawnNPCs: no containers');
    return;
  }
  destroyAllNPCs();
  buildWalkableGraph();

  const population = usePlayerStore.getState().population;
  const maxVisible = GAME_CONFIG.population.max_visible_npcs;
  const tileKeys = Array.from(walkableGraph.keys());
  const count = Math.min(population, maxVisible, tileKeys.length);

  console.log(`[NPC] population=${population}, walkableTiles=${tileKeys.length}, spawning=${count}`);

  if (count <= 0) return;

  // Shuffle tile keys and pick starting positions
  const shuffled = tileKeys.sort(() => Math.random() - 0.5);
  const positions = count <= shuffled.length
    ? shuffled.slice(0, count)
    : Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);

  // Load spritesheets concurrently (deduplicated by cache)
  const poolSize = NPC_SPRITE_POOL.length;
  const spriteIndices = positions.map(() => randomInt(0, poolSize - 1));
  const uniquePaths = [...new Set(spriteIndices.map((i) => NPC_SPRITE_POOL[i]))];
  await Promise.all(uniquePaths.map((p) => loadSheetTextures(p)));

  for (let i = 0; i < count; i++) {
    const [row, col] = parseKey(positions[i]);
    const spritePath = NPC_SPRITE_POOL[spriteIndices[i]];
    const directions = sheetCache.get(spritePath)!;

    const direction: Direction = randomInt(0, 3) as Direction;
    const sprite = new AnimatedSprite(directions[direction]);
    sprite.animationSpeed = ANIM_SPEED;
    sprite.anchor.set(0.5, 1.0);
    sprite.scale.set(NPC_SCALE);
    sprite.play();

    const screen = npcScreenPos(row, col);
    sprite.position.set(screen.x, screen.y);

    sceneContainers.entityLayer.addChild(sprite);

    npcs.push({
      sprite,
      directions,
      currentRow: row,
      currentCol: col,
      targetRow: row,
      targetCol: col,
      progress: 0,
      direction,
      idle: true,
      idleUntil: performance.now() + randomFloat(0, IDLE_MAX_MS),
      path: [],
    });
  }

  // Initial depth sort
  sortEntityLayer();
}

function sortEntityLayer(): void {
  if (!sceneContainers) return;
  sceneContainers.entityLayer.children.sort((a, b) => a.position.y - b.position.y);
}

// ---------------------------------------------------------------------------
// Path generation — random walk biased against backtracking
// ---------------------------------------------------------------------------

function generatePath(startRow: number, startCol: number): string[] {
  const path: string[] = [];
  const steps = randomInt(PATH_MIN, PATH_MAX);
  let row = startRow;
  let col = startCol;
  let prevKey = '';

  for (let i = 0; i < steps; i++) {
    const key = tileKey(row, col);
    const neighbors = walkableGraph.get(key);
    if (!neighbors || neighbors.length === 0) break;

    // Filter out the tile we just came from to avoid backtracking
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
// Ticker update
// ---------------------------------------------------------------------------

function updateNPCs(ticker: Ticker): void {
  if (paused || npcs.length === 0) return;

  const dtSec = ticker.elapsedMS / 1000;
  const now = performance.now();
  let needSort = false;

  for (const npc of npcs) {
    if (npc.idle) {
      // Still in idle delay?
      if (now < npc.idleUntil) continue;

      // If path is empty, generate a new long path
      if (npc.path.length === 0) {
        npc.path = generatePath(npc.currentRow, npc.currentCol);
        if (npc.path.length === 0) {
          // Stuck — no walkable neighbors, retry later
          npc.idleUntil = now + randomFloat(IDLE_MIN_MS, IDLE_MAX_MS);
          continue;
        }
      }

      // Take the next step from the path
      const nextKey = npc.path.shift()!;
      const [tr, tc] = parseKey(nextKey);

      npc.targetRow = tr;
      npc.targetCol = tc;
      npc.progress = 0;
      npc.idle = false;

      // Update direction and swap animation textures
      const dir = directionFromDelta(tr - npc.currentRow, tc - npc.currentCol);
      if (dir !== npc.direction) {
        npc.direction = dir;
        npc.sprite.textures = npc.directions[dir];
        npc.sprite.play();
      }
    } else {
      // Walking toward target
      npc.progress += NPC_SPEED * dtSec;

      if (npc.progress >= 1) {
        // Arrived at target tile
        npc.currentRow = npc.targetRow;
        npc.currentCol = npc.targetCol;
        npc.progress = 0;
        npc.idle = true;
        // Brief pause between steps; longer pause when path is done
        npc.idleUntil = npc.path.length > 0
          ? now + 50   // tiny pause between path steps for smooth walking
          : now + randomFloat(IDLE_MIN_MS, IDLE_MAX_MS);

        const screen = npcScreenPos(npc.currentRow, npc.currentCol);
        npc.sprite.position.set(screen.x, screen.y);
        needSort = true;
      } else {
        // Lerp between current and target positions (including road offsets)
        const from = npcScreenPos(npc.currentRow, npc.currentCol);
        const to = npcScreenPos(npc.targetRow, npc.targetCol);
        npc.sprite.position.set(
          from.x + (to.x - from.x) * npc.progress,
          from.y + (to.y - from.y) * npc.progress,
        );
        needSort = true;
      }
    }
  }

  if (needSort) sortEntityLayer();
}

// ---------------------------------------------------------------------------
// Build mode lifecycle
// ---------------------------------------------------------------------------

function onBuildModeChange(buildMode: boolean): void {
  if (buildMode) {
    // Entering build mode — hide NPCs
    paused = true;
    for (const npc of npcs) {
      npc.sprite.visible = false;
      npc.sprite.stop();
    }
  } else {
    // Exiting build mode — respawn fresh
    paused = false;
    respawnNPCs().catch((err) => console.error('[NPC] respawn failed:', err));
  }
}

// ---------------------------------------------------------------------------
// Init / Destroy
// ---------------------------------------------------------------------------

let prevBuildMode = false;

export function initNpcSystem(app: Application, containers: SceneContainers): void {
  pixiApp = app;
  sceneContainers = containers;
  paused = false;

  // Add ticker
  app.ticker.add(updateNPCs);

  // Subscribe to build mode changes
  prevBuildMode = useBuildStore.getState().buildMode;
  unsubBuildMode = useBuildStore.subscribe((state) => {
    if (prevBuildMode !== state.buildMode) {
      onBuildModeChange(state.buildMode);
    }
    prevBuildMode = state.buildMode;
  });
}

export function destroyNpcSystem(): void {
  if (pixiApp) {
    pixiApp.ticker.remove(updateNPCs);
  }

  if (unsubBuildMode) {
    unsubBuildMode();
    unsubBuildMode = null;
  }

  destroyAllNPCs();

  // Clear caches
  sheetCache.clear();
  walkableGraph.clear();

  pixiApp = null;
  sceneContainers = null;
  paused = false;
}
