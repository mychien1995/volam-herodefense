## Forest authoritative visual roster — 2026-11-01

The director explicitly authorizes the Forest roster in order: `truc_xa`, `doc_chu`, `son_vien`, `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`. The existing server roster assignment owns these identities in private/shared gameplay. Forest continues the cycle by actual spawn count per instance, including when participant scaling changes wave size. Three-creep waves use the first three, then the last three. Existing counts, common creep stats/AI, rewards, RNG and collision remain unchanged. Artwork approval is already recorded separately; this authorization adds no species abilities, statuses, projectiles or balance changes. See `docs/FOREST_CREEP_RUNTIME_INTEGRATION.md` for current verification and retained historical review evidence.

## Small gameplay changes — 2026-10-31

The user explicitly requests Vietnamese product UI, compact school selection with Leave left/Confirm right, Space at physical dungeon doors, Quit first with confirmation, P for Võ Học, local grayscale death and central-arena respawn. New normal players use Default mode: choose a branch, automatically learn/equip Q→W→E→R, and skill ranks belong to slots when replacing same-branch skills. Custom retains manual rank allocation, mixed styles and independent A. All build edits remain living-arena-only and server-owned.

The user explicitly confirms retaining current regular4/ultimate3 caps, level gates and the existing surplus mechanism. Each slot's quota is floor((min(level,30)+3-slotIndex)/4); learned rank is bounded by quota, unlocked ranks and cap. Unallocated gated points remain pending; surplus applies only when all four skills are maxed. Four regular starters follow catalogue order (Thiếu Lâm Quyền uses combo A plus Toàn Phong Thoái). Mode/branch changes recalculate and preserve cooldown debt without resource refill. Normal dungeon exits retain their return marker; only death respawn now uses the arena hero-spawn marker, with the existing five-second delay and no gold/XP penalty. No new artwork or broader M3D balancing is authorized. Details: docs/SMALL_GAMEPLAY_CHANGES.md.

# Approved decisions & assumptions register

## Desert integration request — 2026-10-31

The user explicitly authorizes integrating the retained Sa Mạc environment and six creep appearances into Phaser, with the existing server-authoritative dungeon systems and in-viewport menu. Sa Mạc now supports separate private/shared instances; forest remains the default destination. This supersedes earlier descriptions of Sa Mạc as unavailable. Retained artwork is reused without bulk generation or automatic ART-01/runtime director approval. No species-specific stats/abilities were supplied: the six appearances reuse the current M2A generic creep profile and rewards, with specialized ranged/poison/area mechanics pending authored definitions. See `docs/DESERT_INTEGRATION.md`.

## M3C3 playtest feedback trial — 2026-10-31

The director explicitly authorizes the gameplay feedback revision without new artwork. This supersedes earlier melee-Phiến/timed-shield/single-hit-evasion descriptions: Phiến A is a two-straight-leg boomerang, one hit per target per leg; both Thiên Sơn A profiles have a 0.3s base cadence with a configurable floor. Cái Bang Chưởng empowers every sixth accepted A, not cleaves; Bổng cycles thrust/sweep/lift/smash without adding airborne control. Võ Đang/Thiếu Lâm hand alternation is an authoritative presentation stage, pending matching art. No-cooldown A means a finite attack cadence without an extra wait, never click-rate damage.

Chiết Mai has bounded active cooldown reduction. Phi Ảnh/Phong Ảnh immunity covers only moving dash ticks and never existing DOT; the later counter is not invulnerable. Thái Cực Thần Công is a resource-safe toggle with overflow to HP. Thái Cực Trận confines enemies without stopping actions inside and respects forced-movement immunity. Dịch Cân Kinh already owns HP regen and is not duplicated. All numeric reach/damage/duration/conversion changes remain configurable trial tuning. Exact before/after and pending asset contracts: `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`. Retained asset bytes/approval locks and unrelated concurrent art remain untouched; no M3D/campaign/boss/PvP/equipment expansion is authorized.

