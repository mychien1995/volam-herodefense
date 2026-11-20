# Development and final verification

Use focused checks while iterating. After the last implementation change, run the final pipeline once with the relevant browser scope. Do not separately run typecheck, test, build and asset preparation before or after that successful pipeline unless a new change or failure requires them.

Read [session execution lessons](SESSION_EXECUTION_LESSONS.md) before choosing the scope. They record the M3D Q/W/E regression, browser acknowledgement failures, reference reuse and measured costs. Apply the current-practice section now; treat the tooling backlog as proposals until implemented and validated.

| Work | Command |
| --- | --- |
| One unit/integration area | `pnpm check:quick tests/skill-assets.test.ts` (accepts more files and Vitest filters) |
| Pure-core simulation iteration | `pnpm check:core tests/combat.test.ts tests/practice.test.ts` (explicit pure-core files; hash-verified artifacts) |
| Environment preflight (no build/install) | `pnpm qa:preflight --mode browser [--config <profile>]` |
| Owned development browser iteration | `pnpm qa:iterate --plan rounds.json` (explicit supported smoke/gameplay selection; [boundaries](QA_ITERATION_REUSE_2026_11_20.md)) |
| Preparation helper | `pnpm test:workflow` |
| Affected art exports | `python -X utf8 scripts/verify-vo-dang.py` or the corresponding asset validator |
| Focused live Phaser/browser check | `pnpm check:browser --config playwright.vo-dang.config.ts tests/e2e/vo-dang-art.spec.ts --grep "both weapon"` |
| Final general gameplay smoke | `pnpm check:final tests/e2e/gameplay.spec.ts --grep "two clients agree\|ranged projectile"` |
| Final character batch | `pnpm check:final --config playwright.vo-dang.config.ts tests/e2e/vo-dang-art.spec.ts tests/e2e/gameplay.spec.ts` (use the matching character config/spec) |
| Final default browser suite | `pnpm check:final` |

The pipe in the grep examples is a regular-expression alternative; quote it in the shell. Forward arguments directly after the script name, without a standalone `--`. Final browser selection must cover the actual change: use the matching art, invasion, skills, dungeon, lobby or gameplay suites. An animation-gallery-only filter is an iteration check, not sufficient final verification for a new character.

`check:quick` requires an existing explicit `.test.ts` path so it cannot accidentally run the full suite. It prepares assets and incrementally compiles shared packages before the selected tests. `check:browser` prepares once, compiles once and builds the client once before one Playwright invocation. It does not run the unit suite or full asset validators.

`check:final` fails immediately on a failed stage and prints per-stage and total timings. It performs:

1. Asset preparation once, including all approved-file hash guards and current skill/concept validation.
2. Incremental TypeScript project compilation once, then test/tool typechecking.
3. Workflow regression tests and all Vitest unit/integration tests once.
4. Production client build once.
5. Every validator from the existing `verify:assets` command once.
6. One Playwright invocation with the requested scope (the default configuration/suite if no arguments are supplied).

The pipeline calls installed binaries directly; it does not invoke nested build/test scripts that prepare again. Existing standalone `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm verify:assets` remain available and safe for independent use. Avoid chaining all of them when `check:final` already covers them. No check results are cached or inferred from previous success.

`check:core` is a separate simulation-only iteration path: reuse prepared data and isolated compiled artifacts only when input/output SHA-256 match; execute tests fresh every time. It rejects IO/room/browser/asset graphs and keeps the final runner unchanged. [Cache boundaries, invalidation and commands](CORE_TEST_FAST_PATH.md).

## Environment and shared browser helpers — 2026-11-19

`check:quick`, `check:browser` and `check:final` now run a fresh preflight before asset preparation. It checks the checkout, supported Node, pnpm installation/lock identity, installed tool versions and, for managed browser profiles, free ports and the configured Chromium cache. Final also checks Python. It never installs dependencies, starts/borrows/stops a service, caches a PASS or skips any final gate.

Use `pnpm qa:preflight --mode browser --json` for structured diagnostics. `--ready` additionally checks compiled server presence, source/dist protocol and the built client endpoint before launch; it is not a proof that all compiled server inputs are fresh. The existing compile and owned-service run/health identity checks remain required. Registered legacy profiles use the audited port/channel contracts and shared ownership/identity/cleanup described in QA_TOOLING.md; unregistered WIP profiles remain explicit exceptions.

