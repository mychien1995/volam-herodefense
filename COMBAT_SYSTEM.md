# Combat System Specification v1.0

## 1. Input contract (CONFIRMED)

- Arrow keys: movement (eight directions if simultaneous arrows enabled; proposed).
- `A`: one manually triggered basic attack. Repeated keydown handling should not bypass attack cooldown. **Auto-attack remains OPEN** and should not be added without approval.
- `Q`, `W`, `E`, `R`: four manually triggered active skills (pressed without click target).
- Mouse: interact with NPCs, choose skills, shop/craft, organize inventory, click menus; no mouse-targeting step for abilities.
- Player orientation uses last meaningful movement direction (PROPOSED), remains when standing still. Keyboard attack/skill action must be debounced and timestamped.

## 2. Basic attack hit validation

**Ranged**: at attack initiation, server finds nearest valid enemy in configured search radius, samples target **world position**, computes aim direction and spawns projectile at configured release frame. Projectile does **not** chase, seek or reorient. It travels at a fixed speed, can be dodged, expires at range/lifetime, and collides with entities/world according to collision policy. If no enemy found, proposed fallback fires along facing direction; ask/record before shipping as fixed behavior.

**Melee**: server creates a forward-facing sector/arc, identifies enemies in radius and angle. Select **one primary target** (closest to center-line, then distance); deal full main-hit damage to it, and reduced **cleave** to other enemies in the sector. All secondary enemy hits count as real hits for assists and Thiếu Lâm combo steps. A skill's AoE/cleave is separate from basic-attack cleave rules. Attack speed determines cooldown/animation cadence; no unlimited A spamming.

Default illustrative profiles (configurable, not confirmed numbers):

| Basic style | Secondary cleave multiplier | Other identity |
|---|---:|---|
| Cái Bang Bổng | 0.60 | broad impact |
| Thiên Sơn Phiến | 0.70 | rapid wide hits |
| Thiên Sơn Đao | 0.30 | focused burst |
| Võ Đang Quyền | 0.20 | precise |
| Võ Đang Kiếm | 0.35 | sword + occasional non-homing kiếm khí |
| Thiếu Lâm Quyền | 0.25 | slow heavy |
| Thiếu Lâm Đao | 0.55 | broad defensive fighter |

Start with general base 0.50 for unspecified melee and tune. Example 200 pre-defense damage → primary 200 and secondary 100 at 0.5, prior to target mitigation.

## 3. Combat attributes, proposed minimal set

**Required:** `maxHp`, `hp`, `attackPower`, `defense`, `attackSpeed`, `movementSpeed`, `attackRange`, `maxMana`, `mana`, `manaRegen`, `cooldownReduction`, `critChance`, `critDamageMultiplier`, `hpRegen` (last could be 0 for some schools). `statusResistance`, `element` are optional tags for later complexity. Avoid splitting attack into internal/external or elemental resistance initially.

**Stat layers:**

`baseSchool(level)` + `schoolInnatePassive(level)` + flat item bonuses + flat in-match modifiers → subtotal; apply percent modifiers in a defined deterministic order; temporary modifiers apply by declared stacking categories and expiration times.

For example (PROPOSED):

```
rawAttack = skillBase + attackPower * skillCoefficient
postDefense = rawAttack * (100 / (100 + max(0, targetDefense)))
postCrit = postDefense * (isCrit ? critDamageMultiplier : 1)
finalDamage = max(1, round(postCrit * otherModifiers))
```

All formulas and clamps are configurable. Keep damage order explicit and unit-tested, including defense reduction, penetration, crit, shield absorption and HP application. No negative/NaN values, no invalid division or indefinite buff stacking. Crit chance may be capped for balance; exact cap not user-confirmed.

## 4. School behaviors

- Cái Bang: natural Attack Power/Crit growth, fire effects; Chưởng ranged, Bổng melee and control.
- Thiên Sơn: mobility, Attack Speed/Crit growth; **Phiến and Đao both melee**.
- Võ Đang: large mana pool, regen/low cooldown; Mana Shield uses mana to absorb damage; Kiếm basic attacks have chance to fire a non-homing ranged **Kiếm Khí** at nearest enemy position at cast moment. Proc rate provisional.
- Thiếu Lâm: high HP/Defense, slow heavy hits and Phát Động combos; ally support via Đao.
- Element identity is thematic: Fire / Wind / Yin–Yang / Gold; v1 no elemental advantage chart.

