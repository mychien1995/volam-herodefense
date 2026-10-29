# Technical Architecture Decision Record v1.0

## 1. Recommended stack (proposed; confirmed as recommendation, not code already built)

| Layer | Recommendation | Why |
|---|---|---|
| Browser rendering | **Phaser 4** + TypeScript | 2D sprites, tilemaps, animation, input; suits browser-first pixel-art combat |
| Client bundler | Vite | Fast local iteration and static production assets |
| Multiplayer | **Colyseus 0.18** + Node.js + TypeScript | Room lifecycle, realtime state sync, server authority, matchmaker and newer netcode APIs |
| Shared game logic | Standalone TypeScript `game-core` | Same logic testable without rendering/network and callable by simulation |
| Data/catalogue | Versioned TS/JSON files with **Zod** runtime validation | More schools/items/waves via data not giant switch logic |
| Workspace | pnpm workspaces + TypeScript project references as warranted | Simple monorepo, dependency boundaries |
| Tiled maps | Tiled Map Editor (JSON export) | World collision layers and map authoring |
| Unit & sim tests | Vitest | Deterministic engine, skills, net messages, item operations |
| Browser e2e | Playwright | Keyboard and multiplayer flow tests with screenshots |
| Deployment | Static HTTPS host for client + persistent WebSocket-capable Node service for game server | No DB required for match-only state initially |

**Verify installed SDK documentation/APIs before generating code.** Colyseus 0.18's room and client APIs differ from 0.17; avoid hallucinating older examples. Official Colyseus coding-agent skill can help. Phaser 4 is the open-source API-driven engine; Phaser AE is a separate AI-oriented product, not necessary for this architecture. Never mix unrelated AE-generated code into codebase without review.

**Current references checked 2026-10-29:**
- Phaser official download: https://phaser.io/download (Phaser 4, currently lists 4.2.1)
- Colyseus official docs: https://docs.colyseus.io/
- Colyseus state sync: https://docs.colyseus.io/state
- Colyseus modern netcode: https://docs.colyseus.io/netcode
- Colyseus rooms/matchmaking: https://docs.colyseus.io/matchmaker
- Colyseus agent guidance: https://docs.colyseus.io/getting-started (mentions `npx skills add colyseus/skill`)
- Codex agent skills: https://learn.chatgpt.com/docs/build-skills
- Codex customization: https://learn.chatgpt.com/docs/customization/overview

## 2. Proposed monorepo structure after scaffolding

```
vo-lam-hero-defense/
  AGENTS.md
  README.md
  apps/
    game-client/       # Phaser scenes, input, UI, VFX, rendering, prediction
    game-server/       # Colyseus rooms, match clock, server networking
  packages/
    game-core/         # engine-neutral deterministic simulation + combat
    game-data/         # schools, skills, NPCs, items, waves, maps metadata
    game-protocol/     # validated commands, events, schemas, versions
  tools/
    balance-simulator/ # seeded CLI simulation and reports
  assets/
    ...                # original/appropriately licensed pixel art/sound
  maps/
    ...                # tiled JSON, collision objects, spawn metadata
  .agents/skills/      # repo-local Codex skills already in handoff
  *.md                 # durable design/architecture docs
```

Do not scaffold every directory in Milestone 0 unless it helps initial toolchain; prioritize a small runnable skeleton. Keep documents in place or move coherently with link updates.

## 3. Dependency and authority rules

- `game-core` **must not import Phaser, Colyseus, browser globals, wall-clock time, or filesystem**. Accept time steps, inputs, state and injected RNG.
- `game-data` contains content authored as validated data, stable IDs and localization. Some advanced effect handlers may live in core, but skills mostly compose reusable effects.
- `game-protocol` defines network input commands (`move`, `basicAttack`, `cast(slot)`, `enterDungeon`, `leavePortal`, `equipSkill`, `respec`, `shopBuy`, `craft`, `roll`, `pvpReady`, etc.) and snapshot/event messages. Version and validate.
- `game-server` is the **only authority** for positions, collision/damage results, RNG, enemy AI, cooldowns, spend/award gold, XP, loot, loot rolls, wave clock, victory/defeat. Room lifecycle/isolation stays here.
- `game-client` takes keyboard/mouse input, renders snapshots and effects, interpolates other players, shows HUD and NPC UI. Client-side prediction may improve responsiveness but **must reconcile** to server truth and never determine authoritative hits or rewards.
- Room match state owns player entities, XP/level, inventory, map-zone/instance membership, shared statue health, current raid schedule, boss statuses, and ephemeral PvP sub-rooms/arenas.
- No database for v1 (the entire room is disposable). Store only anonymous nickname and temporary connection/session ID; avoid storing real identifiers or secrets.

