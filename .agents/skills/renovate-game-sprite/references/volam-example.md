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

