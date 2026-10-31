# M3C2 — Võ Đang implementation

Scope: Võ Đang only, retained artwork, shared M3B progression. No Thiếu Lâm mechanics, equipment, loot/crafting, PvP, bosses, maps, wave-catalogue expansion, artwork generation or recordings. M3C2 engineering/gameplay integration is verified. Exact final-stage and browser accounting follows below.

## Combat and proposed tuning

Canonical names/mechanics follow CONTENT_DATA and this assignment. All numbers are configurable M3C2 proposals at30Hz in `packages/game-data/src/vo-dang.ts`, not final balance. Standard ranks1–4 at levels1/3/5/7 and ultimate ranks1–3 at6/10/14 use M3B, with four slots and at most one optional ultimate.

| Ability | Rank1 behavior | MP / base cooldown ticks |
| --- | --- | --- |
| Võ Đang Quyền | raw19,range50,60° half-angle,20% cleave,13-tick A interval |0 /13|
| Võ Đang Kiếm | raw27,range62,60° half-angle,35% cleave;25% server RNG chance for raw20,speed390,range320 non-homing Kiếm Khí |0 /18|
| Lưỡng Nghi Thủ | raw28,range64,20% enemy Attack Power reduction for90ticks |8 /60|
| Huyền Âm Chưởng | raw30 short170-range piercing Yin wave;30% movement slow and25% attack slow for90ticks |12 /105|
| Dương Khí Kích | raw34,range60;refund7MP once if at least one valid hit, including a kill |10 /75|
| Thái Cực Thần Công | timed180ticks,absorbs80% post-armor damage at1.25MP per absorbed damage |12 /270|
| Thái Cực Trận | stationary radius125,duration180,tick every30,raw24;35% movement/20% attack slow with35-tick linger |38 /480|
| Thất Tinh Kiếm | four frontal raw25 strikes,5-tick spacing,range80,60° half-angle |18 /135|
| Nhân Kiếm Hợp Nhất | raw55,speed390,range420,radius12;facing-aimed piercing projectile,once per target |18 /120|
| Bát Quái Kiếm Trận | stationary radius105,duration150,tick every25,raw22 |26 /300|
| Tọa Sát Bác Đồ |45-tick window,takes incoming hit then one raw72 retaliation within110;living enemy and clear terrain required |14 /180|
| Vạn Kiếm Quy Tông |five raw54 piercing waves,3-tick release spacing,60° fan,range460,radius20;once per target per wave |42 /510|

Ranks explicitly improve damage/range/status magnitudes/durations, refunds, shield fraction/conversion, counter duration/damage, and area duration/radius/damage; costs grow modestly and cooldowns shorten. Real character cooldown reduction then applies, while A uses Attack Speed. Damage uses M3B's rank base plus Attack Power above the school baseline, armor/crit and shield before HP. Negative attack modifiers cannot produce negative damage.

### Reusable capabilities and lifecycle

`game-core` remains deterministic and has no Phaser/DOM/Colyseus dependencies. Arc/projectile statuses now support separate `attack_break` and `attack_slow`; actual creep damage and attack cadence consume them. Status stacking remains strongest nonadditive across sources; same source/ability refreshes, never multiplies. Movement and attack slows expire independently. Hero stat sources expose both debuffs.

Dương Khí refunds exactly once after the authoritative arc finds a valid damaging hit; no client hit/refund command exists. Cleave and killing hits cannot multiply refunds. Refunds/regen cap at max mana; dead heroes do not regenerate. Mana regeneration uses each school's derived stats and simulation time.

Mana shields use reusable timed status state. The strongest active fraction wins (ties prefer lower mana cost), never additive absorption. `absorbed=min(postArmorDamage*fraction,mana/manaPerDamage)`; spend only that mana and apply the remainder to HP. Fractional remainders stay authoritative; damage text rounds only for display. Zero mana absorbs nothing; regeneration can fund later absorption only while the timed shield remains active. Death/travel/respec/disconnect/defeat clear the owned shield.

`World.areas` holds stationary caster-position zones with unique IDs, owner, absolute expiry, next tick, rank effect and offensive snapshot. A cast ticks immediately, then once per configured cadence while tick<expiry; no extra expiry tick. Current position/HP/terrain eligibility is checked on each target/tick; entry joins at the next tick, leaving stops subsequent damage and slows linger only their configured35ticks. Same-owner/same-skill recast replaces its zone; different skills/owners overlap independently. No allies/statue are hostile targets. Ownership cleanup removes old-zone formations on travel/death/respec/disconnect/defeat.

