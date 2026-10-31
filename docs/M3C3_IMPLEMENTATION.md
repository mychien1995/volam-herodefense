# M3C3 — Thiếu Lâm

Scope: all thirteen canonical active skills, both independent A attacks, automatic Dịch Cân Kinh, both same-target Phát Động chains, M3B progression and supplied sprite/VFX integration. No M3D balancing, new PvP/boss/equipment/crafting/map systems, artwork generation or recordings. Earlier unrelated working-tree edits remain intact.

## Configurable implementation choices

`packages/game-data/src/thieu-lam.ts` holds explicit provisional numbers at30Hz. Standard ranks1–4 use existing1/3/5/7 gates; ultimate ranks1–3 use6/10/14. Both Quyền/Đao styles mix in four active slots; A is independent. One optional ultimate, one point per level including1, level cap30 and living-arena-only edits retain M3B behavior.

| Ability | Rank1 behavior | MP / CD ticks |
| --- | --- | --- |
| Thiếu Lâm Quyền | raw38,range48,45° half-angle,25% secondary cleave |0 /28|
| Thiếu Lâm Đao | raw32,range62,72° half-angle,55% secondary cleave |0 /23|
| La Hán Quyền | raw40,range58,50% cleave;15% guard45ticks;chainA1 |10 /75|
| Vi Đà Quyền | raw44,range62,50% cleave;DEF−12 for120ticks;chainA2 |12 /90|
| Đại Lực Kim Cương Chưởng |12tick windup,raw65,range78,60% cleave;chainA3,2.4× valid targets |20 /150|
| Toàn Phong Thoái | radial raw34,range70;chainB1 independently on each hit target |12 /90|
| Hoành Tảo Cước |raw42,range80,90° half-angle,80% cleave;chainB2 |14 /105|
| Vô Ảnh Cước |six frontal raw17 kicks,4tick spacing,range76;chainB3,2× valid targets |24 /180|
| Kim Cang Bất Hoại |40% damage reduction and stun/forced-movement resistance for120ticks |20 /300|
| Như Lai Niết Bàn |15tick windup,radial raw120,range140;25% guard150ticks starting at impact |40 /540|
| Tru Tà |raw42,range84,70% cleave;30% slow90ticks |12 /90|
| Kim Quang Hộ Trận |caster-following radius145 aura,180ticks;DEF+22 refreshed every15ticks,16tick linger |24 /330|
| Tam Giới Quy Thiền |raw62,range88,65% cleave;DEF−20 for135ticks |18 /135|
| Bất Động Minh Vương |one radius140 healing pulse,42HP per living allied hero including caster |26 /300|
| Như Lai Thiên Diệp |raw100 wide straight piercing wave,speed300/range360/radius48;nearby allies DEF+30 for180ticks at cast |42 /540|

Ranks raise damage/reach, combo multiplier, defensive strength/duration, debuffs, support radius/heal/defense/duration; MP increases modestly and cooldowns shorten. Bất Động retains the canonical proposed healing pulse; protection-versus-healing remains an open design choice. These numbers need M3D review, not further gameplay-system expansion.

Base Thiếu Lâm: HP220,MP110,ATK30,DEF14,Attack Speed1,movement148,crit6%/1.5×,mana regen6/s,HP regen1.2/s,CDR0. Per level after1: growth HP10,MP2,ATK1.6,DEF0.4; Dịch Cân adds HP4,DEF0.5,HP regen0.12/s automatically. Surplus adds HP6,DEF0.6,HP regen0.08/s per point, only after all four slots are max-ranked. Lv30 before surplus: HP626,DEF40.1,HP regen4.68/s. No passive slot/point cost or permanent respec accumulation.

## Shared mechanics and lifecycle

`combos.ts` tracks `(sourceId,targetId,chainId)` with absolute simulation expiry. Every successful damaging arc/cleave hit advances only that target. The expected second stage progresses; first stage restarts; out-of-order second/final clears that target's chain. Misses do nothing; A and unrelated actives neither advance nor reset. Chains A/B remain independent. The proposed six-second window refreshes after each valid setup hit; strict expiry means tick==until is expired.

An empowered finisher consumes the sequence once on the first valid hit on that target. Multi-hit actions cache this result per target for that cast: all six eligible kicks are stronger, with exactly one empowerment trigger per target, no repeated consumption and no global/slot-based progress. Late-entering targets resolve their own current sequence at their first real hit. Damage remains armor/crit/cleave-aware. Death, target death/removal, respec, travel, disconnect and defeat remove stale sequence ownership; no cross-zone progress transfer.

Delayed arcs capture direction/offense, then test current target position/range/terrain when windup ends. Another action cannot bypass their commitment. Stun cancels a vulnerable pending action. Kim Cang's timed interrupt resistance rejects new stuns and hostile displacement; voluntary movement remains possible. It does not grant invulnerability, silence immunity or a free resource reset.

Damage reduction uses the strongest active value, capped85%, after armor/crit/rounding and before mana shield/HP. Defense buffs use strongest nonadditive flat magnitude; same source refreshes. Healing targets only living in-range heroes in the same authoritative world, checks terrain, caps at maxHP and never repairs statue/heals enemies/revives. Auras follow the living owner, reevaluate current ally positions each pulse and leave only bounded configured linger. Owner death/leave/travel/respec removes owned aura and its allied defense statuses. Support does not create XP/gold/assist eligibility without the existing qualifying enemy hit rules.

Protocol9 adds a view-filtered hero `combos` projection with target IDs, stage and remaining ticks. The room retains all authority; clients cannot submit stages, buffs, damage, healing or timestamps. The compact target-specific combo display, active/passive/basic icons, dynamic8/5 catalogue counts and HP-regeneration stat stay inside the existing viewport/skill overlay. No camera/map resizing or exterior panels.

