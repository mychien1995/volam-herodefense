# QA preflight and shared helpers

Implemented 2026-11-19. Tooling/fixture changes only; game rules and runtime assets are unchanged.

## Start a session

```powershell
$env:VOLAM_QA_SESSION = 'my-feature'
$env:VOLAM_QA_SERVER_PORT = '28741'
$env:VOLAM_QA_CLIENT_PORT = '28742'
pnpm qa:preflight --mode browser
# Then the existing focused/final command; it also runs preflight automatically.
```

Do not use example ports without checking that they are free. Preflight refuses an occupied port; it never borrows or kills its owner. Keep the existing service identity checks at launch because port availability can race.

`pnpm qa:preflight --mode quick` checks prerequisites for core iteration without requiring Chromium/Python. Browser checks use the same `PLAYWRIGHT_BROWSERS_PATH` as `tools/run-playwright.mjs` (default `.cache/ms-playwright`). Final also requires Python for asset validators. `--json` returns structured checks/remedies. The command does not install, compile, prepare assets or change environment/configuration files.

`pnpm qa:preflight --mode browser --ready` is a **before-launch** check of an already-built candidate: server output exists, source/dist protocol agree and client build endpoint matches. It does not prove that all compiled inputs are fresh. Keep compilation and real service run/protocol/endpoint checks. It still refuses occupied ports, including a previously running review service.

Managed profiles: default gameplay, arena-creeps, Võ Đang Quyền/Kiếm, diamond-palm, shaolin-dao and qa-helpers. The list is shared with `qaWorkflowSession`; legacy/custom profiles receive dependency checks and an explicit limitation note. Their existing fixtures retain responsibility for ports/browser channel/build identity. Do not infer coverage from a generic PASS.

## Reuse browser controls

Import from `tools/qa-browser.mjs` (TypeScript declarations are included):

- `waitForGameReady(page, { timeout })`: Phaser's actual ready marker plus confirmed authoritative `IN_GAME` state.
- `acknowledgeQaLobby(page, action, id, { timeout })`: only start/school/branch/confirm, retrying the existing DOM action while server acknowledgement is absent. School selection also requires the actual branch popup when applicable.
- `observeQa(page, predicate, argument, options)`: browser-side polling; returns the observed value and disposes its handle. Transport/prerequisite errors fail immediately, timeouts include compact readiness/tick/actor state.
- `pressQaAndWait(page, key, predicate, argument, options)`: check readiness/live actor, focus canvas, arm observation, send **one** key press. Use `keyDelay` for a deliberate movement hold. The predicate must identify a new sequence/event/projectile, not stale state. Combat inputs are never retried and outcomes are never injected.

Existing `startTogether` and `startAuditTogether` use the shared lobby/readiness contracts. Core-only polling still uses `tools/qa-wait.mjs`; do not replace deterministic simulation assertions with a browser helper.

## Focused verification

```powershell
node --test scripts/tests/qa-preflight.test.mjs scripts/tests/qa-browser.test.mjs scripts/tests/qa-session.test.mjs
pnpm check:browser --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile'
# After the final implementation change:
pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile'
```

The dedicated helper fixture uses the existing owned-server setup, removes the initial hostile practice creeps only in its named test rooms and places a durable harmless target. This keeps actors alive while art loads. Real keyboard input, simulation movement, projectile creation and peer replication remain under test. It is not natural-combat, balance, art or long-soak acceptance.

## Compact logs and measurements

The workflow prints stage summaries and a bounded failure tail. Full stdout/stderr streams to per-run files under the timing report directory, with paths and byte counts in the report. Files can be tailed during long stages. `VOLAM_QA_VERBOSE=1` prints full output after each stage. No assertion, validator or approval gate is removed; no PASS is reused.

See [measured before/after results](QA_TOOLING_MEASUREMENTS_2026_11_19.md). Compare the same scenario and preserve failures. Output bytes and driver calls are context/automation proxies, not billed token measurements. A baseline smoke failure is not a valid wall-time speed comparison against a later PASS.

Historical reference validation uses [scripts/reference_paths.py](../scripts/reference_paths.py) to locate the exact original image through the move manifest. The forest/renovation provenance validators still check their recorded hashes; no original provenance or approval lock is rewritten.
