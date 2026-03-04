import { Assets, Sprite, Ticker, ColorMatrixFilter } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { setPointerDownInterceptor, getGameWorld } from './camera';
import { screenToGrid, gridToScreen } from './iso-utils';
import { getGrid } from './grid';
import { getAsset } from './asset-registry';
import { placeOnGrid } from './place-on-grid';
import { useBuildStore } from '../stores/build-store';
import { GRID_SIZE } from '../config/grid-constants';

// ---------------------------------------------------------------------------
// Occupancy map — stores sprite + assetKey per tile
// ---------------------------------------------------------------------------

const occupied = new Map<string, { sprite: Sprite; assetKey: string }>();

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isOccupied(row: number, col: number): boolean {
  return occupied.has(tileKey(row, col));
}

export function getOccupant(row: number, col: number): { sprite: Sprite; assetKey: string } | undefined {
  return occupied.get(tileKey(row, col));
}

export function markOccupied(row: number, col: number, sprite: Sprite, assetKey: string): void {
  occupied.set(tileKey(row, col), { sprite, assetKey });
}

export function markFree(row: number, col: number): void {
  occupied.delete(tileKey(row, col));
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TINT = 0x00ff00;
const INVALID_TINT = 0xff0000;
const DRAG_THRESHOLD = 8; // px — movement needed to enter drag mode

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let containers: SceneContainers | null = null;
let pixiApp: Application | null = null;

// ---------------------------------------------------------------------------
// Selection highlight
// ---------------------------------------------------------------------------

let selectedSprite: Sprite | null = null;
let selectionFilter: ColorMatrixFilter | null = null;

function highlightSprite(sprite: Sprite): void {
  clearHighlight();
  selectionFilter = new ColorMatrixFilter();
  selectionFilter.brightness(1.3, false);
  sprite.filters = [selectionFilter];
  selectedSprite = sprite;
}

function clearHighlight(): void {
  if (selectedSprite) {
    selectedSprite.filters = [];
    selectedSprite = null;
    selectionFilter = null;
  }
}

// ---------------------------------------------------------------------------
// Pending move (from popup "Move" button)
// ---------------------------------------------------------------------------

let pendingMove: { assetKey: string; row: number; col: number; sprite: Sprite } | null = null;

function cancelPendingMove(): void {
  if (!pendingMove) return;
  pendingMove.sprite.alpha = 1;
  pendingMove = null;
}

// ---------------------------------------------------------------------------
// Drag state machine
// ---------------------------------------------------------------------------

interface DragState {
  type: 'new' | 'move';
  assetKey: string;
  ghost: Sprite;
  valid: boolean;
  lastRow: number;
  lastCol: number;
  // Move-specific: snap-back on invalid drop
  originalRow?: number;
  originalCol?: number;
  originalSprite?: Sprite;
}

let activeDrag: DragState | null = null;

// Pre-drag state (before threshold is reached)
let preDrag: {
  type: 'new' | 'move';
  assetKey: string;
  startX: number;
  startY: number;
  // Move-specific
  originalRow?: number;
  originalCol?: number;
  originalSprite?: Sprite;
} | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTileValid(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
  const grid = getGrid();
  if (!grid) return false;
  if (!grid[row][col].buildable) return false;
  if (isOccupied(row, col)) return false;
  return true;
}

function screenToWorld(screenX: number, screenY: number): { x: number; y: number } | null {
  const world = getGameWorld();
  if (!world) return null;
  return {
    x: (screenX - world.x) / world.scale.x,
    y: (screenY - world.y) / world.scale.y,
  };
}

function createGhostSprite(assetKey: string): Sprite | null {
  const asset = getAsset(assetKey);
  if (!asset) return null;

  const texture = Assets.get(asset.textureKey);
  if (!texture) return null;

  const ghost = new Sprite(texture);
  ghost.anchor.set(asset.anchor.x, asset.anchor.y);
  ghost.alpha = 0.6;
  ghost.tint = VALID_TINT;
  ghost.label = 'drag_ghost';
  ghost.eventMode = 'none';

  containers?.buildingLayer.addChild(ghost);
  return ghost;
}

function updateGhostAtScreen(screenX: number, screenY: number): void {
  if (!activeDrag || !containers) return;

  const worldPos = screenToWorld(screenX, screenY);
  if (!worldPos) return;

  const asset = getAsset(activeDrag.assetKey);
  if (!asset) return;

  // Offset cursor position to account for sprite height above its anchor.
  // Buildings use anchor.y=1.0 (bottom-center), so the sprite extends upward.
  // Without this, the ghost visually appears above the cursor.
  const texture = Assets.get(asset.textureKey);
  const heightOffset = texture ? texture.height * (asset.anchor.y - 0.5) : 0;
  const gridPos = screenToGrid(worldPos.x, worldPos.y + heightOffset);
  const valid = isTileValid(gridPos.row, gridPos.col);

  const pos = gridToScreen(gridPos.row, gridPos.col);
  activeDrag.ghost.position.set(pos.x + asset.gridOffset.x, pos.y + asset.gridOffset.y);
  activeDrag.ghost.tint = valid ? VALID_TINT : INVALID_TINT;
  activeDrag.valid = valid;
  activeDrag.lastRow = gridPos.row;
  activeDrag.lastCol = gridPos.col;
}

function destroyGhost(): void {
  if (activeDrag) {
    activeDrag.ghost.removeFromParent();
    activeDrag.ghost.destroy();
  }
}

function depthSort(): void {
  if (!containers) return;
  containers.buildingLayer.children.sort((a, b) => a.position.y - b.position.y);
}

// ---------------------------------------------------------------------------
// Bounce animation
// ---------------------------------------------------------------------------

function bounceAnimation(sprite: Sprite, ticker: Ticker): void {
  const duration = 12; // ~200ms at 60fps
  let frame = 0;
  sprite.scale.set(1.15, 1.15);
  const tick = () => {
    frame++;
    const t = frame / duration;
    const scale = 1 + 0.15 * (1 - t);
    sprite.scale.set(scale, scale);
    if (frame >= duration) {
      sprite.scale.set(1, 1);
      ticker.remove(tick);
    }
  };
  ticker.add(tick);
}

// ---------------------------------------------------------------------------
// Document-level drag handlers
// ---------------------------------------------------------------------------

function onDocumentPointerMove(e: PointerEvent): void {
  if (preDrag && !activeDrag) {
    // Check if we've moved enough to start dragging
    const dx = e.clientX - preDrag.startX;
    const dy = e.clientY - preDrag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= DRAG_THRESHOLD) {
      // Upgrade pre-drag to full drag
      const ghost = createGhostSprite(preDrag.assetKey);
      if (!ghost) {
        cleanupDragListeners();
        return;
      }

      activeDrag = {
        type: preDrag.type,
        assetKey: preDrag.assetKey,
        ghost,
        valid: false,
        lastRow: -1,
        lastCol: -1,
        originalRow: preDrag.originalRow,
        originalCol: preDrag.originalCol,
        originalSprite: preDrag.originalSprite,
      };

      // If moving a building, hide the original sprite
      if (preDrag.type === 'move' && preDrag.originalSprite) {
        preDrag.originalSprite.visible = false;
        // Free the original tile so ghost shows green on it
        if (preDrag.originalRow !== undefined && preDrag.originalCol !== undefined) {
          markFree(preDrag.originalRow, preDrag.originalCol);
        }
      }

      preDrag = null;
      updateGhostAtScreen(e.clientX, e.clientY);
    }
    return;
  }

  if (activeDrag) {
    updateGhostAtScreen(e.clientX, e.clientY);
  }
}

