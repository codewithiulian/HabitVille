# HabitVille — Technical Extraction for Game Mechanic Redesign

A complete technical snapshot of how assets are unlocked, purchased, and placed — plus all supporting systems (XP, coins, leveling, habits, map state).

---

## 1. Asset Registry / Catalog

### Files Involved

- `src/types/assets.ts` — AssetEntry interface, AssetCategory type
- `src/types/catalog.ts` — CatalogAsset interface
- `src/types/inventory.ts` — InventoryItem, PlacedAsset interfaces
- `src/engine/asset-registry.ts` — Runtime registry (Map<string, AssetEntry>), texture/anchor definitions
- `src/config/asset-catalog.gen.json` — Auto-generated master catalog (539+ entries, 4,469 lines)
- `src/config/asset-catalog.ts` — TypeScript wrapper that exports the JSON
- `src/config/shop-categories.ts` — Shop tab definitions
- `src/lib/catalog-helpers.ts` — Lookup/mapping functions between catalog and registry
- `scripts/gen-asset-catalog.js` — Node script that generates asset-catalog.gen.json from filesystem + config.yml
- `config.yml` (lines 281–390) — Category definitions, price ranges, unlock level ranges

### Data Structures

```typescript
// src/types/assets.ts
export type AssetCategory =
  | "tile"
  | "road"
  | "sidewalk"
  | "building-residential"
  | "building-commercial"
  | "building-public"
  | "restaurant"
  | "decor"
  | "plant"
  | "fence"
  | "vehicle";

export interface AssetEntry {
  key: string; // e.g. "House_Blue_Type1"
  textureKey: string; // e.g. "assets/GiantCityBuilder/Houses/Blue/House_Type1.png"
  displayName: string;
  anchor: { x: number; y: number }; // (0.5, 0) ground, (0.5, 1) upright
  gridOffset: { x: number; y: number };
  category: AssetCategory;
  size: { w: number; h: number }; // Grid footprint (all 1×1 today)
}

// src/types/catalog.ts
export interface CatalogAsset {
  assetId: string; // e.g. "houses_House_Type1"
  category: string; // "houses", "apartments", etc.
  name: string;
  spriteKey: string; // Path to texture
  unlockLevel: number;
  price: number; // 0 for roads
  colorVariants?: number; // Houses only: 8
}

// src/types/inventory.ts
export interface InventoryItem {
  id: string; // UUID
  assetId: string; // Catalog assetId
  colorVariant?: string | null;
  quantity: number; // Available to place
  totalPurchased: number; // Lifetime count
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}

export interface PlacedAsset {
  id: string; // UUID
  assetId: string;
  colorVariant?: string | null;
  gridX: number;
  gridY: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
```

### Key Functions

```typescript
// src/engine/asset-registry.ts
export const ASSET_REGISTRY: ReadonlyMap<string, AssetEntry> = buildRegistry();
export function getAsset(key: string): AssetEntry | undefined;
export function getAssetsByCategory(category: AssetCategory): AssetEntry[];
export function getAllAssetKeys(): string[];
export function getVehicleTexturePaths(
  catalogAssetId: string,
): { front: string; back: string } | null;

// src/config/asset-catalog.ts
export const ASSET_CATALOG: CatalogAsset[] = rawCatalog as CatalogAsset[];

// src/lib/catalog-helpers.ts
export function getCatalogAsset(assetId: string): CatalogAsset | undefined;
export function getCatalogAssetsByCategory(category: string): CatalogAsset[];
export function isHouseAsset(asset: CatalogAsset): boolean;
export function catalogToRegistryKey(
  catalogAssetId: string,
  color?: string,
): string;
export function registryKeyToCatalogId(registryKey: string): string | null;
export function extractHouseColor(registryKey: string): string | undefined;
export function houseSpriteKey(houseType: string, color: string): string;

// src/engine/asset-loader.ts
export async function loadEssentialAssets(
  savedAssetKeys: string[],
  onProgress?: (progress: number) => void,
): Promise<void>;
export async function loadBuildCategory(
  buildCategory: BuildCategory,
): Promise<void>;
```

### Config / Constants

```typescript
// src/config/shop-categories.ts
export const SHOP_CATEGORIES = [
  { id: "houses", label: "Houses" },
  { id: "apartments", label: "Apartments" },
  { id: "public_buildings", label: "Public" },
  { id: "restaurants", label: "Restaurants" },
  { id: "shopping", label: "Shopping" },
  { id: "vehicles", label: "Vehicles" },
  { id: "plants", label: "Plants" },
  { id: "decorations", label: "Decorations" },
  { id: "fences", label: "Fences" },
] as const;

// src/stores/build-store.ts — maps build tabs to engine categories
const BUILD_CATEGORY_ASSETS: Record<BuildCategory, AssetCategory[]> = {
  roads: ["road", "sidewalk"],
  residential: ["building-residential"],
  commercial: ["building-commercial", "restaurant"],
  public: ["building-public"],
  decorations: ["decor", "plant", "fence", "vehicle"],
};
```