Successful stage output is summarized; full stdout/stderr streams to a per-run log next to the timing report and is readable while a stage runs. Failures show a bounded tail and the full log path. `VOLAM_QA_VERBOSE=1` prints full stage output after completion. Reports retain log paths/byte counts; historical failures stay in their run directories.

Reuse `tools/qa-browser.mjs` rather than adding another polling loop. It provides Phaser + server readiness, idempotent lobby acknowledgements, browser-side observations with compact diagnostic state, and a focused single key press with observation armed first. Combat is never retried; missing/dead actors are explicit prerequisites, not outcomes to fabricate. [Usage, coverage and measurements](QA_TOOLING.md).

## Asset preparation and production

Follow [staged art iteration](ART_ITERATION_WORKFLOW.md): validate frame files first, use `pnpm check:art:frames` with **two players by default** (or `--players 3`) while fixing artwork/integration, then run the six-player final profile once after the last implementation change. Reduced frame profiles explicitly exclude natural combat/rewards and cannot count as final acceptance. Reuse validated generated sources and existing production tools; retry only the affected poses/directions and record generator timings.

Use minimal evidence by default: no successful iteration PNGs, one compact report, diagnostic captures on failure, and two arena PNGs plus requested comparisons for final new-art approval. Detailed captures are opt-in (`pnpm check:art:frames --evidence review`). Preserve historical evidence and source/provenance files. For capture/report-only tooling edits that leave art, runtime and validation assertions unchanged, run focused policy tests and the affected browser profile; do not repeat the full game build/unit suite or a six-client pass solely to change how results are saved.

Preparation compares actual file bytes and writes only changed or missing outputs, including generated game-data JSON and creep manifests. Unchanged files retain timestamps, avoiding needless TypeScript invalidation and Vite reloads. It still checks every approved lock and validates current inputs on every invocation. A same-size change with an unchanged timestamp is detected; missing or corrupted destinations are repaired. No timestamp-only cache can hide source changes.

Preparation consumes retained PNG/JSON exports. It does not launch Aseprite, regenerate art, alter approved assets, delete historical outputs or create recordings. Export only the affected editable sources when artwork changes; do not regenerate the entire catalogue for code or approval metadata edits.

## Art quality and approval remain required

Keep the gates in `ART_PRODUCTION_STANDARD.md`, `ART_ASSET_GUIDE.md` and `AGENTS.md`. For changed artwork, validate actual source/PNG/JSON frames and provenance, then use the matching real Phaser suite to observe all directions/actions, timing, transitions, feet/pivots, weapon readability, normal gameplay zoom, foreground depth and two-client authoritative state. Include the relevant six-player readability check for character delivery. Inspect actual PNG screenshots against the required positive/negative references. Preserve explicit concept and final director approval; passing automation does not approve art.

Combine related browser cases in one invocation so they share service/browser setup. Dedicated character suites retain their own ports and cleanup; do not borrow another chat's running server. Routine video and trace screenshot streams stay disabled.

Record the exact final commands/results and any limitations. If a check fails, rerun that stage with its relevant dependencies after the fix; run the required final checks for the final code state. Do not repeat an already-passing full suite just to write a summary, copy a report or record approval when runtime inputs and test configuration remain unchanged. For approval-only documentation/lock updates, validate the changed metadata, hashes and guards; runtime label or guard-code changes still require their relevant typechecks/tests/browser checks.

## Workflow verification — 2026-10-30