function onDocumentPointerUp(e: PointerEvent): void {
  // If still in pre-drag (didn't move enough), it was a tap
  if (preDrag && !activeDrag) {
    if (preDrag.type === 'new') {
      // Tap on toolbar thumbnail → just select the asset
      useBuildStore.getState().selectAsset(preDrag.assetKey);
    }
    if (preDrag.type === 'move' && preDrag.originalSprite) {
      const { selectedBuilding } = useBuildStore.getState();
      // Toggle off if tapping the already-selected building
      if (selectedBuilding &&
          preDrag.originalRow === selectedBuilding.row &&
          preDrag.originalCol === selectedBuilding.col) {
        clearHighlight();
        useBuildStore.getState().deselectBuilding();
      } else {
        // Select this building
        const asset = getAsset(preDrag.assetKey);
        if (asset) {
          highlightSprite(preDrag.originalSprite);
          useBuildStore.getState().selectBuilding({
            row: preDrag.originalRow!,
            col: preDrag.originalCol!,
            assetKey: preDrag.assetKey,
            displayName: asset.displayName,
            textureKey: asset.textureKey,
          });
        }
      }
    }
    preDrag = null;
    cleanupDragListeners();
    return;
  }

  if (!activeDrag || !containers || !pixiApp) {
    cleanupDragListeners();
    return;
  }

  if (activeDrag.valid) {
    // Place or move the building
    if (activeDrag.type === 'new') {
      // Create a permanent sprite
      const asset = getAsset(activeDrag.assetKey);
      const texture = Assets.get(asset!.textureKey);
      const sprite = new Sprite(texture);
      sprite.label = `building_${activeDrag.assetKey}_${activeDrag.lastRow}_${activeDrag.lastCol}`;
      placeOnGrid(sprite, activeDrag.lastRow, activeDrag.lastCol, activeDrag.assetKey);
      containers.buildingLayer.addChild(sprite);
      markOccupied(activeDrag.lastRow, activeDrag.lastCol, sprite, activeDrag.assetKey);
      depthSort();
      bounceAnimation(sprite, pixiApp.ticker);

      useBuildStore.getState().pushPlacement({
        type: 'place',
        sprite,
        row: activeDrag.lastRow,
        col: activeDrag.lastCol,
        assetKey: activeDrag.assetKey,
      });
    } else {
      // Move: reposition the original sprite
      const origSprite = activeDrag.originalSprite!;
      placeOnGrid(origSprite, activeDrag.lastRow, activeDrag.lastCol, activeDrag.assetKey);
      origSprite.visible = true;
      markOccupied(activeDrag.lastRow, activeDrag.lastCol, origSprite, activeDrag.assetKey);
      depthSort();
      bounceAnimation(origSprite, pixiApp.ticker);

      useBuildStore.getState().pushPlacement({
        type: 'move',
        sprite: origSprite,
        row: activeDrag.lastRow,
        col: activeDrag.lastCol,
        assetKey: activeDrag.assetKey,
        fromRow: activeDrag.originalRow,
        fromCol: activeDrag.originalCol,
      });
    }
  } else {
    // Invalid drop
    if (activeDrag.type === 'new') {
      // Check if we're dropping back onto the toolbar area (cancel silently)
      const toolbarEl = document.querySelector('[data-build-toolbar]');
      if (toolbarEl) {
        const rect = toolbarEl.getBoundingClientRect();
        if (e.clientY >= rect.top) {
          // Dropped back on toolbar — silent cancel
          destroyGhost();
          activeDrag = null;
          cleanupDragListeners();
          return;
        }
      }
      useBuildStore.getState().showToast("Can't build here");
    } else {
      // Move: snap back to original position
      const origSprite = activeDrag.originalSprite!;
      placeOnGrid(origSprite, activeDrag.originalRow!, activeDrag.originalCol!, activeDrag.assetKey);
      origSprite.visible = true;
      markOccupied(activeDrag.originalRow!, activeDrag.originalCol!, origSprite, activeDrag.assetKey);
      depthSort();
    }
  }

  destroyGhost();
  activeDrag = null;
  cleanupDragListeners();
}