Counter effects share Thiên Sơn's existing status path with configurable `evade`. Võ Đang setsfalse: a positive authoritative attack from a living enemy consumes the single-trigger window before processing incoming damage; retaliation then requires survival, living attacker, range and clear terrain. Unknown/allied sources and reactive retaliation do not trigger it. The recursive call is explicitly marked reactive; death cannot retaliate. Thiên Sơn preserves its existing one-hit evasion behavior. No PvP targeting is inferred.

Projectiles reuse swept collision, wall ordering and target IDs; Kiếm Khí rolls only the server RNG on an accepted A. Nearest eligible enemy position is sampled once at spawn (clear terrain, in range); facing fallback remains the existing provisional behavior when none exists. All multi-wave origins/directions/offense are captured once; no tracking or mouse combat targeting. Each piercing wave deduplicates its own targets; intentional different waves may hit the same enemy.

## Progression and synchronized presentation

Base Võ Đang: HP150,MP180,ATK25,DEF4,Attack Speed1,movement160,crit8%/1.5×,mana regen9/s,CDR8%. Growth after level1: HP7,MP3,ATK1.7,DEF0.2 per level. Thái Cực Tâm Pháp automatically adds MP3,regen0.15/s,CDR0.004 per level after1. Surplus adds MP4,regen0.25/s,CDR0.003 per point only after all four equipped skills are max-ranked; M3B clamps CDR at40%. No passive slot, permanent respec stacking or equipment layer is introduced.

Normal rooms initialize full school HP/MP, one point, empty active slots, Quyền A. Both A choices and all ten active icons use existing M3B controls; styles mix freely, cross-school builds fail, arena-only living edits retain per-ability cooldown debt and do not refill HP/MP. School/portrait/dungeon avatars reuse approved sprites.

Protocol8 adds a zone-view-filtered `areas` map containing only client-needed position/radius/remaining ticks/owner/ability/zone. Server room state has no class near the63-field cap; parent state remains well below it. Late observers get current formations from state, not replayed cast assumptions. Shield/status/mana use existing synchronized player state; combat events cue absorption/refund/counter/tick art. Asset-to-skill mapping, dimensions/pivots/fps/provenance/missing/unused assets: `M3C2_SKILL_ASSET_MAP.md`.

The opt-in development Skill VFX Preview includes Võ Đang's ten definitions and two basics plus server-owned target-line/attacking-dummy/clear controls. Both existing non-production legacy+skill-preview flags are required; normal/production rooms reject fixture creation. Dummies grant zero rewards, are owner-scoped and clear on leave. No stat/RNG result is accepted from clients. The preview retains historical rank1 legacy resources; normal progression tests use real school stats separately.

## Files changed

- `packages/game-data/src/vo-dang.ts`: new definitions/ranks/stats; `ability-schema.ts`, `m1.ts`, `progression-data.ts`, `schools.ts`, `index.ts`: validated shared registration.
- `packages/game-core/src/types.ts`, `skills.ts`, `combat.ts`, `simulation.ts`, `status.ts`, `progression.ts`, `dungeons.ts`: generic shield/areas/refund/proc/status/reactive/lifecycle support.
- `packages/game-protocol/src/index.ts`, `apps/game-server/src/rooms/MatchRoom.ts`: Protocol8, area synchronization/view isolation, existing progression initialization and bounded dev fixtures.
- Client `skill-vfx.ts`, `skill-preview.ts`, `skill-menu.ts`, `main.ts`, `ui.ts`, `floating-damage.ts`, `pregame.css`, `arena-hud.css`: retained asset phases, preview/skill summaries/icons/avatars and fractional damage display; no viewport redesign.
- `scripts/prepare-assets.mjs`, `verify-vo-dang-skills.py`, `audit-m3c2-assets.py`, `package.json`: retained registry/asset validation.
- `tests/vo-dang-skills.test.ts`, `vo-dang-room.test.ts`, `tests/e2e/m3c2*`, `playwright.m3c2.config.ts`, `tools/m3c2-balance.ts`: deterministic/network/browser/balance coverage. Existing Cái Bang asset/catalogue tests are explicitly school-filtered; unsupported-school progression tests now use Thiếu Lâm.
- Updated design/acceptance/roadmap documentation only for this milestone. Earlier unrelated working-tree changes are preserved and are not attributed to this task.