- `node --test scripts/tests/asset-files.test.mjs`: 2 passed; covers unchanged timestamps, changed input, same-size corruption, missing output and UTF-8 metadata.
- Two consecutive `node scripts/prepare-assets.mjs` runs: each reported **0 written, 410 unchanged**, while retaining input validation and approval guards.
- `pnpm check:final tests/e2e/gameplay.spec.ts --grep "two clients agree|ranged projectile"`: prepared once (0.95s), compiled projects (0.37s), typechecked tools/tests (1.46s), passed workflow regressions, then correctly stopped on an existing random-critical-hit integration fixture: **133 passed, 1 failed** in the full 134-test run (31.79s including launch).
- Made only the reward-sharing fixture use noncritical RNG so both SDK attackers can land the hits required by the existing assertions. Production RNG/combat are unchanged. `pnpm check:quick tests/invasion-room.test.ts`: **3 passed**, 6.30s total including preparation and shared compilation.
- Completed the remaining final stages without repeating the full unit suite: `pnpm exec tsc -p tsconfig.tools.json --noEmit`, `pnpm --filter @volam/game-client build`, `pnpm verify:assets`, and `node tools/run-playwright.mjs test tests/e2e/gameplay.spec.ts --grep "two clients agree|ranged projectile"`: **PASS**. All five asset validators passed; both real Chromium multiplayer/projectile checks passed (51.1s). Actual combat/projectile PNGs under `test-results/` were opened and inspected. No artwork was regenerated or approved by this tooling task.
- Formatting and diff-whitespace checks passed. Quick mode with no test path and an unknown mode both exited 1 before preparing assets. The standard existing large-client-chunk build warning remains.

These are measured stage timings, not a guaranteed overall speedup. No new final-art acceptance is claimed; future artwork still requires the full relevant live character/party/depth review and director approval above.

## Isolated workflow sessions

The default gameplay smoke and Waves 13–16 arena QA profiles share `tools/qa-session.mjs`. Keep the existing defaults when working alone. For parallel sessions, choose unused ports and a distinct session name before any build/check:

```powershell
$env:VOLAM_QA_SESSION = 'process-improvement'
$env:VOLAM_QA_SERVER_PORT = '2788'
$env:VOLAM_QA_CLIENT_PORT = '5386'
pnpm check:art:frames
# After focused checks and the final implementation change:
pnpm check:final --config playwright.arena-creeps.config.ts
```

`VOLAM_QA_SESSION` separates Vite cache, Playwright outputs and evidence. Explicit overrides are `VOLAM_QA_VITE_CACHE`, `VOLAM_QA_PLAYWRIGHT_OUTPUT` and `VOLAM_QA_EVIDENCE_DIR` (the evidence root retains profile subdirectories). `VITE_SERVER_URL` remains available; managed QA requires it to identify the configured local server port. The check runner derives it from `VOLAM_QA_SERVER_PORT` when omitted. Set ports before building: the default preview checks the bundle's emitted `volam-build-endpoint.json` and rejects a stale endpoint. Direct browser-stage retries must use the same endpoint/build inputs. No successful stage result is loaded from a prior report.

Both profiles refuse occupied ports and verify the owned server's run identity and protocol plus the client's identity/endpoint. The default historical combat fixture explicitly sets/restores development mode so Vite preview cannot silently disable its practice-creep prerequisite. Cleanup closes only handles created by that setup. No service discovery by healthy port, shell process-tree killing or other checkout changes are performed. Dedicated school/dungeon profiles now use the shared lifecycle while retaining their audited fixed/shared/alias port contracts. Fixed profiles still reject unsupported common port overrides. Child services own separate processes and verify run/PID/protocol/ports; static visual fixtures use their existing PID or Playwright no-reuse ownership contract. See [fixture coverage and measurements](QA_OWNERSHIP_2026_11_20.md).

The single-pass pipeline now writes compact per-stage timings, exit status and run identity on success or failure. Without a session, reports are `.cache/check-workflow/{mode}-timings.json`; session reports use `docs/evidence/sessions/<session>/check-workflow/`. Preparation, compilation, tool typechecking, unit checks, production build, validators and browser time remain separate. Arena reports additionally separate services, joins, frame observations, presentation checks, movement and natural combat. These are measurements, not reusable validation results. Browser-only retries use `node tools/run-playwright.mjs test <the same relevant scope>` after fixture-only fixes; rerun dependencies whenever their actual inputs change.

Reuse the existing exporters, manifests, exact approved-byte guards and frame/review profiles. Validate one directional source before expanding a batch, retain valid outputs and retry only defective components as described in `ART_ITERATION_WORKFLOW.md`. This tooling change creates no artwork, recordings or approval. Required final PNGs/reference comparisons and director approval remain unchanged.
