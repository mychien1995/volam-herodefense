# Audio settings and four-school listening trial — delivery

Date: 2026-11-22. User approved all three prior school audio kits. Their 261
source/export/manifest hashes are preserved in the new approval lock.

- Game/settings preview: http://127.0.0.1:55871/?debug
- Four-school listening page: http://127.0.0.1:55862/
- Preview process created here: Node PID 1000, backend port 28871, protocol 48,
  run ID `2dcd73a3-323e-41f4-92f0-1d2fc8c0998b`. HTTP health verified `ok`.
- Main settings were visually inspected at 1280×720 in `settings.png`; both
  labelled sliders and all existing controls fit in the settings panel.

Implemented: independent music/game sliders in the shared home/in-game settings,
persisted preferences, legacy migration retaining music volume and raising SFX
15% once with zero preserved. Defaults: music 45%, game 52%. Existing active MP3
voices update immediately; the approved directors retain their per-frame gain,
mute/lifecycle handling and headroom. Approved audio bytes remain unchanged.

Four-school trial: 51 entries, 102 clips, two layers per entry, including eight
basics, all 43 actives and the three alternate Thiếu Lâm leg skills. Master WAV,
OGG, SHA-256 manifest and standalone listening HTML are under
`assets/reviews/audio-four-schools-v01/`. They are candidates for listening,
not integrated replacements for current MP3s or completed skill choreography.

## Verification actually run

`python scripts/build-four-school-audio-trial.py` generated and decoded all 102
exports; finite/non-silent/full-scale checks passed. The unchanged original
generator was reused without modifying approved source/export bytes.

`pnpm exec vitest run tests/audio-preferences.test.ts tests/approved-skill-audio.test.ts`
passed both focused tests, including all 261 approval hashes.

The first final run, session `audio-settings-final`, passed asset preparation
but failed TypeScript because installed Phaser requires a key for `getAll`.
The call was corrected to iterate `getAll(key)`; that original FAIL report remains.

```powershell
$env:VOLAM_QA_SESSION = 'audio-settings-final-retry'
$env:VOLAM_QA_SERVER_PORT = '28871'
$env:VOLAM_QA_CLIENT_PORT = '55871'
pnpm check:final --config playwright.practice.config.ts tests/e2e/audio-settings.spec.ts
```

Final result: **PASS in 393.76 seconds**, including TypeScript, tests/tools,
workflow, all **1236 unit/integration tests**, production build, every asset
validator and **two Chromium cases**. The browser cases verify home migration,
save/reload, independently changing music and game audio, live aura mute/resume,
and 51/102 audition inventory plus decoded playback for all four schools.
See `../audio-settings-final-retry/check-workflow/final-timings.json`.

Afterward, fresh `qa:preflight --mode browser --config playwright.practice.config.ts --ready`
passed before starting the review server and capturing the one settings PNG.
No recordings or screenshot streams were made. Artistic listening review of
the four new schools remains pending. Existing four-school MP3s remain in game.