```yaml
# config.yml (lines 281-390)
assets:
  categories:
    - id: houses
      total_types: 20
      color_variants_per_type: 8
      price_range: { min: 100, max: 300 }
      unlock_levels: { start: 1, end: 60 }
    - id: apartments
      total_types: 54
      price_range: { min: 300, max: 800 }
      unlock_levels: { start: 20, end: 150 }
    - id: public_buildings
      total_types: 82
      price_range: { min: 300, max: 600 }
      unlock_levels: { start: 15, end: 130 }
    - id: restaurants
      total_types: 32
      price_range: { min: 200, max: 500 }
      unlock_levels: { start: 10, end: 100 }
    - id: shopping
      total_types: 68
      price_range: { min: 200, max: 500 }
      unlock_levels: { start: 10, end: 120 }
    - id: vehicles
      total_types: 102
      price_range: { min: 50, max: 150 }
      unlock_levels: { start: 3, end: 140 }
    - id: plants
      total_types: 82
      price_range: { min: 10, max: 30 }
      unlock_levels: { start: 1, end: 80 }
    - id: decorations
      total_types: 140
      price_range: { min: 10, max: 30 }
      unlock_levels: { start: 1, end: 100 }
    - id: fences
      total_types: 33
      price_range: { min: 10, max: 20 }
      unlock_levels: { start: 1, end: 50 }
    - id: roads
      total_types: 1
      price: 0
      unlock_level: 1
```

### Notes

- Two-tier architecture: `AssetEntry` (engine/rendering) vs `CatalogAsset` (shop/economy)
- `asset-catalog.gen.json` is auto-generated by `scripts/gen-asset-catalog.js` scanning `public/assets/GiantCityBuilder/` filesystem
- Houses are 20 base types with `colorVariants: 8` field (not 160 separate catalog entries)
- Vehicles have `_Front` and `_Back` texture variants
- Asset loading is lazy: only grass/dirt + saved buildings at startup; categories load on-demand when toolbar tab is tapped (batch of 20 textures at a time)
- Anchor conventions: `{x:0.5, y:0}` for ground tiles, `{x:0.5, y:1}` for upright buildings
- Total distinct catalog asset types: ~539+ (excluding house color variants)

---

## 2. XP and Leveling System

### Files Involved

- `config.yml` (lines 88–92, 117–181) — Base XP values and level tier table
- `src/config/game-config.ts` — TypeScript wrapper for config.yml
- `src/lib/leveling-engine.ts` — XP-to-level conversion, level-up detection
- `src/lib/economy-engine.ts` — Reward calculation with bonuses
- `src/stores/player-store.ts` — XP/level state management and persistence
- `src/types/player.ts` — PlayerProfile interface

### Data Structures

```typescript
// src/types/player.ts
export interface PlayerProfile {
  id: string;
  totalXP: number;
  currentCoins: number;
  totalCoins: number;
  spentCoins: number;
  level: number;
  totalPoints: number; // Mirror of totalXP
  population: number;
  firstUseDate: string; // ISO — used for first-week boost
  dontShowCheckInToday?: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
```

### Key Functions

```typescript
// src/lib/leveling-engine.ts
export function getLevelFromXP(totalXP: number): number
export function getXPForLevel(level: number): number          // Cumulative XP needed
export function getXPProgressInCurrentLevel(totalXP: number): { current: number; required: number; percentage: number }
export function detectLevelUps(oldXP: number, newXP: number, catalog: CatalogAsset[]): LevelUpResult
// LevelUpResult = { levelsGained: number[], newLevel: number, unlockedAssets: CatalogAsset[] }

// src/lib/economy-engine.ts
export function calculateBaseReward(difficulty: HabitDifficulty): Reward
export function calculateCheckInReward(difficulty, options: { surpriseBonus, firstWeekActive, doubleXPActive }): CheckInRewardResult
export function rollSurpriseBonus(): boolean
export function calculateSurpriseBonus(baseReward: Reward): Reward
export function applyFirstWeekBoost(taskXP: number): number
export function applyDoubleXPEvent(taskXP: number): number

// src/stores/player-store.ts
addXP: (amount: number) => void   // Recalculates level, triggers level-ups, queues rewards, persists
```

### Config / Constants

