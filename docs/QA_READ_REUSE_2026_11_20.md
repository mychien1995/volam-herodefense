# QA preparation observations and private preview — 2026-11-20

## Scope and decision

Implemented opt-in reuse of freshly observed preparation-output hashes, plus an owned production-preview comparison mode. Gameplay, default final checks and school/boss prerequisites remain unchanged. Development remains the default: the measured short preview batch was slower, so expanding school/boss adapters has no demonstrated benefit yet. Implementation and measurements were completed before the separate commit step.

Context: root AGENTS, QA tooling/workflow/session lessons, the existing iteration lease/compiler/fixture helpers, focused source/tests and the game-playtest skill. Game baseline: `584e34ca` on `milestone/m3d`, after the completed 2.5D merge. Outside WIP is inventoried separately and preserved.

## Commands

```powershell
# rounds.json: [{"grep":"iteration starts fresh"},{"grep":"iteration starts fresh"}]
$env:VOLAM_QA_SESSION = 'my-read-comparison'
pnpm qa:iterate --plan rounds.json --profile --prepared-observation
# Same assertions, private production bundle instead of dev client:
pnpm qa:iterate --plan rounds.json --profile --prepared-observation --client-mode preview
# Control: omit --prepared-observation; default client mode is development.
```

Use a different session name per retained arm. The measured ports were 2886/5486, with `VITE_SERVER_URL=http://127.0.0.1:2886`. `--cold` remains available and closes the owned compiler/service/private output between rounds. Neither flag is accepted as a bypass in `check:final`.

## Guard boundaries

- Existing byte comparison/repair in `scripts/asset-files.mjs` is retained. Only the owned preload installs an output observer. It records actual buffers compared or successfully written under `apps/game-client/public/`; no full buffer cache is kept.
- Successful preparation must produce a fresh root/nonce/version/exit-code receipt. Invalid paths, duplicates, failed/stale/foreign receipts and outputs absent from current inventory are rejected. The canonical traversal still checks names/types and rejects symlinks. The first service snapshot uses these hashes once and hashes all other files normally; its digest matches the original algorithm on an unchanged tree.
- This moves the first observation earlier within the same round. It is **not an atomic filesystem snapshot**. A persistent edit after preparation can be detected at the full post-test snapshot rather than before execution. Such a result is rejected and the service closes, including same-size edits with restored timestamps. Transient edits restored between observations are outside snapshot guarantees, as with ordinary before/after snapshots.
- Every subsequent service snapshot reads all bytes. Fresh tests, compiler input/output verification, live identity checks, room/socket reset and scoped cleanup remain mandatory. No PASS, director approval or historical preparation receipt is reused. Final never installs this observer.
- Preview builds go only into an owned direct child `.cache/qa-iteration-preview-*`, with resolved-path guards before build/delete. Endpoint, full output bytes and build inputs must match for reuse. Cleanup closes the service before deleting its private bundle; comparisons do not overwrite shared `apps/game-client/dist`.
- Preview adds a conservative build-input boundary: all `assets/exports`, static external imports/exports/URLs and literal glob roots discovered in client TypeScript. Nonliteral dynamic imports/globs fail closed. Source changes trigger the normal service hash. The observed dependency inventory is retained in iteration evidence; new build/plugin/import mechanisms require an audit. Pinned installed dependencies retain the existing installation assumption.

## Before/after measurements

Same two-client live smoke, fresh movement input, peer replication and abandoned-seat cleanup; two sequential rounds per arm, same gameplay/compiler inputs. All six rounds and all batch cleanups PASS. This is a small ordered sample, not a performance guarantee or a billed-token measurement. Tooling fingerprints differ as the option and preview-input audit were added; game/compiler fingerprints match. About 6 KB of additional tooling read per service scan is included in the after arm.

| Arm | Round 1 | Round 2 | Batch total including teardown |
| --- | ---: | ---: | ---: |
| Control development | 53.274 s | 56.022 s | 110.079 s |
| Fresh observation + development | 50.300 s | 41.543 s | 92.608 s |
| Fresh observation + private preview | 109.507 s | 57.670 s | 170.119 s |

