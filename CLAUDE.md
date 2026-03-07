# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev-local      # Local dev server with Turbopack (no tunnel)
npm run dev            # Dev server + Cloudflare tunnel + browser open
npm run build          # Production build (Next.js)
npm run lint           # ESLint (next/core-web-vitals + next/typescript)
npm start              # Start production server
```

No test framework is configured. Verify changes with `npm run build`.

## Architecture

**Habitville** is a gamified habit tracker where habits earn XP/coins to build an isometric city. Built as a mobile-first PWA with Next.js 16 + PixiJS 8.

### Two-Layer Rendering

- **PixiJS canvas** is the full-screen base layer rendering the isometric game world (30x30 grid, 512x292px tiles)
- **React DOM overlays** sit above the canvas (habit UI, build toolbar, popups, toasts)
- **Zustand** bridges the two: PixiJS writes via `store.getState()`/`store.subscribe()`, React reads via hooks

### Key Directories

| Path | Purpose |
|---|---|
| `src/engine/` | Pure PixiJS game engine — **no React imports allowed** |
| `src/components/` | React UI overlays above the canvas |
| `src/stores/` | Zustand stores (`use[Domain]Store` pattern) |
| `src/db/` | Dexie.js (IndexedDB) persistence — fire-and-forget writes |
| `src/types/` | Shared TypeScript types |
| `src/config/` | Constants (`UPPER_SNAKE_CASE`) and tunable parameters |
| `config.yml` | Game economy/progression tuning (XP, coins, levels, bonuses) |
| `public/assets/` | Penzilla art packs (raw structure) |

### Critical Patterns

- **Game-React boundary**: Engine code in `src/engine/` must never import React. Zustand is the only bridge.
- **Asset loading is lazy**: Only grass/dirt tiles load at startup + saved buildings from IndexedDB. Categories load on-demand when toolbar tabs are tapped.
- **Persistence**: All DB writes are fire-and-forget (`.catch(() => {})`). IndexedDB is the durable backup; in-memory maps are source of truth. Camera persistence is debounced 500ms.
- **Isometric math**: `gridToScreen`/`screenToGrid` in `src/engine/iso-utils.ts`. Depth sort by `(row + col)` ascending.
- **Road/sidewalk auto-tiling**: Bitmask-based (N=1, E=2, S=4, W=8). Sidewalks auto-generate adjacent to roads via invariant sync.
- **Container hierarchy**: `stage > gameWorld > {groundLayer, borderLayer, roadLayer, buildingLayer, entityLayer, decorLayer}` + `hudLayer` (fixed). Camera transforms only `gameWorld`.
- **Path alias**: `@/*` maps to `./src/*`

### Naming Conventions

- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Types: `PascalCase` in `src/types/`
- Constants: `UPPER_SNAKE_CASE` in `src/config/`
- Zustand stores: `use[Domain]Store`

## Dev Workflow (from PROMPT.md / DEV_WORKFLOW.md)

1. Read ARCHITECTURE.md before writing code
2. Implement what the ACTION_PLAN specifies, nothing more
3. Verify with `npm run build` before finishing
4. Update ARCHITECTURE.md with new files, patterns, and current state
5. Commit format: `Phase [N]: [short description]`

## Z-Index Layers

FAB=90, BuildToolbar=100, Popups=150, Toast=200, HabitList backdrop=299, HabitList sheet=300, HabitForm=310
