# Codex task — stop placeholder art and fix the visual production pipeline (v1.6)

I am **not approving the current runtime art**. The screenshot at `assets/references/current_game_2026_10_29_placeholder_anti_reference.png` is a negative quality reference. The in-game HUD layout is closer to the right structure, but sprites, trees, terrain, buildings, effects and UI art look like a low-detail prototype.

**Do not change game engines. Keep Phaser 4. Do not restart or rewrite the game.** Preserve multiplayer, combat, controls, dungeon logic and server authority.

Read `AGENTS.md`, `ART_PRODUCTION_STANDARD.md`, `ART_DIRECTION_REFERENCE.md`, `ART_ASSET_GUIDE.md`, `UI_UX_SPEC.md`, and `ACCEPTANCE_TESTS.md`. Inspect the PNGs in `assets/references/` *visually*, including the current screenshot and the detailed wuxia character/hub/dungeon/menu concepts.

## First response: audit before you code

1. Show which actual asset files/code currently render hero, NPC, creep, trees, stone tiles, buildings, portal, VFX, item icons and UI frames; cite repository paths. Distinguish imported PNGs from programmatically generated graphics. Explain exactly why the scene looks so different from the concepts.
2. Propose a minimal **ART-01 visual vertical slice**: 1 hero (Cái Bang preferred), 1 creep, 1 NPC, small richly illustrated section of the arena, 1 building, 2 distinct tree types, one normal attack and a single skill effect, basic in-game HUD.
3. Provide the asset-production approach, tool capabilities, missing original assets, and whether external art generation/pixel-art cleanup is necessary. If you cannot produce enough genuine source art, say so and stop instead of silently substituting low-detail procedural drawings.

## After the audit, implement ART-01 only using genuine source assets

- Produce (or import legitimately licensed) consistent gameplay sprites, transparent walk/idle/attack frames, PNG spritesheets/atlases + JSON, coherent tilesets, and UI image assets. Do not crop presentation/concept sheets as fake sprite atlases.
- Use detailed wuxia chibi proportions, coherent lighting/palette, 3/4 elevated top-down view and correct layering/pivots. Match *the visual standard* of the references; not a pixel-for-pixel reproduction.
- Integrate the art in the actual running Phaser scene while retaining keyboard controls and multiplayer, not as a static mockup.
- Capture an actual game screenshot at 1280x720 and at intended normal gameplay scale, plus a static PNG animation contact sheet and live Phaser frame/transition observations. Follow the recording policy in `AGENTS.md`; recordings require an explicit user request. Compare against `central_arena_hub_reference.png`, `cai_bang_character_reference.png`, `wuxia_town_world_reference.png` and the current anti-reference.
- Record original file paths, source/license, asset dimensions, all placeholder statuses, remaining visual gaps and tests. Ask for **art approval** before producing the other schools or entire environment set.

## Do NOT

- Do not generate more rectangular characters, blob-shaped trees, repeating beige floor grids or CSS/SVG UI icons and declare them final.
- Do not implement a new gameplay milestone to distract from this visual-quality problem.
- Do not say the result matches the concept merely because colors/HP panels/camera have been adjusted.
- Do not rewrite gameplay mechanics or networking to satisfy an art task.

**Definition of done:** a small genuinely illustrated *playable* scene with reviewed visual quality and working animation, not an expanded prototype map.
