# QA cost profiling — 2026-11-20

Optional measurement extends `pnpm qa:iterate --profile --plan rounds.json`. No simulation, assets, production client behavior, validation result or final runner is changed. Profiling preserves the selected tests and their assertions; it never supplies a PASS.

## Collected measurements

- Preparation runs with a scoped Node preload in its own child: wall/CPU time, synchronous filesystem call counts, bytes and durations grouped by repository subtree, SHA calls/bytes/time and platform resource counters.
- Every existing input/output/service fingerprint still uses `fileSnapshot` and actual bytes. The optional observer temporarily instruments sync filesystem/crypto exports, then restores them in `finally`; it does not cache reads, omit paths or replace hashes. `hashCosts` retains each complete snapshot rather than hiding repeated scans in a residual duration.
- Owned service startup, HTTP identity and room/socket resets are timed separately. Profiling also wraps each owned game/Vite child for its lifetime CPU/sync-IO receipt at teardown; those values cover the full generation, not only startup.
- A timing-only Playwright reporter records process/reporter/test milestones and fixture/API step durations. It has no selection or status-override hook. Browser profile receipts are required when profiling is requested.
- The dedicated two-client smoke additionally retains bounded network counts, ten slowest query-free resource paths per page and navigation timings. No response body, frame, video, screenshot stream or trace recording is collected. Network evidence survives a closed page even if navigation metrics become unavailable.

Filesystem times contain CPU and scheduling wait; CPU, IO and request/fixture durations overlap. They must not be added as independent critical-path phases. Platform IO/context-switch counters can be unavailable or platform-specific. These observations do not identify an antivirus, disk fault or another process as the cause of a delay.

## Instrumentation verification

Focused regressions verify identical byte/hash results, original errors/exit status, named ESM bindings and restoration, nested-scope rejection, bounded network evidence after page close, query removal and unchanged failed test status. The Windows preload uses a file URL; the initial absolute-drive-path attempt is preserved as a failed development run.

[Observer overhead](evidence/sessions/qa-cost-observer/overhead.json): fixed 16 MiB synthetic byte/hash workload, five alternating plain/profile pairs after warmup; all digests match. Median plain 37.971ms, instrumented 41.025ms (about 3.054ms / 8.0% extra for this workload). This does not estimate game or session speed and must not be subtracted mechanically from real profiles.

## Interrupted live measurement

The task began at `4467d7d0`. During the live probe, another workflow began merging `wip/m3d/25d` (`89829714f33300d59ab2ddf6eb424f6a97904995`). The checkout developed conflicts in `arena-scene.ts`, `pregame.ts` and `verify-renovation-runtime.mjs`. The user selected **wait for merge completion and measure the new baseline**. No merge file/index entry is repaired, staged, reset or committed by this task.

[Retained interrupted run](evidence/sessions/qa-cost-profile-reuse2/iteration.json): FAIL, owned cleanup PASS. The preparation child exited 0 with these component observations:

| Observation | Measured |
| --- | ---: |
| Wall / process CPU | 14.339s / 8.500s |
| SHA updates + finalization | 2.419s |
| SHA input bytes / hash objects | 1,315,235,348 / 10,710 |
| Sync IO calls / returned read bytes | 35,030 / 2,827,030,636 |
| Summed instrumented sync IO time | 10.057s |

[Preparation detail](evidence/sessions/qa-cost-profile-reuse2/prepare-cost-0.json) shows substantial real read/validation work. It does not establish end-to-end acceptance or a stable before/after speed comparison because the checkout changed during the run.

[Browser reporter](evidence/sessions/qa-cost-profile-reuse2/browser-cost-0.json): browser launch 113ms, but the test timed out at 60.018s waiting for the Play button. Vite reported a parse error at an unresolved conflict marker in `pregame.ts`, returning HTTP 500. This measured failure is a broken source prerequisite, not evidence of a slow Chromium launch. The earlier page-probe version lost network details after the timed-out page closed; that evidence limit is retained and its observer is now covered by a regression.

