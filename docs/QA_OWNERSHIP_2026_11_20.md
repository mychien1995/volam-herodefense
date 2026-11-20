# QA fixture ownership, identity and cleanup · 2026-11-20

Baseline `milestone/m3d` / `ac5baee6`. Tooling and fixture lifecycle only; gameplay, combat test inputs, runtime application sources and artwork are unchanged. [Usage](QA_TOOLING.md).

## Implemented

- One game/Vite transaction owns startup, server run/protocol identity, client run/endpoint identity and environment restoration. Ports and preview build endpoints fail before service creation. Server cleanup is registered before listen; all returned handles are closed by their creator. Vite dev fixtures get the default raster-alias boot constant supplied by the normal app config.
- Cleanup awaits reverse order, attempts every owner, and shares the same completion/error across repeated or concurrent callers. Captured environment keys restore in `finally`, including startup/teardown failure. Startup and cleanup errors are retained together. Native HTTP bridges include identity and close incomplete owned requests.
- Child services verify IPC run/PID/protocol/ports plus HTTP identities. Parent loader flags are isolated; stop uses only the owned child handle, waits for exit and has a bounded force-stop fallback. Children handle IPC disconnect, including startup in progress. Kim Luân/Lý Mạc Sầu use separate children to avoid shared Colyseus globals/residual handles. The installed Vite loader runs their existing TS setup modules without relying on native TypeScript stripping.
- Static PID review servers use the same awaited owned-child stop mechanism. Their native server code and all art assertions remain intact. Existing Nam Đế/Tây Độc static profiles retain Playwright `webServer` with `reuseExistingServer:false`.

[Import-graph audit](evidence/sessions/qa-ownership-audit/profiles.json): **82 profiles** — 68 shared game/Vite, 10 shared child-service, 2 shared static PID, 2 existing framework-owned static. This is lifecycle coverage, not a claim that all historical browser/art acceptance suites ran.

## Before–after measurements

Archived Đường Môn setup from `ac5baee6` versus current setup, same built endpoint 2567 and client port 5173, separate owned processes, three alternating pairs. Every trial checks identity, calls cleanup twice concurrently, verifies free ports and compares environment. No foreign service is borrowed or stopped. Host load and OS caches are uncontrolled.

| Observation | Before | After |
| --- | ---: | ---: |
| Verified server/client identity pair | 0 / 3 | 3 / 3 |
| Successful concurrent cleanup calls | 3 / 6 | 6 / 6 |
| Ports released / environment restored | 3 / 3 | 3 / 3 |
| Median fixture lifecycle including probes | 184.390ms | 204.759ms |
| Median complete measurement CLI | 1.581s | 1.617s |

The old setup returns `ERR_SERVER_NOT_RUNNING` on the second cleanup and provides no client identity endpoint. The new lifecycle adds verification with about **20ms** higher median inside this probe. These are different guard outcomes; **no successful-gameplay speedup or billed-token saving is claimed**. Shared implementation removes repeated lifecycle discovery and duplicated teardown logic.

[Final paired measurements](evidence/sessions/qa-ownership-measurements-final/benchmark.json) retain every result; earlier measurement iterations remain separate. Additional direct-setup fault probes:

- [Wrong bundle endpoint before](evidence/sessions/qa-ownership-before/wrong-endpoint.json): accepted; [after](evidence/sessions/qa-ownership-after/wrong-endpoint.json): rejected before opening services, environment intact.
- [Invalid client port before](evidence/sessions/qa-ownership-before/invalid-client-port.json): rejected after 174.329ms but leaked three environment values; [after](evidence/sessions/qa-ownership-after/invalid-client-port.json): rejected in 0.544ms with no environment changes.

These probes deliberately bypass the outer workflow to test fixture boundaries. They do not imply that a normal full workflow builds the wrong endpoint.

## Verification and retained failures

