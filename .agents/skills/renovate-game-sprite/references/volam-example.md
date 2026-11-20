# Measured Võ Đang example

The user praised the arena and hero in `wip/m3d/visual-upgrade-2` and requested this reusable process on 2026-11-05. Use this version as a visual-quality benchmark when renovating Võ Lâm assets. Its recorded implementation is an interactive art preview.

Paths below are relative to the Võ Lâm Hero Defense checkout. If missing in the current checkout, locate the reference worktree with `git worktree list` and inspect that copy read-only.

| Purpose | Existing source |
| --- | --- |
| Exact generation prompts, provenance and hashes | `assets/source/visual-upgrade-2/manifest.json` |
| Original generated hero, environment and VFX PNGs | `assets/source/visual-upgrade-2/raw/` |
| Per-facing common scale, source cells, selected cels and feet | `assets/source/visual-upgrade-2/layout.json` |
| Tested Aseprite assembly/export recipe | `assets/source/visual-upgrade-2/export.lua` |
| Editable-cel/export comparison | `assets/source/visual-upgrade-2/verify.lua` |
| Actual PNG/JSON assets | `assets/exports/visual-upgrade-2/` |
| Interactive native-resolution Phaser scene | `apps/game-client/src/visual-upgrade-2.ts` |
| Preview entry | `apps/game-client/visual-upgrade-2.html` |
| Live frame, movement, menu and effect checks | `tests/e2e/visual-upgrade-2.spec.ts` |
| Production-preview setup and test configuration | `tests/e2e/visual-upgrade-setup.ts`, `playwright.visual-upgrade.config.ts` |
| Native screenshot and evidence | `assets/reviews/visual-upgrade-2/README.md` |

The successful preview contains 24 hero cels, 24 VFX cels and nine environment components. Its character canvas is 192×160 with feet at (96,128), an approximately 88-pixel body and four 110 ms walk cels per facing. Each facing has one drawn cast pose shared across the five effect previews. Selected rear cels were mirrored to correct sword handedness. Source attack cels touching the generation-cell boundary were retained in raw sources and omitted from the final selection.

The ground is natively 1478×1064. Props use 384×384 canvases with pivot (192,368). These sizes belong to the measured example. Choose the new sprite's dimensions from its role and intended camera.

Reuse the recipe's alignment and alpha-handling approach through a new versioned asset definition. Its exact paths, source indices, grid sizes, frame counts, prop heights and palette belong to Võ Đang and its arena. Change those values deliberately for the requested asset.

The old and revised sprites were compared at 88 visible pixels of body height. The interactive preview uses native canvas dimensions and linear sampling. The final run passed typechecks, 18 workflow checks, 727 unit/integration tests, 20 asset validators and two preview-browser cases. Aseprite verified 48 cels against their exported rasters. Those results describe that retained revision. Run applicable checks for each new renovation.

For this Windows preview, starting Vite through its JavaScript `preview()` API let the fixture close its own HTTP server directly. The earlier pnpm web-server wrapper needed manual cleanup after passing assertions. Reuse the existing setup when it fits the new preview.


## Character coherence and sharpness lessons — 2026-11-19/20

These are retained case studies, not authorization to alter the current game or expand a sample. Read the latest user request and integration memory first. Paths below are relative to this repository; discover equivalent tooling before reusing the skill elsewhere. Read these files when doing state coherence, action-density correction or directional sharpness prototypes:

| Case / reusable mechanism | Repository locator |
| --- | --- |
| Staged school rollout; candidate versus approved art | `docs/HERO_COHERENCE_ROLLOUT.md` |
| Kunlun action shrinkage and Thiên Sơn Đao style correction | `docs/SPRITE_CORRECTIONS_2026_11_20.md` |
| Sample-only sharpness contract, PNGs and room evidence | `docs/THIEN_SON_SHARP_PROTOTYPE.md` |
| Poison palm sockets, summons and passive-slot checks | `docs/NGU_DOC_COHERENCE.md` |
| Versioned source registration and trimmed packing | `tools/hero_unified_assets.py`, `tools/export-hero-unified.py` |
| Existing Aseprite assembly / alpha-visible RGB verification | `tools/export-hero-unified-native.ps1`, `tools/make-hero-unified.lua`, `tools/verify-hero-unified.py` |
| Kunlun source-density regression | `tools/verify-con-luan-density.py` |
| Exact sharpness-sample scope / retained-cel and portrait guard | `tools/verify-thien-son-sharp-prototype.py` |
| Canonical state sampling and native choreography cues | `apps/game-client/src/unified-hero-body.ts`, `apps/game-client/src/unified-hero-policy.ts` |
| Existing peer/authority/frame probe and prototype profile | `tests/e2e/chuong-unified-probe.mjs`, `tests/e2e/thien-son-sharp-prototype.spec.ts` |
| Measured socket data and final-body anchoring | `tools/hero_unified_hands.py`, `apps/game-client/src/ngu-doc-art.ts` |

Kunlun's action group had been reduced to roughly 0.73–0.97 of the original source density by silhouette-based normalization. Correcting registration retained the artwork and runtime scale. Separate high-resolution idle replacements also needed their own source coordinate system. This is why a fixed runtime scale alone did not prove consistent actor size.

Thiên Sơn Đao's simplified outline language needed an identity-preserving redraw to match Phiến's material detail. A later blur review found that both branches still had soft contours and fine low-contrast detail at gameplay size. The sharpness prototype authored clearer contours/value groups for only 12 southeast idle/walk/basic cels per branch; 456 other cels and HUD portraits stayed identical. Native checks covered 480 total frames, not 480 newly drawn frames. These counts, an 89-pixel body and runtime scale 0.5 describe that prototype, not reusable defaults.

The existing exporters, native wrappers and probes have dependencies and profile-specific behavior. Read their current arguments and source definitions before executing them. `verify-con-luan-density.py --version v1` intentionally reproduces the old failure; the sharpness scope guard intentionally pins the retained baseline. Neither is a universal validator for a different asset set. Keep generation/export scripts in the repository rather than copying evolving project code into this skill.

For skill/documentation-only maintenance, validate the skill frontmatter, reference links and invocation metadata. Do not run these exporters, regenerate assets or open game rooms merely to validate a skill edit.