```yaml
# config.yml — Base XP per task
xp:
  per_task:
    easy: 10
    medium: 20
    hard: 30

# Level tiers
levels:
  max_unlock_level: 150
  uncapped_leveling: true
  tiers:
    - { from: 1, to: 5, xp_required: 100 } # 500 cumulative
    - { from: 6, to: 10, xp_required: 150 } # 1,250 cumulative
    - { from: 11, to: 20, xp_required: 250 } # 3,750 cumulative
    - { from: 21, to: 30, xp_required: 400 } # 7,750 cumulative
    - { from: 31, to: 50, xp_required: 600 } # 19,750 cumulative
    - { from: 51, to: 75, xp_required: 800 } # 39,750 cumulative
    - { from: 76, to: 100, xp_required: 1000 } # 64,750 cumulative
    - { from: 101, to: 125, xp_required: 1200 } # 94,750 cumulative
    - { from: 126, to: 150, xp_required: 1500 } # 132,250 cumulative
    # 151+: continues at 1500/level (uncapped)

# Bonuses affecting XP
bonuses:
  first_week_boost:
    enabled: true
    duration_days: 7
    xp_multiplier: 2.0 # Base per-task XP only
  random_xp_events:
    enabled: true
    average_per_week: 1.5
    xp_multiplier: 2.0
    applies_to: "per_task_xp" # XP only, not coins
  random_surprise:
    chance: 0.20
    multiplier: 1.0 # 100% of base as bonus (XP + coins)
  daily_perfect:
    xp: 50
    coins: 30
```

### Notes

- XP is earned per-task via difficulty tier, modified by active bonuses
- Level is always derived from `totalXP` via the tier table walk — no separate level counter
- `addXP()` in player-store detects level-ups, grants free assets for each unlocked CatalogAsset, marks them "NEW" in shop, and queues a `level-up` reward animation
- During check-in sessions, `deferLevelUps = true` suppresses level-up popups until session end
- Target: ~1 year of near-perfect consistency to reach level 150 (132,250 XP)
- Bonus stacking order: base → first-week boost → double-XP event → surprise bonus (additive)

---

## 3. Unlock Mechanics

### Files Involved

- `src/components/ShopAssetCard.tsx` — Unlock state determination and UI rendering
- `src/stores/player-store.ts` — Level-up detection triggers free asset grants
- `src/stores/inventory-store.ts` — `grantFreeAsset()` for level-up rewards
- `src/stores/shop-store.ts` — "NEW" badge tracking via `newlyUnlockedIds`

### Data Structures

```typescript
// src/components/ShopAssetCard.tsx
type CardState =
  | "locked"
  | "affordable"
  | "cant-afford"
  | "owned-affordable"
  | "owned-cant-afford";
```

### Key Functions

```typescript
// src/components/ShopAssetCard.tsx (lines 22-28)
function getCardState(asset: CatalogAsset, playerLevel: number, coins: number, ownedQty: number): CardState {
  if (asset.unlockLevel > playerLevel) return 'locked';
  if (ownedQty > 0) {
    return coins >= asset.price ? 'owned-affordable' : 'owned-cant-afford';
  }
  return coins >= asset.price ? 'affordable' : 'cant-afford';
}

// src/stores/inventory-store.ts (lines 160-162)
grantFreeAsset: (assetId, colorVariant) => {
  get().purchaseAsset(assetId, colorVariant);  // Adds to inventory without coin cost
}

// src/stores/shop-store.ts
addNewlyUnlocked: (assetIds: string[]) => void   // Adds to Set for "NEW" badge
markSeen: (assetId: string) => void               // Removes "NEW" badge
```

### Notes

- **Purely level-based**: No other unlock conditions exist
- **No dedicated unlock state table**: Unlock is computed on-the-fly by comparing player level to asset's `unlockLevel`
- First copy of each asset is **free** when unlocked (granted via `grantFreeAsset()` during level-up)
- "NEW" badge in shop is tracked in `useShopStore.newlyUnlockedIds: Set<string>`, cleared when user views/purchases
- Locked UI: grayscale image filter + lock icon overlay + "Lvl {unlockLevel}" text + disabled button + toast on tap
- Unlocked + owned: shows "x{quantity}" badge in top-left
- Unlocked + new: shows "NEW" badge in orange/gold gradient top-right

---

## 4. Coin Economy

### Files Involved

- `config.yml` (lines 101–106, 197–203) — Base coin values, daily perfect bonus
- `src/lib/economy-engine.ts` — Coin reward calculation
- `src/stores/player-store.ts` — `addCoins()`, `spendCoins()`
- `src/types/player.ts` — Coin fields in PlayerProfile

### Data Structures

```typescript
// src/types/player.ts (coin-related fields)
export interface PlayerProfile {
  currentCoins: number; // Active spendable balance
  totalCoins: number; // Lifetime earned
  spentCoins: number; // Lifetime spent
}
```

### Key Functions

```typescript
// src/stores/player-store.ts
addCoins: (amount: number) => void      // Increments balance, persists totalCoins + currentCoins
spendCoins: (amount: number) => boolean // Returns false if insufficient; persists currentCoins + spentCoins
```

### Config / Constants

