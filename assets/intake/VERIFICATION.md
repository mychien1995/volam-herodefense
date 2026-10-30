# Intake verification — 2026-10-30

- Visually inspected all six inbox files. `python scripts/asset-intake.py audit`: six files, **zero genuine transparent inputs**. Original inbox files preserved; no checkerboard removal or image generation attempted.
- Explicit user approval recorded in `DECISIONS.md`, art guide, runtime manifest and source documentation. SHA-256 lock covers eight approved source/export files. `python scripts/asset-intake.py baseline`: PASS before and after processing/builds. No approved pixels or atlas metadata were regenerated.
- `python tests/asset-intake.test.py`: **9 tests PASS**, covering baseline integrity, valid pixels, opaque checkerboard rejection, JPEG rejection, missing directions, clipping, review gate, protected IDs and pixel-exact Aseprite roundtrip.
- `python scripts/asset-intake.py process assets/intake/validation_fixture.json`: PASS, one existing approved frame copied through Aseprite into an editable source, PNG/JSON atlas and staged manifest. Decoded exported pixels equal the approved input exactly. This is a validation fixture, not imported enemy/NPC artwork and not installed into runtime.
- `pnpm typecheck`: PASS.
- `pnpm test`: **63 tests PASS** in six files, including the new baseline hash regression.
- `pnpm verify:assets`: PASS, 17 runtime asset entries, 248 frame references. Existing metadata registration remains operational with approved hero status.
- `pnpm test:e2e`: build passed; 13 of 14 browser tests passed. The staff capture expected an attack pose while a live enemy applied `hurt:right`; this is a timing-sensitive capture assertion, not evidence of changed combat logic. The combined 24-tag animation preview, Chưởng capture, six clients, camera/collision/depth, two-client combat/progression, projectile, lobby and UI checks passed. A targeted staff-capture rerun is recorded below after completion.
- Prettier on changed JS/TS and `git diff --check`: PASS.
- Targeted unchanged staff-capture rerun (`node tools/run-playwright.mjs test tests/e2e/cai-bang-art.spec.ts --grep 'real match'`): **PASS**, 1 test. The initial hurt-pose capture timing failure remains recorded above; no game rules or approved animation were changed to resolve it.

The production build retains its prior large-chunk advisory. Actual preservation screenshots/animation captures from this run are under `assets/reviews/cai_bang_v1_6_v2/` (including the preview header now correctly identifying the approved baseline). These show the approved hero and **existing placeholder enemy/environment/VFX**, not a completed first Gemini batch.

**New imported enemy/NPC/tree/building/terrain/skill visual verification is blocked by the source requirements in `ASSET_INVENTORY.md`.** No improved-arena, imported-enemy fight or new skill-animation screenshot is claimed. Once corrected sources arrive, run preflight/staging, integrate only the requested small batch using the current metadata registry, capture the actual scene, compare against approved character and world references, and stop for first-batch approval.
