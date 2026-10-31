# Chu Bá Thông — Lão Ngoan Đồng: asset handoff

Asset production only, 2026-10-31. No Phaser integration, loaders, dungeon registration, AI, combat, loot or wine mechanics were implemented. No servers, browser playtests, recordings, comparison sheets or screenshot evidence were created for this task.

Concepts are automatically approved under this task's explicit instruction. Production PNGs have been prepared for handoff; runtime animation continuity, gameplay zoom, six-player readability, performance and final in-game art acceptance remain untested. Do not confuse asset-level verification with runtime approval.

## Index and provenance

- Package manifest: `assets/sprites/bosses/chu-ba-thong/asset_manifest_v01.json`. Includes PNG dimensions, SHA-256, origins, frame provenance, semantic skill mappings and explicit unimplemented wine specifications.
- Exact prompts: `assets/sprites/bosses/chu-ba-thong/source/generation_jobs_v01.json` and `generation_prompts_*.json` alongside it. Tool: built-in `image_gen`; no image-generation CLI/API fallback was used.
- Offline export recipe: `assets/sprites/bosses/chu-ba-thong/source/export_assets_v01.py`. Requires existing Pillow and NumPy; does not import game code or launch a service. Sources are retained original generated raster PNGs; no hand-authored Aseprite source is claimed.
- Original AI-assisted project artwork, with no proprietary game assets copied and no exclusive copyright asserted. Style references were consulted, not sampled into new sprites. The approved Bamboo Forest terrain and bamboo cluster are exact-pixel reuses with source hashes recorded separately.
- Raw generated PNGs are retained unchanged. Production exports use nearest-neighbor sampling, binary alpha at threshold 128, and zero RGB in transparent pixels. Actual source cell rectangles are recorded; the generator did not consistently obey requested dimensions or grid spacing. A tighter principal-cel bounding box excludes detached adjacent-cell fragments from character exports.

## Concepts

| Content | Path |
|---|---|
| Boss master, turnarounds, drunken/dual palm/drinking/serious poses, palette, hero scale | `assets/concepts/bosses/chu-ba-thong/master_concept_v01.png` |
| Wine-carrying disciple, turnarounds, actions and jar details | `assets/concepts/summons/toan-chan-disciples/master_concept_v01.png` |
| Bamboo Taoist training-ground layout concept | `assets/concepts/arenas/toan-chan-truc-lam/arena_layout_concept_v01.png` |
| Structured layout and entry/delivery/return markers | `assets/concepts/arenas/toan-chan-truc-lam/layout_reference_v01.json` |

References inspected: approved Võ Đang concept/idle, arena creep concepts, Bamboo Forest overview and approved bamboo sprite, Lý Mạc Sầu master concept, and the available Hoàn Nhan Hồng Liệt production source. The old `vo_dang_art_direction_reference.png` alias is absent; `assets/references/README.md` identifies `vo_dang_character_reference.png` as its replacement. No separate Bamboo Forest creep sprite family was found in the searched forest/bamboo asset paths; the existing dungeon environment and available arena creatures supplied the scale/style context.

## Boss sprites and animation

Directory: `assets/sprites/bosses/chu-ba-thong/`.

- `boss_chu_ba_thong.png`: production atlas; matching hash-format frame rectangles in `boss_chu_ba_thong.json`.
- `boss_chu_ba_thong.animations.json`: explicit ordered clips, FPS, repeat, facing, origin and semantic stage.
- `frames/{action}_{direction}_{0..3}.png`: 176 actual raster cels, 44 clips, four independently generated directions: `down`, `up`, `left`, `right`.
- Actions: `idle`, `walk`, `drink`, `basic_palm`, `dual_hand`, `dash`, `counter`, `hit`, `defeat`, `yin_yang_cast`, `ultimate_charge`.
- Canvas 112×96; feet (56,80), normalized origin (0.5, 0.833333…). Standing body approximately 56 logical pixels versus the existing hero baseline approximately 44 pixels. One scale per facing preserves action/death size; each cel is positioned on the same foot baseline. Runtime foot sliding and transition quality still require later inspection.
- Four drawn poses per clip, rather than a repeated still image. FPS values are visual playback proposals, not attack windows or game balance.