## School avatar and clean arena spawn — 2026-10-31

The user requests the Thiếu Lâm selection avatar be corrected,the three permanent spawn sơn tặc removed,and creep nameplates replaced by an upcoming-wave notice. Selection now reuses the approved monk idle sprite. Regular matches publish no practice enemies; scheduled invasions and dungeon populations are retained. Historical combat test targets require explicit development-only `VOLAM_DEV_PRACTICE_CREEPS=1`,ignored in production. Creeps retain sprites,health bars and effects but no under-sprite text; player names remain. The next invasion creep type and warning names come from the same retained wave art manifest as the rendered creeps. Wave timing,combat,rewards and server authority are unchanged.


## M3C3 Thiếu Lâm — 2026-10-31

The user explicitly authorizes the fourth school: all13 canonical actives,both independent basics,Dịch Cân Kinh and both same-target Phát Động chains with retained supplied artwork and existing multiplayer/progression. The request cuts off before its Đao section; the five canonical CONTENT_DATA definitions are used. Bất Động retains the proposed healing pulse. Six-second per-step windows,out-of-order same-chain resets,unrelated-active/A preservation and all numerical profiles remain configurable proposals in `game-data/thieu-lam.ts`. Interrupt resistance blocks new stuns/hostile displacement,never all damage. Ally support never heals statue or revives. Exact mechanics/tests/art status:`docs/M3C3_IMPLEMENTATION.md`. M3D and later systems are outside this assignment.


## M3C1 Thiên Sơn — 2026-10-31

The director explicitly authorizes Thiên Sơn as the second playable school: both Phiến/Đao basics remain melee, all ten canonical actives, Bắc Minh automatic speed/attack-speed/crit growth, M3B ranks/points/arena-only loadouts, existing sprite/VFX integration and mixed Cái Bang multiplayer. Supplied Võ Đang/Thiếu Lâm assets are audited only; their combat, equipment, crafting, PvP, bosses and new environments remain outside this batch. Existing approved character bytes are retained, without artwork generation or new art approval claims.

Configurable M3C1 proposals: school base/growth/surplus and explicit skill ranks are in `game-data/thien-son.ts`. Directional actions capture facing, moving spins follow current owner position, and active timed actions block another combat action until completion. Phong Ảnh's one-second rank1 window starts at cast, evades one incoming enemy hit and counters only in range with clear terrain; unused windows expire. These resolve previously unspecified numeric/timing details without replacing the canonical mechanics. See `docs/M3C1_IMPLEMENTATION.md`; final balance and supplied skill-art director approval remain separate.

**Confirmed evidence policy (2026-10-30):** Follow `AGENTS.md` visual verification and recording policy. Routine development, asset generation and tests use lightweight PNG screenshots and live Phaser assertions/frame observations. Do not create video/animated-image evidence or run recording, encoding or conversion tools. Recordings require an explicit user request for the current task; preserve all existing recordings. Animation, transition, positioning and gameplay validation remain required.

## Menu-only dungeon entry — 2026-10-30

The user explicitly removes Dẫn Lộ / Dungeon Guide from the arena. Living players enter supported dungeons through the top-right Phó Bản menu from anywhere in the arena. No NPC interaction or proximity gate remains. Server phase, alive/arena membership, instance ownership/capacity and availability validation remain authoritative. The physical dungeon exit and existing arena return point (960,576) remain. This supersedes earlier Guide-entry requirements; no new destination or recall action is added.

## Arena and selector visual update — 2026-10-30

