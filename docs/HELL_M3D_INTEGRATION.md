# Hell integration into milestone/m3d — 2026-11-02

At the user's explicit request, merge Hell commit `e5fdfdb5` from `wip/m3d/hell` into **`milestone/m3d`**, based on target commit `46d36869`. Main checkout: **D:/Projects/volam-hero-defense**. The existing untracked `boss-prompt.txt` is preserved and excluded from the merge commit (SHA256 `122bd7951f88c346a02c682922dae695d498c4f08412a07fb8d36f0341b585d5`). No unrelated working changes were present.

The target has newer Chu Bá Thông, Hồng Liệt, Kim Luân and Cổ Mộ integrations. Conflicts were resolved explicitly to retain all of them alongside Forest, Desert, Beach and Hell. The combined selector, registry and room register **all eight destinations**. Protocol18 advances the target's17 without dropping boss/item/effect fields or requests. Boss renderers, Cổ Mộ casts/HUD, loot controls, approved asset loaders and provenance guards remain. No game-core mechanics, balance rules, controls or raster artwork are changed by reconciliation. Hell's original runtime art approval remains **pending**.

Read the current AGENTS, workflow, decisions/architecture additions, UI_UX_SPEC and mandatory viewport references; reuse game-playtest and retained pixel-art pipeline workflows. Historical Hell implementation/full evidence remains in `docs/HELL_INTEGRATION.md` and `docs/evidence/hell-integration-2026-11-01/`. Original failed runs remain historical rather than being relabelled.

Focused merge check:

- `pnpm check:quick tests/m3d-hell-integration.test.ts tests/m3d-kim-integration.test.ts tests/hell-dungeon.test.ts`: **PASS, 6 tests across 3 files**. Includes protocol18/all selectors, independent boss/Hell worlds, generic Hell tuning, private pause/resume and map geometry. Preparation retained every current boss guard.

Required final command: `pnpm check:final --config playwright.hell-m3d.config.ts`, after the final reconciliation change. The browser profile reuses one owned Hell QA service (2700/5300), the five existing Hell/forest cases, existing all-destination menu entry expanded to Hell, and the existing input-only two-client Kim Luân combat/isolation case. No boss fixture endpoint is used by these selected boss regressions. Video and trace screenshot streams remain disabled.

## Final verification results

The final pipeline ran once (547.31 seconds): preparation, application/tools/test typechecks, **18 workflow checks, 476 unit/integration tests across 43 files, production build and all 16 asset validators passed**. The build retained its existing large-chunk warning. Browser verification initially finished **6 passed / 1 failed**: the Hell frame observer measured an idle interval of 566.6ms against 350ms, exceeding the unchanged 180ms tolerance. The original pipeline result remains **FAIL** in its timing record; it is not relabelled as an uninterrupted success.

The QA-only profile then received the existing Kim profile's Chromium background-throttling flags. No runtime implementation or frame timing assertion changed. `pnpm exec tsc -p tsconfig.tools.json --noEmit` passed. The affected retry, `node tools/run-playwright.mjs test --config playwright.hell-m3d.config.ts --project=hell --grep "two clients observe all Hell"`, **passed** (one case, about 1.1 minutes): 92 animation tags and 276 unique cels. An earlier retry invocation used `--project hell tests/e2e/hell.spec.ts`; Playwright treated the file argument as a project name and exited before starting tests. The corrected invocation above supplied the successful retry. Successful full-suite stages were not repeated.

All **seven distinct selected browser cases passed across the final run and focused retry**: Forest shared/private flows, Hell two-browser animation observation, six-participant Hell combat, Hell private pause/resume and Desert/Beach return, all eight menu destinations, and Kim Luân two-browser combat/private isolation. The six-participant check used **two browser contexts plus four SDK clients**, not six browsers. It recorded six deaths, 360 XP, wave advancement, impassable lava boundary collision, physical Space exit, contact effects and disconnect cleanup without browser errors. Lava was tested as an impassable boundary, not as a new damage mechanic. Encounter placement used an arrangement-only fixture; combat proceeded through authoritative natural gameplay. Frame/pose inspection is controlled visual verification rather than proof of natural encounters in every animation state.

## Evidence and asset status

New PNGs and observation reports are in `docs/evidence/hell-m3d-merge-2026-11-02/`:

- `hell/hell-frames-1280.png`, `hell/frames.json`: successful animation retry.
- `hell/hell-six-player-1920.png`, `hell/hell-combat-1280.png`, `hell/combat.json`: multiplayer presentation and authoritative combat observations.
- `selector/dungeon-selector-{960,1280,1920}.png`, `selector/selector-regression.json`: eight destinations and in-viewport overlay checks.
- `kim/two-clients.png`, `kim/two-clients.json`: retained boss regression.
- `initial-frame-failure/` and `final-pipeline-timings.json`: retained failure diagnostics.
- `capture-index.json`: new capture hashes and historical evidence restoration record.

The new 1920×1080 Hell encounter and 1280×720 selector PNGs were visually inspected: the world fills the match viewport, HUD/menu remain inside it, and the Hell scene uses retained terrain and sprite art. PNGs do not prove animation; the separate frame observer supplies motion evidence. No video or screenshot trace streams were captured. All 33 pre-existing evidence files touched by the browser suites were restored byte-for-byte, with fresh captures saved separately.

Actual source/export/runtime asset paths, supported clips and provenance are documented in `docs/HELL_INTEGRATION.md` and `assets/hell_dungeon.manifest.json`. This merge adds no generated artwork and changes no retained Hell provenance expectations. A fresh index checkout reproduced all 24 independently recorded original Hell text-file hashes. The Thiếu Lâm validator's generated `approvedCharacterFilesUnchanged` count updates from 3432 to 3678 after checking the expanded retained asset set; raster artwork is unchanged. **Runtime director approval for Hell remains pending.**

The merge preserves all existing boss integrations and unrelated `boss-prompt.txt`. No balance, skill, reward or traversal mechanics were added during reconciliation. Changed implementation files are the dungeon registry/protocol, room registration, client loaders/rendering/menu integration and focused regression/QA configuration; the remaining additions are retained Hell map/assets/scripts and documentation/evidence from the source branch.
