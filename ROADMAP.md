# Current gameplay milestone — M2B, 2026-10-30

**Join correction verified:** non-full rooms remain joinable during school selection and active play. Late entrants select/confirm before spawning, without restarting the match or resetting progression/statue HP/timing. Six seats and defeat closure remain enforced. 98 unit/network tests, two late-join browser scenarios and three existing pre-game browser tests passed; see `docs/LATE_JOIN_FIX.md`. No M2C work.

**M2B — Statue Invasion & Defense System: implemented and verified.** See `docs/M2B_IMPLEMENTATION.md` and `docs/evidence/m2b/` for commands, actual screenshots, prototype tuning and limitations. Reuses M2A simulation, combat, rewards, zone filtering, arena and compact HUD.

- [x] Server match clock starts after all school confirmations. Waves at 3/6/9 minutes; warnings at 60/15 seconds. Validated development override and server-derived in-viewport countdown.
- [x] Both west/east lanes, three configurable prototype recipes, spawn-time participant scaling, independent overlapping waves. Later waves repeat recipe three; no production 20-wave catalogue.
- [x] Statue objective and sticky player aggro with configurable detect/chase/reacquire thresholds. Living old waves remain; dead invaders never respawn.
- [x] Authoritative statue HP at its existing world position, aligned solid pedestal, permanent damage, one terminal defeat transition and no repair/regen.
- [x] Shared combat/death/EXP/gold pipeline, fixed assist pool, no item drops, no-loss five-second arena respawn.
- [x] Synchronized public defense state across arena/dungeons; zone-filtered enemies/events and independent match rooms. Warnings never recall dungeon players.
- [x] Compact statue/wave HUD, hit feedback, warning and in-viewport defeat overlay. Existing character artwork, camera and controls retained.
- [x] 96 unit/integration tests passed in 11 files; typecheck and production build passed. Production schedule tested with simulated time.
- [x] Two real Chromium contexts verified shared enemy damage/death/rewards, warnings in a private dungeon, overlap, statue damage and synchronized defeat; responsive checks at 944×466 and 1920×1080. Accelerated test uses six-second intervals and HP300, not production balance.
- [x] 11 existing browser regressions passed for M1 movement/combat/animations/UI and M2A shared/private dungeon farming/transitions. Existing approved character/atlas validation passed.

**Stop after M2B. M2C has not started.** No chapter/final bosses, crafting, new schools or campaign expansion. Prototype enemy/VFX art and final balance remain outstanding; director visual approval of the arena/dungeon artwork remains pending.

## Completed M2A foundation

**Visual revision within M2A:** expanded arena court/roads, removed interior tree/collider, target-anchored damage and four original selector illustrations are produced, integrated and browser verified. See `docs/ARENA_VISUAL_V2_REVIEW.md`. The compact HUD and existing M2A gameplay are retained. Runtime director visual approval remains pending; this does not start M2B or authorize further environment/character expansion.

**M2A — Creep Dungeon Foundation: implemented and verified in two Chromium clients.** See `docs/M2A_IMPLEMENTATION.md` and `docs/evidence/m2a/` for command results, screenshots, audit and limitations. This explicit gameplay request supersedes the earlier instruction to stop at the pre-game UI phase. Existing arena/HUD composition is retained. Dungeon art uses existing assets/placeholders; ART-01 visual approval is still pending.

- [x] Menu-only dungeon entry through the in-viewport Phó Bản overlay; Dẫn Lộ removed per the latest user instruction.
- [x] Server-owned private (one per player) and shared (up to six per room) creep instances, separate zone and authoritative collision.
- [x] Existing A/Q/W combat pipeline awards EXP/gold; E/R remain unequipped. No item drops.
- [x] Physical exit returns to the arena return point; server validates distance/phase; no recall.
- [x] Full clear → short rest → scaled next wave. Empty instances preserve HP/position and pause all local timers; re-entry resumes.
- [x] Automated membership/isolation/pause/resume/transition/reward/cleanup tests and real SDK interest-filtering checks.
- [x] Two separate browser contexts verified shared synchronization and different private instances without enemy, event or reward leakage; screenshots at 1280×720 and 1920×1080.
- [x] Minimum missing death dependency: configurable five-second arena recovery, no EXP/gold loss. Final balance defaults remain proposed.

The explicit M2B request above supersedes the earlier M2A stop gate. Boss dungeons, crafting and additional school mechanics remain in their later milestones.

# Earlier UI implementation phases — 2026-10-30

