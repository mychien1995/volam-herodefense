# Visual Production Standard and Art Approval Gate — v1.6

## 0. Status and purpose

**Confirmed art-direction requirement, not a provisional suggestion.** The game must eventually match the *visual level and composition language* of the director's provided references (`assets/references/`). An attractive rendered reference is not equivalent to runtime art. A compiled or playable Phaser scene with primitive/generated placeholders is **not** an art milestone and cannot be described as visually complete.

The latest screenshot `assets/references/current_game_2026_10_29_placeholder_anti_reference.png` is a **NEGATIVE visual-quality reference**: it has a better full-viewport HUD placement than the previous dashboard, but the world, characters, props, and visual effects are flat, sparse, repetitive placeholder art. Keep its working functionality and HUD structure while replacing its underlying asset presentation in a controlled art milestone. Do not copy its style.

### Positive references and priority

1. `cai_bang_character_reference.png`, `vo_dang_character_reference.png`, `thien_son_thieu_lam_character_reference.png`: **gameplay character silhouettes, costumes, expressive pixel detail and animation-pose direction**. Character concept sheets are NOT valid frame atlases.
2. `wuxia_town_world_reference.png`, `central_arena_hub_reference.png`: **detailed wuxia environment / art density / coherent perspective / building dressing / natural environment**.
3. `arena_battle_reference.png`, `forest_dungeon_reference.png`, `desert_dungeon_reference.png`, `sea_dungeon_reference.png`, `hell_dungeon_reference.png`: **theme and scene composition**. These are visual targets, not functioning tile maps.
4. `inventory_menu_reference.png`, `merchant_shop_menu_reference.png`, `dungeon_selection_menu_reference.png`: **ornate, readable, in-viewport HUD and modal UI**. Exact copy and exact UI item counts are NOT required.
5. `current_game_2026_10_29_placeholder_anti_reference.png`, `current_codex_dashboard_anti_reference.png`: negative references; different issues (visual quality versus layout).

## 1. Hard artistic constraints

- **Detailed, hand-finished 2D chibi wuxia pixel art** in a stable orthographic, elevated top-down/three-quarter RPG view. Not minimal 8-bit procedural art, flat vector artwork, block characters, isometric grids, 3D models or an upscaled concept screenshot pretending to be a game map.
- The final game must use authored, original or appropriately licensed **PNG spritesheets/atlases, tilesets and UI icon assets**, with source/provenance recorded. Phaser Graphics may be used for collision debugging and TEMP placeholders, not final hero/environment/UI art.
- Characters: distinct head/hair silhouette; readable facial expression and layered wuxia clothing; consistent palette from all four facings; properly planted feet; repeatable pivot/scale across frames; deliberate idle/walk/attack poses, not motion of a static image.
- World: varied coherent stone pathways, grass edges, architectural façades, foliage, lighting/shadows and props at an intentional shared pixel scale. Avoid repeating one large uniform ground tile across the entire arena, big blank patches or trees made only of simple green blobs.
- Ability VFX: separately authored directional slash/palm/element animations, with school colors. Do not use giant blurred circles as finished skills. Preserve non-homing projectile and authoritative hitboxes.
- HUD: one screen-filling world, in-viewport overlays. The HUD should be ornate but should not dominate or obscure combat. Fonts must render Vietnamese diacritics correctly.
- Screenshots must be judged at **actual normal gameplay zoom (including six-player readability)**. Test sprite detail at intended viewport, not just when zoomed in on a portrait. 32px tile / 64px canvas are experimental hypotheses, not reasons to reduce art quality; adjust tile/sprite art density together if necessary.
- Concept references are AI/concept compositions and may use visual embellishments that cannot simply be turned into scalable tilemaps; reconstruct coherent layered environments rather than cropping them into a single giant background with fake collisions.

## 2. Mandatory production sequence — no more full-map placeholder expansion

**Before implementing new schools, dungeon art or major maps, complete ONE art-quality vertical slice.** Engineering milestones may continue with tagged placeholders only if the director explicitly prioritizes them, but Codex must not label placeholder visuals as satisfying art acceptance.

