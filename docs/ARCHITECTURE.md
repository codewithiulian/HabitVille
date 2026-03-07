# ARCHITECTURE.md

> **Purpose:** Detailed engineering reference for AI agent sessions. For quick orientation, see `CLAUDE.md` first. Update this file at the END of every unit of work.

---

## Patterns & Conventions

> These are RULES the next agent must follow.

### Isometric Math

```typescript
// Grid -> Screen
screenX = (col - row) * (TILE_WIDTH / 2);
screenY = (col + row) * (TILE_HEIGHT / 2);

// Screen -> Grid
col = Math.floor(
  (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2,
);
row = Math.floor(
  (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2,
);
```

- `TILE_WIDTH = 512`, `TILE_HEIGHT = 292` (Penzilla standard)
- Depth sort: sprites sorted by `(row + col)` ascending. Higher value = rendered later (in front).

### Container Hierarchy (PixiJS)

```
stage
├── gameWorld (Container — transformed by camera: pan/zoom)
│   ├── groundLayer (grass, dirt, terrain tiles)
│   ├── borderLayer (fences, dense plants at map edges)
│   ├── roadLayer (roads, sidewalks)
│   ├── buildingLayer (sorted by depth)
│   ├── entityLayer (citizens, cars, sorted by depth)
│   └── decorLayer (trees, benches, lamp posts)
├── hudLayer (fixed position, not affected by camera)
└── (React overlays are DOM elements above the canvas, not PixiJS)
```

### Map Border Strategy

- **All edges:** 3 rows of non-buildable tiles (`buildable: false`)
- **Border visual:** Dense Plants (treeline) backed by Fences
- **Ground transition:** Grass -> Grass_Half\* variants at edges
- **Interior:** All Grass tiles, fully buildable (24x24 usable area)

### Road System (Auto-Tiling)

Roads are ground-level tiles in `roadLayer` (above ground, below buildings). A tile CAN have both a road and a building.

**Architecture:**
- `road-tiles.ts` — Pure data + functions (no PixiJS). Bitmask calculation, tile lookup, asset key helpers.
- `road-system.ts` — Core road state (`roadMap`), sprite creation/update, auto-tile recalculation, L-path drag placement with preview, removal, undo, restore from DB.
- Three road types: **Road**, **DirtRoad**, **GrassRoad** (9 tiles each). Different types do NOT connect to each other.

**Bitmask auto-tile lookup (N=1, E=2, S=4, W=8):**

| Bitmask | Connections | Tile# | Shape |
|---------|-------------|-------|-------|
| 0 | none | 7 | isolated (E+W straight fallback) |
| 1 | N | 8 | dead-end (N+S straight fallback) |
| 2 | E | 7 | dead-end (E+W straight fallback) |
| 3 | N+E | 6 | corner |
| 4 | S | 8 | dead-end (N+S straight fallback) |
| 5 | N+S | 8 | straight |
| 6 | E+S | 9 | corner |
| 7 | N+E+S | 1 | T -> crossroads fallback |
| 8 | W | 7 | dead-end (E+W straight fallback) |
| 9 | N+W | 4 | corner |
| 10 | E+W | 7 | straight |
| 11 | N+E+W | 1 | T -> crossroads fallback |
| 12 | S+W | 5 | corner |
| 13 | N+S+W | 2 | T-junction |
| 14 | E+S+W | 3 | T-junction |
| 15 | N+E+S+W | 1 | crossroads |

**Placement UX:**
- Tap-to-select road type in toolbar -> tap grid tile to place single road
- Drag across grid -> semi-transparent L-shaped preview (col-first, then row) -> release places all tiles
- Tap existing same-type road -> popup with "Remove" button
- Undo supports both `road-place` (batch removal) and `road-delete` (re-creation)

**Data model:**
- In-memory: `roadMap: Map<string, { sprite, roadType, tileNum }>` keyed by `"row,col"`
- DB: `roads` table with `CityRoad { id: "row,col", row, col, roadType, tileNum, placedAt }`

### Sidewalk System (Auto-Generation)

Sidewalks are auto-generated ground tiles flanking roads, with deterministic street furniture accessories.

- `sidewalk-tiles.ts` — Pure auto-tile logic reusing road bitmask mapping.
- `sidewalk-system.ts` — Core state (`sidewalkMap`, `accessoryMap`), invariant-based sync, restore helpers.

**Invariant:** A sidewalk exists at `(r,c)` iff: tile is buildable, has no road, and at least one cardinal neighbor has a road. `syncSidewalksForArea(positions)` enforces this after every road mutation.