## Retained artwork

Exact mappings/provenance/missing/unused phases: `M3C3_SKILL_ASSET_MAP.md`. Audit:852PNG files and26 retained character/VFX components. Approved baseline source/export bytes remain protected. Thiếu Lâm skill manifest retains `prototype_approval_gate_waived`, not final director approval. Dedicated A icons were not supplied; A reuses La Hán/Tru Tà icons. Independent baseline hurt/death remain existing idle aliases; unrelated legacy practice-creep/world placeholders are not declared complete.

PNG screenshots and live frame/timing observations verify presentation separately from authoritative tests. Historical evidence and asset sources are preserved. No source art is regenerated and no video is created.

## Validation

Focused `tests/thieu-lam-skills.test.ts` and `tests/thieu-lam-room.test.ts`:28 tests passed after correcting fixture position/transfer and zone-filter assertions. Broader focused school/progression regressions are retained in logs. `tools/m3c3-balance.ts` produced144 legal probes across all four schools,levels1/6/15/30,both basics,seeds42/1337/9001,with valid A/B and wrong-order Thiếu Lâm sequences under controlled stationary targets/periodic pressure. Raw output:`artifacts/m3c3-balance.json`; summary:`docs/evidence/m3c3/balance-summary.json`. No optimal-human,economy,PvP,boss,campaign or final balance approval claim.

Final verification is complete; exact execution accounting follows below. Browser suites cover two-client all-skill phases/combos/basics and baseline frames, normal point-funded four-school farming/edit restrictions/arena defense, six-player natural combat and normal-zoom readability, plus existing-school regressions. Services use a disclosed30s development invasion clock and100000 statueHP; production180s remains unchanged.

## Final verified results — 2026-10-31

```text
pnpm check:final --config playwright.m3c3.config.ts tests/e2e/m3c3-preview.spec.ts tests/e2e/m3c3.spec.ts tests/e2e/skills.spec.ts tests/e2e/m3c1-preview.spec.ts tests/e2e/m3c2-preview.spec.ts tests/e2e/gameplay.spec.ts tests/e2e/dungeons.spec.ts tests/e2e/ui.spec.ts
```

The first attempt stopped at the static core dependency guard:308 passed,one failed because an inline type import matched its dynamic-import prohibition. Replaced it with a static type import; runtime semantics did not change. The corrected final pipeline passed project/test/tool typechecks,all309 unit/network tests in24 files,eight workflow checks,the production build and all ten asset validators. The existing large-client-chunk advisory remains.

The browser stage passed21/24 in15.3minutes. Failures were two historical fixtures assuming free starting skills,and a six-player driver giving Gold only a non-damaging aura while advancing heroes serially into aggro. Modern dungeon/combat fixtures now spend real earned points through the skill menu; the M1 combat fixture still supports its explicit legacy branch. Six-player farming uses a learned Gold attack,a coordinated approach and concurrent independent keyboard inputs; afterward Gold legally refunds/swaps to the aura in the arena for readability. No damage,HP,reward,statue or RNG result was changed to make these fixtures pass.

After those fixture-only corrections,`pnpm exec tsc -p tsconfig.tools.json --noEmit` passed. Rechecked the affected shared/private dungeon,combat,six-player cases plus the newly updated Gold catalogue case:

```text
node tools/run-playwright.mjs test --config playwright.m3c3.config.ts tests/e2e/dungeons.spec.ts tests/e2e/gameplay.spec.ts tests/e2e/m3c3.spec.ts tests/e2e/progression.spec.ts --grep 'two real clients share|two real clients farm|two clients agree|six-player natural combat|Thiếu Lâm uses' --output artifacts/playwright-m3c3-recheck
```

All5 rechecks passed in4.6minutes. There are25 distinct latest passing browser cases across the final attempt and targeted recheck,not a single green25-case invocation. The successful full unit/build/asset stages were retained. Exact identities/statuses: `docs/evidence/m3c3/verification-summary.json`; original full browser report:`playwright-final-attempt.json`; corrected subset:`playwright-results.json`. Failure contexts remain under the original output directory.

The real six-player farm produced positive XP for every participant (10/10/10/10/22/10 in the recorded snapshot) and all six were alive. A separate living-party arena check confirms unchanged zoom1,rotation0,feet/Y-depth/origins/scales,two owner-bound Gold aura loops and normal-size1280×720/1920×1080 screenshots. All six error lists are empty. Every active produced3–4 observed caster frames and multiple actual observer VFX frames; the baseline gallery observed all frames across24 authored cardinal tags. These are observed subsets of skill animations,not a claim that every skill/facing/frame was exercised in multiplayer.

Actual PNGs were opened and compared with the supplied character/world/hub/battle/menu concepts and rejected placeholder/dashboard references. The monk retains a readable bald silhouette,layered orange/gold robes,heavy fists and broad curved Đao; golden impacts and protection remain distinct from other school palettes. The full world remains behind temporary overlays. Supplied skill-art final director approval is still pending under its retained waiver; independent baseline hurt/death and legacy practice enemies remain disclosed placeholders/aliases.

The prepared registry has87 components,596 animation tags and2362 frame references. Gold contributes26 components/182 tags/728 references; all52 Gold sheet/atlas source-public pairs have equal SHA256 bytes. The final report-path-only change in `tools/m3c3-balance.ts` was typechecked and its144 probes rerun; it now writes the documented root artifact regardless of launch directory. No full game suite was repeated for report/doc changes.

M3C3 is implemented and verified within the requested scope. Stop before M3D.
