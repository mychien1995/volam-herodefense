# Phase 1F — Arena creeps Waves 9–12

Status: **generated production animation candidates, staged for owner review**. The owner approved the Phase 1E concepts and authorized production on 2026-10-30. This pass produces the same five-state/four-facing set as Phase 1D. The new sprites are not installed into the live match.

## Outputs

| Enemy | Directory under `sprites/creeps/arena/` | Frames | Transparent canvas / pivot | Body-height target |
|---|---|---:|---|---:|
| Cương Thi | `jiangshi-zombie/` | 64 | 96×96 / (48,76) | 44px |
| Oán Linh | `vengeful-spirit/` | 64 | 112×112 / (56,90) | 52px |
| Thiết Giáp Khô Lâu | `armored-skeleton/` | 63 | 160×112 / (80,90) | 54px |
| Thạch Nhân | `stone-golem/` | 64 | 176×144 / (88,120) | 66px |

Total: **255 exported frames and 80 animation tags**. Every enemy has `idle`, `walk`, `basic_attack`, `hurt`, `death` in `down/left/right/up`.

Each enemy directory contains:

- `frames/{state}_{direction}_{index}.png`: individual transparent PNG poses.
- `spritesheet.png` and `atlas.json`: Aseprite hash atlas, 20 named tags and feet pivot slice.
- `manifest.json`: animations, dimensions, origin, frame/source/concept hashes, provenance and review status.
- `source/creep_{enemy_id}.aseprite`: editable assembled raster cels with named tags and frame durations.
- `source/*_v1.png`: retained original generated production images, including supplemental attack sources.
- `source/extraction_v1.json`: selected source components, masks, fixed source scales and anchors.

The larger canvases provide sword/fist clearance, without changing body height or collision. The spirit uses a 4px hover gap for non-death anchors. Cái Bang and Wave 7 remain unchanged comparison baselines at about 44px tall.

This batch directory contains `production_config_v1.json`, `production_manifest_v1.json`, `generation_prompts_v1.json`, `concept_fidelity_review.json`, `approved_inputs_lock.json`, build/review tools, this README and eleven PNG screenshots plus a live-observation report under `review/`.

## Approved design mappings

| Enemy | Approved source under `assets/concepts/arena-creeps/waves-09-12/` |
|---|---|
| Cương Thi | `cuong_thi_concept.png` |
| Oán Linh | `oan_linh_concept.png` |
| Thiết Giáp Khô Lâu | `thiet_giap_kho_lau_concept.png` |
| Thạch Nhân | `thach_nhan_concept.png` |

All five actual Phase 1E PNGs, including `arena_creeps_09_12_concept_sheet.png`, were opened and inspected before generation. Every one of the 17 built-in image-generation calls received the relevant approved individual concept directly. Approved master and actual preceding production comparison images provided additional references. The older concept manifest's pending status describes its creation; the user's subsequent approval is recorded in the new production config.

Preserved identities: pale stiff-arm Jiangshi with talisman/dark cap/crimson robe trim; navy-haired blue-violet legless spirit; Wave 7 skull/bone/teal/bronze lineage upgraded to heavy armor, amber eyes, right-hand jian and left-hand shield; massive taupe-gray stone guardian with jade accents and moss on its anatomical left shoulder. The elevated orthographic overworld camera, dark stepped outlines, clustered shading and warm upper-left light remain consistent.

## Production and frame selection

The existing Aseprite assembler and connected-pixel analysis are used read-only. The new batch builder supports measured 4×11, 4×10, 4×6, 3×4 and 2×2 generated layouts. Only generated animation pixels become frames; no approved concept-board crops are used.

Aseprite extracts selected pixel masks, removes source alpha below 220, preserves retained RGB, normalizes retained alpha to 255, applies one fixed nearest-neighbour scale per generated source and aligns anchors. Python/Pillow inspect image pixels and metadata; they do not paint substitute artwork. All exported PNGs have genuine transparent backgrounds and binary alpha. The spirit's ghostly appearance uses a dense luminous core and wispy silhouette; continuous body translucency is not claimed.

Wrong-facing or missing-equipment poses were excluded:

- The Jiangshi main source generated 44 poses instead of 40. Its actual four rows of eleven were measured; extra columns are unused. Front/side attacks use regenerated sources.
- Spirit front/side palm casts were regenerated with correct facings and connected fingertip glow.
- Skeleton main frontal walk component 3 lacked a sword. The three valid walking poses are exported; front and both side attacks were regenerated.
- Golem side attacks were regenerated independently. Dead poses remain connected stone bodies rather than disconnected rubble.

The manifests record exact selected components and distinct-drawing counts. Every animation contains at least two distinct drawings; most use four where applicable.

Presentation cycle times: idle 700ms, walk 480ms, basic attack 300ms, hurt 280ms, death 560ms. Idle/walk loop; the other states play once and hold their final frame. These are animation timings only, with no authoritative combat binding or balance change.

## Actual Phaser review and checks

`review/phaser_verification.json` records **Phaser 4.2.1 observing all 80 tags and 255 frames**, with zero page/loader errors. Native looping and one-shot final-frame holds, rapid facing changes, constant positions/origins and sprite scale 1 were checked. Normal review is a 640×360 logical canvas at camera zoom 1, displayed at 1280×720 with nearest filtering. A separate 640×360 PNG shows actual 1× display.

All eleven final PNG screenshots were opened and visually inspected:

- `idle_1280x720.png`, `walk_1280x720.png`, `hurt_1280x720.png`, `death_1280x720.png`.
- `basic_attack_1280x720.png` shows contact; `basic_attack_windup_1280x720.png` shows wind-up.
- `idle_grass_1280x720.png` and `idle_stone_1280x720.png` use the existing arena ground unchanged.
- `crowd_1280x720.png` stages six hero drawings and sixteen enemies with Y-depth ordering; it is not a multiplayer-match test.
- `idle_640x360.png` and `concept_comparison.png` provide scale and approved-design comparisons.

Results actually run:

- `python -u sprites/creeps/arena/waves-09-12-production/build_sprites.py`: **PASS**, full export/alpha/bounds/tag/distinct-pose and approved-input hash checks.
- `node sprites/creeps/arena/waves-09-12-production/verify_phaser.mjs`: **PASS**, all frames/tags plus native playback/facing/position checks and eleven PNG screenshots.
- `pnpm typecheck`: **PASS**.
- `pnpm test`: **98/98 PASS across 11 files**.

No recording was produced. The current repository policy requires PNG/live observations for routine verification; all existing recordings are preserved. Official API guidance consulted: [Phaser animations](https://docs.phaser.io/phaser/concepts/animations), [Phaser textures](https://docs.phaser.io/phaser/concepts/textures), [Aseprite CLI](https://www.aseprite.org/docs/cli/).

## Owner review points

The source designs remain recognizable, but new animations require review:

- Skeleton frontal walk has three poses; assess its cadence.
- Talisman ink, small cap trim, shield ornament/rivets, moss leaves and stone cracks simplify and vary across source groups.
- Approve the spirit's dense luminous appearance over grass. Its rear attack reads mainly through the raised palm.
- Golem side attacks use a strong three-quarter torso lean; review continuity with its side idle and the large fist span during overlaps.
- Busy grass competes with small lower-body outlines. The crowd staging demonstrates scale and occlusion only; live-match effects, multiplayer and authoritative event timing remain untested.

Full findings are in `concept_fidelity_review.json`. PNG decoding and canvas checks found no cropped or corrupt exported poses.

## Provenance and preservation

Original AI-assisted raster poses generated using built-in OpenAI imagegen with approved project artwork supplied directly. No commercial sprite pack was imported; no separate third-party license or exclusive copyright is asserted. Editable Aseprite files contain assembled generated cels, not recovered hand-painted layers.

The input lock covers 640 prior files. During this task, an external repository update changed four existing README/review-tool files to apply the newer screenshot-only policy. Those changes were reviewed and preserved; initial/current hashes and reasons are recorded explicitly. The remaining 636 initial files, including all approved artwork and historical recordings, remain unchanged. No approved image or animation was overwritten.

Rebuilding replaces only these candidate cels and refuses manifests marked approved; export manually edited Aseprite sources directly to preserve future hand cleanup. The existing root analysis/assembler and earlier batches remain outside this pass.

No live-game Phaser code, server logic, enemy mechanics, balancing, next waves, dungeon enemies, bosses or separate skill/VFX assets were changed. **Stop at this four-enemy production batch for owner animation review.**