- **Phase 1 (this request):** Landing (exactly one nickname input), real Room Browser, Waiting Lobby with host Start Game, then a dedicated interactive School Selection screen. All clients must confirm before server IN_GAME. No school controls in the waiting lobby. Verify two clients, selection changes, duplicates, disconnect barrier and clock gating.
- **Phase 2 (requires review before starting):** Main Arena and in-viewport HUD refinement. Existing arena/HUD is preserved as the Phase 1 transition destination, not redesigned here.
- **Phase 3 (requires later approval):** Inventory, Merchant, Dungeon, Skills, Crafting, PvP modals within viewport. No new backend mechanics inferred from mockup art.

The gameplay milestones below remain unchanged; implementing this pre-game flow does not authorize M2/M3 combat/dungeon expansion.

# Implementation Roadmap — Milestone-based, playable and testable

**Principle:** Codex must deliver one functioning, tested milestone at a time, not an entire untested game. The docs already define the future game, but the first slice is intentionally small. Every milestone ends in runnable commands, observed output, test report and a clear next step.

## M0 — Repository and architecture scaffold (first Codex task)

**Scope:** pnpm TypeScript monorepo, Phaser 4 client boot, Colyseus 0.18 server boot, shared packages, reusable validated config skeleton, deterministic core starter, unit-test setup, dev scripts, clean README. Display a placeholder room/scene and verify client connects to server. No schools/dungeons/bosses implemented yet. Configure crisp/pixel-art-aware Phaser rendering with a fixed orthographic Pokémon-like elevated overhead/three-quarter camera (not 3D or isometric), and establish asset-folder/manifest conventions from `ART_ASSET_GUIDE.md`; visually complete artwork is **not required** for M0.

**Acceptance:** `pnpm install`, `pnpm dev` (or documented equivalent) successfully start client/server; one browser tab connects; unit test and typecheck run; separate packages compile; two browser tabs can connect to a named temporary room; no DB/account; no Phaser import in `game-core`; all changes checked into Git. Document exact commands and version constraints.

**Codex must stop** after M0 and give user a demo and checklist. Do not proactively implement M1+.

## M1 — Playable 2-player combat vertical slice

**Scope:** central arena placeholder (Tiled or simple tile geometry), one placeholder hero archetype (Cái Bang suggested) with normal melee/ranged choices, arrow movement, A manual basic attack, Q/W/E/R input pipeline with only **two working skills** initially, one enemy archetype with HP and death, gold/XP/level, simple HUD; add a **tiny reviewed art/animation proof** (one hero, one creep, idle/walk/attack/hurt/death and one effect; confirm player-follow non-rotating camera, feet-origin Y-sorting and occlusion by at least one tree/building) using original assets where available, otherwise clearly labeled prototype placeholders; full server-authoritative damage, hit event feedback. Two players see one shared enemy and consistent health.

**Acceptance:** arrow movement works and is visible to a second client; manual attack cadence; nearest-at-fire ranged shots fly straight and can miss a moving target; melee cleave targets secondary at reduced damage; QWER cannot cast unavailable/unequipped skill; same enemy HP agrees for both clients; server rejects forged damage/position. All numeric behavior unit-tested without browser. Verify the real loaded animation registry and direction/frame selections in-browser, with screenshots if actually captured; if no authentic art is available, keep art completion OPEN without blocking gameplay implementation.

## M2 — Dungeon and statue core loop

**Scope:** Dungeon Guide NPC mouse interaction, private/shared creep dungeon selection, separate zone, physical exit portal, paused when empty; server match clock, two-lane statue invasion at 3 min (development fast interval override), 60s/15s alerts, statue damage/no repair, hero death/respawn, player-focused enemy aggro.

**Acceptance:** two players can farm separate/private or shared dungeons with correct instance cap; leaves preserve wave status; dungeon player cannot magically teleport to statue on alert; waves at 3/6/9 min (fast test config allowed); wave 2 appears even if wave 1 survives; player near creep takes aggro, leaving range returns creep to statue; statue damage persists; death respawns no loss.

## M3 — Progression, full ability framework, Phát Động

**Scope:** four schools' base growth/passives, 8 basic attacks, 4 active equip slots, arena-only respec, rank gates, surplus-point stat bonuses, effect library and the entire 43-skill catalogue implemented incrementally (validate completeness with tool), Thiếu Lâm two same-target combos, boss CC resistance.

**Acceptance:** all 43 definitions validated, at least one automated case per skill, UI can equip/reassign four, mixing styles allowed, school passives scale automatically, surplus reset doesn't duplicate stats, Phát Động only empowers same hit target even when cleaved, no targeted mouse skills, nothing can respec in dungeons/PvP.

