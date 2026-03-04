import { Application, Container, Ticker } from 'pixi.js';
import {
  CAMERA_MIN_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_FRICTION,
  CAMERA_VELOCITY_THRESHOLD,
  CAMERA_VELOCITY_SMOOTHING,
  CAMERA_WHEEL_ZOOM_SPEED,
  CAMERA_BOUNDARY_PADDING,
} from '../config/camera-constants';
import { gridToScreen } from './iso-utils';
import { GRID_SIZE, TILE_HEIGHT } from '../config/grid-constants';
import type { CameraState, Velocity, TouchPoint } from '../types/camera';
import { persistCamera } from '../db/city-persistence';

// --- Module state ---

let app: Application | null = null;
let gameWorld: Container | null = null;

let isDragging = false;
let isPinching = false;
let lastPointer = { x: 0, y: 0 };
let velocity: Velocity = { x: 0, y: 0 };

// Pointer-down interceptor — build system can claim a pointer before camera pans
let pointerDownInterceptor: ((screenX: number, screenY: number) => boolean) | null = null;

let activeTouches: TouchPoint[] = [];
let lastPinchDist = 0;
let lastPinchMid = { x: 0, y: 0 };

// Pre-computed map bounds (world coordinates)
let mapMinX = 0;
let mapMaxX = 0;
let mapMinY = 0;
let mapMaxY = 0;

// Bound handler references for cleanup
let onPointerDown: ((e: PointerEvent) => void) | null = null;
let onPointerMove: ((e: PointerEvent) => void) | null = null;
let onPointerUp: ((e: PointerEvent) => void) | null = null;
let onWheel: ((e: WheelEvent) => void) | null = null;
let onTouchStart: ((e: TouchEvent) => void) | null = null;
let onTouchMove: ((e: TouchEvent) => void) | null = null;
let onTouchEnd: ((e: TouchEvent) => void) | null = null;
let tickerCallback: ((ticker: Ticker) => void) | null = null;

// --- Map bounds ---

function computeMapBounds(): void {
  // The isometric diamond corners for a GRID_SIZE x GRID_SIZE grid
  const topCorner = gridToScreen(0, 0);
  const rightCorner = gridToScreen(0, GRID_SIZE);
  const bottomCorner = gridToScreen(GRID_SIZE, GRID_SIZE);
  const leftCorner = gridToScreen(GRID_SIZE, 0);

  // Tiles are anchored at (0.5, 0) so they extend TILE_HEIGHT below their position
  mapMinX = leftCorner.x;
  mapMaxX = rightCorner.x;
  mapMinY = topCorner.y;
  mapMaxY = bottomCorner.y + TILE_HEIGHT;
}

// --- Bounds clamping ---

function clampBounds(): void {
  if (!app || !gameWorld) return;

  const zoom = gameWorld.scale.x;
  const vw = app.screen.width;
  const vh = app.screen.height;
  const pad = CAMERA_BOUNDARY_PADDING;

  const worldW = (mapMaxX - mapMinX) * zoom;
  const worldH = (mapMaxY - mapMinY) * zoom;

  // If the map (at current zoom) is smaller than the viewport, center it.
  // Otherwise, clamp so the map doesn't scroll entirely off-screen.
  if (worldW <= vw) {
    gameWorld.x = (vw - worldW) / 2 - mapMinX * zoom;
  } else {
    const minX = vw - mapMaxX * zoom - pad;
    const maxX = -mapMinX * zoom + pad;
    gameWorld.x = Math.max(minX, Math.min(maxX, gameWorld.x));
  }

  if (worldH <= vh) {
    gameWorld.y = (vh - worldH) / 2 - mapMinY * zoom;
  } else {
    const minY = vh - mapMaxY * zoom - pad;
    const maxY = -mapMinY * zoom + pad;
    gameWorld.y = Math.max(minY, Math.min(maxY, gameWorld.y));
  }
}

// --- Zoom toward a screen point ---

function zoomAt(screenX: number, screenY: number, newZoom: number): void {
  if (!gameWorld) return;

  const clamped = Math.max(CAMERA_MIN_ZOOM, Math.min(CAMERA_MAX_ZOOM, newZoom));
  const oldZoom = gameWorld.scale.x;

  // World point under the cursor before zoom
  const worldX = (screenX - gameWorld.x) / oldZoom;
  const worldY = (screenY - gameWorld.y) / oldZoom;

  gameWorld.scale.set(clamped);

  // Adjust position so the same world point stays under the cursor
  gameWorld.x = screenX - worldX * clamped;
  gameWorld.y = screenY - worldY * clamped;

  clampBounds();
  persistCamera(getCameraState());
}

// --- Pinch helpers ---

function pinchDistance(touches: TouchPoint[]): number {
  const dx = touches[0].x - touches[1].x;
  const dy = touches[0].y - touches[1].y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pinchMidpoint(touches: TouchPoint[]): { x: number; y: number } {
  return {
    x: (touches[0].x + touches[1].x) / 2,
    y: (touches[0].y + touches[1].y) / 2,
  };
}

function touchListToPoints(touches: TouchList): TouchPoint[] {
  const points: TouchPoint[] = [];
  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    points.push({ id: t.identifier, x: t.clientX, y: t.clientY });
  }
  return points;
}

// --- Event handlers ---

