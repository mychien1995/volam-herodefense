# Implementation Roadmap — Milestone-based, playable and testable

**Principle:** Codex must deliver one functioning, tested milestone at a time, not an entire untested game. The docs already define the future game, but the first slice is intentionally small. Every milestone ends in runnable commands, observed output, test report and a clear next step.

## M0 — Repository and architecture scaffold (first Codex task)

**Scope:** pnpm TypeScript monorepo, Phaser 4 client boot, Colyseus 0.18 server boot, shared packages, reusable validated config skeleton, deterministic core starter, unit-test setup, dev scripts, clean README. Display a placeholder room/scene and verify client connects to server. No schools/dungeons/bosses implemented yet. Configure crisp/pixel-art-aware Phaser rendering and establish asset-folder/manifest conventions from `ART_ASSET_GUIDE.md`; visually complete artwork is **not required** for M0.

**Acceptance:** `pnpm install`, `pnpm dev` (or documented equivalent) successfully start client/server; one browser tab connects; unit test and typecheck run; separate packages compile; two browser tabs can connect to a named temporary room; no DB/account; no Phaser import in `game-core`; all changes checked into Git. Document exact commands and version constraints.

**Codex must stop** after M0 and give user a demo and checklist. Do not proactively implement M1+.

**M0 status:** Previously verified and committed (`796dd6f`, `fa3da57`); historical evidence in `docs/M0_VERIFICATION.md`.

## M1 — Playable 2-player combat vertical slice

**Scope:** central arena placeholder (Tiled or simple tile geometry), one placeholder hero archetype (Cái Bang suggested) with normal melee/ranged choices, arrow movement, A manual basic attack, Q/W/E/R input pipeline with only **two working skills** initially, one enemy archetype with HP and death, gold/XP/level, simple HUD; add a **tiny reviewed art/animation proof** (one hero, one creep, idle/walk/attack/hurt/death and one effect) using original assets where available, otherwise clearly labeled prototype placeholders; full server-authoritative damage, hit event feedback. Two players see one shared enemy and consistent health.

**Acceptance:** arrow movement works and is visible to a second client; manual attack cadence; nearest-at-fire ranged shots fly straight and can miss a moving target; melee cleave targets secondary at reduced damage; QWER cannot cast unavailable/unequipped skill; same enemy HP agrees for both clients; server rejects forged damage/position. All numeric behavior unit-tested without browser. Verify the real loaded animation registry and direction/frame selections in-browser, with screenshots if actually captured; if no authentic art is available, keep art completion OPEN without blocking gameplay implementation.

### M1 verification checkpoint — 2026-10-29

**Status: engineering verified; final art review OPEN.** M2 has not started. User authorized M1 and confirmed v1.2 art direction in this chat.

- [x] Orthographic tiled arena with server-owned collision and a fixed non-rotating follow camera.
- [x] Eight-direction normalized movement, four-facing animations, crisp integer scaling, foot-depth sorting and actual walk-behind-tree proof.
- [x] One Cái Bang training archetype; manual melee/ranged normal attacks, frontal reduced cleave and straight dodgeable projectiles.
- [x] Q/W canonical abilities with mana/cooldowns; E/R remain empty and server-rejected.
- [x] One creep archetype, HP/death/hit feedback, fixed-pool gold/XP/levels and earned point count; seeded core tests and server-owned RNG.
- [x] Original prototype PNG/atlas sources and manifest: hero/creep idle/walk/attack/cast/hurt/death in four facings; terrain, occluding tree and fire effect. Real frames loaded and inspected in-browser.
- [x] Strict typecheck, 62 unit/integration tests, five Chromium smoke tests, actual asset/handoff checks and reproducible 100-run M1-only probe.
- [ ] Director approval of final artwork/palette/detail (current files intentionally remain `prototype`).

See [`docs/M1_VERIFICATION.md`](docs/M1_VERIFICATION.md) for measured results, preserved screenshots, scope limitations and manual demo steps. No dungeon, statue clock, four-school progression, crafting, boss or PvP gameplay was added.

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
