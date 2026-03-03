# Habitville — Master Plan

A gamified habit tracker where real-life consistency builds a virtual isometric city. Built as a PWA with Next.js, designed mobile-first for iPhone, vibe-coded in spare time.

---

## Vision

Open the app. See an empty landscape — grass fields, a coastline, mountains in the distance, a railroad with no station. Complete your habits. Earn XP, level up, collect coins. Spend coins to build roads, houses, shops, landmarks. Watch citizens walk the pavements and cars drive the streets. Over a year, transform barren land into a thriving metropolis — a physical record of your discipline.

---

## Tech Stack

| Layer            | Technology                            | Notes                                           |
| ---------------- | ------------------------------------- | ----------------------------------------------- |
| Framework        | Next.js 16.1 (App Router), TypeScript | Deployed on Vercel                              |
| Styling          | Tailwind CSS                          | Mobile-first utility classes                    |
| Game Engine      | PixiJS 8                              | WebGL 2D renderer for isometric city            |
| State Management | Zustand                               | Shared state between React UI and PixiJS canvas |
| Local Storage    | Dexie.js (IndexedDB)                  | Offline-first, no backend initially             |
| Backend (later)  | Supabase (PostgreSQL + Auth + RLS)    | Added in Phase 7                                |
| PWA              | next-pwa / Workbox                    | Service worker, offline support                 |
| Audio            | Howler.js or PixiJS Sound             | Background music, SFX, ambient                  |
| AI Coach (later) | Anthropic API (Claude)                | Future phase                                    |

---

## Art & Audio Assets

All from a single artist ecosystem (Penzilla) plus free audio packs. One purchase covers the entire visual foundation.

