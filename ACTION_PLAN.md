Session Granularity
Milestone 1 — Two sessions. First session: Dexie schema, config loader, Zustand stores (1.1, 1.2, 1.8). Second session: all the engine services (1.3–1.6) plus the asset catalog generator (1.7). The stores need to exist before the services wire into them.
Milestone 2 — One session. It's straightforward CRUD UI.
Milestone 3 — Two sessions. First: the swipe card stack, backfill, and check-in state logic (3.1, 3.2, 3.7). Second: the RewardReveal component and the full reward flow wiring (3.3, 3.4, 3.5, 3.6). The reward system is intricate enough to deserve its own focused session.
Milestone 4 — One session. Shop screen + purchase flow + inventory bridge.
Milestone 5 — One session. HUD, navigation, mode toggle.
Milestone 6 — One session. Stats screens + weekly report.
Milestone 7 — One session. Population logic is small.
Milestone 8 — Two sessions. One for the animation/polish pass, one for testing and edge cases.
