# Bamboo integration into milestone/m3d — 2026-11-01

Feature commit `b376bc51ef9102a7db68288a5d4a6e5ce9127622` was fast-forwarded from `wip/m3d/bamboo` into the current main-project branch `milestone/m3d` at `D:\Projects\volam-hero-defense`. No merge conflict or runtime implementation edit was required. Forty-two unrelated modified/untracked files were hashed immediately before and after the fast-forward; all were byte-identical. Their edits remain outside the Bamboo commits.

Only necessary integration checks were run:

- `node scripts/prepare-forest-creep-review.mjs`: PASS; current runtime adapter has `normalForestRosterIntegrated=true`, with unchanged approved artwork.
- `pnpm exec vitest run tests/dungeons.test.ts tests/dungeon-room.test.ts tests/forest-creep-art.test.ts tests/desert-dungeon.test.ts`: **29/29 PASS, 4 files**, 8.68s (`focused-tests.log`). This reused the compilation already completed by the browser workflow.
- `node tools/run-playwright.mjs test --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts --grep '2 clients'`: **1/1 PASS**, 1.7m scenario / 1.9m invocation (`browser.log`). Actual natural shared Forest, menu entry, two waves, animation/VFX observations, authoritative rewards, exit/pause/re-entry and ordinary URL without art/debug flags.

The initial `pnpm check:browser --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts --grep '^2 clients'` completed preparation, shared/server compilation and the current client production build, then selected zero tests because the anchored expression did not match Playwright's full title. Its log is retained as `browser-selection-failure.log`. The browser stage alone was retried with the corrected unanchored filter; preparation/compile/build were not repeated. The first preparation had started before the fast-forward and retained old adapter metadata in memory; the standalone current Forest adapter was run afterward, before the focused tests/browser retry, to write the current roster flag. No artwork was generated.

Observed server wave 1: `truc_xa`, `doc_chu`, `son_vien`. Wave 2 with participant snapshot 2: `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`, `truc_xa`, `doc_chu`. Both waves cleared; the two clients agreed on **480 XP / 96 gold**, with an empty browser error list. Details and actual PNGs: `shared-2/observations.json`, `wave-1-natural.png`, `wave-2-natural.png`, `natural-combat-rewards.png`, `normal-url-no-flags.png`.

All **60 approved Bamboo environment files** and **565 approved Forest creep/VFX files** still match their approval-lock hashes. The existing source-worktree full checks and six-player evidence remain in `../forest-natural-2026-11-01/`; full suites, all-asset validators and the six-player gate were not repeated for this conflict-free integration. No server owned by another chat was restarted or stopped.

Current code is now present in the main checkout. An already-running process that still holds older modules/rooms may need a normal server restart and a fresh match to use the new roster.
