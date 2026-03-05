# ARCHITECTURE.md

> **Purpose:** This file is the single source of truth for AI agent sessions working on Habitville. Read this FIRST before writing any code. Update this file at the END of every unit of work.

---

## Project Overview

**Habitville** — A gamified habit tracker where completing real-life habits earns XP/coins to build a virtual isometric city. SimCity 2000 meets habit tracking. Mobile-first PWA.

**Tech Stack:**
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1 | App framework (App Router, Turbopack) |
| React | 19.2 | UI (ships with Next.js 16) |
| TypeScript | 5.9 | Language (strict mode) |
| PixiJS | 8.16.0 | 2D WebGL game rendering |
| Zustand | 5.0.11 | State management (bridges React ↔ PixiJS) |
| Dexie.js | 4.3.0 | IndexedDB wrapper (local-first persistence) |
| dexie-react-hooks | 4.2.0 | React hooks for Dexie |
| pathfinding | 0.4.18 | A\* pathfinding for entities |
| Vercel | latest | Hosting & deployment |

**Key Design Decisions:**

- Game engine first, habit tracking layered on top
- Local-only (IndexedDB) until Phase 10 (Supabase)
- PixiJS canvas is the full-screen base layer
- React overlays sit ABOVE the canvas (habit check-in, settings, stats)
- Game HUD is rendered as PixiJS sprites ON the canvas
- All assets from single artist (Penzilla) for visual consistency
- Grid: 30×30 isometric tiles
- Tile size: 512×292px (Penzilla standard)

---

## File Tree

> Update this section after every unit. One-line description per important file/module.

```
habitville/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (PWA meta, mobile viewport)
│   │   ├── page.tsx            # Main page (dynamically imports GameCanvas)
│   │   └── globals.css         # Tailwind imports + body styling
│   ├── engine/                 # PixiJS game engine (no React imports)
│   │   ├── create-app.ts       # PixiJS Application factory (async init)
│   │   ├── setup-stage.ts      # Container hierarchy skeleton per spec
│   │   ├── game.ts             # Game facade — init/destroy/accessors
│   │   ├── grid.ts             # Grid data model + tile rendering
│   │   ├── iso-utils.ts        # gridToScreen / screenToGrid conversions
│   │   ├── camera.ts           # Camera system — pan, zoom, momentum, bounds, pointer interceptor
│   │   ├── build-system.ts     # Drag-to-place, building move, select/delete/move-from-popup system
│   │   ├── road-tiles.ts       # Pure auto-tile logic: bitmask lookup, asset key helpers
│   │   ├── road-system.ts      # Road state, rendering, drag placement, removal, restore
│   │   ├── sidewalk-tiles.ts   # Pure auto-tile logic for sidewalks (reuses road bitmask mapping)
│   │   ├── sidewalk-system.ts  # Auto-sidewalk generation, accessory spawning, sync invariant
│   │   ├── asset-registry.ts   # Pattern-based sprite registry (~600 entries)
│   │   ├── asset-loader.ts     # Lazy-loader: essential assets at startup, per-category on demand
│   │   └── place-on-grid.ts    # placeOnGrid() helper for sprite positioning
│   ├── stores/                 # Zustand stores
│   │   ├── build-store.ts      # Build mode state (category/asset, placement history, toast, selection)
│   │   └── habit-store.ts      # Habits CRUD, check-ins, streaks, UI state
│   ├── components/             # React UI components (overlays)
│   │   ├── GameCanvas.tsx      # Mounts/unmounts PixiJS canvas in React
│   │   ├── BuildToolbar.tsx    # Build mode toolbar (drag-from-toolbar initiation)
│   │   ├── Toast.tsx           # Auto-dismiss toast for placement errors
│   │   ├── BuildingPopup.tsx  # Contextual popup for selected buildings (Move/Delete)
│   │   ├── RoadPopup.tsx      # Contextual popup for selected roads (Remove)
│   │   └── habits/             # Habit tracking UI (Tailwind utility classes)
│   │       ├── HabitFAB.tsx    # Floating action button with progress ring
│   │       ├── HabitList.tsx   # Bottom sheet with today's habits
│   │       ├── HabitItem.tsx   # Single habit row (checkbox, streak, edit)
│   │       ├── HabitForm.tsx   # Slide-up form for add/edit habit
│   │       └── StreakBadge.tsx # Flame + streak count badge
│   ├── db/                     # Dexie.js database schema & helpers
│   │   ├── db.ts               # Dexie database: 'habitville' with city + gameState tables
│   │   ├── city-persistence.ts # Fire-and-forget write helpers (place/move/delete/camera)
│   │   └── city-restore.ts     # Restore buildings + camera from IndexedDB on startup
│   ├── types/                  # Shared TypeScript types
│   │   ├── grid.ts             # Grid, GridCell, GroundType
│   │   ├── camera.ts           # CameraState, Velocity, TouchPoint
│   │   ├── assets.ts           # AssetCategory, AssetEntry
│   │   └── habits.ts           # Habit, Checkin, StreakInfo, HabitFrequency
│   └── config/                 # Constants, level tables, building catalog
│       ├── grid-constants.ts   # GRID_SIZE, TILE_WIDTH/HEIGHT, BORDER_WIDTH
│       └── camera-constants.ts # CAMERA_*_ZOOM, friction, velocity, bounds
├── public/
│   ├── manifest.json           # PWA manifest (basic — installable on iOS)
│   └── assets/                 # All game assets (raw packs — not yet reorganized)
│       ├── Basic_GUI_Bundle/   # Penzilla GUI pack (raw)
│       ├── GiantCityBuilder/   # Penzilla City Builder pack (raw)
│       └── NPC/                # Penzilla NPC pack (raw)
├── ARCHITECTURE.md             # THIS FILE
├── AGENT_RULES.md              # Hard constraints for every agent session
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript config (strict: true)
├── postcss.config.mjs          # PostCSS config (Tailwind)
├── eslint.config.mjs           # ESLint configuration
├── package.json                # Dependencies: Next.js 16, PixiJS 8, Zustand 5, Dexie 4
└── README.md
```

