# Cái Bang — Phase A concept review

Created 2026-10-30. **CONCEPTS APPROVED — 2026-10-30.**

Phase B export candidates are now available in [the animated production review](../../../reviews/skills/cai-bang/index.html). The original concept PNG headers retain their historical pending-approval wording; user approval is recorded in the manifest.

Ten active skills are covered across four generated PNG sheets. Each skill shows cast, buildup, release, impact (or self-buff), and an approximate game-scale arena illustration. No animation sprites, production exports, gameplay integration, or changes to combat were made.

Open [review.html](review.html) for the visual review index, original sheets, per-skill concerns, and unchanged approved hero at native/2× display size. [Contact sheet](cai_bang_skills_contact_sheet_v1.png) is a generated thumbnail overview; use the original boards for exact details.

## Review sheets

- [Sheet 1](cai_bang_skills_sheet_01_v1.png) — Hỏa Vân Chưởng, Cuồng Long Loạn Vũ, Phi Long Tại Thiên.
- [Sheet 2](cai_bang_skills_sheet_02_v1.png) — Kháng Long Hữu Hối, Hàng Long Hỏa Vũ.
- [Sheet 3](cai_bang_skills_sheet_03_v1.png) — Hoành Tảo Bổng, Phá Giáp Bổng, Cầm Long Công.
- [Sheet 4](cai_bang_skills_sheet_04_v1.png) — Truy Phong Bổng, Thiên Hạ Vô Cẩu.

All original boards are 1536×1024. The generator returned this resolution despite the higher-resolution request. Separate individual boards were not needed for concept coverage; original sheets retain readable enlarged studies. Concept pixel clusters are illustrative, not production pixel grids.

## Progress

| Skill | Concept | Approved | Frames | Sprite Sheet | Validated |
|---|---|---|---|---|---|
| Hỏa Vân Chưởng | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Cuồng Long Loạn Vũ | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Phi Long Tại Thiên | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Kháng Long Hữu Hối | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Hàng Long Hỏa Vũ | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Hoành Tảo Bổng | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Phá Giáp Bổng | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Cầm Long Công | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Truy Phong Bổng | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |
| Thiên Hạ Vô Cẩu | Generated / inspected | Approved | Produced | Packed | File + isolated Phaser pass |

“Validated” here means production animation validation, not concept PNG integrity. PNG/hash results are in [validation_v1.json](validation_v1.json). No concepts are missing.

## Resolve before production

- **Phá Giáp Bổng:** release depicts a downward smash, while impact still reads as a forward thrust. Reconcile the attacking motion before frames.
- **Cuồng Long / Hàng Long / Thiên Hạ:** assess flame density. Thin overlapping ribbons and keep enemy feet, ground, and hero face readable in six-player play. Current vignettes do not prove that test.
- **Kháng Long:** explicitly approve the self-buff interpretation. The current authoritative catalogue defines temporary crit chance/damage, despite the task's damaging-dragon visual suggestion.
- **Cầm Long:** outgoing dragon ribbons represent extension, then inward retraction. Pull arrows and suppression symbols are concept annotations. No stun, movement lock, equipment loss, or extra damaging projectiles.
- **Truy Phong:** afterimages indicate translation. Its one struck enemy is illustrative, not a new target cap. No range or stun duration is settled here.
- Exact poses/handedness, staff length, palette, foot baseline, four-direction continuity and native-resolution effects remain sprite-production checks.

Game-scale vignettes are **generated approximations** on arena-inspired ground, not captured gameplay, measured 44px heroes, collision/range diagrams, or validated runtime previews. The review index separately displays the actual approved hero pixels at native and 2× size.

## Mechanics reconciliation

Existing specifications/implementation take precedence over the visual brief.

