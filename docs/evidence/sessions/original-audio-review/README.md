# Original MP3 → OGG delivery

The user rejected the four-school synthesis trial and requested conversion of
their original skill MP3s. See [conversion details](../../../ORIGINAL_SKILL_AUDIO_OGG.md).

44 original MP3s remain intact. Float32 decoded WAV archives and Vorbis quality-8
OGGs were produced with the original channel count, no gain/normalization or
silence trimming. The 43 existing runtime imports use OGG; the previously unused
Thiếu Lâm Đao E source is archived/converted without adding a new mapping.
Vạn Kiếm retains the existing 0.6-second seek. Minimum decoded waveform
correlation is 0.989411115. The three approved school packs remain byte-identical.

The preliminary PCM24-intermediate verification was deliberately interrupted
after detecting decoder peaks above full scale. It is not a PASS report. The
final archives use float32 to preserve that original decoder headroom.

```powershell
python scripts/convert-original-skill-audio.py
$env:VOLAM_QA_SESSION = 'original-audio-ogg-float-final'
$env:VOLAM_QA_SERVER_PORT = '28881'
$env:VOLAM_QA_CLIENT_PORT = '55881'
pnpm check:final --config playwright.practice.config.ts tests/e2e/audio-settings.spec.ts
```

Final pipeline: PASS in 378.40s, including full compilation, tests/tools,
workflow, unit/integration, production build and all asset validators. Both
Chromium cases passed: independent volume settings and loading/playing original
OGG audio through accepted A inputs in all eight branches. The retained trial
audition test was replaced, not treated as approved audio.

Preview: http://127.0.0.1:55881/?debug . Fresh ready-preflight PASS; backend health
and client HTTP 200 verified after launch. Owned Node process PID 26212, backend
port 28881; prior review processes were not stopped. The rejected-trial Python
server on 55862 was stopped only after verifying its command line and directory.

No gameplay, skill timing, controls, background music or sound gain changes were
made in this conversion task. Converted OGG is a lossy derivative of the MP3
source; the decoded WAV archive is not a reconstruction of lost source detail.