> **Note:** `public/assets/` currently contains raw Penzilla packs in their original structure. Asset reorganization into the target folder layout (tiles/, roads/, buildings/, etc.) is planned for Unit 6.

### Asset Folder Mapping (Penzilla Pack → Repo)

The Penzilla GiantCityBuilder pack has this structure. Map it into the repo as follows:

| Pack Folder                                                       | Repo Path                              | Notes                   |
| ----------------------------------------------------------------- | -------------------------------------- | ----------------------- |
| `Tiles/` (Grass, Dirt, Asfalt, Concreet, LowDirt + Half variants) | `public/assets/tiles/`                 | Ground terrain only     |
| `Tiles/` (Road_Tile1-9, DirtRoad_Tile1-9, GrassRoad_Tile1-9)      | `public/assets/roads/`                 | Split from Tiles folder |
| `Tiles/` (Sidewalk_Tile1-9, StonePath_Tile1-4)                    | `public/assets/sidewalks/`             | Split from Tiles folder |
| `Appartments/`                                                    | `public/assets/buildings/apartments/`  | Fix typo in folder name |
| `Houses/`                                                         | `public/assets/buildings/houses/`      |                         |
| `Restaurants/`                                                    | `public/assets/buildings/restaurants/` |                         |
| `Shopping/`                                                       | `public/assets/buildings/shopping/`    |                         |
| `Public/`                                                         | `public/assets/buildings/public/`      |                         |
| `DecorItems/`                                                     | `public/assets/decor/`                 |                         |
| `Plants/`                                                         | `public/assets/plants/`                |                         |
| `Fences/`                                                         | `public/assets/fences/`                |                         |
| `Vehicles/`                                                       | `public/assets/vehicles/`              |                         |

---

## Patterns & Conventions

> Add new patterns here as they emerge. These are RULES the next agent must follow.

### Game-React Boundary

- `src/engine/` contains pure PixiJS code. **Never import React here.**
- `src/components/` contains React overlays. They read from Zustand stores.
- Zustand is the bridge: PixiJS writes to stores, React subscribes to stores.
- PixiJS game loop reads from stores via `store.getState()` (not hooks).

### Isometric Math

```typescript
// Grid → Screen
screenX = (col - row) * (TILE_WIDTH / 2);
screenY = (col + row) * (TILE_HEIGHT / 2);

// Screen → Grid
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
│   ├── groundLayer (Container — grass, dirt, terrain tiles)
│   ├── borderLayer (Container — fences, dense plants at map edges)
│   ├── roadLayer (Container — roads, sidewalks)
│   ├── buildingLayer (Container — sorted by depth)
│   ├── entityLayer (Container — citizens, cars, sorted by depth)
│   └── decorLayer (Container — trees, benches, lamp posts)
├── hudLayer (Container — fixed position, not affected by camera)
│   ├── levelBadge
│   ├── xpBar
│   ├── coinCounter
│   └── toolbar
└── (React overlays are DOM elements above the canvas, not PixiJS)
```