## 4. Rooms vs zones

**Recommended:** one Colyseus **match room** contains all up-to-six participants, a central arena and independent dungeon/PvP zone instances (partitioned entity interest sets). This avoids permanent player-state migrations between different Colyseus room servers. Server holds and simulates each active zone (paused dungeon when empty) and syncs mainly entities relevant to the observing player plus global raid alerts/statue state. This is architecture advice and can evolve after load tests.

**Private dungeon:** max one participating player in that zone instance. **Shared dungeon:** max six and shared wave state, optional multiple instances for different groups if authored. **Boss dungeon:** fixed-power boss; empty for 30s → reset when alive; killed → cooldown respawn.

**PvP**: for first version, a match-owned duel zone with Team A, Team B, ready flags and start/finish state. Never exceed six players in the match; no arena re-spec while duel is active. World-clock policy during duel is OPEN.

## 5. Simulation timing and snapshots

- Authoritative fixed timestep, PROPOSED **20 or 30 simulation ticks per second**. Use monotonic server match time, not client wall clock. Derive raid times from `startTime + n*180s` and trigger each wave exactly once.
- Render as fast as client allows, interpolate remote entities. Avoid sending redundant giant snapshots every render frame; use Colyseus delta sync and network events intentionally.
- Prefer input buffering/sequence numbers, prediction and server reconciliation for responsive arrow-key movement. Colyseus 0.18 has netcode primitives; review official docs and begin with simpler authoritative prototype if rollback is too much for Milestone 1.
- Apply physics/movement/combat in a stable order. Use seeded RNG for crit, loot and procs. Never call `Math.random()` inside deterministic core unless wrapped by an injected seeded generator.
- Separate simulation ticks and presentation events. Sound, particles and camera shake are **client-only**.
- Collision and navigation: define blocked tiles in Tiled and server-side collision geometry; never trust Phaser physics as sole collision authority.

## 6. Entity and message suggestions

```
Player { id, sessionId, nickname, schoolId, level, xp, pointPool, zoneId,
         position, facing, hp, mana, stats, basicAttackId, slots[4],
         ranksBySkill, items, effects, cooldowns, comboTracker }
Creep { id, typeId, zoneId, position, hp, waveId, aggroTargetId? }
Boss { id, definitionId, zoneId, position, hp, spawnState, respawnAt? }
Statue { hp, maxHp, position }
Match { roomId, serverTime, phase, invasionIndex, raidSchedule,
        statue, chapterBossStates, winLose, activeZones }
```

Proposed high-level server APIs/events, not concrete Colyseus APIs:

- Input -> server: validated button state / discrete actions with seq numbers, not client damage.
- Server -> client: player state deltas, entity movement/state, combat event (hit/miss/damage/crit), XP/gold, inventory mutation, timed warnings, dungeon transitions, roll offers/results, match end.
- Include match/zone identifiers and reliable event IDs so UI does not misapply stale/out-of-order messages.
- Rate-limit client actions and prevent repeated purchase/craft command retries from duplicating items.

## 7. Asset and UI approach

