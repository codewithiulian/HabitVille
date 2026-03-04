export type GroundType = 'grass' | 'dirt';

export interface GridCell {
  row: number;
  col: number;
  buildable: boolean;
  groundType: GroundType;
}

export type Grid = GridCell[][];
