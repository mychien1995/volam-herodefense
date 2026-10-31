# Beach Dungeon / Bờ Biển — Phase 2C asset handoff

Asset production only, 2026-10-31. Concepts are automatically approved under the current task. Production exports are staged; nothing is registered, loaded or integrated into Phaser. No gameplay/runtime files, other dungeon artwork, browser sessions, recordings or screenshot evidence were changed or created.

## Environment

- Concepts and layout: `assets/concepts/dungeon-environments/beach/environment_concept_v01.png` and `layout_concept_v01.png`. The layout is a visual reference, **not a playable map**.
- Terrain: `assets/tilesets/beach/terrain.png`, `terrain.json`, `terrain.tsj`; 512 square 32×32 tiles, zero-based local IDs. Individual tiles: `tiles/`; authored periodic material samples: `materials/`; editable source: `source/terrain_v01.aseprite`.
- Six transition families cover sand/wet sand/water/deep water/rock/stone/grass. Metadata declares NW/NE/SE/SW corner masks and phase order. Foam is a separate transparent overlay family. Uniform foam masks0/15 are intentionally empty.
- Water animation metadata uses four phase-shifted authored texture samples, 180ms each; these are not four independently redrawn water cels.
- Props: `assets/sprites/environment/beach/`. Twenty-five individual transparent PNGs plus `scenery.png` / `atlas.json` / `manifest.json`: two palms, bush, grass, coastal rocks, cliff, coral, shells, driftwood, broken boat, shipwreck bow/mast, barrel, crate, fishing net, rope, pirate tent/camp supplies, bridge, dock pillars, coastal ruin, lantern, banner, entrance and exit portal. Individual dimensions and pivots are in the manifest.
- Portals: `dungeon_entrance.png`, `dungeon_exit_portal.png`. Exit is a **static** complete source phase; no stable portal loop is claimed.

## Enemies

Concepts: `assets/concepts/dungeon-creeps/beach/`, including `bestiary_concept_v01.png` and six individual `{id}_concept_v01.png` turnarounds, attack pose, palette and hero-scale reference.

Each production set is `assets/sprites/creeps/dungeons/beach/{id}/`, with `spritesheet.png`, `atlas.json`, `manifest.json`, 64 individual PNGs under `frames/`, and editable `source/{id}_v01.aseprite`.

| ID | Vietnamese name |
|---|---|
| `cua_khong_lo` | Cua Khổng Lồ |
| `hai_xa` | Hải Xà |
| `hai_tac` | Hải Tặc |
| `hai_tac_hoa_phao` | Hải Tặc Hỏa Pháo |
| `thuy_quy` | Thủy Quỷ |
| `hai_vu` | Hải Vu |

Every facing (`down`, `left`, `right`, `up`) has `idle`2×350ms, `walk`4×120ms, `basic_attack`4×100ms, `hurt`2×140ms and `death`4×170ms. Names: `{state}_{direction}_{index}`. Hash-atlas rectangles are authoritative; actor atlases pack ten columns of144×128 canvases, feet at(72,106), origin(0.5,0.828125). Humanoid body target48px versus approved hero44px; crab width64px. No per-pose fit scaling.

Gunner `aim` / `fire` and shaman `cast` / `water_attack` each expose the appropriate two authored cels of the four-frame attack sequence. These are explicit phases, not additional or duplicated drawings. Dense crab/shaman attempts are superseded by separate directional sources; gunner death uses corrected human-collapse cels; shaman back walk uses a corrected staff-side source.

## VFX, provenance and checks

`assets/effects/dungeons/beach/`: `spritesheet.png`, `atlas.json`, `manifest.json`, editable source and64 individual80×80 cels. Sixteen four-frame sequences cover pincer/sand, serpent bite/splash, dao/impact, cannonball/muzzle/smoke/impact, droplets/mist/spectral impact, water bolt/magic splash/aquatic formation. Timing90ms/cel; projectile artwork points right.

Master inventory/provenance: `assets/sprites/creeps/dungeons/beach/beach_manifest_v01.json`. Exact retained production prompts, original generated files, extraction recipes and asset-local Python/Lua packaging scripts are under its `source/` directory. Original built-in image_gen artwork; no third-party pack or exclusive copyright claim. Thirty-four editable Aseprite sources contain prepared raster cels, not recovered illustration layers. Superseded sources are preserved. Export uses nearest sampling and binary-alpha cleanup.

The single final asset-level verification inspected1071 PNGs,512 tiles,25 props,384 enemy frame files,64 VFX cels,136 animation entries and34 editable sources. Report: `assets/sprites/creeps/dungeons/beach/verification_v01.json`. **ISSUE: Thủy Quỷ `death_down_2` is fully transparent after extraction/export.** Its death-down animation is incomplete; restore a nonempty authored dissolve cel from the retained production source and rebuild its frame, atlas and editable source in a follow-up asset correction. The other five enemy sets, terrain, prop transparency, PNG integrity, metadata and VFX passed the requested checks. No second verification was run. Raster uniqueness does not certify smooth in-game motion.

## Later integration requirements

Register textures/animations separately; use nearest filtering and manifest pivots with feet/Y sorting. Author the actual navigable map, occlusion layers and authoritative collision/spawn/exit markers from the layout reference. Never infer damage, hitboxes, timing or status effects from this artwork. Verify motion continuity, anchors, directional identity and six-player readability in the real client during the future integration task. No Phaser/runtime validation or final runtime art approval is claimed here.

Available approved references were inspected. The named Forest enemy folder and Desert art folder were empty in this checkout; `vo_dang_character_reference.png` was the available replacement for the missing older `vo_dang_art_direction_reference.png` filename.