```yaml
# config.yml
coins:
  per_task:
    easy: 5
    medium: 10
    hard: 20

bonuses:
  daily_perfect:
    coins: 30
  random_surprise:
    chance: 0.20
    multiplier: 1.0 # Doubles base coins too
  # first_week_boost and random_xp_events do NOT multiply coins
```

### Notes

- Coins earned from: habit completions (by difficulty), daily perfect bonus (30), surprise bonus (20% chance, 100% of base)
- First-week boost and random 2x XP events do **NOT** affect coins
- Weekly consistency bonus multiplier applies to base coin earnings at week end
- Coin sinks: asset purchases only. No maintenance, taxes, or decay
- Demolish = full coin refund (asset returns to inventory, coin cost recovered)
- Vehicle sell = full price refund
- `spendCoins()` returns `false` if insufficient funds — caller shows toast
- Purchase confirmation dialog triggered at `GAME_CONFIG.shop.purchase_confirm_threshold` (300 coins)

---

## 5. Purchase Flow

### Files Involved

- `src/components/ShopAssetCard.tsx` — Purchase trigger for non-house assets
- `src/components/ShopDetailSheet.tsx` — Purchase trigger for houses (with color selection)
- `src/components/PurchaseConfirmDialog.tsx` — Confirmation modal for expensive assets
- `src/stores/player-store.ts` — `spendCoins()`
- `src/stores/inventory-store.ts` — `purchaseAsset()`
- `src/stores/car-store.ts` — `purchaseCar()` for vehicles

### Key Functions

```typescript
// ShopAssetCard.tsx (lines 82-93) — Standard purchase
const executePurchase = useCallback(() => {
  const success = usePlayerStore.getState().spendCoins(asset.price);
  if (!success) {
    useBuildStore.getState().showToast("Not enough coins!");
    return;
  }
  useInventoryStore.getState().purchaseAsset(asset.assetId);
  useBuildStore.getState().showToast(`Purchased ${asset.name}!`);
  if (isNew) useShopStore.getState().markSeen(asset.assetId);
}, [asset, isNew]);

// ShopDetailSheet.tsx (lines 24-33) — House purchase with color
const executePurchase = useCallback(() => {
  if (!detailAsset) return;
  const success = usePlayerStore.getState().spendCoins(detailAsset.price);
  if (!success) {
    /* toast */ return;
  }
  useInventoryStore.getState().purchaseAsset(detailAsset.assetId, previewColor);
  useBuildStore.getState().showToast(`Purchased ${detailAsset.name}!`);
}, [detailAsset, previewColor]);

// ShopAssetCard.tsx (lines 47-66) — Vehicle purchase
const executeVehiclePurchase = useCallback(() => {
  const success = usePlayerStore.getState().spendCoins(asset.price);
  if (!success) {
    /* toast */ return;
  }
  if (getAllRoadKeys().length === 0) {
    usePlayerStore.getState().addCoins(asset.price); // Refund!
    useBuildStore.getState().showToast("Build some roads first!");
    return;
  }
  const recordId = useCarStore.getState().purchaseCar(asset.assetId);
  spawnSingleCar(asset.assetId, recordId);
  useBuildStore.getState().showToast(`${asset.name} deployed to roads!`);
}, [asset, isNew]);

// inventory-store.ts (lines 38-73) — Inventory update
purchaseAsset: (assetId, colorVariant) => {
  const existing = state.ownedAssets.find(
    (a) =>
      a.assetId === assetId &&
      (a.colorVariant ?? null) === (colorVariant ?? null),
  );
  if (existing) {
    // Increment quantity + totalPurchased
  } else {
    // Create new InventoryItem { id: UUID, quantity: 1, totalPurchased: 1 }
  }
  // Dexie fire-and-forget
};
```

### Notes

- Validations: (1) unlock level check via `getCardState()`, (2) coin balance via `spendCoins()`, (3) vehicles require at least one road
- State changes: coins deducted first, then inventory incremented — no transaction wrapping
- Each `(assetId, colorVariant)` pair is one `InventoryItem` row. "3 blue houses" = `{ assetId: "houses_House_Type1", colorVariant: "Blue", quantity: 3 }`
- `totalPurchased` tracks lifetime count (never decrements), `quantity` tracks available-to-place count
- Vehicles have separate flow: `useCarStore.purchaseCar()` + `spawnSingleCar()`, not stored in inventory

---

## 6. Placement System

### Files Involved

- `src/engine/build-system.ts` — Core placement logic, occupancy tracking, drag handling
- `src/engine/place-on-grid.ts` — Sprite positioning on isometric grid
- `src/engine/iso-utils.ts` — Grid-to-screen coordinate conversion
- `src/engine/road-system.ts` — Road placement and auto-tiling
- `src/engine/road-tiles.ts` — Bitmask-based road tile selection
- `src/engine/sidewalk-system.ts` — Auto-generated sidewalks adjacent to roads
- `src/stores/inventory-store.ts` — `placeAsset()`, `demolishAsset()`
- `src/db/city-persistence.ts` — IndexedDB persistence for buildings/roads/sidewalks
- `src/config/grid-constants.ts` — Grid dimensions

