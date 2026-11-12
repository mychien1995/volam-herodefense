## Thiên Hạ Vô Cẩu · 2026-11-12

Action Thiên Hạ Vô Cẩu cung cấp giảm sát thương 80% qua cùng luật giảm sát thương mạnh nhất với các chiêu phòng thủ khác. Cú đập cuối hồi 5% HP tối đa cho bản thân và phát sự kiện hồi máu theo lượng thực hồi, kể cả khi không có mục tiêu trong tầm. Stun, chết và rời map kết thúc action theo luật hiện hành.

## Tầm Bổng và hồi chiêu đánh thường M3D · 2026-11-12

Cái Bang Bổng đánh trong tầm 105 đơn vị với bốn thức và nhịp 8 tick mỗi thức. Bổng sơn đỏ khắc rồng vàng dài hơn 50%, rộng hơn 10%, thể hiện ở tư thế đứng, đi và đánh theo bốn hướng. Vệt đòn theo tầm mới. Võ Đang Quyền, Võ Đang Kiếm và Thiếu Lâm Quyền có hồi chiêu A bằng 0. Thiếu Lâm Quyền giữ chuỗi bốn thức và cửa sổ 60 tick. Nhịp hiện hành của Cái Bang Bổng, Thiên Sơn Phiến, Thiên Sơn Đao và Cái Bang Chưởng tiếp tục áp dụng. Mỗi lần nhấn A gửi một lệnh và server xử lý tối đa một đòn của mỗi người trong một tick.

## Tầm Tru Tà · 2026-11-09

Server dùng bán kính 190/194/198/202 ở bậc 1–4. Mục tiêu trúng khi tâm nằm trong góc đánh, mép thân chạm vùng quét và có đường nhìn. Sát thương lan và làm chậm dùng quy tắc Tru Tà hiện hành. Client căn mép vệt quét theo bán kính sự kiện cast.

## Tầm La Hán và nhịp Phát Động · 2026-11-09

La Hán Quyền có tầm 140 đơn vị theo cung đánh trước mặt. Đại Lực ưu tiên địch đã trúng cả Q và W nếu địch còn ở trong tầm, trong cung trước mặt và có đường bắn. Hướng chưởng chốt khi bấm E. Ở thế Cước, Q/W đang hồi chiêu giữ nguyên lệnh E đã đệm. Ca Diệp còn 2 tick hồi thế sau khi phóng ụ đất. Vô Ảnh vẫn chờ sát thương thật trên cùng mục tiêu để Phát Động.

## Phát Động B đá lướt · 2026-11-09

E sớm vẫn được đệm đến khi Ca Diệp thật sự chạm hoặc hết hành trình. Nếu mục tiêu có đủ hai bước và nằm trên đường đá, server lướt nhân vật, quét trúng địch một lần và áp dụng hệ số riêng cho địch đủ dấu. Vô Ảnh thường giữ nhân vật tại chỗ và phóng ba đạn. La Hán v02 giữ một hit gameplay dưới ba nhịp hình. [Chi tiết](docs/SHAOLIN_QUYEN_REWORK.md).

## Đại Lực Kim Cương Chưởng v05 · 2026-11-09

Đại Lực sử dụng projectile server, với một lần sát thương tối đa trên mỗi mục tiêu mỗi lượt thi triển. Vi Đà kiểm tra cung trước mặt và đường nhìn từ nhân vật, đồng thời quét vùng trúng từ mốc 42 đến tâm nổ 189. Các mô tả cũ về cung cận chiến Đại Lực hoặc chưởng bay chỉ để trình diễn được thay thế. [Chi tiết](docs/DIAMOND_PALM_V05.md).

## Renovation v7 authoritative override — 2026-11-06

Hàng Long Hỏa Vũ maximum targeting/fallback distance is reduced30% at every rank (308/329/350). Forward flight reaches the captured endpoint without the former loop-radius overshoot. During `dragon_coil`, ground XY stays fixed at that endpoint; authored body poses perform the one wrap. Rise/dive remain above that same point. Server clocks, single landing AoE, damage, costs and cancellation are unchanged. The retained serialized `orbitTicks` field now times the coil. Phá Giáp VFX are anchored to the drawn staff contact and cannot move damage/hit geometry.

## Renovation v5 authoritative changes — 2026-11-06