function cleanupDragListeners(): void {
  document.removeEventListener('pointermove', onDocumentPointerMove);
  document.removeEventListener('pointerup', onDocumentPointerUp);
}

// ---------------------------------------------------------------------------
// Drag-from-toolbar (called by BuildToolbar)
// ---------------------------------------------------------------------------

export function startToolbarDrag(assetKey: string, startX: number, startY: number): void {
  // Cancel any existing drag
  if (activeDrag) {
    destroyGhost();
    activeDrag = null;
  }
  preDrag = null;

  // Dismiss selection popup and cancel pending move
  if (useBuildStore.getState().selectedBuilding) {
    clearHighlight();
    useBuildStore.getState().deselectBuilding();
  }
  cancelPendingMove();

  preDrag = {
    type: 'new',
    assetKey,
    startX,
    startY,
  };

  document.addEventListener('pointermove', onDocumentPointerMove);
  document.addEventListener('pointerup', onDocumentPointerUp);
}

// ---------------------------------------------------------------------------
// Building move — pointer-down interceptor for camera
// ---------------------------------------------------------------------------

function findOccupantAtScreen(screenX: number, screenY: number): {
  row: number; col: number; sprite: Sprite; assetKey: string;
} | null {
  // getBounds() returns screen-space coords, so compare directly with screen coords
  for (const [key, occupant] of occupied) {
    const s = occupant.sprite;
    const bounds = s.getBounds();
    if (
      screenX >= bounds.x &&
      screenX <= bounds.x + bounds.width &&
      screenY >= bounds.y &&
      screenY <= bounds.y + bounds.height
    ) {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c, sprite: s, assetKey: occupant.assetKey };
    }
  }
  return null;
}

