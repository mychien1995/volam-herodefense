# Cái Bang skill animation production — Phase B

Created 2026-10-30. Concepts approved by the user. All ten skills have **technically validated export candidates**; new production art still awaits director review. No production gameplay integration.

## Review

- [Visual index with PNG previews and live Phaser links](../../../reviews/skills/cai-bang/index.html)
- [All individual PNG frames](../../../reviews/skills/cai-bang/frames.html)
- [Progress manifest](../../../exports/skills/cai-bang/progress_manifest_v1.json)
- [Production manifest](../../../exports/skills/cai-bang/production_manifest_v1.json)
- [File validation](../../../exports/skills/cai-bang/validation_v1.json)
- [Actual Phaser evidence](../../../reviews/skills/cai-bang/phaser_verification.json)

Deliverables: 10 character components, 10 skill VFX components, 1 shared fire component; **464 exported frames / 105 animation tags**, including reused approved poses and exact cardinal variants. Every animation has separate transparent PNG frames, an editable Aseprite source, packed PNG, Aseprite atlas JSON and animation metadata. The 464 count is exported cels, not 464 unique newly generated drawings.

## Files and conventions

- Original newly generated PNG sources: generated/. These are animation sources, never concept-sheet crops.
- Editable character and VFX cels: <skill>/character/ and <skill>/vfx/, with individual PNGs under frames/.
- Final candidate exports: assets/exports/skills/cai-bang/<skill>/.
- Each .animations.json records skill ID, animation name, dimensions/count, cadence, loop/repeat, pivot/origin, direction, placement/offset, stage, provenance and validation scope.
- Character canvases preserve **80×80**, pivot **(40,64)**, origin **(0.5,0.8)**. VFX canvases vary by effect: 64, 96, 128 or 160 square pixels; opaque art is smaller than its canvas.
- Generated source art is cleaned to binary alpha in Aseprite, removing low-alpha haze. Each sequence uses one fixed scale and common anchor, never per-frame fit-to-box. Original sources are retained.
- Effect offsets are directional. Projectiles/waves/hits, character feet and ground impacts have separate placement rules.
- Quarter-turn VFX variants are exact integer pixel transforms. Right character variants mirror left, matching the baseline convention.
- New exports are not added to the existing runtime manifest, client loader or gameplay scenes.

## Batches and reuse

1. Hỏa Vân Chưởng + Cuồng Long Loạn Vũ, plus shared release/impact/burn flecks.
2. Phi Long Tại Thiên + Kháng Long Hữu Hối + Hàng Long Hỏa Vũ.
3. Hoành Tảo Bổng + Phá Giáp Bổng + Cầm Long Công.
4. Truy Phong Bổng + Thiên Hạ Vô Cẩu.

Approved palm attacks serve the palm casts; approved staff sweep/footwork serves Hoành Tảo and Truy Phong. New heavy windup/strike/recovery poses resolve Phá Giáp's concept inconsistency and supply Thiên Hạ's finisher; its opening reuses the approved sweep. Cầm Long has new staff-held channel/pull poses. Its generated hand continuity needed correction: rear corrected with imagegen; front arm/staff bands corrected locally in Aseprite while retaining head/feet. All new cels remain independently editable.

Shared release/impact/burn components avoid recreating common particles. Approved basic attack characters are reused; existing runtime fire/arc VFX are untouched. Tiêu Diêu Công specifies automatic damage/crit growth, with no required aura or activation, so no additional passive effect was invented.

## Choreography and mechanics

Hỏa Vân's isolated preview shows three straight shots at 0/100/200ms and speed 360, following current 30Hz config spacing. Cuồng Long shows one straight projectile at speed 300, collision explosion and a three-second burn display. Server events must drive eventual integration; the preview does not calculate damage or confer authority on animation frames.

The other eight skills remain catalogue specifications with no executable numeric timing/range. Their cadence and preview positions are **visual proposals**, not new game rules. Kháng Long is a self crit buff; Cầm Long is limited frontal pull + silence/disarm with movement allowed, no stun or dropped items; Truy Phong is directional dash + hit/stun; Thiên Hạ is melee sweeps + heavy smash. No damage, mana, cooldown, targeting, rank, collision, RNG or multiplayer behavior changed.

The viewer repeats one-shot tags in diagnostic modes for inspection; export metadata retains intended loop behavior. Combined/arena demos compose stages independently.

## Rebuild and verify

From repository root:

