# Owned QA iteration reuse — 2026-11-20

This optional development path reuses live compiler and game/Vite handles within one owning process. It changes no gameplay. `check:quick`, `check:browser`, `check:core` and `check:final` retain their existing behavior; final consumes neither the live lease nor a cached test result.

## Scope and commands

`pnpm qa:iterate --plan rounds.json` runs a JSON array such as:

```json
[
  { "grep": "iteration starts fresh" },
  { "grep": "iteration starts fresh" }
]
```

The default test is the dedicated two-client Phaser smoke. Use `"test": "gameplay"` to select the existing `gameplay.spec.ts` with an explicit grep. No custom global setup, arbitrary profile/port handoff, live-port discovery, persistent disk PASS, remote service, art approval or final-mode reuse is supported. Other legacy fixtures require a separate audited adapter before using this path. In particular, helper/projectile fixtures with additional prerequisites must retain their own existing profiles.

Without `--plan`, the command reads one round object per stdin line. Wait for a completed round before editing inputs or requesting another. EOF closes all owned handles. Choose `VOLAM_QA_SESSION` and unused `VOLAM_QA_SERVER_PORT`/`VOLAM_QA_CLIENT_PORT` before launch (defaults 2886/5486). `VITE_SERVER_URL` must match. Run a single compiler/preparation/final workflow at a time in this checkout. No attach/resume after an interrupted owner is provided.

Environment/fixture flags are fixed when the owner starts; close and restart the batch to change them. This first adapter retains the normal development practice-creep prerequisite and supplies no additional school/boss/projectile setup.

`--cold` is the comparison control: it closes service and compiler between rounds, then runs the same preparation, guards, test and cleanup. The warm path reuses processes, never test success.

## Guard boundaries

- Initial shared browser preflight checks installation, browser and free ports. Every round freshly checks installation again and runs the full existing asset preparation/approved-byte guards. No general prepared-art bypass was introduced.
- The installed TypeScript 7 native compiler runs in watch/build mode for the server and referenced shared projects. Reuse requires matching byte hashes of source/config inputs and compiled outputs and a successful complete compiler cycle. Changed/missing/corrupt outputs force a new compiler generation; failed or unstable compilation is rejected. A private IPC guardian owns the actual native executable; parent loss closes it without a process-tree search. Client/test/tool typechecking and production build remain final checks.
- The game/Vite service lives in a private owned child with a fresh run ID. Both HTTP identities and authenticated IPC PID/protocol/ports must match. The reuse receipt is in memory and belongs to that exact live handle; an occupied healthy port never qualifies.
- The service hash covers compiled server/shared outputs, source/config inputs, client sources/prepared public files, fixture/tool scripts and e2e tests. Names and bytes cover additions/removals and same-size edits; mtimes do not authorize reuse. Dependency installation is checked fresh by preflight. Installed dependency bytes are assumed to belong to the pinned installation, as in the existing workflow; this is not a hostile-filesystem sandbox.
- Before and after each successful test round, private IPC disconnects every owned local room, including unused seat reservations, then clears residual owned WebSockets and confirms zero rooms/sockets. Tests launch fresh Playwright workers/contexts and execute all selected assertions again. State is recreated by normal room creation; no cast/hit/progression result is fabricated.
- Failure of identity, reset, compilation or test closes the service. Source/output mutation during a test rejects that result. EOF/error/signal cleanup is scoped to owned handles; no PID/port search or process-tree termination is used.

## Measurement and verification

Compare identical selected tests and guarded preparation; keep cold-start costs separate from subsequent rounds. Browser variability and hash/guard overhead can exceed the process-start saving. This path does not imply a billed-token saving or replace production/final acceptance.

Retained development iterations:

- [Initial cold attempt](evidence/sessions/qa-iteration-cold-1/iteration.json): browser timed out after entering the game. The new profile now disables diagnostic tracing and records compact stage timings; its scene/authority gates remain required. The precise cause of that first timeout is not claimed.
- [Focused retry](evidence/sessions/qa-iteration-focused/probe.json): both clients reached `IN_GAME`, movement and peer rendering succeeded; the test then exposed the old `seat.room.roomId` expectation. Colyseus 0.18 returns `seat.roomId`; only the new test was corrected. Cleanup completed.
- [Three completed cold development rounds](evidence/sessions/qa-iteration-cold-2/iteration.json): three PASS, fresh processes each time, zero rooms/sockets after every test. This is retained development evidence, not the final paired comparison.
- [First reuse attempt](evidence/sessions/qa-iteration-reuse-1/iteration.json): FAIL in the first (fresh) service generation, before reuse. A fixed 180ms ArrowRight press advanced the command sequence without satisfying the movement assertion. The final smoke arms observation, holds one real key until authoritative movement is observed, and releases it in `finally`; it does not retry/inject movement or increase the observation timeout. Both displacement and peer-rendered actor assertions remain required.

Regressions run the actual pinned compiler on isolated miniature projects: same-size source edit with original mtime, corrupt/missing output, compilation error/recovery, identical input/output reuse and abrupt owner loss. Lease regressions cover fresh execution, input mutation, reset/identity/test failure, overlap rejection and aggregated cleanup errors. The live smoke intentionally leaves an unused seat reservation to exercise disposal, rather than only testing an already-empty service.