## Iteration history

Focused combat/progression/SDK checks passed, including56 tests after explicit ultimate/respec/armor additions. The initial browser run passed all-skill preview and normal three-school progression/farming/arena defense; its six-player navigation fixture failed on forest terrain and was corrected to use the existing entrance path. Failed evidence is not acceptance. The revised browser runs and final-stage results are recorded below.

`tools/m3c2-balance.ts`:48 eight-second legal mixed-build probes,levels1/6/15/30,both basics,optional ultimate,seeds42/1337/9001. Aggregate three-target DPS ranges77.25–116.875,293.375–361,627.625–743.125,916.25–1065. JSON:`artifacts/m3c2-balance.json`. Targets are immortal/stationary/defense5; no optimal-human,survival,economy,PvP,boss,campaign or six-player balance claim. No numeric retuning of other schools.

Pending design choices remain timed versus toggle shield and final tuning (growth,rank values,proc chance,shield conversion/counter limits/area cadence). Current timed/single-trigger/stationary choices are explicit provisional implementations. Existing baseline hurt/death aliases and unrelated placeholder creeps remain disclosed, not silently completed.

## Final verified results — 2026-10-31

The final command was:

```text
pnpm check:final --config playwright.m3c2.config.ts tests/e2e/m3c2-preview.spec.ts tests/e2e/m3c2.spec.ts tests/e2e/skills.spec.ts tests/e2e/m3c1-preview.spec.ts
```

Project and test/tool typechecks,**266 unit/network tests in22 files**,**eight workflow checks**,production build and**ten asset validators passed**. The existing large-client-chunk advisory remains. Protected Võ Đang checks passed for89 baseline files and1441 skill-art files; all40 retained skill PNG/atlas source/public hashes match. Combined runtime registry:61 components,414 tags,1634 frame references.

This invocation passed**10 of11 browser cases** and exited1 on the normal-farming test's assumption that the client snapshot's latest60 events were a full combat log. Only the test was changed to accumulate actual observed hits throughout combat. `pnpm exec tsc -p tsconfig.tools.json --noEmit` passed, then the affected case passed in**1.2min** with:

```text
node tools/run-playwright.mjs test --config playwright.m3c2.config.ts tests/e2e/m3c2.spec.ts --grep normal
```

All**11 latest browser results pass across the final attempt and targeted recheck**, not a single green11-case pipeline invocation. All implementation inputs were unchanged by this fixture correction. Exact test identities/results are in `docs/evidence/m3c2/verification-summary.json`; logs are `final-acceptance.log` and `browser-recheck.log`, with the first report retained as `playwright-final-attempt.json`. The earlier exact-optional stat-summary type error stopped before tests and was fixed before the measured final stages; its log is retained separately. No successful full unit/build/asset stage was repeated merely for reporting.

The final browser scope covers all ten Võ Đang skills/two basics and actual defensive/refund/area/proc phases,24 four-facing baseline animation tags,normal three-school point-funded farming/rank changes/read-only dungeon builds/mana sustain/arena defense,six-player natural combat/rewards plus a separate living-party arena readability check,and all five Cái Bang/two Thiên Sơn browser regression scenarios. Test services used a disclosed30-second development invasion clock and100000 statue HP; production180-second timing is unchanged and covered by core/network regressions. No hour-long campaign or new wave content is claimed.

Actual PNGs and live frame/state observations were inspected against the supplied positive world/character references and rejected placeholder screenshot. All ten skills yielded four cast character frames; Tọa Sát yielded eight including readiness/counter; animated VFX frames were observed for every skill. Baseline gallery observed every frame across all24 tags, with stable pivots/positions and supplied frame rates. Formations remain stationary under movement and below characters; fractional shield damage labels are readable. Six living heroes remain visible at1280×720 and1920×1080,with unchanged camera zoom1,feet-depth and scale1. `runtime-integration.json` records retained bytes and measured frame subsets separately from protected historical art manifests.

`M3C2_SKILL_ASSET_MAP.md` lists all ten implemented skills and their exact sprite bindings,plus missing/unused assets. Timed versus toggle shield and final numerical tuning remain open as explicitly provisional choices. Baseline hurt/death remain disclosed idle aliases; legacy practice-creep art remains a placeholder. M3C2 is complete within the requested engineering scope. **Stop here; Thiếu Lâm is not implemented.**
