## Campaign balance và thử lại boss — 2026-11-06

Production dùng đường EXP80+40L, ngân sách thưởng theo đợt, scaling phòng, Long Châu cộng tuyến tính và hệ số phó bản theo thời gian. Các giá trị là tuning chiến dịch v1 đã được phép triển khai; mốc level/vàng là mục tiêu playtest, không phải kết quả một trận60 phút đã đo. [Quy tắc, cấu hình và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Fixed branch progression — 2026-11-04

The rank cap is four for all five active skills. The fourth ultimate rank uses the existing per-rank progression for its school and opens at level 24. Characters can spend 20 skill points and reserve up to 10 future stat points. Earlier mixed-build and automatic surplus measurements below describe the historical rules.

# Balancing Plan v1.0 — hard but fair

## M3D director-reviewed playtest tuning — 2026-11-03

Current values supersede older feedback trial values: creep speed0.648×buffed entry speed, one identity/wave; boss dimensions×1.1 per axis; Shift8s/charge; monk A finisher/idle cooldown1s after finisher or2s inactivity. Vi Đà offset189, Toàn Phong range234/speed330, Ca Diệp range273/speed360/damage42/stun1.2s, Vô Ảnh damage17/foot with one foot normally or six in the valid chain, range260/speed390. Như Lai palm120 and first-entry field36/radius150/3s retain data scaling; Buddha2× is presentation only. Phá Giáp range240/width50; Vô Cẩu whirl175/final215/duration×1.3. Base values precede rank/stat/armor/crit.

Lý Mạc Sầu rest1.2s/fallback-basic1.8s/needle cooldown4s. Boss frequency is authored in `packages/game-data/src/boss-cadence.json`; edit then rebuild/restart. Chu defense180; wine12s ignores70% of Chu defense for drinker only (raw100 becomes36 without wine/65 with wine before other modifiers); pull120px/s, no Shift during reflect. These reviewed test values remain revisable.

The144-build fixed-seed four-school probe and the input-timing regressions are complementary: all144 measured rows remained equal after the Vô Ảnh input fix because the probe uses spaced inputs, while the new real-QWE regression exposes early-input failures. No claim of optimal human, campaign, boss-clear or PvP balance. Retain the milestone's separately delegated economy defaults without modifying prices/rewards to force DPS equality. Details: `docs/M3D_VO_ANH_FIX_2026-11-03.md`.

**Delegated trial economics — 2026-11-02:** purchase testing uses [validated economy data](packages/game-data/src/economy.ts):105 gold first four-slot set,2,035 full basic level5 set, potions4/10/22. Selected trial policies are20 total/shared5s/instant recovery. `tools/economy-trial.ts` ran288 controlled legal-build probes (four schools,both basics,levels1/6/15/30,three seeds,gear0/1/5). Full-gear DPS ratios range1.534–1.966 atlevel1 and1.172–1.280 atlevel30. These stationary-target probes are not farm-rate/campaign/boss/party/PvP acceptance. Exact coefficients, per-level comparisons and limits: [ECONOMY_TRIAL.md](docs/ECONOMY_TRIAL.md). Earlier open pricing/potion-policy notes below now have provisional choices; personal rewards/crafted effects remain future.

**Inventory design baseline — 2026-11-02:** [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 replaces shared loot rolls with personal materials and once-per-boss/character/match Long Châu. Four basics cap at level 5; potion cooldown is 5s; weapon stun is replaced by penetration and healing-Z boots by Thanh Tâm. This is a plan for future measurements, not measured balance or implementation approval. Potion cap interpretation/shared cooldown and Long Châu/stat/price coefficients remain open.

## M3C3 provisional Gold tuning — 2026-10-31

`game-data/thieu-lam.ts` contains all explicit rank/base/growth/innate/surplus/sequence values. `tools/m3c3-balance.ts` measures legal four-school builds at1/6/15/30,both basics,three fixed seeds,and compares valid A/B versus wrong-order Gold sequences with identical targets and pressure. Output:`artifacts/m3c3-balance.json`. It is a controlled implementation probe,not final M3D balance,economy,PvP,boss or campaign acceptance. No other school's numeric tuning is changed.


## 1. Intent and philosophy

- The game **should be hard**, including for well-equipped teams; a skilled solo clear remains possible. Fair failure should tell the player what to do better next attempt.
- Six-player scaling should challenge a coordinated group; do not punish teamwork by making every per-player reward and enemy HP impossible.
- Balance **PvE farm efficiency, statue defense, and PvP** as three distinct contexts. Perfectly even PvP matchups are not required; no school should dominate all three contexts.
- Stat and item numbers in this document are **illustrative tuning hypotheses**, NOT approved values. Keep numbers in versioned config with a repeatable test seed.

## 2. Level and school attributes

Core variables: HP, Attack Power, Defense, Attack Speed, Movement Speed, Mana/regen, Cooldown Reduction, Crit Chance, Crit Damage. Base growth automatically calculated by school and level; innate passive is extra automatic school differentiation, not skill-point investment.

School targets for **relative** growth:

| School | High | Moderate | Trade-off |
|---|---|---|---|
| Cái Bang | Attack, Crit/crit damage | HP | fewer attacks and less mobility than Thiên Sơn |
| Thiên Sơn | Speed, Attack Speed, Crit | Attack | lower HP/Defense |
| Võ Đang | Mana, regen, cooldown efficiency | balanced HP/Attack | finite mana required for shield and damage |
| Thiếu Lâm | HP, Defense, sustain | potentially huge delayed damage | slower/less agile |

**Surplus points:** once current four equipped skills all maxed, bonus stat package increments **by school**, automatically; recomputed, not farmable by repeated respec. One possible growth approach: diminishing per-point boosts at levels >20, but formula not approved. Avoid runaway attack-speed × crit × item multiplicative builds.

## 3. Damage math and tuning

Use common server-side damage pipeline from `COMBAT_SYSTEM.md`. Sample starting curves:

```
HP(level) = baseHP + growthHP * (level - 1)
ATK(level) = baseATK + growthATK * (level - 1)
DamageAfterArmor = Raw * (100 / (100 + max(0, defense)))
CritResult = DamageAfterArmor * (isCrit ? critMultiplier : 1)
```

These are placeholders; determine weapon coefficient, skill rank coefficient, animation locks, cleave multipliers, hit count, AoE falloff and armor penetration with **simulation and playtests**. An ability's raw DPS is insufficient: crowd control, hit chance, reach and telegraphs are real power.

## 4. Creep and invasion scaling

At each wave spawn, snapshot `P = active participating player count`, constrained 1..6. Example tunable starting points only:

```
creepCount = ceil(baseCount(wave) * (1 + 0.60*(P-1)))
creepHP = baseHp(wave) * (1 + 0.16*(P-1))
creepAttack = baseAttack(wave) * (1 + 0.08*(P-1))
```

Wave progression separately increases `baseCount`, `baseHp`, and/or attack. These values are **NOT balanced** and MUST NOT be hard-coded as final. Use a 6-player benchmark to check whether total HP burden becomes excessive (sample count*HP scaling is aggressive). Consider creep spawn stagger rather than dropping all enemies onto one frame. Both west/east paths remain active for solo and groups. Dungeon creep waves use same scaling framework with separate coefficients and progression; boss dungeon fixed stats per boss config and not stronger on repeated kills.

Raid 1–5 draft lineup:

| Wave | Enemies | Training / threat |
|---|---|---|
| 1 (03:00) | walkers | basic lane defense |
| 2 (06:00) | walkers + runners | intercept / mobility |
| 3 (09:00) | melee + ranged | positioning, priority |
| 4 (12:00) | armored + runners | armor break + control |
| 5 (15:00) | mixed + elite | first readiness check before Đông Tà |

Remaining waves should introduce threat patterns rather than only multiplying HP. Event scheduling is fixed even if earlier enemies remain. Boss spawn gate follows completion of wave 5/10/15/20, rest 10s provisional; maintain independent regular raid clock. Full scheduled raid timeline ends at 60:00, actual match may exceed it.

## 5. XP economy (confirmed split)

- For each creep killed, determine list of players with a **kill or meaningful assist** on that specific creep; fixed XP pool divided equally among eligible players. If pool 60 XP and 3 eligible, each gets 20; **do not give 60 each**. Eligibility can include damage and explicitly supported meaningful control/healing under a time-window implementation; concrete thresholds TBD and must avoid farming from passive aura without participation.
- Dungeon bosses: any player with at least one successful damaging hit qualifies for XP, with recommended requirement to remain in instance at kill time. Divide boss's fixed XP pool among eligible players. Boss does not repeatedly level itself after kill.
- Statue raid creep kill XP follows same fixed-pool split; invasion boss rewards gold and EXP, not items.
- No persistence; level-cap XP after 30 can be ignored or used only for scoring, not endless power growth.

## 6. Economy and pacing

- Regular raids arrive every **180 seconds**, 20 waves = hour schedule. **No statue repair**, so one weak defense creates long-term consequences.
- Intended loop: between raids, choose XP-focused dungeon vs fixed-boss materials vs shopping/crafting. Every eligible boss participant receives a material; tune time pressure through boss difficulty, travel/respawn and gold costs rather than competition for one rolled item. First-clear Long Châu adds bounded in-match progression; its coefficients are not yet chosen.
- Monitor a party's level, XP/min, gold/min, item progress at 15/30/45/60 minutes. Starting illustrative *targets*, not commitments: 1–8 by ~15min, 9–16 by ~30min, 17–24 by ~45min, 25–30 by ~60min.
- Basic shop upgrade cap **5 is confirmed**. Deterministic crafting remains proposed. Personal boss material rewards replace shared rolls explicitly by the 2026-11-02 decision; measure recipe completion at 1/2/6 players without retaining old roll scarcity assumptions.

## 7. Boss and CC balancing

- Strong resistance to stun, silence, disarm, knockback, pull. Most bosses should ignore forced movement; reduce hard-control durations severely; keep damage/utility meaningful.
- Telegraph attacks with dodge windows suitable for arrow-key controls; avoid unavoidable kills or bosses that can be stun-locked indefinitely.
- Major invasion bosses require competent defense but don't produce item drops. Dungeon bosses are fixed difficulty and repeatable for crafting.
- Vương Trùng Dương intended culmination, not merely a giant HP bag. Boss mechanics remain open in detail.

## 8. Headless simulator and measurements

Simulation uses `game-core` directly, without Phaser or Colyseus, with seeded RNG and deterministic fixed ticks. Evaluate:

1. Four schools at Lv1/6/15/30 against identical DPS dummy and several enemies; melee cleave vs single target, projectile hit/miss.
2. Each school's two normal attack styles, standard 4-skill and mixed-style loadouts, Phát Động sequence on same/different targets.
3. Boss damage received by stuns/control resistant rules; mana shield resource budget; Thiên Sơn attack-speed/crit breakpoints.
4. Solo, 2-player and 6-player defense of early/late raids with controlled bot strategies; XP rates per role.
5. Boss gear progression and recipe completion for 1/2/6 eligible players receiving personal materials, including first-clear Long Châu, repeat clears, boss cooldowns and gold availability.
6. Item combination exploits, reset/refund/surplus point exploits, overlapping wave clocks, duplicate drops and cooldowns.
7. Potion sustain at 5s cooldown, hat regen/mana-shield synergy, multiple-player aura stacking, reflect recursion, spread/penetration vs bosses, and lifesteal that does not multiply with creep count or fan legs. Compare three choices per crafted slot once open coefficients are authored. PvP equipment normalization is still a proposal, not a benchmark assumption.

Report: DPS on single target, effective AoE DPS, survival time, hit probability, kill contribution, raid clear time, statue HP remaining, gold/XP per minute, levels at raid times, crafting completion time, PvP win rate/time-to-kill when PvP exists. Sample bots must differ (kiting, tanking, AoE farming), not only stationary attacks. Output machine-readable JSON/CSV and a short Markdown analysis. Do not silently retune confirmed mechanics to fit target win rates.

## 9. Difficulty feedback loop

- Maintain separate `NORMAL`, `DEV_FAST`, and later optional `HARD` mode configs **only if approved**; DEV_FAST is test-only, never changes production 180-second raid interval.
- Record losses: cause of statue damage, lane leak count, waves alive simultaneously, boss mechanics hit/missed, player deaths and disconnects. User can then tune to make failures learnable.
- Run regression simulations after each ability or equipment change, but always playtest actual movement/animation latency.

## M3B measured progression proposals — 2026-10-31

`packages/game-data/src/progression-data.ts` contains provisional Cái Bang base/growth, explicit rank variants, gates and surplus values. Base level1/rank1 attacks retain M3A damage/timing. Added growth is MP2 and defense0.15 per level; existing HP8/attack2 and Tiêu Diêu attack0.3/crit0.002/crit multiplier0.005 are derived as separate sources. Surplus contributes attack1.2/crit0.003/crit multiplier0.01 per point. No final balance approval is implied. Full tables/formula order are in `docs/M3B_IMPLEMENTATION.md`.

Actual48 legal mixed-build probes (eight seconds, three seeds, both A choices, levels1/6/15/30) produced these three-target aggregate DPS ranges:58.25–93.375,166.75–246.375,293.75–486.75,579.25–1083. Level30 Attack Power is111.5 or112.7 for14/15 surplus. Rank allocation uses the real point/gate validator; mana/cooldowns are active. Data: `artifacts/m3b-balance.json` and `docs/evidence/m3b/balance.json`. Immortal stationary targets give no economy/survival result, and the script does not model optimal human play, campaign difficulty, boss resistance, PvP, equipment or six-player performance. These results motivate later tuning; they do not authorize a rule change or retuning other schools.

## M3C2 Võ Đang tuning proposals — 2026-10-31

Configured mana/regen/CDR identity and shield/counter/formation ranks are in `packages/game-data/src/vo-dang.ts`; all remain provisional. The legal48-probe workload in `tools/m3c2-balance.ts` measured aggregate stationary three-target DPS ranges77.25–116.875 atLv1,293.375–361 atLv6,627.625–743.125 atLv15,916.25–1065 atLv30 (eight seconds,seeds42/1337/9001,both basics,mixed styles,optional ultimate). Costs/cooldowns/earned budgets remain real. See `artifacts/m3c2-balance.json`. This is not survival,economy,optimal-human,PvP,boss or campaign balance. Shield affordability/partial depletion and regen caps have deterministic tests; no other-school tuning changed.


## Wave boss feedback trial — 2026-11-03

Director-approved preview defaults are now runtime tuning: Tây needles288instead360; Mai pull285/s; Nam large finger charge23instead45ticks and dash8ticks with50/50ring/small finger; Bắc dragon flight5600/1.3ms and vortex250msquick tug then48/s pull with35%slow. These are trial values, not final balance approval. The768case deterministic20-second exposure report in `docs/evidence/wave-boss-feedback-runtime/balance.json` covers both normal branches, four schools, legal mixed builds, levels1/6/15/30, solo/six and three seeds. Statue protection and zero wave item drops hold throughout; bots lack human dodge/clone voting behavior. See `docs/WAVE_BOSS_FEEDBACK_RUNTIME.md`.


## Wave feedback v02 trial defaults — 2026-11-03

Supersedes corresponding v01values: Mai quick tug≈0.15s,5s Shift lock and0.8s dodge delay;200px frontal claws; Cáp Mô radius364.5; Nam burst1–5shots/0.16s, Liên Hoàn256ticks/turn and16ticks/volley,96sky impacts across the former32impact window. Thiên Hạ uses9independent radius72sources moving145px/s for3.9s, per-source/victim0.5s cadence and prior65damage. Damage numbers remain trial. New768exposure probes are at docs/evidence/wave-boss-feedback-v02-runtime/balance.json/csv; they do not model human dodge, clone guesses or votes and do not establish final balance. See the canonical cumulative ledger for unchanged gates, rewards and authority.


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

Nam Đế always releases five small fingers on a separate 90-tick repeat channel, including during main skills. Mục Hạ failure is now one arena-wide 80-base explosion followed by termination; no-guess timeout is 5 seconds after reveal. These user-requested changes supersede random1–5 and repeated clone explosions. Damage remains trial. Re-run the fixed-seed exposure probe matrix; bots do not model human dodging/clone guesses, so it cannot establish final balance. Results: `docs/evidence/wave-boss-feedback-v03-runtime/`.
## Creep upgrade trial — 2026-11-06

All 49 profiles, damage ratios, cadences, windups, DOT limits and signature geometry live in validated `game-data/creep-abilities.ts`. Production invasions stream for 60 seconds at 0.5 creeps/second/gate before existing player scaling; 2/3/4 gates produce solo 60/90/120, six-player 240/360/480. Per-creep XP/gold remain unchanged, so increased spawn volume also increases available rewards and must be assessed in playtest. No final numeric balance approval is claimed. Fixed-seed exposure and dense-stream measurements: `tools/creep-upgrade-balance.ts`, [CREEP_UPGRADE.md](docs/CREEP_UPGRADE.md).

## Director creep feedback r2 — 2026-11-06

North/south gates now require a clear footprint-wide corridor toward the statue, not merely an empty spawn point. Forward smash/slash/claw specials start at their caster and damage a forward capsule; heavy smash geometry increases 50%, other spreading skill radius/width and pattern extent double. Archer basic/special shot range is reduced 15%; melee basic reach doubles. Trúc Xà is fully ranged with poison+slow, Độc Chu keeps melee and web has a 25% one-second root, Sơn Viên stomps with 0.8s stun, Trúc Lâm Kiếm Khách gains 25% chance to reflect 50% of actual direct damage (no recursion), Mộc Linh becomes ranged. Sa Xà becomes ranged with slow; Xác Ướp basic cooldown is 36 ticks and has 25% root; Cự Nhân Sa Thạch basic punch stuns in AoE. Hải Xà becomes ranged and Độc thủy slows. Dung bạo radius is 144 (previously 72). Root blocks movement/dash/blink, permits attacks/casting, and respects expiry/control resistance. Numeric proc chances and durations are trial defaults. Prior r1 verification reports describe the old tuning; r2 evidence is stored separately.
## Creep feedback r3 tuning — 2026-11-06

Director approved larger frontal damage for Hoành trảm; trial coefficient2.4× (previous1.5×),192 reach and180° sector. Thổ Phỉ's target burst radius64 and Tà Tăng's target drain radius40 retain1.5× damage; drain retains40% actual-loss healing. Cương Thi actively lobs the retained88-radius/3-second poison field on a210-tick cooldown instead of leaving it only on death. Khô Lâu Kiếm Sĩ, Mông Cổ infantry and Ác Khuyển lose signatures. These targeted overrides do not retune per-creep XP/gold, stream density or school/item mechanics. Numerical exposure results are recorded separately in `docs/CREEP_FEEDBACK_R3.md`; no final difficulty claim follows from static bots.