### Data Structures

```typescript
// src/engine/build-system.ts — In-memory occupancy
const occupied = new Map<
  string,
  { sprite: Sprite; assetKey: string; buildingId: string }
>();

// src/engine/road-system.ts — In-memory road state
interface RoadEntry {
  sprite: Sprite;
  roadType: string; // "Road" | "DirtRoad" | "GrassRoad"
  tileNum: number; // 1-9 (auto-tile variant)
  flipX: boolean;
}
const roadMap = new Map<string, RoadEntry>(); // Key: "row,col"

// src/db/db.ts — Persisted building
export interface CityBuilding {
  id: string; // UUID (same as buildingId)
  row: number;
  col: number;
  assetKey: string; // Registry key (e.g. "House_Blue_Type1")
  placedAt: Date;
}
```

### Key Functions

```typescript
// src/engine/iso-utils.ts
export function gridToScreen(row: number, col: number): ScreenPosition {
  return {
    x: (col - row) * (TILE_WIDTH / 2), // TILE_WIDTH=512 -> 256
    y: (col + row) * (TILE_HEIGHT / 2), // TILE_HEIGHT=292 -> 146
  };
}
export function screenToGrid(x: number, y: number): GridPosition;

// src/engine/build-system.ts
export function isOccupied(row: number, col: number): boolean;
export function markOccupied(
  row: number,
  col: number,
  sprite,
  assetKey,
  buildingId,
): void;
export function markFree(row: number, col: number): void;
function isTileValid(row, col): boolean; // Bounds + buildable + not occupied + not road
function depthSort(): void; // Sort buildingLayer children by screen Y

// src/engine/place-on-grid.ts
export function placeOnGrid(
  sprite: Sprite,
  row: number,
  col: number,
  assetKey: string,
): void;

// src/db/city-persistence.ts
export function persistPlace(id, row, col, assetKey): void;
export function persistMove(id, row, col): void;
export function persistDelete(id): void;
export function persistRoad(row, col, roadType, tileNum): void;
export function persistRoadBatch(roads): void;
export function persistCamera(state: CameraState): void; // Debounced 500ms

// src/engine/road-tiles.ts
export function computeBitmask(row, col, roadType, getRoadType): number; // N=1, E=2, S=4, W=8
export function bitmaskToTile(mask: number): number;
export function bitmaskToFlipX(mask: number): boolean;
```

### Config / Constants

```typescript
// src/config/grid-constants.ts
export const GRID_SIZE = 30;
export const TILE_WIDTH = 512;
export const TILE_HEIGHT = 292;
export const BORDER_WIDTH = 2;
export const BUILDABLE_SIZE = 26; // Inner buildable area
```

### Notes

- **Placement flow (10 steps)**: Create sprite → position on grid → add to buildingLayer → mark occupied → depth sort → bounce animation → persist to `db.city` → update inventory (decrement quantity, create PlacedAsset) → update population → push to undo history
- **Validation**: grid bounds → buildable (inner 26×26) → not occupied → not a road
- **Dual persistence**: `db.city` stores `(id, row, col, assetKey)` for engine restore; `db.placedAssets` stores `(id, assetId, gridX, gridY)` for inventory tracking
- **Road auto-tiling**: Bitmask-based (N=1, E=2, S=4, W=8) → 16 possible tile variants. Placing/deleting a road recalculates itself + 4 cardinal neighbors
- **Sidewalks**: Auto-generated on non-road tiles adjacent to roads via `syncSidewalksForArea()`
- **Depth sort**: `children.sort((a, b) => a.position.y - b.position.y)` — lower screen Y renders behind
- **Demolish**: Returns asset to inventory (`quantity + 1`), removes from `db.city` + `db.placedAssets`, full coin refund

---

## 7. Map / World State

### Files Involved

- `src/config/grid-constants.ts` — Grid dimensions
- `src/types/grid.ts` — Grid/cell types
- `src/engine/grid.ts` — Grid creation and rendering
- `src/engine/setup-stage.ts` — PixiJS container hierarchy
- `src/db/db.ts` — All Dexie table schemas
- `src/db/city-persistence.ts` — Save functions
- `src/db/city-restore.ts` — Load/restore functions

### Data Structures