## Basic attack and five signature skills

Root: `assets/effects/bosses/chu-ba-thong/skills/`. Every skill directory contains retained source PNG(s), `frames/`, `vfx_{id}.png`, `vfx_{id}.json` and `vfx_{id}.animations.json`. Each family has four exported cels on 128×128 canvases; default effect origin (0.5,0.5). Use metadata placement (`ground`, `above_head`, `overlay`) rather than inferring placement from filename.

| Display name / directory ID | Boss clip, all four directions | VFX clip families |
|---|---|---|
| Không Minh Quyền / `khong_minh_quyen` | `basic_palm_{direction}` | `impact`, `shockwave`, `palm_wave` |
| Song Thủ Hỗ Bác / `song_thu_ho_bac` | `dual_hand_{direction}` | `yin_palm`, `yang_palm`, `dual_telegraph`, `yin_impact`, `yang_impact` |
| Thái Cực Âm Dương Trận / `thai_cuc_am_duong_tran` | `yin_yang_cast_{direction}` | `formation`, `rotating_ring`, `danger_zones`, `eruption`, `stun`, `cast_gather` |
| Túy Tiên Bộ / `tuy_tien_bo` | `walk_{direction}` anticipation → `dash_{direction}` | `afterimage_right`, `wind_trail`, `arrival`, `dash_telegraph` |
| Càn Khôn Phản Chấn / `can_khon_phan_chan` | `counter_{direction}` | `defensive_field`, `charge_warning`, `radial_shockwave`, `counter_impact`, `guard_trigger` |
| Âm Dương Nghịch Chuyển / `am_duong_nghich_chuyen` | `ultimate_charge_{direction}` | `large_formation`, `rotating_waves`, `palm_waves`, `danger_pattern`, `safe_pattern`, `ultimate_impact` |

The counter source's first four families run down columns; metadata explicitly transposes those cells into chronological clips. No source grid is implicitly inferred at runtime. Cyan/navy crescent shapes identify Yin; warm gold sun shapes identify Yang. Hatched danger sectors and sparse hollow safe markers communicate meaning beyond color. Rotating VFX have separately drawn phases.

Directional VFX limitations: palm/wind geometry is authored facing right, Yang facing left. Future presentation can orient energy geometry as appropriate. The generic ghost afterimage sheet is right-facing only; for other facings the existing `dash_{direction}` character cels can be used as opacity overlays in later rendering. Do not rotate a right-facing character silhouette into an up-facing body. No such rendering code is included.

## Đệ Tử Toàn Chân

Directory: `assets/sprites/summons/toan-chan-disciples/`.

- `toan_chan_disciple.png`, `.json`, `.animations.json`, and `frames/`.
- 112 actual cels, 28 clips: `idle`, `walk`, `carry_walk`, `basic_defense_attack`, `hit`, `drop_wine`, `death`, each in four directions and four frames.
- Canvas 80×80; feet (40,64), origin (0.5,0.8), approximately 44-pixel standing body. Jade ceramic jar with ivory lid/gold Taoist seal is distinct from the boss's brown gourd.
- `drop_wine` includes an intact jar; future gameplay should create a separate pickup at the relevant authoritative event and avoid displaying two jars simultaneously.
- Minion effects: `assets/effects/bosses/chu-ba-thong/wine-mechanic/vfx_disciple_vfx.png`, matching JSON/animation metadata, and `frames/entry_spawn_*`, `delivery_indicator_*`, `wine_drop_impact_*`.

## Toàn Chân Tiên Tửu and protection

| Asset | Path / clip |
|---|---|
| World jar, transparent 40×40 with compact jar body | `assets/icons/bosses/chu-ba-thong/toan_chan_tien_tuu_world.png` |
| Inventory/pickup icon, 64×64 | `assets/icons/bosses/chu-ba-thong/toan_chan_tien_tuu_icon.png` |
| HUD wine buff icon, 64×64 | `assets/icons/bosses/chu-ba-thong/wine_buff_icon.png` |
| HUD protection icon, 64×64 | `assets/icons/bosses/chu-ba-thong/protection_icon.png` |
| Drop, pickup glow, consume, player aura, enhanced impact, expiry | `assets/effects/bosses/chu-ba-thong/wine-mechanic/vfx_wine_mechanic.{png,json,animations.json}`; clips `wine_drop`, `pickup_glow`, `consume`, `player_buff`, `empowered_hit`, `buff_expire` |
| Boss aura, immune hit, wine-damage indication | `assets/effects/bosses/chu-ba-thong/statuses/vfx_statuses.{png,json,animations.json}`; clips `protection_loop`, `immune_hit`, `wine_damage_indicator` |

