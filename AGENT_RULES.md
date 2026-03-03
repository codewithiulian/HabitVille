# AGENT_RULES.md

> **Hard constraints for every AI agent session.** These NEVER change. Violating any of these rules will break the project.

---

## Code Rules

1. **Never replace existing files wholesale.** Edit what exists. Use targeted changes. If you're about to rewrite an entire file, stop and reconsider.

2. **TypeScript strict mode. No `any` types.** Every variable, parameter, and return value must be typed. Use `unknown` + type guards if the type is truly dynamic.

3. **All game rendering goes through PixiJS.** Never add DOM elements to the game layer. The only DOM elements above the canvas are React overlay panels (habit check-in, settings, stats).

4. **`src/engine/` must NEVER import React.** The engine is pure PixiJS + vanilla TypeScript. It reads state from Zustand via `store.getState()` and `store.subscribe()`, never via hooks.

5. **Zustand is the ONLY state management.** No React Context, no prop drilling for shared state, no Redux, no MobX. One store per domain.

6. **Dexie.js (IndexedDB) is the ONLY persistence layer until Phase 10.** Do not add Supabase, Firebase, localStorage, or any other storage. Dexie handles everything.

7. **All assets load from `/public/assets/`.** Never inline base64 sprites. Never fetch assets from CDNs at runtime. Everything ships with the build.

8. **Mobile-first.** Every interaction must work with touch. Test at 390px viewport width. Touch targets minimum 44x44px. No hover-only interactions.

9. **60fps target.** Never do heavy computation in the render loop. Use viewport culling -- only render tiles visible on screen. Batch sprite operations.

10. **IDs use `crypto.randomUUID()`.** Not auto-increment, not timestamps, not custom IDs.

---

## Architecture Rules

11. **Container hierarchy is sacred.** The PixiJS stage has fixed layers: `gameWorld > groundLayer, roadLayer, buildingLayer, entityLayer, decorLayer`, plus `hudLayer` at root. Don't add new root-level containers without updating ARCHITECTURE.md.

12. **Depth sorting by `(row + col)`.** All visible objects on the isometric grid must be sorted by their grid position. Higher `(row + col)` values render in front.

13. **Camera transforms apply to `gameWorld` only.** The `hudLayer` is never affected by pan/zoom. React overlays are DOM elements and also unaffected.

14. **Road auto-tiling uses the 4-bit bitmask system.** N=1, E=2, S=4, W=8. When placing or removing a road, recalculate bitmasks for the changed tile AND all 4 neighbors.

15. **Buildings must be adjacent to a road.** Validate on placement. If no adjacent road, reject the placement with visual feedback.

---

## Style & Formatting Rules

16. **Files: `kebab-case.ts`** for modules/utilities. **`PascalCase.tsx`** for React components. **`UPPER_SNAKE_CASE`** for constant files.

17. **One export per file for major modules.** Small helpers can be co-located. Prefer named exports over default exports (except React components if needed).

18. **No `console.log` in committed code.** Use a debug utility that can be toggled off, or remove logs before finishing the unit.

---

## Workflow Rules

19. **Read ARCHITECTURE.md before writing any code.** Understand what exists, what patterns are established, and what the current unit requires.

20. **Update ARCHITECTURE.md after completing a unit.** Add new files to the file tree, add new patterns to the conventions section, and update the "Current State" section.

21. **Don't build ahead.** Only implement what the current unit requires. Don't scaffold future features "just in case." They'll change.

22. **Test before declaring done.** The app must run without errors after every unit. `npm run build` must succeed. The game must render at 60fps on mobile viewport.

---

## What This Project Is NOT

- NOT a backend project. No API routes until Phase 10.
- NOT a multi-user app. Single player, single device, local storage.
- NOT pixel art. Assets are pre-rendered isometric sprites (512x292px tiles).
- NOT a simulation. Citizens and cars are decorative -- they walk/drive random paths for ambiance, they don't have AI or needs.
