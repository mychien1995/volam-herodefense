# Phase 1C — Arena creep concepts, Waves 5–8

Status: **concept proposals awaiting owner approval**. Completed 2026-10-30.
This directory contains five concept PNGs, not spritesheets, animations or runtime assets.

## Artwork

| File | Concept |
|---|---|
| `arena_creeps_05_08_concept_sheet.png` | Master sheet, 1536×1024, all four enemies. |
| `hac_y_sat_thu_concept.png` | Hắc Y Sát Thủ: charcoal/plum hood, masked face, crimson accents and twin short daggers. |
| `ta_tang_concept.png` | Tà Tăng: broad bald monk, torn oxblood robes, large prayer beads and heavy reinforced staff. |
| `kho_lau_kiem_si_concept.png` | Khô Lâu Kiếm Sĩ: ivory skull, pale-green eyes, broken bronze Chinese armor, dark teal cloth and rusted straight jian. |
| `kho_lau_cung_thu_concept.png` | Khô Lâu Cung Thủ: related skull/bones/teal cloth, slimmer shoulders, turquoise eyes, aged bow and quiver. |

Each design has FRONT/BACK/LEFT/RIGHT static views, one action illustration, weapon detail, palette swatches and approximate comparison with Cái Bang and the existing grunt. Static turnarounds are design illustrations, not animation frames.

`concept_manifest_v1.json` records dimensions, hashes, provenance, reference inputs, design summaries and review issues. `generation_prompts_v1.json` preserves the actual generation/correction prompts.

## Actual references inspected and used

The Waves 1–4 concept directory contained one image:
`assets/concepts/arena-creeps/waves-01-04/arena_creeps_01_04_master_v1.png`.

Before generation, the actual image, all four Phase 1B production atlases, the normal-scale Phaser comparison and Cái Bang idle PNG were opened and visually inspected. Required art guides, the art-quality anti-reference and available Võ Đang character reference were also inspected.

The master generator received the approved Waves 1–4 sheet, actual Phase 1B normal-scale comparison, swordsman atlas and archer atlas directly. The individual generators received the corrected new master plus the approved Waves 1–4 sheet and production comparison. These were reference-guided image-generation calls, not generic text-only prompts.

Compared with Waves 1–4, the new designs preserve compact chibi proportions, the elevated non-rotating orthographic view, warm dark outlines, clustered shading, upper-left light and muted costume colors with restrained saturated accents. The two skeletons share skull shapes, bone colors, joint language and weathered teal fabric, but bronze armor/sword versus narrow shoulders/bow/quiver distinguish them immediately.

Proposed logical standing heights: assassin42px, monk46px, skeleton swordsman44px, skeleton archer42px, alongside Cái Bang44px and grunt42px. The wider monk remains a regular-enemy-sized figure. These are **illustrative proposals**, not measured production sprites or new balancing rules.

## Validation and owner review points

All five final saved PNGs were opened and visually inspected. PNG integrity decoding passed. Character/weapon tips remain inside the pages without visible crop or corruption. Every labeled facing points in its named direction. Missing staffs and skeleton sword views in early master drafts were corrected before creating individual sheets.

All five images intentionally use **opaque ivory presentation backgrounds**. Transparency was not requested; none is falsely presented as a transparent cutout.

Remaining issues are explicitly unapproved:

- The small monk scale figure in the master carries the staff on the opposite side to the main frontal turnaround and individual sheet. Freeze carrying-hand convention before production.
- Bead counts, staff-band details and individual pixel clusters vary slightly across the enlarged presentation views. Freeze these after design review.
- Individual skeleton palette swatches do not list every eye-glow accent visible in the figures; those accents appear in the master palette.
- Generated hero/grunt comparisons are approximate illustrations. The drawings need separate pixel-density/readability review at actual production resolution in Phase 1D; no live-match or sprite fidelity claim is made here.

Master and individual sheets depict the same four designs; the enlarged images provide clearer inspection, not approval of new interpretations.

## Provenance and preserved assets

Original AI-assisted concepts generated with the built-in OpenAI `image_gen.imagegen` tool using existing project references. No external commercial sprite pack was imported; no separate third-party license or exclusive copyright is asserted. Original generator filenames and SHA-256 output hashes are in the manifest.

Before/after aggregate hashes match for **all 4 files** in the approved Waves 1–4 concept directory and **all 308 files** in its Phase 1B production directory. All **8 locked Cái Bang source/export files** also match. Nothing in those approved directories was changed.

No production sprites, animation strips, VFX/skill assets, Phaser integration, gameplay code, balancing, Waves 9–20, dungeon enemies, bosses, maps or UI were produced. No game-code tests/browser gameplay were run for this isolated concept-only phase.

**Stop here. Phase 1D requires explicit owner approval.**

