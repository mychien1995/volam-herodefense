# M3B rules and implementation proposals — 2026-10-31

Reviewed before coding: AGENTS, ROADMAP, DECISIONS, GAME_DESIGN, CONTENT_DATA, COMBAT_SYSTEM, BALANCING, UI_UX_SPEC, ACCEPTANCE_TESTS, OPEN_QUESTIONS, architecture, art standards and the M3A implementation. M3A already supplies all ten mechanics, generated icons/VFX, per-ability cooldowns, zone cleanup, fixed reward sharing, linear 60 EXP/level and a development loadout. Reuse these systems.

## Confirmed

Level 1–30; exactly one earned point per level including level 1; no persistence. School growth/passive are automatic. Four active slots can mix styles, independently of A. Only the player's school is legal. Build changes/respec are free and arena-only; death/defeat prohibit changes. Surplus applies only when all four equipped skills are max-ranked, and must be recalculated rather than accumulated. No other-school combat or new art in M3B.

## Configurable proposals adopted for this milestone

- Standard rank gates 1/3/5/7 (cap4); ultimate gates6/10/14 (cap3); at most one ultimate, in any Q/W/E/R slot. No documented R-only restriction exists. No duplicate active assignments.
- New Cái Bang heroes have four empty slots, zero learned ranks and one available point. Equipping is free; rank0 is visible but cannot cast. Upgrading an equipped skill costs one point. Allocations belong to the current four-skill build: moving a skill preserves its rank; removing it refunds its ranks. No hidden bank of unequipped ranks. Reset refunds all ranks while retaining slot choices, then permits reassignment. This follows COMBAT_SYSTEM's current-equipped-skills-first model.
- Preserve the existing cumulative EXP formula: level = min(30, floor(EXP/60)+1). Clamp EXP at1740, the threshold for level30; excess EXP grants no power. HUD shows within-level EXP, or MAX at30.
- **Cooldown policy, recorded before implementation:** cooldowns follow ability IDs through slot moves, unequip/re-equip, rank upgrades and resets. Existing expiry never shortens. A has a shared expiry across both styles. Zone transfers preserve remaining durations. Build changes cancel owned temporary actions/projectiles/self buffs, preserve hostile statuses and never refill HP/MP. Level growth alone adds newly gained HP/MP capacity while alive; it cannot revive a dead hero.
- Each rank provides explicit ability values; no generic damage-only rank multiplier. Rank1 is byte-for-byte equivalent to M3A mechanics. Damage/control/range/buff/burn improvements remain numeric tuning proposals. Cầm Long always deals zero damage and never stuns or stops movement.
- Cái Bang base stats preserve the M3A level1 baseline: HP160, MP100, attack28, defense0, attack-speed multiplier1, speed160, crit10%/1.5x, MP regen6/s, CDR0. Automatic growth: HP8, MP2, attack2, defense0.15 per level after1. Tiêu Diêu adds attack0.3, crit0.002 and crit multiplier0.005 per level after1. Surplus adds attack1.2, crit0.003 and crit multiplier0.01 per point. Coefficients and clamps are configurable, not final approved balance.
- Stat sources are separate flat layers: school base + level growth + innate + surplus + reserved zero equipment + temporary effects, then clamps. Skill damage keeps M3A base damage plus attack above the school baseline. Attack speed affects A cadence, defense mitigates received damage, movement/MP regen/CDR use their effective values. No equipment implementation is added.
- Production always uses point-validated progression. Historical M1/M3A regression fixtures may explicitly enable non-production `VOLAM_DEV_LEGACY_SKILLS=1`; the old arbitrary-rank1 sandbox additionally requires `VOLAM_DEV_SKILLS=1`. Neither is accepted from clients, and production ignores both. Normal M3B testing requires neither flag.

## Authority

Requests contain only desired IDs/operation, monotonic sequence and expected build revision. The server validates school, zone, phase, life, point budget, gates, duplicates and ultimate count before one atomic commit. Stale revisions/replayed requests cannot spend/refund twice. Level rewards use the same fixed combat reward pool; other players' builds never participate in a player's point/stat calculation.

## Status

Implemented and verified. The final pipeline passed174 unit/network tests and16 browser scenarios; exact commands, formulas, screenshots and limits are recorded in docs/M3B_IMPLEMENTATION.md and docs/evidence/m3b/. Numeric defaults remain proposals. Visual approval is separate from functional verification. Stop after M3B.
