# Acceptance Tests — Rule-to-test traceability

These are behavioral requirements, not already implemented tests. Codex should convert them to automated tests during the matching roadmap milestone and preserve them as regressions.

## A. Lobby and rooms

- Given no account, when player enters only a nickname and creates room, then a temporary independent match exists and another player joins via room identifier.
- Given six players in room, when seventh attempts join, then server denies admission without corrupting state.
- Given players in different rooms, when one attacks, then no state/rewards leak to the other room.

## B. Controls and attacks

- Given arrow input, when moving diagonally, then server-authoritative position and last-facing direction are valid and both clients observe same position after reconciliation.
- Given ranged basic attack against nearest foe, when foe moves perpendicular after shot launched, then **projectile continues straight and can miss**; it never turns to chase.
- Given melee primary and two secondary enemies inside forward arc, when `A` attack lands, then primary receives full damage and each secondary receives smaller cleave per configured multipliers; enemies behind player are unaffected.
- Given cooldown still active, when `A` or a skill key is spammed, then no extra attack occurs.
- Given mouse cursor on enemy, when pressing QWER, then no click-based targeting is required; skill uses configured direction/area/self behavior.

## C. Skills and levels

- Given level 1, then player has earned exactly one skill point. At level 15 exactly fifteen; at 30 thirty.
- Given a school and new level, then automatic base stat and school innate passive growth are applied without consuming points.
- Given four equipped skills all at max, then unspent earned points convert to the school's stat package; after respec, former stat modifiers are removed before new bonuses applied.
- Given player inside dungeon/PvP, then respec/change of active skills/normal attack is server-rejected; same operation in arena allowed.
- Given skills from Chưởng and Bổng, then any legal four-slot combination can be equipped; no matching weapon restriction.
- Given any of four schools, then content registry contains expected passive, two normals, and correct canonical active skills (43 total).

## D. Phát Động

- Given La Hán Quyền hits A and B, Vi Đà Quyền hits B only, Đại Lực Kim Cương Chưởng hits both, then **only B** receives combo bonus.
- Given secondary cleave hit at any combo step, then that enemy progresses that same-target combo.
- Given an attack misses, then it does not advance a combo on the missed enemy.
- Given combo window elapsed, then finisher does unempowered damage.

## E. EXP and leveling

- Given creep with 60 XP, killed by eligible A/B/C, then A/B/C each get 20 XP. No double reward for last hitter.
- Given player does not assist that particular creep, then they get zero XP from its kill even if elsewhere in shared dungeon.
- Given boss killed with two eligible players who each landed >=1 successful hit, then one fixed boss XP reward is shared; only one loot item is generated.

## F. Dungeons

- Given private dungeon with occupant, when second player attempts join same instance, then denied.
- Given shared creep dungeon with surviving enemies, when last player exits, then wave pauses; reentry continues same wave progress.
- Given all creeps in dungeon wave defeated, then next stronger wave spawns only after all previous wave required enemies are dead.
- Given boss alive and dungeon empty for 29s, when player reenters, then boss has not reset; after >=30s empty, health and position reset.
- Given boss killed, when no one is inside, then empty-alive reset must not bypass configured kill respawn cooldown.
- Given player is in dungeon 60s before scheduled statue wave, then warning is shown; there is no automatic teleport; exit portal must be used.

## G. Statue and invasions

- Given live match started at T=0, then waves 1..20 spawn at T=180*n seconds, independent of survival of previous enemies.
- Given wave 5 enemies alive after T=900, then Đông Tà does **not** spawn until the last wave-5 enemy dies, then configurable short delay.
- Given wave 5 clears after wave 6 already spawned, then Đông Tà still spawns once; wave 6 continues as usual.
- Given all four chapter bosses defeated and prerequisites satisfied, then final Vương Trùng Dương becomes eligible and spawns once.
- Given player enters creep detection radius, then creep prioritizes nearest player; when no player in radius, target statue; attack range remains separately validated.
- Given statue HP lost in wave 1, then it does **not** regenerate or get repaired during match.
- Given statue HP reaches 0 before final kill, then match loses; given final boss defeated while statue alive, match wins.
- Given chapter boss death, then gold/XP can be given but zero item drops occur.

## H. Items and loot

- Given boss is killed, then exactly one item selected from its configured loot table is produced regardless of eligible count (1, 2 or 6 players).
- Given one eligible player, then that player wins item automatically; given multiple, a unique roll winner; ties resolved without duplicated items.
- Given duplicate shop basic items, then upgrade exactly one eligible basic item until cap (proposed level 5).
- Given max-level basic item, required boss item and gold, then crafting consumes them once and awards one stronger item; replay of same request cannot duplicate.
- Given 4 equipment slots full, then fifth equip action is denied or requires explicit swap; other backpack items remain available.
- Given owner drops an item and another player picks it up, ownership and state update exactly once, never two copies.

## I. PvP (future milestone)

- Given two sides populated and both ready, then PvP starts; before ready, no damage in duel.
- Given more than six total room players, no side assignment may bypass match cap.
- Given duel active, then no active-skill respec within PvP zone; after end they return to normal match state.

## J. Confirmed v1.2 presentation and M1 traceability

- Given the orthogonal 32px prototype map, arrow keys move in eight normalized directions; artwork selects one of four facings without rotating the camera.
- Given a local player moving through the arena, the camera follows with pixel rounding and integer presentation scale. Ground tiles stay below actors; the same character sorts in front of or behind a tree according to its rendered foot Y. Only the trunk footprint blocks movement.
- Given original hero/creep PNGs and atlas JSON, all idle/walk/attack/cast/hurt/death tags and four directions load real frames. Animation frames never cause server damage. Final art approval is separate from integration verification.
- `tests/combat.test.ts` covers movement, collision, melee/cleave/occlusion, straight projectile dodge, paced shots, explosion/burn, cooldown/mana, empty slots, XP/gold splitting, death eligibility and deterministic replay. `tests/room.test.ts` covers two-client positions/HP, forged state rejection, attack isolation and six-seat lifecycle.
- `tests/assets.test.ts`, `scripts/verify-assets.py` and `tests/e2e/gameplay.spec.ts` check actual source/export/atlas/map data and rendered registry, camera, tree layering, melee/ranged/spells, progression and browser errors. The compile-time protocol test guards input/event types.

M1 uses one archetype and two rank-1 skills. Full skill ranks/passives/respec, dungeon/statue systems, crafting and PvP acceptance remain for later milestones. A fallen M1 hero keeps earned rewards but has no respawn flow until M2.
