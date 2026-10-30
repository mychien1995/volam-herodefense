# UI Phase 1 implementation and review — 2026-10-30

## Scope and audit

Implemented only Landing → Room Browser → Waiting Lobby → dedicated School Selection → existing Main Arena. School selection starts after the host presses Start Game; it is absent from the waiting lobby. Phases 2 (arena/HUD refinement) and 3 (modal redesign) have not started.

Read repository instructions, GAME_DESIGN.md, DECISIONS.md, TECHNICAL_ARCHITECTURE.md, UI_UX_SPEC.md, CONTENT_DATA.md, ART_ASSET_GUIDE.md and ART_PRODUCTION_STANDARD.md. Inspected actual numbered references 01, 02, 03, 04 and 09 and school concept art, together with the world/anti-reference requirements. assets/references/ui/UI_DESIGN_SPEC.md does not exist. Used the colyseus and game-playtest repository skills; API guidance checked against installed Colyseus core 0.18.23 / SDK 0.18.8 / schema 5.0.42 and official room/matchmaking documentation. Phaser remains 4.2.1.

Previously the client used a combined nickname/create/join form, and MatchRoom created heroes and advanced the simulation immediately on join. The existing full-viewport Phaser arena, overlay HUD and modal manager already work and are preserved. The new DOM pre-game controller covers the viewport until the server enters IN_GAME. Its illustration contains no functional controls; all forms, rows, cards, ready states and buttons are real HTML bound to network actions.

## Behavior delivered

- Landing: one visible nickname input, Enter Game, required/nonempty validation; no accounts or saved progression.
- Browser: real public Colyseus rooms, room code, actual client counts and six-seat limit, lock/phase status, create/join-by-row/join-by-code, empty/list-error/join-error states, manual refresh and three-second polling. Polling preserves focused room-code input.
- Waiting: actual synchronized roster, room code, host marker, host-only Start Game and Leave. No school controls or invented readiness toggle. Host loss disables start without silently promoting anyone.
- Selection: four canonical schools from CONTENT_DATA.md, distinctive still portraits, descriptions/styles/qualitative attributes/passives/basic attacks, existing Cái Bang prototype skills where known, explicit undefined starting sets elsewhere. Selected highlight, change before confirm, immutable confirmed choice, real ready count. Duplicate schools allowed.
- Server: validated start/select/confirm messages; WAITING_LOBBY → SCHOOL_SELECTION → IN_GAME owned by the existing room. Late joining is locked after selection starts. Gameplay commands are rejected and the fixed simulation clock stays stopped before IN_GAME. All confirmed players become level-1 core heroes in the same room with selected school IDs; existing M1 spawn/collision/combat values are preserved. No individual client can start gameplay independently.
- Disconnect during selection: keep the absent seat visibly disconnected/unconfirmed and hold the barrier. No auto-pick, timeout, removal or reconnect policy is invented; leave/recreate remains available. Further choices are tracked in OPEN_QUESTIONS.md.

## Changed implementation files