```typescript
// src/types/grid.ts
export type GroundType = "grass" | "dirt";

export interface GridCell {
  row: number;
  col: number;
  buildable: boolean;
  groundType: GroundType;
}

export type Grid = GridCell[][];

// src/engine/setup-stage.ts
export interface SceneContainers {
  gameWorld: Container; // Camera-transformed root
  groundLayer: Container; // Grass/dirt tiles
  borderLayer: Container; // Border visualization
  roadLayer: Container; // Auto-tiled roads
  buildingLayer: Container; // User-placed buildings
  entityLayer: Container; // NPCs, vehicles
  decorLayer: Container; // Trees, fences, etc.
  hudLayer: Container; // Fixed UI (not camera-transformed)
}

// src/db/db.ts — Camera/game state
export interface GameStateRow {
  id: string; // Always "current"
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  lastSaved: Date;
}

// src/db/db.ts — Persisted world entities
export interface CityRoad {
  id: string; // "row,col"
  row: number;
  col: number;
  roadType: string; // 'Road' | 'DirtRoad' | 'GrassRoad'
  tileNum: number; // 0-15 (bitmask-derived auto-tile variant)
  placedAt: Date;
}

export interface CitySidewalk {
  id: string; // "row,col"
  row: number;
  col: number;
  tileNum: number;
  parentRoadId: string;
  placedAt: Date;
}

export interface CityAccessory {
  id: string; // "row,col"
  row: number;
  col: number;
  assetKey: string;
  parentSidewalkId: string;
  placedAt: Date;
}

export interface CityCar {
  id: string; // UUID
  assetId: string; // e.g. "vehicles_CarType1_Blue"
  createdAt: string;
  updatedAt: string;
}
```

### Key Functions

```typescript
// src/engine/grid.ts
export function createGrid(): Grid; // 30x30, border=dirt, inner=grass, border not buildable
export async function renderGrid(groundLayer, decorLayer): Promise<void>; // Depth-sorted tile sprites

// src/db/city-restore.ts
export async function restoreCity(containers: SceneContainers): Promise<void>;
export async function restoreRoads(): Promise<void>;
export async function restoreSidewalks(): Promise<void>;
export async function restoreAccessories(): Promise<void>;
export async function restoreCars(): Promise<CityCar[]>;
export async function restoreCameraState(): Promise<GameStateRow | undefined>;
```

### Notes

- 30×30 grid, outer 2-tile border is non-buildable dirt, inner 26×26 is buildable grass
- Ground tiles rendered depth-sorted by `(row + col)` ascending
- Container hierarchy: `stage > gameWorld > {groundLayer, borderLayer, roadLayer, buildingLayer, entityLayer, decorLayer}` + `hudLayer` (fixed)
- Camera transforms only `gameWorld`; `hudLayer` stays fixed
- No single "save file" format — world state is spread across 7 IndexedDB tables
- Camera state persisted with 500ms debounce to `db.gameState` (key: "current")
- Config mentions future expansion: 50×50 grid at level 50 (`config.yml: city.expansion`)

---

## 8. Game State Management

### Files Involved

- `src/stores/game-store.ts` — UI modes, reward queue, screen navigation
- `src/stores/player-store.ts` — XP, coins, level, population
- `src/stores/build-store.ts` — Build mode, asset selection, undo history
- `src/stores/inventory-store.ts` — Asset ownership, placement tracking
- `src/stores/habit-store.ts` — Habits, check-ins
- `src/stores/shop-store.ts` — Shop UI state, newly unlocked badges
- `src/stores/car-store.ts` — Vehicle ownership
- `src/stores/theme-store.ts` — Light/dark mode
- `src/db/db.ts` — All Dexie table definitions

### Data Structures

**All Zustand Stores:**

```typescript
// game-store.ts
interface GameState {
  currentMode: "view" | "build" | "check-in";
  activeScreen:
    | "city"
    | "check-in"
    | "stats"
    | "shop"
    | "settings"
    | "weekly-report";
  pendingRewards: PendingReward[]; // Queue of animation payloads
  deferLevelUps: boolean;
  doubleXPEventActive: boolean;
  firstWeekBoostActive: boolean;
  showOnboarding: boolean;
  showHabitList: boolean;
  weeklyReportSnapshot: WeeklySnapshot | null;
  tutorialStep: number | null;
  initialized: boolean;
}

// player-store.ts
interface PlayerState {
  xp: number;
  coins: number;
  level: number;
  totalPoints: number;
  population: number;
  firstUseDate: string | null;
  dontShowCheckInToday: string | null;
  initialized: boolean;
}

// build-store.ts
interface BuildState {
  buildMode: boolean;
  selectedCategory: BuildCategory | null;
  selectedAsset: string | null;
  selectedRoadType: RoadType | null;
  placementHistory: PlacementEntry[]; // Undo stack
  toastMessage: string | null;
  selectedBuilding: SelectedBuildingInfo | null;
  popupScreenPos: { x: number; y: number } | null;
  selectedRoad: SelectedRoadInfo | null;
  roadPopupScreenPos: { x: number; y: number } | null;
  categoryLoadState: Record<BuildCategory, "idle" | "loading" | "loaded">;
  selectedColorVariant: string | null;
  roadDeleteMode: boolean;
  roadDeleteSelection: Set<string>;
}

// inventory-store.ts
interface InventoryState {
  ownedAssets: InventoryItem[];
  placedAssets: PlacedAsset[];
  initialized: boolean;
}

// habit-store.ts
interface HabitState {
  habits: Habit[];
  todayCheckIns: CheckIn[];
  initialized: boolean;
}

// shop-store.ts
interface ShopState {
  selectedCategory: ShopCategoryId;
  detailAsset: CatalogAsset | null;
  previewColor: string;
  newlyUnlockedIds: Set<string>;
}

// car-store.ts
interface CarState {
  ownedCars: CityCar[];
  initialized: boolean;
}

// theme-store.ts
interface ThemeState {
  mode: "light" | "dark" | "system";
  resolved: "light" | "dark";
}
```

