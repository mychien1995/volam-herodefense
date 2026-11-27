## M4D · cấu hình EXP theo phòng — 2026-11-27

`MatchRoom.onCreate` kiểm tra độ khó rồi gọi `game-data/campaignForDifficulty`, gán cùng cấu hình đã clone cho `simulation.base.campaign` và `simulation.arena.config.campaign`. Chỉ Dễ thay `invasionXp`; Khó giữ baseline. Director chia pool qua pipeline thưởng/fractional remainder hiện có; peer join không đổi cấu hình host. Không đổi schema mạng/protocol. [Chi tiết](docs/M4D_EASY_WAVE_XP_2026_11_27.md).

## M4D · server-owned wave rest — 2026-11-27

`InvasionDirector` dùng `restAfterStream` từ cấu hình server: deadline wave tiếp = stream end + interval 120s. `streamUntilTick` và `nextWaveTick` hiện có đủ để HUD phân biệt hai giai đoạn, không đổi protocol. Farm dùng ngân sách data ×1,25 và phần dư server hiện có; floor 900s vẫn snapshot khi tạo wave dungeon. DEV preview/fixture có override interval rõ ràng giữ lịch start-to-start cũ. [Nhịp wave và kinh tế M4D](docs/M4D_WAVE_PACING_2026_11_27.md).

## M4D · protocol 49

Arena ID được host chọn khi tạo room, server kiểm tra và đồng bộ trong Defense; late join không đổi lựa chọn. Geometry hồ sen dùng chung game-data cho server và prediction; nước thuộc collision di chuyển, combatCollision giữ đường đạn riêng. Boss provocation thuộc server, reset theo actor/attempt mới. Arena có ground/alpha props/Y-depth/shading độc lập; status renderer nhận trạng thái đã đồng bộ. [Chi tiết M4D](docs/M4D_IMPLEMENTATION.md).

## UI/camera dùng chung · 2026-11-19

`ui-components.ts/css` sở hữu nút, hàng action và skin panel; `school-selection.ts/css` sở hữu grid và branch dialog cho Defense/PvP/Practice. Handler từng mode giữ focus, input gating, draft/pending và server acknowledgement. `camera-policy.ts` gom native/cover/overview; toàn viewport, rotation0, giữ ngoại lệ Hồng Mộc trong Defense và Kim Luân. HUD utility dùng một công thức cỡ nút. Không đổi mô phỏng/protocol/artwork. [Quy ước và profile kiểm chứng](docs/SHARED_UI_CAMERA.md).

## Phòng test · protocol 48

Namespace `practice` dùng PracticeMatch + PracticeRoom, tối đa một người, join schema kiểm tra phái/nhánh. Tập world.practiceTargets chỉ tồn tại trong sandbox; hit thật vẫn chạy, mục tiêu không chết/thưởng. Input/stance dùng mô phỏng chuẩn, HP/mana/cooldown reset server-side; không bật flag developer toàn server. PracticeState thêm vào schema, các namespace khác mặc định tắt. Message practice-select chỉ đăng ký trong PracticeRoom, validate sequence/phái/hệ rồi PracticeMatch.switchHero thay hero sạch cùng ID/vị trí, dùng lifecycle remove để hủy hiệu ứng cũ; snapshot xác nhận đóng menu. [Cấu trúc và kiểm chứng](docs/PRACTICE_ROOM.md).

## Liveness WebSocket và lời dẫn Tượng · 2026-11-19

Transport dùng chung `socket-config.ts`: probe mỗi 3s, năm probe không pong trước khi ngắt socket im lặng (khoảng 15–18s). Sự kiện close/drop thực vẫn được xử lý ngay, không thêm reconnect cho Lôi Đài. Camera tính headroom lời dẫn theo `displayHeight` và đổi khoảng HUD từ pixel sang tọa độ thế giới. [Nguyên nhân, hồi quy và bằng chứng](docs/PVP_DEFENSE_REGRESSION_REPAIR.md).

## Lôi Đài độc lập · protocol 47

Namespace Colyseus `loi_dai` dùng `StandaloneLoiDaiRoom` và mô phỏng `StandaloneLoiDai` độc lập framework. Tái sử dụng combat/projection hiện tại, thêm team đối thủ/đồng đội; không chạy Defense director. Protocol thêm PvP schema, sequence và snapshot theo phòng; server quyết định toàn bộ state, hazard RNG và vòng đời. UI/Phaser hiển thị trong viewport, asset pack tải khi vào PvP. [Chi tiết và kiểm chứng](docs/LOI_DAI_STANDALONE_IMPLEMENTATION.md).

