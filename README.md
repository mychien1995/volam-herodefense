# Võ Lâm Hero Defense — M1 Prototype · Art Direction v1.2

**Status:** M0 and M1 engineering verified; original prototype artwork awaits review. **Date:** 2026-10-29. **Language:** English documentation; Vietnamese names are canonical gameplay content.

A browser-first 2D, top-down, pixel-art, multiplayer martial-arts hero-defense action RPG inspired by the *structure* of classic Warcraft III defense custom maps. Create original or appropriately licensed art, audio, map assets, and lore; no Warcraft/Pokémon assets or proprietary map code.

## Design handoff

The original bootstrap workflow below is retained for context; M1 is now implemented. Use the run instructions first.

1. Extract this entire folder to an empty Git repository.
2. Open **the repository root** in Codex / ChatGPT Desktop, not just one document.
3. Read [`CODEX_START_HERE.md`](CODEX_START_HERE.md), then [`AGENTS.md`](AGENTS.md).
4. Ask Codex to execute **Milestone 0 only**. Do not request the entire game at once.
5. Approve the plan and iterate through milestone acceptance tests.

The runnable M1 now includes original prototype sprites and combat. Final art is not approved. `assets/manifest.json` describes the actual files; `assets/manifest.example.json` remains a template, with example paths that are not real source artwork.

## Run M1 on Windows

Prerequisites: Node **24 LTS** or supported Node **22.12+/26+**, and **pnpm 11.25.0**. Verified on Windows PowerShell with Node 26.0.0. Install pnpm if needed with `npm install --global pnpm@11.25.0`. Python/Pillow are optional authoring tools; the committed PNG/atlas exports run without them.

```powershell
Set-Location D:\Projects\volam-hero-defense
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:5173/**. The health route at **http://localhost:2567/health** returns `{"status":"ok","milestone":"M1","protocolVersion":2}`. Keep the terminal open; Ctrl+C stops dev. Ports 2567/5173 are used by dev; integration tests use 2568. `pnpm dev` prepares assets, builds/watches shared packages and starts the authoritative server and Vite.

### Two-player practice demo

1. In A, enter a nickname and **Create room**. Copy **Current room**.
2. In B, enter another nickname, paste **Room ID**, then **Join room**. Both see the same players and creep HP. At most six seats; no account/database/save.
3. Focus the canvas and use **Arrow keys** to move, including diagonals. The camera follows without rotating. Walk left of the western tree, up behind its canopy, then back down in front. The trunk blocks movement; the canopy does not.
4. **A** manually attacks. Choose **Cái Bang Bổng** (frontal melee with reduced cleave) or **Cái Bang Chưởng** (nearest-at-fire straight projectile) from the menu. Face the enemy before a melee strike. Holding A does not repeat.
5. **Q — Hỏa Vân Chưởng:** three paced straight shots. **W — Cuồng Long Loạn Vũ:** exploding fireball and burn. Mana/cooldowns are server-owned. E/R are unassigned and rejected.
6. Kill a creep and observe gold/XP/level. One fixed reward pool is split among recent damaging participants; inactive players get none. Practice creeps refresh after eight seconds. A fallen hero remains dead in this M1 slice; create a fresh practice room. The full arena respawn flow is M2.
7. Leave in B or close its tab; A sees the seat removed. Reconnect grace, host/ready rules and in-progress admission remain provisional.

The orthogonal arena uses 32px square tiles, original elevated top-down sprites and foot-Y depth sorting. These perspective conventions are confirmed; tile size, palette, 48px frames, damage and economy numbers are provisional. The same presentation conventions apply to later maps when those milestones are requested.

### Automated checks

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm verify:handoff
pnpm install:browsers
pnpm test:e2e
pnpm test:balance
```

The smoke runner builds first, owns/cleans up compiled server and static preview services through Node APIs (or reuses running dev), and opens isolated Chromium contexts. Screenshots/traces are in ignored `test-results/`; preserved evidence and exact results are in [M1 verification](docs/M1_VERIFICATION.md). The launcher is `tools/run-playwright.mjs`; it keeps Chromium under `.cache/ms-playwright` and respects `PLAYWRIGHT_BROWSERS_PATH`.