## Fail fast on unresolved conflicts

`qa:iterate` now calls the read-only checkout guard before initial preflight, each round and browser execution. A real miniature Git merge-conflict regression confirms that it leaves conflict bytes and the index unchanged. It uses Git commands supported by the installed older Git version.

[Actual conflict rejection](evidence/sessions/qa-cost-conflict-guard/iteration.json) starts no rounds/services/preparation and retains the original failure. This guard is limited to the opt-in iteration path; it does not modify the canonical final runner or authorize resolving a user's merge.

## Stable baseline after merge

Merge completed at **`526c82b3`**. [Fresh summary and individual page/room observations](evidence/sessions/qa-cost-summary/summary.json), [cold batch](evidence/sessions/qa-cost-baseline-cold/iteration.json), [reuse batch](evidence/sessions/qa-cost-baseline-reuse/iteration.json): **all four fresh two-client Phaser tests PASS**, with identical runtime fingerprints, distinct room IDs, authoritative movement and peer rendering. Each reset ends with zero rooms/sockets and both batches pass owned cleanup. The second reuse round retains its service and native compiler identities.

| Instrumented batch / round | Preparation | Compiler | Browser process/test | Round total |
| --- | ---: | ---: | ---: | ---: |
| Cold 0 | 24.140s | 2.534s | 24.080s | 62.376s |
| Cold 1 | 13.495s | 2.168s | 23.876s | 50.783s |
| Reuse 0, fresh generation | 21.458s | 2.061s | 24.456s | 59.569s |
| Reuse 1, retained generation | 13.592s | 0.213s | 22.802s | 45.873s |

Totals including initial preflight/final cleanup: **113.951s cold versus 106.247s reuse**, a raw **6.76%** lower reuse time in this sample. Cold preceded reuse; only two rounds per arm were run. Preparation varies by 10.645s across samples, exceeding the 7.704s whole-batch difference. Treat this as a small observed improvement, not a causal performance estimate, confidence interval or reason to make reuse the default. These instrumented post-merge numbers are not comparable to the earlier uninstrumented pre-merge game baseline.

### Where time/work goes

- **Preparation:** reads exactly **3,005,945,994 bytes** per stable round, hashes **1,315,235,348 bytes**, and uses **8.110–9.156s process CPU**. It still runs every approved-byte guard and preparation recipe. File grouping exposes repeated source/destination verification work, rather than counting it as service startup.
- **Fingerprinting:** two service snapshots read **1,603,441,756 bytes** per round and cost **8.417–8.723s wall**. All input/output/service scans together cost **9.029–10.351s**; some scans are inside compiler/identity checking, so do not add this number to the compiler column as a disjoint phase. No mtime or successful-test cache was introduced.
- **Service lifecycle:** a new owned generation takes **1.527–1.694s**. Two identity checks total **8.8–18.5ms** and two resets **3.1–5.2ms**. Removing these guards cannot explain a material improvement and is not proposed.
- **Browser:** actual launch is **98–114ms**. Spawn-to-first-test bookkeeping costs roughly **2.5–2.7s**, while the test bodies cost **19.957–21.538s**. Recorded scene-ready assertions and browser-side authoritative waits dominate fixture launch. The host page makes **421 script requests** and roughly **982 XHRs** in this development profile, plus asset loads. Requests overlap: their summed durations are not critical-path latency or proof of GPU/decoder/server-transform cost.
- **Owned game/Vite process CPU:** two cold generations total **20.124s CPU**; the one reused generation totals **17.952s CPU** across both rounds. Lifetimes differ and include game simulation and serving work; these are not standalone transform benchmarks.

### Decision and next work

**Do not expand school/boss adapters in this task.** The conditional expansion gate is not established by two sequential samples whose preparation variation exceeds the observed saving. Keep reuse and profiling opt-in; all existing school/boss setups retain their audited prerequisites.

