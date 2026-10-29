# Balancing Plan v1.0 — hard but fair

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
- Intended loop: between raids, choose XP-focused dungeon vs fixed-boss equipment material vs shopping/crafting. Boss loot is scarce (one rolled item per kill), which can produce farming time pressure.
- Monitor a party's level, XP/min, gold/min, item progress at 15/30/45/60 minutes. Starting illustrative *targets*, not commitments: 1–8 by ~15min, 9–16 by ~30min, 17–24 by ~45min, 25–30 by ~60min.
- Proposed base shop item upgrade cap 5; crafting deterministic for v1. Never silently make loot guaranteed to each party member; item roll is shared.

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
5. Boss gear progression and time to finish a recipe with 1 random item per kill rolled among 1/2/6 eligible players.
6. Item combination exploits, reset/refund/surplus point exploits, overlapping wave clocks, duplicate drops and cooldowns.

Report: DPS on single target, effective AoE DPS, survival time, hit probability, kill contribution, raid clear time, statue HP remaining, gold/XP per minute, levels at raid times, crafting completion time, PvP win rate/time-to-kill when PvP exists. Sample bots must differ (kiting, tanking, AoE farming), not only stationary attacks. Output machine-readable JSON/CSV and a short Markdown analysis. Do not silently retune confirmed mechanics to fit target win rates.

## 9. Difficulty feedback loop

- Maintain separate `NORMAL`, `DEV_FAST`, and later optional `HARD` mode configs **only if approved**; DEV_FAST is test-only, never changes production 180-second raid interval.
- Record losses: cause of statue damage, lane leak count, waves alive simultaneously, boss mechanics hit/missed, player deaths and disconnects. User can then tune to make failures learnable.
- Run regression simulations after each ability or equipment change, but always playtest actual movement/animation latency.
