## M3D combined boss protocol16 — 2026-11-01

The main-checkout Lý Mạc Sầu merge combines all six dungeon destinations and bumps the current protocol15 to16 for Co Mo cast/countdown/pending-claim fields. Existing Hồng Liệt/Chu encounter projection and validated Chu item transactions are retained. Co Mo's `CoMoBossCast` export and World boss runtime remain distinct from Hồng Liệt's encounter object and Chu's world state; their lifecycle/CC adapters compose without replacing one another. Earlier protocol14 sections are historical. Integration and executed regression evidence: `docs/LY_MAC_SAU_INTEGRATION.md`.

## Chu Bá Thông integration — 2026-11-01

Protocol14 adds the boss destination, scoped encounter projection and validated loot/material requests. Optional boss state in engine-independent World/Creep/DungeonMatch composes with the existing damage/progression and private/shared zone pipeline. A per-zone server state machine supplies phase clocks, swept palms/projectiles/spin, confinement and moving field geometry. Renderer/UI consume that projection inside the current Phaser viewport; no client animation drives hits. Match-clock empty reset/dead respawn deadlines remain distinct. Source/approval guards, legal-build probes and runtime limitations: `docs/CHU_BA_THONG_INTEGRATION.md`.

## Cổ Mộ encounter / protocol 14 — 2026-11-01

An optional boss definition/runtime composes the existing deterministic World and DungeonMatch. Hostile swept projectiles target same-instance heroes, while ordinary shots retain creep targets. Boss AI owns windups/recovery, one-target release-time aim, eight vectors, bounded summons and twelve world-marker edge lanes. Late DOT kills settle cleanup and unique pending item ownership before snapshot projection. Empty reset and dead-boss respawn use independent match-clock deadlines. Protocol14 projects cast metadata, countdown and pending claims through existing StateViews. The shared retained Tiled map drives authority and Phaser layers; approved PNG/atlas bytes stay pinned. Full M4 inventory is not implemented. Details: `docs/LY_MAC_SAU_INTEGRATION.md`.

## Forest visual roster — 2026-11-01

`game-data/forest-creep-roster.json` is the authoritative ordered six-ID source consumed by `creepDungeon.creepRoster` and the existing Forest asset adapter. `DungeonMatch.assignRoster()` retains a Forest-only per-instance cursor through actual spawn counts; Desert keeps its previous assignment behavior. Existing `CreepState.archetypeId` and MatchRoom projection carry the type; the client registry still selects solely from that field in Forest zones. No protocol, combat-event or renderer API change is required. Static roster metadata is distinct from natural gameplay verification; the new input-only browser scope disables the old pose endpoint and practice targets. See `docs/FOREST_CREEP_RUNTIME_INTEGRATION.md`.

## Small gameplay / protocol12 — 2026-10-31

BuildState adds mode, branchId and planned slotSkills. Validated mode/branch messages use the existing revision/sequence/zone-owned build path. Default branch presets live in game-data/default-builds.ts; deterministic rank allocation lives in game-core/progression.ts and runs on level gains and validated build changes. Planned zero-rank slots become equipped only when learned. Custom mechanics and per-ID cooldown debt remain. Death recovery now uses base.spawn; ordinary door returns retain dungeon.arenaReturn. Keyboard interaction and CSS grayscale are client presentation only. The isolated browser fixture controls live under tests/e2e and are absent from production server routes. See docs/SMALL_GAMEPLAY_CHANGES.md.

# Technical Architecture Decision Record v1.0

## Beach integration — 2026-11-01

Protocol 13 extends the validated destination selector to forest/desert/sea. `game-data/dungeon-registry.ts` resolves all three definitions; Beach uses the existing server-selected creep identity and per-zone authoritative world/geometry/clock. One composed Tiled map supplies collision/markers and Phaser layers. Retained actor/prop/effect atlases and water metadata feed the existing loaders, playback, feet depth and effect cleanup; no specialized enemy gameplay is inferred. The desert atlas-map renderer and isolated art QA service are parameterized rather than replaced. Worktree scope, source correction, provenance, tests and limitations: `docs/BEACH_INTEGRATION.md`.

## Desert integration — 2026-10-31

Protocol 11 adds optional validated forest/desert selection (forest default) and a server-selected creep archetype ID. DungeonMatch registers multiple definitions while retaining its existing constructor/default behavior; every dungeon zone owns its definition, geometry and independent clock. The shared Tiled desert map drives authoritative collision/markers and Phaser presentation. Retained original PNG/atlas metadata feeds `desert-art.ts`, including explicit per-frame timings and foot pivots. No enemy stats, AI, damage, rewards or projectile behavior changes. Source/provenance/status, specialized-behavior gaps and validation: `docs/DESERT_INTEGRATION.md`.

## M3C3 feedback gameplay revision — 2026-10-31

