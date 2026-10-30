# Run the current playable prototype

On Windows, double-click `start-game.cmd`, or run this in PowerShell:

```powershell
cd D:\Projects\volam-hero-defense
.\start-game.cmd
```

The launcher finds `pnpm.cmd` on PATH or in the existing bundled tools directory; it does not change your global PATH or install packages. Keep the terminal open and visit the URL printed by Vite, normally <http://127.0.0.1:5173>. Enter a nickname, create a room, start, select Cái Bang and confirm. Arrow keys move; A attacks; Q/W cast the prototype skills; E/R are unequipped. Escape closes menus. Ctrl+C stops the local services (confirm Y if Windows asks).

The repository dependencies are already installed in the current workspace. The historical handoff below describes the broader design; it does not mean every later gameplay milestone is implemented.

M2A adds a working Rừng Trúc creep dungeon. Click the top-right **Phó Bản** button anywhere in the arena, choose **Riêng** (your own retained instance) or **Chung** (same room party), then **Vào Phó Bản**. No Dẫn Lộ NPC is required. Fight with A/Q/W, then walk to the western **Lối Ra** portal and click it to return. Empty dungeons pause and resume on re-entry. Friends must join the same waiting room before the host starts. Other dungeon destinations and boss encounters remain unavailable. See `docs/M2A_IMPLEMENTATION.md` for verification and prototype limits.

# v1.4: In-game HUD and UI layout update

**New confirmed presentation requirement:** The game must fill the play viewport. Status, HP/MP, hotbar, inventory, skill loadout, shop, dungeon NPC menu, crafting and PvP appear **inside the game**; no persistent external dashboard columns during matches. Read [`UI_UX_SPEC.md`](UI_UX_SPEC.md). Existing Codex prototype should follow [`CODEX_UI_REFACTOR_TASK.md`](CODEX_UI_REFACTOR_TASK.md) instead of restarting milestones. New visual references in `assets/references/` include the user-provided Cái Bang, Thiên Sơn/Thiếu Lâm and in-game scene, plus an explicitly labeled current-dashboard anti-example.

> **v1.3 art reference update:** Before generating artwork, read `ART_DIRECTION_REFERENCE.md` and inspect `assets/references/vo_dang_art_direction_reference.png`. Prototype and get approval on Võ Đang sprites before expanding the art catalogue.

# Võ Lâm Hero Defense — Codex Project Handoff v1.5

**Status:** Pre-implementation design package. **Date:** 2026-10-29. **Language:** English documentation; Vietnamese names are canonical gameplay content.

A browser-first 2D, **Pokémon-style elevated top-down/three-quarter pixel-art** (orthographic, not isometric or 3D third-person), multiplayer martial-arts hero-defense action RPG inspired by the *structure* of classic Warcraft III defense custom maps. Create original or appropriately licensed art, audio, map assets, and lore; no Warcraft/Pokémon assets or proprietary map code.

## Start here

1. Extract this entire folder to an empty Git repository.
2. Open **the repository root** in Codex / ChatGPT Desktop, not just one document.
3. Read [`CODEX_START_HERE.md`](CODEX_START_HERE.md), then [`AGENTS.md`](AGENTS.md).
4. Ask Codex to execute **Milestone 0 only**. Do not request the entire game at once.
5. Approve the plan and iterate through milestone acceptance tests.

No source code or finished art is included yet; this is the *build handoff*, not a working game. Asset folder structure and a sample manifest are included, but the example paths are **not existing sprites**.

## Document index

| Document | Purpose |
|---|---|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Core gameplay, map, room, dungeon, PvP, invasion rules and ending |
| [`CONTENT_DATA.md`](CONTENT_DATA.md) | Canonical named skill catalogue, schools, and content structure |
| [`COMBAT_SYSTEM.md`](COMBAT_SYSTEM.md) | Input, movement, targeting, combat, crit, cleave, conditions and Phát Động |
| [`BALANCING.md`](BALANCING.md) | Balance philosophy, XP, enemy scaling, simulation and telemetry |
| [`ITEMS_AND_CRAFTING.md`](ITEMS_AND_CRAFTING.md) | Item upgrades, 4 slots, boss loot rolls, crafting and inventory |
| [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md) | Engine/server decision, package boundaries, netcode and testing |
| [`ART_ASSET_GUIDE.md`](ART_ASSET_GUIDE.md) | **Confirmed camera/perspective**, sprite size proposals, layering/occlusion, art sourcing, exports and animation quality gates |
| [`ROADMAP.md`](ROADMAP.md) | Milestones, acceptance criteria and incremental delivery sequence |
| [`ACCEPTANCE_TESTS.md`](ACCEPTANCE_TESTS.md) | Given/when/then checks for confirmed mechanics |
| [`DECISIONS.md`](DECISIONS.md) | Fixed choices vs proposed defaults; conflict-resolution policy |
| [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) | Not-yet-approved mechanics and future design work |
| [`AGENTS.md`](AGENTS.md) | Codex's repository-wide durable rules |
| [`CODEX_START_HERE.md`](CODEX_START_HERE.md) | Copy/paste first Codex task |

## Skills (bundled, no installation required in repo)

- `.agents/skills/game-playtest/SKILL.md`: browser-based movement, visual, and multiplayer smoke-testing workflow.
- `.agents/skills/combat-balance-test/SKILL.md`: deterministic headless battle and farming balance checks.
- `.agents/skills/create-game-ability/SKILL.md`: repeatable skill addition with combat rules and tests.
- `.agents/skills/pixel-art-pipeline/SKILL.md`: sprite animation, atlas import/export, provenance and visual verification.

These are **instruction-only** workflows, not executables. They become useful as the project gets implemented. For Colyseus version-specific APIs, also consider the official `colyseus/skill` package after reviewing its source and instructions.

## Documentation precedence and change policy

1. Confirmed user decisions in `DECISIONS.md` override proposals anywhere else.
2. Mechanic-level details in `COMBAT_SYSTEM.md`, `ITEMS_AND_CRAFTING.md`, or `GAME_DESIGN.md` are next, subject to confirmed decisions.
3. Named content definitions in `CONTENT_DATA.md` are canonical for spelling and the skill list.
4. Tentative sample numbers are **not** approved balance decisions and should stay configurable.
5. Unresolved matters go into `OPEN_QUESTIONS.md`; Codex must not infer a user's choice from a mockup.

### Core fantasy

Start level 1 with a school and a manually controlled hero. Farm private or shared dungeons, choose and reassign four active skills, find boss drops, upgrade and craft equipment, and manually return to defend an **unrepairable statue** against **20 invasions every 3 minutes**. Defeat Đông Tà, Tây Độc, Nam Đế, Bắc Cái, then final boss Vương Trùng Dương. Up to six players; a tough solo clear remains possible. Nothing persists after the match ends.


## Additional v1.5 concept references
This package now includes a larger approved reference set under `assets/references/`, covering the central arena/hub, arena combat, forest/desert/sea/hell dungeons, and in-game dungeon/shop/inventory overlays. These references should be read alongside the markdown documents before art/UI implementation or refactor work.

## v1.6 correction: asset creation versus engine

The existing game screenshot `assets/references/current_game_2026_10_29_placeholder_anti_reference.png` demonstrates that *correct HUD placement is not sufficient*. The visual bar is the detailed wuxia reference set. See `ART_PRODUCTION_STANDARD.md` and `CODEX_ART_QUALITY_RESCUE_TASK.md` for a mandatory real-art, one-screen approval milestone. Phaser 4 is the retained engine; quality depends on source art, animations, coherent tilemaps, and visual review. Do not quietly treat procedural placeholders as production art.