**Later gameplay specification, not implemented:** ordinary attacks deal zero effective damage and ordinary stat increases cannot bypass protection. Only an individual player with an active special-wine buff can meaningfully damage Chu Bá Thông. When that player's buff expires, their attacks become ineffective again. One player's buff must not globally remove protection for everyone.

Keep the protection aura small around the boss. The immune response retains an intact seal and deflects a strike; wine-empowered feedback uses jade/gold penetration and diamond sparks. The separate player aura can overlay all four existing schools without new school body sprites. Future rendering should place rear/foreground portions appropriately and keep each owner's aura local to that player; multiple recipients must not require a shared party-wide visual.

No final damage, cooldown, delivery interval or buff duration is defined. Wine quantities, eligibility, collection and sharing remain undecided. These encounter assets do not change the existing rule of exactly one equipment loot item per dungeon boss kill.

## Toàn Chân Trúc Lâm arena production

Terrain directory: `assets/tilesets/boss-arenas/toan-chan-truc-lam/`.

- `terrain.png` / `terrain.json`: 64 tiles at 32×32, 8 columns. Four ordered 4×4 material patches: stone platform, ancient path, bamboo ground, mossy stone. Individual exports in `tiles/`; full material patches in `*_material.png`. Preserve adjacency within each 4×4 patch; arbitrary seamless repetition/autotiling of these new swatches is not claimed.
- `bamboo_forest_terrain.png` / `.json`: unchanged approved 344-tile Bamboo Forest atlas, including existing grass/stone/path transitions. Retains source group definitions from `assets/source/bamboo_forest/terrain_groups.json`; original source manifest is `assets/bamboo_forest.manifest.json`.
- `yin_yang_platform.png` / `.json`: 512×320 centerpiece, with 160 ordered 32×32 pieces in `platform_tiles/`. These reconstruct one coherent 16×10 metatile, not interchangeable floor tiles. Subdued stone contrast leaves room for bright telegraphs.

Props directory: `assets/sprites/environment/toan-chan-truc-lam/`.

- `bamboo_cluster.png`: exact approved `assets/source/bamboo_forest/sprites/bamboo_jade.png` reuse. The unused generated cluster touched the source image edge, so it was excluded from production exports.
- `moss_rock.png`, `training_dummy.png`, `broken_practice_poles.png`.
- `stone_lantern.png`, `taoist_banner.png`, `bamboo_fence_low.png`, `bamboo_fence_tall.png`.
- `wine_storage_rack.png`, `wine_rest_table.png`, `entrance_gate.png`, `ancient_steps.png`.
- `taoist_pavilion.png`, plus matching-canvas `taoist_pavilion_roof.png` and `taoist_pavilion_base.png` horizontal occlusion layers. Canvas 240×224, feet (120,216). Split is an art-layer starting point, not a tested collision/occlusion implementation.
- `portal/toan_chan_portal.{png,json,animations.json}` and four `portal/frames/portal_loop_*.png`. Canvas 112×112, origin (0.5,104/112). Portal has four separately drawn energy phases; precise stone-frame continuity remains for later runtime review.

Layout reference keeps the central 896×640 region open on a proposed 1536×1152 logical canvas, with the boss north-center, players entering south, a southwest return portal and west/northeast/east wine-delivery approaches. Coordinates are art planning proposals. They do not register a map, navigation mesh, collision geometry, server spawn or dungeon.

## Final asset-level verification

One lightweight final verification checks all package PNG decodes/hashes, required categories, four-facing frame counts, atlas bounds, explicit animation frame references, matching individual frame pixels, alpha, tile dimensions and JSON structure. Its actual result is reported in the final response. No additional test suite or evidence file is generated. Phaser/runtime verification is intentionally deferred under this task's isolation requirements.
