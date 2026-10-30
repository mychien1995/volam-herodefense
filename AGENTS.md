> **NEW mandatory v1.4 in-game UI rule:** Before any UI/UX work, read `UI_UX_SPEC.md` and visually inspect `assets/references/in_game_world_reference.png` (**positive**) and `assets/references/current_codex_dashboard_anti_reference.png` (**anti-reference**). After joining a match, render **one dominant game viewport** with all HUD, inventory, shop, skill tree/loadout, dungeon, crafting, PvP and loot-roll UI as in-viewport overlays. **Never** use persistent exterior right-side panels, page title, footer or dashboard status column. An HTML/React/DOM overlay absolutely positioned inside the game viewport is acceptable; game overlays do not have to be Phaser Graphics. Do not shrink the map to make room for UI. Keep a separate pre-match lobby if needed. Preserve server authority and keyboard/mouse controls. Details/acceptance: `UI_UX_SPEC.md` and `CODEX_UI_REFACTOR_TASK.md`.

# Repository instructions for Codex and other coding agents

This repository is for **Võ Lâm Hero Defense**, a challenging browser-first 2D multiplayer martial-arts statue-defense RPG. **Do not start coding the full game until reading the design handoff.**

## Read before touching code

1. `DECISIONS.md` — authoritative confirmed user rules versus proposals.
2. `GAME_DESIGN.md` — core loop, dungeons, waves, statue and PvP.
3. `CONTENT_DATA.md` — exact Vietnamese names, 43 active skills, 8 normal attacks, 4 innate passives.
4. `COMBAT_SYSTEM.md`, `BALANCING.md`, `ITEMS_AND_CRAFTING.md` — specifics.
5. **`ART_DIRECTION_REFERENCE.md` and `assets/references/vo_dang_art_direction_reference.png`** (read/show actual reference; mandatory visual standard); then `ART_ASSET_GUIDE.md` for sprite sourcing, export formats, animation and artwork verification; `TECHNICAL_ARCHITECTURE.md`, `ROADMAP.md`, `ACCEPTANCE_TESTS.md`, `OPEN_QUESTIONS.md`.
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
- **Confirmed art quality:** Reference-driven **detailed chibi wuxia pixel art**, as in `assets/references/vo_dang_art_direction_reference.png`. Do not substitute geometric / SVG placeholders when the task is to deliver finished character art. First deliver a single Võ Đang 4-facing idle/walk + Quyền/ Kiếm attack prototype, inspect it in the actual Phaser game, then request user art approval before bulk generating. A reference sheet is not an animation atlas. Read `ART_DIRECTION_REFERENCE.md` before any art work.
- **Confirmed presentation:** orthographic 2D pixel art with an elevated/top-down **Pokémon-like three-quarter overworld view**, never isometric/side-scroll/3D chase camera. Keep one consistent non-rotating camera perspective across arena, dungeons and PvP; order object occlusion by character feet/Y-depth, with foreground tree/roof layering. Follow `ART_ASSET_GUIDE.md`. No real sprite/animation can be called complete until its file exists, animation frames load correctly in Phaser, and visual checks are recorded.
- **Confirmed reference set (v1.5):** inspect `assets/references/central_arena_hub_reference.png`, `arena_battle_reference.png`, `forest_dungeon_reference.png`, `desert_dungeon_reference.png`, `sea_dungeon_reference.png`, `hell_dungeon_reference.png`, `dungeon_selection_menu_reference.png`, `merchant_shop_menu_reference.png`, `inventory_menu_reference.png`, plus the school character references. Use them as the primary art/UI benchmark. The world must occupy the full match viewport; inventory/shop/dungeon menus must appear as in-world overlays inside the viewport. Document source/license; no animation-driven authoritative damage. M0 placeholders are acceptable; avoid bulk artwork generation before playtesting.

## Working method

- Implement **only the requested roadmap milestone**. Start with M0. Do not implement M1+ unasked.
- At start of a task, state files read, brief plan and any blocking ambiguity; propose small configurable defaults for non-blocking open questions.
- Before using Phaser/Colyseus APIs, consult installed versions and current official docs; Colyseus 0.18 APIs differ from earlier versions.
- Keep game data and tuning values separate from mechanics; validate at load/startup. Add tests for each new skill/status/XP/inventory/wave behavior.
- After code changes: run typecheck, unit/integration tests, relevant browser smoke tests and report actually run commands/results; if tests couldn't run, say so.
- After changing visual assets, verify actual PNG/JSON frame assets and rendered animations; report placeholder/prototype/approved status and screenshots only if really captured.
- Update spec documents, `DECISIONS.md`, acceptance tests and architecture only when behavior truly changes. Never quietly overwrite user-approved game rules with a shortcut.
- Keep source modular, use concise commits and clear PR summary when Git is available. Prefer straightforward TypeScript to unnecessary abstractions.

## Skills you may use

- `.agents/skills/game-playtest/`: browser/visual and room smoke tests.
- `.agents/skills/combat-balance-test/`: deterministic simulation and balance reports.
- `.agents/skills/create-game-ability/`: data-first content addition and regression tests.
- `.agents/skills/pixel-art-pipeline/`: original/licensed sprite and VFX asset workflow, atlas export, Phaser loading and browser visual checks.

These instructions are executable **workflows** only after the relevant code/tooling exists. They are not a replacement for tests.

## v1.6 Mandatory visual production gate

Read `ART_PRODUCTION_STANDARD.md` and inspect `assets/references/current_game_2026_10_29_placeholder_anti_reference.png` before any more environment/character/UI art work. The current screenshot is **visually rejected** as placeholder-level art, despite improved HUD layout. **Never use procedural Phaser Graphics or crude programmatically pixelated rectangles/trees as final art.** Require real original/licensed spritesheet PNGs, tilesets, and UI art, actual-run screenshot comparisons, an asset provenance manifest and explicit director approval at normal gameplay zoom. Complete an `ART-01` one-screen hero + environment art quality vertical slice before expanding the world. Phaser 4 is retained; asset production is distinct from asset integration. See `CODEX_ART_QUALITY_RESCUE_TASK.md`.