function handleBuildingPickup(screenX: number, screenY: number): boolean {
  const { buildMode } = useBuildStore.getState();
  if (!buildMode || !containers) return false;

  // Handle pending move from popup "Move" button
  if (pendingMove) {
    const pm = pendingMove;
    pendingMove = null;

    // Hide original sprite and free its tile
    pm.sprite.visible = false;
    markFree(pm.row, pm.col);

    // Create ghost and start drag directly (skip preDrag threshold)
    const ghost = createGhostSprite(pm.assetKey);
    if (!ghost) {
      pm.sprite.visible = true;
      pm.sprite.alpha = 1;
      markOccupied(pm.row, pm.col, pm.sprite, pm.assetKey);
      return false;
    }

    activeDrag = {
      type: 'move',
      assetKey: pm.assetKey,
      ghost,
      valid: false,
      lastRow: -1,
      lastCol: -1,
      originalRow: pm.row,
      originalCol: pm.col,
      originalSprite: pm.sprite,
    };

    updateGhostAtScreen(screenX, screenY);
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    return true;
  }

  const hit = findOccupantAtScreen(screenX, screenY);
  if (!hit) {
    // Tapped empty space — dismiss any popup
    if (useBuildStore.getState().selectedBuilding) {
      clearHighlight();
      useBuildStore.getState().deselectBuilding();
    }
    return false; // allow camera pan
  }

  // Start a move pre-drag
  preDrag = {
    type: 'move',
    assetKey: hit.assetKey,
    startX: screenX,
    startY: screenY,
    originalRow: hit.row,
    originalCol: hit.col,
    originalSprite: hit.sprite,
  };

  document.addEventListener('pointermove', onDocumentPointerMove);
  document.addEventListener('pointerup', onDocumentPointerUp);

  return true; // block camera pan
}

// ---------------------------------------------------------------------------
// Delete selected building
// ---------------------------------------------------------------------------

export function deleteSelectedBuilding(): void {
  const { selectedBuilding } = useBuildStore.getState();
  if (!selectedBuilding || !containers) return;

  const occupant = getOccupant(selectedBuilding.row, selectedBuilding.col);
  if (!occupant) return;

  // Remove from display but DON'T destroy (needed for undo)
  occupant.sprite.removeFromParent();
  markFree(selectedBuilding.row, selectedBuilding.col);
  clearHighlight();
  useBuildStore.getState().deselectBuilding();

  useBuildStore.getState().pushPlacement({
    type: 'delete',
    sprite: occupant.sprite,
    row: selectedBuilding.row,
    col: selectedBuilding.col,
    assetKey: occupant.assetKey,
  });
}

