# Session execution lessons — 2026-11-03

Durable repository knowledge from the M3D integration/review/playtest session. Read at task start through AGENTS.md, then follow DEVELOPMENT_WORKFLOW.md. This document changes development practice, not game rules or milestone scope. Keep it available in the checkout used by the next session; an unmerged worktree does not update other branches automatically.

## Apply now

1. **Reproduce the user's action before fixing it.** Add one focused failing test using real accepted inputs, hit resolution and elapsed simulation ticks. A pre-seeded state can test a handler, but cannot replace the path into that state. For skills, cover manual input cadence, actual travel/windup, same/different targets, miss, cancel/death/travel and resource costs as relevant.
2. **Run all newly added or edited regressions before final.** A test added after the last focused run has not been verified. Use float comparisons for geometric values (including signed zero), deterministic RNG and explicit fixture regen when measuring cost. Do not change production math to satisfy a mistaken assertion.
3. **Choose checks by changed inputs.** During iteration use the existing `pnpm check:quick <explicit test paths>` and the relevant focused browser profile. Batch related tests in one invocation. After the last runtime change use `pnpm check:final <relevant browser arguments>` once. Keep required character/party coverage, authority assertions, asset locks and director approval gates.
4. **Retry a failed stage with its actual dependencies.** A browser-helper-only fix normally requires tools/tests typechecking and the affected browser stage against the unchanged production bundle. A runtime/protocol/asset/build-input change requires rebuilding/revalidating those dependencies. Never infer a new PASS from historical timing reports. Keep failed reports and explain completed coverage across reruns; do not relabel a failed pipeline PASS.
5. **Wait for server acknowledgement in browser tests.** Await school selection/confirmation, zone transfer, HP0 before waiting for revival, actual cast/hit and projectile state. Keyboard focus must be established; use one deliberate key press rather than blind repeated input. Retry an idempotent UI action only while the server has not acknowledged it. A longer timeout alone does not diagnose a failure.
6. **Use the smallest sufficient live profile.** Two clients for focused combat/multiplayer iteration; retain mandatory six-client checks for the applicable character/art/integration delivery. Fixtures may set legal build, location, HP/dummy or phase prerequisites; do not inject the combo/hit/reward outcome under test. Observe real frames, timing and cleanup at normal gameplay zoom. No routine video/GIF or trace screenshot streams.
7. **Reuse already inspected, unchanged references within the task.** Perform mandatory positive/negative/style reference inspection before the relevant art/UI work. Record which files were inspected and the visual criteria; use that record after context restoration. Reopen when the source changes, a new visual scope requires it, or a specific comparison needs the actual image. Logic-only fixes use input/state/hit logs. Approved in-game/preview evidence is the immediate baseline for a requested animation correction; broad style references do not define its mechanics. This does not waive the AGENTS.md art/UI gates.
8. **Keep reads and evidence compact.** Start with `rg`/`rg --files`, narrow paths before reading, batch independent reads and request only relevant report fields. Avoid recursive searches through dependency/cache trees. Keep one concise handoff with links to evidence, metadata/frame observations and useful PNGs; preserve existing history without duplicating complete snapshots in every summary. Await long checks with bounded waits and meaningful progress updates, rather than repeatedly inspecting unchanged output.
9. **Keep QA services isolated and identifiable.** Reuse only handles owned by the current QA session where supported. Use session-specific ports/output and the compiled endpoint checks in DEVELOPMENT_WORKFLOW.md. Never borrow or kill another checkout's server. After a runtime update, verify the review server health/run identity and client endpoint, and tell the user whether a new room is needed.

## Specific regressions to remember

- **Vô Ảnh:** real Q→W→E exposed two failures that pre-seeded combo tests missed: E during Ca Diệp's action was discarded; E after recovery but before ground-projectile contact chose one foot prematurely. The fix buffers one finisher while the real preceding action/projectile resolves. Same-target hit eligibility remains authoritative. Regression: single centered foot on failure; ordered three lanes twice on success; duplicate input, lifecycle cancellation and one mana spend. See `tests/m3d-vo-anh-regression.test.ts` and `tests/e2e/m3d-vo-anh.spec.ts`.
- **Short visual phases:** a page screenshot can miss a110ms impact. Poll presentation metadata and export one canvas PNG when the requested live phase is present. Do not record a frame stream or alter the gameplay clock to obtain evidence.
- **Reference paths:** older instructions can contain missing/misnamed references. Inspect the actual content, document the correct equivalent when necessary, and do not repeatedly search the same stale path or silently treat a misleading filename as visual truth.

## Measured costs, not performance promises

| Retained run | Total | Browser | Unit/integration |
| --- | ---: | ---: | ---: |
| M3D r3 integration final |619.43s |485.90s |85.74s |
| Vô Ảnh fix final |202.78s |61.21s |91.35s |

Reports: [r3 integration](evidence/sessions/m3d-r3-final-fixed/check-workflow/final-timings.json), [Vô Ảnh fix](evidence/sessions/m3d-vo-anh-final-fixed/check-workflow/final-timings.json). These scopes differ; the difference is not a controlled speedup. Asset preparation often cost10–30s during focused iteration while focused tests themselves took a few seconds. Whole-session reasoning, reads and tool round trips are not fully timed. Browser setup/waits and unnecessary wide reruns deserve priority over repeatedly tuning subsecond TypeScript compilation.

## Tooling backlog — not yet implemented

- A pure-core iteration path that reuses prepared outputs only when relevant input identity is proven unchanged; final must still run full lock/hash guards. No existing `--reuse-prepared` command is implied. Do not bypass current preparation manually by treating this proposal as authorization.
- Split safe pure-core tests for parallel execution from room tests that share ports/environment. Current `vitest.config.ts` has `fileParallelism:false`; benchmark isolation/port correctness before changing it. Do not blindly disable isolation.
- Reuse owned iteration services/compiler processes in profiles that explicitly support it; keep final production verification and cleanup/identity checks.
- Compact timing/report aggregation and a small reference inventory with source identity, correct paths and last inspection context. Never cache automatic test success or director approval.

Implement these only in a requested tooling task, with invalidation/isolation regressions and before/after measurements. Do not promise an unmeasured saving or weaken acceptance to obtain one.