**All Dexie Tables (version 7):**

| Table             | Type           | Key              | Indexes                  |
| ----------------- | -------------- | ---------------- | ------------------------ |
| `city`            | CityBuilding   | `id` (UUID)      | —                        |
| `roads`           | CityRoad       | `id` ("row,col") | —                        |
| `sidewalks`       | CitySidewalk   | `id` ("row,col") | —                        |
| `accessories`     | CityAccessory  | `id` ("row,col") | —                        |
| `gameState`       | GameStateRow   | `id` ("current") | —                        |
| `cars`            | CityCar        | `id` (UUID)      | `assetId`                |
| `habits`          | Habit          | `id` (UUID)      | `archived`               |
| `checkIns`        | CheckIn        | `id` (UUID)      | `[habitId+date]`, `date` |
| `playerProfile`   | PlayerProfile  | `id` (UUID)      | —                        |
| `inventory`       | InventoryItem  | `id` (UUID)      | `assetId`                |
| `placedAssets`    | PlacedAsset    | `id` (UUID)      | `assetId`                |
| `weeklySnapshots` | WeeklySnapshot | `id` (UUID)      | `weekStart`              |

### Notes

- Zustand is the **only bridge** between PixiJS engine and React UI
- PixiJS writes via `store.getState()` / `store.subscribe()`, React reads via hooks
- In-memory state is source of truth; IndexedDB is durable backup
- All DB writes are fire-and-forget (`.catch(() => {})`)
- All Dexie record IDs are UUIDs (except roads/sidewalks/accessories which use "row,col")
- All timestamps are ISO strings
- Player-store uses lazy dynamic imports for inventory/shop/game stores to avoid circular dependencies
- PendingReward types: `'level-up' | 'asset-unlock' | 'surprise-bonus' | 'weekly-bonus' | 'streak-milestone' | 'daily-perfect'`

---

## 9. Shop / Store UI

### Files Involved

- `src/components/ShopScreen.tsx` — Full-screen shop modal
- `src/components/ShopAssetCard.tsx` — Individual asset card (locked/affordable/owned states)
- `src/components/ShopDetailSheet.tsx` — Bottom sheet for house color selection
- `src/components/BuildToolbar.tsx` — Bottom build toolbar showing owned assets
- `src/components/PurchaseConfirmDialog.tsx` — Confirmation for expensive purchases (>=300 coins)

### Key Functions

```typescript
// ShopScreen.tsx (lines 22-25) — Catalog reading
const assets = useMemo(() => {
  const list = getCatalogAssetsByCategory(selectedCategory);
  return list.sort(
    (a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price,
  );
}, [selectedCategory]);

// ShopScreen.tsx (lines 18-20) — State reading
const coins = usePlayerStore((s) => s.coins);
const level = usePlayerStore((s) => s.level);
const xp = usePlayerStore((s) => s.xp);

// ShopAssetCard.tsx (lines 22-28) — State determination
function getCardState(asset, playerLevel, coins, ownedQty): CardState;
```

### Notes

- **Shop Screen**: Fixed overlay at `zIndex: 150`, 3-column grid layout, header shows level badge + coin balance + XP progress bar
- **Build Toolbar**: Fixed bottom bar at `zIndex: 100`, shows owned inventory items with quantities. Roads tab shows unlimited free tiles; other tabs show purchased assets
- **Purchase flow**: Tap card → if locked: toast; if house: open detail sheet; if vehicle: vehicle flow; if price >= 300: confirmation dialog; else: execute immediately
- **House color selection**: ShopDetailSheet shows large preview + 8 color swatches (`GAME_CONFIG.shop.house_colors: ['Blue', 'Brown', 'Green', 'Grey', 'Pink', 'Red', 'White', 'Yellow']`)
- **Build toolbar → canvas**: Select category → see owned inventory → tap asset → `selectAsset(registryKey)` → drag to canvas → `startToolbarDrag()` → drop → full placement flow

---

## 10. Habit → Reward Pipeline

### Files Involved

