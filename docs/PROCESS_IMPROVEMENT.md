# Development execution report — 2026-10-31

Implemented in the isolated `wip/m3d/process-improvement` branch, based on `066f785`. The app-managed checkout uses the flat directory name `process-improvement`. No other checkout or service was changed/stopped.

- Reused the single-pass validation runner, byte-aware preparation, atlas packing cache, existing exporters/manifests and two-/six-player art profiles. Added compact success/failure stage timing JSON; no stage success is cached or reused automatically.
- Default smoke and Waves 13–16 QA now accept per-session ports, endpoint, Vite cache, Playwright output and evidence overrides. Occupied ports fail immediately. Owned server/client identities and compiled preview endpoints are checked. Cleanup attempts every owned handle once.
- Arena fixtures wait for room membership, rendered actors, resize, authoritative movement/projectile advancement, input sequences and server cooldowns. Independent keyboard drivers continue while captures run; missing/dead/wrong-zone actors fail early. Original frame/combat/reward/depth assertions and final PNG policy remain.
- Added focused regressions for configuration, port conflicts, identity mismatches, cleanup, acknowledgement deadlines and core-world zone membership. The exact health-response assertion now includes optional QA metadata without dropping its existing fields. The default fixture explicitly preserves/restores development mode so Vite preview cannot silently disable historical practice creeps; missing combat actors/targets now give prerequisite diagnostics.

Validation: `pnpm test:workflow` passed 17 checks; project and test/tool typechecks passed. `pnpm check:final --config playwright.arena-creeps.config.ts` ran preparation once and compiled once, then passed 341/342 unit/integration tests before stopping on the new optional health identity. After the exact assertion update, `pnpm exec vitest run tests/room.test.ts` passed all 14 affected tests with QA identity enabled, and the changed test/tool typecheck passed again. The other successful tests had unchanged inputs and were retained. The remaining production build, all 12 canonical asset validators and the full six-client browser gate passed without repeating preparation/full tests. The default preview fixture then exposed its shared-process `NODE_ENV` problem; only its typecheck and three affected browser cases were rerun after the fixture correction. All three passed (Playwright total: 1.6m, rounded); owned startup took 0.59s. Ports 2788/5386 were closed afterward. Scoped formatting and diff-whitespace checks passed.

The two-client iteration used `pnpm check:art:frames`; after fixture-only fixes its browser stage was retried with `node tools/run-playwright.mjs test --config playwright.arena-creeps.config.ts` and the explicit two-player frame environment. The final six-client stage used the same command with the unchanged full profile. Complementary default smoke uses `node tools/run-playwright.mjs test tests/e2e/lobby.spec.ts tests/e2e/gameplay.spec.ts --grep "waiting room|two clients agree|ranged projectile"` against the same current production bundle.

| Observed phase | Seconds |
| --- | ---: |
| First successful / warm preparation | 31.03 / 6.61 |
| Final preparation / incremental compilation | 7.57 / 0.34 |
| Production build (including launch) | 10.50 |
| Focused two-client fixture / directional frame review | 45.99 / 19.63 |
| Final owned services / browser launch | 0.88 / 0.13 |
| Six-client joins / directional frame review | 131.17 / 29.66 |
| Scale, depth and projectile checks / peer input | 4.35 / 0.81 |
| Six-client natural combat, hurt/death and rewards | 22.24 |
| Final six-client fixture / browser-stage total | 194.39 / 201.42 |

Both profiles observed all 256 character frames across 80 tags. The full profile also retained contact effects, combat/rewards, authority and cleanup assertions. Both required final PNGs were opened; the idle PNG was visually compared with retained arena evidence. The viewport, textures and scale remain consistent; current baseline creep labels are hidden. This is tooling verification, not new art approval.

Evidence is under `docs/evidence/sessions/process-improvement/`; build/unit logs remain in this checkout's `.cache/`. `check-workflow/final-timings.json` honestly retains the stopped pipeline result; `completion-timings.json` records the affected rerun and remaining stages, including the first default-smoke fixture failure. The successful affected default browser rerun is retained separately in `default-browser-rerun.log`. `validation-summary.json` records completed coverage across these scoped stages.

Remaining limits: older dedicated school/dungeon configs and unit-room port assignments still use their existing fixed ports. This task migrated the default smoke and representative arena production profile. Client joins and authored frame-cycle observation still dominate browser time. The production build copies the existing public asset tree; one observed build spent 8.1s in Vite's output-directory stage. No test isolation was disabled. Fresh Git checkouts can normalize protected CRLF metadata to LF; this checkout recovered only line-ending variants matching existing complete SHA-256 locks/handoff/manifest hashes. No approval hash was changed. The underlying baseline line-ending policy remains a follow-up.

Gameplay, server authority, artwork and director approval requirements are unchanged. No image generation, animation export or recording occurred. Existing source/PNG/atlas/provenance and final-art approval gates remain mandatory. Timings vary with cache state and background load; no controlled or guaranteed speedup is claimed.
