# Habitville — Implementation Action Plan

Sequential units of work. Each unit is one coding session (~2-3 hours). Each produces something testable before moving to the next. Feed them to your coding agent one at a time, in order.

---

## Unit 1 — Project Scaffold

Set up Next.js 15 with TypeScript, Tailwind, App Router. Install PixiJS 8, Zustand, Dexie.js. Configure PWA manifest (basic). Deploy to Vercel. Verify it loads on iPhone via Vercel URL. Just a blank page that says "Habitville" — but the entire toolchain works end to end.

**Test:** Open Vercel URL on iPhone. Page loads. Can add to home screen.

---

## Unit 2 — PixiJS Canvas Mount

Create a full-screen PixiJS Application inside a React component. Canvas fills viewport, no scrollbars. Handle window resize. Black or dark green background. No game content yet — just a working canvas that renders at 60fps on mobile.

**Test:** Open on iPhone. See a colored canvas. No white bars, no scroll, no jank.

---

## Unit 3 — Isometric Grid Rendering

Define a 30×30 grid data structure. Implement `gridToScreen()` and `screenToGrid()` coordinate conversion. Load a single grass tile from the Penzilla pack. Render all 900 grass tiles in isometric layout. Should look like a diamond-shaped field of grass.

**Test:** See a full isometric grass grid on screen. Tiles align perfectly with no gaps.

---

## Unit 4 — Camera Controls

Implement touch drag to pan the camera. Implement pinch-to-zoom. Add momentum/inertia on pan release. Clamp zoom min/max. Clamp pan to map bounds. Center the map on initial load.

**Test:** On iPhone, drag to pan smoothly. Pinch to zoom. Momentum feels natural. Can't scroll off the map.

---

## Unit 5 — Map Borders

Add water tiles along south edge, mountain tiles along north/east, railroad strip along west. Mark these tiles as `buildable: false` in the grid data. Interior remains grass and buildable. Load the appropriate border sprites from the asset pack.

**Test:** See an isometric landscape with distinct water, mountain, and railroad borders. Grass interior.

---

## Unit 6 — Texture Atlas & Asset Registry

Load all Penzilla sprites into PixiJS texture atlases. Create an asset registry — a JS object that maps category → asset list (roads, residential, commercial, public, decorations). Each entry has: key, sprite reference, display name, tile size (1×1, 2×2), category.

**Test:** Console log confirms all textures loaded. No missing sprites. Registry is queryable by category.

---

## Unit 7 — Asset Picker UI

Build the bottom toolbar as PixiJS sprites (using GUI pack). Category tabs across the top of the toolbar (Roads, Residential, Commercial, etc.). Horizontal scrollable list of assets per category. Tap an asset to select it (visual highlight). Tap again or tap elsewhere to deselect. Wire up basic SFX on tap.

**Test:** On iPhone, see a toolbar at the bottom. Tap categories, scroll through assets, select one. Feels like a game UI.

---

## Unit 8 — Tile Placement

With an asset selected from the picker, show a ghost preview following the finger on the grid. Tap a grid tile to place the asset. Validate: tile must be buildable and empty. On valid placement: render sprite at correct position, play SFX. On invalid: flash red, play error SFX. Implement depth sorting — sprites sorted by (row + col).

**Test:** Select a house. Tap grass tile. House appears. Try placing on water — rejected. Place two buildings — correct depth overlap.

---

## Unit 9 — Tile Interaction & Persistence

Tap an existing placed asset to select it (highlight outline). Show Move / Remove options. Move: pick up, re-place elsewhere. Remove: delete from grid. Save full grid state to IndexedDB via Dexie.js on every change. Restore grid state on app reload.

**Test:** Place 5 buildings. Close browser. Reopen. All 5 buildings are exactly where you left them.

---

## Unit 10 — Road Placement Basics

Roads are a tile type. Place roads from the asset picker. Implement auto-tiling: check 4 neighbors, compute bitmask (N=1, E=2, S=4, W=8), select correct sprite variant (straight, corner, T-junction, crossroads, dead-end). When placing/removing a road, recalculate neighbors.

**Test:** Draw an L-shaped road. Corner tile auto-selects. Add a branch — T-junction appears. Road variants always correct.