| Asset Pack                   | Source                                                                       | Cost   | What It Covers                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| City Builder Bundle          | [Penzilla — itch.io](https://itch.io/s/146635/city-builder-bundle)           | $14.99 | 500+ city tiles, 20 house types, 61 public buildings, 76 shops/restaurants, 225 decor items, 50 vehicles, 1000+ NPC combinations with walk animations |
| Giant Basic GUI Bundle       | [Penzilla — itch.io](https://penzilla.itch.io/basic-gui-bundle)              | Free   | Buttons, menus, sliders, scrollers, icons for game UI                                                                                                 |
| Towball's Crossing Deluxe    | [Towball — itch.io](https://towball.itch.io/towballs-crossing)               | Free   | 40+ cozy loopable background music tracks (Animal Crossing style)                                                                                     |
| Ambient Adventure Soundtrack | [Penzilla — itch.io](https://penzilla.itch.io/ambient-adventure-soundtrack)  | $4     | Additional royalty-free background music                                                                                                              |
| Shapeforms Free SFX          | [Shapeforms — itch.io](https://shapeforms.itch.io/shapeforms-audio-free-sfx) | Free   | 180 high-quality UI and interaction sound effects                                                                                                     |

**Total asset budget: ~$19**

### Asset Specs

- Tile grid size: 512×292px (Penzilla standard isometric diamond)
- All sprites: PNG with transparent backgrounds
- NPC sprite sheets: 8 columns × 5 rows per sheet (down, down-side, side, up-side, up), flip for left/right
- All assets are royalty-free for commercial use

---

## Phase 1 — Isometric Foundation (~6-8 hours)

**Goal:** Open the app on your iPhone and see an isometric landscape you can pan and zoom around. The empty canvas for your future city.

### 1.1 — Project Setup

- Initialize Next.js 15 project with TypeScript and Tailwind
- Install PixiJS 8, Zustand, Dexie.js
- Configure PWA manifest (basic — installable on iPhone home screen)
- Deploy to Vercel with working CI/CD
- Set up mobile viewport meta tags (no zoom, full-screen feel)

### 1.2 — PixiJS Canvas Integration

- Mount PixiJS Application inside a full-screen React component
- Canvas fills entire viewport, no scrollbars
- React owns the DOM layer (future UI overlays), PixiJS owns the canvas
- Handle resize events for responsive canvas sizing

### 1.3 — Isometric Grid Renderer

- Define the grid data structure: 2D array, start with 30×30 tiles
- Implement coordinate conversion functions:
  - `gridToScreen(row, col)` → pixel position on canvas
  - `screenToGrid(x, y)` → grid coordinates from touch/click
- Render grass tiles from Penzilla pack across the entire grid
- Implement proper depth sorting (higher row+col = rendered later)

### 1.4 — Camera System

- Touch drag to pan the camera (translate the PixiJS container)
- Pinch-to-zoom on mobile (scale the container)
- Momentum/inertia on pan release for smooth feel
- Clamp zoom between min/max levels
- Clamp pan so camera can't go off the map edges

### 1.5 — Static Environment Borders

- Define map border zones in grid data:
  - South edge: sea/water tiles (non-buildable)
  - North/East edges: mountain tiles (non-buildable)
  - West strip: railroad tiles (non-buildable, future train station snaps here)
- Interior: all grass (buildable area for the player)
- Flag border tiles as `buildable: false`

### Deliverable

Open on iPhone → see an isometric landscape with grass, water, mountains, and a railroad. Drag to pan, pinch to zoom. Feels like an empty SimCity map waiting to be built.

---

## Phase 2 — Asset System & Tile Placement (~6-8 hours)

**Goal:** Tap to place buildings, roads, and decorations on the map. The core builder interaction.

### 2.1 — Texture Atlas Loading

- Load all Penzilla sprite sheets into PixiJS texture atlases
- Organize sprites by category in code: ground, roads, buildings (residential, commercial, public), decorations, vehicles
- Preload all textures on app init with a loading screen

### 2.2 — Asset Picker UI (Canvas-Rendered)

- Bottom toolbar rendered as PixiJS sprites (using GUI pack assets)
- Category tabs: Roads, Residential, Commercial, Public, Decorations
- Scrollable horizontal list of available assets per category
- Tap an asset to select it (highlighted state)
- Selected asset follows finger as ghost preview on the grid
- UI sound effect on selection

### 2.3 — Tile Placement

- With an asset selected, tap a grid tile to place it
- Validate placement:
  - Tile must be `buildable: true`
  - Tile must be empty (no existing building)
  - Buildings must be adjacent to a road (enforced after roads exist)
- On valid placement: sprite renders at tile position, satisfying "place" SFX
- On invalid placement: error feedback (red flash, error SFX)
- Multi-tile buildings (2×2, etc.): mark all occupied tiles as blocked

### 2.4 — Tile Interaction

- Tap an existing placed asset to select it
- Options: Move (pick up and re-place) or Remove (delete from grid)
- Long-press alternative for move mode
- Depth sorting updates automatically when assets are placed/moved

### 2.5 — Grid State Persistence

- Save grid state to IndexedDB via Dexie.js
- Auto-save on every placement/removal
- Restore grid state on app reload
- Data model per tile: `{ ground, building, decoration, buildable, occupied }`

### Deliverable

Open app → browse buildings → tap to place houses, shops, trees on the map. Move them around. Remove them. Close and reopen — everything persists.

---

## Phase 3 — Road Infrastructure (~8-10 hours)

**Goal:** Draw roads that auto-connect, with pavements, lamp posts, and benches appearing automatically. Buildings must connect to roads.

### 3.1 — Road Placement with Auto-Tiling

- Road is a tile type that replaces ground
- On placement, check 4 neighbors (up, down, left, right in grid coords)
- Select correct sprite variant based on neighbor bitmask:
  - Straight (horizontal/vertical): 2 variants
  - Corner (4 rotations): 4 variants
  - T-junction (4 rotations): 4 variants
  - Crossroads: 1 variant
  - Dead-end (4 rotations): 4 variants
  - Isolated: 1 variant
  - Total: ~16 variants
- When placing/removing a road, recalculate auto-tile for that tile AND all adjacent road tiles
- Click-and-drag to draw road lines (detect drag gesture, place along path)

### 3.2 — Road Accessories

- When a road tile is placed, auto-spawn decorations:
  - Pavement sprites offset to edges of road tile
  - Lamp posts at regular intervals (every 3-4 road tiles)
  - Benches occasionally (random, ~1 in 6 road tiles)
- Accessories are tied to their road tile — removing the road removes them

### 3.3 — Building-to-Road Validation

- After at least one road exists on the map, enforce: buildings must be placed adjacent to a road tile
- Check 4 neighboring tiles for road presence
- Building's visual "entrance" faces the road side
- Show clear feedback when trying to place a building with no road access

### Deliverable

Draw roads by dragging across the map. Roads auto-connect with proper corners and junctions. Pavements and lamp posts appear along roads. Place buildings next to roads.

---

## Phase 4 — Moving Entities (~8-10 hours)

**Goal:** Citizens walk pavements, cars drive roads. The city feels alive.

### 4.1 — Pathfinding Setup

- Install `pathfinding.js` library
- Build a walkable graph from road tiles
- A\* pathfinding between any two road-connected tiles
- Recalculate graph when roads are added/removed

### 4.2 — Citizens

- Citizens spawn from residential buildings (houses, apartments)
- Each citizen:
  - Has a current position (pixel coords, smooth movement)
  - Has a target building (picked randomly from placed buildings)
  - Follows A\* path along road tiles
  - Visually offset to pavement edge (not center of road)
  - Uses NPC sprite sheet walk animation (swap frames every 100-150ms)
  - On arrival: "enter" building (disappear), wait 2-5 seconds, pick new destination
- Start with 5-10 citizens, scale with number of residential buildings
- Cap at ~30 for performance

### 4.3 — Vehicles

- Cars spawn when commercial/industrial buildings exist
- Each vehicle:
  - Moves along road tile centers (not pavement)
  - Faster than citizens
  - Uses vehicle sprite (static, rotated per direction)
  - Follows A\* path between random road endpoints
  - On arrival: pick new random destination
- Start with 2-3 cars, scale with building count
- Cap at ~15

### 4.4 — Depth Sorting with Moving Entities

- Moving entities participate in depth sorting with buildings
- Re-sort entity layer every frame based on entity grid position
- Entities render behind buildings with higher row+col, in front of those with lower

### Deliverable

Place a few houses and some roads. Little citizens appear and walk around. Place a shop, cars start driving. The city feels alive with movement.

---

## Phase 5 — Habit Tracking Core (~8-10 hours)

**Goal:** The actual habit tracker. Open the app, check off your habits, earn XP and coins.

### 5.1 — Habit Management (Local)

- Create a habit with:
  - Name (e.g., "Gym workout")
  - Description (optional)
  - Difficulty: Easy (10 XP) / Medium (15 XP) / Hard (20 XP)
  - Frequency: Daily OR X times per week
  - Frequency value (e.g., 3 for "3x/week")
  - Icon (pick from preset list)
- Edit, archive (soft delete), reorder habits
- All stored in IndexedDB via Dexie.js

### 5.2 — Daily Check-In Screen

- Accessible from a HUD button on the city view (not a separate page — slides up as overlay panel)
- Shows today's date
- Lists all habits due today:
  - Daily habits: always shown
  - Weekly habits: shown with progress (e.g., "1/3 this week")
- Single tap to check off → immediate visual feedback:
  - Checkmark animation
  - XP popup ("+15 XP" floats up)
  - Coin drop animation (20% chance, 5-15 coins)
  - Satisfying SFX
- Completed habits shown as checked/greyed
- Cannot uncheck after 24 hours
- "All done for today!" state with bonus XP (+25)

### 5.3 — Initial Habits (Pre-seeded)

| Habit                         | Difficulty | Frequency | XP  |
| ----------------------------- | ---------- | --------- | --- |
| Gym workout                   | Hard       | 3x/week   | 20  |
| Cardio session (30 min)       | Hard       | 2x/week   | 20  |
| Read (non-fiction, ~15 pages) | Medium     | Daily     | 15  |
| In bed by 11 PM               | Medium     | Daily     | 15  |
| Wake up at 6:30 AM            | Medium     | Daily     | 15  |
| Phone screen time ≤ 30 min    | Hard       | Daily     | 20  |

**Weekly potential XP: 615 XP/week**

### 5.4 — Habit History

- Weekly view showing which days each habit was completed
- Green/grey dots per day (GitHub contribution graph style)
- Accessible from habit management screen

### Local Database Schema (Dexie.js)

```
habits: id, name, description, difficulty, xpValue, frequencyType, frequencyValue, icon, sortOrder, isArchived, createdAt, updatedAt

completions: id, habitId, completedAt, completedDate, xpEarned, coinsEarned

playerState: userId mod, totalXp, currentLevel, coins, currentStreak, longestStreak, lastPerfectDay, consecutiveStrongWeeks

xpTransactions: id, amount, source, referenceId, createdAt

coinTransactions: id, amount, source, referenceId, createdAt
```

---

## Phase 6 — Reward System & Economy (~6-8 hours)

**Goal:** XP accumulates, levels progress, coins fund city building. The habit-to-city feedback loop is complete.

### 6.1 — XP Engine

- XP awarded instantly on habit completion (based on difficulty)
- "All daily habits done" bonus: +25 XP
- XP is permanent, never lost
- XP transactions logged for audit trail

### 6.2 — Leveling System

- 50 levels, exponential curve: `XP for level N = round(100 × 1.07^N)`
- Progression milestones:
  - Level 5 (~575 XP): ~1 week
  - Level 10 (~1,380 XP): ~2.5 weeks
  - Level 20 (~4,100 XP): ~8 weeks
  - Level 30 (~9,450 XP): ~18 weeks
  - Level 50 (~40,500 XP): ~1 year
- Level-up triggers celebration (animation, confetti, new title reveal, coins awarded)

### 6.3 — Level Titles (0–50)

| Lvl | Title      | Lvl | Title       | Lvl | Title        | Lvl | Title      |
| --- | ---------- | --- | ----------- | --- | ------------ | --- | ---------- |
| 0   | Idle       | 13  | Disciplined | 26  | Strategist   | 39  | Infinite   |
| 1   | Aware      | 14  | Relentless  | 27  | Vanguard     | 40  | Mythic     |
| 2   | Willing    | 15  | Unshakable  | 28  | Titan        | 41  | Eternal    |
| 3   | Moving     | 16  | Fortified   | 29  | Legendary    | 42  | Ascendant  |
| 4   | Committed  | 17  | Ironclad    | 30  | Unstoppable  | 43  | Celestial  |
| 5   | Consistent | 18  | Hardened    | 31  | Monumental   | 44  | Omega      |
| 6   | Grounded   | 19  | Tempered    | 32  | Transcendent | 45  | Exalted    |
| 7   | Anchored   | 20  | Composed    | 33  | Radiant      | 46  | Primordial |
| 8   | Steady     | 21  | Commanding  | 34  | Formidable   | 47  | Absolute   |
| 9   | Resilient  | 22  | Resolute    | 35  | Invincible   | 48  | Immortal   |
| 10  | Driven     | 23  | Dominant    | 36  | Paramount    | 49  | Apex       |
| 11  | Focused    | 24  | Elite       | 37  | Sovereign    | 50  | Zenith     |
| 12  | Sharp      | 25  | Architect   | 38  | Supreme      |     |            |

### 6.4 — Coin Economy

- Coins from level-ups: `level × 10` (Level 1 = 10 coins, Level 50 = 500 coins)
- Random coin drops on habit completion: 20% chance, 5-15 coins
- Total annual coin budget: ~17,000 coins
- Coins are the ONLY currency for city building — this is the bridge between habits and city

### 6.5 — Building Unlock Tiers & Pricing

| Tier                   | Unlocked At | Buildings                                     | Cost Range        |
| ---------------------- | ----------- | --------------------------------------------- | ----------------- |
| Roads & Infrastructure | Level 0     | Roads, pavements, lamp posts                  | Free (starter)    |
| Residential            | Level 0     | Small house, Cottage, Apartment               | 50–150 coins      |
| Commercial             | Level 5     | Coffee shop, Bakery, Bookstore                | 100–250 coins     |
| Parks & Leisure        | Level 10    | Park, Playground, Garden, Pool                | 200–400 coins     |
| Industrial             | Level 15    | Factory, Warehouse, Workshop                  | 300–600 coins     |
| Civic                  | Level 20    | School, Library, Fire Station, Hospital       | 500–1,000 coins   |
| Cultural               | Level 25    | Museum, Theater, Stadium                      | 800–1,500 coins   |
| Waterfront             | Level 30    | Marina, Lighthouse, Yacht Club                | 1,000–2,000 coins |
| Luxury                 | Level 35    | Mansion, Resort, Golf Course                  | 1,500–3,000 coins |
| Landmarks              | Level 40    | Monument, Skyscraper, Airport                 | 2,500–4,000 coins |
| Endgame                | Level 45    | Space Center, Presidential Palace, Mega Tower | 4,000–6,000 coins |

### 6.6 — Streaks

- Daily streak: consecutive days where ALL due habits are completed
- Displayed on the city HUD
- Streak milestones award bonus coins:
  - 7 days: 50 coins
  - 30 days: 200 coins
  - 100 days: 500 coins
  - 365 days: 2,000 coins

### 6.7 — Weekly Summary & Bonus

- Calculated every Sunday at midnight
- Weighted completion score: earned XP / potential XP = percentage
- Weekly bonus pool: 150 XP + 50 coins (scales slightly with level)
- You receive: pool × completion percentage
- Perfect week (100%): full bonus + extra 25 XP and 10 coins
- Consecutive strong weeks multiplier (≥85% completion):
  - 2 weeks: 1.1x → 3: 1.2x → 4: 1.3x → 5: 1.4x → 6+: 1.5x (cap)
  - Drops below 85%: resets to 1.0x

### Deliverable

Complete a habit → earn XP → level up → get coins → spend coins on buildings in the city → city grows. The full loop works.

---

## Phase 7 — Game HUD & Polished UI (~6-8 hours)

**Goal:** The app looks and feels like a game, not a web app.

### 7.1 — City HUD (Canvas-Rendered, GUI Pack)

- Top bar:
  - Level badge with title (e.g., "Lvl 12 — Sharp")
  - XP progress bar toward next level
  - Coin counter with icon
  - Streak flame icon with day count
- Bottom bar:
  - Build mode button (opens asset picker)
  - Habits button (opens check-in overlay)
  - Stats button
  - Settings gear
- All rendered as PixiJS sprites using Penzilla GUI pack
- Animations: coin counter increments, XP bar fills, streak flame pulses

### 7.2 — Notification Popups (In-Game)

- "+15 XP" floating text on habit completion
- "Level Up!" celebration with confetti particles
- "New buildings unlocked!" when reaching a tier threshold
- Coin drop animation (coin sprite falls into counter)
- Building placed confirmation

### 7.3 — City Info Panel

- Tap city name to edit it (default: "New Settlement")
- Population counter (scales with residential buildings)
- Building count by category
- City "rating" or "prosperity" score

### 7.4 — Minimap

- Corner minimap showing full grid at tiny scale
- Current viewport highlighted
- Tap minimap to jump camera to that location

---

## Phase 8 — Audio Integration (~3-4 hours)

**Goal:** The city has sound. Music plays, interactions are satisfying, the world feels alive.

### 8.1 — Background Music

- Load Towball's Crossing tracks
- Shuffle playback, looping
- Smooth crossfade between tracks
- Volume slider in settings

### 8.2 — UI Sound Effects

- Shapeforms SFX mapped to interactions:
  - Tile placement: satisfying "thunk"
  - Tile removal: soft "pop"
  - Button tap: clean click
  - Habit check-off: rewarding chime
  - Coin drop: coin clink
  - Level up: triumphant fanfare
  - Error/invalid: soft buzz

### 8.3 — Ambient City Sounds

- Layered ambient audio based on city contents:
  - Base: birds chirping, gentle wind (always)
  - With roads: distant traffic hum
  - With construction: occasional hammer sounds
  - Near water: wave sounds
- Volume scales with zoom level (closer = louder ambient)

---

## Phase 9 — Stats & Historical Progress (~5-6 hours)

**Goal:** See your real-world achievements quantified.

### 9.1 — Stats Dashboard (Overlay Panel)

- Total completions per habit (all time)
- Completions this week / this month
- Current and longest streak per habit
- Aggregate stats: "Total gym sessions: 47" / "Books pages: ~700"
- Level timeline: when each level was reached

### 9.2 — Charts

- Weekly completion rate over time (line chart)
- XP earned per week (bar chart)
- Habit completion heatmap (GitHub-style, per habit)

### 9.3 — Level Milestones View

- At each level, snapshot of cumulative stats
- "At Level 10 (Driven): 60 gym sessions, 3 books, 20 cardio sessions"

---

## Phase 10 — Auth, Backend & Sync (~8-10 hours)

**Goal:** Data persists in the cloud. Multiple devices. No data loss.

### 10.1 — Supabase Integration

- Set up Supabase project (PostgreSQL + Auth + RLS)
- Supabase email/password auth (just you for now)
- First-time onboarding flow

### 10.2 — Database Migration

- Migrate IndexedDB schema to Supabase PostgreSQL:

```sql
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  created_at timestamptz default now(),
  onboarding_complete boolean default false
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  xp_value int generated always as (
    case difficulty when 'easy' then 10 when 'medium' then 15 when 'hard' then 20 end
  ) stored,
  frequency_type text check (frequency_type in ('daily', 'weekly')) default 'daily',
  frequency_value int default 1,
  icon text default '⭐',
  sort_order int default 0,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  habit_id uuid references habits(id) on delete cascade,
  completed_at timestamptz default now(),
  completed_date date default current_date,
  xp_earned int not null,
  coins_earned int default 0,
  unique(habit_id, completed_date)
);

create table player_state (
  user_id uuid references profiles(id) primary key,
  total_xp int default 0,
  current_level int default 0,
  coins int default 0,
  current_streak int default 0,
  longest_streak int default 0,
  last_perfect_day date,
  consecutive_strong_weeks int default 0,
  updated_at timestamptz default now()
);

create table xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount int not null,
  source text not null,
  reference_id uuid,
  created_at timestamptz default now()
);

create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount int not null,
  source text not null,
  reference_id uuid,
  created_at timestamptz default now()
);

create table buildings_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  tier int not null,
  unlock_level int not null,
  cost int not null,
  sprite_key text not null,
  width int default 1,
  height int default 1,
  description text
);

create table city_buildings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  building_id uuid references buildings_catalog(id),
  grid_x int,
  grid_y int,
  placed_at timestamptz,
  purchased_at timestamptz default now()
);

create table city_state (
  user_id uuid references profiles(id) primary key,
  city_name text default 'New Settlement',
  grid_size int default 30,
  population int default 0,
  updated_at timestamptz default now()
);

create table weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  total_completions int,
  possible_completions int,
  completion_percentage decimal(5,2),
  xp_earned int,
  coins_earned int,
  bonus_xp int,
  bonus_coins int,
  streak_multiplier decimal(3,2),
  is_perfect_week boolean default false,
  unique(user_id, week_start)
);

create table level_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  level int not null,
  title text not null,
  reached_at timestamptz default now(),
  total_xp_at_level int,
  unique(user_id, level)
);
```

### 10.3 — Offline Sync

- Keep Dexie.js as local cache
- Habit check-offs queued offline
- Sync to Supabase when connection restored
- Conflict resolution: last-write-wins for simple fields, merge for completions
- Row Level Security: users only see their own data

---

## Phase 11 — PWA & Mobile Polish (~4-5 hours)

**Goal:** Feels like a native app on iPhone. 60fps. Instant load.

### 11.1 — PWA Configuration

- App manifest: icon, splash screen, theme colors, standalone display
- Service worker caching strategies via Workbox
- iOS-specific: Apple touch icon, status bar styling, splash screens per device size
- "Add to Home Screen" prompt

### 11.2 — Performance Optimization

- Viewport culling: only render tiles visible on screen
- Texture atlas optimization: single atlas load vs. individual sprites
- Entity pooling: reuse sprite objects for citizens/cars instead of create/destroy
- Lazy load audio (don't block initial render)
- Target: 60fps on iPhone 12+ with 30 entities and 30×30 grid

### 11.3 — Touch Optimization

- Touch targets minimum 44×44pt for all interactive elements
- Gesture disambiguation: pan vs. tap vs. long-press vs. pinch
- Haptic feedback on placement (if available via Vibration API)
- Prevent accidental placements during pan gestures

---

## Timeline & Effort Estimates

Budget: ~10 hours/week, vibe-coded with AI assistance.

| Phase        | What                                                       | Effort   | Target        |
| ------------ | ---------------------------------------------------------- | -------- | ------------- |
| **Phase 1**  | Isometric foundation (grid, camera, environment)           | 6-8 hrs  | Weekend 1     |
| **Phase 2**  | Asset system & tile placement                              | 6-8 hrs  | Weekend 2     |
| **Phase 3**  | Road infrastructure with auto-tiling                       | 8-10 hrs | Weekend 3     |
| **Phase 4**  | Moving entities (citizens, cars, pathfinding)              | 8-10 hrs | Weekend 4     |
| **Phase 5**  | Habit tracking core (CRUD, daily check-in)                 | 8-10 hrs | Weekend 5     |
| **Phase 6**  | Reward system & economy (XP, levels, coins, building loop) | 6-8 hrs  | Weekend 6     |
| **Phase 7**  | Game HUD & polished UI                                     | 6-8 hrs  | Weekend 7     |
| **Phase 8**  | Audio integration                                          | 3-4 hrs  | Weekend 7-8   |
| **Phase 9**  | Stats & historical progress                                | 5-6 hrs  | Weekend 8-9   |
| **Phase 10** | Auth, backend & cloud sync                                 | 8-10 hrs | Weekend 10-11 |
| **Phase 11** | PWA & mobile polish                                        | 4-5 hrs  | Weekend 11-12 |

**Total estimated effort: ~70-85 hours across ~12 weekends (~3 months)**

### Milestones

**End of Month 1 (Phase 1-4):** The game exists. An isometric city with roads, buildings, walking citizens, and driving cars. No habits yet — pure builder mode. Playable on iPhone.

**End of Month 2 (Phase 5-8):** The full loop works. Complete habits → earn XP → level up → get coins → build your city. Music plays, sounds are satisfying, UI feels like a game. Around Level 8-10 ("Steady" to "Driven").

**End of Month 3 (Phase 9-11):** Cloud-synced, installable PWA with stats tracking. The polished product. Open it on Monday morning, check off "Wake up at 6:30 AM," hear the chime, see +15 XP animate, watch your city grow.

**End of Month 6:** Thriving city with multiple districts. Level 25+ ("Architect"). Stats show 75+ gym sessions, 12+ books. Waterfront unlocked.

**End of Year 1:** Level 50 "Zenith." Full city with landmarks, airport, skyscrapers. A year of discipline visualized as a metropolis you built, one habit at a time.

---

## Design Principles

1. **Game first, app second.** It should feel like opening a game, not a productivity app. The city IS the dashboard.
2. **10-second check-in.** Open app → tap habits overlay → check off → close. Back to your city in 10 seconds.
3. **Beautiful and fast.** 60fps on iPhone. Mobile-first always. No jank.
4. **Reward, don't punish.** Missing a day = missing XP/coins + streak loss. Never lose earned progress or buildings.
5. **Progressive discovery.** New building tiers unlock with levels. Can't peek ahead. Curiosity drives consistency.
6. **Meaningful numbers.** Every stat maps to a real achievement. "47 gym sessions" means something. Your city IS the visualization.
7. **One consistent style.** All visual assets from one artist. No Frankenstein aesthetics.

---

## Technical Architecture Notes

### Game-React Boundary

- PixiJS canvas is the full-screen base layer
- Game HUD (level, coins, streaks, toolbar) rendered as PixiJS sprites ON the canvas
- Habit check-in, settings, stats rendered as React overlays ABOVE the canvas (slide-up panels)
- Zustand store bridges both worlds: React writes habit data, PixiJS reads player state for rendering

### Isometric Math Reference

```
// Grid to screen
screenX = (col - row) * (tileWidth / 2)
screenY = (col + row) * (tileHeight / 2)

// Screen to grid
col = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2
row = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2
```

### Depth Sorting Rule

All sprites sorted by `(row + col)`. Higher value = rendered later (on top). Moving entities re-sort every frame.

### Auto-Tiling Bitmask

Each road tile checks 4 neighbors. Each neighbor is a bit (N=1, E=2, S=4, W=8). The 4-bit value (0-15) maps to a sprite variant. 16 total variants cover every combination.

---

## Next Steps

1. ✅ Finalize this master plan (you are here)
2. 🔲 Purchase Penzilla City Builder Bundle ($14.99)
3. 🔲 Download free packs (GUI, Towball music, Shapeforms SFX)
4. 🔲 Set up Next.js project + Vercel deployment
5. 🔲 Install PixiJS, Zustand, Dexie.js
6. 🔲 Build Phase 1 — isometric grid with camera controls
7. 🔲 Test on iPhone via Vercel preview URL
8. 🔲 Iterate through phases weekend by weekend
