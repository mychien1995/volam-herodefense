# Repository instructions for Codex and other coding agents

This repository is for **Võ Lâm Hero Defense**, a challenging browser-first 2D multiplayer martial-arts statue-defense RPG. **Do not start coding the full game until reading the design handoff.**

## Read before touching code

1. `DECISIONS.md` — authoritative confirmed user rules versus proposals.
2. `GAME_DESIGN.md` — core loop, dungeons, waves, statue and PvP.
3. `CONTENT_DATA.md` — exact Vietnamese names, 43 active skills, 8 normal attacks, 4 innate passives.
4. `COMBAT_SYSTEM.md`, `BALANCING.md`, `ITEMS_AND_CRAFTING.md` — specifics.
5. `TECHNICAL_ARCHITECTURE.md`, `ROADMAP.md`, `ACCEPTANCE_TESTS.md`, `OPEN_QUESTIONS.md`.
6. `CODEX_START_HERE.md` — first task; do **M0 only** initially.

## Hard constraints

- Server authoritative for movement, collision, targeting, hit/damage, RNG, skills, XP, gold, items, loot, wave clock, boss and match state. **Never trust client-submitted damage, location, inventory, XP or loot result.**
- `game-core` independent of Phaser, Colyseus, DOM and UI; deterministic seeded simulation with tests.
- Arrow keys movement, A basic manual attack, QWER skills; mouse only NPC/menu/inventory. No targeted spells. Ranged shots aim once at nearest enemy's position, then fly straight; **no tracking**. Melee frontal arc with reduced cleave on secondary targets.
- School styles/skills freely mixed; innate passive levels automatically; max level 30; 1 skill point per level including level 1; 4 active slots; respec only in central arena; no reset-based stat duplication.
- Thiếu Lâm Phát Động same-target hits only; secondary cleave hits count. Cầm Long Công = pull+silence+disarm without stun and without preventing movement.
- Match room 1–6 players, nicknames only, no saved progress. Private/shared dungeons, boss dungeon empty reset at 30s. Creep XP fixed pool divided among eligible kill/assists.
- 20 statue creep invasions **every 180 seconds** from **2 sides**, regardless of previous wave status; no statue repair. Fifth-wave bosses only after corresponding fifth wave cleared + short rest, in order Đông Tà/Tây Độc/Nam Đế/Bắc Cái; final Vương Trùng Dương. Gold/XP only for invasion, **no item drops**.
- Dungeon boss exactly **one randomly drawn item per kill** and eligible-player roll; duplicates/sell/drop. 4 equipment slots; buy duplicate basic to level it, max basic + boss item + gold crafts stronger.
- Keep exact Vietnamese skill names as documented. Stable ASCII IDs; separate localization display names.
- Do not copy proprietary Warcraft III / Pokémon map art, sound, or code. Use placeholders or original/licensed content.

## Working method

- Implement **only the requested roadmap milestone**. Start with M0. Do not implement M1+ unasked.
- At start of a task, state files read, brief plan and any blocking ambiguity; propose small configurable defaults for non-blocking open questions.
- Before using Phaser/Colyseus APIs, consult installed versions and current official docs; Colyseus 0.18 APIs differ from earlier versions.
- Keep game data and tuning values separate from mechanics; validate at load/startup. Add tests for each new skill/status/XP/inventory/wave behavior.
- After code changes: run typecheck, unit/integration tests, relevant browser smoke tests and report actually run commands/results; if tests couldn't run, say so.
- Update spec documents, `DECISIONS.md`, acceptance tests and architecture only when behavior truly changes. Never quietly overwrite user-approved game rules with a shortcut.
- Keep source modular, use concise commits and clear PR summary when Git is available. Prefer straightforward TypeScript to unnecessary abstractions.

## Skills you may use

- `.agents/skills/game-playtest/`: browser/visual and room smoke tests.
- `.agents/skills/combat-balance-test/`: deterministic simulation and balance reports.
- `.agents/skills/create-game-ability/`: data-first content addition and regression tests.

These instructions are executable **workflows** only after the relevant code/tooling exists. They are not a replacement for tests.
