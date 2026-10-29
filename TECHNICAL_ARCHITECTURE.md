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

- Original top-down pixel art; PROPOSED initial terrain tiles 32×32, simple placeholder hero/enemy shapes acceptable through vertical slice.
- Tiled tile layer for ground/obstacles, object layers for statue/NPC/spawns/exit portals/collision; enforce stable object IDs.
- Core HUD: hero HP/mana/level/XP, gold, four skills and cooldowns, A attack state, visible next-invasion countdown, statue HP, current zone, invasion alerts, item/skill and boss-roll dialogs, combo cue for Thiếu Lâm.
- Explicitly show affected hitboxes and telegraphed boss attacks. Animations must be readable before being beautiful.

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

## 10. M0 implementation checkpoint (2026-10-29)

The recommended stack is now bootstrapped and locally verified. Exact versions, sources and observed checks are in [`docs/M0_VERIFICATION.md`](docs/M0_VERIFICATION.md); the design proposals above remain proposals.

- Use the modular `@colyseus/core` 0.18.23 + default WebSocket transport, Schema 5.0.42 and `@colyseus/sdk` 0.18.8. `defineServer` / `defineRoom`, the Schema builder, typed client messages, `validate` and close-code lifecycle semantics are used; no 0.17 compatibility code.
- `game-protocol` owns synchronized **lobby** schemas and versioned Zod commands. The server validates nickname/options at admission and counts connection checks using the actual session ID. Replayed sequence numbers do not increment twice. The frontend validates acknowledgements and renders state patches. The client imports the room **type** only, erased from its browser bundle.
- `game-core` has no dependencies, DOM/Node ambient types, Colyseus, Phaser, wall-clock or I/O. A seeded RNG and golden-sequence/replay tests establish the headless foundation. No movement/combat/tick simulation is implemented in M0.
- pnpm workspaces link compiled package exports; TS project references compile shared packages, server and client. `dev` builds/watches shared JS and starts the server and Vite; strict checking also covers tests and tool configs. Vitest exercises a real HTTP/WebSocket room with SDK clients; Playwright uses two isolated Chromium contexts and captures screenshots.
- M0 only has disposable lobby state. No DB/auth module, login, saved progress, zones, game clock or gameplay. Immediate disconnect cleanup and nickname policy are provisional in `OPEN_QUESTIONS.md`.