// ---------------------------------------------------------------------------
// Move from popup
// ---------------------------------------------------------------------------

export function moveSelectedBuilding(): void {
  const { selectedBuilding } = useBuildStore.getState();
  if (!selectedBuilding || !containers) return;

  const occupant = getOccupant(selectedBuilding.row, selectedBuilding.col);
  if (!occupant) return;

  clearHighlight();
  useBuildStore.getState().deselectBuilding();

  // Dim sprite and set pending move — next canvas pointerdown starts the drag
  occupant.sprite.alpha = 0.5;
  pendingMove = {
    assetKey: selectedBuilding.assetKey,
    row: selectedBuilding.row,
    col: selectedBuilding.col,
    sprite: occupant.sprite,
  };
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

export function undoLastPlacement(): void {
  const entry = useBuildStore.getState().popPlacement();
  if (!entry) return;

  if (entry.type === 'place') {
    entry.sprite.removeFromParent();
    entry.sprite.destroy();
    markFree(entry.row, entry.col);
  } else if (entry.type === 'move') {
    // Move: return sprite to original position
    placeOnGrid(entry.sprite, entry.fromRow!, entry.fromCol!, entry.assetKey);
    markFree(entry.row, entry.col);
    markOccupied(entry.fromRow!, entry.fromCol!, entry.sprite, entry.assetKey);
    depthSort();
  } else if (entry.type === 'delete') {
    // Delete: restore sprite to grid
    containers!.buildingLayer.addChild(entry.sprite);
    placeOnGrid(entry.sprite, entry.row, entry.col, entry.assetKey);
    markOccupied(entry.row, entry.col, entry.sprite, entry.assetKey);
    depthSort();
    if (pixiApp) bounceAnimation(entry.sprite, pixiApp.ticker);
  }
}

// ---------------------------------------------------------------------------
// Popup position ticker
// ---------------------------------------------------------------------------

let lastPopupX = 0;
let lastPopupY = 0;

function updatePopupPosition(): void {
  if (!selectedSprite) return;
  const bounds = selectedSprite.getBounds();
  const x = bounds.x + bounds.width / 2;  // horizontal center
  const y = bounds.y;                       // top edge
  if (Math.abs(x - lastPopupX) > 0.5 || Math.abs(y - lastPopupY) > 0.5) {
    lastPopupX = x;
    lastPopupY = y;
    useBuildStore.getState().updatePopupPos(x, y);
  }
}

// ---------------------------------------------------------------------------
// Init / Destroy
// ---------------------------------------------------------------------------

let unsubBuildMode: (() => void) | null = null;

export function initBuildSystem(app: Application, sceneContainers: SceneContainers): void {
  pixiApp = app;
  containers = sceneContainers;

  setPointerDownInterceptor(handleBuildingPickup);
  app.ticker.add(updatePopupPosition);

  // Cancel pending move when build mode turns off
  unsubBuildMode = useBuildStore.subscribe((state) => {
    if (!state.buildMode) {
      cancelPendingMove();
    }
  });
}

export function destroyBuildSystem(): void {
  setPointerDownInterceptor(null);

  if (pixiApp) {
    pixiApp.ticker.remove(updatePopupPosition);
  }

  if (unsubBuildMode) {
    unsubBuildMode();
    unsubBuildMode = null;
  }

  if (activeDrag) {
    destroyGhost();
    activeDrag = null;
  }
  preDrag = null;
  cleanupDragListeners();

  clearHighlight();
  cancelPendingMove();
  lastPopupX = 0;
  lastPopupY = 0;

  occupied.clear();
  pixiApp = null;
  containers = null;
}
