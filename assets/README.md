# Art and audio assets

**No finished game artwork is supplied in this handoff.** The handoff documents are specifications and sample data. The assets in `assets/` become real as Codex or artists add original / appropriately licensed content.

- Editable art source: `assets/source/`
- Exported art: `assets/exports/`
- Client deployable copy: `apps/game-client/public/assets/` (when game code exists)
- Maps: `maps/` (Tiled JSON and source)
- Audio: `assets/audio/`
- Asset provenance: maintain a manifest based on `assets/manifest.example.json`.

Read `ART_ASSET_GUIDE.md` and use `.agents/skills/pixel-art-pipeline/SKILL.md` when importing/animating assets.

## M1 actual original prototype set

`manifest.json` describes **real** exports: `hero_cai_bang`, `creep_outlaw`, terrain, tree and fire effect. Each character has 96 PNG atlas frames (six states × four facings × four frames). Editable source is the original deterministic `source/m1_art.py` script; no borrowed assets, external sprite packs or proprietary game content are used. This is simple prototype artwork, not approved final art.

`pnpm assets:generate` optionally regenerates exports using Pillow 11.3.0. `pnpm verify:assets` checks every nonempty frame, dimensions, bounds and provenance. Normal dev/build needs only committed exports and copies them to ignored client public assets. The map is `maps/arena.tmj`; `scripts/prepare-assets.mjs` feeds identical map JSON to the client and shared validated server data. Browser animation gallery: `/?artPreview=1`.

v1.2 perspective is confirmed: orthographic square tiles, elevated top-down characters, non-rotating follow camera, eight-way movement/four-facing animation, foot-Y scenery depth and foreground canopy occlusion. Use this same convention for future arena/dungeon/PvP content. Palette/detail and final art approval remain open. See `docs/M1_VERIFICATION.md` for actual browser evidence.