### Phase A: inventory and audit existing art (no code changes)
- Enumerate runtime texture sources in the repository and classify each: external licensed/original imported PNG, generated PNG, programmatic Phaser Graphics/RenderTexture, CSS/SVG, placeholder, or missing.
- Identify where current player, creep, tree, ground, buildings, portal, NPC, HUD and skill icons originate. Show actual paths and loading usages; do not guess.
- Inspect positive references and write an evidence-based difference report (character detail, palette, composition, environment variation, UI textures, motion).
- List blockers, including whether an image-generation/art-capable tool or pixel artist is needed. **Never claim Codex can paint production-quality art solely by writing Phaser code.**

### Phase B: produce one complete high-quality scene asset set
- One test scene (20–30 seconds of representative gameplay) with: 1 Cái Bang hero in four facings, walk, basic Bổng or Chưởng attack; 1 distinctive creep; 1 merchant NPC; a detailed stone-path tileset with edge/transition variants; 1 building/stall; 2 visually distinct trees/foliage sets; one projectile/slash VFX; 1 icon + UI frame sample.
- Use real transparent source assets and separate exports. Document provenance and source/license. Accept original generated assets only when visually cleaned up and animation frame continuity verified; use a sprite editor or artist for cleanup when necessary.
- Set unified palette, perspective, tile art scale, character foot pivot, collision layer and Y-depth rendering. Make a small readable environment, not a random assembly of icons.

### Phase C: import and visual approval
- Integrate the above assets in the real Phaser client and run the existing multiplayer + input code without altering authoritative game rules.
- Provide PNG sprite atlas + metadata, individual asset previews, 1x game-resolution screenshot, target-display screenshot, animation test capture and a simple `assets/ASSET_MANIFEST.md` (file, type, source/license, dimensions, animation tags, status).
- Compare actual screenshots side by side against the **positive art references** and the **latest anti-reference screenshot** in a short review document. Explicitly describe remaining mismatches.
- Director must approve visual direction (`APPROVED`) before Codex propagates that character/tileset/UI style across the other schools and maps. If no artist/tool can produce sufficient assets, pause art production and report required inputs instead of filling the map with procedural shapes.

## 3. Visual acceptance checklist

- [ ] Actual game screenshots have authored character sprites, not procedural colored rectangles.
- [ ] Character has visually coherent four-direction idle/walk plus one proper attack; no frame drift, foot sliding or inconsistent clothing.
- [ ] At actual target zoom, character face/costume/weapon are distinguishable; character is proportionate to NPC, trees and buildings.
- [ ] Terrain has intentional variation and transitions; at least two distinct foliage silhouettes and one coherent architectural object, all in the same art style.
- [ ] Lighting, shadow, depth and character occlusion work; the ground is not a giant repeated uniform tile grid.
- [ ] One skill demonstrates an original style-matching effect and correctly follows authoritative hit timing.
- [ ] HUD/modal placement remains in-viewport and uses appropriately styled icon/frame assets; UI no longer looks like a debug panel.
- [ ] Screenshot comparison is actual, with links to source files and honest placeholder status.
- [ ] Existing game mechanics/networking tests still pass; visuals do not change server-authoritative calculations.
- [ ] Director has approved the actual running visual test at normal gameplay zoom.

## 4. Technical implementation notes

- **Keep Phaser 4:** it provides a 2D renderer and animation/tilemap pipeline; switching engines does not generate better art.
- Use Aseprite (or equivalent) to maintain source art and export spritesheet PNG + JSON frame metadata; tiles and environment art can be authored in Tiled (or equivalent) and exported as runtime-readable layers.
- Use nearest-neighbor/pixel-art-friendly texture filtering and pixel-aligned rendering where appropriate, but do not confuse a clean pixel-sampling setting with good asset design.
- Preserve server authority. World sprites, particles and UI are rendering/presentation concerns; collisions and damage are simulation concerns.
- Do not require all original concept images to be literal tilemaps. Aim for comparable richness, cohesive scale, lighting and readability.