`pnpm test:watch` watches headless tests. `pnpm test:balance` writes deterministic M1-only JSON/CSV under ignored `artifacts/`; it does not claim four-school, dungeon, raid or PvP balance. `pnpm format` preserves handoff Markdown, skills and generated exports. To inspect all actual animation states/facings, open **http://127.0.0.1:5173/?artPreview=1**. This is a presentation-only gallery, not a gameplay command/debug cheat API.

### Original art authoring

Normal dev/build copies committed exports; no commercial art tool or Python install is needed to play. To regenerate/verify the tiny original set:

```powershell
python -m pip install Pillow==11.3.0
pnpm assets:generate
pnpm verify:assets
pnpm assets:prepare
```

`assets/source/m1_art.py` is the editable original source, with deterministic hand-authored pixel primitives. `maps/arena.tmj` is a real orthogonal Tiled-compatible source; preparation copies its JSON into shared data so the server and renderer use the same geometry. The actual manifest records provenance, pivots, frames and **prototype** status. Aseprite/Tiled GUI workflows were not run here; final art approval remains open.

### Boundaries and configuration

- `packages/game-core`: dependency-free deterministic simulation, geometry and seeded RNG; no Phaser/Colyseus/browser/clock/I/O.
- `packages/game-data`: validated map/content/tuning. `m1.ts` owns temporary numbers and two canonical abilities.
- `packages/game-protocol`: validated version-2 inputs, events and synchronized schemas. Clients send directions/actions, never positions/damage/rewards.
- `apps/game-server`: owns fixed simulation steps, room lifecycle and RNG seed; publishes patches/events.
- `apps/game-client`: rendering, interpolation, keyboard/menu input, fixed camera and animation registry. Animations never apply authoritative damage.

The dev loop watches shared JS. Restart dev after changing the map or regenerated art (or rerun `pnpm assets:prepare`); world geometry is validated at startup. After `pnpm build`, run the compiled server with `pnpm --filter @volam/game-server start`. For another port, set `$env:PORT = '2569'` and `VITE_SERVER_URL=http://localhost:2569` in `apps/game-client/.env.local`, then restart dev. M2+ systems and final art remain unimplemented.

## Document index

| Document | Purpose |
|---|---|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Core gameplay, map, room, dungeon, PvP, invasion rules and ending |
| [`CONTENT_DATA.md`](CONTENT_DATA.md) | Canonical named skill catalogue, schools, and content structure |
| [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) | Input, movement, targeting, combat, crit, cleave, conditions and Phát Động |
| [`BALANCING.md`](BALANCING.md) | Balance philosophy, XP, enemy scaling, simulation and telemetry |
| [`ITEMS_AND_CRAFTING.md`](ITEMS_AND_CRAFTING.md) | Item upgrades, 4 slots, boss loot rolls, crafting and inventory |
| [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md) | Engine/server decision, package boundaries, netcode and testing |
| [`ART_ASSET_GUIDE.md`](ART_ASSET_GUIDE.md) | Sprite size proposals, art sourcing, Aseprite/Tiled exports, pixel-art rendering, animation and visual quality gates |
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
- `.agents/skills/pixel-art-pipeline/SKILL.md`: sprite animation, atlas import/export, provenance and visual verification.

These are **instruction-only** workflows, not executables. They become useful as the project gets implemented. For Colyseus version-specific APIs, also consider the official `colyseus/skill` package after reviewing its source and instructions.

## Documentation precedence and change policy

1. Confirmed user decisions in `DECISIONS.md` override proposals anywhere else.
2. Mechanic-level details in `COMBAT_SYSTEM.md`, `ITEMS_AND_CRAFTING.md`, or `GAME_DESIGN.md` are next, subject to confirmed decisions.
3. Named content definitions in `CONTENT_DATA.md` are canonical for spelling and the skill list.
4. Tentative sample numbers are **not** approved balance decisions and should stay configurable.
5. Unresolved matters go into `OPEN_QUESTIONS.md`; Codex must not infer a user's choice from a mockup.

### Core fantasy

Start level 1 with a school and a manually controlled hero. Farm private or shared dungeons, choose and reassign four active skills, find boss drops, upgrade and craft equipment, and manually return to defend an **unrepairable statue** against **20 invasions every 3 minutes**. Defeat Đông Tà, Tây Độc, Nam Đế, Bắc Cái, then final boss Vương Trùng Dương. Up to six players; a tough solo clear remains possible. Nothing persists after the match ends.
