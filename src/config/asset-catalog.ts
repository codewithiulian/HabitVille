import rawCatalog from './asset-catalog.gen.json';
import type { CatalogAsset } from '@/types/catalog';

export const ASSET_CATALOG: CatalogAsset[] = rawCatalog as CatalogAsset[];