### Map Border Strategy

The Penzilla City Builder pack does NOT include water, mountain, or railroad tiles. Borders use existing assets instead:

- **All edges:** 3 rows of non-buildable tiles
- **Border visual:** Dense Plants (treeline) backed by Fences — reads as "edge of the world"
- **Ground transition:** Grass → Grass_Half\* variants at edges to suggest terrain fading out
- **Interior:** All Grass tiles, fully buildable (24×24 usable area)
- **Future:** Can swap in dedicated terrain tiles later if a matching pack is found

This is cosmetic only — it does not affect gameplay. The key is `buildable: false` on border tiles.

### Road System (Auto-Tiling)

Roads are ground-level tiles rendered in `roadLayer` (above ground, below buildings). A tile CAN have both a road and a building — buildings sit on top visually.

**Architecture:**
- `road-tiles.ts` — Pure data + functions (no PixiJS). Bitmask calculation, tile lookup, asset key helpers. Easily unit-testable.
- `road-system.ts` — Core road state (`roadMap`), sprite creation/update, auto-tile recalculation, L-path drag placement with preview, removal popup, undo helpers, restore from DB.
- Three road types with auto-tiling: **Road**, **DirtRoad**, **GrassRoad** (9 tiles each). Different road types do NOT connect to each other.

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
| 7 | N+E+S | 1 | T → crossroads fallback |
| 8 | W | 7 | dead-end (E+W straight fallback) |
| 9 | N+W | 4 | corner |
| 10 | E+W | 7 | straight |
| 11 | N+E+W | 1 | T → crossroads fallback |
| 12 | S+W | 5 | corner |
| 13 | N+S+W | 2 | T-junction |
| 14 | E+S+W | 3 | T-junction |
| 15 | N+E+S+W | 1 | crossroads |

**Placement UX:**
- Tap-to-select road type in toolbar → tap grid tile to place single road
- Drag across grid → semi-transparent L-shaped preview (col-first, then row) → release places all tiles
- Tap existing same-type road → popup with "Remove" button
- Undo supports both `road-place` (batch removal) and `road-delete` (re-creation)

**Data model:**
- In-memory: `roadMap: Map<string, { sprite, roadType, tileNum }>` keyed by `"row,col"`
- DB: `roads` table with `CityRoad { id: "row,col", row, col, roadType, tileNum, placedAt }`
- Persistence: fire-and-forget `persistRoad/persistRoadBatch/persistRoadDelete/persistRoadDeleteBatch`

### Sidewalk System (Auto-Generation)

Sidewalks are auto-generated ground tiles flanking roads, with deterministic street furniture accessories.

**Architecture:**
- `sidewalk-tiles.ts` — Pure auto-tile logic reusing road bitmask mapping. `sidewalkAssetKey(tileNum)` → `Sidewalk_Tile${tileNum}`.
- `sidewalk-system.ts` — Core state (`sidewalkMap`, `accessoryMap`), invariant-based sync, restore helpers, init/destroy.
- Sidewalk rendering: same ground-sprite texture-swap pattern as roads (saves original texture for restore).
- Accessory rendering: new sprites in `decorLayer` with UPRIGHT_ANCHOR (0.5, 1.0).

**Invariant:** A sidewalk exists at `(r,c)` if and only if: tile is buildable, has no road, and at least one cardinal neighbor has a road. `syncSidewalksForArea(positions)` enforces this after every road mutation. `recalcSidewalksAfterRestore()` validates the invariant on startup (removes stale sidewalks from DB, regenerates accessories with correct frequencies).

**Accessory seed logic** (`pickAccessory(row, col)`): deterministic using `(row * 31 + col * 17) % 120`. Rates: 12.5% street lamp (~1 per 4 road tiles), 4.2% fire hydrant (~1 per 12), 5% trash can (~1 per 10), 3.3% mailbox (~1 per 15), 75% nothing. Max 1 accessory per sidewalk tile. Accessories ONLY spawn on sidewalk tiles, never on grass or road tiles.

