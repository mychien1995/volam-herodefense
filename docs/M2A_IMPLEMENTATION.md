# M2A — Creep Dungeon Foundation

**Current correction (2026-10-30):** Dẫn Lộ has been removed by explicit user request. Live players use the Phó Bản utility menu anywhere in the arena; server validation no longer depends on NPC distance. The existing (960,576) return point is now an independent map spawn marker. Physical exits and all instance/combat/pause rules remain. Guide references below describe the original M2A delivery and are superseded by this correction.

Menu-only correction verification: `pnpm typecheck`, `pnpm build` and `pnpm test` PASS (83 tests, 9 files). `node tools/run-playwright.mjs test tests/e2e/dungeons.spec.ts tests/e2e/arena-visual-v2.spec.ts --grep "two real clients|expanded arena"` PASS (4 tests, 1.7 minutes). Both real clients enter directly from the menu at arena spawn; shared/private isolation, physical exits and pause/resume remain verified. NPC-free arena and enabled-menu screenshots at 944×466 and 1920×1080 are in `docs/evidence/arena-v2/`; captures were inspected. No new browser errors were recorded. Scoped formatting/whitespace checks PASS.

Implementation date: 2026-10-30. Scope ends at creep dungeons; M2B is not started.

## Repository audit

Read the current AGENTS, ROADMAP, GAME_DESIGN, COMBAT_SYSTEM, DECISIONS, UI_UX_SPEC, architecture, acceptance criteria and the existing core, room, input, renderer and menu flows. Applied the Colyseus, game-playtest and pixel-art-pipeline workflows. Re-inspected the required positive/anti UI references; the earlier ART-01 audit records the additional art references and filename discrepancies.

M1 already supplied authoritative movement/collision, directional melee/cleave, non-homing ranged attacks, two Cái Bang Q/W skills, enemy AI, fixed-pool EXP/gold assists, leveling, multiplayer synchronization, follow camera, animation registry and live in-viewport HUD. E/R remain unequipped. The pre-match school selection records four school identities but does not implement their future school-specific combat systems. Dungeon selection was a disabled preview.

Critical dependencies missing before this work: zone membership, independent zone worlds/clocks, dungeon wave lifecycle and transport interest filtering. All are included here. Dead heroes previously remained permanently dead; the design's short arena respawn is included as the minimum recovery dependency so dungeon farming cannot softlock a character. No invasion/statue mechanics were added.

