# HabitVille — MVP Sprint Plan

## Document Purpose

This document is the single source of truth for the HabitVille MVP sprint. Every milestone becomes a GitHub Milestone. Every task becomes a GitHub Issue. The descriptions here are the issue descriptions. Nothing is left to interpretation — if it's not in this document, it's not in the sprint.

---

## What Already Exists

The following is already built and is NOT part of this sprint:

- Isometric city renderer (PixiJS 8 on HTML canvas)
- Grid-based tile placement system (tap/drag assets onto the map)
- Build toolbar with category tabs (Roads, Homes, Shops, Public, Decor)
- Penzilla GiantCityBuilder sprite pack integrated (buildings, roads, tiles, decor, NPCs, GUI)
- 37 NPC character sprites available in the sprite pack
- Dexie.js (IndexedDB) for local persistence
- Zustand for global state management bridging React ↔ PixiJS
- Next.js 16 + React 19 + TypeScript app scaffold
- PWA setup (service worker + manifest)
- Vercel deployment + ngrok dev tunneling
- NPC pathfinding system (A\* grid-based, being completed independently)

## What This Sprint Builds

Everything on top of the existing city builder to make it a complete gamified habit tracker:

- Habit CRUD + scheduling system
- Daily check-in with swipe card UI
- Full economy engine (XP, Coins, levels, bonuses, streaks)
- Shop & asset unlock system
- City HUD with live counters
- Analytics & weekly report
- Population system tied to housing
- Celebrations & reward animations
- Navigation & mode switching

## Key Decisions (Locked)

- **Demolish = full coin refund.** Removing a placed asset returns 100% of its coin price. No depreciation.
- **Backfill = entire current week.** Users can check in habits for any day in the current week (Monday–Sunday), not just yesterday.
- **City expansion is DEFERRED.** Not planned, not designed, not in any milestone. The map stays at its initial size for MVP.
- **Reflection prompts are REMOVED.** The weekly report does not include reflection questions.
- **Random 2x XP events are low priority.** Implemented last within the sprint. If time runs out, this is the first feature to cut.
- **Pathfinding is handled independently.** This plan assumes NPC movement on the map is already working. The sprint only handles population counting and NPC spawn triggers.
- **Mobile-first PWA.** All UI is designed for iPhone PWA as the primary target. Desktop is supported but secondary.
- **Offline-first.** All data lives in Dexie (IndexedDB). Supabase sync is planned architecturally but built post-MVP.
- **All economy values driven by config.yml.** Zero hardcoded numbers in game logic.

---

## Milestone 1: Data Layer & Economy Engine

**Goal:** Build the entire backend logic layer with zero UI. Pure TypeScript services, Dexie schema, Zustand stores. Everything is testable in isolation.

**Why first:** Every other milestone depends on this. The economy must be correct before any UI renders rewards.

---

### 1.1 — Dexie Schema Design

Define all IndexedDB tables. Schema must be designed with future Supabase sync in mind: use UUIDs as primary keys, include `createdAt` and `updatedAt` timestamps on every record, include a `syncedAt` nullable field for future sync tracking.

**Tables:**

**`habits`**

- `id` (UUID, primary key)
- `name` (string)
- `category` (enum: Health, Fitness, Learning, Productivity, Mindfulness, Social, Other)
- `difficulty` (enum: easy, medium, hard)
- `frequency` (object: { type: daily | times_per_week | specific_days | weekly | monthly, value?: number, days?: string[] })
- `timeOfDay` (enum: morning, afternoon, evening, anytime — default: anytime)
- `startDate` (ISO date string, nullable — null means immediately active)
- `endDate` (ISO date string, nullable — null means no end)
- `archived` (boolean, default false)
- `createdAt`, `updatedAt` (ISO timestamps)
- `sortOrder` (number — for preserving creation order within same time-of-day group)

**`checkIns`**

- `id` (UUID, primary key)
- `habitId` (FK to habits)
- `date` (ISO date string, YYYY-MM-DD — the day this check-in counts for)
- `completed` (boolean)
- `skipped` (boolean)
- `xpEarned` (number — total XP including any bonuses for this specific check-in)
- `coinsEarned` (number — total Coins including any bonuses for this specific check-in)
- `surpriseBonusTriggered` (boolean)
- `doubleXpEventActive` (boolean)
- `createdAt`, `updatedAt`

**`playerProfile`** (single row — only one player per device)

- `id` (UUID, primary key)
- `totalXP` (number — lifetime cumulative, never resets)
- `currentLevel` (number — derived from totalXP but stored for quick access)
- `totalCoins` (number — lifetime earned)
- `spentCoins` (number — lifetime spent)
- `currentCoins` (computed: totalCoins - spentCoins, but stored for quick reads)
- `population` (number — total residents from all placed housing)
- `firstUseDate` (ISO date — for first-week boost calculation)
- `dontShowCheckInToday` (ISO date string or null — the date for which check-in auto-popup is suppressed)
- `createdAt`, `updatedAt`

**`inventory`**

