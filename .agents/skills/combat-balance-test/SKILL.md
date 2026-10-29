---
name: combat-balance-test
description: Run deterministic headless simulation and analyze Võ Lâm Hero Defense school, skill, dungeon, level, statue raid and item balance. Use when a combat rule, school passive, boss, XP economy or crafting value changes and measured evidence is needed.
---

# Combat-balance evaluation workflow

1. Read `BALANCING.md`, `COMBAT_SYSTEM.md`, `CONTENT_DATA.md`, `DECISIONS.md` and any requested balance hypothesis.
2. Discover `game-core` and the simulator's real entry point; if not implemented, state the missing prerequisite rather than fabricating metrics.
3. Run fixed-seed scenarios with multiple seeds; include levels 1, 6, 15, 30 when relevant; test all four schools, both normal attack styles, legal mixed 4-slot builds, and PvE/PvP distinctions. Keep hero equipment, enemy composition, player count and AI strategy controlled.
4. Cover Phát Động target-specific cleaved hits, boss stun resistance, non-homing projectile dodge, mana shield sustain, attack speed + crit synergy, solo versus 6-player enemy scaling, XP pool splitting, and material drops / loot roll ownership.
5. Record output CSV/JSON in `artifacts/` or a documented ignored reports path, plus a human-readable comparison: damage per second, effective AoE, survival, XP and gold per minute, statue HP, boss clear time, XP eligibility, items per eligible player and recipe completion time.
6. Distinguish actual numerical runs from hypothetical design suggestions. Highlight runaway combinations and propose small config adjustments; **do not edit canonical approved mechanics**, school names, drop count or raid interval without approval.
7. Run unit/regression tests after tuning. Explain confidence limits, especially when bots fail to model human movement/dodge.
