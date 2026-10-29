# Pixel Art and Animation Pipeline — v1.2

This guide separates **creating art** from **integrating art**. Codex can implement the asset pipeline, animation loader and tests, and it can create simple original temporary sprites. It must **not** report that finished character artwork exists until actual files exist and have been visually reviewed.

## Confirmed v1.2 perspective (user update, 2026-10-29)

Original 2D pixel art uses a Pokémon-style **elevated top-down / three-quarter perspective**, referring only to viewpoint and readability. The world is an **orthographic square-tile 2D RPG**. No isometric projection, side-scrolling, rotating camera or 3D third-person view.

The camera follows the local player without rotating. Movement supports eight directions; the initial character artwork has four facings, with diagonals mapped consistently to a nearby facing. Characters use a common foot pivot. Ground tiles render below actors; trees/buildings sort by their ground contact Y so players can walk behind foreground foliage/roofs. Collision footprints stay independent of sprite silhouettes. Use crisp nearest filtering, rounded presentation coordinates and integer display scales.

The first playable proof includes a hero, a creep, terrain tiles and an occluding tree/building. Carry the same palette, scale, perspective and layering conventions into later arena, dungeon and PvP content. Those later features are not part of this visual update. Artwork remains prototype until reviewed; final palette and detailed designs remain open.

## Scope and staged delivery

- **M0:** game boots with a procedurally generated shape/placeholder. Configure pixel-art-friendly rendering. No artist-quality sprites required.
- **M1:** implement and verify a complete minimal animation loop for **one Cái Bang hero and one creep** using original sprites or clearly labeled prototype artwork: idle, move, basic attack, hurt, death; plus one skill effect. If sprites are unavailable, use programmatic placeholder frames and mark the art acceptance item OPEN. Do not block networking/combat on art generation.
- **M2–M5:** add required maps, enemy/boss telegraphs, effect timings and portrait/icon placeholders when their features arrive. Content logic must not depend on whether illustrations are complete.
- **M6+:** review original art style, refine sprites, VFX and environment in coherent batches. Avoid bulk-generating unreviewed sprites for all 43 skills.

## Art direction and dimensions (initial proposals)

- Perspective: top-down/three-quarter pixel art, readable at gameplay zoom, **original wuxia-inspired** aesthetic. Do not reuse Warcraft III, Pokémon or copyrighted custom-map assets.
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

Final palette, character sprite footprint (48 vs 64 px), later eight-direction *artwork*, animation frame budget, final commissioned/AI-assisted art production workflow, and commercial asset licenses remain **open**. Codex may propose temporary defaults but must not mark them approved.

## Useful official references

- Phaser 4 pixel-art renderer guidance: https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md
- Aseprite CLI: https://aseprite.com/docs/cli/
- Tiled JSON export: https://docs.mapeditor.org/en/latest/manual/export-generic/