The user approves expanding the court by approximately 35–40% and approach roads by approximately 60%, removing the interior green tree and corresponding server collider, concentrating decoration at the perimeter, replacing the fixed damage toast with world-space authoritative target numbers and replacing the four selector thumbnails with separate original illustrations. Preserve statue position, approved character bytes, compact HUD/camera/controls and existing gameplay. Rừng Trúc private/shared entry remains supported; the other destinations/Boss remain unavailable. This authorizes the matching map-layout/collision edits, not new gameplay or automatic runtime visual approval. See `assets/arena_v2.manifest.json` and `docs/ARENA_VISUAL_V2_REVIEW.md`; director review remains pending.

## M2A creep dungeon request — 2026-10-30

The user explicitly authorizes M2A only: Guide interaction, the existing in-viewport selection overlay, separate private/shared creep zones, authoritative combat/rewards, physical exits, empty pause/resume and two-client isolation verification. Existing arena/HUD composition and controls remain. Existing assets/placeholders may be reused; this does not authorize bulk dungeon art or grant ART-01 runtime approval. Invasions, boss dungeons, crafting and additional school mechanics remain outside this task. Stop and report before M2B.

**PROPOSED implementation defaults:** one private instance per session and one shared instance per match; configurable two-second inter-wave rest and five-second full-HP/mana arena respawn with no EXP/gold penalty. `game-data/dungeon.ts` records provisional wave scaling. These foundation values do not settle final balance or reconnect/persistence questions. The already-confirmed short arena death recovery is included to avoid permanent-death softlocks in dungeon play.

## ART-01 arena/HUD replacement request — 2026-10-30

The current implementation request authorizes replacing the arena environment and HUD using `assets/concept/clean-arena-concept.png` and `arena-concept-1.png` (corrected filename). Preserve the approved Cái Bang assets/controls and all server rules. Remove merchant-building and dungeon-portal world visuals; retain their existing menus through compact utility buttons in order Settings, Quit, Phó Bản, Thương Gia, Lôi Đài. Use compact player, bag/gold and A/QWER overlays; the earlier minimap/status banner is superseded for this screen. No fake ranks, quick-item counts or later-milestone backend actions. Concepts approve direction only; runtime ART-01 director approval remains pending. No other schools or dungeon art expansion is authorized.

**How to read:** **CONFIRMED** reflects explicit user choices or explicit acceptance of earlier recommendations. **PROPOSED** is implementable tuning advice, not binding game design. **OPEN** means no choice was made. Do not conflate these statuses.

## Confirmed — fundamental

- Browser-first, keyboard-oriented deployment is the **recommended technology approach** pending technical implementation checks. **CONFIRMED visual direction:** 2D pixel art, orthographic **top-down/three-quarter elevated Pokémon-style overworld perspective** ("third-person from above"), with character bodies visible. Not a top-of-head-only bird's-eye view, not isometric, side-scroll or 3D third-person. No proprietary Pokémon graphics/assets. See `ART_ASSET_GUIDE.md`.
- **Max 6 players per independent match room**, player enters a nickname only; no accounts or persistent progression.
- Four launch schools: **Cái Bang**, **Thiên Sơn**, **Võ Đang**, **Thiếu Lâm**. Expand later.
- Arrow keys move, `A` manual normal attack, `Q/W/E/R` active skills. Mouse used for NPC, shop, menus, equip, skill UI; no mouse-targeted skills. Auto basic attack **OPEN** (manual first).
- Ranged basic attacks auto-aim at nearest eligible enemy at the moment of release, projectile flies straight and **does not track**; enemy can dodge. Melee basic attacks hit forward arc; non-primary enemies receive **reduced cleave** (exact percentage proposed).
- Characters start at level 1; **max level 30**; receive **one skill point at each level including level 1**. School stats and one innate passive automatically grow by level. Skills can be learned, leveled and freely remapped in arena, not inside dungeon/PvP. Four equipped active slots; equipped ultimate is optional. A separate swappable basic attack.
- Surplus skill points **after fully ranking current four equipped skills** convert automatically into school-specific stats; recalc on respec; no permanent stacking of respec bonuses.
- School innate passives: **Cái Bang = Tiêu Diêu Công** (Fire/damage/crit), **Thiên Sơn = Bắc Minh Thần Công** (Wind/speed/attack speed/crit), **Võ Đang = Thái Cực Tâm Pháp** (Yin–Yang/mana/efficiency), **Thiếu Lâm = Dịch Cân Kinh** (Gold/HP/defense). School style does not lock active skill mix.
- Thiếu Lâm Phát Động sequences require consecutive skills to **land on the same enemy**; secondary/cleaved hits count as hits on that enemy. Combo expiration/time window is tunable.
- Bosses resist disables strongly; status and crowd-control handling must be explicit.