- `id` (UUID, primary key)
- `assetId` (string — references asset catalog)
- `quantity` (number — how many the player owns but hasn't placed)
- `totalPurchased` (number — lifetime count, for stats)
- `createdAt`, `updatedAt`

**`placedAssets`**

- `id` (UUID, primary key)
- `assetId` (string — references asset catalog)
- `gridX` (number)
- `gridY` (number)
- `colorVariant` (number, nullable — for houses with color variants)
- `createdAt`

**`weeklySnapshots`**

- `id` (UUID, primary key)
- `weekStart` (ISO date, Monday)
- `weekEnd` (ISO date, Sunday)
- `completionPercentage` (number 0–100)
- `totalScheduledTasks` (number)
- `totalCompletedTasks` (number)
- `baseXPEarned` (number)
- `baseCoinsEarned` (number)
- `bonusXPEarned` (number)
- `bonusCoinsEarned` (number)
- `weeklyBonusMultiplier` (number)
- `weeklyBonusXP` (number)
- `weeklyBonusCoins` (number)
- `delivered` (boolean — whether the weekly report has been shown)
- `createdAt`

**Indexes:** `checkIns` indexed by `[habitId+date]` (compound) and by `date`. `habits` indexed by `archived`. `weeklySnapshots` indexed by `weekStart`. `inventory` indexed by `assetId`. `placedAssets` indexed by `assetId`.

---

### 1.2 — Config Loader

Parse `config.yml` at build time into a typed TypeScript config object. This is the single source of truth for all economy numbers.

- Read config.yml during the Next.js build step (or import as a static module).
- Export a fully typed `GameConfig` object with nested types matching the YAML structure.
- All services import from this config — no magic numbers anywhere.
- Type definitions for: `DifficultyTier`, `FrequencyOption`, `LevelTier`, `BonusConfig`, `AssetCategory`, `PopulationConfig`, `CheckInConfig`, `StreakConfig`, `CelebrationConfig`.

---

### 1.3 — Economy Engine (Pure Functions)

A service module exporting pure functions for all reward calculations. No side effects, no state mutations — just math.

**Functions:**

- `calculateBaseReward(difficulty: Difficulty)` → `{ xp: number, coins: number }` — Looks up base values from config per difficulty tier.

- `rollSurpriseBonus()` → `boolean` — 20% chance roll. Returns true/false.

- `calculateSurpriseBonus(baseReward)` → `{ xp: number, coins: number }` — Returns 100% of base reward as bonus (effectively doubles it).

- `isFirstWeekBoostActive(firstUseDate: Date, currentDate: Date)` → `boolean` — True if currentDate is within 7 days of firstUseDate.

- `applyFirstWeekBoost(xp: number)` → `number` — Doubles base per-task XP only. Does not affect Coins, daily bonuses, or weekly bonuses.

- `rollDoubleXPEvent(averagePerWeek: number)` → `boolean` — Probabilistic roll based on config `average_per_week: 1.5`. Called once per check-in session.

- `applyDoubleXPEvent(xp: number)` → `number` — Doubles base per-task XP for the session.

- `calculateCheckInReward(difficulty, options: { surpriseBonus: boolean, firstWeekActive: boolean, doubleXPActive: boolean })` → `{ xp: number, coins: number, breakdown: object }` — Master function that composes all per-task bonuses. Returns total XP + Coins for a single habit check-in plus a breakdown for display.

- `checkDailyPerfectDay(date: Date, scheduledHabits: Habit[], checkIns: CheckIn[])` → `{ earned: boolean, xp: number, coins: number }` — Returns 50 XP + 30 Coins if every scheduled habit for that date is completed.

---

### 1.4 — Leveling Engine

Handles level progression from XP. Levels and totalXP are both stored on `playerProfile`. Recalculation only happens when new XP is earned.

**Functions:**

- `getLevelFromXP(totalXP: number)` → `number` — Walks the tier table from config to determine current level.

- `getXPForLevel(level: number)` → `number` — Total cumulative XP required to reach a given level.

- `getXPProgressInCurrentLevel(totalXP: number)` → `{ current: number, required: number, percentage: number }` — How much XP the user has toward the next level.

- `detectLevelUps(oldXP: number, newXP: number)` → `{ levelsGained: number[], newLevel: number, unlockedAssets: Asset[] }` — Given old and new XP totals, returns all levels crossed and all assets that unlock at those levels. This is the key function called after every XP award.

**Rules:**

- Level is stored on playerProfile and updated whenever XP changes.
- Levels beyond 150 continue using the last tier's XP requirement (1,500 per level). No cap on leveling.
- `detectLevelUps` returns an array of levels gained (could be multiple in one check-in session if bonuses are high) and the full list of assets unlocked across all those levels.

---

### 1.5 — Weekly Consistency Engine

Runs at end-of-week (Sunday) or on-demand for projected bonus display.

**Functions:**

- `getScheduledHabitsForDate(date: Date, habits: Habit[])` → `Habit[]` — Given a date, returns which habits are scheduled based on each habit's frequency config. Respects start/end dates.

- `getScheduledHabitsForWeek(weekStart: Date, habits: Habit[])` → `Map<string, Habit[]>` — Returns scheduled habits per day for the full week (Mon–Sun).

- `calculateWeeklyCompletion(weekStart: Date, habits: Habit[], checkIns: CheckIn[])` → `{ percentage: number, completed: number, total: number, perHabit: Map<habitId, { completed: number, scheduled: number }> }` — The core weekly calculation.

- `getWeeklyBonusMultiplier(percentage: number)` → `number` — Looks up the multiplier from config tier table.

- `calculateWeeklyBonus(baseXP: number, baseCoins: number, multiplier: number)` → `{ xp: number, coins: number }` — Multiplier applied to the week's total base per-task earnings (before any other bonuses).

- `generateWeeklySnapshot(weekStart: Date, ...)` → `WeeklySnapshot` — Compiles all weekly data into a snapshot record for Dexie storage.

---

### 1.6 — Streak Engine

Per-habit streak tracking. Informational only — no gameplay consequences.

**Functions:**

- `calculateCurrentStreak(habitId: string, checkIns: CheckIn[], habit: Habit)` → `number` — Count consecutive scheduled-day completions going backward from today. Only counts days the habit was scheduled (based on frequency). A non-scheduled day does not break the streak.

- `calculateLongestStreak(habitId: string, checkIns: CheckIn[], habit: Habit)` → `number` — Longest streak ever achieved for this habit.

- `checkStreakMilestone(currentStreak: number)` → `number | null` — If the streak just crossed a milestone threshold (7, 14, 30, 60, 90, 180, 365), return that threshold. Otherwise null.

---

### 1.7 — Asset Catalog Generator

A build-time script that generates the master asset-to-level mapping. Output is a static JSON file imported by the app.

**Process:**

1. Read all asset categories from config (houses: 20 types, apartments: 54, public: 82, restaurants: 32, shopping: 68, vehicles: 102, plants: 82, decorations: 140, fences: 33).
2. For each category, distribute its types evenly across its unlock level range (e.g., houses span level 1–60, so ~1 house type every 3 levels).
3. Assign prices within the category's price range, scaling with unlock level (earlier = cheaper, later = more expensive).
4. For houses: each type entry includes `colorVariants: 8`. Unlocking the type unlocks all 8 colors.
5. Map each asset to its sprite key from the Penzilla pack.
6. Output: `assetCatalog.json` — array of `{ assetId, category, name, spriteKey, unlockLevel, price, colorVariants?: number }`.
7. Roads are always available (level 1, price 0) and handled separately.

**Total assets:** ~613 distinct types (excluding color variants and roads).

---

### 1.8 — Zustand Stores

Global state stores that bridge React UI and game logic. These read from/write to Dexie and expose reactive state to components.

**`usePlayerStore`**

- State: `xp`, `coins`, `level`, `totalPoints`, `population`, `firstUseDate`, `dontShowCheckInToday`
- Actions: `addXP(amount)`, `addCoins(amount)`, `spendCoins(amount)`, `setPopulation(count)`, `setDontShowCheckInToday(date)`, `initialize()` (loads from Dexie on app start)

**`useHabitStore`**

- State: `habits[]`, `todayCheckIns[]`
- Actions: `createHabit(data)`, `updateHabit(id, data)`, `archiveHabit(id)`, `checkIn(habitId, date)`, `skipHabit(habitId, date)`, `getScheduledForDate(date)`, `getCheckInsForDate(date)`, `getCheckInsForWeek(weekStart)`

**`useInventoryStore`**

- State: `ownedAssets[]`, `placedAssets[]`
- Actions: `purchaseAsset(assetId, colorVariant?)`, `placeAsset(assetId, gridX, gridY, colorVariant?)`, `demolishAsset(placedAssetId)`, `grantFreeAsset(assetId)`, `getAvailableForPlacement()` (qty > 0 items)

**`useGameStore`**

- State: `currentMode` (build | view), `activeScreen` (city | checkin | shop | stats | weeklyReport), `pendingRewards[]` (queue of animations to show), `doubleXPEventActive`, `firstWeekBoostActive`
- Actions: `toggleBuildMode()`, `openScreen(screen)`, `queueReward(reward)`, `dequeueReward()`, `setDoubleXPEvent(active)`

---

## Milestone 2: Habit Management

**Goal:** Full CRUD for habits with a beautiful mobile-first UI. Users can create, edit, archive, and list their habits. Includes first-time onboarding.

---

### 2.1 — Create Habit Screen

Full-screen form for creating a new habit. Mobile-optimized with large tap targets, smooth transitions between fields, and clear visual hierarchy.

**Fields:**

- **Name** — Text input, required. Placeholder: "e.g., Go to the gym"
- **Category** — Picker with themed icons for each category (Health, Fitness, Learning, Productivity, Mindfulness, Social, Other). Each category has a distinct color and icon. Selecting one applies the theme color to the card preview.
- **Frequency** — Segmented selector:
  - Daily (default)
  - X times per week → shows a number stepper (1–7)
  - Specific days → shows day-of-week checkboxes (Mon–Sun)
  - Weekly (once per week)
  - Monthly (once per month)
- **Difficulty** — Three large selectable cards:
  - Easy — with description from config: "Low effort, low friction..."
  - Medium — "Moderate effort, requires some discipline..."
  - Hard — "Significant effort, high discipline..."
  - Show the XP + Coin reward for each tier on the card so users see what they'll earn.
- **Time of Day** — Optional selector: Morning, Afternoon, Evening, Anytime (default).
- **Start/End Dates** — Hidden by default. A toggle labeled "Set start/end date" reveals two date pickers:
  - Start date: when this habit becomes active (defaults to today if toggled on)
  - End date: when this habit stops appearing in check-ins (optional, can be left empty)
- **Save button** — Creates the habit, writes to Dexie, updates Zustand, returns to habit list with a success animation.

---

### 2.2 — Habit List View

Scrollable list of all active (non-archived) habits. This is accessible from a settings/management area, NOT the daily check-in.

**Per habit row:**

- Category icon + color accent
- Habit name
- Difficulty badge (Easy/Medium/Hard)
- Frequency label (e.g., "Daily", "3x/week", "Mon/Wed/Fri")
- Current streak count with small flame/streak icon
- Tap → opens Edit Habit screen
- Swipe left → reveals Archive button

**Empty state:** If no habits exist, show a friendly prompt to create the first one.

**Soft warning:** If habit count exceeds 10 (`soft_warning_threshold` from config), show a gentle inline banner: "You have a lot of habits! Research shows 3–5 is the sweet spot for consistency."

---

### 2.3 — Edit Habit Screen

Same layout as Create Habit, pre-filled with existing values. All fields are editable: name, category, frequency, difficulty, time of day, start/end dates.

**Archive option:** A small "Archive this habit" link at the bottom of the edit screen. Archives the habit (soft-delete: sets `archived: true`). Archived habits stop appearing in check-ins but their historical data is preserved for stats.

**Delete:** No hard delete in MVP. Archive only.

---

### 2.4 — Onboarding Flow

Triggered on first app launch (when `playerProfile` doesn't exist in Dexie).

**Flow:**

1. **Welcome screen** — Brief animated intro. App name, tagline ("Your habits build your city"), a preview of an isometric city. Single "Get Started" CTA.
2. **Create your first habits** — Guided version of the Create Habit screen. Pre-suggest 2–3 common habits (e.g., "Drink water" as Easy, "Read for 20 min" as Medium, "Gym session" as Hard). User can customize or skip suggestions. Encourage creating 3–5 habits. Show "You can always add more later."
3. **Quick tutorial overlay** — 3 brief tips shown over the city view: (a) "Tap the check-in button to complete daily habits" (b) "Earn XP and Coins to level up and buy buildings" (c) "Build your dream city as you grow your habits." Each tip is dismiss-on-tap, max 3 screens.
4. **Initialize playerProfile** — Create the profile in Dexie with level 1, 0 XP, 0 Coins, firstUseDate = now.

---

## Milestone 3: Daily Check-In System

**Goal:** The core 10-second daily interaction. Tinder-style swipe cards, instant reward feedback, beautiful animations. This is the heartbeat of the app — it must feel incredible.

---

### 3.1 — Check-In Card Stack (Swipe UI)

A full-screen card stack for today's scheduled habits. Opens from the bottom-right floating button or auto-opens on app launch (unless suppressed).

**Card stack behavior:**

- One card visible at a time, with the next card peeking slightly behind.
- **Swipe right** = complete the habit. Card flies off to the right with a satisfying spring animation.
- **Swipe left** = skip/later. Card flies off to the left, dimmed. No penalty, no reward.
- Cards have slight rotation during drag for a natural feel.
- After the last card, the stack is cleared and the check-in screen shows a summary.

**Card content:**

- Habit name (large, prominent)
- Category icon + color accent
- Difficulty badge
- Monthly progress stat: e.g., "14/20 this month" or a mini progress ring showing this month's completion rate
- Current streak count (small, bottom of card)

**Card sort order:**

- Primary: time of day (morning → afternoon → evening → anytime)
- Secondary: creation order (`sortOrder` field) within the same time-of-day group

**"Don't show today" checkbox:**

- Located at the bottom of the check-in screen (below the card stack).
- When checked: store today's date in `playerProfile.dontShowCheckInToday`.
- Effect: the check-in screen does NOT auto-open on app launch for the rest of this day. The bottom-right button still works for manual access.
- Resets daily: on each app open, if `dontShowCheckInToday !== today`, auto-open logic applies normally.

**Auto-open logic:**

- On app launch, if there are pending (uncompleted, unskipped) habits for today AND `dontShowCheckInToday !== today` → open check-in screen automatically.
- If all habits are done or user opted out → go straight to city view.

---

### 3.2 — Backfill (Current Week)

Users can check in habits for any day in the current week (Monday through today). Not just yesterday.

**UI:** At the top of the check-in screen, show day tabs or a horizontal scrollable date strip for the current week (Mon–Sun). Today is selected by default. Tapping a past day loads that day's scheduled habits as a card stack. Future days are disabled.

**Rules:**

- A past day's card stack shows only habits that were scheduled for that day AND haven't been checked in yet.
- Backfilled check-ins earn the same base XP + Coins as same-day completions.
- Backfilled check-ins count toward the weekly consistency calculation.
- Backfilled check-ins count toward streaks (the scheduled-day streak logic handles this naturally).
- The daily perfect day bonus can be earned retroactively via backfill if all habits for that past day are completed.
- Surprise bonus rolls happen on backfilled check-ins just like real-time ones.

---

### 3.3 — Reward Celebration Component (Reusable)

A single reusable overlay component for all reward/celebration moments across the entire app. Inspired by Subway Surfers chest opening.

**Component: `RewardReveal`**

**Behavior:**

- Full-screen semi-transparent overlay.
- Content item grows in from center with a scale + bounce animation.
- Glow/particle effect behind the item.
- Text label appears below (e.g., "+30 XP", "Level Up!", "New Asset Unlocked!").
- Dismiss on tap anywhere.
- Supports a **queue**: multiple rewards are shown sequentially. After dismissing one, the next appears.

**Variants (controlled by props):**

| Variant           | Content                                               | Animation                                                                   |
| ----------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| XP Earned         | XP icon + amount                                      | Grows in center → floats up to HUD XP bar position → HUD bar glows/sparkles |
| Coins Earned      | Coin icon + amount                                    | Grows in center → floats up to HUD coin counter → counter glows/sparkles    |
| Surprise Bonus    | Treasure chest that opens → reveals double XP + Coins | Chest shake → open → coins burst out                                        |
| Level Up          | Large level number with confetti/particles            | Number zooms in → confetti burst → shows unlocked assets list               |
| Asset Unlocked    | Asset sprite grows + glows                            | Sprite scales up with glow → "Unlocked!" text → "Free copy added!"          |
| Streak Milestone  | Badge icon with streak number                         | Badge stamps in → streak number appears → small confetti                    |
| Weekly Bonus      | Coin stack with multiplier text                       | Stack builds up → multiplier badge slams in                                 |
| Daily Perfect Day | Star/checkmark icon                                   | Star grows → "Perfect Day!" text → XP + Coins added                         |

**Queue system:** `useGameStore.pendingRewards[]` holds an ordered array of reward objects. The component renders the first item. On dismiss, `dequeueReward()` removes it, and the next item renders. When the queue is empty, the overlay closes.

---

### 3.4 — Check-In Reward Flow

The specific sequence that plays when a user swipes right to complete a habit.

**Sequence:**

1. Card swipes off to the right.
2. Calculate reward using `calculateCheckInReward()`.
3. If surprise bonus triggered (20% chance): queue Surprise Bonus variant first.
4. Queue XP Earned reward: shows "+X XP" growing in center → animates up to HUD XP bar. The HUD XP bar icon grows slightly in size and sparkles for ~1 second.
5. Queue Coins Earned reward: shows "+X Coins" growing in center → animates up to HUD coin counter. The HUD coin icon grows slightly and sparkles for ~1 second.
6. Persist the check-in to Dexie immediately.
7. Update Zustand stores (playerStore.addXP, playerStore.addCoins, habitStore.checkIn).
8. If level-up detected (via `detectLevelUps`): queue Level Up reward. This shows after the XP/Coins animations.
9. If level-up unlocked new assets: queue one Asset Unlocked reward per new asset type (each dismiss reveals the next).
10. If this was the last scheduled habit for today AND all are completed: check daily perfect day → if earned, queue Daily Perfect Day reward.
11. If a streak milestone was just crossed: queue Streak Milestone reward.

**Important:** XP and Coins animations (steps 4–5) should be fast and fluid — they happen on every single check-in, so they must not feel heavy. ~0.8 seconds each. The special rewards (surprise, level-up, asset unlock) are less frequent and can take longer (~1.5 seconds each).

---

### 3.5 — Random 2x XP Event

**Priority: Low — implement last in the sprint.**

On opening the check-in screen for a session, roll for a 2x XP event using `rollDoubleXPEvent()`.

- If active: show a glowing "⚡ 2x XP" banner at the top of the check-in screen before the user starts swiping. The banner persists throughout the session.
- All per-task base XP during this session is doubled (via the `doubleXPActive` flag passed to `calculateCheckInReward`).
- Does NOT affect Coins, daily bonuses, or weekly bonuses.
- The 2x applies on top of the first-week boost if both are active (so first week + 2x event = 4x per-task XP).
- Frequency: configured as `average_per_week: 1.5` in config. Implementation: each session has a probability of `1.5 / 7 ≈ 21.4%` of triggering.

---

### 3.6 — First-Week Boost Indicator

If the current date is within 7 days of `playerProfile.firstUseDate`:

- Show a persistent "🚀 2x XP BOOST — First Week!" banner on the check-in screen.
- All per-task base XP is automatically doubled via `isFirstWeekBoostActive()` check in the reward calculation.
- This stacks with the random 2x XP event if both are active.

---

### 3.7 — Check-In Session Summary

After all cards have been swiped (or dismissed), show a brief session summary before returning to the city.

**Content:**

- Total XP earned this session
- Total Coins earned this session
- Habits completed: X/Y
- If all completed: "Perfect check-in! 🎯" (or similar)
- "Return to City" button

This is a simple static screen, not a RewardReveal animation. It provides closure to the check-in session.

---

## Milestone 4: Shop & Unlock System

**Goal:** A full-screen, gaming-inspired store where users spend Coins on city assets. Beautiful UI, clear lock/unlock states, category browsing, house color picker.

---

### 4.1 — Shop Screen (Full-Screen Store)

A dedicated full-screen page (not a modal) for browsing and purchasing assets. Gaming-inspired design — think clash-of-clans or any modern mobile game store. Rich, polished, dark or themed background, with clear visual hierarchy.

**Layout:**

- **Header:** "Shop" title, current Coin balance (with coin icon, always visible), close/back button.
- **Category tabs:** Horizontal scrollable tab bar below the header. Tabs: Houses, Apartments, Public, Restaurants, Shopping, Vehicles, Plants, Decorations, Fences. Active tab is highlighted. Tapping a tab smoothly scrolls/switches to that category's grid.
- **Asset grid:** Below the tabs, a scrollable grid of asset cards for the selected category. 3 columns on mobile, 4–5 on desktop. Each card is square with the asset sprite centered.

**Asset card states:**

| State                        | Visual Treatment                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Unlocked + affordable**    | Full-color sprite. Price tag at bottom. "Buy" button or tap-to-buy.                                                  |
| **Unlocked + already owned** | Full-color sprite. "Owned ×N" badge (top-right). Price tag still shown for buying more.                              |
| **Unlocked + can't afford**  | Sprite visible but slightly dimmed. Price shown in red. Buy button disabled/greyed.                                  |
| **Locked**                   | Sprite shown as silhouette or heavily blurred. Lock icon overlay. "Level X" label.                                   |
| **Newly unlocked (NEW)**     | Full-color sprite with a "NEW" badge (glowing/pulsing). Shown for recently unlocked items until the user views them. |

**Mobile-first:** Cards are large enough to tap comfortably. Scrolling is smooth. The shop feels like a premium experience.

**Desktop:** Grid expands to use available width. Same design language, just more columns.

---

### 4.2 — House Color Picker

Houses have 8 color variants per type. The shop shows the primary variant in the grid. On tapping a house:

- An expanded detail view / bottom sheet opens.
- Shows the house sprite larger.
- Below it: a horizontal strip of 8 color swatches or small preview thumbnails.
- Tapping a color switches the displayed sprite to that variant.
- Buy button purchases the selected color variant.
- All 8 variants are available as soon as the house type is unlocked.

---

### 4.3 — Purchase Flow

When the user taps "Buy" on an affordable, unlocked asset:

1. Brief confirmation (optional for cheap items, required for 300+ Coin purchases): "Buy [Asset Name] for X Coins?"
2. On confirm: deduct Coins via `usePlayerStore.spendCoins(price)`.
3. HUD coin counter animates down (drain animation).
4. Asset added to `inventory` (increment quantity) via `useInventoryStore.purchaseAsset(assetId)`.
5. Brief success feedback: checkmark animation on the card, "Owned ×N" badge updates.
6. Persist to Dexie immediately.

---

### 4.4 — Free Unlock Grant on Level-Up

When a level-up unlocks new asset types (determined by `detectLevelUps()`):

1. For each newly unlocked asset: call `useInventoryStore.grantFreeAsset(assetId)` which adds 1 to inventory at zero cost.
2. In the shop, these items get the "NEW" badge until the user opens the shop (or after 24 hours, whichever is first).
3. The asset unlock is celebrated via the RewardReveal component (queued during the check-in reward flow in Milestone 3).

---

### 4.5 — Inventory Bridge to Build Toolbar

The existing build toolbar must now be driven by inventory data.

**Rules:**

- The build toolbar only shows assets where `inventory.quantity > 0` for that asset.
- Roads remain always available (free, unlimited).
- When the user places an asset on the grid: decrement `inventory.quantity` by 1, create a `placedAssets` record.
- When the user demolishes a placed asset: delete the `placedAssets` record, increment `inventory.quantity` by 1, refund the full asset price via `usePlayerStore.addCoins(price)`. The coin counter in the HUD animates up.
- The toolbar categories should mirror the shop categories for consistency.

---

## Milestone 5: City HUD & Navigation

**Goal:** The persistent UI layer on top of the city view. Always-visible stats, mode switching, and the navigation structure that ties all screens together.

---

### 5.1 — Top HUD Bar

A persistent overlay at the top of the city view. Always visible in both build and view modes. Styled as a game HUD — think glassmorphism, subtle gradients, or a clean game-UI bar. NOT a generic web header.

**Contents (left to right):**

- **Level badge** — Circular or shield-shaped badge showing current level number. Subtle glow or border color that changes by level tier.
- **XP progress bar** — Horizontal bar showing progress toward the next level. Filled portion is animated. **Tappable:** on tap, show a small tooltip/popup: "1,234 / 2,000 XP to Level 23" (current XP in level / XP required for this level).
- **Coin counter** — Coin icon + current balance number. Animated on change (count-up/down animation).
- **Population counter** — Small people icon + total population number.

**Animation behavior:**

- When XP is earned: the XP bar fills smoothly. The bar and its icon briefly grow in scale (~110%) and emit a sparkle/glow effect for ~1 second.
- When Coins are earned: the coin counter number counts up. The coin icon briefly grows (~110%) and sparkles for ~1 second.
- When Coins are spent: the counter counts down. Brief subtle red flash or drain effect.
- Level-up: the level badge animates (scale up, glow, maybe a small burst) before the full-screen level-up RewardReveal takes over.

---

### 5.2 — Build/View Mode Toggle

A button located at the **bottom-left** of the screen.

- **View mode** (default): Clean city view. No grid overlay, no toolbar. Just the city in all its glory.
- **Build mode**: Grid overlay becomes visible. Asset placement toolbar appears at the bottom. Full building functionality.
- Toggle button: icon switches between a hammer/wrench (build) and an eye (view). Smooth transition animation between modes (toolbar slides up/down, grid fades in/out).

---

### 5.3 — Check-In Floating Button

A floating action button at the **bottom-right** of the screen. Always visible on the city view.

**Appearance:**

- Circular button with a checkmark or calendar icon.
- **Badge:** shows the number of pending (uncompleted, unskipped) habits for today. Badge is a small red/orange circle with the count. If zero pending, no badge.
- Tapping opens the check-in screen (Milestone 3).

**Auto-open:** On app launch, if pending habits exist and "Don't show today" is not active, the check-in screen opens automatically instead of requiring the button tap.

---

### 5.4 — Check-In Screen: Daily / Weekly Toggle

The check-in screen (opened from the floating button) has two views, switchable via a tab/toggle at the top:

**Daily tab (default):**

- The swipe card stack for today (or selected backfill day).
- Day selector strip for backfill (current week).
- This is the core check-in experience from Milestone 3.

**Weekly tab:**

- A 7-column grid representing Mon–Sun of the current week.
- Each column shows: day name, date, and a list of that day's scheduled habits.
- Each habit shows: name, completion status (checkmark / empty / skipped).
- Tapping a habit from a past/current day: marks it as completed (same as swiping right in daily view) with reward flow.
- Tapping a habit name/row opens the Edit Habit screen for that habit (full edit: name, frequency, difficulty, etc.).
- Color coding: completed days have a green tint, partial days are amber, empty days are neutral.
- Shows the current week's completion percentage and projected weekly bonus tier at the bottom.

---

### 5.5 — Navigation Structure

The city view is the home screen. All other screens are overlays or full-screen pages accessible from the city.

**Access points:**

- **Check-in** → Bottom-right floating button (or auto-open).
- **Shop** → Accessible from a menu button. (Top-right hamburger or a small shop icon in the HUD.)
- **Stats** → Accessible from the same menu.
- **Habit Management** (list/create/edit) → Accessible from the same menu or from the weekly view's edit action.
- **Settings** → Accessible from the menu. Minimal for MVP: just a sound toggle and "About" info.

**Menu style:** A slide-out drawer or a bottom sheet with icon + label buttons for: Shop, Stats, Habits, Settings.

**Transitions:** All screen changes should have smooth slide or fade transitions. No hard cuts.

---

## Milestone 6: Analytics & Weekly Report

**Goal:** Progress visibility through stats and the weekly celebration report. Users should always know how they're doing and feel rewarded for consistency.

---

### 6.1 — Weekly City Report

A full-screen report that triggers automatically. This is both a review and a reward event.

**Trigger:** On first app open where the current time is past Sunday 21:00 AND no weekly snapshot exists for the just-completed week AND `weeklySnapshot.delivered === false`. If the app isn't opened until Monday or later, it still triggers on next open.

**Content (scrollable single page):**

1. **Header:** "Weekly City Report" + the date range (e.g., "Feb 24 – Mar 2").
2. **Overall completion percentage** — Large, bold number with a circular progress ring. Color-coded: green (80%+), amber (60–79%), red (below 60%).
3. **Per-habit breakdown** — Each habit listed with its own mini progress bar: X/Y completed. Sorted by completion rate (best first).
4. **XP earned this week** — Total, with breakdown: base tasks, daily bonuses, surprise bonuses.
5. **Coins earned this week** — Total, same breakdown.
6. **Weekly consistency bonus** — The big reveal. Shows the multiplier earned (e.g., "2.5x Bonus!"). Then shows the bonus XP + Coins awarded. Delivered via RewardReveal animation (the weekly bonus variant). This is the climax of the report.
7. **Dismiss button** — "Continue" or "Back to City."

**On trigger:**

1. Run `calculateWeeklyCompletion()` and `calculateWeeklyBonus()`.
2. Award the weekly bonus XP + Coins to the player profile.
3. Save the `weeklySnapshot` to Dexie with `delivered: true`.
4. Check if the bonus XP triggered any level-ups → queue those rewards after the report is dismissed.

---

### 6.2 — Stats Screen: This Week

Accessible anytime from the menu. Shows the current in-progress week.

**Content:**

- **Today's check-in status** — List of today's scheduled habits with done/pending/skipped status.
- **Weekly completion %** — Progress toward this week's total. "18/33 habits completed (55%)."
- **Projected weekly bonus** — Based on current pace: "If you maintain this pace: 1.5x bonus (~855 XP, ~465 Coins)." Updates live as habits are completed.
- **XP earned this week** — Running total for the week so far (base + bonuses earned so far, excluding weekly bonus which hasn't been calculated yet).
- **Coins earned this week** — Same running total.

---

### 6.3 — Stats Screen: Monthly

Calendar heatmap and per-habit analysis for the current month.

**Content:**

- **Calendar heatmap** — A 5-row × 7-column grid for the month. Each day cell is color-coded by completion rate: dark green (100%), medium green (70%+), light green (50%+), light grey (below 50%), empty/white (0% or no habits scheduled). Tapping a day could show a detail tooltip.
- **Per-habit completion rates** — Each habit with a horizontal progress bar: "Gym: 18/22 (82%)", "Read: 25/30 (83%)". Sorted by rate.
- **Trend vs last month** — Arrow icon: ↑ improved, → same, ↓ declined. Comparison of overall completion percentage. "72% this month vs 68% last month (↑ 4%)."
- **Monthly XP + Coins** — Totals for the month.

---

### 6.4 — Stats Screen: All Time

Lifetime stats and records.

**Content:**

- **Current level + XP bar** — Same as HUD but larger. Shows level number, XP bar with numbers, percentage to next level.
- **Total lifetime points** — Large number. This is the bragging right number (same as total XP, displayed as "Points").
- **Total Coins earned** — Lifetime.
- **Total Coins spent** — Lifetime.
- **Current Coin balance** — (earned - spent).
- **Longest streak per habit** — Each habit with its record streak. Sorted by longest first.
- **Total habits completed** — Lifetime count of all successful check-ins.
- **City value** — Sum of the Coin price of every asset currently placed on the map. A vanity metric — "Your city is worth 12,450 Coins."

---

## Milestone 7: Population & Housing Integration

**Goal:** Placed housing generates population. Population counter updates live. NPCs on the map scale with population up to a visible cap.

---

### 7.1 — Housing Classifier

When a building is placed on the grid, determine whether it contributes to population.

**Logic:**

- Look up the placed asset's `category` in the asset catalog.
- If category is `houses` → population contribution = 4 (from config `population.per_housing_type.house`).
- If category is `apartments` → determine small vs large based on asset data (defined per-asset in the catalog). Small = 20, Large = 40.
- All other categories (shops, public buildings, decor, etc.) → 0 population contribution.

---

### 7.2 — Population Counter Updates

- On placing any housing asset: add the population contribution to `playerProfile.population`. Update Zustand. HUD counter animates up.
- On demolishing any housing asset: subtract the population contribution. Update Zustand. HUD counter animates down.
- Population is stored as a single number on the player profile. It's the sum of all housing contributions across all placed assets.

---

### 7.3 — NPC Visibility Cap

The population counter can grow to thousands, but the number of visible NPC sprites on the map is capped.

- **Config value:** `max_visible_npcs: 50` (add to config.yml under `population`).
- **Scaling logic:** If population ≤ 50, show that many NPCs. If population > 50, show exactly 50. The pathfinding system (already built) handles their movement.
- **NPC sprite assignment:** Draw from the 37-character pool randomly. When new NPCs need to spawn (population increased), pick random sprites from the pool and add them to the pathfinding system. When NPCs need to despawn (population decreased), remove random ones.
- **Placement:** NPCs should be initialized near housing buildings, then move via pathfinding normally.

---

## Milestone 8: Polish, Animations & Integration Testing

**Goal:** Make everything feel cohesive, fluid, and beautiful. Test the economy math. Harden the PWA.

---

### 8.1 — Animation & Transition Pass

Go through every screen and interaction to ensure smooth animations and micro-interactions.

**Checklist:**

- All screen transitions: slide or fade (no hard cuts).
- Button press states: scale-down on press, spring back on release.
- Card swipe physics: spring-based, with rotation proportional to drag distance.
- Tab switching: smooth slide or crossfade.
- Loading states: subtle skeleton screens or shimmer effects where needed.
- HUD counter changes: count-up/down number animation (not instant jump).
- Shop grid: items fade/slide in on category switch.
- Stats charts/bars: animate on mount (bars grow, rings fill).
- Check-in day selector: smooth horizontal scroll with snap.
- Toast notifications for minor events (habit archived, settings saved).

**CSS/Tailwind animations:**

- Use CSS keyframe animations for repeating effects (glow, sparkle, pulse).
- Use Tailwind's `transition-*` utilities for state changes.
- Spring physics for swipe cards (use a small library or CSS spring approximation).
- Avoid heavy JS animation libraries — keep it lightweight for mobile performance.

---

### 8.2 — Responsive & Mobile Polish

- Test on iPhone Safari (PWA mode): ensure no viewport issues, safe area insets respected, no rubber-banding conflicts with swipe gestures.
- Test on Android Chrome (PWA mode): same checks.
- Test on desktop browser: shop grid expands, HUD adjusts, no wasted space.
- Touch targets: minimum 44×44px on all interactive elements.
- Font sizes: readable on small screens without zooming.
- Landscape orientation: either support gracefully or lock to portrait in PWA manifest.

---

### 8.3 — Economy Validation Tests

Automated tests (Vitest) that validate the config math against the design targets.

**Test cases:**

- **Perfect week scenario:** 6 habits (2 easy daily, 2 medium daily, 2 hard 5x/week = 33 tasks). Assert total weekly XP ≈ 2,744 and Coins ≈ 1,512 (with typical random bonus variance accounted for).
- **Perfect year simulation:** Run 52 perfect weeks through the leveling engine. Assert level reached is ~150. Assert total Coins ≈ 78,600.
- **70% consistency year:** Simulate 52 weeks at 70% completion. Assert level ≈ 80–85.
- **Level tier boundaries:** Assert XP to reach level 5 = 500, level 10 = 1,250, level 50 = 19,750, level 100 = 64,750, level 150 = 132,250.
- **Streak logic:** Verify that non-scheduled days don't break streaks. Verify milestone detection at 7, 14, 30, 60, 90, 180, 365.
- **Bonus stacking:** Verify first-week boost + surprise bonus + 2x event all stack correctly on a single check-in.
- **Weekly bonus tiers:** Verify each percentage bracket returns the correct multiplier.

---

### 8.4 — Edge Case Handling

- **Midnight rollover:** If the app is open at midnight, the day should transition correctly. Today's pending habits update. Yesterday becomes backfillable.
- **Timezone:** All dates stored as local dates (YYYY-MM-DD). Week boundaries are Monday–Sunday. Use the device's local timezone.
- **Habit created mid-week:** Only count scheduled days from the habit's creation date (or start date) for that week's consistency calculation. Don't penalize for days before the habit existed.
- **Habit with end date passed:** Stop showing in check-ins. Historical data preserved. Streak frozen (not broken).
- **Week with no habits scheduled:** No weekly report. No weekly bonus. Skip gracefully.
- **Demolish-and-rebuy loop:** Economically neutral (full refund), so no exploit concern. But verify coin balance never goes negative.
- **Multiple level-ups in one session:** If a check-in earns enough XP to cross 2+ levels, all level-ups fire sequentially with correct asset unlocks per level.
- **Empty inventory placement:** If a user tries to place an asset with quantity 0 (shouldn't be possible via UI, but guard against it), block placement.

---

### 8.5 — PWA Hardening

- Service worker caches all static assets for full offline support.
- All check-ins, purchases, and placements work offline (Dexie handles persistence).
- Manifest includes proper icons, splash screen, theme color, display: standalone.
- Test install-to-home-screen flow on iOS Safari and Android Chrome.
- Verify the app loads and works in airplane mode.

---

## Milestone 9: Supabase Sync & Auth Architecture (Plan Only)

**Goal:** Design the sync layer and auth flow on paper. Build nothing — just ensure every decision in Milestones 1–8 is compatible with future sync. This milestone produces documentation, not code.

---

### 9.1 — Supabase Schema Design

Document the Supabase Postgres schema that mirrors Dexie.

**Tables:**

- `users` — id (UUID), email, displayName, avatarUrl, authProvider, createdAt
- `habits` — mirrors Dexie habits table + `userId` FK
- `check_ins` — mirrors Dexie checkIns table + `userId` FK
- `player_profiles` — mirrors Dexie playerProfile + `userId` FK
- `inventory` — mirrors Dexie + `userId` FK
- `placed_assets` — mirrors Dexie + `userId` FK
- `weekly_snapshots` — mirrors Dexie + `userId` FK

All tables include `syncedAt` (timestamp, nullable) for tracking sync status.

Row Level Security (RLS) policies: each user can only read/write their own rows.

---

### 9.2 — Sync Strategy Document

Document the offline-first sync approach.

**Strategy:**

- Dexie is the source of truth. The app always reads from and writes to Dexie.
- On connectivity (app open with internet, or returning from offline): push all records where `updatedAt > syncedAt` to Supabase.
- On app open with internet: pull any records from Supabase that are newer than local (handles multi-device sync).
- Conflict resolution: last-write-wins based on `updatedAt` timestamps. Simple and correct for single-user scenarios.
- Sync runs in a service worker or background task. Never blocks the UI.
- Failed syncs retry on next app open.

---

### 9.3 — Google Auth Plan

Document the auth integration approach.

**Flow:**

- Supabase Auth with Google OAuth provider.
- On first sign-in on a device: if local Dexie data exists (anonymous user), associate it with the new auth user. Upload to Supabase.
- On first sign-in on a new device: if Supabase has data for this user, pull it down and hydrate Dexie.
- Auth is optional for MVP. Users can play without signing in. Auth unlocks sync across devices.

---

### 9.4 — Migration Path Document

Document how to transition from local-only to synced without data loss.

**Key decisions made in this sprint that enable this:**

- UUIDs as primary keys (not auto-increment) → no collision when merging local data with server.
- `createdAt` / `updatedAt` on every record → conflict resolution is possible.
- `syncedAt` field present but unused → ready to flip on.
- Player profile is a single row with computed fields → easy to merge.

---

## Sprint Summary

| Milestone | Name                         | Depends On                                                    |
| --------- | ---------------------------- | ------------------------------------------------------------- |
| 1         | Data Layer & Economy Engine  | Nothing (foundation)                                          |
| 2         | Habit Management             | Milestone 1 (Dexie schema, stores)                            |
| 3         | Daily Check-In System        | Milestone 1 + 2 (economy engine, habit data)                  |
| 4         | Shop & Unlock System         | Milestone 1 (asset catalog, inventory store, leveling engine) |
| 5         | City HUD & Navigation        | Milestone 1 + existing city builder                           |
| 6         | Analytics & Weekly Report    | Milestone 1 (weekly engine, snapshot data)                    |
| 7         | Population & Housing         | Milestone 1 + existing placement system                       |
| 8         | Polish & Integration Testing | All previous milestones                                       |
| 9         | Supabase & Auth Architecture | Documentation only, no code dependencies                      |

**Parallelization:** Milestones 2, 4, 5, 6, and 7 can be worked on in parallel (or via separate Claude Code agent sessions) once Milestone 1 is complete. Milestone 3 requires both 1 and 2. Milestone 8 requires everything.

**Cut line:** If time runs short, the first features to defer are: Random 2x XP Events (3.5), the Monthly stats tab (6.3), and NPC visibility scaling (7.3 — just show the counter, skip visible NPCs).

---

## Appendix: Config Additions

The following values need to be added to `config.yml` to support this plan:

```yaml
population:
  max_visible_npcs: 50 # Cap on rendered NPC sprites on the map

check_in:
  backfill_max_days: 7 # Changed from 1 to cover the full current week (Mon-Sun)
```

No other config changes are needed. All other values are already defined.
