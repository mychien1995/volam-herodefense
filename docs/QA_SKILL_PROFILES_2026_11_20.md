# Skill prerequisites and legacy preflight — 2026-11-20

Tooling and test changes only. No gameplay, simulation, content, production client/server or runtime art changed. Existing WIP is retained. Usage: [QA tooling](QA_TOOLING.md).

## Implemented

- Shared skill helpers resolve the current actor, require scene/server readiness, and verify fresh events plus input acknowledgement. Explicit UI learning checks rank/revision. Kinh Lôi requires an owned area or a charge and one real S input; Q remains a separate real input.
- Private-area verification requires a **new** owner-visible trap and same-room/zone peers whose authoritative ticks advance. Frozen projections cannot prove concealment. Summon travel requires the exact living summon ID, current owner, destination Phaser actor/health bar and removal from old-zone peer rendering.
- The existing Đường Môn and Ngũ Độc suites consume these helpers. A focused three-browser profile exercises legal learning, Kinh Lôi → Q, private traps and summon dungeon travel using existing server-only level-6 trial flags. No cast, hit, area or transfer outcome is injected.
- All 80 tracked old profiles plus the new profile have shared preflight contracts. Fixed/alias ports, multiple service pairs, auxiliary fixture ports, preview/development/static modes and browser channels are explicit. Unsupported overrides and USE_LIVE flags fail before preparation. The runner sets the matching production build endpoint. Final retains all stages, including arena production endpoint guards.

## Before–after measurement

Same machine, branch and command: the legacy Đường Môn profile, owned listener on server port 28791, client port 28792, matching `VITE_SERVER_URL`, line reporter. The listener returned the same sentinel before cleanup in every trial. No foreign service was borrowed, terminated or changed.

| Observation | Before | After |
| --- | ---: | ---: |
| Old profiles recognized by shared preflight | 8 / 80 | 80 / 80 |
| Busy-port failure, child wall time | 189.208s (one trial) | 0.167s / 0.168s / 0.170s; median **0.168s** |
| Stages reached | prepare, compile, production build, browser | preflight only |
| Owned benchmark listener unchanged | yes | yes, all three trials |

The original FAIL is preserved: old preflight reported the profile unmanaged, then the browser timed out creating a room against the occupied endpoint. Its stage costs were 98.00s preparation, 1.57s compilation, 21.39s build and 68.10s browser. Cold/warm preparation costs differ; this measures earlier diagnosis of an invalid environment, **not** a speedup of a successful game run. No billed-token saving is claimed. Shared contracts/helpers reduce repeated prerequisite discovery and copied assertions; that reduction is not a measured billing result.

Raw results: [before](evidence/sessions/qa-skill-profiles-before/busy-before.json), [after 1](evidence/sessions/qa-skill-profiles-after/busy-after.json), [after 2](evidence/sessions/qa-skill-profiles-after-2/busy-after.json), [after 3](evidence/sessions/qa-skill-profiles-after-3/busy-after.json). Timing reports alongside them retain PASS/FAIL and stage boundaries. Local full logs remain under the corresponding session directories.

## Coverage and limits

- [Resolved config audit](evidence/sessions/qa-skill-profiles-after/profile-audit.json): 80 old configs, no mismatched resolved client port. Fourteen configs omit a base URL; their service contracts were checked against the test/tool setup source.
- [Actual preflight probes](evidence/sessions/qa-skill-profiles-after/preflight-live.json): skills, Đường Môn, Kim Luân + Lý Mạc Sầu, M3D r3 and Nam Đế PASS. Healthy checks took 0.475–3.925s; system Chrome/Edge are launched headlessly and closed to verify availability. This adds an early guard rather than promising zero overhead.
- [Đường Môn legacy run](evidence/sessions/qa-skill-profiles-duong-mon/check-workflow/browser-timings.json): PASS, 62.94s total / 36.64s browser. Two Phaser clients plus four SDK peers, including the migrated private-trap check.
- [Ngũ Độc legacy run](evidence/sessions/qa-skill-profiles-ngu-doc/check-workflow/browser-timings.json): PASS, 73.49s total / 40.50s browser. Two Phaser clients plus four SDK peers, including the migrated summon transfer check.
- Focused iteration PASS: three live Phaser clients, genuine inputs/travel, exact reaper ID and HP 290 → 290 across arena/private forest; no browser errors. Negative cases reject old events, zero charge and frozen peer observations. The first failed iteration exposed unlearned Q; it remains recorded separately from passing evidence.
- [Full final validation](evidence/sessions/qa-skill-profiles-final/check-workflow/final-timings.json): **PASS, 353.33s** — typechecks, 42 workflow regressions, 1,159 unit/integration tests in 110 files, production build, all 33 asset/reference validators and both focused browser cases. Browser stage: 46.66s. Negative UI-learning checks cover missing points, acknowledged rank/revision and idempotent reuse of an already learned skill. The final registry edge-case review also reran [18 focused workflow checks](evidence/sessions/qa-skill-profiles-after/workflow-final.txt), including rejecting port override `0`; unaffected suites were not repeated.
- Fresh [authoritative skill receipts](evidence/sessions/qa-skill-profiles-final/skill-observations.json) and [destination PNG](evidence/sessions/qa-skill-profiles-final/summon-destination.png) are retained. The PNG supports the live state/event observations; it does not establish animation or art approval by itself. [Fresh validator metadata](evidence/sessions/qa-skill-profiles-final/thieu-lam-validation-fresh.json) is preserved separately; its generated count was restored in the unrelated source report.
- [WIP integrity](evidence/sessions/qa-skill-profiles-final/wip-integrity.json): all **352** original dirty/untracked files retain their bytes and Git status. No gameplay/source asset changes or commit were made by this task.

This does not run all 80 historical browser/art suites, modernize every legacy service lifecycle, approve artwork, test balance or establish natural-combat/long-soak acceptance. Unregistered WIP configs remain untouched. Existing identity/cleanup checks still apply; preflight cannot eliminate the race between checking and binding a port. Future profile/setup changes must update the registry.

## Reproduce

```powershell
node --test scripts/tests/qa-profiles.test.mjs scripts/tests/qa-preflight.test.mjs scripts/tests/qa-session.test.mjs scripts/tests/qa-browser.test.mjs
$env:VOLAM_QA_SESSION = 'qa-skill-profiles-final'
pnpm check:final --config playwright.qa-skill-prerequisites.config.ts --reporter=line
# Existing consumer checks; give each its own session/output.
pnpm check:browser --config playwright.duong-mon-game.config.ts --reporter=line --output artifacts/qa-skill-profiles-duong-mon
pnpm check:browser --config playwright.ngu-doc-game.config.ts --grep 'Ngũ Độc plays' --reporter=line --output artifacts/qa-skill-profiles-ngu-doc
```
