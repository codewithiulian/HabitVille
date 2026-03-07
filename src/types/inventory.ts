export interface InventoryItem {
  id: string;
  assetId: string;
  colorVariant?: string | null;
  quantity: number;
  totalPurchased: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

export interface PlacedAsset {
  id: string;
  assetId: string;
  colorVariant?: string | null;
  gridX: number;
  gridY: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
