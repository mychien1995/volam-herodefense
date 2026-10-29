# Võ Lâm Hero Defense — Codex Project Handoff v1.0

**Status:** M0 scaffold implemented and verified; gameplay begins in M1. **Date:** 2026-10-29. **Language:** English documentation; Vietnamese names are canonical gameplay content.

A browser-first 2D, top-down, pixel-art, multiplayer martial-arts hero-defense action RPG inspired by the *structure* of classic Warcraft III defense custom maps. Create original or appropriately licensed art, audio, map assets, and lore; no Warcraft/Pokémon assets or proprietary map code.

## Start here

1. Extract this entire folder to an empty Git repository.
2. Open **the repository root** in Codex / ChatGPT Desktop, not just one document.
3. Read [`CODEX_START_HERE.md`](CODEX_START_HERE.md), then [`AGENTS.md`](AGENTS.md).
4. Ask Codex to execute **Milestone 0 only**. Do not request the entire game at once.
5. Approve the plan and iterate through milestone acceptance tests.

The design handoff remains authoritative. The runnable M0 is a lobby and connection proof, with a placeholder courtyard; no gameplay is implemented.

## Run M0 on Windows (PowerShell)

Use Node **24 LTS** or a supported Node **22.12+ / 26+** release and **pnpm 11.25.0**. Verified here with Windows, Node 26.0.0 and pnpm 11.25.0. If pnpm is missing, install it with `npm install --global pnpm@11.25.0`, then open a new terminal. Python 3 is needed only for the existing handoff integrity script.

```powershell
Set-Location D:\Projects\volam-hero-defense
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:5173/**. Server readiness: **http://localhost:2567/health** returns `{"status":"ok","milestone":"M0","protocolVersion":1}`. Keep the terminal open; Ctrl+C stops the dev processes. Ports 5173 and 2567 must be free. Shared packages compile before startup and are watched along with the apps.

The workspace settings keep caches under `.cache/`, pin pnpm, and explicitly install required peers. `esbuild` may run its install script; the optional `msgpackr-extract` native optimization is deliberately disabled, using its JavaScript fallback. No database, login, Redis or external service is required.

### Two-browser demo

1. Open the client in two tabs or two separate browser windows/profiles.
2. In A, enter `Võ Lâm` and click **Create room**. Select/copy **Current room**.
3. In B, enter `Thiếu Lâm`, paste that ID into **Room ID**, and click **Join room**.
4. Both show **Connected**, **2 / 6**, and both nicknames in the roster and courtyard.
5. Click **Check connection** in A. A receives the server acknowledgement; **both** rosters show `Checks: 1` for Võ Lâm.
6. Click **Leave** in B (or close its tab). A returns to **1 / 6**. A separate **Create room** has an independent roster. A seventh seat is rejected; the integration suite verifies this.

M0 only has a lobby: there is no match-start/ready control or gameplay clock. Arrow keys, A and QWER are preserved for M1 and do nothing in this preview. Nicknames are display labels, not identity. M0 provisionally removes a disconnected seat immediately; rejoin explicitly. The room is discarded when its last client leaves.

### Checks and browser facilities

Run in another PowerShell terminal at the repository root:

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm verify:handoff
pnpm install:browsers
pnpm test:e2e
```

`pnpm install:browsers` downloads Chromium to `.cache/ms-playwright`. The test wrapper uses that cache automatically; `PLAYWRIGHT_BROWSERS_PATH` can override it. The Playwright smoke test builds the apps, starts a compiled server/static client preview through their Node APIs (or reuses running local services), opens two isolated contexts, checks synchronized state, explicit leave and abrupt tab close, rejects browser errors, and writes screenshots to `test-results/`. It uses Chromium only. Integration tests bind port **2568** separately from dev.

`pnpm test:watch` watches unit/integration tests; `pnpm format` formats source/config/tests while preserving handoff Markdown and bundled skills. TypeScript is strict, with additional unchecked-index and exact-optional checks; test and tool files are typechecked too. No separate ESLint layer is needed yet.

To run the compiled server after stopping dev:

```powershell
pnpm build
pnpm --filter @volam/game-server start
```