- `src/components/DailyView.tsx` — Check-in swipe cards, reward awarding, session management
- `src/lib/economy-engine.ts` — Reward calculation
- `src/lib/streak-utils.ts` — Streak calculation
- `src/lib/streak-engine.ts` — Streak milestone detection
- `src/stores/habit-store.ts` — `checkIn()` recording
- `src/stores/player-store.ts` — `addXP()`, `addCoins()`
- `src/stores/game-store.ts` — `queueReward()` for animations
- `src/types/habit.ts` — Habit, CheckIn interfaces

### Data Structures

```typescript
// src/types/habit.ts
export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory; // 'Health', 'Fitness', 'Learning', etc.
  difficulty: HabitDifficulty; // 'easy' | 'medium' | 'hard'
  timeOfDay: HabitTimeOfDay; // 'morning' | 'afternoon' | 'evening' | 'anytime'
  frequency: HabitFrequency;
  sortOrder: number;
  archived: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitFrequency {
  type: "daily" | "times_per_week" | "specific_days" | "weekly" | "monthly";
  timesPerWeek?: number;
  specificDays?: number[]; // 0=Mon..6=Sun
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  skipped: boolean;
  xpEarned: number;
  coinsEarned: number;
  createdAt: string;
  updatedAt: string;
}

// src/lib/economy-engine.ts
export interface CheckInRewardResult {
  xp: number;
  coins: number;
  breakdown: {
    baseXP: number;
    baseCoins: number;
    firstWeekBonusXP: number;
    doubleXPBonusXP: number;
    surpriseBonusXP: number;
    surpriseBonusCoins: number;
  };
}
```

### Complete Flow: User Taps Checkbox → XP/Coins Awarded

```
1. rollSurpriseBonus()              → 20% chance
2. calculateCheckInReward(difficulty, { surpriseBonus, firstWeekActive, doubleXPActive })
   → base XP/coins from difficulty
   → apply first-week boost (2x base XP if active)
   → apply double-XP event (2x on already-boosted XP if active)
   → apply surprise bonus (+100% of base XP and coins if rolled)
3. habitCheckIn(habitId, date, reward.xp, reward.coins)
   → Creates CheckIn record in Dexie
4. addXP(reward.xp)
   → Updates xp, recalculates level
   → If level-up: detectLevelUps() → grantFreeAsset() for each unlock
     → addNewlyUnlocked() → queueReward('level-up')
5. addCoins(reward.coins)
   → Updates currentCoins, totalCoins in Dexie
6. Show reward float animation (XP +30, Coins +20)
7. checkStreakMilestone(newStreak)
   → If milestone (7, 14, 30, 60, 90, 180, 365): queueReward('streak-milestone')
8. Update session counters (sessionXP, sessionCoins, sessionCompleted)
9. If last card → finishSession():
   → Check daily perfect (all habits done → +50 XP, +30 coins)
   → Detect any deferred level-ups
   → Show session summary
```

### Streak Calculation

```typescript
// src/lib/streak-utils.ts
export function calculateStreak(habit: Habit, checkIns: CheckIn[]): number;
```

- Walks backward through scheduled dates, counting consecutive completions
- Non-scheduled days don't break streak
- If today is scheduled but unchecked, starts from yesterday
- Max lookback: 400 days

### Config / Constants

```yaml
# Bonus stacking example for Hard habit:
# Base: 30 XP, 20 coins
# + First-week (2x base XP): 60 XP
# + Double-XP event (2x): 120 XP
# + Surprise bonus (100% of base): +30 XP, +20 coins
# = Total: 150 XP, 40 coins

# Streak milestones (informational only, no gameplay effect)
streaks:
  milestone_thresholds: [7, 14, 30, 60, 90, 180, 365]
  # "Breaking a streak has NO gameplay consequences"

# Weekly consistency multiplier (applied at week end)
weekly_consistency:
  tiers:
    - { min_percentage: 100, max_percentage: 100, multiplier: 3.0 }
    - { min_percentage: 90, max_percentage: 99, multiplier: 2.5 }
    - { min_percentage: 80, max_percentage: 89, multiplier: 2.0 }
    - { min_percentage: 70, max_percentage: 79, multiplier: 1.5 }
    - { min_percentage: 60, max_percentage: 69, multiplier: 1.0 }
    - { min_percentage: 50, max_percentage: 59, multiplier: 0.75 }
    - { min_percentage: 0, max_percentage: 49, multiplier: 0.5 }
    # 0% = 0.0x
```

### Notes

- Streaks are **informational only** — no gameplay penalty for breaking
- Daily perfect requires ALL scheduled habits completed on the same day
- Weekly consistency bonus is delivered at week end via `WeeklySnapshot`
- During check-in sessions, `deferLevelUps = true` batches level-up popups until session end
- `RewardReveal` component is the single reusable overlay for ALL reward/celebration animations
- test change for CI trigger
