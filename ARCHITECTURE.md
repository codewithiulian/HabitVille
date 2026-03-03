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
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page (mounts game canvas)
│   ├── engine/                 # PixiJS game engine (no React imports)
│   │   └── (empty — not started)
│   ├── stores/                 # Zustand stores
│   │   └── (empty — not started)
│   ├── components/             # React UI components (overlays)
│   │   └── (empty — not started)
│   ├── db/                     # Dexie.js database schema & helpers
│   │   └── (empty — not started)
│   ├── types/                  # Shared TypeScript types
│   │   └── (empty — not started)
│   └── config/                 # Constants, level tables, building catalog
│       └── (empty — not started)
├── public/
│   └── assets/                 # All game assets (sprites, audio)
│       ├── tiles/              # Ground tiles (Grass, Dirt, Asfalt, Concreet, LowDirt + Half variants)
│       ├── roads/              # Road tiles (Road_Tile1-9, DirtRoad_Tile1-9, GrassRoad_Tile1-9)
│       ├── sidewalks/          # Sidewalk_Tile1-9, StonePath_Tile1-4
│       ├── buildings/
│       │   ├── apartments/     # Apartment buildings
│       │   ├── houses/         # Residential houses
│       │   ├── restaurants/    # Restaurant buildings
│       │   ├── shopping/       # Commercial/shop buildings
│       │   └── public/         # Public/civic buildings
│       ├── decor/              # DecorItems from pack
│       ├── plants/             # Trees, bushes, flowers
│       ├── fences/             # Fence variants (used for map borders)
│       ├── vehicles/           # Car sprites
│       ├── characters/         # NPC sprite sheets (from Giant NPC pack)
│       ├── ui/                 # GUI elements (Penzilla GUI pack)
│       ├── audio/
│       │   ├── music/          # Background tracks (Towball's Crossing)
│       │   └── sfx/            # Sound effects (Shapeforms)
│       └── (assets not yet copied into repo)
├── ARCHITECTURE.md             # THIS FILE
├── AGENT_RULES.md              # Hard constraints for every agent session
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript config (strict: true)
├── package.json
└── README.md
```

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

### Road Tile System (9-Tile Set)

The Penzilla pack provides **9 variants per road type** (Road, DirtRoad, GrassRoad), NOT 16. This is a standard 3×3 tileset format.

Available variants per type (e.g., Road_Tile1 through Road_Tile9):

```
Tile1: End/cap (north)     Tile4: Corner (NW)     Tile7: T-junction or straight
Tile2: End/cap (east)      Tile5: Crossroads      Tile8: T-junction or straight
Tile3: End/cap (south)     Tile6: Corner (SE)      Tile9: Isolated single tile
```

> **NOTE:** The exact mapping of Tile1-9 to connection types needs to be verified visually when assets are loaded. The auto-tiling logic should use a lookup table that can be adjusted once the actual sprite-to-connection mapping is confirmed.

Auto-tiling approach:

- Still check 4 neighbors (N, E, S, W)
- Map neighbor combinations to the available 9 sprites
- Some combinations may share a sprite (e.g., T-junctions may use rotation of the same sprite)
- Three road types available: paved (Road), dirt (DirtRoad), grass (GrassRoad)
- Sidewalks (9 variants) and StonePaths (4 variants) available for pedestrian areas

### State Management (Zustand)

- One store per domain: `useGameStore`, `useHabitStore`, `usePlayerStore`
- Stores live in `src/stores/`
- PixiJS accesses stores via vanilla API: `useGameStore.getState()` and `useGameStore.subscribe()`
- React components use hooks: `useGameStore((s) => s.selectedTool)`

### Persistence (Dexie.js)

- Database defined in `src/db/database.ts`
- All IDs use `crypto.randomUUID()`
- Tables follow singular naming: `habit`, `completion`, `building`, etc.
- Save on meaningful actions (place building, complete habit), not on every frame

### Naming Conventions

- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Types: `PascalCase`, exported from `src/types/`
- Constants: `UPPER_SNAKE_CASE`, in `src/config/`
- Zustand stores: `use[Domain]Store` pattern

---

## Current State

**Last completed unit:** None — project not started yet
**What exists:** Nothing. This is the initial architecture file.
**Next up:** Unit 1 — Project Scaffold

### Unit 1 checklist:

- [ ] `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- [ ] Install PixiJS 8.16.0, Zustand 5, Dexie 4.3
- [ ] Create folder structure per file tree above
- [ ] Minimal page.tsx that renders "Habitville" text
- [ ] Deploy to Vercel (connect repo)
- [ ] Update this file

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
