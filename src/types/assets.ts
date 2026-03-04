export type AssetCategory =
  | 'tile'
  | 'road'
  | 'sidewalk'
  | 'building-residential'
  | 'building-commercial'
  | 'building-public'
  | 'restaurant'
  | 'decor'
  | 'plant'
  | 'fence'
  | 'vehicle';

export interface AssetEntry {
  /** Unique identifier — typically the filename stem (e.g. "House_Blue_Type1") */
  key: string;
  /** Path relative to public/ (e.g. "assets/GiantCityBuilder/Houses/Blue/House_Type1.png") */
  textureKey: string;
  /** Human-readable name for UI */
  displayName: string;
  /** Sprite anchor point — (0.5, 0) for ground tiles, (0.5, 1.0) for buildings */
  anchor: { x: number; y: number };
  /** Pixel offset applied after grid positioning — for per-sprite calibration */
  gridOffset: { x: number; y: number };
  /** Logical category for grouping */
  category: AssetCategory;
  /** Grid footprint in tiles — most sprites are 1×1 */
  size: { w: number; h: number };
}
