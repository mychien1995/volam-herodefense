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

## v1.5 focused UI checkpoint — implementation verified, review pending (2026-10-29)

- [x] Refactor the existing M1 client into a full-viewport world with compact HUD; remove exterior dashboard/header/footer.
- [x] In-viewport inventory, merchant/crafting, dungeon selection, loadout, party/connection and PvP preview windows. Keep unavailable transactions/travel disabled.
- [x] Safe modal focus/input, NPC click isolation, canvas keyboard recovery and unpaused two-client state.
- [x] Original small UI/environment studies, non-rotating camera/feet depth and explicit prototype provenance.
- [x] Verify 62 unit/integration tests and 10 Chromium tests; desktop coverage 1280×720, 1920×1080 and 900×640. Preserve five requested screenshot states in `docs/evidence/ui-v15/`.
- [ ] Game director UI/art review. Detailed Võ Đang character approval and finished environment art remain OPEN.

See `docs/UI_V15_VERIFICATION.md`. M0/M1 implementation history and evidence remain in Git and `docs/M0_VERIFICATION.md` / `docs/M1_VERIFICATION.md`. This checkpoint implements no M2+ gameplay. **Stop here until UI review; do not begin another milestone automatically.**
