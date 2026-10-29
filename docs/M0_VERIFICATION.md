# M0 verification — 2026-10-29

M0 implementation is verified. Git checkpoint: local repository initialized; initial commit pending. M1 has not started.

## Handoff interpretation

Read before coding: `AGENTS.md`, `README.md`, `DECISIONS.md`, `GAME_DESIGN.md`, `TECHNICAL_ARCHITECTURE.md`, `COMBAT_SYSTEM.md`, `BALANCING.md`, `ITEMS_AND_CRAFTING.md`, `CONTENT_DATA.md`, `ACCEPTANCE_TESTS.md`, `OPEN_QUESTIONS.md`, `ROADMAP.md`, and `CODEX_START_HERE.md`.

Confirmed decisions win: nickname-only disposable rooms with at most six players; server authority over gameplay and rewards; Arrow movement, A manual attack and QWER skills; canonical Vietnamese names; documented progression/respec, same-target Phát Động and Cầm Long Công semantics; fixed 180-second, two-sided invasion clock with gated chapter bosses; one dungeon boss item per kill and four equipment slots. Those future rules were preserved; no corresponding gameplay was implemented.

Phaser/Colyseus stack versions, simulation tick rate, pixel scale, damage/cleave/growth numbers, rank gates, inventory shape and economy values remain proposals where marked as such. Host/start/late-join, reconnect, assist/loot details and other undecided mechanics remain open. M0 only needs provisional nickname validation, message rate and disconnect cleanup, now explicitly recorded in `OPEN_QUESTIONS.md`. No approved decision was changed.

## Stack actually installed

Environment: Windows PowerShell, Node **26.0.0**, npm **11.12.1**, pnpm **11.25.0**, Python **3.13.5**. Node 24 LTS is recommended for setup; Node 22.12+/24/26 are allowed by the chosen tooling engines, but only Node 26 was exercised here.

| Component | Installed/pinned | Validation |
|---|---|---|
| Phaser | 4.2.1 | Official download + npm metadata, installed types, real browser render |
| Colyseus core | 0.18.23 | Official 0.18 docs + installed API, real SDK integration |
| WebSocket transport | 0.18.4 | Standard transport, no uWebSockets dependency |
| Colyseus Schema | 5.0.42 | `schema`/`t` builder, independent state and binary sync verified |
| Colyseus SDK | 0.18.8 | `Client`, create/joinById, typed send/onMessage, state patches |
| TypeScript | 7.0.2 | Strict app/shared/tools checks and project-reference compilation |
| Vite | 8.3.5 | Dev server, production build and static preview |
| Vitest | 5.0.5 | 26 passing unit/integration tests |
| Playwright | 1.64.1 | Chromium 156.0.8078.4 / build 1248, two isolated contexts |
| Zod | 4.6.7 | Config, admission, command and acknowledgement validation |
| pnpm | 11.25.0 | Six workspace projects including root, frozen-lockfile install |

No major version change from the proposed engine/network stack. The official minimal `create-colyseus-app` 0.18.1 generator was used, then its unused sample room/loadtest/monitor/PM2/Mocha files were replaced by the small workspace implementation.

The umbrella `colyseus` package brought an unused uWebSockets Git dependency that pnpm rejected (`ERR_PNPM_EXOTIC_SUBDEP`). The modular `@colyseus/core` + `@colyseus/ws-transport` packages expose the same required 0.18 APIs without adding Redis/auth/admin/monitor dependencies. Required peers are explicit and automatic peer installation is disabled. The optional native `msgpackr-extract` build is intentionally disabled; its JS fallback passes the suite. `esbuild` is the only allowed install build script. Initial npm global-cache access failed; all subsequent installer/browser caches are project-local.

Current official sources checked:

- [Phaser download](https://phaser.io/download) and [installation](https://docs.phaser.io/phaser/getting-started/installation). Some getting-started samples are still labeled Phaser 3; the small Game/Scene/graphics surface used here was checked against installed 4.2.1 types and browser execution.
- [Colyseus server](https://docs.colyseus.io/server), [rooms and message validation](https://docs.colyseus.io/room), [Schema builder](https://docs.colyseus.io/state/schema), [SDK](https://docs.colyseus.io/getting-started/typescript), [0.18 migration](https://docs.colyseus.io/migrating/0.18), and [testing](https://docs.colyseus.io/tools/unit-testing).
- [pnpm workspaces](https://pnpm.io/workspaces) and [settings](https://pnpm.io/settings), [Vite](https://vite.dev/guide/), [Vitest requirements](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), [TypeScript strict mode](https://www.typescriptlang.org/tsconfig/strict.html) and [project references](https://www.typescriptlang.org/docs/handbook/project-references.html).

## Implemented files and boundaries

- Root manifests, lockfile, workspace config, TS references, formatting, ignore rules and scripts.
- `apps/game-client`: original geometric Phaser courtyard, DOM connection/lobby HUD, create/join by ID, roster, connection acknowledgement and leave.
- `apps/game-server`: independent authoritative six-seat match rooms, normalized nickname admission, validated and replay-safe connection checks, health route, cleanup. No client-provided session identity or authoritative state is accepted.
- `packages/game-core`: seeded xorshift32 RNG starter only, no dependencies/platform imports/clock/I/O. ES libraries and no ambient platform types; deterministic golden/replay tests and an import/global guard.
- `packages/game-data`: validated technical lobby config and preserved canonical key codes. No schools/abilities/items or unapproved balance numbers.
- `packages/game-protocol`: protocol version, Zod payloads and Schema 5 lobby state. Simulation entities remain outside networking schemas.
- `tests`: runtime, real network and compile-time contract checks, plus the two-context browser smoke and its setup/teardown.
- `README.md`: exact PowerShell setup/demo/checks; `OPEN_QUESTIONS.md`: provisional policies; architecture/acceptance/roadmap traceability. All design files and `.agents/skills/` retained.

## Commands actually run and observed outcomes

Final checks on the saved implementation:

| Command | Result |
|---|---|
| `pnpm install` | PASS after packaging/config fixes; all six projects installed |
| `pnpm install --frozen-lockfile` | PASS; `Already up to date` |
| `pnpm dev` | PASS; Vite ready on 5173, `M0 server ready` on 2567, shared watch reported zero errors; server restarted on shared JS changes |
| `pnpm typecheck` | PASS, exit 0; five source packages plus tests/tools and compile-time SDK assertions |
| `pnpm test` | PASS; **4 files, 26 tests**, last unit/integration run 2.59s |
| `pnpm build` | PASS; shared packages and server compile, client builds; 149 browser modules transformed |
| `pnpm format:check` | PASS; `All matched files use Prettier code style!` |
| `python scripts/verify_handoff.py` | PASS; 16 required docs/skills, 43 unique active skill names, example configs and key decisions consistent |
| `pnpm install:browsers` | PASS; uses the local Chromium cache |
| `pnpm test:e2e` | PASS, exit 0 from cold startup; **1 passed (4.3s)** including direct service startup/cleanup; full build/test command took about 8.7s |
| `$env:PORT = '2570'; pnpm --filter @volam/game-server start` | PASS; compiled `node dist/index.js` booted |
| `Invoke-RestMethod http://localhost:2570/health` | PASS; `{"status":"ok","milestone":"M0","protocolVersion":1}` |

The first implementation passes had type errors that were corrected, including explicit Schema defaults and literal protocol types in test helpers. Windows cold-start smoke assertions initially passed but Playwright's shell process-tree teardown hung; those runs were interrupted, not counted as successful full runs. The final global setup owns the compiled Colyseus server and Vite preview directly and closes them through their APIs. The final cold-start run above exited normally. A harmless Node `NO_COLOR`/`FORCE_COLOR` warning remains in the test runner output.

Vitest exercises deterministic sequences, invalid seeds/config/nicknames/protocol versions, independent schemas, core isolation, real room joins, six-player cap and replacement seats, authoritative counts, replay prevention, room isolation, forged packets, explicit leave and empty-room disposal. `tests/protocol.types.ts` uses expected compiler errors to ensure invalid SDK commands/payloads cannot silently become untyped.

## Browser evidence and manual demo

Automated Chromium test: two isolated contexts, 1440×1000 viewports, both join one actual server room, see both Vietnamese nicknames, and observe A's server-owned check count in both clients. Explicit leave, rejoin and abrupt tab close update the other roster. Browser console/page error collection was empty. Screenshots were actually captured and visually inspected for canvas boot, text, roster and clipping:

- [Before joining](evidence/m0-before-join.png)
- [Client A, two players and acknowledgement](evidence/m0-two-clients-a.png)
- [Client B, same authoritative roster/count](evidence/m0-two-clients-b.png)

These copies preserve this M0 run; raw rerun outputs live under ignored `test-results/`. Manual two-tab steps and exact Windows commands are in `README.md`. The browser procedure was automated, not represented as human manual gameplay testing.

## Limitations and next milestone

No movement, combat, four schools, dungeons, progression, inventory/crafting, invasions, chapter/final bosses or PvP. No simulation timing, prediction/interpolation, database, login or persistence. Lobby markers are local layout of server roster entries, not world positions. Immediate disconnect cleanup is provisional, with no saved reconnect session. M0 uses the documented 20-character nickname policy, allows duplicates, and does not implement a profanity service.

Production JS is **1,629.63 kB** / **437.14 kB gzip**, including Phaser; Vite warns about a chunk over 500 kB. Asset optimization/code splitting belongs after the playable slice. Only local Windows/Node 26 and headless Chromium were exercised: no Firefox/WebKit, deployment/TLS, network-latency, six-browser load, combat, balance or hour-long invasion claim is made.

Suggested M1 review breakdown (not implemented):

1. Deterministic fixed-step arena geometry, normalized arrow movement, facing and server collision.
2. Sequenced validated input commands, position snapshots and basic interpolation for two players.
3. One placeholder archetype and enemy, manual A melee/ranged options with frontal cleave and straight, dodgeable projectiles.
4. QWER command routing with two real skills, server cooldown/resource validation and clear visuals.
5. Enemy HP/death and a minimal configurable gold/XP/level loop.
6. Headless numeric/security regressions and two-browser movement/hit/HP agreement smoke tests.

Review M0 before authorizing M1. Remaining tuning and host/reconnect choices stay explicitly open.
