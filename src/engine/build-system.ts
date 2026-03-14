import { Assets, Sprite, Ticker, ColorMatrixFilter } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { SceneContainers } from './setup-stage';
import { setPointerDownInterceptor, getGameWorld } from './camera';
import { screenToGrid, gridToScreen } from './iso-utils';
import { getGrid } from './grid';
import { getAsset } from './asset-registry';
import { placeOnGrid, computeUprightAnchorX, computeUprightAnchorY } from './place-on-grid';
import { useBuildStore } from '../stores/build-store';
import { GRID_SIZE } from '../config/grid-constants';
import { persistPlace, persistMove, persistDelete } from '../db/city-persistence';
import { registryKeyToCatalogId, extractHouseColor } from '../lib/catalog-helpers';
import { useInventoryStore } from '../stores/inventory-store';
import { usePlayerStore } from '../stores/player-store';
import { getPopulationContribution } from './population';
import {
  handleRoadPointerDown,
  handleRoadDeletePointerDown,
  findRoadAtScreen,
  selectRoadForRemoval,
  undoRoadPlace,
  undoRoadDelete,
  undoRoadBatchDelete,
  hasRoad,
} from './road-system';

// ---------------------------------------------------------------------------
// Occupancy map — stores sprite + assetKey per tile
// ---------------------------------------------------------------------------

const occupied = new Map<string, { sprite: Sprite; assetKey: string; buildingId: string }>();

function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isOccupied(row: number, col: number): boolean {
  return occupied.has(tileKey(row, col));
}

export function getOccupant(row: number, col: number): { sprite: Sprite; assetKey: string; buildingId: string } | undefined {
  return occupied.get(tileKey(row, col));
}

export function markOccupied(row: number, col: number, sprite: Sprite, assetKey: string, buildingId: string): void {
  occupied.set(tileKey(row, col), { sprite, assetKey, buildingId });
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
// Tap candidate (for selecting buildings by tapping)
// ---------------------------------------------------------------------------

let tapCandidate: {
  row: number;
  col: number;
  assetKey: string;
  sprite: Sprite;
  buildingId: string;
  startX: number;
  startY: number;
} | null = null;

function onTapCandidateMove(e: PointerEvent): void {
  if (!tapCandidate) return;
  const dx = e.clientX - tapCandidate.startX;
  const dy = e.clientY - tapCandidate.startY;
  if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
    // User dragged — cancel tap, let camera continue panning
    tapCandidate = null;
    cleanupTapListeners();
  }
}

function onTapCandidateUp(): void {
  if (!tapCandidate) {
    cleanupTapListeners();
    return;
  }

  const hit = tapCandidate;
  tapCandidate = null;
  cleanupTapListeners();

  const { selectedBuilding } = useBuildStore.getState();
  // Toggle off if tapping the already-selected building
  if (
    selectedBuilding &&
    hit.row === selectedBuilding.row &&
    hit.col === selectedBuilding.col
  ) {
    clearHighlight();
    useBuildStore.getState().deselectBuilding();
  } else {
    // Select this building
    const asset = getAsset(hit.assetKey);
    if (asset) {
      highlightSprite(hit.sprite);
      useBuildStore.getState().selectBuilding({
        row: hit.row,
        col: hit.col,
        assetKey: hit.assetKey,
        displayName: asset.displayName,
        textureKey: asset.textureKey,
      });
    }
  }
}

function cleanupTapListeners(): void {
  document.removeEventListener('pointermove', onTapCandidateMove);
  document.removeEventListener('pointerup', onTapCandidateUp);
}

// ---------------------------------------------------------------------------
// Pending move (from popup "Move" button)
// ---------------------------------------------------------------------------

let pendingMove: { assetKey: string; row: number; col: number; sprite: Sprite; buildingId: string } | null = null;

