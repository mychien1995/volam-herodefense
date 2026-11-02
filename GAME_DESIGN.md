# Game Design Document (GDD) v1.0

**Inventory/merchant design revision — 2026-11-02:** [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 is the detailed design for potions, four fixed equipment slots, personal boss rewards/Long Châu and crafting. This documentation does not implement or migrate the existing boss loot backend; confirmed/open choices are distinguished there and in [DECISIONS.md](DECISIONS.md).

## 1. Pitch & pillars

**Genre:** multiplayer cooperative action RPG + periodic hero defense; 2D orthographic top-down / three-quarter Pokémon-style overworld perspective (not isometric, platformer or 3D third-person), with colorful original wuxia-inspired pixel art; browser-first; 1–6 players in temporary match-based rooms. References to Warcraft III custom maps / Pokémon relate only to broad gameplay and visual perspective, not assets or proprietary designs.

**Player fantasy:** select a martial-arts school, master a flexible personal combination of martial abilities, grow from level 1 to 30, farm dungeons for upgrades, and protect an irreplaceable statue until the final boss is defeated.

**Design pillars:** (1) difficult but learnable, (2) expressive builds not fixed classes, (3) deliberate manual action combat, (4) short meaningful farming decisions under a visible defense clock, (5) co-op rewards coordination without requiring six players, (6) extensibility for more schools/items/enemies.

## 2. Onboarding, matchmaking and match state

1. Landing page: user inputs **nickname**, optionally sees room list / join code, creates or joins a room, no registered account.
2. Match room supports **1 to 6 active players**. Host starts the dedicated school selection step; all players must confirm before gameplay. After the host starts from the waiting lobby, players select/confirm schools on a dedicated screen; same-school duplicates allowed.
3. Spawn at level 1 around central statue. Starting gold, inventory, skills, character HP/MP are new each match; **no progress persists**.
4. Game clock begins; standard raid arrivals every **180 seconds**, independent of dungeon status or incomplete earlier raids.
5. Between invasions: players use the Phó Bản menu from the arena, fight creeps/bosses, gain XP/gold/items, change skills in arena, shop/upgrade/craft, optionally initiate PvP.
6. Victory: **Vương Trùng Dương** defeated with statue alive. Defeat: statue HP = 0. Results screen then room can end/return to lobby (rematch behavior TBD).

## 3. Arena

- One central statue, initially full HP and **no healing, repair or regeneration**.
- Creeps enter along **two opposing corridors (west/east)**. At least some room to maneuver and intercept; do not force single-file enemy traffic.
- Dungeon access uses the Phó Bản menu; no Dungeon Guide NPC. Other planned NPCs: Merchant/Crafter (can be combined initially), PvP Steward.
- Changing normal attack, equipping any four school skills, and redistributing ranks is allowed **in arena**, including outside NPC menus if convenient; prohibited in dungeon and PvP zones.
- 60-second and 15-second advance warning (visual + sound recommended); persistent next-invasion countdown in all maps.
- No automatic teleport. Player must reach dungeon exit portal, interact, load the arena, and run toward statue. Design travel so manual return is physically achievable within the notice for attentive players.

## 4. Invasion timetable and boss gates

| Scheduled time | Regular invasion | Special sequence |
|---|---|---|
| 03:00, 06:00, 09:00, 12:00 | Waves 1–4 | — |
| 15:00 | Wave 5 | When **this wave's enemies** all die, rest configurable few seconds (10s proposed), spawn **Đông Tà** |
| 18:00 through 27:00 | Waves 6–9 | Prior survivors and boss may coexist |
| 30:00 | Wave 10 | After this wave cleared, rest, spawn **Tây Độc** |
| 33:00 through 42:00 | Waves 11–14 | Prior survivors and boss may coexist |
| 45:00 | Wave 15 | After this wave cleared, rest, spawn **Nam Đế** |
| 48:00 through 57:00 | Waves 16–19 | Prior survivors and boss may coexist |
| 60:00 | Wave 20 | After this wave cleared, rest, spawn **Bắc Cái** |
| After chapter bosses | — | When all four defeated, spawn **Vương Trùng Dương** final boss (exact gap proposed) |

**Critical distinction:** Regular invasions are strictly clock driven and **overlap if not cleared**. Chapter bosses are **gated by clearing their corresponding fifth wave**. The boss is not spawned merely because the scheduled minute has been reached. Do not pause the game clock for bosses. Bosses attack the statue and may have special abilities; invasion enemies and bosses give **gold and EXP only**, no item drops. Final transition must tolerate overlapping enemies and delayed chapter bosses without duplicate spawns.

The first final boss eligibility after chapter four: only once Bắc Cái is defeated **and** all prior chapter bosses were defeated. If cleanup of residual non-boss creeps is needed before final spawn, keep that as an OPEN tuning rule, not a silent blocker. All raids ideally remain valid even if boss encounter overlaps another invasion.

## 5. Enemy behavior

- Invasion enemy seeks closest **player** within its detection range (not necessarily someone who attacked it). If multiple players are detected, nearest wins; avoid per-frame target jitter by small reevaluation interval / hysteresis.
- If zero players in detection range, follow its lane/path toward statue and attack statue on entering attack range.
- If target leaves detection range, drop pursuit and resume path to statue. Detection range is distinct from melee/ranged attack range.
- Movement, obstacles, line of sight, ability-triggered aggro are to be specified during prototype; avoid infinite pathfinding loops.
- Enemy archetypes to introduce gradually: melee walker, runner, ranged, armored, healer, elite. Proposed only; exact numbers/abilities in future encounter tuning.
- Spawn count and strength of **regular creep waves** scale with active player count at wave spawn; chapter bosses should remain meaningfully dangerous, with distinct telegraphed patterns and strong disable resistance.
- Performance guardrails must not silently skip scheduled waves. Prefer caps on *active instances*, spawn batching/queues, or optimization while preserving the promised enemies and difficulty; document any intentional gameplay cap before using it.

## 6. Dungeon model

**Two independent dimensions:**

| Access | Creep dungeon | Boss dungeon |
|---|---|---|
| Private (1 player) | Solo progressive kill-to-advance waves | Solo fixed-strength farmable boss |
| Shared (up to 6) | Cooperative kill-to-advance waves | Cooperative fixed-strength farmable boss |

- Enter through the Phó Bản menu from anywhere in the arena while alive; no NPC/proximity requirement. Separate instanced map/zone remains attached to the same match. One player cannot simultaneously be in multiple zones. Combat state is authoritative per match.
- Exit via **physical portal** inside dungeon; mouse to interact, return to arena NPC. Dungeon entry, transitions and teleports validated server-side.
- Creep dungeons: spawn next wave **only after all living creeps from current wave are defeated**; wave difficulty increases; dungeon pauses when last participant leaves and resumes from same wave when someone returns. Define which enemies' HP/position are paused via snapshot, not erased.
- Boss dungeons: fixed boss strength, can be killed repeatedly; after kill, wait a tunable respawn cooldown. If dungeon becomes empty with boss alive, start **30-second reset timer**; at expiry, restore HP and spawn position. If reentered before expiry, cancel reset. If boss already dead, use respawn cooldown logic instead; avoid resurrecting prematurely due to empty state.
- No boss scaling on repeated kills. Boss item rewards go to every participant who damaged the boss and remains in its instance at death: a personal boss material each kill, plus Long Châu once per character/boss/match. No rolls. XP/gold keep their fixed-pool rules; see [inventory rewards](ITEMS_AND_CRAFTING.md#4-thưởng-boss-và-long-châu--confirmed).
- Enemy counts and power of creep dungeons scale to participating player count **at each wave spawn**, while boss dungeon's configured static boss power does not depend on repeated attempts; private/shared difficulty variants may use separately authored configs.

## 7. EXP, levels, skills and death

- XP from creep kills: fixed amount per creep, split equally among **eligible kill/meaningful-assist participants**, irrespective of role; independent of last hit. Do not award a whole dungeon's XP to an inactive or absent character.
- Boss dungeon XP: shared by eligible players who landed at least one attack and fulfill configured presence rule; one boss kill grants one **fixed** XP amount divided among eligible participants (recommended consistent split; exact share rule TBD).
- Hero level 1–30; one earned skill point each level including level 1. Innate school passive and character stats increase automatically every level, no skill-point expenditure.
- Four active skills equipped (`Q/W/E/R`) out of larger school catalogue, can mix fighting styles freely; basic attack chosen independently (`A`). Active skills have ranks; ultimate optional. Equip/change/reset freely **in arena only**.
- If currently equipped four skills are **all at max rank**, surplus earned skill points become automatic bonus attributes based on school. Recalculate immediately when build changes, never retain bonuses on respec. Rank caps/gates in balancing draft are proposals.
- Death: short respawn countdown at arena; no loss of money or XP; statue continues to take damage while dead.

## 8. Combat and elements

- Arrow-key movement, A manually triggers normal attack, Q/W/E/R manually trigger active skills. Mouse is for menus, NPCs, skill assignment, items. No click-targeted abilities.
- Non-homing basic ranged shots lock an **aim vector to nearest eligible enemy's current position at launch**, not a tracking target. Melee normal attacks hit frontal arc with primary target full hit and other targets reduced cleave.
- Each school has two selectable normal-attack styles and 4-slot active build. Skills can be mixed across styles and do not require a matching physical weapon.
- School elements are thematic **Fire (Cái Bang)**, **Wind (Thiên Sơn)**, **Yin–Yang (Võ Đang)**, **Gold (Thiếu Lâm)**; no elemental rock-paper-scissors multiplier in v1.
- Bosses significantly resist stun, disarm, silence, slow, pull, knockback; skills must still have relevant damage/value vs bosses.
- Thiếu Lâm Phát Động: same-target sequential skill hits, cleaved secondary hits count; separate combos can be tracked per enemy ID. See `COMBAT_SYSTEM.md`.

## 9. Items, shop, loot and optional PvP

- Four fixed equipment slots: **weapon, armor, hat, boots**; no necklace. Weapon adds damage, armor defense/HP, hat HP/MP regen, boots speed/minor crit. Backpack capacity remains open. No resale, trading or transferable drops.
- Buying the same basic item upgrades it to **level 5**. Max basic + designated boss material + gold selects one of three crafted branches. Deterministic crafting remains proposed; exact recipes/effects and open values are in [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md).
- Merchant sells HP/MP potions with **5s use cooldown**, limit 20 (total/per-type open), larger healing sizes with higher prices. Potions cannot be purchased inside dungeons; shared/separate cooldown and exact amounts/prices remain open.
- Every eligible boss participant receives personal materials and first-clear Long Châu as specified in section 6. Invasion bosses never grant items or Long Châu.
- Optional PvP via NPC; create/join a duel, players stand on opposing sides and mark ready, then start; 1v1 or uneven team configurations totaling <= 6. No loadout editing inside PvP arena; do not make PvP a dependency for co-op progression. PvP time/raid overlap and reward rules are still open.
- **PvP proposal, not confirmed:** ignore equipment and allow skills only; ban potions. Whether that excludes shoe Z and Long Châu or normalizes level/ranks/passives is unresolved; see [inventory PvP notes](ITEMS_AND_CRAFTING.md#10-pvp--proposed-chưa-chốt).

## 10. Difficulty philosophy & win condition

- The full 20-wave schedule is **60 minutes** from start, followed by gated bosses/final boss; actual win may be later. Hard enough to reward strategic preparation and team coordination, but make solo victory possible with exceptional play.
- Statue damage is permanent. Regular waves overlap on a fixed clock. Avoid fake difficulty from unavoidable one-shots, unclear aggro or invisible telegraphs.
- Strong builds are supposed to feel powerful. Tune early-game fairness, late-game urgency, support viability, and boss control resistance via simulation and playtests. Exact damage/stat/economy values remain adjustable, not fixed by this GDD.

## In-game UI presentation (confirmed in v1.4)

After joining a match, the central arena/dungeon/PvP world remains the dominant screen; hero HUD, statue HP, wave timer, skill bar, gold, inventory, merchant, crafting, dungeon and PvP windows all appear **inside or over the game viewport**. Do not implement the in-match game as a web dashboard with persistent room/hero/enemy panels outside the map. The lobby before joining may use a distinct menu screen. See `UI_UX_SPEC.md` for layout, interaction, input-focus and acceptance details. The sample screenshots in `assets/references/` are visual references, not ready-to-import gameplay animation sheets.


## Confirmed dedicated pre-game school selection — 2026-10-30

The current user correction supersedes school choices in the waiting lobby: **Landing (nickname only) → Room Browser (create/join) → Waiting Lobby (players/host/status) → host Start Game → dedicated School Selection → all confirmations → Main Arena**. School choices do not appear in the waiting lobby. Four canonical schools only: Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm. Duplicate school choices are allowed. Players can change choices until confirmation, then their choice is locked. Confirmation progress is server state.

The existing Colyseus room owns WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME, host ID, school IDs and confirmations. Only the host can request Start Game in the waiting lobby. Simulation/input and matchElapsedMs remain stopped until every participant is connected and confirmed. Players then spawn at level 1 with one point near the central statue in the same room, retaining their chosen school in both network/player state and the core hero. No persistent accounts or progression. Invasions are still an unimplemented M2 feature; future scheduling must use the IN_GAME clock origin, never room creation.

Disconnect safety: during selection retain a disconnected/unconfirmed participant and hold the barrier. Never auto-pick, expire, or silently start without that participant. Current clients can leave/recreate the room. Host migration, reconnect/rejoin grace, removal of absent participants and any timeout/auto-selection policy remain OPEN; no such policy is implemented. Waiting-lobby host loss disables starting; no silent host promotion.

School descriptions, passives and basic styles come from CONTENT_DATA.md. School-specific numeric starting values and starting skill assignments beyond the Cái Bang M1 prototype are not finalized; show that explicitly instead of inventing mockup statistics. Phase 1 stores/validates selections but does not implement M3 school combat or bulk school gameplay art: the existing M1 combat tuning and approved Cái Bang runtime visual fallback remain in the arena. Distinct school card portraits are concept illustrations only.