Installed versions checked: Phaser 4.2.1; @colyseus/sdk 0.18.8; @colyseus/core 0.18.23; @colyseus/schema 5.0.42. Official references consulted: [Colyseus StateView](https://docs.colyseus.io/state/view), [Room](https://docs.colyseus.io/room), and [Phaser scenes](https://docs.phaser.io/phaser/concepts/scenes); installed source/type declarations checked for display-list cleanup and server message options. The installed Colyseus testing helper uses port 2568 despite accepting a port parameter; the integration tests use its actual port.

## Implemented behavior

- One match room contains the arena and separate `DungeonMatch` worlds. `game-core` has no Phaser, Colyseus, DOM or implicit clock dependencies.
- Dẫn Lộ at the authoritative arena marker (1000,576) accepts a mouse interaction within 96 world pixels. The existing dungeon overlay selects Rừng Trúc creep + private/shared. The utility button can preview the menu anywhere; entry is enabled only near the Guide and revalidated on the server.
- One private instance per session; one shared instance per match, capacity six. Clients send an access choice, never an instance ID or position. Protocol v4 strictly validates travel, phase and increasing travel sequence numbers.
- The Tiled dungeon is a separate 960×640 zone. Arrows and A/QWER reuse the existing pipeline. The physical portal at (160,320) requires a live player within 64 world pixels and returns to (960,576) near the Guide. There is no recall button.
- A transfer preserves the same hero and progression, converts remaining cooldowns between local clocks and clears held movement, pending commands, scheduled shots and owned projectiles. UI closes and restores canvas focus; scene objects and transient effects are destroyed on zone change.
- All current-wave enemies must die before a two-second rest and the next wave. Participant count is sampled at wave spawn; joining an existing wave does not rescale its enemies.
- Empty creep worlds stop their complete simulation clock: HP, position, burn timing, AI, projectiles, RNG consumption and inter-wave countdown remain frozen. Re-entry resumes the same world. Arena/match time continues. Creep instances do not use the future boss 30-second reset rule.
- Rewards use M1's authoritative damage/contribution/death pipeline: fixed pool per creep, divided among current eligible contributors. No items. An inactive shared occupant receives no kill share.
- A dead hero returns to the arena after five seconds with full HP/mana and no EXP/gold loss. Five seconds and the return point are configurable prototype defaults within the documented open question, not final balance approval.
- Colyseus StateViews synchronize only the current zone's enemies/projectiles and hero spatial/pose fields. Party identity/progression metadata remains room-visible intentionally. Private dungeon metadata is visible only to its owner; shared progress is room-visible. Combat events carry zone IDs, globally increasing room event IDs and namespaced dungeon entity IDs, and are delivered only to occupants. The renderer also filters by zone.

## Prototype data and art

`packages/game-data/src/dungeon.ts` holds validated prototype tuning: wave 1 has three enemies; count is `ceil(3 × (1 + 0.6 × additional players))`, with twelve unique spawn slots for the six-player maximum. HP grows 15% per wave and 16% per additional participant; damage grows 10% and 8% respectively. Rewards retain M1's 60 EXP/12 gold per enemy. These are configurable foundation values, not a production balance claim.

`maps/creep_forest.tmj` is the authored orthogonal map source. Its collision, spawn and exit markers feed shared data and runtime presentation through `assets:prepare`. Tree trunks are solid; decorative border foliage and the portal are non-solid. The arena map changes only by adding the Guide marker. Existing arena ground/HUD composition is retained.

| Use | Existing source/export | Status/provenance |
|---|---|---|
| Player and labeled Guide placeholder | `assets/source/characters/cai_bang_v1_6/`; character PNG/JSON | Existing approved Cái Bang artwork; Guide is a static reused idle frame, not a newly authored NPC |
| Dungeon grass/paving | `assets/source/m1_art.py`; `assets/exports/tilesets/terrain.png` | Existing original project prototype; not final dungeon art |
| Trees/bamboo | `assets/source/arena_art01/`; `assets/exports/arena_art01/world.png` + `world.json` | Existing original ART-01 exports; see `assets/arena_art01.manifest.json`; director review remains pending |
| Exit | `assets/source/ui_world.py`; `assets/exports/presentation/dungeon_gate.png` | Existing original placeholder; intentionally reused for this gameplay milestone |
| Enemies/fire | M1 manifest PNG/JSON exports | Existing prototype art/VFX, not polished or director approved |
| Menu/HUD | Existing DOM components and ART-01 exports | Restyled asset generation was outside M2A; only functional controls/status added |

No raster artwork was regenerated, no Aseprite source was changed, and Aseprite was not run for M2A. Existing PNG/JSON assets were reused. The terrain, Guide, portal, creep and VFX placeholders remain visual work; this milestone does not confer art approval.

## Validation

Tests use real SDK clients for room integration and two separate Chromium contexts for browser gameplay. The browser evidence bridge is read-only: movement, combat and transitions use genuine keyboard/mouse input. Integration unit fixtures may arrange authoritative server state to exercise boundaries and deterministic timing.

Final results on Windows, Node 26.0.0, pnpm 11.25.0 and Playwright 1.64.1 Chromium:

| Command | Actual result |
|---|---|
| `pnpm typecheck` | PASS, including test/tool TypeScript |
| `pnpm test` | PASS — 81 tests, 8 files; final run 8.85s. Includes 11 dungeon core tests and 5 real SDK dungeon room tests |
| `pnpm build` | PASS. Existing large bundled-client warning (>500 kB); no build error |
| `pnpm verify:assets` | PASS — 17 manifest PNG entries/248 frame references; 9 existing Aseprite sources, 6 padded atlases, 59 RGBA exports; approved character hashes preserved |
| `node tools/run-playwright.mjs test tests/e2e/dungeons.spec.ts tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts tests/e2e/phase1.spec.ts` | PASS — 14 tests, 5.6 minutes |
| Scoped `pnpm exec prettier --check` on M2A source/tests/export preparation script | PASS |
| Scoped `git diff --check` on changed implementation files | PASS |

The final browser run verified shared entry/visible teammates/enemy HP and event agreement, separate private enemy/event/reward state, authoritative EXP/gold gains from real attacks, inactive-occupant reward exclusion, physical exits/arena return, empty local-clock pause and retained HP on re-entry. It also passed existing follow camera/movement/occlusion, non-homing projectiles, manual cadence/Q/W/progression, actual PNG animation registry, pre-game school/confirmation/disconnect and modal focus/input regressions. Menus fit at 1280×720, 1920×1080 and 900×640. No application console/page/HTTP errors were recorded in the dungeon clients. There is no long-duration balance or six-browser load claim.

During verification, corrected the instance selector's accessible label, scoped duplicate menu selectors, destroyed display objects on zone changes and placed the new progress text above combat notifications. Initial combat automation fired at long-range moving patrols and missed as designed; the final scenario approaches into aggro range and retreats before screenshots so live enemies do not kill an idle test hero. These fixes do not change targeting, projectile or damage rules.

Actual runtime captures from the passing final run (visually inspected; these are not concepts/generated artwork):

- `docs/evidence/m2a/guide-menu.png` — existing in-viewport menu, live Guide eligibility.
- `docs/evidence/m2a/shared-combat-a.png`, `shared-combat-b.png` — same shared instance, two clients, kill/reward state.
- `docs/evidence/m2a/shared-resumed.png` — retained shared instance after both players exit.
- `docs/evidence/m2a/private-a-1280.png`, `private-b-1920.png` — separate private instances at two desktop sizes; A has earned rewards while B's enemies/rewards remain untouched.
- `docs/evidence/m2a/private-resumed.png` — the same private instance after empty pause/re-entry.

Implementation/runtime verification is complete. The reused dungeon art is a prototype, not director-approved final art. `ROADMAP.md` marks M2A progress and explicitly leaves M2B unstarted.

## Limitations and next boundary

Only one creep destination is implemented. Shared instances are per match, not cross-room matchmaking. Private instances belong to a connection/session and persist only for that room's lifetime; reconnect/persistent progress is not implemented. The existing M1 school/combat limitations remain. Endless-wave tuning has no long-duration balance claim. No invasions, statue damage/alerts, boss dungeons, loot, crafting, extra schools or PvP backend were implemented. M2B requires a separate request.

To test locally, run `start-game.cmd` from the repository, open the displayed client URL, create/join a room and confirm school choices. Walk east/north toward Dẫn Lộ, click him and choose Private or Shared. In the dungeon, approach the creeps and use A/Q/W. Walk west to the labeled exit and click it. Re-enter to resume the retained wave. A second browser profile/context can join the same room before the host starts.
