export interface CatalogAsset {
  assetId: string;
  category: string;
  name: string;
  spriteKey: string;
  unlockLevel: number;
  price: number;
  colorVariants?: number;
}