## M4 — Boss dungeons, loot, items and crafting

**Scope:** shared/private fixed-strength boss dungeons, 30s empty boss HP/position reset, cooldown respawn after kill, one-item weighted drop, eligible player roll, 4 equipped slots, basic shop items upgraded through duplicate buying, deterministic crafting from max basic + boss item + gold, ground drop/pickup/sell, capacity handling.

**Acceptance:** boss only produces one item per kill; roll winner unique, solo winner automatic; duplicate items retained; empty 29s reentry cancels reset, empty 30s resets; multiple buying requests cannot duplicate level/item/gold; all schools can equip any item; crafting consumes exactly one recipe's ingredients and gold.

## M5 — Full 20-wave defense and five boss encounters

**Scope:** data-driven wave recipes 1–20, west/east spawns, cumulative overlapping waves, chapter bosses 5/10/15/20 with clear gate and few seconds rest, final Vương Trùng Dương after four bosses, victory/defeat/results; role-specific boss mechanics and telegraphs, scalable player-count creep threats.

**Acceptance:** normal clock exactly every 180s; chapter boss does **not** spawn before its fifth wave clears; delayed boss can overlap newer waves; no duplicate boss spawn; bosses give EXP/gold only; wave 20 then fourth boss then final; defeat at statue 0, victory only after final defeated while statue alive; 1 player can theoretically win under test build, 6-player challenge scaled.

## M6 — Optional PvP rooms and polish

**Scope:** PvP NPC, side A / side B join, ready, start, fight, end/return to arena, no changing loadout inside PvP; then original pixel-art asset iteration and replacement of placeholders according to `ART_ASSET_GUIDE.md`, animation, particles, sound, VFX, performance and playtest fixes. No PvP-dependent progression.

**Acceptance:** 1v1 and uneven teams totaling <=6 work; ready gate; duel outcome; no room spillover; server keeps authoritative hit validation; PvP never duplicates gold/items/XP; timings during invasion resolved in design before implement.

## M7 — Balance & production prep

**Scope:** instrument XP/gold/levels/raid times, generate seeded balance reports for all schools, fine-tune survivability and speed, load test 6 players, runtime monitoring, deployment docs, responsive keyboard-first UI (desktop browsers), production static+WS hosting, no accounts.

**Acceptance:** repeatable sim outputs; automated tests green; 6-player wave load measured; no obvious permanent CC lockdown; no item duping; reconnection policy approved; end-to-end playthrough in accelerated test mode and production-timing smoke test.

## Per-milestone Codex response format

1. Summary and files changed.
2. Commands run and PASS/FAIL outputs (do not claim tests not executed).
3. Manual browser smoke test steps and screenshot paths if available.
4. Open issues/risks and questions tied to doc section.
5. What is **not implemented yet** and precise next milestone.

**One Git branch/PR or logically coherent commit series per milestone**, if environment permits. Do not silently alter confirmed game rules to simplify implementation.

## v1.4 UI/HUD refactor checkpoint for existing M1 prototype

The game director rejected a prototype with permanent exterior admin-style sidebar. **Before adding more character schools, dungeons or shops**, run a bounded UI-only refactor using `CODEX_UI_REFACTOR_TASK.md`. Create one large in-match game viewport, layered in-world HUD/hotbar and modal manager. Move existing character, room and creep information out of page sidebars; don't delete functional features. Verify inventory menu and dungeon NPC menu inside the viewport, even if not yet backed by finished item/dungeon mechanics (use explicit disabled preview states). Do not restart earlier completed milestones or rewrite multiplayer/combat. Screenshots and automated tests should verify the new layout with two clients. Subsequent M1/M2/M3 acceptance must use `UI_UX_SPEC.md`; a stand-alone lobby may remain outside play. UI must not block arrow/A/QWER controls when closed.

## Mandatory visual checkpoint: ART-01 (v1.6)

Before expanding the full environment or school art set, conduct `ART-01` — a one-screen genuine-art vertical slice as specified in `ART_PRODUCTION_STANDARD.md`. Stop producing entire new maps using procedural placeholders; do an art source audit, produce/import and integrate a complete small set of character, NPC, enemy, tree, building, ground, VFX and UI assets, then show **actual Phaser play screenshots and animation previews** to the game director. Gameplay/infra milestones may be separately verified with placeholders, but art milestones remain unapproved until director sign-off. Run `CODEX_ART_QUALITY_RESCUE_TASK.md` as a focused task in the existing repo.
