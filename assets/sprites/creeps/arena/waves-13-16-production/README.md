# Phase 1H — Waves 13–16 production

Original concept-referenced raster animation artwork, exported with Aseprite. The approved Phase 1G concepts remain unchanged. Final runtime art approved by the owner on 2026-10-31 ("all approve"); see `approval_v1.json` and `assets/approved_arena_creeps_13_16.lock.json`.

| Wave | Asset folder | Concept source | Body height | Frame canvas / feet |
| --- | --- | --- | --- | --- |
| 13 | `../ma-khuyen/` | `assets/concepts/arena-creeps/waves-13-16/ma_khuyen_concept.png` | 34px | 128×96 / (64,76) |
| 14 | `../tieu-hoa-quy/` | `assets/concepts/arena-creeps/waves-13-16/tieu_hoa_quy_concept.png` | 32px | 96×96 / (48,76) |
| 15 | `../hoa-phap-su/` | `assets/concepts/arena-creeps/waves-13-16/hoa_phap_su_concept.png` | 48px, excludes staff | 144×128 / (72,106) |
| 16 | `../nguu-ma/` | `assets/concepts/arena-creeps/waves-13-16/nguu_ma_concept.png` | 66px, includes horns | 192×160 / (96,134) |

Each character has 64 distinct transparent frame PNGs, one editable `.aseprite`, PNG/JSON atlas, extraction audit and concept-to-export manifest. Four separately authored facings each contain idle (2), movement (4), attack (4), hurt (2) and death (4). Transparent canvas margins accommodate moving weapons and fallen poses; they do not enlarge collision or combat range.

`effects/` contains 28 distinct 64×64 PNG cels in seven tags: four confirmed-contact effects, two projectile loops and one small hound ember loop. Effects use the same original generated-pixel extraction and Aseprite export workflow.

## Reproduction and validation

- `generation_prompts_v1.json`: exact character requests and approved image reference inputs; the effect request is `effects/source/generation_prompt_v1.json`.
- `production_config_v1.json`: immutable source selection, source-level scales, feet anchors and timings.
- `build_sprites.py`: extracts actual generated components, clears weak alpha with Aseprite, uses fixed nearest scaling per source, creates editable sources and exports individual PNGs/atlases.
- `build_effects.py`: exports the selected generated FX components, not procedural replacement artwork.
- `approved_inputs_lock.json`: 1,145 prior concept/production/approved-hero inputs protected by SHA-256.
- Run from repository root: `python -X utf8 tools/verify-arena-creeps-13-16.py`. This is read-only and checks every atlas pixel, alpha, bounds, unique frame, timing, editable source, public copy and protected input.

The initial cultist right-facing source had an extra staff in two poses. Those poses were rejected; the entire right attack/death group uses the corrected single-staff source. Original generated sources remain retained for audit. Body-only hood measurements exclude the raised staff; brute anchors use hooves rather than a lowered axe tip. No per-frame fit scaling or programmatically drawn substitute artwork is used.

## Runtime scope

`scripts/prepare-arena-creeps.mjs` copies retained exports to `apps/game-client/public/assets/arena_creeps/`. Runtime mappings are in `assets/arena_creeps.manifest.json`. Waves 1–12 remain under their existing `sprites/creeps/arena/` convention; this batch uses the requested `assets/sprites/creeps/arena/` convention. Earlier approved directories were not moved.

The existing invasion recipe is melee for all four enemies. Casting and axe-smash poses bind to existing authoritative attack/hit/death events. Projectile graphics are supported only when a server-owned projectile exists; the renderer test uses a labeled zero-damage fixture. No enemy ranged AI, charge, burn, area damage, collision, range, stats or wave rule was added. Brute impact is a contact dust fan, not a new shockwave mechanic.

See `docs/PHASE_1H_INTEGRATION.md` and `docs/evidence/phase1h-integration/` for measured results and actual PNG evidence. No recordings are generated. Stop at Wave 16; final runtime artwork is owner-approved. Phase 1I remains unstarted.