**Building interaction:** New sidewalks skip occupied tiles, but existing sidewalks remain under buildings. Buildings CAN be placed on sidewalk tiles.

**Data model:**
- In-memory: `sidewalkMap: Map<string, SidewalkEntry>`, `accessoryMap: Map<string, AccessoryEntry>`
- DB: `sidewalks` + `accessories` tables (v3)
- Persistence: fire-and-forget batch helpers

### Camera System

- Camera transforms `gameWorld` only — `hudLayer` and React overlays are unaffected
- Module-scoped state in `src/engine/camera.ts` (same pattern as `game.ts`, `grid.ts`)
- Pointer events for pan (mouse + single touch), touch events for pinch-to-zoom, wheel for desktop zoom
- `isPinching` flag prevents pan during pinch gestures
- Touch listeners use `{ passive: false }` to allow `preventDefault()` (stops browser zoom)
- Zoom formula preserves world point under cursor/finger:
  ```
  worldX = (screenX - gameWorld.x) / oldZoom
  gameWorld.scale.set(newZoom)
  gameWorld.x = screenX - worldX * newZoom
  ```
- Momentum: ticker applies velocity with friction decay each frame
- Bounds clamping: map diamond can't scroll entirely off viewport; centers if smaller than viewport
- `GameCanvas.tsx` sets `touchAction: 'none'` to prevent default browser touch gestures
- Tunable constants in `src/config/camera-constants.ts`

### Build System (Drag-to-Place)

- **Drag-based UX** — drag asset from toolbar onto grid to place; tap existing building to pick up and move
- Camera panning and building placement are completely separate gestures (no tap-to-place)
- **Occupancy map** is a `Map<string, { sprite, assetKey, buildingId }>` keyed by `"row,col"` — stores sprite references + persistence ID
- **Pointer-down interceptor** on camera: build system checks if tap hits a placed building's visual bounds (`sprite.getBounds()`), returns `true` to block camera pan
- **Drag state machine**: `preDrag` (pre-threshold, < 8px movement) → `activeDrag` (ghost visible, snapping to grid)
- **Ghost sprites**: alpha 0.6, green tint on valid tiles, red on invalid, `eventMode = 'none'`
- **Height offset**: before `screenToGrid()`, world Y is offset by `texture.height * (anchor.y - 0.5)` so buildings with bottom-center anchors appear under the cursor, not above it
- **Building pickup hit test**: uses `sprite.getBounds()` (screen-space) rather than grid-based lookup, so tapping the visible building works regardless of anchor offset
- **Bounce animation** on successful place/move: scale 1.15→1.0 over 12 frames
- **Tap-to-select**: Tapping a placed building (without dragging) selects it, shows a highlight filter, and opens a popup with Move/Delete actions
- **Selection highlight**: `ColorMatrixFilter` with `brightness(1.3)` — non-destructive, toggled on/off
- **Building popup**: React overlay positioned above the selected building via ticker tracking `sprite.getBounds()`; frosted glass card with Move and Delete buttons
- **Move from popup**: Two-tap UX — tap Move button, then tap destination on grid. Building dims (alpha 0.5) while waiting for placement
- **Delete**: Removes sprite from display via `removeFromParent()` without `destroy()` — sprite stays alive for undo
- **Undo** supports `'place'` (destroy sprite), `'move'` (snap back), and `'delete'` (restore sprite to grid)
- **Toast** ("Can't build here"): React component reads `toastMessage` from build store, auto-dismisses after 1.5s
- Dropping back onto toolbar area silently cancels placement (no toast)
- Document-level `pointermove`/`pointerup` listeners are added during drag and cleaned up on drop

### Asset Registry & Loading

- **Asset keys** = descriptive stem (e.g. `House_Blue_Type1`, `Grass`, `Restaurant_Pizza`)
- **Texture keys** = path relative to public/ (e.g. `assets/GiantCityBuilder/Houses/Blue/House_Type1.png`)
- **Registry** is static — built at import time from pattern generators, not dynamically scanned
- **Default anchors**: ground tiles `(0.5, 0)` (top-center), buildings/decor/plants `(0.5, 1.0)` (bottom-center foot point)
- **gridOffset** defaults to `(0, 0)` — adjusted per-sprite during visual calibration
- **Missing textures** skip silently — never crash
- **Placement**: `placeOnGrid(sprite, row, col, assetKey)` uses registry metadata for anchor + offset
- Houses are in color subdirectories: `Houses/{Color}/House_Type{1-20}.png` (8 colors × 20 types)
- Apartments use original pack spelling: `Appartments/Appartment_{Color}_{Size}_Level{1-3}.png`

