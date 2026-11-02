## Inventory/merchant UI integration — 2026-11-02

Explicit concept approval authorizes the reviewed merchant/inventory/auxiliary-Z presentation in the existing Phaser viewport. Live gold/stats/rewards are used; unavailable v2 transactions/equipment/Z stay disabled. This is a scoped client UI slice, not M4 completion or reward/PvP migration. See [runtime UI report](docs/INVENTORY_HUD_INTEGRATION.md).

## Inventory/merchant design checkpoint — 2026-11-02

[ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 records the confirmed four-slot inventory, level-5 upgrades, potions, personal boss materials/first-clear Long Châu and twelve crafted branches. M4 scope below uses that design instead of shared random loot/roll/sale/transfer. **This request writes documentation only; it does not start M4, migrate existing encounter rewards or mark tests complete.** Historic encounter records below retain their actual runtime contracts. Equipment-free/potion-free PvP remains an open M6 proposal.

## Explicit single-encounter integration — 2026-11-01

Lý Mạc Sầu and Cổ Mộ Phái are separately authorized only in `codex/m3d/ly-mac-sau`: approved art, private/shared boss lifecycle, server combat, summons, one-item pending claims and focused verification. This does not mark the full M4 loot/inventory/crafting milestone complete or start other bosses. Trial balance and final runtime art approval remain separate. See `docs/LY_MAC_SAU_INTEGRATION.md`.

# Current gameplay milestone — M3C3, 2026-10-31

The separately requested Hell integration is confined to `wip/m3d/hell`: retained Địa Ngục assets, authoritative `hell` private/shared instances, shared map/collision and actual clip playback through existing systems. No new abilities, bosses or hazardous-lava mechanics are introduced. Runtime director approval remains pending. See `docs/HELL_INTEGRATION.md`.

The separately requested Beach integration is confined to `wip/m3d/beach-dungeon`, reusing retained Beach art and existing M2A mechanics. It adds `sea` private/shared instances, composed map/collision, animation/effect presentation and scoped verification. Specialized enemy mechanics and runtime director approval remain pending. No other dungeon or later milestone is included. See `docs/BEACH_INTEGRATION.md`.

The separately requested Sa Mạc integration reuses retained environment/six-creep artwork and current M2A mechanics. It adds forest/desert destination isolation, map/collision/animation integration and focused validation only. Per-species combat design and runtime director art approval remain pending; no later milestone or other destination is included. See `docs/DESERT_INTEGRATION.md`.

**M3C3 feedback gameplay trial — implemented and verified.** Accepted-A chains, two-leg fan, adjusted reach/timing, dash immunity/guard, bounded CDR, travelling palms, toggle shield and formation confinement use retained art. Final verification:330 unit/network tests,8 workflow checks,10 asset validators and11 browser cases including six-player natural combat/readability;384 before/after balance probes. Numeric tuning remains provisional and new sprite production/integration is pending. See `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`. No M3D or later milestone starts automatically.

**M3C3 — Thiếu Lâm: implemented and verified.** All13 active skills,both A styles,Dịch Cân Kinh,per-target A/B combos,ally support and retained sprites use the existing shared frameworks. Details/defaults/results:`docs/M3C3_IMPLEMENTATION.md`; mappings/provenance:`docs/M3C3_SKILL_ASSET_MAP.md`. All four launch schools now have43 active definitions/eight basics. No final balance or new skill-art approval is inferred.

**Stop after M3C3. M3D validation/balancing is not started automatically.** Earlier milestones below are historical.

## Completed M3C2 — 2026-10-31

**M3C2 — Võ Đang: implemented and verified.** Details,commands,exact test accounting and limitations: `docs/M3C2_IMPLEMENTATION.md`. All ten skill statuses and retained sprite mapping: `docs/M3C2_SKILL_ASSET_MAP.md`; actual PNG/frame/state/hash evidence: `docs/evidence/m3c2/`.

- [x] Selectable Võ Đang,Quyền/Kiếm A with server-owned non-homing Kiếm Khí proc,all ten canonical active skills,Thái Cực Tâm Pháp and school-specific base/growth/surplus.
- [x] Reusable deterministic mana shield,stationary ticked formations,one-trigger non-evading counter,mana refunds/regen,Attack Power debuff and independent movement/attack slows.
- [x] M3B ranks/points/mixed styles/ultimate limits/arena-only respec/cooldown debt retained; foreign-school builds rejected.
- [x] Approved two-style baseline,20 skill character/VFX components,163 tags,636 frame references and13 icons integrated without art generation;89 baseline/1441 skill-art protected files checked unchanged. Missing baseline hurt/death remain disclosed aliases.
- [x] 266 unit/network tests in22 files,eight workflow checks,typechecks,production build andten asset validators passed. Eleven latest browser scenarios pass across the final attempt(10/11) and the corrected event-history fixture's targeted recheck(1/1). This is not a single green11-case final invocation; exact accounting is in `verification-summary.json`.
- [x] Actual all-skill/four-direction animations,three-school dungeon progression/arena defense,six-player natural combat/rewards and separate six-hero arena readability verified with PNGs/live frame/state observations. Cái Bang and Thiên Sơn regressions passed. No recordings.

Timed shield and numeric tuning remain configurable proposals,not finalized balance. **Stop after M3C2. Do not implement Thiếu Lâm or later milestones automatically.** Previous milestone scopes below are historical.

## Completed M3C1 — 2026-10-31

**M3C1 — Thiên Sơn: implemented and verified.** Exact mechanics,commands,results and limits: `docs/M3C1_IMPLEMENTATION.md`. Three-school inventory and all skill mappings: `docs/M3C1_SKILL_ASSET_MAP.md`; actual PNG/frame/state/log evidence: `docs/evidence/m3c1/`.

- [x] Thiên Sơn selectable with both melee A choices,all ten distinct active skills,Bắc Minh automatic growth and M3B school-owned ranks/points/loadouts/surplus/arena-only editing.
- [x] Shared authoritative swept dashes,moving/directional timed attacks,speed buffs,evasion/counter,conditional slowed-target damage and defense penetration; death/travel/disconnect cleanup.
- [x] Twenty supplied character/VFX components,146 tags,534 frame references and13 icons integrated into the existing animation engine,hotbar,menu,avatars and runtime preview. Approved baseline hashes preserved. Võ Đang/Thiếu Lâm inventoried only.
- [x] Final pipeline:226 unit/network tests in20 files,two workflow checks,typechecks,production build,nine asset validators and eight real browser cases passed. All24 broader browser scenarios have passing latest results across recorded runs; see the report for exact accounting.
- [x] Mixed Cái Bang/Thiên Sơn dungeon farming,independent progression,statue defense,two/six-player caster ownership,all skills/both basics/four dash directions and Cái Bang regression verified with live state/frame observations and PNGs. No recordings.
- [x] Director approved Thiên Sơn skill artwork on2026-10-31 (user: “skill artwork approved”); exact assets are recorded in `assets/approved_thien_son_skills.lock.json`. Dedicated hurt/death frames remain missing; existing aliases are disclosed. Numerical balance remains provisional.

**Stop after M3C1.** Võ Đang/Thiếu Lâm combat,equipment/crafting,PvP,bosses and new environments remain out of scope. Thiên Sơn skill artwork has explicit director approval; other art approvals remain separate.

## Completed M3B — 2026-10-31

**M3B — Character Progression, Skill Loadout & Upgrades: implemented and verified.** See `docs/M3B_IMPLEMENTATION.md`, `docs/M3B_RULES.md` and `docs/evidence/m3b/` for precise accounting, proposed tuning, actual commands and PNG/state/frame evidence. Reuses M3A combat, sprites, icons and the full-size game viewport.

- [x] Level1–30, exactly one earned point per level including1; shared arena/dungeon EXP, cap1740 under the existing60-EXP curve, no persistence. New Cái Bang heroes start with one available point and empty active slots.
- [x] Four server-owned Q/W/E/R assignments, mixed Chưởng/Bổng, independent A, no duplicates/foreign skills and one optional ultimate. Standard4/ultimate3 caps and1/3/5/7 versus6/10/14 gates remain configurable proposals.
- [x] Point-funded explicit rank variants for all ten skills; rank0 cannot cast. Free living-arena-only reset/change, removing refunds ranks, moving preserves them. Cooldown debt survives swapping, removal, upgrades, reset and relearning; no resource refill or hostile-control cleansing.
- [x] Automatic school/passive stat layers, real defense/movement/regen/cadence/CDR use, reserved zero equipment layer and recalculated surplus. Level30 fixtures verify16+14 and15+15 accounting;100 reset/rebuild cycles cannot duplicate points/stats/resources.
- [x] Strict atomic requests with revision/sequence/ownership/gate/budget checks; production ignores legacy sandbox flags. Unsupported schools receive no foreign Cái Bang active defaults. Their old A prototype remains outside the completed Cái Bang kit.
- [x] In-viewport skill catalogue, icons, slots, rank previews/costs/locks, A choice, point ledger, stats/passive/surplus and reset; read-only outside arena. Compact HUD shows available points/ranks and level30 EXP MAX. No new sprite generation or whole-HUD redesign.
- [x] Final pipeline passed:174 unit/network tests in17 files,2 workflow checks, project/tool typechecks, production build and all6 current asset validators.16 real-browser scenarios passed, including4 M3B scenarios plus movement/animation/projectile/lobby/dungeon/UI regressions. Additional live hotbar-rank assertion and PNG capture passed.48 legal seeded build probes recorded as provisional balance evidence.
- [x] Two clients earned/leveled independently, used different learned builds, observed casts, returned through the physical exit, upgraded/respecced and resumed farming. Open menus preserve the invasion clock/warnings; modified builds damaged actual invaders. Screenshots inspected at944×466,1280×720 and1920×1080. No video recordings.

**Stop after M3B. M3C has not started.** Rank/growth/surplus coefficients and final numerical balance remain proposed; UI remains available for director review. Existing unapproved world/dungeon and legacy hurt/death visuals are not declared finished by functional progression checks. Other schools' full combat, equipment/crafting, boss dungeons, PvP and production20-wave content remain out of scope.

## Previous gameplay checkpoint — M3A

**M3A — Cái Bang skills and supplied sprite integration: implemented and runtime verified; director visual approval pending.** See `docs/M3A_IMPLEMENTATION.md`, `docs/M3A_SKILL_ASSET_MAP.md` and `docs/evidence/m3a/`. The user reports M2C complete; the prior repository checkpoint below recorded M2B. Existing working systems were reused without inventing an M2C completion report.

- [x] All ten canonical Cái Bang active skills, distinct approved Bổng/Chưởng normals and configurable Tiêu Diêu Công growth. Server-owned targeting, damage, RNG, mana, cooldowns, status duration, swept dash/pull, piercing projectiles and timed multi-hit finisher.
- [x] Shared combat/reward pipeline, control-only assist eligibility, per-ability cooldowns, death/travel/disconnect cleanup and preserved empty-dungeon timer semantics.
- [x] Supplied21 character/VFX components integrated through a reusable validated animation/stage manifest. All464 frame references file-validated; all105 animation tags registered; actual motion observed in every component. Approved baseline hashes unchanged; Aseprite batch export actually executed. No new artwork generation.
- [x] Live Q/W/E/R icons, cooldown and unavailable states within the existing compact HUD. Development-only arena loadout and optional live Skill VFX Preview use real server commands/resources. No M3B rank/unlock/respec UI.
- [x] Typecheck/build passed;134 automated tests in15 files passed, including26 skill mechanics/lifecycle cases, two asset-contract cases and three real-SDK skill cases.240 seeded four-second probes recorded; numerical defaults remain provisional.
- [x] Five two-context M3A browser scenarios passed;16 existing movement/combat/dungeon/lobby/UI regressions passed. Actual screenshots and frame observations captured; no video recording. Enemy/environment and legacy hurt/death placeholders remain separate visual work.
- [ ] Director approval of integrated skill production artwork at normal gameplay zoom. Concept approval is not runtime art approval.

**Stop after M3A. M3B has not started.** No other-school combat, boss dungeons, crafting, PvP or production20-wave expansion is implemented by this task. Historical milestone checkpoints follow.

## Previous gameplay checkpoint — M2B

**Join correction verified:** non-full rooms remain joinable during school selection and active play. Late entrants select/confirm before spawning, without restarting the match or resetting progression/statue HP/timing. Six seats and defeat closure remain enforced. 98 unit/network tests, two late-join browser scenarios and three existing pre-game browser tests passed; see `docs/LATE_JOIN_FIX.md`. No M2C work.

**M2B — Statue Invasion & Defense System: implemented and verified.** See `docs/M2B_IMPLEMENTATION.md` and `docs/evidence/m2b/` for commands, actual screenshots, prototype tuning and limitations. Reuses M2A simulation, combat, rewards, zone filtering, arena and compact HUD.

- [x] Server match clock starts after all school confirmations. Waves at 3/6/9 minutes; warnings at 60/15 seconds. Validated development override and server-derived in-viewport countdown.
- [x] Both west/east lanes, three configurable prototype recipes, spawn-time participant scaling, independent overlapping waves. Later waves repeat recipe three; no production 20-wave catalogue.
- [x] Statue objective and sticky player aggro with configurable detect/chase/reacquire thresholds. Living old waves remain; dead invaders never respawn.
- [x] Authoritative statue HP at its existing world position, aligned solid pedestal, permanent damage, one terminal defeat transition and no repair/regen.
- [x] Shared combat/death/EXP/gold pipeline, fixed assist pool, no item drops, no-loss five-second arena respawn.
- [x] Synchronized public defense state across arena/dungeons; zone-filtered enemies/events and independent match rooms. Warnings never recall dungeon players.
- [x] Compact statue/wave HUD, hit feedback, warning and in-viewport defeat overlay. Existing character artwork, camera and controls retained.
- [x] 96 unit/integration tests passed in 11 files; typecheck and production build passed. Production schedule tested with simulated time.
- [x] Two real Chromium contexts verified shared enemy damage/death/rewards, warnings in a private dungeon, overlap, statue damage and synchronized defeat; responsive checks at 944×466 and 1920×1080. Accelerated test uses six-second intervals and HP300, not production balance.
- [x] 11 existing browser regressions passed for M1 movement/combat/animations/UI and M2A shared/private dungeon farming/transitions. Existing approved character/atlas validation passed.

**Stop after M2B. M2C has not started.** No chapter/final bosses, crafting, new schools or campaign expansion. Prototype enemy/VFX art and final balance remain outstanding; director visual approval of the arena/dungeon artwork remains pending.

## Completed M2A foundation

**Visual revision within M2A:** expanded arena court/roads, removed interior tree/collider, target-anchored damage and four original selector illustrations are produced, integrated and browser verified. See `docs/ARENA_VISUAL_V2_REVIEW.md`. The compact HUD and existing M2A gameplay are retained. Runtime director visual approval remains pending; this does not start M2B or authorize further environment/character expansion.

**M2A — Creep Dungeon Foundation: implemented and verified in two Chromium clients.** See `docs/M2A_IMPLEMENTATION.md` and `docs/evidence/m2a/` for command results, screenshots, audit and limitations. This explicit gameplay request supersedes the earlier instruction to stop at the pre-game UI phase. Existing arena/HUD composition is retained. Dungeon art uses existing assets/placeholders; ART-01 visual approval is still pending.

- [x] Menu-only dungeon entry through the in-viewport Phó Bản overlay; Dẫn Lộ removed per the latest user instruction.
- [x] Server-owned private (one per player) and shared (up to six per room) creep instances, separate zone and authoritative collision.
- [x] Existing A/Q/W combat pipeline awards EXP/gold; E/R remain unequipped. No item drops.
- [x] Physical exit returns to the arena return point; server validates distance/phase; no recall.
- [x] Full clear → short rest → scaled next wave. Empty instances preserve HP/position and pause all local timers; re-entry resumes.
- [x] Automated membership/isolation/pause/resume/transition/reward/cleanup tests and real SDK interest-filtering checks.
- [x] Two separate browser contexts verified shared synchronization and different private instances without enemy, event or reward leakage; screenshots at 1280×720 and 1920×1080.
- [x] Minimum missing death dependency: configurable five-second arena recovery, no EXP/gold loss. Final balance defaults remain proposed.

The explicit M2B request above supersedes the earlier M2A stop gate. Boss dungeons, crafting and additional school mechanics remain in their later milestones.

# Earlier UI implementation phases — 2026-10-30

- **Phase 1 (this request):** Landing (exactly one nickname input), real Room Browser, Waiting Lobby with host Start Game, then a dedicated interactive School Selection screen. All clients must confirm before server IN_GAME. No school controls in the waiting lobby. Verify two clients, selection changes, duplicates, disconnect barrier and clock gating.
- **Phase 2 (requires review before starting):** Main Arena and in-viewport HUD refinement. Existing arena/HUD is preserved as the Phase 1 transition destination, not redesigned here.
- **Phase 3 (requires later approval):** Inventory, Merchant, Dungeon, Skills, Crafting, PvP modals within viewport. No new backend mechanics inferred from mockup art.

The gameplay milestones below remain unchanged; implementing this pre-game flow does not authorize M2/M3 combat/dungeon expansion.

# Implementation Roadmap — Milestone-based, playable and testable

**Principle:** Codex must deliver one functioning, tested milestone at a time, not an entire untested game. The docs already define the future game, but the first slice is intentionally small. Every milestone ends in runnable commands, observed output, test report and a clear next step.

## M0 — Repository and architecture scaffold (first Codex task)

**Scope:** pnpm TypeScript monorepo, Phaser 4 client boot, Colyseus 0.18 server boot, shared packages, reusable validated config skeleton, deterministic core starter, unit-test setup, dev scripts, clean README. Display a placeholder room/scene and verify client connects to server. No schools/dungeons/bosses implemented yet. Configure crisp/pixel-art-aware Phaser rendering with a fixed orthographic Pokémon-like elevated overhead/three-quarter camera (not 3D or isometric), and establish asset-folder/manifest conventions from `ART_ASSET_GUIDE.md`; visually complete artwork is **not required** for M0.

**Acceptance:** `pnpm install`, `pnpm dev` (or documented equivalent) successfully start client/server; one browser tab connects; unit test and typecheck run; separate packages compile; two browser tabs can connect to a named temporary room; no DB/account; no Phaser import in `game-core`; all changes checked into Git. Document exact commands and version constraints.

**Codex must stop** after M0 and give user a demo and checklist. Do not proactively implement M1+.

## M1 — Playable 2-player combat vertical slice

**Scope:** central arena placeholder (Tiled or simple tile geometry), one placeholder hero archetype (Cái Bang suggested) with normal melee/ranged choices, arrow movement, A manual basic attack, Q/W/E/R input pipeline with only **two working skills** initially, one enemy archetype with HP and death, gold/XP/level, simple HUD; add a **tiny reviewed art/animation proof** (one hero, one creep, idle/walk/attack/hurt/death and one effect; confirm player-follow non-rotating camera, feet-origin Y-sorting and occlusion by at least one tree/building) using original assets where available, otherwise clearly labeled prototype placeholders; full server-authoritative damage, hit event feedback. Two players see one shared enemy and consistent health.

**Acceptance:** arrow movement works and is visible to a second client; manual attack cadence; nearest-at-fire ranged shots fly straight and can miss a moving target; melee cleave targets secondary at reduced damage; QWER cannot cast unavailable/unequipped skill; same enemy HP agrees for both clients; server rejects forged damage/position. All numeric behavior unit-tested without browser. Verify the real loaded animation registry and direction/frame selections in-browser, with screenshots if actually captured; if no authentic art is available, keep art completion OPEN without blocking gameplay implementation.

## M2 — Dungeon and statue core loop

**Scope:** Dungeon Guide NPC mouse interaction, private/shared creep dungeon selection, separate zone, physical exit portal, paused when empty; server match clock, two-lane statue invasion at 3 min (development fast interval override), 60s/15s alerts, statue damage/no repair, hero death/respawn, player-focused enemy aggro.

**Acceptance:** two players can farm separate/private or shared dungeons with correct instance cap; leaves preserve wave status; dungeon player cannot magically teleport to statue on alert; waves at 3/6/9 min (fast test config allowed); wave 2 appears even if wave 1 survives; player near creep takes aggro, leaving range returns creep to statue; statue damage persists; death respawns no loss.

## M3 — Progression, full ability framework, Phát Động

**Scope:** four schools' base growth/passives, 8 basic attacks, 4 active equip slots, arena-only respec, rank gates, surplus-point stat bonuses, effect library and the entire 43-skill catalogue implemented incrementally (validate completeness with tool), Thiếu Lâm two same-target combos, boss CC resistance.

**Acceptance:** all 43 definitions validated, at least one automated case per skill, UI can equip/reassign four, mixing styles allowed, school passives scale automatically, surplus reset doesn't duplicate stats, Phát Động only empowers same hit target even when cleaved, no targeted mouse skills, nothing can respec in dungeons/PvP.

## M4 — Boss dungeons, loot, items and crafting

**Scope:** shared/private fixed-strength boss dungeons, 30s empty reset and kill respawn cooldown; migrate retained encounter claims/rolls to personal boss materials for every damaging participant present at death, plus once-per-character/boss/match Long Châu. Four typed slots (weapon/armor/hat/boots), no necklace; basics upgrade via duplicate buying to level 5; three crafted branches per slot from max basic + designated material + gold. Merchant sells HP/MP potions (5s use cooldown, limit 20 with total/per-type still open), no potion purchases in dungeons. No resale, trade or transferable drops. Capacity/claim handling and open formulas/policies must follow [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md); deterministic crafting remains proposed.

**Acceptance:** 1/2/6 eligible players each receive a material, without rolls; first-clear Long Châu cannot repeat via private/shared farming, retries or duplicate death callbacks. No damage/no presence means no reward. Empty 29s reentry cancels reset, empty 30s resets; dead-boss respawn is separate. Purchase/upgrade/craft/use requests cannot duplicate level/item/gold/stats. Validate potion 5s cooldown and dungeon purchase rejection, typed slots, all-school use, twelve branches including Thanh Tâm and penetration, non-multiplying lifesteal, no resale/transfer and safe full-inventory rewards. Existing runtime and protocol must migrate without double-awarding. Detailed future cases: [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md).

## M5 — Full 20-wave defense and five boss encounters

**Scope:** data-driven wave recipes 1–20, west/east spawns, cumulative overlapping waves, chapter bosses 5/10/15/20 with clear gate and few seconds rest, final Vương Trùng Dương after four bosses, victory/defeat/results; role-specific boss mechanics and telegraphs, scalable player-count creep threats.

**Acceptance:** normal clock exactly every 180s; chapter boss does **not** spawn before its fifth wave clears; delayed boss can overlap newer waves; no duplicate boss spawn; bosses give EXP/gold only; wave 20 then fourth boss then final; defeat at statue 0, victory only after final defeated while statue alive; 1 player can theoretically win under test build, 6-player challenge scaled.

## M6 — Optional PvP rooms and polish

**Scope:** PvP NPC, side A / side B join, ready, start, fight, end/return to arena, no changing loadout inside PvP; then original pixel-art asset iteration and replacement of placeholders according to `ART_ASSET_GUIDE.md`, animation, particles, sound, VFX, performance and playtest fixes. No PvP-dependent progression.

**Acceptance:** 1v1 and uneven teams totaling <=6 work; ready gate; duel outcome; no room spillover; server keeps authoritative hit validation; PvP never duplicates gold/items/XP; timings during invasion resolved in design before implement.

## M7 — Balance & production prep

**Scope:** instrument XP/gold/levels/raid times, generate seeded balance reports for all schools, fine-tune survivability and speed, load test 6 players, runtime monitoring, deployment docs, responsive keyboard-first UI (desktop browsers), production static+WS hosting, no accounts.

**Acceptance:** repeatable sim outputs; automated tests green; 6-player wave load measured; no obvious permanent CC lockdown; no item duping; reconnection policy approved; end-to-end playthrough in accelerated test mode and production-timing smoke test.

## Per-milestone Codex response format

1. Summary and files changed.
2. Commands run and PASS/FAIL outputs (do not claim tests not executed).
3. Manual browser smoke test steps and screenshot paths if available.
4. Open issues/risks and questions tied to doc section.
5. What is **not implemented yet** and precise next milestone.

**One Git branch/PR or logically coherent commit series per milestone**, if environment permits. Do not silently alter confirmed game rules to simplify implementation.

## v1.4 UI/HUD refactor checkpoint for existing M1 prototype

The game director rejected a prototype with permanent exterior admin-style sidebar. **Before adding more character schools, dungeons or shops**, run a bounded UI-only refactor using `CODEX_UI_REFACTOR_TASK.md`. Create one large in-match game viewport, layered in-world HUD/hotbar and modal manager. Move existing character, room and creep information out of page sidebars; don't delete functional features. Verify inventory menu and dungeon NPC menu inside the viewport, even if not yet backed by finished item/dungeon mechanics (use explicit disabled preview states). Do not restart earlier completed milestones or rewrite multiplayer/combat. Screenshots and automated tests should verify the new layout with two clients. Subsequent M1/M2/M3 acceptance must use `UI_UX_SPEC.md`; a stand-alone lobby may remain outside play. UI must not block arrow/A/QWER controls when closed.

## Mandatory visual checkpoint: ART-01 (v1.6)

Before expanding the full environment or school art set, conduct `ART-01` — a one-screen genuine-art vertical slice as specified in `ART_PRODUCTION_STANDARD.md`. Stop producing entire new maps using procedural placeholders; do an art source audit, produce/import and integrate a complete small set of character, NPC, enemy, tree, building, ground, VFX and UI assets, then show **actual Phaser play PNG screenshots, static animation contact sheets and live frame/transition observations (recordings only on explicit user request, per `AGENTS.md`)** to the game director. Gameplay/infra milestones may be separately verified with placeholders, but art milestones remain unapproved until director sign-off. Run `CODEX_ART_QUALITY_RESCUE_TASK.md` as a focused task in the existing repo.
