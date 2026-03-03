export type GroundType = 'grass';

export interface GridCell {
  row: number;
  col: number;
  buildable: boolean;
  groundType: GroundType;
}

export type Grid = GridCell[][];