### Lazy-Loading Pattern

Assets are **not** loaded all at once. The loading strategy is:

1. **Startup (`loadEssentialAssets`)**: Loads only Grass.png + Dirt.png (grid tiles) plus textures for any saved buildings from IndexedDB. This keeps startup to ~2-50 textures instead of ~600+.
2. **Per-category (`loadBuildCategory`)**: When a toolbar category tab is tapped, all PixiJS textures for that category are loaded on demand. Zustand tracks load state per category (`idle` → `loading` → `loaded`).
3. **Toolbar thumbnails**: Use raw `<img src>` tags (not PixiJS textures), so they display instantly regardless of PixiJS loading state.
4. **No unloading**: All loaded textures stay in PixiJS cache for the session (~600 max).
5. **Defensive null-check**: `build-system.ts` checks for null texture before creating placement sprites, in case a user somehow initiates drag before the category finishes loading.
6. **Cache headers**: `vercel.json` sets `Cache-Control: public, max-age=31536000, immutable` on `/assets/` for repeat visits.

### React Overlay Toolbar

- `BuildToolbar` is a React component rendered as a fixed-position DOM overlay above the PixiJS canvas (`z-index: 100`)
- Uses inline styles (matching existing project pattern — no CSS modules or Tailwind utility classes on components)
- Communicates with game engine via `useBuildStore` Zustand store
- Category tabs map to asset registry categories via `CATEGORY_MAP`
- Road tab filters to representative tiles (one per road type) instead of showing all 9 variants
- `maxHeight: 20vh` ensures toolbar never blocks more than 20% of viewport
- All touch targets meet 44×44px minimum

### State Management (Zustand)

- One store per domain: `useGameStore`, `useHabitStore`, `usePlayerStore`
- Stores live in `src/stores/`
- PixiJS accesses stores via vanilla API: `useGameStore.getState()` and `useGameStore.subscribe()`
- React components use hooks: `useGameStore((s) => s.selectedTool)`

### Persistence (Dexie.js)

- Database defined in `src/db/db.ts`, name `'habitville'`, version 4
- Tables: `city` (buildings), `roads` (road tiles), `sidewalks` (auto-generated sidewalks), `accessories` (street furniture), `gameState` (camera), `habits` (habit definitions), `checkins` (daily check-ins)
- All IDs use `crypto.randomUUID()` (buildings) or fixed key `'current'` (gameState)
- **Write pattern**: fire-and-forget — all writes `.catch(() => {})`, never block the game loop
- **Camera persistence**: debounced 500ms via `setTimeout`/`clearTimeout` in `persistCamera()`
- **Restore on startup**: `restoreCity()` → `restoreRoads()` → `restoreSidewalks()` → `restoreAccessories()` → `recalcSidewalksAfterRestore()`
- **Occupancy map** is the in-memory source of truth; IndexedDB is the durable backup
- Save on meaningful actions (place/move/delete building, camera settle), not on every frame

### Habits System