---

## Unit 11 — Road Drawing & Accessories

Implement click-and-drag to draw road lines (detect drag, place tiles along path). When a road is placed, auto-spawn pavement sprites on edges. Add lamp posts every 3-4 tiles, random benches. Accessories are tied to their road — removing road removes accessories.

**Test:** Drag to draw a long road. Pavements, lamp posts, benches appear automatically. Delete a road segment — accessories go with it.

---

## Unit 12 — Building-to-Road Validation

Once at least one road exists, enforce: buildings must be adjacent to a road. Check 4 neighbors for road presence on building placement. Show clear feedback on invalid placement ("Must be next to a road"). Buildings placed before roads existed are grandfathered in.

**Test:** Place a road. Place a house next to it — works. Try placing a house in the middle of nowhere — rejected with message.

---

## Unit 13 — Pathfinding Setup

Install pathfinding.js. Build a walkable graph from road tiles. Run A\* between two road tiles and get back a path (list of grid coordinates). Recalculate graph when roads change. Visualize a debug path on the grid (optional, helpful for testing).

**Test:** Place roads in an L-shape. Request path from one end to the other. Path correctly follows the L, not a straight line.

---

## Unit 14 — Walking Citizens

Citizens spawn from residential buildings. Each citizen: has pixel position, target building, A\* path, walk animation. Moves smoothly between tiles (interpolate pixel position each frame). Offset to pavement edge visually. Load NPC sprite sheets, animate walk cycle (swap frames every 120ms, direction-aware). On arrival: disappear briefly, pick new destination, repeat.

**Test:** Place 2 houses and a road connecting them. Citizens appear and walk back and forth along the pavement. Walk animation plays correctly.

---

## Unit 15 — Driving Cars

Cars spawn when commercial/industrial buildings exist. Move along road centers (not pavement). Faster than citizens. Use vehicle sprites, rotated per direction. Follow A\* paths between random road endpoints. Cap at ~15 cars. Proper depth sorting with buildings and citizens.

**Test:** Place roads, houses, and a shop. Citizens walk, cars drive. Cars and citizens don't overlap incorrectly with buildings.

---

## Unit 16 — Dexie.js Schema & Habit Data Model

Set up full Dexie.js database: habits, completions, playerState, xpTransactions, coinTransactions tables. Create TypeScript interfaces for all models. Build data access layer: createHabit(), getHabitsForToday(), completeHabit(), getPlayerState(), etc. Seed the 7 initial habits.

**Test:** Call data functions from console. Habits persist across reloads. Completions write and read correctly.

---

## Unit 17 — Habit Check-In Overlay

Build a slide-up panel (React overlay on top of canvas). Shows today's date. Lists habits due today. Daily habits always shown. Weekly habits with progress ("1/3 this week"). Single tap to check off — checkmark animation, "+15 XP" popup, SFX. Greyed out when complete. "All done!" state when everything checked.

**Test:** Open overlay on iPhone. See your 7 habits. Tap to check off. Animations play. Close overlay, reopen — checked habits stay checked.

---

## Unit 18 — XP & Leveling Engine

Implement XP award on completion. Calculate level from total XP using formula. Track level transitions. "All daily habits done" bonus (+25 XP). Level-up detection triggers celebration event. Wire up to Zustand store so PixiJS HUD can react.

**Test:** Check off all daily habits. XP increments. Hit enough XP for Level 1. Level-up event fires. State persists in IndexedDB.

---

## Unit 19 — Coin Economy

Coins from level-ups (level × 10). Random coin drops on completion (20% chance, 5-15 coins). Coin transactions logged. Wire coins to building purchases — deduct coins on placement, reject if insufficient. Sell buildings for 50% refund.

**Test:** Level up, get coins. Try buying a 100-coin building with 50 coins — rejected. Earn more, buy it — coins deducted. Sell it — 50 coins back.

---

## Unit 20 — Building Unlock Tiers

Implement tier system: buildings locked until player reaches required level. Asset picker only shows unlocked buildings. "Locked" overlay on buildings above current level (visible but greyed out, shows "Unlocks at Level X"). When leveling past a tier threshold, show "New buildings unlocked!" notification.