| Skill | Concept follows |
|---|---|
| Hỏa Vân Chưởng | Three quick straight non-homing fire projectiles; each impact is small. |
| Cuồng Long Loạn Vũ | One exploding projectile with splash and burn. |
| Phi Long Tại Thiên | Frontal fire shockwave with knockback; grounded caster. |
| Kháng Long Hữu Hối | Temporary self buff to critical chance and critical damage; no outgoing hit. |
| Hàng Long Hỏa Vũ | One broad forward-traveling fire wave, dragon heads embedded in crest. |
| Hoành Tảo Bổng | Wide frontal rotational staff sweep with damage and slow. |
| Phá Giáp Bổng | Heavy staff strike with temporary defense reduction. |
| Cầm Long Công | Limited pull of enemies in front plus silence and disarm; movement remains allowed. |
| Truy Phong Bổng | Directional dash that hits and stuns. |
| Thiên Hạ Vô Cẩu | Close-range multi-hit staff whirlwind ending in a heavy smash. |

Only Hỏa Vân Chưởng and Cuồng Long Loạn Vũ currently have executable active-skill definitions in `packages/game-data/src/m1.ts` and execution in `packages/game-core/src/simulation.ts`. The other eight use `CONTENT_DATA.md` design specifications; numeric range, cast timing and frame counts are intentionally unset. Buildup poses do not introduce new charge delays or input locks. Visual dragon motifs do not create new hits or targets.

## Basics and passive

- **Cái Bang Chưởng:** reuse approved `assets/exports/characters/hero_cai_bang_chuong.png` + JSON and editable Aseprite source.
- **Cái Bang Bổng:** reuse approved `assets/exports/characters/hero_cai_bang.png` + JSON and source, including six-frame side sweeps.
- Both use 80×80 RGBA canvases, approximately 44 logical-pixel bodies, foot pivot (40,64), origin (0.5,0.8). Current normal attack timing is 300ms; no approved bytes replaced.
- Existing fire projectile/impact art (`assets/exports/effects/fire.png`) and drawn staff arc are prototype VFX, not approved finished skill artwork. They are unchanged.
- **Tiêu Diêu Công:** automatic damage/crit growth by level. No aura or activation is required by its definition, and the passive is not implemented yet. No new effect was invented.

## Inspection and provenance

Read: AGENTS.md, DECISIONS.md, CONTENT_DATA.md, ART_PRODUCTION_STANDARD.md, ART_DIRECTION_REFERENCE.md, ART_ASSET_GUIDE.md, UI_UX_SPEC.md, relevant ROADMAP/TECHNICAL_ARCHITECTURE sections, CODEX_ART_QUALITY_RESCUE_TASK.md, approved character source/readme/lock, creep concept manifest/readme, active-skill config/core execution and current rendering paths.

Visually inspected: requested Cái Bang character/world references, both actual approved Bổng/Chưởng atlases (all existing idle/walk/normal-attack poses), current rejected placeholder screenshot, existing fire VFX, arena v2 concept, arena-creep master, and existing Võ Đang reference.

All user-expected reference paths were present. The older repository-mandated `assets/references/vo_dang_art_direction_reference.png` was absent; existing `vo_dang_character_reference.png` was inspected instead. The arena-creep concept README/manifest still say pending approval, so no approval was inferred or changed.

Original AI-assisted raster concepts generated with **OpenAI built-in image_gen.imagegen**, guided primarily by approved runtime character atlases. No external art pack imported. Reference ownership is not independently established; no claim of exclusive copyright or human hand-pixelled authorship. The existing hero identity is retained; concept illustrations are not pixel-identical runtime frames.

Exact initial and corrective prompts are in [generation_prompts_v1.json](generation_prompts_v1.json); skill/source/approval records are in [concept_manifest_v1.json](concept_manifest_v1.json). Initial Hỏa Vân extra/fan shots were corrected. Staff sweep contact, cracked-defense cue and Cầm Long inward arrows/item-drop ambiguity were corrected. Discarded drafts remain outside the deliverable folder in the generator's original storage.

## Checkpoint

**Concept approval received:** the user approved all four sheets and authorized Phase B. Production review is linked above. Approved runtime assets remain protected; no production gameplay integration is authorized by this art approval.

Concept PNG decoding/dimensions, all ten IDs/stage coverage and locked baseline hashes are checked. Typecheck, game tests and browser playtests are not run because no runtime code/assets changed and no animation or game-scale validation is claimed. Phase B must separately inspect every new frame, alpha, directions, pivots, packing/JSON match and actual Phaser playback.