~~~powershell
python assets/source/skills/cai-bang/prepare_recipe.py
node assets/source/skills/cai-bang/build.mjs --assemble
python assets/source/skills/cai-bang/validate.py
node assets/source/skills/cai-bang/verify_phaser.mjs
python assets/source/skills/cai-bang/make_review.py
~~~

The --assemble option rebuilds only these new editable candidates from retained source art and the measured recipe. Omit it to export manually edited Aseprite cels without reconstructing them. Set ASEPRITE_PATH if needed. Aseprite 1.3.18.6 and installed Phaser 4.2.1 were used. Approved baseline hashes are checked before/after export; no locked file is overwritten.

For the interactive viewer, serve the repository root:

~~~powershell
python -m http.server 8765 --bind 127.0.0.1
~~~

Open [the isolated viewer](http://127.0.0.1:8765/assets/source/skills/cai-bang/review.html). It has no room connection. PNG screenshots can be opened directly from the visual index. `verify_phaser.mjs` observes live animation frames and captures screenshots without recording. The legacy `capture_previews.mjs` command now delegates to the same screenshot-only verification. `make_review.py` requires PNG evidence, not recordings; run `node assets/source/skills/cai-bang/verify_review_index.mjs` after regenerating the index. Existing recordings and their historical manifests remain archived. Generate recordings only on an explicit user request, per `AGENTS.md`.

## Validation actually run

- pnpm typecheck: PASS.
- pnpm test: PASS, **98 tests in 11 files**.
- pnpm verify:assets: PASS for existing runtime assets and protected baseline.
- New file checks: PASS, **464 cels / 105 tags / 21 components**. Individual PNG bytes equal atlas rectangles; dimensions, alpha, bounds, pivots, frame count, cadence and distinct frames validated. No adjacent duplicate static frames.
- Source check: PASS for **92 VFX source cells**, no alpha crossing cell boundaries. Phi Long's first draft failed and was corrected in generated/phi_long_tai_thien_v2.png before final export.
- All eight approved baseline files retain exact locked SHA256 hashes.
- Actual isolated Phaser playback: PASS, every character/VFX animation frame observed; no loader/page errors. Character-only, VFX-only, combined and arena PNG previews exist per skill, plus light/dark and six-simultaneous-cast screenshots.
- New source frames and normal-zoom captures were visually inspected. Enlarged character atlases are under assets/reviews/skills/cai-bang/frame_inspection/.

No production match integration, six-client multiplayer playtest, performance benchmark or director production-art approval is claimed. Existing unit/network regressions passed; browser validation is an isolated renderer test.

## Provenance and remaining review

Original AI-assisted raster art generated with OpenAI built-in image_gen.imagegen, guided by approved runtime atlases and approved Phase A concepts. Exact prompts and source filenames: generation_prompts_v2.json and correction_prompts_v1.json; v1 retains the first-batch prompt archive. No external asset pack imported. No claim of human hand-pixelled authorship, exclusive copyright or independently verified ownership of existing references.

Review new heavy/channel costume and motion consistency, compact frame cadence, quarter-turn VFX interpretation, dragon-wave density and six-cast readability. These are exported candidates for director review, not a declaration that every pixel or motion is approved.

Official references consulted: [Phaser loader](https://www.phaser.io/oss/docs/phaser/concepts/loader), [Phaser animations](https://phaser.io/oss/docs/phaser/concepts/animations), [Aseprite CLI](https://www.aseprite.org/docs/cli/), [Image API](https://www.aseprite.org/api/image), [Sprite API](https://www.aseprite.org/api/sprite).

## Later M3A runtime checkpoint — 2026-10-30

The isolated-production report above is historical. M3A has now integrated these retained sources/exports into actual authoritative gameplay. Aseprite 1.3.18.6-x64 was actually run with `node assets/source/skills/cai-bang/build.mjs` (without `--assemble`); all 21 components were re-exported and source validation passed with the eight locked baseline files unchanged. No artwork was regenerated.

All ten canonical skills now use the supplied character/VFX components, a reusable semantic-stage renderer and derived hotbar icons. The separate `assets/exports/skills/cai-bang/runtime_integration_v1.json` records current export hashes and actual two-client frame observations; the original Phase B manifest remains historical. All 105 animation tags register in the game and multiple moving frames were observed in every component. Not every direction/tag is claimed as multiplayer-playtested. See `docs/M3A_IMPLEMENTATION.md` and `docs/evidence/m3a/` for commands, screenshots, 134 automated tests, five new browser scenarios and 16 existing browser regressions. Production-art director approval and final balance remain pending. M3B progression has not started.

