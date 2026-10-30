# Arena invasion enemies — Art Phase 1A

Status: **CONCEPT — awaiting director approval**. Created 2026-10-30 with the built-in OpenAI image generator. The master is a concept presentation image, not a spritesheet or animation atlas.

## Files

- `arena_creeps_01_04_master_v1.png` — four enemy designs, four facings each, palette swatches and approximate hero comparisons.
- `concept_manifest_v1.json` — source/provenance, dimensions, design notes, proposed scale targets and review concerns.
- `generation_prompts_v1.json` — exact generation and correction prompts.
- `README.md` — this review record.

The generator returned one image per call. Individual enemy designs are presented as separate rows in the master; no independent character image exports were made.

## Design summary

| Enemy | Identifying design |
|---|---|
| Chó Hoang | Low aggressive brown-gray dog; pointed ears, pale muzzle/chest, short coarse tail. |
| Thổ Phỉ | Messy hair and ochre headband, ragged tunic, rope belt, cheap wraps and crude wooden club. |
| Sơn Tặc Đao | Wider slate-blue silhouette, leather shoulder guard, head wrap and broad curved Chinese dao. |
| Cung Thủ Sơn Tặc | Narrower olive silhouette, light leather protection, curved bow and pale-fletched back quiver. |

All four use the Cái Bang reference's chibi proportions, warm outlines, clustered pixel shading and elevated orthographic overworld camera. Hero red is reserved for the scale reference. Upper-left light and muted enemy body colors separate the units.

## Scale and continuity review

Approved baseline: approximately 44 logical-pixel hero body on an 80×80 transparent runtime canvas. Brief targets: dog 24–27px tall / 34–40px nose-to-rump, grunt 40–42px, swordsman 44–46px, archer 42–44px. These are **proposals**, not measured production frame sizes.

The sheet's generated hero comparisons are illustrative, not pixel-exact reproductions or in-game screenshots. The grunt appears close to or slightly taller than the comparison hero and needs later sizing review. The dog remains fairly wolf-like; confirm its silhouette before production. The archer's carrying hand varies between front and rear/side views; settle a consistent bow hand before sprite production.

Every LEFT/RIGHT caption matches the character's screen-facing direction. Dog/archer rows use FRONT–BACK–RIGHT–LEFT; grunt/swordsman use FRONT–BACK–LEFT–RIGHT. All facings are present. The rear dao was restored during correction. Exact pixel density, colors, foot pivots, hand/strap continuity and six-player crowd readability remain production checks after design approval.

## Provenance and scope

Original AI-assisted concept art, generated using existing project Cái Bang references. No commercial sprite pack imported; no separate third-party license or exclusive copyright is asserted. Reference ownership was not independently established. Exact prompts are recorded.

Guides read: ART_ASSET_GUIDE.md, GAME_DESIGN.md, CONTENT_DATA.md, ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, CODEX_ART_QUALITY_RESCUE_TASK.md, AGENTS.md and the imagegen/pixel-art-pipeline skills. The older vo_dang_art_direction_reference.png filename was unavailable; the existing vo_dang_character_reference.png was inspected instead. Approved Cái Bang runtime PNGs and the rejected current-game anti-reference were also inspected.

No gameplay or Phaser code changed. No approved assets replaced. No sprites, animations, runtime integration, other enemies, dungeon creatures, bosses, maps, skills or UI produced. No browser gameplay or unit tests were run for this isolated concept-only delivery. PNG integrity/dimensions and approved baseline hashes are checked separately.

**Stop here for director review.**
