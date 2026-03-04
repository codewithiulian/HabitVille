import { Assets, Container, Sprite, Texture } from 'pixi.js';
import {
  GRID_SIZE,
  BORDER_WIDTH,
  GRASS_TILE_PATH,
  DIRT_TILE_PATH,
} from '../config/grid-constants';
import { gridToScreen } from './iso-utils';
import type { Grid, GridCell, GroundType } from '../types/grid';

let grid: Grid | null = null;

// ---------------------------------------------------------------------------
// Determine ground type — hard edge: outer 2 rows dirt, inner grass
// ---------------------------------------------------------------------------
function determineGroundType(row: number, col: number): GroundType {
  if (
    row < BORDER_WIDTH ||
    row >= GRID_SIZE - BORDER_WIDTH ||
    col < BORDER_WIDTH ||
    col >= GRID_SIZE - BORDER_WIDTH
  ) {
    return 'dirt';
  }
  return 'grass';
}

// ---------------------------------------------------------------------------
// Grid creation
// ---------------------------------------------------------------------------
export function createGrid(): Grid {
  const cells: Grid = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    const rowCells: GridCell[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const buildable =
        row >= BORDER_WIDTH &&
        row < GRID_SIZE - BORDER_WIDTH &&
        col >= BORDER_WIDTH &&
        col < GRID_SIZE - BORDER_WIDTH;

      const groundType = determineGroundType(row, col);
      rowCells.push({ row, col, buildable, groundType });
    }
    cells.push(rowCells);
  }

  grid = cells;
  return cells;
}

// ---------------------------------------------------------------------------
// Grid rendering
// ---------------------------------------------------------------------------
export async function renderGrid(
  groundLayer: Container,
  decorLayer: Container,
): Promise<void> {
  const grassTex: Texture = Assets.get(GRASS_TILE_PATH);
  const dirtTex: Texture = Assets.get(DIRT_TILE_PATH);

  // Collect all cells and sort by (row + col) ascending for depth ordering
  const allCells: GridCell[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      allCells.push(grid![row][col]);
    }
  }
  allCells.sort((a, b) => a.row + a.col - (b.row + b.col));

  for (const cell of allCells) {
    const texture = cell.groundType === 'dirt' ? dirtTex : grassTex;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0);

    const pos = gridToScreen(cell.row, cell.col);
    sprite.position.set(pos.x, pos.y);
    sprite.label = `ground_${cell.row}_${cell.col}`;
    groundLayer.addChild(sprite);
  }

}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getGrid(): Grid | null {
  return grid;
}

export function destroyGrid(): void {
  grid = null;
}