Observed development batch reduction: 17.472 s (~15.9%). Browser time and disk contention vary; the first optimized post-test scan took 7.967 s, so retain raw observations rather than attributing the whole wall-time difference to hashing.

Per round, preparation plus the two service scans read **4,609,424,384 → 3,839,190,258 bytes**, saving **770,234,126 bytes (~16.7%)**. Preparation observed 7,571 public outputs. SHA input bytes for those phases **increase** from 2,921,670,544 to 2,966,817,582 (~1.55%): work moves into preparation and repeated output observations add hashing. The benefit is duplicate I/O removal, not less total SHA work. Compiler input/output scans are additional and retained in evidence.

Preview round 2 reused both the service/compiler and private bundle. Its browser portion was 20.229 s versus dev's 21.359 s, but added conservative source/output byte checks and initial build cost outweighed that difference. Preview includes two additional ~701 MB input scans and two ~833 MB output scans per round; this is an end-to-end comparison including stronger bundle prerequisites, not a browser-only A/B. The private output directory was removed after ownership cleanup. Keep preview optional and avoid broadening adapters on these results.

Evidence:

- [Compact summary and metrics](evidence/sessions/qa-read-summary/summary.json), with adjacent room/stage observations for all six rounds.
- [Control development](evidence/sessions/qa-read-control-dev/iteration.json).
- [Observed development](evidence/sessions/qa-read-observed-dev/iteration.json).
- [Observed preview](evidence/sessions/qa-read-observed-preview/iteration.json).

## Verification and retained failure

Focused regressions cover exact digest equivalence, single use, receipt/path/type failures, same-size/restored-mtime edits, private bundle corruption/deletion/endpoint changes, external assets/glob additions and dynamic-import rejection. Existing asset write/repair and lease tests also passed. Tool/test TypeScript checking passed.

The first canonical final invocation was:

```powershell
$env:VOLAM_QA_SESSION = 'qa-read-final'
pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile' --reporter=line
```

Its [original FAIL report](evidence/sessions/qa-read-final/check-workflow/final-timings.json) is preserved: preflight, fresh preparation, compilation and tool/test typechecking passed; workflow had 69/70 PASS. The disconnect cleanup regression exposed a race between OS process disappearance and dispatch of the parent's child `exit` event. Cleanup could accept exit zero even though IPC was already disconnected. `stopQaChild` now remembers that disconnected state, waits only on its owned handle and rejects cleanup even if its exit event arrives later. The existing reproducer and then all 70 workflow tests passed. No gameplay adjustment or assertion weakening was used.

[Fresh continuation](evidence/sessions/qa-read-final-retry/results.json) reruns preflight, tool typechecking and workflow after this helper fix, then runs every previously unexecuted canonical stage: all unit/integration tests, production build, all 33 asset validators and the four relevant production browser cases. Unchanged preparation and TypeScript application compilation retain their actual PASS from the first invocation; the original pipeline is never relabelled PASS.

The continuation completed PASS: **70 workflow regressions, 1,208 unit/integration tests across 120 files, production build, all 33 validators and all four production browser cases**. This is complete guard coverage across the failed original invocation and fresh continuation, not one green canonical pipeline. [Browser receipt](evidence/sessions/qa-read-summary/browser-last-run.json).

All **370 original WIP entries retain their exact bytes**, with none missing. Validator-generated source metadata was restored to its exact pre-task bytes after asserting only the generated count changed (5,470 to 5,481); the fresh result is preserved [separately](evidence/sessions/qa-read-summary/thieu-lam-validation-fresh.json). Canonical final/core runners, core cache/worker policy and shared preflight/fixture/session guards have no diff. No source gameplay or art/audio bytes were edited. The verification checkpoint preceded staging/commit. [WIP/guard audit](evidence/sessions/qa-read-summary/verification.json), [task scope](evidence/sessions/qa-read-summary/task-scope.json).

Selected source formatting, documentation links and `git diff --check` passed. These measurements establish disk-read and wall-time observations only; actual billed token cost was not measured.
