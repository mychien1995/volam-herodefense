# Art Direction Lock — Reference-Driven Pixel Art (v1.3)

## STATUS: CONFIRMED by game director

The attached reference `assets/references/vo_dang_art_direction_reference.png` is the **primary visual-quality and style reference** for the entire game. It is a concept/presentation sheet, **NOT a runtime sprite sheet, not a valid animation atlas, and not necessarily at final sprite resolution**. Do not cut random rectangles from it and claim they are production-ready frame animations. Recreate consistent original gameplay assets following its visual language; treat the actual reference as direction, not a license to copy third-party characters.

### Required look (read the image, don't infer from text alone)
- Detailed **2D chibi wuxia pixel art**, Pokémon-like elevated top-down / 3/4 orthographic overworld camera. Not 3D, isometric diamond-grid, side-view, vector/cartoon icons, flat circles/rectangles, or minimalist 8-bit stick-figure placeholders once art is under review.
- Gameplay hero design: slightly oversized head, small yet proportionate body, expressive face, strong readable silhouette, layered martial-arts robes, tied-up hair, fabric accents, limited and harmonized color palette, coherent highlights/shadows, hand-pixelled edges.
- Character must be readable from all four cardinal facings: down/front, up/back, left/side, right/side. Eight-way input is still supported by mapping diagonals to an appropriate facing initially.
- Character size target for first art test: **64x64 transparent PNG frame canvas**; align feet to a constant pivot. The 64x64 is a **test frame size, not a mandated body pixel height**. Evaluate readability at actual in-game integer zoom before approving. Keep map tiles nominally 32x32 pending the first visual test.
- Separate portrait/concept art from **real in-game sprite assets**. Do not shrink a large portrait to create gameplay sprites; redraw appropriate pixels and silhouette at gameplay scale.
- Distinct deliberate attack key poses with anticipation, contact/hit, recovery; avoid a static idle sprite sliding across the screen as an 'animation'. Frame-by-frame sprite motion should look purposeful. VFX are separate animated assets or original pixel-based particle effects, never blurred vector crescents.
- Default school palettes: Võ Đang black/white/charcoal/silver with clean Yin–Yang white/pale-blue energy; Cái Bang red/orange Fire; Thiên Sơn cyan/white Wind; Thiếu Lâm golden/yellow Gold. School palettes must be recognizable at the small game scale.
- Environments: square-aligned RPG tiles, stone pathways, East Asian / wuxia architecture, bamboo and trees; layered foreground occlusion, correct foot-based Y-sort and collisions independent of sprite art.
- Keep pixels crisp: nearest-neighbor texture sampling, no smoothing, no blurry resizing, preferably integer zoom. Avoid rescaling pre-rendered sprite frames inconsistently.

## Hero-first prototype and approval gate (MANDATORY)
1. **Inspect** `assets/references/vo_dang_art_direction_reference.png` and write a short art-readout about proportions, linework, palette, perspective, and attack poses before creating anything.
2. Produce a **single Võ Đang gameplay character candidate** with matching look (not all schools at once): four facing idle sprites and four facing walk animations, plus **one Quyền attack and one Kiếm attack**, with white Yin–Yang / sword-qi VFX. Keep white belt/hair ribbon consistent. If actual original hand-pixelled sprites are unavailable, **stop and report asset-creation needs**; do not silently replace them with geometric placeholders and report art completed.
3. Keep editable source art (e.g. `.aseprite`/`.ase`, layered source when available) under `assets/source/characters/`; export individual transparent PNGs or spritesheet PNG + JSON atlas under `assets/exports/characters/` and effects under `assets/exports/effects/`. Add complete frame dimensions, direction/tag names, origin/pivot, provenance and status to the asset manifest.
4. Set up one small Phaser **visual-test scene**: walking on a 32x32 tiled path beside a tree/building, in all four facings, with NPC/creep scale reference; show idle, walk, normal Quyền and Kiếm attacks, and non-homing sword-qi VFX.
5. Capture screenshots of the real game at **1x logical size and the actual intended camera zoom**, plus a short recording/sprite-strip if feasible. Explicitly compare to the reference and show the game director the result for approval **before** generating a full skill animation set or more school characters.
6. Record an honest check: `APPROVED`, `NEEDS REVISION`, or `PLACEHOLDER`. **Do not call art approved without explicit user approval**. A runnable scene with placeholder art satisfies engineering smoke tests but does NOT satisfy visual-art acceptance.