**Accessory seed logic** (`pickAccessory(row, col)`): deterministic using `(row * 31 + col * 17) % 120`. Rates: 12.5% street lamp, 4.2% fire hydrant, 5% trash can, 3.3% mailbox, 75% nothing. Max 1 accessory per sidewalk tile.

**Building interaction:** New sidewalks skip occupied tiles, but existing sidewalks remain under buildings. Buildings CAN be placed on sidewalk tiles.

### Camera System

- Camera transforms `gameWorld` only
- Pointer events for pan, touch events for pinch-to-zoom, wheel for desktop zoom
- `isPinching` flag prevents pan during pinch gestures
- Touch listeners use `{ passive: false }` to allow `preventDefault()` (stops browser zoom)
- Zoom preserves world point under cursor/finger:
  ```
  worldX = (screenX - gameWorld.x) / oldZoom
  gameWorld.scale.set(newZoom)
  gameWorld.x = screenX - worldX * newZoom
  ```
- Momentum: ticker applies velocity with friction decay each frame
- Bounds clamping: map diamond can't scroll entirely off viewport
- Tunable constants in `src/config/camera-constants.ts`

### Build System (Drag-to-Place)

- **Drag-based UX** — drag asset from toolbar onto grid; tap existing building to pick up and move
- **Occupancy map**: `Map<string, { sprite, assetKey, buildingId }>` keyed by `"row,col"`
- **Pointer-down interceptor**: build system checks if tap hits a placed building's `sprite.getBounds()`, returns `true` to block camera pan
- **Drag state machine**: `preDrag` (< 8px movement) -> `activeDrag` (ghost visible, snapping to grid)
- **Ghost sprites**: alpha 0.6, green tint valid / red invalid, `eventMode = 'none'`
- **Height offset**: world Y offset by `texture.height * (anchor.y - 0.5)` before `screenToGrid()` so bottom-center anchored buildings appear under cursor
- **Bounce animation** on place/move: scale 1.15->1.0 over 12 frames
- **Tap-to-select**: highlight via `ColorMatrixFilter` with `brightness(1.3)`, opens popup with Move/Delete
- **Move from popup**: Two-tap UX — tap Move, then tap destination. Building dims (alpha 0.5) while waiting
- **Delete**: `removeFromParent()` without `destroy()` — sprite stays alive for undo
- **Undo** supports `'place'`, `'move'`, and `'delete'`
- Document-level `pointermove`/`pointerup` listeners added during drag, cleaned up on drop

### Asset Registry & Loading

- **Asset keys** = descriptive stem (e.g. `House_Blue_Type1`, `Grass`)
- **Texture keys** = path relative to public/ (e.g. `assets/GiantCityBuilder/Houses/Blue/House_Type1.png`)
- **Registry** is static — built at import time from pattern generators, not dynamically scanned
- **Default anchors**: ground tiles `(0.5, 0)`, buildings/decor/plants `(0.5, 1.0)`
- **Missing textures** skip silently — never crash
- Houses: `Houses/{Color}/House_Type{1-20}.png` (8 colors x 20 types)
- Apartments: `Appartments/Appartment_{Color}_{Size}_Level{1-3}.png` (original pack spelling)
- **Lazy loading**: essential assets at startup, per-category on toolbar tab tap, thumbnails use raw `<img>` tags

### Persistence (Dexie.js)

- Database: `'habitville'`, version 5
- **City tables** (v1–v4): `city`, `roads`, `sidewalks`, `accessories`, `gameState`
- **Economy tables** (v5): `habits` (indexed: archived), `checkIns` (indexed: [habitId+date], date), `playerProfile`, `inventory` (indexed: assetId), `placedAssets` (indexed: assetId), `weeklySnapshots` (indexed: weekStart)
- All economy records use UUIDs, ISO timestamps (`createdAt`/`updatedAt`), and `syncedAt?` for future sync
- **Restore order**: `restoreCity()` -> `restoreRoads()` -> `restoreSidewalks()` -> `restoreAccessories()` -> `recalcSidewalksAfterRestore()`

### Config System

- `config.yml` is the single source of truth for all economy/progression values
- `scripts/gen-config.js` generates `src/config/game-config.gen.json` at build time (via npm pre-scripts)
- `src/config/game-config.ts` imports the JSON and exports typed `GAME_CONFIG`
- The generated JSON is gitignored — always regenerated from YAML

### Zustand Stores (Economy Layer)

All stores follow the `useBuildStore` pattern. DB writes are fire-and-forget `.catch(() => {})`.