function cancelPendingMove(): void {
  if (!pendingMove) return;
  pendingMove.sprite.alpha = 1;
  pendingMove.sprite.visible = true;
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
  buildingId?: string;
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
  buildingId?: string;
  // Move-specific
  originalRow?: number;
  originalCol?: number;
  originalSprite?: Sprite;
} | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTileValid(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    console.log(`[isTileValid] (${row},${col}) FAIL: out of bounds`);
    return false;
  }
  const grid = getGrid();
  if (!grid) return false;
  if (!grid[row][col].buildable) {
    console.log(`[isTileValid] (${row},${col}) FAIL: not buildable`);
    return false;
  }
  if (isOccupied(row, col)) {
    console.log(`[isTileValid] (${row},${col}) FAIL: occupied`);
    return false;
  }
  if (hasRoad(row, col)) {
    console.log(`[isTileValid] (${row},${col}) FAIL: hasRoad`);
    return false;
  }
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
  if (asset.anchor.y === 0) {
    ghost.anchor.set(asset.anchor.x, 0);
  } else {
    ghost.anchor.set(
      computeUprightAnchorX(texture.width),
      computeUprightAnchorY(texture.height, texture.width),
    );
  }
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
  // With a dynamic anchor the sprite extends upward; this shifts the cursor
  // so the ghost doesn't visually float above the pointer.
  const texture = Assets.get(asset.textureKey);
  const anchorY = texture && asset.anchor.y !== 0
    ? computeUprightAnchorY(texture.height, texture.width)
    : asset.anchor.y;
  const anchorX = texture && asset.anchor.y !== 0
    ? computeUprightAnchorX(texture.width)
    : asset.anchor.x;
  const heightOffset = texture ? texture.height * (anchorY - 0.5) : 0;
  const widthOffset = texture ? texture.width * (anchorX - 0.5) : 0;
  const gridPos = screenToGrid(worldPos.x + widthOffset, worldPos.y + heightOffset);
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
  containers.buildingLayer.children.sort((a, b) => {
    const ay = (a as any)._sortY ?? a.position.y;
    const by = (b as any)._sortY ?? b.position.y;
    return ay - by;
  });
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
        buildingId: preDrag.buildingId,
        originalRow: preDrag.originalRow,
        originalCol: preDrag.originalCol,
        originalSprite: preDrag.originalSprite,
      };

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
      const buildingId = crypto.randomUUID();
      const asset = getAsset(activeDrag.assetKey);
      const texture = Assets.get(asset!.textureKey);
      if (!texture) {
        destroyGhost();
        activeDrag = null;
        cleanupDragListeners();
        return;
      }
      const sprite = new Sprite(texture);
      sprite.label = `building_${activeDrag.assetKey}_${activeDrag.lastRow}_${activeDrag.lastCol}`;
      placeOnGrid(sprite, activeDrag.lastRow, activeDrag.lastCol, activeDrag.assetKey);
      containers.buildingLayer.addChild(sprite);
      markOccupied(activeDrag.lastRow, activeDrag.lastCol, sprite, activeDrag.assetKey, buildingId);
      depthSort();
      bounceAnimation(sprite, pixiApp.ticker);
      persistPlace(buildingId, activeDrag.lastRow, activeDrag.lastCol, activeDrag.assetKey);

      // Inventory tracking: decrement quantity and create placed asset record
      const catalogId = registryKeyToCatalogId(activeDrag.assetKey);
      if (catalogId) {
        const colorVariant = extractHouseColor(activeDrag.assetKey);
        useInventoryStore.getState().placeAsset(catalogId, activeDrag.lastRow, activeDrag.lastCol, colorVariant, buildingId);
      }

      // Population: add housing contribution
      const popDelta = getPopulationContribution(activeDrag.assetKey);
      if (popDelta > 0) {
        const ps = usePlayerStore.getState();
        ps.setPopulation(ps.population + popDelta);
      }

      useBuildStore.getState().pushPlacement({
        type: 'place',
        sprite,
        row: activeDrag.lastRow,
        col: activeDrag.lastCol,
        assetKey: activeDrag.assetKey,
        buildingId,
        catalogAssetId: catalogId ?? undefined,
      });
    } else {
      // Move: reposition the original sprite
      const origSprite = activeDrag.originalSprite!;
      const moveId = activeDrag.buildingId!;
      placeOnGrid(origSprite, activeDrag.lastRow, activeDrag.lastCol, activeDrag.assetKey);
      origSprite.alpha = 1;
      origSprite.visible = true;
      markOccupied(activeDrag.lastRow, activeDrag.lastCol, origSprite, activeDrag.assetKey, moveId);
      depthSort();
      bounceAnimation(origSprite, pixiApp.ticker);
      persistMove(moveId, activeDrag.lastRow, activeDrag.lastCol);

      useBuildStore.getState().pushPlacement({
        type: 'move',
        sprite: origSprite,
        row: activeDrag.lastRow,
        col: activeDrag.lastCol,
        assetKey: activeDrag.assetKey,
        buildingId: moveId,
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
      origSprite.alpha = 1;
      origSprite.visible = true;
      markOccupied(activeDrag.originalRow!, activeDrag.originalCol!, origSprite, activeDrag.assetKey, activeDrag.buildingId!);
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
  row: number; col: number; sprite: Sprite; assetKey: string; buildingId: string;
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
      return { row: r, col: c, sprite: s, assetKey: occupant.assetKey, buildingId: occupant.buildingId };
    }
  }
  return null;
}