## Ngũ Độc trong trận M3D

`game-core` giữ minion theo người triệu hồi và xử lý AI, sát thương, trang bị và chuyển vùng. `DungeonMatch` đặt lại vị trí của Thần Chết ở vùng đích bằng cùng thực thể và giữ lượng máu. Protocol 46 thêm `CreepState.ownerId` cho minion, giữ ID qua các vùng và dùng bộ lọc instance hiện có. Phaser đọc trạng thái để vẽ chuyển động, thanh máu và hiệu ứng theo tick. [Dữ liệu và kiểm chứng](docs/NGU_DOC_PLAYTEST.md).

## Điều khiển chuột và tự đánh thường · protocol 46

Client gửi điểm đến và mã khu vực qua `move-to`. Server dựng đường đi từ vị trí hiện tại và áp cùng tốc độ, hình va chạm và trạng thái hạn chế di chuyển như bàn phím. Lệnh có thể kèm mã mục tiêu. Phòng đổi mã thực thể được chiếu cho client về mã nội bộ trong đúng khu vực của nhân vật. Server kiểm tra mục tiêu, tầm đánh và chướng ngại, rồi đánh thường nếu hợp lệ hoặc đi đến điểm bấm nếu mục tiêu đã chết hay rời khu vực. Với `auto-basic`, server chọn đối thủ PvE còn sống, gần nhất và trong tầm, gồm quái thường, quái do boss gọi và boss. Auto dùng hồi chiêu/nhịp đòn hiện tại, ưu tiên lệnh tay và không dùng trong PvP. Tư thế chịu đòn chỉ ghi đè đòn đánh thường của nhân vật khi bị choáng hoặc khi đòn đã kết thúc. Hai dịch vụ tích hợp dùng protocol 46.

## Võ Đang Kiếm — protocol 38

Server giữ số lượt Vạn Kiếm qua các mốc hồi tuần tự, chuyển mốc theo đồng hồ vùng khi chuyển bản đồ. BuildState đồng bộ số lượt, sức chứa và thời gian hồi lượt kế. Vùng chiến đấu giữ tick bắt đầu, tâm đáp, điểm phóng và hướng chỉ kiếm. Phaser dùng cùng bộ trình diễn 48 thanh trong trận và trang preview. Server lập lịch một lần sát thương ở mốc thanh đầu chạm tâm. Sự kiện Q chứa chỉ số nhát để ghép đúng bảy vệt chém với bảy nhịp server.

## Campaign balance và thử lại boss — 2026-11-06