Reusable core extensions add accepted-input basic stages, two-leg projectiles, per-cast refunds, per-projectile growth coefficients, moving-dash guards, action-scoped mitigation, radial projectile bursts, bounded CDR, toggle shields and terrain-safe area confinement. `basic-attacks.ts` and `confinement.ts` remain engine/transport independent. Protocol10 projects projectile radius/stage/leg; clients cannot submit those fields. `feedback-visuals.ts` explicitly reuses retained raster assets, while semantic phases and observer frame checks keep presentation independent of authoritative damage. No PNG/atlas/approval lock changes or new art integration. Details: `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`.

## M3C3 fourth-school integration — 2026-10-31

Thiếu Lâm composes shared arc,multi-hit,buff,projectile and new ally-support effects via validated `game-data/thieu-lam.ts`. Deterministic `combos.ts` owns per-source/target/chain state; action-local caches prevent repeated finisher consumption. Protocol9 adds only a view-filtered player combo projection; room authority/zone isolation and M3B stay intact. Prepared skill art now merges all four retained manifests. Semantic gold/support/empowered phases use the existing PNG/atlas renderer; supplied source bytes are retained. See `docs/M3C3_IMPLEMENTATION.md` and `docs/M3C3_SKILL_ASSET_MAP.md`.


## M3C1 second-school integration — 2026-10-31

Thiên Sơn is configured by `game-data/thien-son.ts` and initialized through M3B's existing profile/rank/point path. `game-core` adds optional directional multi-hit bounds, non-damaging dashes/counter windows, speed buffs, fractional penetration and conditional slow damage; it retains deterministic ticks and no rendering/network imports. MatchRoom synchronizes the existing status/build/position/event fields and validates school ownership. No separate room/progression implementation is added.

Asset preparation validates and merges retained Cái Bang/Thiên Sơn manifests into the shared animation registry. Semantic phases, scale and authored direction offsets stay in the existing raster presentation contract. Persistent wind effects are keyed by owner/status/ability and follow that owner's rendered authoritative position; multi-hit pulses do not restart character casts. Skill menus/icons filter the current school and remain viewport overlays. See `docs/M3C1_IMPLEMENTATION.md` and `docs/M3C1_SKILL_ASSET_MAP.md` for mechanics, provenance, test scope and limitations.

## Thiếu Lâm character presentation prototype — 2026-10-31

`art.ts` registers `hero_thieu_lam` and `hero_thieu_lam_dao` through the existing PNG/hash-JSON loader, animation registry and manifest foot origins. Server-selected Thiếu Lâm uses the unarmed visual; `?debug=1&thieuLamWeapon=dao` changes local presentation only, without a network/loadout command. The HUD reuses the square unarmed idle export for both variants. `?artPreview=1&thieuLamReview=1` uses the existing in-viewport gallery at640×520 logical resolution; gameplay viewport/camera dimensions are unchanged. The requested authored idle/walk/basic-attack frames were explicitly approved on2026-10-31 and are protected by assets/approved_thieu_lam.lock.json.

Thiếu Lâm reuses the existing client-only `CreepPlayback` one-shot helper to complete an animation across a shorter/late server pose; server action ticks, movement, collision, hit/damage, resources and cooldowns remain untouched. The existing debug inspection now exposes observed monk animation frames from actual Phaser animation start/update events, alongside sampled screen frames. Dedicated art tests own ports2603/5193 and PNG/JSON evidence paths; their legacy Cái Bang skill regression uses the existing test-server-only legacy-loadout switch. Production art/provenance: `assets/source/characters/thieu_lam_v01/production_manifest_v01.json`; actual results: `assets/reviews/thieu_lam_v01/README.md`. No Thiếu Lâm combat mechanics, active-skill art, VFX or new gameplay rules are implemented.

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

## M3A ability execution and presentation — 2026-10-30

Protocol 6 adds four equipped skill IDs and cooldowns, cast identity, zone-filtered status state, and authoritative effect/pulse events with facing and stage. `game-core/combat.ts` owns the shared hit/crit/death/reward path; `skills.ts` executes data-defined projectile, arc, buff, swept dash and timed multi-hit effects; `status.ts` owns status refresh, expiry and collision-respecting displacement. Direct offensive statistics snapshot when casting. Impacts retain authoritative projectile heading. No renderer/network imports enter the core.

Per-ability cooldown expiry prevents swapping slots to bypass a cooldown; existing per-slot display state remains available. Travel converts expiry into the destination's local tick domain. Death, travel and disconnection cancel owned actions/projectiles and self buffs. Already applied enemy burns/debuffs expire locally and pause with empty dungeons. Successful hostile control participates in the existing fixed assist reward pool. Cầm Long applies pull, silence and disarm without stun or movement restriction.