**Test:** At Level 0, only roads and residential visible. Force level to 5 — commercial appears. Force to 10 — parks unlock.

---

## Unit 21 — Streaks & Weekly Summary

Calculate daily streak (consecutive days all due habits completed). Streak milestones award coins (7d: 50, 30d: 200, 100d: 500, 365d: 2000). Weekly summary calculation on Sunday midnight. Completion percentage, bonus XP/coins, strong week multiplier. Store weekly summaries.

**Test:** Simulate a week of completions in the data layer. Weekly summary calculates correctly. Streak increments and resets properly.

---

## Unit 22 — Game HUD

Top bar rendered in PixiJS: level badge + title, XP progress bar, coin counter, streak flame. Bottom bar: Build button, Habits button, Stats button, Settings. All using GUI pack sprites. Animated: coins tick up, XP bar fills, streak pulses. HUD reacts to Zustand state changes in real time.

**Test:** Check off a habit — XP bar fills on the HUD without leaving the city view. Level up — badge updates. Coins increment with animation.

---

## Unit 23 — Audio System

Load Towball tracks, Shapeforms SFX, ambient sounds. Background music: shuffle, loop, crossfade. Map SFX to all interactions (place, remove, tap, check-off, level-up, error, coin drop). Ambient layers: birds always, traffic with roads, waves near water. Volume controls in settings. Mute toggle.

**Test:** Open app. Music plays. Place a building — hear thunk. Check off habit — hear chime. Zoom into water — waves get louder.

---

## Unit 24 — Stats Overlay

Build stats panel (React overlay). Total completions per habit. This week / this month counts. Current and longest streak per habit. Aggregate stats. Weekly completion rate chart (use Recharts or simple canvas). Habit completion heatmap.

**Test:** After a few days of data, open stats. See accurate numbers, charts render, heatmap shows green/grey dots.

---

## Unit 25 — Minimap & City Info

Corner minimap showing full grid at small scale. Current viewport highlighted. Tap to jump camera. City info panel: tap city name to rename, population count, building count by category, city prosperity score.

**Test:** Pan to one corner of the map. Tap opposite corner on minimap. Camera jumps there. Rename city — persists.

---

## Unit 26 — Supabase Setup & Auth

Create Supabase project. Set up all database tables (migrate from Dexie schema). Implement email/password auth. Login screen. Onboarding flow for first-time users. Row Level Security policies.

**Test:** Sign up, log in, see the city. Log out, log back in — data persists server-side.

---

## Unit 27 — Cloud Sync

Keep Dexie.js as offline cache. Sync habit data and city state to Supabase on connectivity. Queue offline completions and sync when back online. Conflict resolution (last-write-wins). Background sync.

**Test:** Go offline. Check off habits, place buildings. Go online. Data syncs to Supabase. Open on another device — same data.

---

## Unit 28 — PWA Polish

iOS splash screens per device size. Standalone display mode (no Safari chrome). Status bar styling. Touch target audit (44×44pt minimum). Viewport culling for performance. Entity sprite pooling. Lazy load audio. Test on real iPhone — 60fps target with full city.

**Test:** Add to home screen. Opens full screen, no browser UI. Place 20 buildings, 30 citizens, 15 cars — smooth 60fps. Works offline.

---

## Summary

28 units of work. Each is ~2-3 hours. Feed them to your coding agent one at a time. Each produces something you can see, test, and verify before moving on.

| Block      | Units | What You Have After                               |
| ---------- | ----- | ------------------------------------------------- |
| Foundation | 1-5   | Isometric landscape with camera controls          |
| Building   | 6-9   | Place and persist buildings on the map            |
| Roads      | 10-12 | Auto-tiling roads with accessories and validation |
| Life       | 13-15 | Citizens walking, cars driving, city feels alive  |
| Habits     | 16-18 | Check off habits, earn XP, level up               |
| Economy    | 19-21 | Coins, building unlocks, streaks, weekly bonuses  |
| Polish     | 22-25 | Game HUD, audio, stats, minimap                   |
| Backend    | 26-28 | Auth, cloud sync, PWA perfection                  |
