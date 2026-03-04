import { Assets, Container, Sprite, Texture } from 'pixi.js';
import {
  GRID_SIZE,
  BORDER_WIDTH,
  GRASS_TILE_PATH,
} from '../config/grid-constants';
import { gridToScreen } from './iso-utils';
import type { Grid, GridCell } from '../types/grid';

let grid: Grid | null = null;

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

      rowCells.push({ row, col, buildable, groundType: 'grass' });
    }
    cells.push(rowCells);
  }

  grid = cells;
  return cells;
}

export async function renderGrid(groundLayer: Container): Promise<void> {
  const texture: Texture = Assets.get(GRASS_TILE_PATH);

  // Collect all cells and sort by (row + col) ascending for depth ordering
  const allCells: GridCell[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      allCells.push(grid![row][col]);
    }
  }
  allCells.sort((a, b) => (a.row + a.col) - (b.row + b.col));

  for (const cell of allCells) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0);

    const pos = gridToScreen(cell.row, cell.col);
    sprite.position.set(pos.x, pos.y);

    sprite.label = `ground_${cell.row}_${cell.col}`;
    groundLayer.addChild(sprite);
  }
}

export function getGrid(): Grid | null {
  return grid;
}

export function destroyGrid(): void {
  grid = null;
}
