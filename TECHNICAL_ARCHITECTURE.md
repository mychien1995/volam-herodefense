# Technical Architecture Decision Record v1.0

## Current dungeon entry correction — 2026-10-30

Dungeon entry uses the existing Phó Bản menu anywhere in the arena. The Guide sprite/label/map marker and proximity config are removed. `DungeonMatch.canEnterDungeon` validates alive arena membership; MatchRoom retains phase/replay/access validation. A `dungeon_return` spawn marker preserves the existing (960,576) exit/respawn destination independently of any NPC. Physical exit range, dungeon isolation, rewards and empty pause/resume remain unchanged. This supersedes Guide requirements in earlier implementation notes below.

## Arena visual v2 — 2026-10-30

The current arena loader uses `arena_v2/ground.png`; Tiled ground data records the matching 600×540 court and 160px approaches. The interior tree/collider is removed and the two remaining tree colliders follow their new perimeter feet positions. ART-01 statue/props/ambient animations are reused. `FloatingDamage` is a client-only world-space presentation of authoritative hit target/position/amount/critical fields, with bounded per-target burst offsets, nearby-target lanes and an 850ms rise/hold/fade. The fixed damage toast is removed. No core combat or protocol change occurs.

`dungeon-selector.css` styles only the in-viewport dungeon modal. Individual original static card PNGs sit under live DOM labels and controls; existing Guide-validated entry remains. Unavailable destinations cannot become selections; Riêng/Chung sends the existing access value. Modal container state uses `data-active-menu`, while the dialog's `data-menu` is cleared on close. Debug-only forest study moves to Settings. See `docs/ARENA_VISUAL_V2_REVIEW.md` for asset tooling, runtime evidence and limits.

## M2A implementation — 2026-10-30

`game-core/DungeonMatch` owns an arena World and one World per private/shared creep instance. Membership, per-zone fixed clocks, kill-to-advance waves, empty pause/resume, transfer cleanup/cooldown conversion and the configurable five-second arena death recovery are engine/transport independent. Data and authoritative markers come from `game-data/dungeon.ts` and `maps/creep_forest.tmj`; the arena receives only a Guide NPC marker. See `docs/M2A_IMPLEMENTATION.md` for tuning and limits.

Protocol v4 adds strictly validated `dungeon-action` open/enter/exit, hero zone/respawn state and dungeon progress. `MatchRoom` routes inputs to membership, namespaces dungeon entities and uses Colyseus StateViews for current-zone enemies/projectiles and hero spatial fields. Party metadata remains public within the room; private instance progress is owner-only. Combat events are sent only to current occupants and guarded by zone on the client. The arena clock continues while dungeon worlds pause empty.

The existing `ArenaScene` switches map presentation, destroys old display objects and retains actor/camera/animation behavior. `dungeon-presentation.ts` reuses existing PNG/tile assets as an explicitly unapproved prototype. The existing in-viewport dungeon modal now drives real Guide-validated entry. A separate physical clickable exit drives validated return; there is no recall action. ForestStudy remains a presentation-only scene. No M2B invasion or boss systems are implemented.

## ART-01 presentation integration — 2026-10-30

`arena-art01.ts` composes the authored ground, prop atlases, separated tree base/canopy images, shallow garden water loops and bridge deck/front rails. The statue retains the existing (800,576) marker; all three tree trunk positions and the north wall retain shared-map collision. M1 has no statue solid collider or water collision, and this art task does not add one. `arena-scene.ts` retains actor interpolation, feet depth, approved animation selection, camera and authoritative combat-event rendering. `art.ts` registers padded world/garden/ambient atlases and 160ms decorative water/glow loops, independent of combat timing. Actor assets remain protected by the approved-byte lock.

`arena-hud.css` and `ui.ts` render compact PNG-framed live DOM overlays. Utility handlers match actual menu buttons, not dialog containers; modal clicks stop before reaching the world and closing returns canvas focus. `assets:export:arena` exports artist-edited Aseprite sources; builds require only committed PNG/JSON files. `verify:assets` checks old and ART-01 exports. Provenance and approval are in `assets/arena_art01.manifest.json`; runtime evidence lives under docs/evidence/art01.

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

- CONFIRMED original 2D Pokémon-like elevated overhead/three-quarter **orthographic** perspective across arena/dungeon/PvP; no rotating camera, 3D chase camera, diamond isometric map or side view. Render scene depth by feet position/Y-sorting and layered foreground roofs/trees. PROPOSED initial terrain tiles 32×32, simple placeholder hero/enemy shapes acceptable through vertical slice. `ART_ASSET_GUIDE.md` defines the asset pipeline, authoring sources, export/atlas metadata, asset provenance and M0/M1 visual proof checkpoints. No final game sprites are supplied by this handoff.
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

## 13. Mandatory in-game HUD and overlay architecture (v1.4)