## Confirmed — arena, PvE, rewards

- Central arena protects one statue; item/crafting and optional PvP NPCs remain planned. Dungeons are **separate map/zone instances selected through the Phó Bản menu from the arena**, with no Dungeon Guide. The player leaves via a **physical exit portal**, returns to the arena return marker and walks to the statue. No instant recall from a dungeon.
- **Private dungeon permits only one player**; shared permits up to six. **Creep dungeon** advances only after current wave eliminated, gets stronger with wave progression; pauses when empty. **Boss dungeon** contains fixed-power boss that may be farmed repeatedly; if dungeon is empty for 30 seconds, boss health and position reset. Boss respawns after a configurable cooldown when killed.
- Dungeon creeps and statue creeps scale in count and strength according to active player count. Snapshot player count for wave creation to avoid live HP jumps. Dungeon bosses have fixed difficulty within their configured dungeon, **not** endless per-clear scaling.
- Killing/meaningfully assisting on creeps grants eligibility; a **single fixed creep EXP pool is divided among eligible participants**. Boss dungeon: player who landed at least one valid hit qualifies for shared boss EXP, subject to presence at completion as a proposed implementation safeguard.
- **Exactly one randomly selected loot item per dungeon boss kill**; eligible players **roll for ownership**; solo qualifying player automatically wins. Item may be kept, dropped to ground, or sold; duplicates permitted. Repeated kills are for gold/EXP/items and crafting.
- Shop sells basic items. Purchasing duplicates upgrades an existing basic item to its max level. **Max-level basic item + boss drop + gold → stronger crafted item**. Any school can equip any item; **4 equipment slots**. Backpack size OPEN.
- Hero death: short respawn at arena, no EXP or gold penalty.
- **20 regular invasions from west/east (two directions)** on exact 3-minute intervals, at 03:00 through 60:00. Waves spawn even with prior waves alive. Warnings 60s and 15s before each; players must travel back themselves. **Statue cannot be repaired**.
- Invasion creeps detect nearby players and **prioritize the closest player inside detection range**; when no players in range, move to/attack statue. If player leaves detection range, resume statue path. Detection and attack radii separate.
- After every fifth regular wave **is completely cleared**, wait a few seconds (PROPOSED 10s), then spawn one chapter boss in order: **Đông Tà → Tây Độc → Nam Đế → Bắc Cái**. Strict regular-wave clock continues concurrently. After the four chapter bosses are defeated and their prerequisites are satisfied, final boss **Vương Trùng Dương** spawns. Win when final boss defeated and statue still lives; lose if statue HP reaches 0.
- Invasion enemies/bosses drop **gold and EXP but no items**, including final boss for v1.
- **Solo win possible but deliberately very hard**; six-player cooperative mode must remain difficult and fair.
- PvP is a minor optional feature: NPC creates/joins a PvP room (within current match), players wait at side A or B, start after ready. Total players limited by match (1–6). No change to skills inside PvP. PvP rewards/open clock behavior are proposed, not hard requirements.

## Proposed defaults — tune or ask before finalizing