function handlePointerDown(e: PointerEvent): void {
  if (isPinching) return;

  // Let the build system intercept (e.g. picking up a building)
  if (pointerDownInterceptor && pointerDownInterceptor(e.clientX, e.clientY)) {
    return; // build system claimed this pointer
  }

  isDragging = true;
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
  velocity.x = 0;
  velocity.y = 0;
}

function handlePointerMove(e: PointerEvent): void {
  if (!isDragging || isPinching || !gameWorld) return;

  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;

  gameWorld.x += dx;
  gameWorld.y += dy;

  // EMA velocity tracking
  velocity.x = velocity.x * (1 - CAMERA_VELOCITY_SMOOTHING) + dx * CAMERA_VELOCITY_SMOOTHING;
  velocity.y = velocity.y * (1 - CAMERA_VELOCITY_SMOOTHING) + dy * CAMERA_VELOCITY_SMOOTHING;

  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;

  clampBounds();
  persistCamera(getCameraState());
}

function handlePointerUp(): void {
  isDragging = false;
}

function handleWheel(e: WheelEvent): void {
  if (!gameWorld) return;
  e.preventDefault();

  const zoomDelta = -e.deltaY * CAMERA_WHEEL_ZOOM_SPEED;
  const newZoom = gameWorld.scale.x * (1 + zoomDelta);
  zoomAt(e.clientX, e.clientY, newZoom);
}

function handleTouchStart(e: TouchEvent): void {
  activeTouches = touchListToPoints(e.touches);

  if (activeTouches.length >= 2) {
    e.preventDefault();
    isPinching = true;
    isDragging = false;
    lastPinchDist = pinchDistance(activeTouches);
    lastPinchMid = pinchMidpoint(activeTouches);
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (!gameWorld) return;
  activeTouches = touchListToPoints(e.touches);

  if (isPinching && activeTouches.length >= 2) {
    e.preventDefault();

    const dist = pinchDistance(activeTouches);
    const mid = pinchMidpoint(activeTouches);

    // Zoom
    const scale = dist / lastPinchDist;
    const newZoom = gameWorld.scale.x * scale;
    zoomAt(mid.x, mid.y, newZoom);

    // Pan from midpoint movement
    const dx = mid.x - lastPinchMid.x;
    const dy = mid.y - lastPinchMid.y;
    gameWorld.x += dx;
    gameWorld.y += dy;

    lastPinchDist = dist;
    lastPinchMid = mid;

    clampBounds();
    persistCamera(getCameraState());
  }
}

function handleTouchEnd(e: TouchEvent): void {
  activeTouches = touchListToPoints(e.touches);

  if (activeTouches.length < 2) {
    isPinching = false;
  }
}

// --- Momentum tick ---

function onTick(): void {
  if (isDragging || isPinching || !gameWorld) return;

  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed < CAMERA_VELOCITY_THRESHOLD) {
    velocity.x = 0;
    velocity.y = 0;
    return;
  }

  gameWorld.x += velocity.x;
  gameWorld.y += velocity.y;
  velocity.x *= CAMERA_FRICTION;
  velocity.y *= CAMERA_FRICTION;

  clampBounds();
  persistCamera(getCameraState());
}

// --- Public API ---

export function initCamera(pixiApp: Application, world: Container): void {
  app = pixiApp;
  gameWorld = world;

  computeMapBounds();

  const canvas = pixiApp.canvas as HTMLCanvasElement;

  // Pointer events (handles mouse + single touch pan)
  onPointerDown = handlePointerDown;
  onPointerMove = handlePointerMove;
  onPointerUp = handlePointerUp;

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // Wheel zoom (desktop)
  onWheel = handleWheel;
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Touch events (pinch-to-zoom needs access to event.touches)
  onTouchStart = handleTouchStart;
  onTouchMove = handleTouchMove;
  onTouchEnd = handleTouchEnd;

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);

  // Momentum ticker
  tickerCallback = onTick;
  pixiApp.ticker.add(tickerCallback);
}

export function destroyCamera(): void {
  if (app) {
    const canvas = app.canvas as HTMLCanvasElement;

    if (onPointerDown) canvas.removeEventListener('pointerdown', onPointerDown);
    if (onPointerMove) canvas.removeEventListener('pointermove', onPointerMove);
    if (onPointerUp) {
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    }
    if (onWheel) canvas.removeEventListener('wheel', onWheel);
    if (onTouchStart) canvas.removeEventListener('touchstart', onTouchStart);
    if (onTouchMove) canvas.removeEventListener('touchmove', onTouchMove);
    if (onTouchEnd) {
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    }
    if (tickerCallback) app.ticker.remove(tickerCallback);
  }

  app = null;
  gameWorld = null;
  isDragging = false;
  isPinching = false;
  velocity = { x: 0, y: 0 };
  activeTouches = [];
  onPointerDown = null;
  onPointerMove = null;
  onPointerUp = null;
  onWheel = null;
  onTouchStart = null;
  onTouchMove = null;
  onTouchEnd = null;
  tickerCallback = null;
  pointerDownInterceptor = null;
}

export function setPointerDownInterceptor(
  cb: ((screenX: number, screenY: number) => boolean) | null,
): void {
  pointerDownInterceptor = cb;
}

export function getGameWorld(): Container | null {
  return gameWorld;
}

export function getCameraState(): CameraState {
  if (!gameWorld) return { x: 0, y: 0, zoom: 1 };
  return {
    x: gameWorld.x,
    y: gameWorld.y,
    zoom: gameWorld.scale.x,
  };
}
