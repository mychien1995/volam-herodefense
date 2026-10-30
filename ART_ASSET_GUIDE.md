# Pixel Art and Animation Pipeline — v1.3

## Current arena/card revision — 2026-10-30

The current loader supersedes the earlier ART-01 ground with `assets/exports/arena_v2/ground.png`, preserving approved actors and existing statue/prop/ambient exports. Six editable Aseprite sources under `assets/source/arena_v2/` and `assets/source/dungeon_cards/` produce the ground, four 32px paving variants and four separate 512×768 static card illustrations. `pnpm assets:export:visual` re-exports edited sources; `pnpm verify:assets` validates them. `assets/arena_v2.manifest.json` records source hashes, layers, pivots and verification status. Card UI text/control frames remain DOM components. New raster components were originally generated with built-in image_gen and prepared/exported using Aseprite 1.3.18.6; no original layers were recovered from a flattened concept. Runtime director approval remains pending.

## ART-01 arena and HUD production candidate — 2026-10-30

The current candidate has nine editable Aseprite sources in `assets/source/arena_art01/` and committed PNG/JSON exports in `assets/exports/arena_art01/`. `pnpm assets:export:arena` re-exports artist-edited sources without regenerating them; `pnpm verify:assets` validates both the approved actors and this candidate. See `assets/arena_art01.manifest.json` for per-component produced/integrated/runtime-verified status, and `docs/ART01_RUNTIME_REVIEW.md` for actual browser evidence. Runtime director approval remains pending; this does not approve other maps/schools or replace the approved Cái Bang baseline.

## Approved initial character baseline — 2026-10-30

The user approved the current Cái Bang Bổng/Chưởng authored idle/walk/normal attacks as the initial visual quality baseline. Actual conventions supersede earlier proposed character dimensions for this baseline: 80×80 transparent canvases, approximately 44px bodies, feet at (40,64), four directions, `{state}_{direction}_{tagframe}` names and Aseprite hash JSON with frame tags/pivot slice. Idle: 2×350ms; walk: 4×120ms; basic attack: 4×75ms, except Bổng side sweeps 6×50ms. Nearest filtering, camera zoom 1 and usual desktop display scale 2. Larger imported art needs its own canvas/pivot and scale review, not forced resizing. Cast/hurt/death aliases remain outside authored approval.

Preserve approved source/export bytes in `assets/approved_cai_bang.lock.json`. For Gemini batches use `ASSET_INVENTORY.md`, `assets/intake/character_template.json`, `assets/intake/README.md` and `scripts/asset-intake.py`. A painted checkerboard is not alpha. Staging never installs unreviewed assets into runtime; first-batch scene approval remains separate from character approval.

**PRIMARY ART REFERENCE:** `ART_DIRECTION_REFERENCE.md` and `assets/references/vo_dang_art_direction_reference.png` now define the required **detailed chibi wuxia pixel-art style**. The original image is a concept sheet, not a usable runtime spritesheet. The style and character silhouettes must be approved in a one-hero prototype before bulk asset creation.

**CONFIRMED art direction:** classic Pokémon-style **2D pixel art with an orthographic, elevated/top-down three-quarter overworld camera**. The player views the character and surrounding map from above at a slightly angled perspective; the character's body/face and the fronts of structures remain visible. This is sometimes informally called "third-person from above"; it is **not** a 3D third-person chase camera, not a directly overhead bird's-eye view showing only heads, not an isometric diamond-grid game, and not a side-view platformer.

This guide separates **creating art** from **integrating art**. Codex can implement the asset pipeline, animation loader and tests, and it can create simple original temporary sprites. It must **not** report that finished character artwork exists until actual files exist and have been visually reviewed.

## Scope and staged delivery

- **M0:** game boots with a procedurally generated shape/placeholder in a static orthographic overhead 2D scene, with a fixed, non-rotating top-down/three-quarter view. Configure pixel-art-friendly rendering. No artist-quality sprites required.
- **M1:** first seek visual approval for the 4-direction Võ Đang sample described in `ART_DIRECTION_REFERENCE.md`; game-core may still use a Cái Bang prototype, but do not claim finished art without approval. Implement and verify a complete minimal animation loop for **one Cái Bang hero and one creep** using original sprites or clearly labeled prototype artwork: idle, move, basic attack, hurt, death; plus one skill effect. Demonstrate player-follow camera and correct Y-sorting/occlusion around at least one tree or building. If sprites are unavailable, use programmatic placeholder frames and mark the art acceptance item OPEN. Do not block networking/combat on art generation.
- **M2–M5:** add required maps, enemy/boss telegraphs, effect timings and portrait/icon placeholders when their features arrive. Content logic must not depend on whether illustrations are complete.
- **M6+:** review original art style, refine sprites, VFX and environment in coherent batches. Avoid bulk-generating unreviewed sprites for all 43 skills.

