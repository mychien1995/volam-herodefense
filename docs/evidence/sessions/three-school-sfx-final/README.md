# Three-school SFX delivery — 2026-11-20

Implementation and provenance: [skill audio v01](../../../SKILL_AUDIO_V01.md).

Production candidate: 129 original WAV masters / Ogg runtime clips, all six
branches, A and every QWERT slot plus Kiếm Tôn S. Runtime files total 1,162,651
bytes; WAV masters total 6,289,836 bytes. Artistic listening approval is pending.

## Executed checks

- Initial focused Côn Luân director suite: `pnpm check:quick tests/con-luan-sounds.test.ts` — PASS.
- Côn Luân pilot in live Phaser: the first run failed a native Web Audio `loop`
  assertion. Inspection of installed Phaser showed it schedules consecutive
  buffer sources instead. Scoped corrected observation retry passed, with four
  actual A stages, non-silent decoded playback, repeated two-second Chaos buffers
  and server expiry cleanup. The original failure remains under
  `con-luan-sfx-pilot`; retry evidence is under `con-luan-sfx-pilot-retry`.
- Full Côn Luân kit browser run — PASS, under `con-luan-sfx-kits`.
- Five focused audio/gameplay suites — PASS, under `three-school-sfx-focused`.
- Đường Môn pilot — PASS in the initial remaining-school pilot run. Ngũ Độc's
  pilot manifest omitted its toggle cue; that first failure is retained under
  `remaining-school-sfx-pilots`. Adding the intended toggle clips and rebuilding
  the changed asset inputs passed under `ngu-doc-sfx-pilot-retry`.
- Full Ngũ Độc and Đường Môn kits — PASS, under `remaining-school-sfx-kits`.
- Three new regression suites after the overlap gain change: `pnpm exec vitest
  run tests/con-luan-sounds.test.ts tests/additional-school-sounds.test.ts
  tests/skill-sound-events.test.ts` — 26 tests PASS.
- `python scripts/verify-skill-sounds.py` — all 129 master/export hashes,
  inventory, sample format, loop seams, endpoints and decoded data PASS. Maximum
  individual decoded peaks: Côn Luân 0.97256, Ngũ Độc 0.73227, Đường Môn 0.87795.
  Runtime mixing conservatively limits summed new SFX gains to 0.9.
- `git diff --check` — PASS.

## Final pipeline

```powershell
$env:VOLAM_QA_SESSION = 'three-school-sfx-final'
$env:VOLAM_QA_SERVER_PORT = '28861'
$env:VOLAM_QA_CLIENT_PORT = '55861'
pnpm check:final --config playwright.practice.config.ts tests/e2e/con-luan-sounds.spec.ts tests/e2e/school-sounds.spec.ts
```

Runtime verification complete across the final invocation and scoped test-only
retries. The original `check:final` remains FAIL in its [stage timings](check-workflow/final-timings.json):
every build/type/workflow/asset stage and all 1234 unit/integration tests in 123
files passed; six of eight browser cases passed in that invocation.

The two browser failures were QA observation defects:

1. The leave case clicked **Thoát** but did not confirm **Rời trận**, so the server
   correctly kept the room and flight loop alive. The corrected test confirms
   and waits for the room-leave acknowledgement before checking cleanup. It
   passed in `three-school-sfx-lifecycle-retry`.
2. The private-area observer's original 250ms window had no advancing peer tick,
   so concealment was inconclusive. Existing six-client viewport sizing, a live
   connected/tick prerequisite and a one-second observation window preserved the
   strict concealment assertion. That retry passed concealment but exposed a
   second QA issue: the test later expected old A receipts in the game's bounded
   60-event debug ring, which real creep attacks had rolled over. A read-only,
   bounded player-event observer now retains those receipts as inputs occur.
   The six-real-client case then passed in `three-school-sfx-six-retry` (2.3m).

There were no runtime, gameplay or asset changes after the final build. Each
test-only retry passed tests/tools typechecking and a fresh browser preflight,
and reused that same production bundle. Passing build/unit/asset stages were
not repeated or relabelled; original failures and diagnostics remain intact.

```powershell
pnpm exec tsc -p tsconfig.tools.json --noEmit
pnpm qa:preflight --mode browser --config playwright.practice.config.ts
node tools/run-playwright.mjs test --config playwright.practice.config.ts tests/e2e/school-sounds.spec.ts --grep 'Three-school audio'
# Corrected leave passed; six-client receipt-history assertion failed.
node tools/run-playwright.mjs test --config playwright.practice.config.ts tests/e2e/school-sounds.spec.ts --grep 'six real clients'
# With bounded receipt retention: PASS. Typecheck/preflight repeated beforehand.
```

Observed final coverage: 1234 unit/integration tests, all asset validators and
all eight browser scenarios PASS across the recorded runs.

A [local listening preview](../three-school-sfx-review/README.md) was started from
the same bundle after QA teardown. Client HTTP 200, backend health `ok`, protocol
48 and owned process liveness were verified. This is a listening candidate,
not final director sound approval.

Browser scope: both Côn Luân branches and S; both remaining-school representative
slices; every active kit; passives through their real effects; actual Web Audio
starts and decoded peaks; expiry/toggle/hero-switch/mute/leave cleanup; six real
clients with one branch each; ownership and private-trap concealment.

Limits: Chromium integration coverage, with deterministic tests for death,
disconnect, zone changes, mark miss and actual incoming-hit reflection. Headless
playback/metadata checks do not establish subjective sound quality or approval.
No live audio/video recordings or screenshot streams were made. Existing art,
combat tuning, movement, resources and schema remain unchanged; server additions
are bounded presentation cues using the existing combat-event envelope.