- **Data model:** `Habit` (name, icon, color, frequency, customDays, sortOrder, archivedAt for soft-delete) + `Checkin` (habitId, date as YYYY-MM-DD, completedAt)
- **Compound index** `[habitId+date]` enables O(1) "is this habit checked today?" lookup
- **Streak algorithm:** Walk backward from today through scheduled days only. If today is scheduled but unchecked, start from yesterday (user hasn't had full day). Count consecutive scheduled days with checkins; stop at first miss. Weekday habits skip weekends (no break), custom habits skip non-custom days.
- **UI pattern:** Bottom sheet (HabitList) triggered by floating action button (HabitFAB). Form slides over the list. All habit components use **Tailwind utility classes** (diverges from inline-style pattern used by build components).
- **Z-index layers:** FAB=90, BuildToolbar=100, Popups=150, Toast=200, HabitList backdrop=299, HabitList sheet=300, HabitForm=310

### Naming Conventions

- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Types: `PascalCase`, exported from `src/types/`
- Constants: `UPPER_SNAKE_CASE`, in `src/config/`
- Zustand stores: `use[Domain]Store` pattern

---

## Current State

**Last completed unit:** Phase 5.1 — Habits System (CRUD, Check-ins, Streaks)
**What works:** All previous features (including Phase 3.2 auto-sidewalks) + habit tracking. Create/edit/archive habits with icon, color, frequency (daily/weekdays/weekends/custom). Daily check-in via bottom sheet with Today/This Week/All view toggle. Streak tracking (current + longest) with flame badge. Progress FAB with ring indicator. All data persists in IndexedDB (habits + checkins tables, v4). Habit components use Tailwind utility classes.
**Next up:** Phase 6 (Economy/XP)

### Phase 5.1 checklist (Habits System — CRUD, Check-ins, Streaks):

- [x] `types/habits.ts` — Habit, Checkin, StreakInfo, HabitFrequency types
- [x] `db/db.ts` — Version 4: habits + checkins tables with compound index [habitId+date]
- [x] `stores/habit-store.ts` — Zustand store: loadHabits, addHabit, updateHabit, archiveHabit, toggleCheckin, streak calculation
- [x] `components/habits/HabitFAB.tsx` — Floating action button with progress ring (z-index 90, hidden in build mode)
- [x] `components/habits/HabitList.tsx` — Bottom sheet with Today/This Week/All toggle, progress bar, empty state
- [x] `components/habits/HabitItem.tsx` — Habit row: checkbox in completion mode, edit dots in all mode
- [x] `components/habits/HabitForm.tsx` — Slide-up form: name, icon grid, color swatches, frequency pills, Monday-first custom day picker, archive
- [x] `components/habits/StreakBadge.tsx` — Flame + streak count for streaks >= 2
- [x] `page.tsx` — Added HabitFAB + HabitList dynamic imports
- [x] `ARCHITECTURE.md` — Updated file tree, persistence docs, current state
- [x] Build verification — `npm run build` succeeds

### Phase 2.5 checklist (Grid State Persistence — Dexie.js):

- [x] `db/db.ts` — Dexie database schema: city + gameState tables with EntityTable typing
- [x] `db/city-persistence.ts` — Fire-and-forget helpers: persistPlace, persistMove, persistDelete, persistCamera (debounced 500ms)
- [x] `db/city-restore.ts` — restoreCity() + restoreCameraState() for startup restore
- [x] `stores/build-store.ts` — Added `buildingId: string` to PlacementEntry
- [x] `engine/build-system.ts` — Extended occupancy map with buildingId, threaded through all mutations + undo, added persistence calls
- [x] `engine/camera.ts` — Added persistCamera calls after clampBounds in pan/zoom/pinch/momentum
- [x] `engine/game.ts` — Integrated restoreCity + restoreCameraState between grid render and camera init
- [x] `ARCHITECTURE.md` — Updated file tree, persistence docs, current state
- [ ] Build verification — `npm run build` succeeds

### Phase 2.4 checklist (Tile Interaction — Select, Delete, Move Popup):

- [x] `build-store.ts` — Added `'delete'` to PlacementEntry type, selection state + actions
- [x] `build-system.ts` — Tap-to-select, highlight filter, delete, move-from-popup, popup position ticker, deselect on empty tap
- [x] `BuildingPopup.tsx` — New React overlay: frosted glass card with thumbnail, name, Move/Delete buttons
- [x] `page.tsx` — Added BuildingPopup to overlay stack
- [x] `ARCHITECTURE.md` — Updated file tree, patterns, current state
- [ ] Build verification — `npm run build` succeeds

### Phase 2.3 checklist (Drag-to-Place UX):

- [x] `build-system.ts` — Full rewrite: occupancy Map, drag state machine, drag-from-toolbar, building move, ghost sprites, bounce animation, undo rework
- [x] `camera.ts` — Simplified: removed tap/move callbacks, added pointer-down interceptor for building pickup
- [x] `build-store.ts` — Extended PlacementEntry with type/fromRow/fromCol, added toast state
- [x] `BuildToolbar.tsx` — Replaced onClick with onPointerDown for drag initiation, added data-build-toolbar attribute
- [x] `Toast.tsx` — New component: auto-dismiss toast pill for placement errors
- [x] `game.ts` — Updated markOccupied signature, removed test buildings
- [x] `page.tsx` — Added Toast component to layout
- [x] Build verification — `npm run build` succeeds
- [x] Update ARCHITECTURE.md

### Phase 2.2 checklist (Asset Picker UI — Build Toolbar):

- [x] `stores/build-store.ts` — Zustand store for build mode state (category, asset, actions)
- [x] `globals.css` — Add `.hide-scrollbar` utility class
- [x] `components/BuildToolbar.tsx` — React overlay toolbar with category tabs + asset grid
- [x] `page.tsx` — Add BuildToolbar dynamic import alongside GameCanvas
- [x] Build verification — `npm run build` succeeds
- [x] Update ARCHITECTURE.md

### Phase 2.1 checklist (Texture Atlas & Asset Registry):

- [x] `types/assets.ts` — AssetCategory, AssetEntry type definitions
- [x] `asset-registry.ts` — Pattern-based registry for ~600 sprites (tiles, houses, apartments, shopping, restaurants, public, decor, plants, fences, vehicles)
- [x] `asset-loader.ts` — Manifest builder + preloader with progress callback
- [x] `place-on-grid.ts` — `placeOnGrid()` helper using registry anchor/offset
- [x] `game.ts` — Integrate loadAllAssets() before grid render, place 4 test buildings
- [x] `grid.ts` — Use `Assets.get()` (preloaded) instead of `Assets.load()`
- [x] `layout.tsx` — Progress bar on splash screen (`#loading-progress`)
- [x] Build verification — `npm run build` succeeds
- [x] Update ARCHITECTURE.md

### Unit 4 checklist:

- [x] `camera-constants.ts` — Tunable camera parameters (zoom range, friction, velocity, bounds)
- [x] `types/camera.ts` — CameraState, Velocity, TouchPoint types
- [x] `camera.ts` — Camera module (pan, zoom, pinch, momentum, bounds clamping)
- [x] `game.ts` — Integrate camera init/destroy, apply default zoom + centered positioning
- [x] `GameCanvas.tsx` — Add `touchAction: 'none'` to prevent browser gestures
- [x] Build verification — `npm run build` succeeds
- [x] Update ARCHITECTURE.md

### Unit 3 checklist:

- [x] `grid-constants.ts` — Grid size, tile dimensions, border width, asset path
- [x] `types/grid.ts` — Grid, GridCell, GroundType types
- [x] `iso-utils.ts` — gridToScreen / screenToGrid conversion functions
- [x] `grid.ts` — Grid data model + tile rendering with depth sorting
- [x] `game.ts` — Integrate grid creation, rendering, centering
- [x] Update ARCHITECTURE.md

### Unit 2 checklist:

- [x] `create-app.ts` — PixiJS Application factory with async init
- [x] `setup-stage.ts` — Container hierarchy (gameWorld + 6 layers + hudLayer)
- [x] `game.ts` — Game facade with init/destroy/accessors, StrictMode guard
- [x] `GameCanvas.tsx` — React component mounting PixiJS canvas
- [x] `page.tsx` — Dynamic import of GameCanvas (SSR disabled)
- [x] Update ARCHITECTURE.md

### Unit 1 checklist:

- [x] `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- [x] Install PixiJS 8.16.0, Zustand 5.0.11, Dexie 4.3.0, dexie-react-hooks 4.2.0
- [x] Create folder structure per file tree above
- [x] Minimal page.tsx that renders "Habitville" text
- [x] PWA manifest + mobile viewport meta tags
- [ ] Deploy to Vercel (user connects manually)
- [x] Update this file

---

## Reference: Isometric Grid Constants

```typescript
export const GRID_SIZE = 30; // 30×30 tiles
export const TILE_WIDTH = 512; // px (Penzilla standard)
export const TILE_HEIGHT = 292; // px (Penzilla standard)
export const BORDER_WIDTH = 3; // tiles of non-buildable border on each edge
export const BUILDABLE_SIZE = 24; // 30 - (3*2) = 24×24 buildable interior
```

## Reference: Depth Sorting

```typescript
// Called every frame or on placement change
buildingLayer.children.sort((a, b) => {
  const depthA = a.gridRow + a.gridCol;
  const depthB = b.gridRow + b.gridCol;
  return depthA - depthB;
});
```

## Reference: Available Ground Tiles

```
Full tiles:     Grass, Dirt, LowDirt, Asfalt, Concreet
Half variants:  [Type]_HalfBottom, [Type]_HalfSide, [Type]_HalfTop (for terrain transitions)
Road types:     Road_Tile[1-9], DirtRoad_Tile[1-9], GrassRoad_Tile[1-9]
Sidewalks:      Sidewalk_Tile[1-9], StonePath_Tile[1-4]
```