function handleBuildingPickup(screenX: number, screenY: number): boolean {
  if (!containers) return false;

  // Delegate to road delete mode if active
  const { selectedRoadType, roadDeleteMode } = useBuildStore.getState();
  if (roadDeleteMode) {
    return handleRoadDeletePointerDown(screenX, screenY);
  }

  // Delegate to road system if a road type is selected
  if (selectedRoadType) {
    return handleRoadPointerDown(screenX, screenY);
  }

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
      markOccupied(pm.row, pm.col, pm.sprite, pm.assetKey, pm.buildingId);
      return false;
    }

    activeDrag = {
      type: 'move',
      assetKey: pm.assetKey,
      ghost,
      valid: false,
      lastRow: -1,
      lastCol: -1,
      buildingId: pm.buildingId,
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
    // Dismiss any building popup
    if (useBuildStore.getState().selectedBuilding) {
      clearHighlight();
      useBuildStore.getState().deselectBuilding();
    }
    // Dismiss any road popup
    if (useBuildStore.getState().selectedRoad) {
      useBuildStore.getState().deselectRoad();
    }

    // Check for road tap (when not in road placement mode)
    const roadHit = findRoadAtScreen(screenX, screenY);
    if (roadHit) {
      roadTapCandidateForSelect = {
        ...roadHit,
        startX: screenX,
        startY: screenY,
      };
      document.addEventListener('pointermove', onRoadSelectTapMove);
      document.addEventListener('pointerup', onRoadSelectTapUp);
      return false; // allow camera pan; tap detected on pointer-up
    }

    return false; // allow camera pan
  }

  // Set up tap candidate for selection — camera handles any dragging
  tapCandidate = {
    ...hit,
    startX: screenX,
    startY: screenY,
  };

  document.addEventListener('pointermove', onTapCandidateMove);
  document.addEventListener('pointerup', onTapCandidateUp);

  return false; // allow camera pan; tap detected on pointer-up
}

// ---------------------------------------------------------------------------
// Road select tap candidate (for non-road-mode)
// ---------------------------------------------------------------------------

let roadTapCandidateForSelect: {
  row: number;
  col: number;
  entry: { sprite: Sprite; roadType: string; tileNum: number; flipX: boolean };
  startX: number;
  startY: number;
} | null = null;

function onRoadSelectTapMove(e: PointerEvent): void {
  if (!roadTapCandidateForSelect) return;
  const dx = e.clientX - roadTapCandidateForSelect.startX;
  const dy = e.clientY - roadTapCandidateForSelect.startY;
  if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
    roadTapCandidateForSelect = null;
    cleanupRoadSelectTapListeners();
  }
}

function onRoadSelectTapUp(): void {
  if (!roadTapCandidateForSelect) {
    cleanupRoadSelectTapListeners();
    return;
  }

  const hit = roadTapCandidateForSelect;
  roadTapCandidateForSelect = null;
  cleanupRoadSelectTapListeners();

  // Dismiss any building popup
  if (useBuildStore.getState().selectedBuilding) {
    clearHighlight();
    useBuildStore.getState().deselectBuilding();
  }

  selectRoadForRemoval(hit.row, hit.col, hit.entry);
}

function cleanupRoadSelectTapListeners(): void {
  document.removeEventListener('pointermove', onRoadSelectTapMove);
  document.removeEventListener('pointerup', onRoadSelectTapUp);
}

// ---------------------------------------------------------------------------
// Delete selected building
// ---------------------------------------------------------------------------

