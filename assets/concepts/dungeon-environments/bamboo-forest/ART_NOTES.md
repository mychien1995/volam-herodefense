# Rừng Trúc / Bamboo Forest — Track C concept review

Status: **CONCEPT APPROVED**. Created and approved 2026-10-31 (Asia/Saigon).
Five static design boards, not production tilesets, sprite atlases, Tiled maps or gameplay screenshots.

## Deliverables

| File | Contents |
|---|---|
| dungeon-overview.png | Western entry/exit, three connected open combat areas, central training court, eastern spawn-side openings, northern ruins/shrine and southern stream with optional bridges. |
| terrain-concept.png | Grass variations, dirt, mossy stone, transitions, leaves, cracked floor, shallow stream and bridge surface; representative palette. |
| vegetation-concept.png | Tall clusters, individual/broken bamboo, bushes, tufts, flowers, stumps, roots and foreground canopy/base study. |
| structures-concept.png | Stone lanterns, Chinese shrine, ruined walls, wooden fences, bamboo gate, training dummies, monuments and bridges. |
| combat-clearing-and-portal.png | Spacious clearing with six approximate existing hero maquettes, recognizable western exit and a separate existing hero/grunt scale comparison. |

All five are 1536×1024 opaque RGB PNGs. Presentation paper is intentional.
Exact prompts/reference assignments are retained in generation_prompts.json.
concept_manifest.json records decoding, dimensions, SHA-256 and provenance.

## References actually inspected

Read AGENTS.md, ART_ASSET_GUIDE.md, GAME_DESIGN.md and DECISIONS.md; also ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, the applicable technical architecture/roadmap and development workflow guidance.

The requested assets/concepts/arena-environment/ directory does not exist in the supplied checkout.
Actual Main Arena equivalents inspected: assets/concept/arena-v2-approved.png and assets/concept/polished-arena.png. The former is the primary generator reference in every sheet.
The older assets/references/vo_dang_art_direction_reference.png filename is also absent; inspected the actual assets/references/vo_dang_character_reference.png, approved hero PNGs and normal-scale Phaser evidence instead.

Inspected all three requested creep groups through their actual master PNGs:
- assets/concepts/arena-creeps/waves-01-04/arena_creeps_01_04_master_v1.png
- assets/concepts/arena-creeps/waves-05-08/arena_creeps_05_08_concept_sheet.png
- assets/concepts/arena-creeps/waves-09-12/arena_creeps_09_12_concept_sheet.png

All three master sheets were supplied directly to the overview generator, with Main Arena and the actual Cái Bang idle PNG (five-image tool limit).
Subsequent generators received Main Arena, the generated overview and existing hero references; the clearing also received Võ Đang and the Waves1–4 sheet.
Also visually inspected forest_dungeon_reference.png, the mandatory current_game_2026_10_29_placeholder_anti_reference.png, hero_cai_bang_idle.png, hero_vo_dang_idle.png, assets/reviews/vo_dang_v01/six_players_1280x720.png and docs/evidence/m2a/shared-combat-a.png.

Art readout: Main Arena uses lush stepped emerald foliage, yellow-green sunlit edges, warm weathered paving, crisp small-pixel material variation and detailed Chinese architecture. The chibi actors have readable hair/robe silhouettes, warm dark contours and compact bodies. Preserve their elevated orthographic camera; avoid the anti-reference's sparse repeated floor and geometric actors.

## Current dungeon inspected — no rules changed

Read apps/game-client/src/dungeon-presentation.ts, packages/game-data/src/dungeon.ts, packages/game-data/src/creep-forest-map.json and packages/game-core/src/dungeons.ts, alongside the existing actual dungeon PNG evidence.
Current map: orthogonal30×20 tiles,32×32 logical px,960×640 world; hero spawn(240,320), physical exit(160,320), twelve enemy slots across x600/640/680 and y240/280/320/360.
Current private/shared instances retain one/six-player limits, full-wave-clear advancement, two-second configured rest, spawn-time scaling and empty-instance pause/resume. Concepts do not alter any of these.

The three clearings are connected visual subareas of one continuous wave battlefield, not separate rooms, wave triggers, progression gates or newly assigned spawn locations. The west exit remains available without clearing a room or crossing water. Painted paths/bridges/ruins are proposals, not authoritative collision or marker replacements. Exact placement must be reconciled with the existing server map in a separately approved integration task.

## Art and future layer plan