| Store | File | Key State |
|-------|------|-----------|
| `usePlayerStore` | `src/stores/player-store.ts` | xp, coins, level, population, firstUseDate |
| `useHabitStore` | `src/stores/habit-store.ts` | habits[], todayCheckIns[] |
| `useInventoryStore` | `src/stores/inventory-store.ts` | ownedAssets[], placedAssets[] |
| `useGameStore` | `src/stores/game-store.ts` | currentMode, activeScreen, pendingRewards[], boost flags |

**Initialization order** (in `AppInitializer.tsx`): Player first → Habit + Inventory in parallel → Game last (reads player's firstUseDate).

### Habits System

- **Data model:** `Habit` (name, category, difficulty, frequency, timeOfDay, sortOrder, archived) + `CheckIn` (habitId, date YYYY-MM-DD, completed, skipped, xpEarned, coinsEarned)
- **Streak algorithm:** Walk backward from today through scheduled days only. If today is scheduled but unchecked, start from yesterday. Count consecutive scheduled days with checkins; stop at first miss. Weekday habits skip weekends, custom habits skip non-custom days.
- **Streak implementation:** `src/lib/streak-utils.ts` — pure `calculateStreak(habit, checkIns)` function.
- **Category visuals:** `src/config/habit-categories.ts` — Lucide icon + hex color per `HabitCategory`.
- **UI pattern:** Bottom sheet (HabitList z-300) triggered by FAB (z-90, bottom-right). Form (z-310) slides over list. Archive confirmation is a centered modal (z-320). Habit components use **Tailwind utility classes** (build components use inline styles).
- **Onboarding:** Detected via `db.playerProfile.count() === 0` in AppInitializer. Two steps: welcome → habit suggestions (3 hardcoded defaults). After completion, triggers TutorialOverlay (z-500) with 3 coach marks. State in `gameStore.showOnboarding` / `gameStore.tutorialStep` (not persisted to DB).
- **Build toggle:** Cog button (bottom-left, z-90) toggles `currentMode` between 'view' and 'build'. BuildToolbar only renders in build mode. Close button (top-right) also exits build mode.

### Asset Folder Mapping (Penzilla Pack -> Repo)

| Pack Folder | Repo Path | Notes |
|---|---|---|
| `Tiles/` (Grass, Dirt, Asfalt, Concreet, LowDirt + Half) | `public/assets/tiles/` | Ground terrain only |
| `Tiles/` (Road_Tile1-9, DirtRoad_Tile1-9, GrassRoad_Tile1-9) | `public/assets/roads/` | Split from Tiles |
| `Tiles/` (Sidewalk_Tile1-9, StonePath_Tile1-4) | `public/assets/sidewalks/` | Split from Tiles |
| `Appartments/` | `public/assets/buildings/apartments/` | Fix typo in folder name |
| `Houses/` | `public/assets/buildings/houses/` | |
| `Restaurants/` | `public/assets/buildings/restaurants/` | |
| `Shopping/` | `public/assets/buildings/shopping/` | |
| `Public/` | `public/assets/buildings/public/` | |
| `DecorItems/` | `public/assets/decor/` | |
| `Plants/` | `public/assets/plants/` | |
| `Fences/` | `public/assets/fences/` | |
| `Vehicles/` | `public/assets/vehicles/` | |

---

## Current State

**Last completed unit:** Issue #50 — Habit Management (CRUD + Onboarding)
**What works:** Isometric grid, camera (pan/zoom/pinch/momentum), build system (drag-to-place, move, delete, undo, toggle via cog button), road auto-tiling (3 types), sidewalk auto-generation with accessories, IndexedDB persistence for all city state, habit CRUD UI (create/edit/archive forms, bottom sheet list, FAB entry point), streak calculation, first-time onboarding flow (welcome → habit suggestions → tutorial overlay), config loader (YAML→JSON→typed TS), economy data layer (player profile, inventory, placed assets, weekly snapshots), Zustand stores for player/habit/inventory/game state.
**Next up:** Economy engine (XP/coin calculations, bonuses, level-ups)

---

## Reference: Available Ground Tiles

```
Full tiles:     Grass, Dirt, LowDirt, Asfalt, Concreet
Half variants:  [Type]_HalfBottom, [Type]_HalfSide, [Type]_HalfTop
Road types:     Road_Tile[1-9], DirtRoad_Tile[1-9], GrassRoad_Tile[1-9]
Sidewalks:      Sidewalk_Tile[1-9], StonePath_Tile[1-4]
```
