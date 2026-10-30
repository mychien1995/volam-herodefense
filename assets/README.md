# Art and audio assets

**No finished game artwork is supplied in this handoff.** The handoff documents are specifications and sample data. The assets in `assets/` become real as Codex or artists add original / appropriately licensed content.

- Editable art source: `assets/source/`
- Exported art: `assets/exports/`
- Client deployable copy: `apps/game-client/public/assets/` (when game code exists)
- Maps: `maps/` (Tiled JSON and source)
- Audio: `assets/audio/`
- Asset provenance: maintain a manifest based on `assets/manifest.example.json`.

Read `ART_ASSET_GUIDE.md` and use `.agents/skills/pixel-art-pipeline/SKILL.md` when importing/animating assets.

## v1.6 Cái Bang candidate (supersedes the hero details below)

The hero now has separate editable Aseprite Bổng and Chưởng sources and original AI-generated raster poses: 44 Bổng frames (six-pose side sweeps) and 40 unarmed Chưởng frames, each with 12 authored tags, transparent 80×80 canvases and foot pivot (40,64). Both were **APPROVED as the initial visual quality baseline on 2026-10-30**. Their source/export bytes are protected by assets/approved_cai_bang.lock.json. Other artwork remains the procedural placeholders described below. Cast/hurt/death reuse poses and are not newly authored animation sets.

See `ASSET_MANIFEST.md`, `ART_AUDIT_2026_10_29.md`, `source/characters/cai_bang_v1_6/README.md` and `reviews/cai_bang_v1_6/REVIEW.md` for provenance, prompts, source/export instructions and actual Phaser evidence. `node scripts/export-cai-bang.mjs` re-exports the editable source without replacing manual cels. The old primitive generator is guarded against overwriting this hero.

## M1 actual original prototype set (historical)

`manifest.json` describes **real** exports: `hero_cai_bang`, `creep_outlaw`, terrain, tree and fire effect. Each character has 96 PNG atlas frames (six states × four facings × four frames). Editable source is the original deterministic `source/m1_art.py` script; no borrowed assets, external sprite packs or proprietary game content are used. This is simple prototype artwork, not approved final art.

`pnpm assets:generate` optionally regenerates exports using Pillow 11.3.0. `pnpm verify:assets` checks every nonempty frame, dimensions, bounds and provenance. Normal dev/build needs only committed exports and copies them to ignored client public assets. The map is `maps/arena.tmj`; `scripts/prepare-assets.mjs` feeds identical map JSON to the client and shared validated server data. Browser animation gallery: `/?artPreview=1`.

v1.2 perspective is confirmed: orthographic square tiles, elevated top-down characters, non-rotating follow camera, eight-way movement/four-facing animation, foot-Y scenery depth and foreground canopy occlusion. Use this same convention for future arena/dungeon/PvP content. Palette/detail and final art approval remain open. See `docs/M1_VERIFICATION.md` for actual browser evidence.

## v1.5 UI/environment prototypes

The existing character sheets remain unchanged. `source/ui_world.py` adds original UI icons, destination thumbnails, merchant/gate/statue/lantern/bamboo/bridge/water/foliage studies and refreshed terrain/tree textures. All remain **prototype**, not approved final art. The approved direction PNGs live only in `references/` and are excluded from client assets. See `references/README.md` for actual image contents and packaging discrepancies. The forest composition is presentation-only, with no implemented dungeon gameplay.