Hàng Long locks an eligible forward enemy position at accepted cast, then follows24/36/15/12tick forward/orbit/rise/dive phases. Only its final112px landing AoE damages once per target; it never homes or damages along the flight. Death/travel clears it. Seven Thất Tinh strokes use3tick spacing, base/AP damage scaled4/7 from the prior four-hit attack; integer rounding remains per hit. Thái Cực confinement captures only creeps/bosses, including resistant bosses, clips scripted dashes as well as normal movement, and ends on expiry/owner death. Allies pass freely. These are explicit director changes; all other renovation-v5 adjustments are presentation. See `DECISIONS.md`.

## Campaign balance và thử lại boss — 2026-11-06

Mỗi lượt boss có ba lần hồi sinh/người sau5s, lần chết thứ tư quan chiến. Toàn đội hết lượt mở ballot30s, cần ceil(N/2) đồng ý. Không reset cooldown khi hồi sinh. Long Châu tăng HP/MP/công/thủ nền; không đổi luật skill/rank/QTE hay Phát Động. [Quy tắc, cấu hình và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Fixed skill progression override — 2026-11-04

The server validates school/branch confirmation, slot upgrades, stance changes, rank gates, available points and build revision. Players spend their points with the mouse from Q/W/E/R/T. T unlocks at character level 6, then advances at 12/18/24. Q/W/E/R use 1/3/5/7. Thiếu Lâm Quyền retains its same-target combos. F waits for active casts and a buffered Vô Ảnh cast to resolve, preserving cooldowns and running effects.


## M3D approved combat and action lifecycle — 2026-11-03

Newest M3D feedback overrides historical reach/timing statements below. Every A is a fresh press; monk A has four stages, minimum6tick cadence, finisher30tick cooldown;60tick inactivity begins30tick cooldown. Shift has2 charges with sequential240tick/8s recharge. Võ Đang basic knockback probability0.1.

Toàn Phong and Ca Diệp are straight piercing projectiles with per-target/cast dedup; Ca Diệp's caster remains stationary during windup9/recovery6tick and all targets on the earth path take damage+36tick stun, subject to existing boss resistance. Vô Ảnh's one-foot/six-foot branch uses real same-attacker/same-target B progress. Buffer at most one early finisher while the actual step2 action/projectile is unresolved, preserving the input facing; consume mana/cooldown once at execution, clear on A/other skill/Shift, stun/silence,death/travel/respec/disconnect. It never fabricates hits. Full branch lanes[-18,0,18], release ticks[0,3,6,18,21,24], projectile speed390/range260. Same-target empowerment remains checked at hit and cached per target/cast.

Vi Đà offset189. Như Lai's Sanskrit field damages on first entry once/target/cast, not standing or repeated re-entry. Owner-following Kháng Long burn remains separate. Hồng Liệt artillery schedules continue independently of A1/A2 and cancel through encounter cleanup. Chu wine12s grants70% defense penetration against Chu only (defense180), strongest penetration rather than additive stacking; no healing or immunity. Reflection still returns actual HP loss once. Càn Khôn pull120px/s blocks Shift without spending a charge. All effects are server-owned; atlas frames/preview timings never authorize hits or resource changes.

## M3D feedback override — 2026-11-01

Shift is a separate zero-mana, zero-damage, non-invulnerable mobility command: two charges, sequential 180-tick recharge at 30Hz. Server owns direction from current movement/facing, terrain-safe swept motion, debt and lifecycle; travel converts remaining debt between zone clocks. Dead heroes retain/recharge debt. Stun or another active action rejects a dash without consuming a charge.

Võ Đang basics use a 6-tick animation cadence and no separate recovery cooldown; every attack requires a fresh A press. Thiếu Lâm Quyền emits four authoritative presentation stages. Vi Đà range is measured from a 42-unit forward ground origin while frontal eligibility and line-of-sight remain caster-relative, preserving close same-target Phát Động hits.

The blink sword flies straight at 180 units/s to rank1 range540, pierces each enemy once and then lingers damage-free for45 ticks. Valid same-slot recast bypasses its existing cooldown/mana cost; destination, terrain path and confinement are checked on server. Unsafe recast retains the sword. Cooldown begins on initial cast; cleanup uses the existing death/travel/build/disconnect path. Delayed arcs capture heading/offense, strike once after windup and may retain an explicit active/recovery duration. The rank4 owner-following fire area updates position every simulation tick and damages on its own fixed pulse schedule.

# Combat System Specification v1.0

## Inventory combat design — 2026-11-02 (not implemented by this documentation update)

See [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) for the confirmed inventory design and open formulas. Basics add weapon damage, armor defense/HP, hat HP/MP regen and boot speed/minor crit. Crafted weapon branches are A spread, lifesteal based on one A's emitted damage (not creep count), and **A armor penetration replacing stun**. Exact penetration/stacking and lifesteal crit/mitigation/multi-hit timing remain open; existing skill penetration does not imply that equipment is implemented.

Crafted boots add one **Z** item action independently of QWER: **Thanh Tâm** clears existing slow/poison/burn (replacing 10% healing), forward collision-respecting blink, or facing-directed straight slow/poison needle without auto-targeting. No implicit stun cleanse, immunity or boss-mechanic removal. Potions have **5s use cooldown**; shared/per-type policy is open. Server owns all effects, cooldowns and validation; equipment changes must not reset cooldown debt or duplicate resources/stats. Numeric armor reflect/aura behavior and Long Châu stat growth require explicit formulas before implementation. PvP excluding equipment/potions remains proposed, including the treatment of Z and Long Châu.

## Current M3C3 feedback override — 2026-10-31

The approved feedback trial supersedes historical behavior below. Basic chains advance once after server A eligibility/cadence checks; primary/secondary hits never advance them. Skill/data-defined minimum intervals bound Attack Speed; no second basic animation lock is added. Fan A uses a straight outbound leg then a straight return toward the owner's position sampled at turnaround, with independent hit deduplication and no further tracking. New travelling palms refund once per cast on a confirmed hit; multi-projectile casts share refund state. Radial bursts capture each burst's origin and eight fixed directions.

Moving dash ticks grant direct-hit immunity only; periodic damage bypasses it and cannot trigger counters. Spin mitigation is scoped to the active action, composes strongest-only with existing guard, and retains the 85% global cap. Chiết Mai grants a strongest-only cooldown buff within the existing total CDR cap; it never rewrites existing cooldown debt. Toggle shields cost no activation mana in this numeric trial, transfer post-mitigation damage to finite mana, apply unaffordable remainder to HP and never refill resources when toggled. One simulation tick bounds toggle input processing.

Confinement samples entry every tick separately from damage pulses, clips movement/knockback at active area boundaries and preserves terrain, attacks and movement inside. Forced-movement-immune adapters and interrupt resistance bypass confinement; no boss implementation is introduced. Death/travel/respec/disconnect/defeat cancel owned projectiles, actions, areas, toggle shield and basic chains. Same-target Thiếu Lâm Phát Động remains unchanged. See `docs/M3C3_FEEDBACK_IMPLEMENTATION.md` for tuning and evidence.

## M3C3 reusable combos and ally protection — 2026-10-31

Target sequences use attacker+target+chain IDs and simulation expiry. Cleave counts; misses do not. A/unrelated actives preserve progress; an invalid same-chain order clears that target. Vô Ảnh consumes once per target/cast and caches eligibility across its deterministic six-hit schedule. Delayed arcs capture heading/offense and validate current target position/terrain after windup. Strongest nonstacking damage reduction applies after armor/crit and before mana shield/HP,cap85%. Flat defense buffs,owner-following ally auras and bounded healing are shared effects. Living same-zone heroes only; never statue repair,enemy healing or resurrection. New stun/hostile displacement is resisted during Kim Cang; damage remains possible. Death/travel/respec/disconnect/defeat clean up sequences and owned ally protection. Details/defaults:`docs/M3C3_IMPLEMENTATION.md`.


## M3C1 shared movement / wind extensions — 2026-10-31

Optional multi-hit half-angle captures cast facing while origin follows the owner. Each scheduled pulse tests current target position/line of sight once, independently of network or animation events; radial spins omit the half-angle. Zero-damage dashes provide collision-validated mobility without inventing damage/stun. Dash target IDs deduplicate damage along the swept path. Temporary movement/attack-speed buffs use strongest nonstacking magnitudes in M3B's derived stat sources and expire by simulation tick.

Per-strike defense penetration multiplies remaining nonnegative defense by `(1 - penetration)` before normal mitigation/crit/rounding. A slowed-target bonus checks the current slow at each hit, not only at cast. A counter status evades one incoming enemy hit, consumes the window before retaliation, and only retaliates against a living attacker in range with clear terrain. Death/travel/respec cancel the same owned actions/statuses as M3A/M3B. These reusable effects introduce no client authority, equipment requirement or other-school combat.

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
| Thiếu Lâm Đao | — | Đao khí tầm 320, hồi chiêu cơ bản 18 tick, sàn 5 tick theo tốc đánh. Nhắm địch hợp lệ gần nhất lúc ra đòn. Bay theo hướng mặt nếu tầm đánh trống. |

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
**Combo B:** `Toàn Phong Thoái` → `Ca Diệp Thoái` (`hoanh_tao_cuoc`) → `Vô Ảnh Cước`.

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

## M3B implemented progression policy — 2026-10-31

The currently selected rank gates/caps above remain configurable proposals. Cái Bang normal rooms now start with four empty slots and one available point; rank0 cannot cast. A is independently available. Learning/upgrading an equipped skill costs one point. Moving it to another slot retains rank, while removing it refunds ranks; reset refunds every allocation and retains assignments at rank0. At most one optional ultimate, in any slot, and no duplicates. Other-school active defaults are not granted in normal rooms.

Point accounting is `earned = allocated + available + surplus`, with earned=min(level,30). Surplus only activates when all four nonempty skills are max-ranked; four normals consume16 at cap, or three normals+ultimate15. Build changes and level gains recalculate bonuses from current state. EXP retains the existing60-per-level curve and caps at1740.

Persistent cooldown debt is keyed by ability ID and is never shortened by moving, unequipping/re-equipping, upgrading or resetting. A uses a shared cooldown across both styles. Zone transfer preserves remaining durations. Build changes are living-arena-only, cancel owned temporary actions/projectiles/self buffs, preserve hostile control and do not heal/refill HP/MP. Death and defeat retain their existing authoritative lifecycle.

`game-data/progression-data.ts` defines explicit rank variants: damage, blast/burn, pull/knockback, slow/armor-break/stun durations, buff strength, reach and MP/cooldown improvements as appropriate. Rank1 preserves M3A. Raw damage keeps the configured rank base plus Attack Power above the school baseline, then the existing defense/crit pipeline. School base, level, innate, surplus, temporary and reserved zero-equipment sources are separate. See `docs/M3B_IMPLEMENTATION.md` for exact proposals, commands and measured limits. No other-school mechanics or equipment were added.

## M3C2 reusable Yin–Yang effects — 2026-10-31

Shared deterministic core now supports timed resource shields (post-armor fraction bounded by actual mana),fixed-position periodic areas with authoritative target checks/expiry,one-per-cast successful-hit mana refunds,Attack Power reduction and independent Attack Speed slows. Strongest statuses do not add; same source refreshes. Projectile procs/spread reuse fixed captured trajectories and per-projectile target deduplication. Counter metadata distinguishes evasion from taking the hit; reactive strikes cannot recurse and lethal hits prevent retaliation. Normal regen/refunds cap at max mana. Death/travel/respec/disconnect/defeat cancel owned temporary effects. Details/formulas/provisional data and tests are in `docs/M3C2_IMPLEMENTATION.md`.


## Approved skill mechanism revision — 2026-11-01

- Liên Hoa Phiến creates a stationary, non-damaging owner-only field at authoritative cast feet. Check center-to-feet distance <= radius on every damage/regeneration operation. While inside, all damage including DoT is blocked and the strongest matching field adds its configured max-HP fraction per second to normal regeneration. Leaving removes both immediately; returning restores them while the field remains. Allies receive neither. Recast replaces the owner's field rather than stacking it. Expiry, owner death/removal or zone transfer removes it.
- Phong Ảnh Hoán Vị snapshots the negative of facing for the server dash vector. It shares Phi Ảnh Trảm's unobstructed distance (150/158/166/174 px at ranks 1–4), retaining its own speed, swept collision, moving-tick-only immunity and counter. Facing is preserved during the retreat. Phi Ảnh Trảm stays forward.
- Vạn Kiếm Quy Tông retains server channel cancellation but replaces its short melee sequence with a configurable150tick/5s channel: 13 bursts at0/12/.../144ticks, eight straight piercing swords each. Original damage54/rank+9, mana and cooldown remain. Projectiles use captured initial vectors and never track. Existing attack-power scaling and enemy mitigation apply.
- Tọa Sát Bác Đồ uses a guard status for150ticks. Its70% reduction participates in the existing strongest-reduction rule. Accumulate exact actual HP decrement after defense, reduction and mana absorption, capped by HP available. At expiry or accumulated loss strictly greater than20% of current maximum HP, consume the status before emitting one radial `counter_release` event and resolving damage. Exactly20% does not trigger early. A small machine-precision tolerance prevents binary floating point from treating mathematical equality as greater. Reflection uses the stored sum without caster growth/crit, another70% reduction or integer minimum/rounding; target defenses/shields remain applicable. Reactive damage does not recursively trigger counters. Dead/cancelled/removed/travelling owners do not release. Active guard inputs cannot extend the5s window or erase stored loss.

These rules live in deterministic `game-core`; client animation frames/contact markers have no authority. Presentation adapts approved cels to accepted casts, actual areas/projectiles/status ticks and confirmed hit/release events. Bất Động's four-second afterglow is cosmetic: its existing heal remains one instant pulse. Như Lai retains one real projectile and existing ally-defense status; seven authored palm echoes add no hits. Đại Lực retains its authoritative delayed arc; the flying hand adds no projectile/hit. Thất Tinh retains four real hits under seven visual swords.

## Tây Độc authoritative arena encounter

See `docs/TAY_DOC_INTEGRATION.md` for the implemented feedback03 kit and trial tuning. The boss and six destructible pillars are controlled hostile actors in the existing arena. Hits, swept shots, circular/arc geometry, poison ticks, mark settlement and phases run in deterministic game-core. Curse’s25%maximum HP loss is a narrowly scoped unavoidable-HP-loss path through existing death/event handling; normal damage retains its existing mitigation/evasion/crit behavior. Phase2 starts once below50%, retains released hazards and uses only its new rotation. No statue targeting, item drops or dungeon respawn is added.


## Tây Độc authoritative arena encounter

See `docs/TAY_DOC_INTEGRATION.md` for the implemented feedback03 kit and trial tuning. The boss and six destructible pillars are controlled hostile actors in the existing arena. Hits, swept shots, circular/arc geometry, poison ticks, mark settlement and phases run in deterministic game-core. Curse’s25%maximum HP loss is a narrowly scoped unavoidable-HP-loss path through existing death/event handling; normal damage retains its existing mitigation/evasion/crit behavior. Phase2 starts once below50%, retains released hazards and uses only its new rotation. No statue targeting, item drops or dungeon respawn is added.


## Wave boss feedback override — 2026-11-03

All four main wave bosses share the Đông Tà encounter field and unlimited wipe retry policy. Server `dash_lock` blocks dash without spending charges during Mai’s pull and Bắc Cái’s vortex while preserving walking. Đông Tà’s normal Lạc Anh is a seeded polygon sword dash with swept once-per-target hits; its separate active +/X attack remains. Mai immediately fires Ma Ảnh after the stronger pull. Tây needle speed is80%of its prior value. Nam’s big finger charge is23ticks versus45, with an8-tick behind-target dash followed by ring or small finger. Bắc Cái centers the clone formation and dragon release, uses faster detached dragon travel, guarantees dogs as the first available special, and uses quick tug then walking-escapable pull+slow. Exact tuning, VFX composition and acceptance limits: `docs/WAVE_BOSS_FEEDBACK_RUNTIME.md`.


## Wave boss feedback v02 override — 2026-11-03

This supersedes the corresponding v01 entries above. Server chooses1–5gold shots, re-aims each release at the selected living player's current position, then keeps velocity fixed. Liên Hoàn retains4directions/16volleys at1.5×rotation. Nam center dash precedes96fixed warned sky impacts within the court. Mai's quick tug ends before a24tick dodge window, with150tick dash lock from tug start. Bắc Cái and8clones independently wander while spinning for3.9s after0.85s windup; each radius72damage source has per-victim0.5s cadence, using retained65trial damage. There is no pull/slow/stun/slam/dash lock in Thiên Hạ. Source seed remains server-only; public snapshots contain coordinates only. Full feedback/timing/raster contract: docs/WAVE_BOSS_FEEDBACK_V02_RUNTIME.md.


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

This canonical override supersedes V02 random burst counts and the old repeated wrong-clone punishment. Đông Tà, Tây Độc and Nam Đế each have twenty original Vietnamese combat lines, selected server-side from seeded shuffled decks without repetition until the pool is exhausted. First line after 6 seconds of combat, then every 8–10 seconds when an action gap permits; overhead chat lasts 4 seconds in its own lane alongside the retained skill shouts. Bắc Cái keeps his separate preference/dialogue mechanic and stays silent during Mục Hạ Vô Nhân.

Mục Hạ Vô Nhân keeps its approved split and five pair swaps. At reveal, players have exactly 5 seconds to land a valid guess. A clone hit causes one arena-wide explosion and ends the skill in that simulation tick; all simultaneous clone/real hits settle as one failure, regardless of target iteration order. A real-body-only hit ends it without explosion and cancels the deadline, including on the deadline tick. No valid hit by the deadline causes one explosion and immediate cleanup. No extra explosions after cleanup.

Tiểu Nhất Dương Chỉ always releases five straight golden projectiles, spaced 0.16 seconds, re-aiming at the selected player's current position at each release. Each shot flies straight afterward. Its independent server channel can run with all main skills, QTE and movement without replacing their cast or clocks. Trial repeat interval is 90 ticks / 3 seconds, first windup remains 17 ticks; repeated starts cannot duplicate an active burst. Death, no living players, wipe and encounter cleanup cancel pending shots. The main special animation retains priority while concurrent native gold projectiles render normally.

Approved V01/V02 PNGs, JSONs and preview source remain byte-exact. This update changes runtime behavior and text, not the frozen preview. The common arenas, rewards, dungeon life ledgers, controls and separate inventory-v2 scope remain as in V02. Matching protocol 29 services and a new room are required. Current implementation/validation: `docs/WAVE_BOSS_FEEDBACK_V03_RUNTIME.md`.
## Creep combat override — 2026-11-06

Data-driven normal attacks, signatures and death effects for all 44 regular creep identities now use server-owned windups, captured aim, swept collision, frontal geometry, cooldowns and cleanup. Five boss-support profiles preserve encounter steering. Three nearby owners may prepare specials; strongest-only slow and one strongest tick per poison/burn element bound pack pressure. Statue receives normal strikes only. Raster warnings and animations never authorize hits. Details and trial values: [CREEP_UPGRADE.md](docs/CREEP_UPGRADE.md).

## Director creep feedback r2 — 2026-11-06

North/south gates now require a clear footprint-wide corridor toward the statue, not merely an empty spawn point. Forward smash/slash/claw specials start at their caster and damage a forward capsule; heavy smash geometry increases 50%, other spreading skill radius/width and pattern extent double. Archer basic/special shot range is reduced 15%; melee basic reach doubles. Trúc Xà is fully ranged with poison+slow, Độc Chu keeps melee and web has a 25% one-second root, Sơn Viên stomps with 0.8s stun, Trúc Lâm Kiếm Khách gains 25% chance to reflect 50% of actual direct damage (no recursion), Mộc Linh becomes ranged. Sa Xà becomes ranged with slow; Xác Ướp basic cooldown is 36 ticks and has 25% root; Cự Nhân Sa Thạch basic punch stuns in AoE. Hải Xà becomes ranged and Độc thủy slows. Dung bạo radius is 144 (previously 72). Root blocks movement/dash/blink, permits attacks/casting, and respects expiry/control resistance. Numeric proc chances and durations are trial defaults. Prior r1 verification reports describe the old tuning; r2 evidence is stored separately.
## Creep feedback r3 — 2026-11-06

Selected specials now distinguish captured target areas, captured180° frontal sectors and ground-target poison lobs. A ground lob ignores hero collision during its zero-damage flight and lands at its captured point, or at swept terrain contact. Visual linger can exceed a one-tick damage window. Tà Tăng heals40% of actual HP drained; Hoành trảm's trial coefficient is2.4×. Three requested units have no extra signatures. Generic crimson warning removal does not remove dash/status/trail mechanics. See `docs/CREEP_FEEDBACK_R3.md` for exact profiles and regression evidence.

## Thi độc direct target field — 2026-11-06

Latest r4 override: Thi độc schedules its 88-radius poison area at the server-captured target feet, activates after 24 ticks and lasts 90 ticks; no delivery projectile or caster-foot/death pool. Caster movement cannot relocate it. Generic purple pre-cast circles are removed from creep presentation, while real released effects and windup timing remain. See `docs/CREEP_FEEDBACK_R4.md`.

## Creep feedback r5 — 2026-11-06

Sơn Tặc Đao uses normal attacks only. Its r3 Hoành trảm sector is no longer active content. Shared contact rasters are no longer drawn at creep attack/cast origins; actual hit feedback remains at the victim. Stomp/charge/control mechanics of other creeps retain server timing, damage and statuses without generic caster burst stamps. See `docs/CREEP_FEEDBACK_R5.md`.