Read `UI_UX_SPEC.md` before changing game-client layout. In-match UI should be contained by a responsive, world-dominant `GameViewport` (Phaser canvas + camera-independent HUD + viewport-anchored modal overlay); a pre-match lobby may remain a separate screen. Avoid persistent page-sidebars or admin dashboard cards. Use a `position:relative` game wrapper and absolutely positioned DOM overlays if richer inventory/NPC menus warrant it; using DOM **inside** the viewport meets the requirement. Phaser HUD containers with zero scroll factor can coexist with DOM menus. Maintain input focus/pointer gating so menu clicks and typing do not invoke combat or move commands. Server remains authoritative for game state; overlays only bind/render it. Handle raid warning overlays above open menus and never pause the multiplayer match when an individual client has a modal open. See `CODEX_UI_REFACTOR_TASK.md` for a focused existing-client migration; no backend rewrite or new protocol is implied.

## Existing M1 client — v1.5 UI implementation

`main.ts` retains Colyseus 0.18 room/event wiring. `ui.ts` binds synchronized state to a full-window `GameViewport`, HUD and one focus-managed DOM modal layer; `menus.ts` contains display-only templates. No browser/UI dependency enters shared simulation packages. Phaser's NONE scale mode uses `ScaleManager.resize` with integer display zoom, exposing more world at larger windows without reserving layout space for HUD. Camera remains orthographic/non-rotating and follows at a small vertical framing offset.

Modal open releases held movement and gates gameplay input. Close restores canvas focus; Tab stays within the modal. NPC handlers explicitly require the original pointer target to be the canvas, preventing DOM HUD clicks from leaking through Phaser's document-level input listener. Menus and the forest art study never pause server simulation. ForestStudy is a presentation scene, not a server zone or travel command. Existing combat/core/data/protocol/server/map geometry remain unchanged.

The top-level `announcements` presentation layer (z=60) is above the modal (z=30); M2 must bind real raid alerts when available. No synthetic raid schedule is presented in M1. Official scaling/camera guidance checked against installed Phaser 4.2.1: https://docs.phaser.io/phaser/concepts/scale-manager and https://docs.phaser.io/phaser/concepts/cameras.


## UI Phase 1 pre-game phases — 2026-10-30

The existing MatchRoom owns WAITING_LOBBY → SCHOOL_SELECTION → IN_GAME, `hostId`, per-player `schoolId`, `confirmed` and `connected`. Protocol v3 adds validated `lobby-action` start/select/confirm messages; only the host starts selection. Confirmation is immutable and all participants must be connected and confirmed before creating level-1 core heroes, copying school IDs and enabling the fixed simulation timestep. Match elapsed milliseconds derive from simulation ticks; no room-creation clock drives gameplay. Existing M1 spawning/collision/combat tuning remains intact. Future invasion scheduling must derive from IN_GAME time.

`GET /rooms` reads actual public Colyseus listings, including capacity, lock and phase. `pregame.ts` renders four interactive HTML screens inside the viewport wrapper and polls listings every three seconds. Landing nickname is memory-only; no accounts/storage are introduced. School identity text is shared data from CONTENT_DATA.md; numeric tuning and other schools' combat remain M3. Existing HUD/menu components resume when the pre-game overlay hides; Phaser scaling and camera are unchanged. Selection disconnects hold the confirmation barrier without an automatic policy; unresolved recovery choices live in OPEN_QUESTIONS.md.

## M2B authoritative defense — 2026-10-30

Protocol 5 extends the existing room and DungeonMatch with an optional engine-independent InvasionDirector. The live room enables it using validated game-data recipes and server environment defaults; pure M2A simulations can omit it. The IN_GAME clock drives fixed 180-second deadlines and 60/15-second notices. Arena stepping continues while participants farm dungeons; empty dungeon clocks still pause. Root defense Schema state is visible in every zone, while enemy/projectile/combat events remain zone filtered. StateView spatial filtering also remains active in DEFEAT.

Invaders reuse Creep, the existing movement/collision, hit/death, assist reward and RNG pipeline. Each carries immutable spawn-strength data and mutable sticky aggro/leash state. Both lane markers and the statue marker come from the authoritative map. A solid pedestal footprint is added to live arena collision without moving the statue. Surviving waves append; dead invaders expire without respawn. Generic practice/dungeon creeps retain their existing behavior.

Statue HP is an authoritative Actor and never regenerates. A single zero-HP transition publishes DEFEAT, freezes all zone clocks/combat/respawns and rejects later gameplay commands. The DOM DefenseHud stays inside the Phaser viewport, renders received tick/deadline values and global notices, and closes existing menus on defeat. Existing camera/art/input mappings are retained. See docs/M2B_IMPLEMENTATION.md for defaults, tests, evidence, development overrides and limits. No boss/20-wave campaign/M2C implementation is implied.

## Join admission correction — 2026-10-30

MatchRoom no longer explicitly locks at host Start; Colyseus automatic six-seat locking is retained, and DEFEAT explicitly locks. The global phase still gates the initial all-confirmed barrier. In IN_GAME, per-player confirmed state gates selection, hero creation and gameplay commands: unconfirmed late clients can only choose/confirm school, and confirming adds their hero without rebuilding any existing simulation state. PreGame derives its local selection screen from the entrant confirmation flag, and redraws only when phase/roster/selection changes, preserving control focus through 30 Hz world ticks. Main input guards and actor rendering also require confirmation. No wire-schema change or new client authority is introduced.