## What to avoid
- Auto-generated low-quality sprites made from Phaser `Graphics` primitives, ASCII geometry, circles, basic rectangles or generic clip-art while claiming reference-level art.
- Synthetic 'animation' via only scaling/rotating/bobbing a still image; these may be temporary effects but do not replace the requested walking and attack frames.
- Cropping sprites from the whole reference sheet; its sample frames, labels, and layout are presentation-only and not a production spritesheet.
- Generating dozens of inconsis­tent AI frames in one go. Frame continuity, head shape, hairstyle, clothing silhouette, footwear, weapon, palette and pivot need explicit inspection and cleanup.
- Switching to side-on combat view, a 3D avatar, or an isometric terrain grid for skill scenes.

## Practical fallback if tooling cannot paint high-quality pixel art
Codex should create the asset pipeline, choose an original/licensed sprite set that **actually matches this art direction**, or prepare a brief and individual sprite requests for an image generator / pixel artist. Codex can make cropping/export/metadata/animation code, but code alone does not guarantee production-grade pixel illustrations. Ask for art review rather than fabricating completion.

## Suggested initial sprite tags
`idle_down`, `idle_up`, `idle_left`, `idle_right`, `walk_down`, `walk_up`, `walk_left`, `walk_right`, `attack_quyen_down`, `attack_kiem_down`; later add more directions and `hurt`, `death`, `cast_*`. Separate game state combat timing from graphics frame timing.

## v1.4 Expanded reference images and UI layout

- `assets/references/cai_bang_character_reference.png` — approved style direction for Cái Bang sprite concept.
- `assets/references/thien_son_thieu_lam_character_reference.png` — approved style direction for Thiên Sơn and Thiếu Lâm sprite concepts.
- `assets/references/vo_dang_art_direction_reference.png` — existing Võ Đang sprite style concept.
- `assets/references/in_game_world_reference.png` — desired *world occupies the view* composition and detailed wuxia environment. Its exact UI arrangement is not mandated.
- `assets/references/current_codex_dashboard_anti_reference.png` — **negative UI reference**: small playfield plus exterior right-side web-app cards; must be refactored away for actual matches.

Follow `UI_UX_SPEC.md` for mandatory HUD/menu positioning **within** viewport. Concepts aren't tested animation sheets or commercial production assets.


## v1.5 Expanded world/menu concept references

The following **additional visual references are approved directionally** and should be inspected before creating production scenes, HUD, overlays and environment art. They are **concept references**, not exact production maps to copy tile-for-tile. Use them to guide composition, detail density, color, dungeon themes and in-game UI placement.

### World / scene references
- `assets/references/central_arena_hub_reference.png` — central arena / hub composition with statue, portal, merchant and PvP area visible in one full-screen world view.
- `assets/references/arena_battle_reference.png` — full-screen arena combat scene and HUD composition reference.
- `assets/references/forest_dungeon_reference.png` — forest dungeon mood, density, bridges, water and enemy distribution.
- `assets/references/desert_dungeon_reference.png` — desert / ruin dungeon mood, merchant placement and broad battlefield readability.
- `assets/references/sea_dungeon_reference.png` — beach / harbor / ocean dungeon mood and encounter readability.
- `assets/references/hell_dungeon_reference.png` — inferno / hell dungeon mood, lava, chains, vertical spectacle and enemy density.
- `assets/references/wuxia_town_world_reference.png` — beautiful detailed overworld/town dressing and environment quality target.

### In-game UI/menu references
- `assets/references/dungeon_selection_menu_reference.png` — desired in-game dungeon selection overlay style.
- `assets/references/merchant_shop_menu_reference.png` — desired in-game merchant/shop overlay style.
- `assets/references/inventory_menu_reference.png` — desired in-game inventory/equipment overlay style.

### Interpretation rules
- The game viewport should remain dominant and show the world behind overlays.
- Menus should feel like **integrated game UI windows**, not web admin panels.
- Use the references to set **visual ambition** for scene richness, but scale implementation sensibly for gameplay readability and production scope.
- Preserve the previously locked character direction for Võ Đang, Cái Bang, Thiên Sơn and Thiếu Lâm.
- Do not treat text labels, exact numbers, or UI copy in the images as final game data; only the **visual language and layout pattern** are being approved here.

## v1.6 Current runtime screenshot — quality anti-reference

`assets/references/current_game_2026_10_29_placeholder_anti_reference.png` is the latest actual prototype screenshot and is a **NEGATIVE visual-quality reference**. Its full-screen HUD is a correct *direction for placement* but its heroes, props, trees, repeated stone tiles, effects and UI textures are NOT acceptable visual quality. Consult `ART_PRODUCTION_STANDARD.md` before any further art expansion. Positive concepts remain concept references, not ready-to-load sprite atlases.