- Release tech: Phaser 4.2.x + TypeScript browser client, Colyseus 0.18.x Node TypeScript authoritative server, shared TS game core, Vite, pnpm workspaces, Vitest, Playwright, Tiled; no DB initially.
- Headless fixed tick at 20–30 Hz, render at display refresh; prediction/interpolation staged, avoid full rollback prematurely.
- 32x32 square pixel-art terrain tiles, 48x48 or 64x64 sprite frames, 4-direction initial animations mapped from 8-direction movement, integer zoom, feet-origin Y-depth sorting; exact dimensions/zoom not user-approved. NPC interaction by mouse (confirmed).
- Regular skill max rank 4; ultimate max 3; ult unlock at character levels 6/10/14; regular rank gating at 1/3/5/7.
- Melee basic primary target 100%, cleave target 50% by default, school-specific overrides, independent crit rolls.
- Invasion boss rest 10s after fifth wave fully clears; warnings at T-60 and T-15; raid clock never pauses.
- Starter backpack 12 slots, equipment slots example weapon/armor/2 accessories; gear slots types are **not** approved.
- No PvP gold/EXP reward; PvP duels should have clear win/end behavior and no item loss.
- No elemental-counter chart initially; elements provide visual/school identity.
- Suggested 6-second Phát Động window, configurable; crowd-control reduction for bosses not yet numerically specified.

## Open decisions

See `OPEN_QUESTIONS.md`. Ask a targeted question only when implementing a feature that **cannot** proceed safely under a clearly labeled provisional default. Record decisions here when approved.

## Art pipeline clarification (2026-10-29)

**Approved camera/presentation:** orthographic 2D Pokémon-style elevated overhead/three-quarter pixel art. **Proposed production standards:** `ART_ASSET_GUIDE.md` supplies tile sizes, sprite dimensions, folder conventions, editable sources, sprite-sheet/atlas export, provenance and quality gates. It does **not** claim finished artwork exists or change any gameplay rule. M0 can use placeholders; M1 must test animation integration and explicitly flag missing final art.

## Visual quality lock (v1.3)

- **CONFIRMED:** detailed chibi wuxia 2D pixel-art visual style, using `assets/references/vo_dang_art_direction_reference.png` as PRIMARY aesthetic reference. See `ART_DIRECTION_REFERENCE.md`. Existing Pokemon-style overhead camera requirement remains unchanged.
- **CONFIRMED:** image is concept/reference only, not sprite atlas; must build coherent original transparent in-game assets. Approve Võ Đang sample before artwork is expanded to four schools.
- **PROPOSED / TO VALIDATE:** 64x64 sprite frame canvas, 32x32 tiles, 4 facing animations initially, actual zoom and in-game character footprint.

## Confirmed in-game UI presentation — 2026-10-29 (v1.4)

The user explicitly rejects the current Codex **split web-dashboard layout** (map on left, persistent stats/room/enemy cards on right). Once in a match, the *map/world should occupy the game view*, while hero HP/MP/level/EXP, statue/raid timing, hotbar, inventory, skill selection, shop, dungeon menu, crafting and optional PvP menus render **as HUD or overlays inside the game viewport**. Pre-match lobby can be separate. Refer to `UI_UX_SPEC.md`. Exact widget dimensions, minimap feature, additional keyboard menu shortcuts and specific UI art palette remain proposed/not user-approved. No effect on combat/gameplay authority.

## Confirmed v1.5 reference/UI update — 2026-10-29

The game director approved the expanded hub/battle, forest/desert/sea/hell and menu references as primary **direction**, not runtime artwork or authoritative numbers. Confirmed HUD patterns now include top-left hero, bottom-center A/QWER, bottom-right minimap, top-right system buttons and lower-left bag/gold. Exact dimensions/ornament remain subject to review. All menu windows stay within the game viewport. No gameplay rules or new dungeon/item implementations are approved by this UI task. Supplied-file naming discrepancies are recorded in `assets/references/README.md`; actual image contents guide interpretation. The one-Võ-Đang character art approval gate remains open.

## Character baseline approval — 2026-10-30