### Final comparison

[Raw measurements and room receipts](evidence/sessions/qa-iteration-measurements/benchmark.json), [cold batch](evidence/sessions/qa-iteration-cold-final/iteration.json), [reuse batch](evidence/sessions/qa-iteration-reuse-final/iteration.json). Both batches use the exact same revised smoke, identical service fingerprint and compiled input/output hashes. Each round runs a fresh Playwright worker with two Phaser contexts. Cold runs precede reuse runs; this is two samples per branch on one machine, not a randomized performance study or a comparison against the production final workflow.

| Batch / round | Preparation | Compiler check/start | Browser | Other guards/lifecycle | Round total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold 0 | 57.687s | 3.045s | 20.829s | 14.245s | 95.806s |
| Cold 1 | 13.310s | 2.364s | 19.279s | 9.411s | 44.364s |
| Reuse 0, fresh startup | 16.746s | 3.691s | 30.850s | 15.614s | 66.901s |
| Reuse 1, existing handles | 48.165s | 0.448s | 27.670s | 16.033s | 92.316s |

**Outcome: process reuse is verified; an overall speedup is not demonstrated.** Complete batches including initial preflight/final cleanup cost **140.772s cold versus 159.863s reuse** (raw reuse total about 13.6% higher). The second compiler stage costs 0.448s versus 2.364s in the corresponding cold round, but browser/preparation variability dominates this sample. No diagnosis of that variability or billed-token reduction is claimed. Keep this path opt-in; measure preparation/hash/browser costs before expanding adapters or changing defaults.

The second reuse round retains the exact compiler guardian/native PIDs, service PID/run ID and fingerprint. Across the four final rounds there are **four distinct gameplay room IDs** and four fresh tests; every round additionally creates an unused reserved-seat room. Every post-test reset disposes at least one room and confirms **zero rooms and zero sockets**. Both batches pass final owned-handle/port cleanup. Fresh observations are retained individually alongside the benchmark JSON.

Reproduction environment: Node 26.0.0, TypeScript 7.0.2, Vite 8.3.5, Colyseus core 0.18.23, Playwright 1.64.1/bundled Chromium 156. Use the two-round JSON shown above with `VOLAM_QA_SERVER_PORT=2886`, `VOLAM_QA_CLIENT_PORT=5486`, `VITE_SERVER_URL=http://127.0.0.1:2886` and distinct session names. `--cold` is a control in the new development runner, not a historical full-browser-pipeline performance claim.

### Final guard accounting

`pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile' --reporter=line` passed fresh environment preflight, asset preparation, full project compilation and test/tool typechecks, then stopped at workflow regressions: 58/59. [Original FAIL report](evidence/sessions/qa-iteration-final/check-workflow/final-timings.json) remains unchanged.

The existing child-disconnect regression observed released ports and immediately expected the child to have exited. Port close can precede process exit; the result was a race in the test prerequisite. Only `scripts/tests/qa-children.test.mjs` changed after measurement: its own fake child records its PID, and the test waits for that process to exit using a read-only liveness check before retaining the original unexpected-exit assertion. No service/runtime code changed in this correction.

The completion run **PASS** covers **59/59 workflow regressions, 1,159 unit/integration tests across 110 files, production build, all 33 canonical validators and all four selected helper/projectile browser cases**, in **382.450s**. Passing preparation/compilation/typechecks were not repeated for this fixture-test-only correction. [Completion stage report](evidence/sessions/qa-iteration-final-completion/completion.json), [fresh browser result](evidence/sessions/qa-iteration-final-completion/browser-last-run.json). This is staged final coverage across the failed attempt and targeted retry, not one green invocation of the full pipeline. The canonical final runner is unchanged.

### Scope and WIP verification

[Final source/guard/WIP audit](evidence/sessions/qa-iteration-final-completion/verification.json): no production source changes from this task; the canonical final runner/validator list, sequential Vitest isolation, pure-core cache/parallel runner and existing shared lifecycle helpers remain unchanged. Package changes add only `qa:iterate`; the profile registry adds only its new explicit contract. All four task ports (2567/5173/2886/5486) were free after cleanup. Nothing was staged or committed.

All 352 original WIP entries retain their Git status. **350 retain their original bytes**; two untracked sound files (`cai-bang-bong-E.mp3`, `cai-bang-bong-W.mp3`) changed while final checks ran. This task did not write sound sources and does not attribute the writer; the current WIP bytes are retained, not restored to the initial snapshot. Another untracked sound path was observed during the final audit and remains outside task scope. Do not include these sound files or the existing boss-review `serve.py` WIP in a later tooling commit.

The fresh validator-generated counter is retained as [separate evidence](evidence/sessions/qa-iteration-final-completion/thieu-lam-validation-fresh.json); the source metadata file matches baseline bytes. No artwork, audio, gameplay change, long-soak test or director approval is delivered by this task.

API references: [TypeScript watch CLI](https://www.typescriptlang.org/docs/handbook/compiler-options.html), [Colyseus room disconnect](https://docs.colyseus.io/room), [matchmaker API](https://docs.colyseus.io/matchmaker).
