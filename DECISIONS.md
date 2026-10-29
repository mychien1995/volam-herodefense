# Approved decisions & assumptions register

**How to read:** **CONFIRMED** reflects explicit user choices or explicit acceptance of earlier recommendations. **PROPOSED** is implementable tuning advice, not binding game design. **OPEN** means no choice was made. Do not conflate these statuses.

## Confirmed — fundamental

- Browser-first, keyboard-oriented, top-down 2D pixel-art direction is **the recommended technology approach**, pending normal technical implementation checks; player-facing deployment should be via browser initially.
- **Max 6 players per independent match room**, player enters a nickname only; no accounts or persistent progression.
- Four launch schools: **Cái Bang**, **Thiên Sơn**, **Võ Đang**, **Thiếu Lâm**. Expand later.
- Arrow keys move, `A` manual normal attack, `Q/W/E/R` active skills. Mouse used for NPC, shop, menus, equip, skill UI; no mouse-targeted skills. Auto basic attack **OPEN** (manual first).
- Ranged basic attacks auto-aim at nearest eligible enemy at the moment of release, projectile flies straight and **does not track**; enemy can dodge. Melee basic attacks hit forward arc; non-primary enemies receive **reduced cleave** (exact percentage proposed).
- Characters start at level 1; **max level 30**; receive **one skill point at each level including level 1**. School stats and one innate passive automatically grow by level. Skills can be learned, leveled and freely remapped in arena, not inside dungeon/PvP. Four equipped active slots; equipped ultimate is optional. A separate swappable basic attack.
- Surplus skill points **after fully ranking current four equipped skills** convert automatically into school-specific stats; recalc on respec; no permanent stacking of respec bonuses.
- School innate passives: **Cái Bang = Tiêu Diêu Công** (Fire/damage/crit), **Thiên Sơn = Bắc Minh Thần Công** (Wind/speed/attack speed/crit), **Võ Đang = Thái Cực Tâm Pháp** (Yin–Yang/mana/efficiency), **Thiếu Lâm = Dịch Cân Kinh** (Gold/HP/defense). School style does not lock active skill mix.
- Thiếu Lâm Phát Động sequences require consecutive skills to **land on the same enemy**; secondary/cleaved hits count as hits on that enemy. Combo expiration/time window is tunable.
- Bosses resist disables strongly; status and crowd-control handling must be explicit.

## Confirmed — arena, PvE, rewards

- Central arena protects one statue; NPCs for dungeons, items/crafting, and optional PvP. Dungeons are **separate map/zone instances selected via NPC**; the player leaves via a **physical exit portal**, returns near NPC and walks to the statue. No instant recall.
- **Private dungeon permits only one player**; shared permits up to six. **Creep dungeon** advances only after current wave eliminated, gets stronger with wave progression; pauses when empty. **Boss dungeon** contains fixed-power boss that may be farmed repeatedly; if dungeon is empty for 30 seconds, boss health and position reset. Boss respawns after a configurable cooldown when killed.
- Dungeon creeps and statue creeps scale in count and strength according to active player count. Snapshot player count for wave creation to avoid live HP jumps. Dungeon bosses have fixed difficulty within their configured dungeon, **not** endless per-clear scaling.
- Killing/meaningfully assisting on creeps grants eligibility; a **single fixed creep EXP pool is divided among eligible participants**. Boss dungeon: player who landed at least one valid hit qualifies for shared boss EXP, subject to presence at completion as a proposed implementation safeguard.
- **Exactly one randomly selected loot item per dungeon boss kill**; eligible players **roll for ownership**; solo qualifying player automatically wins. Item may be kept, dropped to ground, or sold; duplicates permitted. Repeated kills are for gold/EXP/items and crafting.
- Shop sells basic items. Purchasing duplicates upgrades an existing basic item to its max level. **Max-level basic item + boss drop + gold → stronger crafted item**. Any school can equip any item; **4 equipment slots**. Backpack size OPEN.
- Hero death: short respawn at arena, no EXP or gold penalty.
- **20 regular invasions from west/east (two directions)** on exact 3-minute intervals, at 03:00 through 60:00. Waves spawn even with prior waves alive. Warnings 60s and 15s before each; players must travel back themselves. **Statue cannot be repaired**.
- Invasion creeps detect nearby players and **prioritize the closest player inside detection range**; when no players in range, move to/attack statue. If player leaves detection range, resume statue path. Detection and attack radii separate.
- After every fifth regular wave **is completely cleared**, wait a few seconds (PROPOSED 10s), then spawn one chapter boss in order: **Đông Tà → Tây Độc → Nam Đế → Bắc Cái**. Strict regular-wave clock continues concurrently. After the four chapter bosses are defeated and their prerequisites are satisfied, final boss **Vương Trùng Dương** spawns. Win when final boss defeated and statue still lives; lose if statue HP reaches 0.
- Invasion enemies/bosses drop **gold and EXP but no items**, including final boss for v1.
- **Solo win possible but deliberately very hard**; six-player cooperative mode must remain difficult and fair.
- PvP is a minor optional feature: NPC creates/joins a PvP room (within current match), players wait at side A or B, start after ready. Total players limited by match (1–6). No change to skills inside PvP. PvP rewards/open clock behavior are proposed, not hard requirements.

## Proposed defaults — tune or ask before finalizing

- Release tech: Phaser 4.2.x + TypeScript browser client, Colyseus 0.18.x Node TypeScript authoritative server, shared TS game core, Vite, pnpm workspaces, Vitest, Playwright, Tiled; no DB initially.
- Headless fixed tick at 20–30 Hz, render at display refresh; prediction/interpolation staged, avoid full rollback prematurely.
- 32x32 pixel-art terrain tiles; 8-direction movement/facing; default NPC interaction by mouse.
- Regular skill max rank 4; ultimate max 3; ult unlock at character levels 6/10/14; regular rank gating at 1/3/5/7.
- Melee basic primary target 100%, cleave target 50% by default, school-specific overrides, independent crit rolls.
- Invasion boss rest 10s after fifth wave fully clears; warnings at T-60 and T-15; raid clock never pauses.
- Starter backpack 12 slots, equipment slots example weapon/armor/2 accessories; gear slots types are **not** approved.
- No PvP gold/EXP reward; PvP duels should have clear win/end behavior and no item loss.
- No elemental-counter chart initially; elements provide visual/school identity.
- Suggested 6-second Phát Động window, configurable; crowd-control reduction for bosses not yet numerically specified.

## Open decisions

See `OPEN_QUESTIONS.md`. Ask a targeted question only when implementing a feature that **cannot** proceed safely under a clearly labeled provisional default. Record decisions here when approved.
