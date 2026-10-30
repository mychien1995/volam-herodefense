# M2B — Statue Invasion & Defense System

Scope: the requested invasion foundation only. M2A is reused, including menu-only dungeon entry, zone filtering, combat, rewards and five-second death recovery. No M2C work, bosses, item systems, extra schools or new artwork.

## Implementation

- `packages/game-core/src/invasions.ts`: transport/render independent match director. The IN_GAME simulation clock starts at zero after all school confirmations. Waves append at ticks 5400/10800/16200 (180/360/540 seconds at 30 Hz), independently of surviving enemies. Warnings occur 60 and 15 seconds before each production wave. Empty dungeons pause their own clocks; the arena invasion clock keeps running.
- `packages/game-data/src/invasion.ts`: validated statue, west/east markers, warning thresholds, AI leash, scaling and three prototype recipes. Later waves reuse recipe three; this is not the final 20-wave catalogue. Existing practice enemies remain distinct and do not attack the statue.
- `simulation.ts`, `types.ts`, `dungeons.ts`: per-invader stat snapshots, sticky player aggro, objective fallback, shared hit/death/reward pipeline and terminal defeat. Dead invaders are removed after the existing eight-second corpse period and never respawn. Living earlier waves are retained. Statue damage is never repaired or regenerated. Defeat stops every zone, further spawns, combat, respawns and gameplay commands.
- `apps/game-server/src/invasion-config.ts`, `app.config.ts`, `rooms/MatchRoom.ts`: server-only development settings, startup validation, global defense state and DEFEAT phase. Separate rooms own separate directors, clocks, RNG, statues and enemies. Enemy/position StateView filtering continues after defeat. No client command can submit invasion timing, HP, damage or rewards.
- `packages/game-protocol/src/index.ts`: protocol 5 adds nested global defense state and invader wave/lane/target identity. All zones receive the same server tick/deadline, HP and notice state; combat events and enemies remain zone filtered.
- `apps/game-client/src/defense-hud.ts`, `defense-hud.css`, `ui.ts`, `main.ts`, `pregame.ts`: compact in-viewport statue HP, current/next-wave countdown, warning and defeat overlays. Countdown text derives only from received ticks, without a client gameplay timer. Leaving defeat uses the existing Room Browser flow. Menus close and gameplay controls block on defeat.
- `arena-scene.ts`, `floating-damage.ts`: reuse existing sprites, authoritative target-anchored hit numbers and VFX, plus a brief statue tint. Statue collision is the server-owned pedestal footprint at x760/y548, width80/height28, matching its existing world position (800,576). The camera and approved Cái Bang artwork are unchanged.

## Configurable prototype defaults

These are tuning proposals, not final production balance:

| Parameter | Default |
| --- | --- |
| Invasion interval / statue HP | 180 seconds / 2000 |
| First / second / third recipe, per lane | 2 / 3 / 4 walkers |
| Recipe HP | 120 / 150 / 180 |
| Recipe damage | 8 / 9 / 10, through existing crit pipeline |
| Recipe speed | 46 / 48 / 50 world units per second |
| Detect / chase range | 160 / 240 world units |
| Reacquire rest after leash release | 3 seconds while advancing to statue |
| Scaling per extra connected participant | count +60%, HP +16%, damage +8% |

Count, HP and damage snapshot at spawn, including participants currently in dungeons. Disconnects affect future spawns only. Each creep keeps its own stats, contributions and reward pool. Aggro sticks to its current eligible player; death, zone departure, distance from the enemy or from the acquisition point breaks the chase. Nearest eligible acquisition has a stable ID tie-break. Original movement/collision remains authoritative.

## Manual test on Windows

From a PowerShell terminal in `D:\Projects\volam-hero-defense`:

```powershell
$env:VOLAM_INVASION_INTERVAL_SECONDS = '30'
.\start-game.cmd
```

The launcher discovers the bundled pnpm if it is missing from PATH. Keep the terminal open and use the printed Vite URL, normally http://127.0.0.1:5173. Create a room, join its code from a second browser session, start and confirm both schools. The match clock begins after both confirmations. At this test setting warnings appear 10 and 3 seconds before each wave. Wave one arrives at 00:30, wave two at 01:00 even if wave one survives. Fight with arrows/A/Q/W; E/R remain unequipped.

Enter a private or shared dungeon with one participant using Phó Bản. Observe invasion warnings and statue HP there without travel. Leave enemies alive in the arena to observe permanent statue damage and eventual defeat. To accelerate only this defeat check, set `$env:VOLAM_DEV_STATUE_HP = '300'` before launching. Existing physical exits and death recovery still work while the match is active. Defeat freezes both arena and dungeons and offers Rời trận.

Stop with Ctrl+C. Restore normal defaults before a new launch:

```powershell
Remove-Item Env:VOLAM_INVASION_INTERVAL_SECONDS -ErrorAction SilentlyContinue
Remove-Item Env:VOLAM_DEV_STATUE_HP -ErrorAction SilentlyContinue
.\start-game.cmd
```

`NODE_ENV=production` ignores both development overrides. Restart the server and create a new match after changing them. Interval must be an integer from 3 to 3600 seconds; invalid configuration fails startup. Short intervals use roughly one-third and one-tenth of the interval for warnings (minimum 2/1 seconds), preserving distinct thresholds.

## Verification commands and evidence