For a custom server port, set `$env:PORT = '2569'` before starting it and set `VITE_SERVER_URL=http://localhost:2569` in `apps/game-client/.env.local`, then restart Vite. The default needs no environment files. A production static client plus persistent WebSocket service is a later deployment task.

### Source layout

| Path | Responsibility |
|---|---|
| `apps/game-client/src/` | Phaser placeholder scene, DOM lobby, SDK connection; server imports are type-only |
| `apps/game-server/src/` | Colyseus 0.18 match room, admission, message validation, health route |
| `packages/game-core/src/` | Dependency-free, headless seeded RNG starter; no DOM, engine, networking, time or I/O |
| `packages/game-data/src/` | Validated M0 configuration and canonical input bindings; no combat tuning yet |
| `packages/game-protocol/src/` | Versioned Zod messages/join options and Schema 5 synchronized lobby state |
| `tests/` | Core/config/protocol/boundary tests, real SDK room integration, compile-time message checks, browser smoke |

Package exports resolve compiled JS/declarations; `pnpm build:shared` prepares them for tests/dev. `game-core` compiles with ES libraries only and no ambient platform types. Colyseus schemas stay in protocol, separate from future simulation entities. Dependencies and lockfile pin the verified stack; see [M0 verification and limitations](docs/M0_VERIFICATION.md).

## Document index

| Document | Purpose |
|---|---|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Core gameplay, map, room, dungeon, PvP, invasion rules and ending |
| [`CONTENT_DATA.md`](CONTENT_DATA.md) | Canonical named skill catalogue, schools, and content structure |
| [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) | Input, movement, targeting, combat, crit, cleave, conditions and Phát Động |
| [`BALANCING.md`](BALANCING.md) | Balance philosophy, XP, enemy scaling, simulation and telemetry |
| [`ITEMS_AND_CRAFTING.md`](ITEMS_AND_CRAFTING.md) | Item upgrades, 4 slots, boss loot rolls, crafting and inventory |
| [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md) | Engine/server decision, package boundaries, netcode and testing |
| [`ROADMAP.md`](ROADMAP.md) | Milestones, acceptance criteria and incremental delivery sequence |
| [`ACCEPTANCE_TESTS.md`](ACCEPTANCE_TESTS.md) | Given/when/then checks for confirmed mechanics |
| [`DECISIONS.md`](DECISIONS.md) | Fixed choices vs proposed defaults; conflict-resolution policy |
| [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) | Not-yet-approved mechanics and future design work |
| [`AGENTS.md`](AGENTS.md) | Codex's repository-wide durable rules |
| [`CODEX_START_HERE.md`](CODEX_START_HERE.md) | Copy/paste first Codex task |

## Skills (bundled, no installation required in repo)

- `.agents/skills/game-playtest/SKILL.md`: browser-based movement, visual, and multiplayer smoke-testing workflow.
- `.agents/skills/combat-balance-test/SKILL.md`: deterministic headless battle and farming balance checks.
- `.agents/skills/create-game-ability/SKILL.md`: repeatable skill addition with combat rules and tests.

These are **instruction-only** workflows, not executables. They become useful as the project gets implemented. For Colyseus version-specific APIs, also consider the official `colyseus/skill` package after reviewing its source and instructions.

## Documentation precedence and change policy

1. Confirmed user decisions in `DECISIONS.md` override proposals anywhere else.
2. Mechanic-level details in `COMBAT_SYSTEM.md`, `ITEMS_AND_CRAFTING.md`, or `GAME_DESIGN.md` are next, subject to confirmed decisions.
3. Named content definitions in `CONTENT_DATA.md` are canonical for spelling and the skill list.
4. Tentative sample numbers are **not** approved balance decisions and should stay configurable.
5. Unresolved matters go into `OPEN_QUESTIONS.md`; Codex must not infer a user's choice from a mockup.

### Core fantasy

Start level 1 with a school and a manually controlled hero. Farm private or shared dungeons, choose and reassign four active skills, find boss drops, upgrade and craft equipment, and manually return to defend an **unrepairable statue** against **20 invasions every 3 minutes**. Defeat Đông Tà, Tây Độc, Nam Đế, Bắc Cái, then final boss Vương Trùng Dương. Up to six players; a tough solo clear remains possible. Nothing persists after the match ends.