- Fresh setup probes verify run/protocol/client identity, two simultaneous cleanup calls, released ports and exact environment restoration: [first group](evidence/sessions/qa-ownership-startup/summary.json), [additional group](evidence/sessions/qa-ownership-startup-extra/summary.json), [child group](evidence/sessions/qa-ownership-startup-extra2/summary.json), [isolated combined bosses](evidence/sessions/qa-ownership-startup-combined-owned/summary.json). Failed iterations are retained within their original reports; use the corrected group for the affected entry.
- [Static PID servers](evidence/sessions/qa-ownership-static/startup.json): both native versions PASS startup, identity, repeated cleanup and port release; no static art-server source was edited.
- Lifecycle regressions exercise real HTTP/child processes, wrong run/protocol/PID, failed siblings, startup timeout, IPC loss, stale build, foreign listener, partial startup, incomplete HTTP request, LIFO waiting, repeated cleanup errors and environment restoration. They do not inject game outcomes.
- New focused browser cases PASS normal and legacy child services with **four live Phaser clients**: separate run IDs, room authority isolated across services, real keyboard movement acknowledged by server and peer, scene readiness and rendered peer actor. The initial dev iteration failed on missing `__VOLAM_RASTER_ALIASES__`; the shared fixture config now supplies the same empty default as the normal Vite config. The ready gate was retained.
- The first child probe exposed inherited `--input-type`; fork now uses an explicit empty `execArgv`. The combined in-process boss probe released ports but left a process alive; its successor uses isolated owned children and exits cleanly. These failures were not relabeled PASS.
- [AST comparison against baseline](evidence/sessions/qa-ownership-audit/invariants.json): **18 middleware/test callbacks and 159 existing assertion/wait/capture calls unchanged**, across 53 edited fixture/verifier files. Startup health-only checks are replaced by stronger shared identities; gameplay/art acceptance bodies remain intact.

Representative existing browser runs: **Đường Môn PASS** (one test, 2 Phaser + 4 SDK clients), **Ngũ Độc PASS** (one test, 2 Phaser + 4 SDK clients). [Commands, dependency reuse and fresh results](evidence/sessions/qa-ownership-live/commands.json), [Đường Môn workflow](evidence/sessions/qa-ownership-duong-mon/check-workflow/browser-timings.json). Ngũ Độc used the same guarded preparation/compiled candidate, a fresh matching-endpoint client build and a fresh ready preflight; it is a browser-stage PASS, not a second full-pipeline claim.

[Small Gameplay child/HTTP bridge](evidence/sessions/qa-ownership-startup-small/summary.json) PASS, including preview endpoint 2667 and auxiliary port release. [Runtime verifier error probe](evidence/sessions/qa-ownership-runtime-error/lifecycle-probe.json): after two real clients reach `IN_GAME` and render actors, an intentional `onReady` error closes both contexts, releases server/client ports and restores the full environment. The expected FAIL and diagnostics remain preserved; this is cleanup coverage, not full renovation acceptance.

**Full final PASS, 376.28s**: typechecks, **53 workflow regressions, 1,159 unit/integration tests, production build, all 33 asset/reference validators and all 4 helper/projectile browser cases**. [Fresh final report](evidence/sessions/qa-ownership-final/check-workflow/final-timings.json), [browser result](evidence/sessions/qa-ownership-final/browser-last-run.json). Passing full stages were not repeated for report changes.

[Final WIP/guard verification](evidence/sessions/qa-ownership-final/verification.json): all **352** original dirty/untracked files retain their bytes and Git status; no new production-source changes. The canonical final runner, validator list, sequential full-suite config and existing parallel pure-core path remain unchanged. [Fresh generated validator metadata](evidence/sessions/qa-ownership-final/thieu-lam-validation-fresh.json) is retained separately; the unrelated source counter was restored. No commit was created during this implementation task.

No artwork approval, long soak or full historical art-matrix acceptance is implied. Static review artwork/server sources and historical recordings remain untouched.

## Reproduce

```powershell
node --test scripts/tests/qa-fixture.test.mjs scripts/tests/qa-children.test.mjs scripts/tests/qa-static.test.mjs scripts/tests/qa-session.test.mjs
pnpm qa:preflight --mode browser --ready --config playwright.qa-owned-lifecycle.config.ts
node tools/run-playwright.mjs test --config playwright.qa-owned-lifecycle.config.ts --reporter=line
# Full final keeps all guards; do not overlap preparation/final in one checkout.
pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile' --reporter=line
```

The adapter uses the installed Vite 8.3.5 and Colyseus core 0.18.23 APIs: [Vite JavaScript API](https://vite.dev/guide/api-javascript), [Colyseus shutdown](https://docs.colyseus.io/server/graceful-shutdown). Keep scene/server acknowledgement, production build and every final validator; lifecycle readiness is not acceptance of a historical test result.
