import { TILE_WIDTH, TILE_HEIGHT } from '../config/grid-constants';

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export function gridToScreen(row: number, col: number): ScreenPosition {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

export function screenToGrid(x: number, y: number): GridPosition {
  return {
    row: Math.floor(
      (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2,
    ),
    col: Math.floor(
      (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2,
    ),
  };
}