Palette: emerald, jade, moss, bamboo yellow, natural brown and warm weathered stone-gray, with restrained turquoise water/portal, amber lamps and aged red fabric.
Clear ground uses lower detail/contrast than the densely dressed edges. Six comparison actors remain easily separable in the clearing. Wide approaches and alternate southern routing avoid a single mandatory bridge choke.
Planning target: routes at least four32px terrain tiles wide, spacious combat floors; this is an art proposal, not new gameplay tuning.
Stream, ruins, shrine, fences and training props stay at the border. Small shrine steps are decorative, not a new walkable elevation system.
Bamboo silhouettes and foreground leaves should eventually be separate sprites/layers with feet-based Y-depth anchors; trunks/base collision must be separate from canopy extent.
Future build: reusable32px orthogonal terrain and edge/corner variants; background terrain/water; sparse floor decals; ground props and trunk footprints; separately sorted tall prop fronts, bridge front rails and canopy overlays.
Do not crop the flattened concept boards into a replacement runtime background. Re-author tileable materials, clean silhouettes, source layers and collision-friendly modular props after approval.

The planned Trúc Xà, Độc Chu, Sơn Viên, Trúc Lâm Kiếm Khách, Mộc Linh and Trúc Yêu are supported thematically by bamboo, stones, roots, ruins and clear earth. None was designed or generated. The clearing's footer grunt is the existing arena design for scale only, not a proposed dungeon enemy.

## Visual validation and remaining inconsistencies

Opened and visually inspected all five generated images and compared them to the Main Arena and actual actor references. All cover their requested categories. Camera remains elevated and non-rotating with upright vegetation and visible structure fronts; ground reads orthogonal, without a diamond-grid map or 3D chase perspective.
Open floors, broad connections, perimeter decorations and the recognizable blue exit read clearly. Six existing-design maquettes are visible with generous spacing.

Limitations requiring production review:
- This is the sunlit, yellow-green end of the Main Arena palette. Deep jade shadow variants can be considered after director feedback; it is not a gloomy night forest.
- Scale is consistent illustratively, not pixel-locked. Enlarged isolated prop/vegetation/material studies are presentation views. The printed32px planning grid is illustrative, not a measurable cut grid.
- The overview's tiny optional bridges read narrower than the intended four-tile route target. Widen during later approved map authoring; mandatory combat routes do not rely on those bridges.
- Both bridge examples on the props board read mostly north/south. A production east/west version has not been authored.
- Portal roof trim, shrine details, leaves and moss distribution vary between overview/detail boards. Freeze one design and palette during approved source production.
- Some large foreground leaves are softer than the small background pixel clusters. Re-author them on the agreed logical pixel grid before export.
- Generated hero/grunt comparisons approximate supplied designs; they are not unchanged runtime sprite pixels and must not be extracted as characters.
- Ground transitions are visual studies, not verified seamless tiles. Foreground pieces are illustrated on opaque paper, not transparent sprites or proven Y-sort exports.
- No runtime, collision, animation, performance or six-player gameplay test was performed; no production/runtime approval is claimed.

Validation performed: Pillow PNG verify() plus full load(), dimensions/mode, SHA-256 comparison to generator originals, exact five-PNG inventory, reference snapshot hash checks and isolated-worktree scope check. See concept_manifest.json for measured results.
No code/manifest integration changed, so game builds/full tests were not run. No WebM/MP4/GIF or playback recording was generated.

## Provenance and isolation

Original AI-assisted concepts generated with OpenAI built-in image_gen.imagegen using existing project images as references. No external commercial art pack was imported; no separate third-party license or exclusive copyright is asserted. Existing reference ownership was not independently verified.
Final PNGs are copied unchanged from built-in generator originals; original filenames and prompts are recorded.
Work is isolated on branch codex/bamboo-forest-concepts in its managed worktree. All project output writes are confined to assets/concepts/dungeon-environments/bamboo-forest/. Existing Main Arena, creep, hero, shared code and manifests were read-only.
reference_inputs.json records SHA-256 snapshots of the principal existing image inputs; validation confirms the same hashes remain.

Stop here. All five concepts have director approval. Production assets and integration require a separate task.

## Director approval — 2026-10-31

The user explicitly approved all five sheets: “all approved”. Approval covers the current concept artwork and environmental direction. The production considerations above remain recorded for later asset authoring. No production assets, gameplay implementation or runtime approval is implied.

The five existing PNG hashes were rechecked unchanged and recorded in approved_concepts_v1.lock.json. This is an approval snapshot; no shared runtime guard was added.