The director explicitly approved the current Cái Bang Bổng and Chưởng authored idle/walk/normal attacks as the initial visual quality baseline. Preserve their exact source/export bytes in assets/approved_cai_bang.lock.json. This does not approve fallback cast/hurt/death artwork or the existing environment/enemy/VFX placeholders. First Gemini intake batch requires separate visual approval; no gameplay or architecture change is authorized.


## Confirmed dedicated pre-game school selection — 2026-10-30

The current user correction supersedes school choices in the waiting lobby: **Landing (nickname only) → Room Browser (create/join) → Waiting Lobby (players/host/status) → host Start Game → dedicated School Selection → all confirmations → Main Arena**. School choices do not appear in the waiting lobby. Four canonical schools only: Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm. Duplicate school choices are allowed. Players can change choices until confirmation, then their choice is locked. Confirmation progress is server state.

The existing Colyseus room owns WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME, host ID, school IDs and confirmations. Only the host can request Start Game in the waiting lobby. Simulation/input and matchElapsedMs remain stopped until every participant is connected and confirmed. Players then spawn at level 1 with one point near the central statue in the same room, retaining their chosen school in both network/player state and the core hero. No persistent accounts or progression. Invasions are still an unimplemented M2 feature; future scheduling must use the IN_GAME clock origin, never room creation.

Disconnect safety: during selection retain a disconnected/unconfirmed participant and hold the barrier. Never auto-pick, expire, or silently start without that participant. Current clients can leave/recreate the room. Host migration, reconnect/rejoin grace, removal of absent participants and any timeout/auto-selection policy remain OPEN; no such policy is implemented. Waiting-lobby host loss disables starting; no silent host promotion.

School descriptions, passives and basic styles come from CONTENT_DATA.md. School-specific numeric starting values and starting skill assignments beyond the Cái Bang M1 prototype are not finalized; show that explicitly instead of inventing mockup statistics. Phase 1 stores/validates selections but does not implement M3 school combat or bulk school gameplay art: the existing M1 combat tuning and approved Cái Bang runtime visual fallback remain in the arena. Distinct school card portraits are concept illustrations only.

## M2B implementation scope — 2026-10-30

CONFIRMED by the explicit M2B assignment: enable server-owned statue invasions every 180 seconds from the IN_GAME origin, 60/15-second warnings visible across zones without recall, west/east enemies and overlapping waves, reusable player aggro, permanent statue HP damage, existing rewards and no-loss respawn, terminal basic defeat and in-viewport defense HUD. No bosses, full 20-wave catalogue, additional school mechanics or M2C are authorized by this task.

PROPOSED configurable prototype tuning (not final approved balance): statue HP2000; three walker recipes with per-lane counts 2/3/4, HP120/150/180, damage8/9/10 and speed46/48/50; later waves repeat recipe three. Scaling uses the existing BALANCING draft coefficients (+60% count, +16% HP, +8% damage per additional participant) sampled at spawn. Detect160/chase240, a three-second reacquire rest, pedestal footprint80x28, and the existing five-second arena respawn are testable defaults. Development timing/HP overrides are server environment only and ignored in production. Existing practice creeps remain distinct from invasion enemies. Details and measured limitations: docs/M2B_IMPLEMENTATION.md.

## Join after host school selection — 2026-10-30 correction

The user reported that a second player cannot join after the host starts/selects a school. Rooms now remain joinable with free seats in WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME. This supersedes the earlier start-time room lock. During initial selection, new entrants join the existing confirmation barrier. During active play, only the entrant sees school selection; they spawn once, at level 1 with one point and no XP/gold, after server-validated confirmation. Existing participants, progression, statue HP, dungeon state and invasion deadlines are preserved. Pending entrants cannot move, attack or enter dungeons and do not count as spawned simulation participants. Confirmed school choices remain immutable. Six-seat capacity and defeat closure remain enforced. This does not implement reconnect/progress recovery or host migration.

