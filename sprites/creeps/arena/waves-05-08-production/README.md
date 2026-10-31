# Phase 1D — Arena creeps Waves 5–8

Status: **production animation candidates, staged for owner review**. The owner approved the Phase 1C concepts and authorized production on 2026-10-30. New sprites are not installed into the live match.

## Deliverables

| Character | Production directory | Frames | Transparent canvas / feet |
|---|---|---:|---|
| Hắc Y Sát Thủ | `sprites/creeps/arena/black-clad-assassin/` | 61 | 96×96 / (48,76) |
| Tà Tăng | `sprites/creeps/arena/corrupted-monk/` | 63 | 112×96 / (56,76) |
| Khô Lâu Kiếm Sĩ | `sprites/creeps/arena/skeleton-swordsman/` | 62 | 112×96 / (56,76) |
| Khô Lâu Cung Thủ | `sprites/creeps/arena/skeleton-archer/` | 64 | 96×96 / (48,76) |

Total: **250 exported frames, 80 animation tags**.
Every enemy has `idle`, `walk`, `basic_attack`, `hurt`, `death` for `down/left/right/up`.

Each directory includes individual `frames/*.png`, `spritesheet.png`, Aseprite hash `atlas.json`, `manifest.json`, editable `source/*.aseprite`, retained generated source PNGs and `source/extraction_v1.json` with measured pixel masks/scales/anchors.

Every exported frame records its approved individual concept path and SHA-256, generated source image/component, bounds and PNG hash. `production_manifest_v1.json` indexes this batch. `generation_prompts_v1.json` stores actual prompts. `approved_inputs_lock.json` preserves the pre-task hashes of 328 approved files.

## Reference and production conventions

All five PNGs in `assets/concepts/arena-creeps/waves-05-08/` were opened and inspected. Each generation received the relevant approved individual concept and approved master directly. Initial full animation/reaction batches additionally received the actual Phase 1B normal-scale comparison.

Preserved designs: plum hood/mask/crimson twin-dagger assassin; broad bald rust-robed monk with wooden beads and reinforced staff; ivory/bronze/teal skeleton with rusted Chinese jian; lighter ivory/teal archer with wooden bow and diagonal quiver. The skeleton pair shares bone and cloth language but retains distinct equipment and armor silhouettes.

Main frontal turnarounds guide carrying-hand conventions rather than the inconsistent small concept scale vignettes. Monk front/rear staff carry was normalized and independent directional sources produced where needed. Twelve total large beads / seven front arc and five rear arc, two brass bands near each staff cap, green swordsman eye accent and turquoise archer accent were production targets; exact accessory counts/hue distinctions still need owner review at small scale.

Body-height targets remain approximately42px assassin,46px monk,44px skeleton swordsman,42px skeleton archer, next to the actual44px Cái Bang and42px grunt. Larger canvases provide weapon room; they do not change body scale, collision or damage.

The existing Aseprite 1.3.18.6 assembler is reused without modifying it or the approved batch. It extracts only generated production pixels, not concept-board crops; uses connected-pixel masks to prevent neighboring weapon contamination, removes alpha below220, normalizes retained alpha, applies a fixed nearest-neighbour scale per source and aligns feet. Python/Pillow only inspect pixels and metadata.

## Frame selections

Defective initial poses remain source evidence and are excluded from exports:

- Assassin frontal walking was regenerated. Front/left/rear attacks use three valid poses after wrong-facing frames were removed.
- Monk left/right/rear sequences were regenerated. Left attack uses three poses after excluding a wrong-facing anticipation.
- Skeleton swordsman front walk and rear attack each use three valid poses after missing-blade frames were removed. Rear hurt shares a generated knee-buckle pose with death anticipation, followed by recovery, keeping the jian present.
- Archer front/left/right sequences were regenerated one facing at a time. A mirrored replacement rear source is explicitly unused. Rear shot has four frames / three distinct drawings: raised-bow pose reused for release, original idle used as recovery; no bow disappears.
- All other sequences retain authored pose variation. The manifest records actual distinct-drawing counts, not a claim that every named frame is unique.

Per-sequence timing remains idle700ms, walk480ms, basic attack300ms, hurt280ms, death560ms, divided evenly over the exported poses. Idle/walk loop; other states play once in their manifests. These are presentation timings only.

## Actual-run review

Routine verification uses PNG screenshots and live Phaser frame-observation reports; no recording is generated. The existing `review/phaser_animation_preview.webm` is preserved as historical evidence.
Five state screenshots and `review/concept_comparison.png` compare the approved artwork and staged sprites beside unchanged Cái Bang/grunt PNGs, camera zoom1,640×360 logical canvas displayed at1280×720 with nearest filtering.

All80 tags and250 frame names were observed with zero page/loader errors; see `review/phaser_verification.json`.
All final screenshots were opened and visually inspected. Equipment remains recognizable, no exported canvas edge is clipped, and final death poses rest on the ground.

Owner review points:

- Frontal archer carry-to-shot grip transfer and short three-pose melee cycles need motion-feel review.
- Some attack torsos twist during strikes; approve their direction/readability in playback.
- Small bead/band details and green-versus-turquoise eye accents simplify at production scale. Pixel-exact accessory continuity is not claimed.
- Live-match event binding, multiplayer, six-player crowd readability and authoritative combat timing have not been tested for these new assets because they are not integrated.

See `concept_fidelity_review.json` for the complete recorded review.

## Reproduce and checks actually run

`python -u sprites/creeps/arena/waves-05-08-production/build_sprites.py`
rebuilds only these unapproved candidates from retained generated sources, using approved analysis/assembler code read-only. It refuses approved production manifests and verifies all328 approved-input hashes before/after. Rebuilding replaces candidate cels; export manually edited Aseprite sources directly to retain later cleanup.

`node sprites/creeps/arena/waves-05-08-production/verify_phaser.mjs`
runs a temporary localhost-only renderer, observes every animation frame, captures six PNG screenshots and frame observations and updates the candidate verification metadata.

Results: build/export validation PASS; Phaser validation PASS; `pnpm typecheck` PASS; `pnpm test` **98/98 PASS across11 files**. All328 approved concept, previous production and Cái Bang file hashes remain unchanged.

Original AI-assisted project raster art generated with built-in OpenAI imagegen; no commercial sprite pack imported, separate third-party license or exclusive copyright asserted. Approved references supplied by project; underlying reference ownership not independently established.

No gameplay, server, balancing, application Phaser code, skill/VFX assets, next waves, dungeon enemies or bosses changed. **Stop at this four-enemy production batch for animation review.**


Recordings require an explicit user request for the current task, per `AGENTS.md`; routine verification must not run video recording, encoding or conversion tools. Inspect motion, transitions and positioning live in Phaser.