## 5. Reusable status/effect library

Design effects as composable, data-driven operations with optional specialized handlers, never a giant school-specific `if` chain. Initial effects: direct damage, DOT/burn, stat buff/debuff, slow, stun, silence, disarm, pull, knockback, dash, shield, mana cost/refund, heal, area persistent effect, multiple hits, counter stance, conditional combo amplifier, temporary ally aura.

- **Stun:** blocks movement, attack, active skill inputs (except explicitly immune/unstoppable).
- **Silence:** blocks casting QWER, does **not** block `A` or movement.
- **Disarm:** blocks basic attack `A`, does **not** block movement or QWER.
- **Cầm Long Công:** directional multi-target **pull + silence + disarm**, movement still allowed; do **not** implement as stun. Enemy can resume movement immediately; control durations subject to resistance.
- **Slow:** define movement and/or attack speed slow separately, never ambiguous.
- **Boss control resistance:** statuses are reduced or immune by tag, e.g. boss ignores pull, has drastically reduced hard-disables; precise durations open, avoid invincible stun loops. Bosses still receive ability damage even when resistant to control.
- Deterministic stacking policy for repeat effects: e.g., strongest nonstacking slow, capped additive buffs, refreshed DOT. Explicit data properties, not implicit Phaser behavior.

## 6. Thiếu Lâm Phát Động combo — confirmed same-target rule

**Combo A:** `La Hán Quyền` → `Vi Đà Quyền` → `Đại Lực Kim Cương Chưởng`.
**Combo B:** `Toàn Phong Thoái` → `Hoành Tảo Cước` → `Vô Ảnh Cước`.

Algorithm (logical spec):

1. Track combo progress keyed by `(attackerEntityId, targetEntityId, comboId)` and game-server timestamp. NOT one global stage per attacker.
2. Every **successful damaging hit**, including a secondary/cleave hit, applies one appropriate step to each target **independently**. A miss does not progress on that target.
3. An expected next skill inside time window progresses target state. Out-of-order skill behavior is **OPEN**; prototype default resets that target's sequence (document it).
4. The final step gets an empowered multiplier **for targets at the correct preceding stage only**. If other targets get hit by its arc but lack complete sequence, they take ordinary finisher damage.
5. Window expiration cleans up combo records (PROPOSED six seconds). Normal attack A does not erase progress. Effects of unrelated active skills on combo progress are **OPEN** (prototype default no progression and no reset, unless explicitly designed otherwise).
6. If target dies/disconnects, cleanup combo state. Reset appropriately if skill loadout changes or player dies; no stale cross-instance entity IDs.

**Tests:** first hit connects A/B/C; second connects only B; finisher hits A/B; only B is empowered; if second is secondary cleave on B it counts; failed hit never advances; time expiration blocks empowerment; cannot transfer progress across different enemies.

## 7. Rank & surplus-point model (proposal constrained by confirmed rules)

- Exactly one earned point for levels 1..30, including initial level 1.
- Standard active ranks 1–4, ultimate ranks 1–3; ultimate unlock gates proposal levels 6/10/14. Max **one ultimate slot** proposed, no ultimate also valid.
- Skill assignments/ranks can be reset or swapped freely **in arena only**, not dungeon/PvP.
- Surplus points convert automatically to current school's configured attribute package **only when all four equipped slots contain max-ranked skills**. Points must be allocated to currently equipped skills first and total spent + surplus = earned points. Reset immediately removes former bonuses and recomputes. A 4-normal build at rank 4 uses 16 points; 3-normal+ultimate uses 15; this is allowed and testable.

## 8. Server authority and security

- Client sends inputs (`move`, `basicAttack`, `castSkill(slot)`, `interact`, `changeLoadout`, `buy`, `craft`) with sequence/time. Client **never** sends damage amounts, XP, gold, item ID awarded, player position truth, or RNG outcomes.
- Server validates stamina/mana, cooldown, ability unlock, equipped skill, rank, location, line-of-sight/range, collision, cooldown and input rate. Server owns RNG and event log.
- Entity types and combat components independent of rendering engine; integrate with Phaser only for visuals, sound, local UI and client-side prediction when proven necessary.
- For active skills triggered with QWER, direction from facing/last input and modes from data; no pointer target.