## Locked view, camera and scene composition (CONFIRMED perspective)

- Use **orthographic 2D tile-based top-down / three-quarter overworld presentation** like a classic Pokémon GBA overworld, reimagined with original wuxia-themed art, weapons, animations, and effects. Show a character's head and front/side body, not only a circular top of the head.
- Gameplay camera follows the local player across a 2D map, with a consistent zoom; **no camera rotation, pseudo-3D tilt, 3D terrain, oblique perspective tricks, side-scrolling, or isometric diamond tiling**. Camera framing may keep the player centered or slightly offset for visibility, but keep projection consistent in arena, dungeons, and PvP.
- Terrain uses square, axis-aligned tiles. Buildings, rocks, trees and scenery can show front/side faces using layered 2D sprite art while collision remains defined on the ground plane.
- Render Y-depth by each character's **feet/ground contact point**, not sprite top-left. Arrange foreground layers so a player passes **behind a tree canopy/roof/wall front** and **in front of its base** where appropriate; the visual overlap must not change server collision.
- Define an explicit sprite origin at bottom-center/feet, plus a smaller gameplay collision footprint. Keep vertical offset for tall bodies, hats, weapons and spell effects; do not use the full sprite rectangular extent as the collision body.
- Movement is eight-directional with arrow keys (including diagonals). **Initial animation proposal:** up/down/left/right walk and idle, mapping diagonal motion to a consistent nearest or most recently pressed facing; later add eight-direction animation if valuable. Basic attacks and skill effects should match visual facing, never change server combat vectors.
- Prefer nearest-neighbor sampling and **integer camera zoom** when possible (e.g. 2x or 3x), plus consistent pixel rounding to avoid shimmering; validate actual Phaser 4 settings with the installed version. Make the full arena readable at the chosen viewport, including enemies approaching from two sides and the statue health/timer UI.
- Keep the camera perspective, tile projection and sprite scale **unchanged across character school, dungeon and PvP scenes**. Separate UI overlays from scrolling map layers.
- Build an M1 visual proof with a ground tile grid, at least one visually layered tree or building, the player's 4-direction sprite, one creep, and camera following movement. Manually inspect walking above/below scenery, diagonals, sprite facing, animation crispness, NPC interaction, and visible combat range.

## Art direction and dimensions (initial proposals)

- Aesthetic: **original wuxia-inspired** Pokémon-like pixel-art presentation. Do not reuse Warcraft III, Pokémon or copyrighted custom-map assets.
- Logical terrain tile: **32×32 px**. This is a proposal; changing it later requires changing maps and collision conventions coherently.
- Character frame **48×48 or 64×64 px** as needed for weapons/robes; **not** identical to the collision footprint. Pick one standard per character family before finalizing a sheet.
- Character movement is 8-directional. Initially draw **four facing directions** (up/down/left/right) and map diagonals to a nearby facing; revisit 8-way animations after playtesting.
- Choose consistent foot/pivot origin (e.g., bottom center), scale, silhouette, and palette across a class's animations. Character appearance must not shift between frames.
- Suggested animation states per facing: `idle`, `walk`, `basic_attack`, `cast`, `hurt`; `death` may use a shared direction if artistically acceptable. Example starting ranges: idle 4 frames, walk 6–8, attack 4–6, cast 4–6, hurt 2–3, death 4–6. These are **proposed targets**, not required counts.
- Effects can have other frame sizes, but every sheet must declare frame rectangles, durations/frame rate and events; include attack hit-time metadata separately from sprite artwork.
- Use nearest-neighbor-friendly rendering and integer scaling where appropriate. In Phaser 4 inspect the installed version's actual `pixelArt`/`roundPixels` settings and avoid fuzzy sprite scaling. Consider pixel jitter when camera follows interpolated positions.
- **Never** derive damage or authoritative hit timing from the client animation. Combat events from the server drive effects; animation may be predicted for responsiveness but is reconciled.

## Source files and runtime assets

```text
assets/
  README.md                     # guidance and manifest policy
  manifest.example.json        # asset metadata template
  source/                      # editable sources (.aseprite/.ase, layered originals, map sources)
    characters/
    enemies/
    effects/
    tilesets/
    items/
    ui/
  exports/                     # generated PNG sheets + JSON atlases (may be rebuilt)
    characters/
    enemies/
    effects/
    tilesets/
    items/
    ui/
  audio/                       # appropriately licensed or original music/SFX
maps/                          # editable Tiled sources and exported JSON, per technical architecture
apps/game-client/public/assets/ # copied/bundled client-ready files by build tooling
```