## M3A Cái Bang integration scope — 2026-10-30

CONFIRMED by the explicit M3A assignment: implement all ten canonical Cái Bang active mechanics, preserve both approved basic styles, integrate the supplied character/VFX artwork into actual server-authoritative gameplay, and reuse the system for future schools. Cầm Long remains pull + silence + disarm, without stun or prevented movement. Artwork never determines damage, range, RNG or combat timing. Existing controls, room/dungeon isolation and the compact HUD remain.

PROPOSED implementation tuning: rank-1 numbers for the eight newly implemented skills and Tiêu Diêu Công growth are configurable in `packages/game-data/src/cai-bang.ts`; the exact values and measured probes are documented in `docs/M3A_IMPLEMENTATION.md`. These are not approved final balance. Strongest nonstacking status magnitudes and same-source refresh are the current test policy. Successful control records meaningful-assist eligibility in the existing fixed EXP/gold pool, without adding damage or another reward pool.

The user permits a development-only testing loadout before M3B. The implemented adapter is server-flagged, ignored in production, Cái Bang-only and arena-only; it preserves resources, hostile statuses and per-ability cooldowns. The live preview uses actual server commands. This does not decide progression unlocks/ranks or implement full respec. Supplied art is produced, integrated and runtime verified; director approval of production animations remains pending. No other-school combat or M3B work is authorized by this milestone.

## M3B progression authorization — 2026-10-31

The explicit M3B assignment supersedes the previous stop gate for this milestone only. Implement Cái Bang's real earned-point progression, four-slot mixed-style builds, independent A, rank upgrades, free arena-only respec, automatic school/passive growth, surplus accounting and the existing in-viewport skill menu. Reuse M3A mechanics/art. Other-school combat remains unimplemented; normal rooms no longer give unsupported schools the historical free Cái Bang active defaults. Their old A prototype is not a completed school kit.

PROPOSED defaults, recorded before implementation in `docs/M3B_RULES.md`: normal ranks4 at1/3/5/7, ultimate ranks3 at6/10/14, one optional ultimate in any slot, no duplicate assignments; one point/rank. New Cái Bang players have empty active slots and one available point. Allocations belong to the current four-skill build; moving preserves rank, removing refunds it, reset retains slot choices at rank0. Existing cumulative60 EXP/level is capped at1740 for level30. Numeric growth, rank values, surplus coefficients and clamps remain configurable proposals, not final approved balance.

Cooldown debt follows canonical ability IDs across all build changes; A shares one cooldown across its choices. Upgrades/resets never shorten existing expiry or refill resources. Build commits cancel owned temporary effects and preserve hostile control. Earned=allocated+available+surplus; only a fully maxed four-slot build converts remaining points into surplus. Stats derive fresh from separate layers, never from previously accumulated totals. Server phase/zone/life, expected revision, monotonic sequence, ownership, gates, budget and slot rules validate every atomic commit. M3C is not authorized by M3B.

## Thiên Sơn runtime art approval — 2026-10-30

The director explicitly approved the final normal-zoom Thiên Sơn character result after the seven-check Phaser review (user: “approved, please proceed”). Approval covers both current fan/curved đao styles, four-facing idle/walk/normal attacks, 80 authored cels and their exact approved concept `assets/concepts/heroes/thien-son/thien-son-concept-v01.png`. Both runtime entries are `approved`; `assets/approved_thien_son.lock.json` locks source/export/concept bytes. Cast/hurt/death reuse is outside authored approval. This closes the requested character-art workflow; it does not authorize school combat abilities, balance changes, other schools or environment expansion.


## Võ Đang character art approval - 2026-10-30