The next useful experiment is to reduce duplicate read/hash work while preserving byte-based invalidation, symlink boundaries and every final guard. A separate controlled comparison could examine development module loading versus an owned production preview using identical server prerequisites and assertions. Optimizing a ~0.1s browser launch or removing millisecond identity/reset checks is lower priority. No billed-token reduction, artwork approval or new school/boss acceptance is claimed.

## Final verification

The full final command was `pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile' --reporter=line`. It passed **65 workflow regressions, 1,208 unit/integration tests across 120 files, production build and all 33 validators**; its browser stage passed 3/4 and failed the two-client live-projectile observation. [Original FAIL timing report](evidence/sessions/qa-cost-final/check-workflow/final-timings.json) is retained unchanged.

### Two QA issues found during verification

1. **Fixture observation window:** a read-only probe confirmed real keyboard input, server attack and actual target damage. The original dummy offset was 160px; after movement, the real attack hit after **10 ticks / 0.333s**, while the client input-to-patch observation was **599ms**. The live projectile could disappear before the first observed state. [Raw probe](evidence/sessions/qa-cost-input-probe/probe.json), [compact receipt](evidence/sessions/qa-cost-completion/projectile-observation.json). Only the dedicated helper fixture now positions its dummy using the existing projectile effect's **320px legal range**. It does not change hero position, velocity, damage, cooldown, range or projectile lifetime and does not inject a cast/hit.
2. **Routine trace overhead:** after that fixture correction, retained trace metadata contained an actual projectile with **vx=360, vy=0** before a later timeout around assertion/context tracing. The context after-hook alone took about 14.5s in that failed attempt. Trace overhead is distinct from the original missed transient state: turning tracing off alone with the old target still failed. The helper profile now defaults to trace off, matching the existing iteration profile; shared compact authority errors remain available. Diagnostic policy changed, no gameplay assertion was removed.

An intermediate fixture expression used `Ability.range` and was rejected by TypeScript. It was corrected to the narrowed projectile `effect.range` and successfully typechecked; the invalid intermediate attempt is excluded from successful coverage. [All attempt statuses](evidence/sessions/qa-cost-completion/browser-attempts.json) retain both kinds of failure.

After the fixture/diagnostic-only corrections, fresh test/tool typechecking and ready preflight PASS, and **all four unchanged helper/projectile browser cases PASS in 45.2s**, using the same built production candidate. No passing unit/build/validator stages were repeated. This is complete final-guard coverage across the original attempt and affected-stage retry, **not one green full-pipeline invocation**. The old 3-PASS/1-FAIL run and the new 4-PASS run have different diagnostic/fixture outcomes; their durations are not a clean performance benchmark.

[Final verification and unchanged assertion/helper byte checks](evidence/sessions/qa-cost-completion/verification.json), [fresh browser result](evidence/sessions/qa-cost-completion/browser-last-run.json). The canonical final runner, validator list, core cache/parallel path and existing browser assertions/input helpers are unchanged. Generated source validator metadata was restored to its exact pre-validator bytes, with the fresh counter retained as [separate evidence](evidence/sessions/qa-cost-completion/thieu-lam-validation-fresh.json). Task ports 2567/5173/2886/5486 are free.

The post-merge WIP audit had 359 entries outside task scope; 358 retain bytes/status. One sound file changed and additional sound paths appeared during the task, outside its writes; their current bytes are retained without attributing the writer. The user's merge was never resolved/staged/committed by this task. No gameplay or art/audio source was edited; no task changes were staged or committed.

API references: [Node builtin ESM bindings](https://nodejs.org/api/module.html#modulesyncbuiltinesmexports), [Playwright reporters](https://playwright.dev/docs/api/class-reporter), [request timing](https://playwright.dev/docs/api/class-request#request-timing).