Keep editable sources in Git when size/licence permits; version exports needed to run the game or make them reproducibly generated by a documented build command. No absolute Windows paths in committed metadata. Audio licensing/provenance must be tracked as well.

## IDs, file names and frame metadata

- Filenames and runtime IDs use ASCII snake_case, e.g. `cai_bang_chuong_walk_down.png`; on-screen names remain correctly accented Vietnamese.
- Prefer one Aseprite source file per character/style with **named animation tags**, named layers, frame durations, and a documented export command. One atlas JSON + PNG per manageable asset group is sufficient.
- Use stable IDs such as `hero_cai_bang`, `creep_runner`, `vfx_fireball_impact`. A style skin/sprite cannot silently modify attack range, cleave, facing or collision.
- Store a manifest entry recording asset id, category, source file, exported file paths, attribution/license, animation tags/directions, dimensions, pivot, and status (`placeholder`, `prototype`, `approved`). See `assets/manifest.example.json`.
- Data-driven `animationId -> asset/tag` mappings should live in the client presentation layer, separate from combat skill IDs and status-effect rules.

## Example Aseprite CLI workflow (optional tool)

If Aseprite is installed, Codex may automate exports using its CLI. Example (adapt paths to repo and Windows):

```powershell
aseprite.exe -b assets/source/characters/cai_bang.aseprite --sheet assets/exports/characters/cai_bang.png --data assets/exports/characters/cai_bang.json
```

Do not claim this works if Aseprite is not installed. Aseprite's CLI supports sprite-sheet PNG + JSON exports; verify flags and JSON format against the installed version: https://aseprite.com/docs/cli/

For Tiled maps, keep editable map sources and export JSON plus tile images. Explicitly define `collision`, `spawn_west`, `spawn_east`, `statue`, `npc`, and `portal` object/layer conventions, verified against real maps.

## Quality gates for each asset batch

1. Verify source exists and license/provenance is recorded; no watermark or unlicensed scraped art.
2. Load actual PNG and animation data in the running Phaser 4 client; no missing texture, missing frame tag, transparent-only sheet or invalid dimensions.
3. Test all present directions and actions, including rapid movement changes, casting and overlapping effects. Animations should not jump, stretch, jitter or face backwards.
4. Confirm hitboxes and projectile trajectories stay controlled by the authoritative simulation; sprite dimensions never change combat reach.
5. Screenshot and/or record the playable scene in a browser when tools permit. Report actual inspected assets and mark missing art as placeholders; never invent visuals or claim successful testing without inspecting them.
6. Keep file size and texture count reasonable for six players plus multiple waves; measure performance rather than inventing targets.

## Open art decisions for the game director

The **2D top-down/three-quarter Pokémon-like overworld perspective is confirmed** and not an open decision. Fine palette details, exact sprite footprint (test 64 px before approval), concrete 32px tile assumption, four- versus eight-direction *artwork*, animation frame budget, exact zoom/resolution, final art production workflow, and commercial asset licenses remain **open/proposed**. Codex may propose temporary defaults but must not mark them approved.

## Useful official references

- Phaser 4 pixel-art renderer guidance: https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md
- Aseprite CLI: https://aseprite.com/docs/cli/
- Tiled JSON export: https://docs.mapeditor.org/en/latest/manual/export-generic/

## Art of the game interface — v1.4

School art references: `assets/references/cai_bang_character_reference.png`, `thien_son_thieu_lam_character_reference.png`, `vo_dang_art_direction_reference.png`. World reference: `assets/references/in_game_world_reference.png`. **Bad layout example**: `assets/references/current_codex_dashboard_anti_reference.png` (map boxed into left and HTML dashboard to right). All images are style references, not validated sprite atlases.

Create UI art suitable for a chibi wuxia pixel-art game: hero portraits, compact stat bars, icon hotbar, item icons/grids, readable framed NPC windows. Prefer original/licensed graphical borders and clear pixel-art icons. HUD must live above the world **within the game viewport**, with readable Vietnamese text and closeable in-game windows. No need for all UI to be authored as Phaser sprites; HTML/CSS modal views over the canvas are allowed as long as they stay within the viewport and match the game look. See `UI_UX_SPEC.md`.

## v1.6 Art quality approval rule

The art pipeline's acceptance conditions are now defined in `ART_PRODUCTION_STANDARD.md`. A Phaser scene built from procedural placeholders is sufficient only for engineering smoke tests and **cannot count as production artwork**. Prove final quality first on one illustrated playable arena slice. The current screenshot is archived as `assets/references/current_game_2026_10_29_placeholder_anti_reference.png`. UI/HUD placement alone does not pass art review.
