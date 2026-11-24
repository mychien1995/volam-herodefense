# Thiền Sư three-stage basic integration — v06

Director approved the photographed-motion studies and requested **thrust → two-handed sweep → overhead**, retaining existing lightning imagery. This supersedes the V05 two-stage A. The retained thrust, idle, walk and skill bodies are unchanged. Runtime behavior and evidence are indexed in `docs/SKILL_REVISE_THIEN_SU_V06_2026_11_24.md`.

`hammer-combo-v6` contains 96 runtime cels / 16 clips: 40 authored action poses (eight reviewed right-facing poses plus 32 directional redraws), 24 mirrored left-facing poses, and 32 exact neutral entry/recovery cels. Each new action uses four distinct authored key poses; no interpolated or unproduced in-between animation is claimed. The native source has the same 96 frames. The reviewed input atlases and historical/rejected takes remain byte-identical.

Reference roles and provenance: the two approved sheets define movement/identity; V04 masters define front, diagonal and rear facing. Built-in image generation produced each new directional sheet on transparency. `generation.json` and `directional-generation.json` retain exact prompts, receipts, scope and batch timing. `registration-config.json` records one anatomical scale per sheet and annotated boot roots independently of weapon extent. The exporter reuses `tools/hero_unified_assets.py`; it does not redraw character pixels procedurally. Alpha-zero RGB from downsampling is canonicalized before packing, with visible pixels preserved.

Rebuild changed art only:

1. `python -X utf8 assets/source/skill-revise-thien-su-v06/build.py`
2. Run `assets/source/skill-revise-thien-su-v06/native-export.ps1` (existing Aseprite Lua exporter, followed by roundtrip validation).
3. `node tools/prepare-skill-revise-runtime.mjs`, then the normal asset preparation/copy workflow.

Canvas 512×448, foot (256,320), runtime scale 0.5, Chaos multiplier 1.34. Native durations: sweep `[20,45,65,65,60,30]`, overhead `[20,50,55,35,90,35]`, each 285ms inside the existing server 300ms pose window. These presentation timings do not add damage or change the zero manual-A cooldown. Existing accepted-input interruption and one-cel-per-render protection remain.

Lightning/contact assets `hammer-point`, `hammer-sweep` and `con_luan_thien_su_fx` are reused. The old ground pulse is presented at new contact cel 4, using server coordinates. `scripts/verify-skill-revise-thien-su.py` is included in the canonical `verify:assets` list and checks sources, mirrors, neutral hashes, atlas bounds/alpha, native pixels/durations and public copy identity.

Validation before final: representative front-facing source exported and observed live in Phaser before generating the remaining directions; 53 focused tests passed; 96-frame native roundtrip passed; two real clients passed all 24 stage/facing takes, three retained left walks, fire AOE and natural combat/reward cleanup. `docs/evidence/skill-revise-thien-su-v06/` contains the final pipeline, six-client acceptance and a separate matched 288-vs-288 balance exposure comparison. Integration approval is recorded; final in-game visual review remains with the director.
