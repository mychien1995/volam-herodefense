# QA tooling measurements — 2026-11-19

Baseline commit: `eb558064`. Same Windows checkout, Node26.0.0, pnpm11.25.0, Playwright1.64.1. All listeners used by the benchmark were owned by the benchmark and remained reachable after both runners refused their occupied port. No other service was reused or stopped.

## Occupied-port comparison

The pre-change runner was retained under `.cache/qa-tooling-benchmark/check-workflow-before.mjs`, with only its repository/module paths adjusted for that location. It still performed preparation/compile/build before the original fixture refused the port. The new runner used the same browser command and same listener, with preflight first. One warm-checkout before sample and three after samples were retained. OS/disk cache temperature was not controlled, so do not attribute a general build speedup to this measurement.

| Metric | Before | After |
| --- | ---: | ---: |
| Detect occupied server port | 142.278s | median 0.147s |
| Console output | 14,483 bytes / 194 lines | 381 bytes / 4 lines |
| Foreign listener remains reachable | Yes | Yes, all three runs |

This avoided 142.131s of unnecessary work in this failure scenario and reduced console bytes by 97.37%. It does not mean successful builds/tests became this much faster. The earlier cold/first-run sample (136.330s) is also retained separately.

## Equal-work helper comparison

Five alternating before/after pairs in one browser observed the same synthetic acknowledgement delayed180ms, polling every30ms. Counts include value retrieval and handle disposal for the shared helper. This is a helper benchmark, not game/server performance.

| Metric | Previous driver-side polling | Shared browser-side observation |
| --- | ---: | ---: |
| Median driver method calls | 5 | 3 |
| Median elapsed time | 186ms | 228ms |

Fewer driver calls do not imply lower acknowledgement latency. These measurements are not billed token counts. Compact logs reduce text sent into agent context while retaining complete per-stage evidence.

## Reproduction and retained failures

- [Raw samples and limits](evidence/sessions/qa-tooling-2026-11-19/benchmark.json).
- [Original occupied-port log](evidence/sessions/qa-tooling-2026-11-19/baseline-busy.log), [warm before log](evidence/sessions/qa-tooling-2026-11-19/warm-before.log), [after log](evidence/sessions/qa-tooling-2026-11-19/warm-after-1.log).
- [Original valid-smoke failure](evidence/sessions/qa-tooling-2026-11-19/baseline-smoke.log): no projectile observed; it is not relabeled PASS or used for a speed ratio against a successful run.
- Initial focused checks exposed an obsolete school-button acknowledgement and an actor dying while art loaded. The shared lobby helper now observes server/popup state. The dedicated fixture supplies a harmless durable target and does not inject movement/projectile/peer outcomes.
- A helper-counter instrumentation error was corrected to include JSON retrieval/disposal. Original failed runs remain under `artifacts/qa-tooling-focused`, `artifacts/qa-tooling-browser-retry` and `artifacts/qa-tooling-benchmark-retry`; corrected raw samples are in the JSON above.

## Final verification

The final command was `pnpm check:final --config playwright.qa-helpers.config.ts --grep "QA helper|ranged projectile"`.

- TypeScript/tools, **1,110 unit/integration tests**, production build and initial workflow checks passed. The full pipeline then stopped at a historical reference-path read in an asset validator; [its FAIL report is preserved](evidence/sessions/qa-tooling-2026-11-19/initial-final-FAIL.json).
- Added `scripts/reference_paths.py` and regression coverage for direct/moved/unmapped references, tampering, ambiguous identity and path escape. Forest and renovation v2/v3 validators now resolve the original reference location through the move manifest while retaining their original expected-hash assertions. No historical provenance/lock/PNG was changed.
- Re-ran the affected/new workflow checks (**27 PASS**) and resumed outstanding validators/browser stages. A second provenance-path failure and its continuation report are also retained. Across original stages and scoped retries, **32 unique asset validators and 4 browser cases passed**. TypeScript/unit/build were not repeated for Python resolver-only changes.
- [Final verification and source hashes](evidence/sessions/qa-tooling-2026-11-19/verification.json), [completed continuation](evidence/sessions/qa-tooling-2026-11-19/continuation-PASS.json), [workflow log](evidence/sessions/qa-tooling-2026-11-19/workflow-PASS.log), [browser log](evidence/sessions/qa-tooling-2026-11-19/browser-PASS.log).
- All **372 pre-existing dirty/untracked files** retained their byte hashes; `apps/` and `packages/` have no source diff. The existing Kim Luân review-server edit and other WIP remain outside this task.

[Usage and commands](QA_TOOLING.md).