The implementation run uses Node 26.0.0, pnpm 11.25.0, Phaser 4.2.1, Colyseus core 0.18.23 / SDK 0.18.8 / schema 5.0.42 and Chromium via Playwright 1.64.1. Installed API definitions and current official [Colyseus room](https://docs.colyseus.io/room), [schema](https://docs.colyseus.io/state/schema), [Phaser tween](https://docs.phaser.io/phaser/concepts/tweens) and [Vite JavaScript](https://vite.dev/guide/api-javascript.html) documentation were consulted.

- `pnpm typecheck` — passed, including browser and probe tooling.
- `pnpm test` — 96 tests passed in 11 files, including 10 deterministic invasion tests and 3 new real SDK room tests. Production 3/6/9-minute timing is simulated, not a nine-minute browser wait.
- `pnpm build` — passed; Vite retains its large bundle advisory (Phaser included).
- `python scripts/verify-assets.py` — passed: 17 runtime PNG entries, 248 frame references, bounds/provenance, approved Bổng 44 / Chưởng 40 source poses, tags, binary alpha and pivots. No new art assets were produced for M2B.
- `pnpm --filter @volam/game-server exec tsx ../../tools/m2b-balance.ts` — 18 seeded probes completed: 1/2/6 participants, three seeds, unattended versus stationary ranged A/Q/W guards, up to 600 simulated seconds. Results in `artifacts/m2b-balance.json` and the evidence copy. Unattended defeat: 283.23–284.80 seconds solo, 233.13–233.87 seconds with two, 209.80–209.87 with six. Guards survived 600 seconds; solo statue HP 1879–1894, two/six player statue HP 2000. These bots do not model human difficulty or a production campaign. Other schools/passives/gear/PvP and chapter bosses remain unavailable and were not fabricated for this probe.
- `node tools/run-playwright.mjs test --config playwright.invasion.config.ts` — **2 passed (1.8 minutes)**. Own isolated ports 2570/5174, six-second interval, two/one-second warnings and statue HP300. Two actual Chromium contexts verified joint attacks/rewards, cross-zone warnings without travel, overlap, statue damage, shared defeat, input freeze and Room Browser return. HUD bounds checked at 944×466 and 1920×1080; browser console/page/network monitors recorded no errors. The read-only evidence bridge exposes snapshots; the browser uses real UI, arrow keys and combat commands, without state mutation. Reproducible script: `pnpm test:e2e:invasion`; default browser tests exclude these special-clock scenarios.
- `node tools/run-playwright.mjs test tests/e2e/gameplay.spec.ts tests/e2e/ui.spec.ts tests/e2e/dungeons.spec.ts` — **11 passed (3.8 minutes)** with the normal server clock. Verified shared/private dungeon farming and physical exits, camera/movement/occlusion, joint combat/progression, straight projectiles, animation registry, responsive menus at 1280×720 / 1920×1080 / 900×640, focus/input recovery and utility flows.

Evidence under `docs/evidence/m2b/` consists of actual runtime screenshots, never generated concepts. The first browser attempt caught two incorrect test expectations: area skills killed more than two enemies, and leaving returns to Room Browser. Tests now count actual deaths/reward pools and assert the real navigation destination. A subsequent run was interrupted by watched source formatting; the isolated harness now disables file watching/HMR.

Screenshots: `two-defenders.png` (1280×720 combat), `overlapping-waves-944.png` (compact HUD), `statue-under-attack-1920.png` (permanent damage), `dungeon-warning-1920.png` (private dungeon, global warning), `defeat-1920.png` (terminal overlay). All were captured and visually inspected at the existing gameplay camera zoom. Existing enemy/VFX placeholders are visible and remain explicitly unfinished.

## Changed-file inventory for this milestone

- Core: `packages/game-core/src/{invasions,dungeons,simulation,types,index}.ts`.
- Data/protocol: `packages/game-data/src/{invasion,index}.ts`, `packages/game-protocol/src/index.ts`.
- Server: `apps/game-server/src/{invasion-config,app.config}.ts`, `apps/game-server/src/rooms/MatchRoom.ts`.
- Client: `apps/game-client/src/defense-hud.ts`, `defense-hud.css`, `ui.ts`, `main.ts`, `pregame.ts`, `arena-scene.ts`, `floating-damage.ts`.
- Verification: `tests/invasions.test.ts`, `tests/invasion-room.test.ts`, health expectation in `tests/room.test.ts`, `tests/e2e/{invasion.spec,invasion-setup}.ts`, `playwright.invasion.config.ts`, dedicated exclusion in `playwright.config.ts`, `tools/m2b-balance.ts` and two new package scripts.
- Documentation/evidence: this report, `ROADMAP.md`, `ACCEPTANCE_TESTS.md`, `TECHNICAL_ARCHITECTURE.md`, `DECISIONS.md` and `docs/evidence/m2b/`. Earlier work was already present in the dirty checkout and was retained.

## Limits and remaining work

- Only three walker recipes, repeating the third after wave three; no chapter bosses, final boss, victory/results, full 20-wave data or M2C.
- Prototype tuning is intentionally configurable and needs human balance playtests. The existing generic enemy and fire/hit art remain placeholders. No Aseprite or image generation was needed or claimed for this reuse-only milestone.
- Approved Cái Bang idle/walk/basic attacks are retained; existing fallback cast/hurt/death presentation is still not final art. Existing arena/dungeon visual approval remains pending.
- Generic collision steering is reused. This does not add a navmesh or new complex pathfinding; the configured west/east routes are the tested routes.
- Existing school choices beyond Cái Bang still use M1 gameplay fallback; E/R have no equipped abilities. Full school progression, inventory/items and reconnect/host-transfer policies remain later work.
- Functional completion and runtime verification are distinct from director art approval. M2B does not grant approval to expand artwork or the campaign.