`game-data/cai-bang.ts` contains the complete rank-1 test catalogue and provisional passive tuning. `skill-art.ts` validates exported animation metadata and binds canonical IDs to cast, travel, release, impact, finisher and persistent-status stages. `game-client/skill-vfx.ts` is a reusable renderer using authored atlas frames, pivots, direction, integer scale and offsets; state/event cleanup scopes every effect to its live zone. VFX timing never schedules damage. The HUD renders authoritative equipment/resources/cooldowns without changing placement.

`VOLAM_DEV_SKILLS=1` is honored only outside production. Confirmed Cái Bang players can use an arena-only four-slot test adapter; unknown/duplicate/reserved IDs are rejected. The optional `?skillPreview=1` panel sends the same real equip/cast commands and cannot refill resources or bypass cooldowns. Full progression, rank gates and respec remain M3B. See `docs/M3A_IMPLEMENTATION.md` for verification and asset provenance. Official APIs checked against installed Phaser 4.2.1 and Colyseus 0.18: https://docs.phaser.io/phaser/concepts/animations and https://docs.colyseus.io/state/schema.

## M3B build/stat framework — 2026-10-31

Protocol7 adds a nested per-player BuildState with revision, four-way point accounting, rank map, effective stats and source breakdown, keeping each Schema below63 fields. Strict `build-action` requests carry desired IDs/operation, shared monotonic sequence and expected revision. MatchRoom validates phase/confirmation; DungeonMatch validates actual zone/life/defeat; synchronous core validation checks ownership, gates, duplicates, ultimate count and budget before a single commit. Level gains invalidate stale revisions. Spatial/effect StateViews and zone event filtering are unchanged.

`progression-types.ts` defines reusable school/rank/stat contracts; `progression.ts` derives all sources, handles EXP, point accounting and build commits. `progression-data.ts` validates all explicit rank variants and profiles. `combat.ts` retains one shared reward path and calls the EXP calculator; `skills.ts` resolves the equipped learned rank before existing handlers. Hero defense, regeneration, movement, A cadence, crit and active cooldown calculation consume derived stats. Runtime visual keys remain canonical M3A IDs.

Normal Cái Bang heroes initialize with one point and empty actives. Unsupported schools receive no foreign Cái Bang active defaults; their existing A remains a prototype pending M3C. Historical M1/M3A fixtures explicitly enable non-production `VOLAM_DEV_LEGACY_SKILLS=1`; the old arbitrary-rank1 adapter additionally requires `VOLAM_DEV_SKILLS=1`. Production ignores both. No equipment API, other-school kit, XP client input or persisted build is added.

The existing modal hosts `SkillMenu`, a stable-DOM component that submits requested modifications and renders synchronized ranks/stats/eligibility. A local draft is not authoritative. World size, compact HUD placement, focus/input capture, critical warnings and camera remain intact. The optional legacy art preview remains separate from normal progression. See `docs/M3B_IMPLEMENTATION.md` for formulas, tests, evidence and limits.

## M3C2 implementation extension

`World.areas` and shared shield/counter/refund/status/proc handlers remain engine/network independent. Protocol8 adds an `AreaState` map through existing zone-scoped StateViews; the client only renders server position,radius,lifetime and combat events. No new client authority,room capacity change or parallel progression UI is introduced. `vo-dang.ts` contains validated school/rank tuning; `docs/M3C2_IMPLEMENTATION.md` documents formulas/lifecycle/testing.


### Approved animation adapter (2026-11-01)

`prepare-approved-animation-art.mjs` checks the15 exact director-approved source/export/choreography files and100 retained reference files before producing the runtime registry. `ApprovedSkillVfx` consumes the immutable review plans, server combat events, area state, real projectile positions and synchronized status ticks/accumulated loss. It samples actual PNG atlas frames and original relative frame durations; it never calls combat or sends hits. Backward ghosts snapshot actual rendered displacement/costume. Actor poses can be interrupted by accepted actions; authoritative persistent fields/statuses continue to their server end. Owner/zone/death/build revision/scene cleanup destroys associated views. No Phaser/DOM/network dependency is added to `game-core`; guard accumulation is carried in the existing status JSON rather than a Schema-layout change.

## Hoàn Nhan Hồng Liệt encounter adapter

A boss-only optional `HongLietEncounter` hangs off `MatchZone`; it runs after `stepWorld`, retaining Phaser/Colyseus independence in game-core. Boss/minion actors reuse `world.creeps`, damage/status/reward and hero targeting. The boss and archers opt out of generic creep steering; infantry reuses it. Hostile boss cues/projectiles have explicit cast IDs, authoritative geometry/ticks, per-cast/projectile hit sets and cleanup. `BossEffectState` maps are zone-filtered by existing StateViews; `CreepState` carries cast stage ticks, and `DungeonState` exposes boss HP/respawn. Protocol is14. The client loader/registry and `HongLietRenderer` present selected retained PNG frames only; server ticks drive the pose/VFX timeline. The Tiled headquarters map shares collision/markers with game-data. Item rewards remain unsupported. Details: `docs/HOAN_NHAN_HONG_LIET_RUNTIME.md`.