export function deleteSelectedBuilding(): void {
  const { selectedBuilding } = useBuildStore.getState();
  if (!selectedBuilding || !containers) return;

  const occupant = getOccupant(selectedBuilding.row, selectedBuilding.col);
  if (!occupant) return;

  // Clear visual state first, then remove from display (DON'T destroy — needed for undo)
  clearHighlight();
  occupant.sprite.visible = false;
  containers.buildingLayer.removeChild(occupant.sprite);
  markFree(selectedBuilding.row, selectedBuilding.col);
  useBuildStore.getState().deselectBuilding();
  persistDelete(occupant.buildingId);

  // Inventory tracking: return asset to inventory (no coin refund — selling is a future feature)
  const catalogId = registryKeyToCatalogId(occupant.assetKey);
  if (catalogId) {
    useInventoryStore.getState().demolishAsset(occupant.buildingId);
  }

  // Population: subtract housing contribution
  const popDelta = getPopulationContribution(occupant.assetKey);
  if (popDelta > 0) {
    const ps = usePlayerStore.getState();
    ps.setPopulation(Math.max(0, ps.population - popDelta));
  }

  useBuildStore.getState().pushPlacement({
    type: 'delete',
    sprite: occupant.sprite,
    row: selectedBuilding.row,
    col: selectedBuilding.col,
    assetKey: occupant.assetKey,
    buildingId: occupant.buildingId,
    catalogAssetId: catalogId ?? undefined,
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
    buildingId: occupant.buildingId,
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
    persistDelete(entry.buildingId);
    // Undo inventory: return asset to inventory
    if (entry.catalogAssetId) {
      useInventoryStore.getState().demolishAsset(entry.buildingId);
    }
    // Undo population: subtract what was added
    const popDeltaPlace = getPopulationContribution(entry.assetKey);
    if (popDeltaPlace > 0) {
      const ps = usePlayerStore.getState();
      ps.setPopulation(Math.max(0, ps.population - popDeltaPlace));
    }
  } else if (entry.type === 'move') {
    // Move: return sprite to original position
    placeOnGrid(entry.sprite, entry.fromRow!, entry.fromCol!, entry.assetKey);
    markFree(entry.row, entry.col);
    markOccupied(entry.fromRow!, entry.fromCol!, entry.sprite, entry.assetKey, entry.buildingId);
    depthSort();
    persistMove(entry.buildingId, entry.fromRow!, entry.fromCol!);
  } else if (entry.type === 'delete') {
    // Delete: restore sprite to grid
    entry.sprite.visible = true;
    containers!.buildingLayer.addChild(entry.sprite);
    placeOnGrid(entry.sprite, entry.row, entry.col, entry.assetKey);
    markOccupied(entry.row, entry.col, entry.sprite, entry.assetKey, entry.buildingId);
    depthSort();
    if (pixiApp) bounceAnimation(entry.sprite, pixiApp.ticker);
    persistPlace(entry.buildingId, entry.row, entry.col, entry.assetKey);
    // Undo delete: re-place in inventory (no coin deduction — demolish doesn't refund)
    if (entry.catalogAssetId) {
      const colorVariant = extractHouseColor(entry.assetKey);
      useInventoryStore.getState().placeAsset(entry.catalogAssetId, entry.row, entry.col, colorVariant, entry.buildingId);
    }
    // Undo population: add back what was subtracted
    const popDeltaDelete = getPopulationContribution(entry.assetKey);
    if (popDeltaDelete > 0) {
      const ps = usePlayerStore.getState();
      ps.setPopulation(ps.population + popDeltaDelete);
    }
  } else if (entry.type === 'road-place') {
    undoRoadPlace(entry.tiles, entry.neighborChanges);
  } else if (entry.type === 'road-delete') {
    undoRoadDelete(entry.row, entry.col, entry.roadType, entry.tileNum, entry.neighborChanges);
  } else if (entry.type === 'road-batch-delete') {
    undoRoadBatchDelete(entry.tiles, entry.neighborChanges);
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

  // Cancel pending move when build mode transitions off
  let prevBuildMode = useBuildStore.getState().buildMode;
  unsubBuildMode = useBuildStore.subscribe((state) => {
    if (prevBuildMode && !state.buildMode) {
      cancelPendingMove();
    }
    prevBuildMode = state.buildMode;
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
  tapCandidate = null;
  cleanupDragListeners();
  cleanupTapListeners();

  clearHighlight();
  cancelPendingMove();
  lastPopupX = 0;
  lastPopupY = 0;

  roadTapCandidateForSelect = null;
  cleanupRoadSelectTapListeners();

  occupied.clear();
  pixiApp = null;
  containers = null;
}
