# Small gameplay integration into M3D — 2026-11-01

Merged `wip/m3d/small-game-play-change` (`a714bab`) into `milestone/m3d`, starting from `52c6c46`. The seven requested gameplay changes are documented in [SMALL_GAMEPLAY_CHANGES.md](SMALL_GAMEPLAY_CHANGES.md).

## Integration decisions

- Resolved the forest notice/test conflicts by retaining M3D's generated approval status and Vietnamese player-facing copy. Approved-art locks, approval metadata and the existing normal-roster gate remain unchanged.
- Retained M3D's QA session tooling and readiness waits. The dedicated gameplay config/setup now writes reports and PNGs into the selected QA session instead of overwriting source-branch evidence.
- School-selection helper accepts additional SDK peers beyond the browser-page count. The two-browser Võ Học test now starts with a third SDK peer to exercise this compatibility.
- Retained the target checkout's arena atlas hashes after asset preparation; no new art or gameplay tuning was introduced.
- Concurrent animation-review source/assets/tests appeared after the checkout's initial clean-state check. They are preserved outside this merge commit. The tested production build was generated before those source edits.

## Affected verification only

The user's integration request explicitly limits retesting to affected areas. No full suite or `check:final` was rerun.

```powershell
$env:VOLAM_QA_SESSION='small-gameplay-integration'
pnpm check:quick tests/default-builds.test.ts tests/progression.test.ts tests/progression-room.test.ts tests/dungeons.test.ts tests/dungeon-room.test.ts tests/desert-dungeon.test.ts tests/invasions.test.ts tests/invasion-room.test.ts tests/room.test.ts tests/protocol.test.ts tests/skill-room.test.ts tests/thien-son-room.test.ts tests/vo-dang-room.test.ts tests/thieu-lam-room.test.ts tests/forest-creep-art.test.ts
pnpm exec tsc -p tsconfig.tools.json --noEmit
node --test scripts/tests/qa-session.test.mjs scripts/tests/qa-wait.test.mjs
$env:VOLAM_QA_PLAYWRIGHT_OUTPUT='D:\Projects\volam-hero-defense\artifacts\small-gameplay-integration'
$env:VITE_SERVER_URL='http://127.0.0.1:2667'
pnpm check:browser --config playwright.small-gameplay.config.ts
python -X utf8 scripts/verify-forest-creeps.py
```

Results: **152/152 unit/integration tests in 15 files; 10/10 QA utility tests; 12/12 Chromium cases**, with zero skipped, unexpected or flaky cases. Project/tool compilation and the production build passed. Focused forest static validation passed, preserving all 565 protected forest-creep inputs. This validator is not normal forest gameplay acceptance.

Chromium verified six-player school selection at 944×466, 1280×720 and 1920×1080; automatic QWER, slot replacement and Custom mixing across clients; text-focus/modal handling for P; both dungeon doors with walking, fresh Space, held/distant Space and click rejection; local-only grayscale and central respawn from forest/desert/arena; quit confirmation; in-viewport menus and live two-client input/focus behavior. Gameplay remains server-authoritative.

Evidence is isolated under [sessions/small-gameplay-integration](evidence/sessions/small-gameplay-integration/verification-summary.json). Nine PNGs and the Playwright JSON report are in its `small-gameplay/` directory; timing reports are in `check-workflow/`. Selection, skill, death and quit PNGs were visually inspected. Original `docs/evidence/small-gameplay/` evidence remains unchanged. No video, GIF or trace recordings were generated.

Unrelated art suites, combat simulations and other milestone browser suites were not rerun.