CampaignDefinition được schema-validate trong game-data; game-core giữ ledger first-clear, fractional farm rewards và BossRetries theo encounter generation. Protocol35 truyền projection chiến dịch trong MerchantInventoryState.campaign để tránh vượt giới hạn63 field của player schema; client chỉ gửi vote/call intentions. Các override backend tương ứng bên dưới là lịch sử. [Quy tắc, cấu hình và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Chế tạo — protocol 31

Boss dungeon ghi nhận mất HP thật theo từng người và cấp vật liệu theo instance khi kết thúc. Merchant nhận ý định ghép theo ô, nhánh và revision. Bước trừ vàng, tiêu hao vật liệu và cấp thành phẩm diễn ra trong một giao dịch. Trạng thái trang bị ghép, số nguyên liệu và hồi chiêu Z đến client qua Inventory State.

## Fixed builds and dialogue — protocol 30

Lobby players synchronize the selected branch before confirmation. The match schema retains separate T skill and cooldown fields. Core progression accounts for the fixed slot ranks once, maps them to the current stance and projects only those skills in the HUD. The existing revision and input sequence guard slot upgrades and stance changes. The five synchronized slots and 20-point budget are derived from authoritative runtime data. Levels 21–30 accrue reserved points without applying stat bonuses.

Boss chatter uses its own seeded deck per actor and instance. Death transitions publish zone-scoped farewell events. Phaser presents those events, the per-client statue introduction and a cosmetic effect on a synchronized level increase.

## Combined M3D feedback / economy / Hell — protocol21 — 2026-11-03

Protocol21 combines feedback20's dash,party/life/spectator/pause/interact projections with the milestone19 merchant transactions and nested inventory/potion state. Reject old versions; no new client-supplied position, damage, price or item authority. Core remains Phaser/DOM/Colyseus-independent. One internal per-hero finisher input can await its real predecessor projectile without new network payloads; lifecycle cancellation clears it.

Client input composes spectator arrow-camera/Space exit, Shift, A/QWER, potion1/2 and O/P/Escape modal ownership. In-viewport hotbar retains dash charges and the unavailable Z slot together. Hell shared-animation fallback coexists with r3 body selection/blink alpha and per-foot projectile VFX. Retained asset manifests/locks stay byte-exact. The final merge report records combined-tree checks; previous branch reports remain historical evidence, not cached results.

## M3D feedback / protocol18 — 2026-11-01

`game-core/mobility.ts` owns sequential charge debt and server-owned projectile recast, composed with existing swept dash actions, collision and confinement. Optional data-defined arc lifetimes/origins, projectile blink windows and buff fire auras extend shared effect handlers. Dungeon-only deterministic grid waypoints route aggro around static scenery without altering invasion/boss AI. Protocol18 accepts a payload-free `dash` input and projects remaining dash/recast/linger ticks, retaining the existing per-zone StateViews. DOM HUD and retained raster adaptations consume those projections; animation never determines damage. See `docs/m3d-feedback-tech-handoff.md` for tuning, fixtures and integration points.

## Trial merchant transactions / protocol19 — 2026-11-02

Director-approved runtime UI now sends strict `merchant-action` buy-basic/buy-potion/use-potion messages. MatchRoom resolves identity and zone, uses shared input sequence plus inventory revision, and calls pure `transactMerchant` with server match/world clocks. Data validates authored prices/coefficients; core owns gold, stack counts, equipment stat-source recomputation and shared potion debt. Protocol19 adds nested four-slot levels/six potion quantities/revision/cooldown projection and a transaction result. Client updates only from server state; purchases never accept client prices/stats/ownership. Basic max-HP upgrades preserve current resources, zone/death preserve inventory, match-clock cooldown cannot reset with zone time. No new Phaser API is needed; retained in-viewport DOM renders actual purchases. Boss reward migration/crafting/Z/PvP remain pending. See [ECONOMY_TRIAL.md](docs/ECONOMY_TRIAL.md); older presentation-only records below describe the earlier UI slice.

## Inventory/merchant presentation integration — 2026-11-02

`game-client/item-menu.ts` renders the approved merchant/inventory selection and previews over the existing Phaser viewport. `GameUI` passes the authoritative local player state; the menu projects live gold, derived stats and both retained reward fields, without new commands or client-side item ownership. `ChuHud` leaves the new read-only inventory grid to this renderer. Shoe Z and potion counts remain explicitly unavailable until backend support exists; tabs/cards do not mutate progression or protocol. See [integration report](docs/INVENTORY_HUD_INTEGRATION.md). Future v2 reward migration below remains pending.

## Inventory/merchant target design — 2026-11-02 (migration pending)

[ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 defines future typed equipment, level-5 duplicate upgrades, potions, Z item actions, personal boss materials and first-clear Long Châu. This documentation does **not** alter current protocol/runtime. Earlier encounter sections describe historical implemented roll/drop/sell/claim paths; migrate those explicitly when M4 is authorized, avoiding old and new award paths firing together.

Target server state needs typed equipment/inventory, potion quantities/use expiry, item cooldown debt, per-kill eligibility/reward records and a character+boss+match first-clear/Long Châu use ledger. Snapshot eligibility at boss death; grant one personal material per eligible player and Long Châu only once. Use atomic/idempotent purchase/upgrade/craft/consume/claim operations; do not expose resale/trade/transfer or roll commands in the target design. Pure core owns effects/stat derivation; data owns prices/recipes/tuning; protocol evolves with versioned validation. Capacity/reconnect and exact consumable/stat policies remain open. No client-provided reward amount, ownership, penetration, cleanse result or blink position is trusted. Equipment-free PvP is proposed, not an implemented stat layer.

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

## Combined Hell/M3D protocol18 — 2026-11-02

The user-requested Hell merge retains Forest, Desert, Beach, Chu Bá Thông, Hồng Liệt, Kim Luân and Cổ Mộ while adding `hell`. Protocol18 preserves the existing boss/item/effect state and requests; only the destination contract expands. The client retains all boss renderers, cast/HUD/loot paths, loaders and preparation guards alongside Hell's shared clips and atlas map. No game-core mechanics or retained raster artwork change. Merge verification: `docs/HELL_M3D_INTEGRATION.md`.

## Hell integration / protocol14 — 2026-11-01

The existing destination registry and validated selector add `hell`; `DungeonMatch` still owns zone geometry, membership, clocks, combat and rewards. A reconciled copy of the retained Hell Tiled layout supplies server solids/markers and Phaser terrain/scenery. Existing atlas rendering, eight-phase authored terrain playback, feet depth, generic contact effects and one-shot cleanup are reused. Animation-key lookup can select an actual `shared` clip when no directional clip exists. No spell/projectile mechanics are inferred from assets. Exact retained byte guards and Hell text checkout attributes preserve independent provenance. See `docs/HELL_INTEGRATION.md`.

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
- `game-protocol` defines versioned/validated input and snapshot/event messages. Target inventory intents include purchase, upgrade, craft, potion/Long Châu use and item Z; legacy roll/drop/sell requests require migration rather than carrying into inventory v2.0. These are design-level intents, not declarations of existing API names.
- `game-server` is the **only authority** for positions, collision/damage results, RNG, enemy AI, cooldowns, spend/award gold, XP, personal loot/first-clear eligibility, wave clock, victory/defeat. Room lifecycle/isolation stays here.
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
- Server -> client: player state deltas, entity movement/state, combat event (hit/miss/damage/crit), XP/gold, inventory mutation/personal rewards/first-clear and claim state, timed warnings, dungeon transitions, match end. Legacy roll events are not part of the target inventory v2.0 design.
- Include match/zone identifiers and reliable event IDs so UI does not misapply stale/out-of-order messages.
- Rate-limit client actions and prevent repeated purchase/craft command retries from duplicating items.

## 7. Asset and UI approach

- CONFIRMED original 2D Pokémon-like elevated overhead/three-quarter **orthographic** perspective across arena/dungeon/PvP; no rotating camera, 3D chase camera, diamond isometric map or side view. Render scene depth by feet position/Y-sorting and layered foreground roofs/trees. PROPOSED initial terrain tiles 32×32, simple placeholder hero/enemy shapes acceptable through vertical slice. `ART_ASSET_GUIDE.md` defines the asset pipeline, authoring sources, export/atlas metadata, asset provenance and M0/M1 visual proof checkpoints. No final game sprites are supplied by this handoff.
- Tiled tile layer for ground/obstacles, object layers for statue/NPC/spawns/exit portals/collision; enforce stable object IDs.
- Core HUD: hero HP/mana/level/XP, gold, four skills and cooldowns, A attack state, visible next-invasion countdown, statue HP, current zone, invasion alerts, item/skill and personal-reward dialogs, combo cue for Thiếu Lâm. Future potion and shoe-Z state follow inventory v2.0; no new layout is authorized here.
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

## Kim Luân encounter adapter (2026-11-01)

DungeonMatch owns an optional deterministic KimLuanEncounter per zone, alongside existing Chu/Hong adapters. Controlled creep actors reuse common targeting/damage/status/death; the common boss loot backend accepts either encounter context. Protocol16 extends BossEffectState for delta-synchronized Kim hazards; the existing dungeon summary carries phase/casts/loot. StateViews restrict both to the active zone. Retained art is guarded/prepared separately; Phaser projects server geometry with authored PNGs. Test fixtures are confined to dedicated QA services. See docs/KIM_LUAN_RUNTIME.md.

## Đông Tà wave encounter — protocol18

`DungeonMatch` owns an optional engine-independent `DongTaEncounter`; it gates only wave5, then coordinates authoritative recall, temporary statue immunity/collision, ellipse bounds and retry/clear. Existing per-zone dungeon adapters remain independent. Pure geometry and the common damage/status pipeline enforce combat; no animation authorizes hits. `DefenseState.dongTa` carries lifecycle/cast metadata; zone-filtered `BossEffectState` delta entities carry VFX origins/targets/positions/timestamps. Retained approved PNGs are checked and selectively prepared by `scripts/prepare-dong-ta.mjs`; the Phaser renderer samples real cels from authoritative state. Exact behavior and limits: `docs/DONG_TA_INTEGRATION.md`.


## Tây Độc feedback03 integration

`TayDocEncounter` and `TayDocGate` in game-core consume the validated game-data definition. DungeonMatch calls the encounter after the arena world tick, disposes it on defeat, and settles marked travel before moving heroes. MatchRoom publishes an arena-only MapSchema entry (`tayDoc['arena'].json`, protocol18) through StateView. Map entry deletion clears scoped client state on zone transfer. Clients cannot submit encounter state, hits or phases. A seekable Phaser raster renderer projects IDs/timestamps and preserves feet depth and captured projectile vectors. Art preparation guards593approved hashes and copies separate candidate direction atlases. Dedicated DEV gameplay helper has spawn-only authorization; mutable pose fixtures exist exclusively in the Playwright setup process.
## Nam Đế arena encounter (2026-11-02)
Protocol18 adds owner-filtered NamDeControlState and strict per-key challenge input. Arena World optionally owns deterministic NamDeRuntime; DungeonMatch latches wave15 clear/rest without replacing InvasionDirector scheduling. Its controlled/never-respawning actor uses common kill/assist goldXP, with no dungeon loot context. NamDeEffect projects through existing BossEffectState; geometry remains in world units. Only authoritative snapshots/ticks choose Phaser raster frames. See docs/NAM_DE_INTEGRATION.md.

## Nam Đế milestone reconciliation — protocol24
Preserves protocol23 and the current M3D adapters. DungeonMatch waits for actual Tây Độc dead state before Nam Đế's wave15clear/rest latch; both rest/spawn use arena world ticks, including existing all-in-boss pauses. Room owner-filtering and onDrop/transfer cleanup retain the current reconnect policy. Physical-arrow QTE capture is added after potion/spectator callbacks; shared unavoidable-HP-loss handling is reused. See docs/NAM_DE_M3D_MERGE_2026-11-03.md.
## Bắc Cái arena encounter integration — 2026-11-02

`World.bacCai` exposes a structural runtime contract; `stepWorld` prepares clone positions/immunity before incoming combat and resolves the encounter after the common hit pipeline. `MainBossDirector` is an optional arena gate owned by DungeonMatch; it does not replace dungeon boss singletons or invasion clocks. All tuning is validated game-data. Protocol18 adds a zone-filtered `bacCai` Schema map containing a public snapshot with stable effect IDs/ticks and anonymous form positions; the normal creep map omits private Bắc Cái actors. StateView removal deletes the projection on leaving arena. The dedicated Phaser renderer samples retained PNG cels using server clocks, reconstructs detached hazards for late clients, and cleans views on zone/session/scene changes; it cannot decide damage. Earlier wave-boss adapters remain missing and gate completion is never synthesized. See `docs/BAC_CAI_RUNTIME.md`.


## Shared wave field and approved VFX — protocol27 (2026-11-03)

`DungeonMatch.waveArenaView()` projects the common four-boss field through `DefenseState.waveArena`; generic lifecycle extends existing Đông Tà policy to Tây/Nam/Bắc while each encounter retains its AI/reward adapter. Recall, collision removal/restoration, movement bounds, dead-party retries and reconnect rules remain server-owned. The new `dash_lock` status rejects Shift before charge spending while allowing movement. `WaveBossFeedbackArt` samples approved PNG cels/native tiled ray components using server time. Exact PNG/JSON identities and the additional Đông Tà dash clips are guarded during preparation. Texture filtering is set once per texture to avoid Phaser4GPU reuploads per particle. Test fixture endpoints exist only in isolated Playwright setup. See `docs/WAVE_BOSS_FEEDBACK_RUNTIME.md`.


## Wave boss feedback v02 — protocol28

Pure core owns seeded nine-actor wander paths, per-source hit cadence, gold burst releases, dense fixed sky points, quick pull/lock/follow-up and corpse lifetime. Colyseus keeps existing schema field counts; BacCai/Nam snapshots gain JSON metadata and shapes, with protocol28rejecting stale clients. Every authoritative boss cast adapter emits one boss_shout presentation event for a special, consumed by a shared Phaser label presenter. Dungeon label lifetime uses presentation time rather than subtracting unrelated arena/dungeon clocks. Bắc Cái resolves its public actor snapshot without revealing hidden Mục Hạ form coordinates. Exact locked v02rasters/clip metadata are prepared into the existing asset registry and drawn at native approved scale, with nearest filtering once per texture. Detailed ledger/validation: docs/WAVE_BOSS_FEEDBACK_V02_RUNTIME.md.


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

This canonical override supersedes V02 random burst counts and the old repeated wrong-clone punishment. Đông Tà, Tây Độc and Nam Đế each have twenty original Vietnamese combat lines, selected server-side from seeded shuffled decks without repetition until the pool is exhausted. First line after 6 seconds of combat, then every 8–10 seconds when an action gap permits; overhead chat lasts 4 seconds in its own lane alongside the retained skill shouts. Bắc Cái keeps his separate preference/dialogue mechanic and stays silent during Mục Hạ Vô Nhân.

Mục Hạ Vô Nhân keeps its approved split and five pair swaps. At reveal, players have exactly 5 seconds to land a valid guess. A clone hit causes one arena-wide explosion and ends the skill in that simulation tick; all simultaneous clone/real hits settle as one failure, regardless of target iteration order. A real-body-only hit ends it without explosion and cancels the deadline, including on the deadline tick. No valid hit by the deadline causes one explosion and immediate cleanup. No extra explosions after cleanup.

Tiểu Nhất Dương Chỉ always releases five straight golden projectiles, spaced 0.16 seconds, re-aiming at the selected player's current position at each release. Each shot flies straight afterward. Its independent server channel can run with all main skills, QTE and movement without replacing their cast or clocks. Trial repeat interval is 90 ticks / 3 seconds, first windup remains 17 ticks; repeated starts cannot duplicate an active burst. Death, no living players, wipe and encounter cleanup cancel pending shots. The main special animation retains priority while concurrent native gold projectiles render normally.

Approved V01/V02 PNGs, JSONs and preview source remain byte-exact. This update changes runtime behavior and text, not the frozen preview. The common arenas, rewards, dungeon life ledgers, controls and separate inventory-v2 scope remain as in V02. Matching protocol 29 services and a new room are required. Current implementation/validation: `docs/WAVE_BOSS_FEEDBACK_V03_RUNTIME.md`.
## Creep upgrade — protocol 32, 2026-11-06

Validated game-data profiles feed an optional engine-independent `SimulationConfig.creepCombat`; MatchRoom enables it for every live zone. Pure-core runtime owns attacks and hazards; existing zone-filtered BossEffectState carries public geometry/timestamps to a raster-only Phaser adapter. Room creation validates immutable 2/3/4 gates. InvasionDirector owns tick-based stream schedules and player snapshots, and explicit pending-wave state prevents premature chapter gates. DEV test behavior is server-environment-only. See [CREEP_UPGRADE.md](docs/CREEP_UPGRADE.md).
## Development creep preview — 2026-11-06

Protocol33 carries a strict creator preview flag, strict host-only action messages and `DefenseState.creepPreview` projection. `apps/game-server/src/creep-preview.ts` owns sandbox selection/cleanup/options; it uses the existing core stepping and effect handlers, with no client-authoritative hits or production balance changes. The in-viewport `creep-preview.ts` controller and preview-only retained-art adapter reuse the main Phaser scene. Development `VOLAM_DEV_CREEP_TEST=1` is required; production rejects preview creation. See `docs/CREEP_PREVIEW.md`.

Creep feedback r3 adds validated sector/ground-lob/presentation fields to the independent combat catalogue. Core owns captured geometry, swept terrain landing and damage windows; Phaser owns raster selection/anchors and the debug-only read-only postrender capture hook. Network schema remains protocol33. See `docs/CREEP_FEEDBACK_R3.md`.

## Boss balance update — 2026-11-13

The campaign definition supplies the nine main boss HP baselines. The Kim Luân definition supplies disciple HP. Boss meters read zone-filtered replicated HP and the wave encounter view. Hồng Liệt’s sweep keeps the replicated cue alive for its visual recovery after the damage window closes. Burn and poison reuse the server’s strongest-per-element periodic damage rules. The existing protocol carries the statuses and cue clocks.

## Combat profile PvP 1v1 — 2026-11-25

StandaloneLoiDai tạo cấu hình combat riêng từ lineup đầu hiệp, gắn policy thời lượng lên đấu thủ và khóa hệ số damage trong world. Không kiểm tra số người sống để bật profile. JSON PvP snapshot công bố combatProfile, HUD dùng cùng bộ tạo Ability/rank; schema Colyseus và message input không đổi. Dữ liệu tuning ở game-data, handler thuần ở game-core; catalogue PvE không bị mutate. [Chi tiết](docs/PVP_1V1_BALANCE.md).
