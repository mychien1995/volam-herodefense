# Audio settings and four-school trial — 2026-11-22

Current override: the user rejected the generated four-school trial. It is
historical evidence only. The game's original user-supplied MP3s are now retained
as sources and transcoded to OGG under `assets/sounds/skills/original-four-schools-ogg/`.
All existing mappings, gain, silence and the Vạn Kiếm 0.6-second seek are retained.
Decoded float32 WAV archives preserve decoder headroom but do not restore information lost in the original MP3.
The following trial description records the rejected production attempt.

The shared settings component now provides **Nhạc nền** and **Âm thanh game**
sliders in the home menu and every in-game settings dialog. Music follows
`musicVolume`; SFX follow the retained `volume` field. Old saved settings migrate
once to two independent channels: music retains its old level, game sounds gain
15% (capped at 100). Zero remains zero. New defaults are music 45%, game 52%.
Both channels persist together; changing music does not mute game effects.

The approved three-school clips are preserved byte for byte by
`assets/approved_skill_audio_v01.lock.json`. Increasing the playback level does
not re-export the approved WAV or OGG files.

The separate listening trial is in `assets/reviews/audio-four-schools-v01/`.
Open its `index.html` through the review HTTP server. There are 51 catalogue
entries (43 active skills plus eight basics), with 102 WAV/OGG clips. This includes
the three alternate Thiếu Lâm leg skills. Original synthesis is reused from the
unchanged three-school generator; no external samples or voice recordings.
Each exported OGG was decoded and checked for finite, non-silent data and peaks
below full scale. Source/export hashes are recorded in `manifest.json`.

These are **listening candidates**, not replacements for the four schools' MP3s.
The page auditions release and impact/effect layers independently. Buffs use
an effect layer; it does not imply a damaging hit. Multi-hit choreography, looping
and in-game timing for these candidate clips are not implemented or approved.

Generate again with `python scripts/build-four-school-audio-trial.py` (requires
the built shared catalogue, Python/NumPy/SciPy and FFmpeg). The catalogue is read
from current fixed branches plus the three Thiếu Lâm stance alternates.