The user explicitly approved the final four-facing idle, walk, Quyền and Kiếm character artwork after the saved Phaser review. Exact concept `assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png`, two editable sources, two PNG/JSON atlases, idle previews and80 frame PNGs are protected as89 files in `assets/approved_vo_dang.lock.json`. Both character runtime entries are approved. Preserve those bytes; revisions require a separate reviewed version. Cast/hurt/death aliases are outside authored-art approval. This approval does not implement school combat/passives, change server authority or authorize other-school/environment work.


## Võ Đang skill artwork final approval — 2026-10-31

The user explicitly approved all produced Võ Đang skill artwork and all13 production icons after the final Phaser review (user: “all approved”). Approval covers20 character/VFX components,636 exported cels/163 tags,33 editable Aseprite sources, the two unchanged approved normal-attack reuses and the disclosed optional shared straight-qi preview. Exact files are protected separately by `assets/approved_vo_dang_skills.lock.json`; the original89-file character lock is unchanged. Thái Cực Tâm Pháp remains icon-only. This is final artwork approval, not approval or implementation of Võ Đang mechanics, numerical tuning or gameplay integration. See `assets/reviews/skills/vo-dang/README.md`.

## Thiên Sơn skill artwork final approval — 2026-10-31

CONFIRMED by the director after the M3C1 runtime delivery: “skill artwork approved”. Approval covers the ten integrated Thiên Sơn active character/VFX sets and thirteen active/basic/passive icons, including disclosed supplied-frame reuse. `assets/approved_thien_son_skills.lock.json` records exact approved source/export bytes; current runtime integration metadata marks productionArtApproved true. Historical export-time manifests remain historical snapshots. The existing approved character baseline is unchanged. Missing authored baseline hurt/death frames, other-school/environment art and provisional numerical balance are outside this approval. Stop after M3C1.

## M3C2 Võ Đang — 2026-10-31

The explicit assignment authorizes Võ Đang as the third playable school: both Quyền/Kiếm basics, all ten canonical actives, Thái Cực Tâm Pháp, M3B ranks/points/surplus/arena-only respec, retained approved sprites/icons/VFX, shared three-school multiplayer and dev preview. Thiếu Lâm and later milestones remain out of scope. Existing approved art bytes are preserved.

PROVISIONAL configurable defaults: timed mana shield (the toggle question remains open), stationary caster-position formations with scheduled ticks, a single counter trigger that takes the incoming hit and requires survival, and the numeric rank/growth/proc/absorption data in `game-data/vo-dang.ts`. These do not finalize balance or replace canonical mechanics. See `docs/M3C2_IMPLEMENTATION.md`.


## 2026-11-01 — approved animation integration authorized

The director now explicitly authorizes integration on `wip/m3d/animation-change`, superseding the historical preview-only deferral in the animation-review-v01 register. All 13 approved selections retain exact approved artwork/choreography source hashes; no new artwork approval is requested. The register remains a historical record.

Confirmed mechanical changes: planted owner-only Liên Hoa protection with inside/outside/reentry checks; backward Phong Ảnh movement preserving facing and existing other effects; 5s initial sustained radial Vạn Kiếm; Tọa Sát up to 5s, 70% reduction, cumulative actual post-mitigation HP loss, strictly >20% max-HP trigger or expiry, and one radial reflection of that exact sum. Reflection cannot recursively proc reactive counters. Death, travel and removal cancel without reflection. No gameplay changes to visual-only skills or the three comparison skills.

Provisional Liên Hoa rank1 data: radius85, duration180ticks/6s, +8% maxHP/s, cooldown450ticks/15s (rank radius+5, regeneration+2 percentage points; existing rank cooldown progression retained). Vạn Kiếm duration150ticks/5s, 13 eight-way bursts at12tick/400ms spacing; not final balance. Tọa Sát retains prior base cooldown180ticks/6s and mana14, radius110 with existing +5 rank scaling; active guards reject recasts rather than refreshing/discarding accumulated damage. See `docs/ANIMATION_CHANGE_INTEGRATION.md`.