| Area | Files |
|---|---|
| Pre-game screens/styles | apps/game-client/src/pregame.ts, pregame.css |
| Existing connection/HUD identity wiring | apps/game-client/src/main.ts, ui.ts |
| Canonical display data | packages/game-data/src/schools.ts, index.ts |
| Authoritative phases and live listings | apps/game-server/src/rooms/MatchRoom.ts, app.config.ts |
| Network state/messages | packages/game-protocol/src/index.ts (protocol v3) |
| Selected identity on core hero | packages/game-core/src/types.ts, simulation.ts (identity field only) |
| Browser coverage | tests/e2e/pregame-helper.ts, phase1.spec.ts; adapt lobby/gameplay/ui/cai-bang-art tests to enter through the new flow |
| Integration coverage | tests/room.test.ts |
| Design/plan | GAME_DESIGN.md, UI_UX_SPEC.md, DECISIONS.md, ROADMAP.md, TECHNICAL_ARCHITECTURE.md, ACCEPTANCE_TESTS.md, OPEN_QUESTIONS.md |
| New still UI artwork | assets/exports/pregame/*, assets/source/ui/pregame/README.md |

The checkout already contained unrelated art/intake changes. They were preserved. Approved Cái Bang source/export hashes remain unchanged and are verified by assets:prepare and the asset regression test.

## Actual verification

- `pnpm typecheck`: PASS (final client/protocol/server and test types).
- `pnpm test`: PASS, 65 tests across six files, including real Colyseus SDK/server integration. Host gate, empty confirmation rejection, non-editable confirmed choice, duplicate schools, late-join rejection, pre-game input/clock gating, selected identity and disconnect barrier checked.
- `pnpm test:e2e`: final broad run passed 15 of 17 tests; two short-animation captures were interrupted by live enemies. The obsolete combined-lobby test was migrated and passes. All three dedicated Phase 1 tests pass: different-school transition, live listing/blank nickname/join error/host loss, and selection disconnect hold. Movement/combat/two-client synchronization, modal focus, existing HUD at three sizes, six players and animation preview passed.
- `pnpm test:e2e tests/e2e/cai-bang-art.spec.ts --grep "real match|Chưởng normal"`: PASS, both previously interrupted animation checks (47.6 seconds). Test setup now moves the real player outside creep detection range before sampling short attacks; no damage/animation/gameplay rules were changed. Together with the broad run, all 17 browser checks pass; a single all-green full rerun was not repeated after this test-only adjustment.
- `git diff --check`: PASS (line-ending conversion notices only).
- Production Vite build: PASS; existing large-bundle warning remains (~1.68 MB uncompressed JS).

Two independent Chromium contexts at 1280×720 and 1920×1080 choose Võ Đang and Thiếu Lâm, respectively. The host changes Cái Bang to Võ Đang before confirmation; 1/2 Ready and elapsed zero are asserted before the second confirmation. Both clients enter the same IN_GAME room, retain different selected IDs and level 1, and only then advance match time. The captured two-client flow has no page errors.

## Captured evidence and visual comparison

Actual browser PNGs under docs/evidence/phase1:

- 01-landing-1280.png
- 02-browser-1280.png (actual empty list)
- 03-waiting-1280.png (two actual players, host and no school controls)
- 04-school-selection-1280.png
- 04-school-selection-1920.png
- 05-same-arena-1280.png (existing arena after both confirmations)

Inspected these rendered images. Bronze/wood windows, jade buttons, parchment list areas and a mountain-temple pixel illustration follow references 01–03. Reference 09's composition is adapted to four canonical schools; decorative classes/numbers from that mockup are not game data. Confirm/progress and four cards fit the target resolutions. No exterior dashboard was added and camera/character scale is unchanged.

Differences: CSS borders and system serif/sans typography approximate ornate raster frames and lettering; the background is a new original UI-free illustration, not the exact mockup scenery. Portraits come from mixed existing concept/sprite sources, so their framing/style differs. A uniform approved portrait set remains desirable. The selected card uses a gold border and jade fill. The unchanged M1 arena still has prototype environment/enemy art and the approved Cái Bang runtime visual fallback for all schools. This phase does not claim the arena reaches the approved world-art benchmark.

Artwork provenance, dimensions, hashes and pending review status are recorded in assets/exports/pregame/manifest.json and assets/source/ui/pregame/README.md. Concept windows are still portraits only, never alleged gameplay animation frames.

## Limits and next review

Exact numeric level-1 attributes and initial skill assignments for the four schools are not finalized in the design documents. The interface shows documented qualitative identities and makes the missing values explicit. Selecting a school stores its identity; school-specific combat/passives and non-Cái Bang runtime animations remain M3/art work. Existing M1 combat is intentionally preserved. Invasions are not implemented in M1; future M2 scheduling must start from IN_GAME time. Selection reconnect/host migration/timeout/absent-player removal remain unresolved, with safe hold and leave/recreate available.

Stop for director review of these four pre-game screens before Phase 2 or Phase 3.