- Original top-down pixel art; PROPOSED initial terrain tiles 32×32, simple placeholder hero/enemy shapes acceptable through vertical slice. `ART_ASSET_GUIDE.md` defines the asset pipeline, authoring sources, export/atlas metadata, asset provenance and M0/M1 visual proof checkpoints. No final game sprites are supplied by this handoff.
- Tiled tile layer for ground/obstacles, object layers for statue/NPC/spawns/exit portals/collision; enforce stable object IDs.
- Core HUD: hero HP/mana/level/XP, gold, four skills and cooldowns, A attack state, visible next-invasion countdown, statue HP, current zone, invasion alerts, item/skill and boss-roll dialogs, combo cue for Thiếu Lâm.
- Explicitly show affected hitboxes and telegraphed boss attacks. Animations must be readable before being beautiful.
- Keep original editable sources outside the deployable client bundle, and load exported PNG/atlas JSON via a data-driven animation registry; never tie authority for damage/hits to visual frames.
- Verify Phaser 4 pixel-art renderer settings (`pixelArt`, filtering, pixel rounding) against the installed version and visually inspect at the intended browser zoom.

## 8. Security and operational guardrails

- Anonymous sessions only; nickname length, profanity/malformed input handling and duplicate display names. Never grant powers based on nickname.
- Prevent client-supplied state mutation, forged item drops, out-of-range casts, resource underflow, ghost players, room injection, repeated packet spam, timing abuse and duplicated rewards.
- Disconnect/reconnect: short session grace is recommended; how inventory behaves if disconnected permanently needs a deliberate policy. Room cleans up with no players after defined timeout, no persistence.
- Start with one Node server instance and static site hosting; no Redis/database/microservices before evidence requires them. For scale-out later, ensure one room simulation runs on one authoritative process, and route connections accordingly.
- Add logging / basic server metrics: rooms, players, tick duration, active entities, message rate, fatal errors, server combat exceptions. Instrument without collecting unnecessary personal data.

## 9. Testing strategy and handoff

- `game-core` pure deterministic unit tests: damage, collisions, statuses, combo, XP, loot, inventory, enemy AI, level and timing.
- Server integration: two clients join room, both see same positions/HP and match clock, one attack produces one damage, respawn, dungeon instance isolation, raid overlap, boss gating.
- Browser E2E: send arrow keys and A/QWER, assert player moves and abilities animate, mouse NPC interactions, create/join room, monitor errors and screenshots.
- Headless bot simulator for balancing. `tools/balance-simulator` is a standalone CLI and must not depend on Phaser.
- Performance tests: 6 players, concurrent NPC/projectiles, both lanes, overlapping waves, reconnect. No guessed production performance claim until measured.

## 10. Implemented M1 checkpoint and confirmed v1.2 view

The current playable slice uses Phaser 4.2.1, Colyseus core 0.18.23 / Schema 5 / SDK 0.18.8 and protocol version 2. `Room.setFixedTimestep` advances `game-core` at the provisional 30 Hz; no client-submitted time step, location, damage or reward is accepted. A room-local server-generated seed feeds the pure core RNG. Core commands, shots, geometry and rewards are plain TypeScript; networking schemas remain in `game-protocol`. The server publishes actor/projectile patches and monotonic combat event IDs.

The confirmed view is **orthographic elevated top-down / three-quarter 2D** with square tiles, a non-rotating local-player camera, eight-way movement and initial four-facing art. It is not an isometric or 3D projection. The client rounds interpolated presentation coordinates and sorts actors/labels/bars by rendered foot Y, against scenery ground-contact Y. Ground tiles sit below those layers; tree trunks have independent server footprints. A fixed 480×300 logical viewport scales by integer 1×/2× steps; no CSS fractional stretching or smooth filtering.

`maps/arena.tmj` is the original Tiled-compatible map. Preparation copies that map to the client and `game-data` JSON, preventing separate client-only collision truth. Original source sprites come from `assets/source/m1_art.py`, exported PNG/JSON plus a provenance/animation manifest; only the committed exports are required at runtime. `art.ts` registers actual named frame tags. The optional gallery and `?debug=1` read-only evidence bridge do not accept authoritative state changes.

M1 deliberately uses simple snapshot interpolation, not client prediction/rollback. The browser test harness owns compiled server/preview lifecycle through APIs to avoid Windows process-tree teardown hangs. All numeric tuning is in validated `game-data`; the headless M1 probe is isolated under `tools/` and does not import Phaser/Colyseus. See `docs/M1_VERIFICATION.md` for evidence and limitations. Later zone interest management, pathfinding, arena respawn and the invasion clock remain future work.
