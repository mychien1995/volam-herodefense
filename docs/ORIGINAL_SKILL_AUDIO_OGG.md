# Original four-school skill audio converted to OGG

The user rejected the synthesized four-school trial and requested format
conversion of the originally supplied MP3s. That rejected trial remains only
as historical evidence; its listening server was stopped after verifying its
owned process and port. No candidate synthesis is used in the game.

44 original MP3s remain byte-for-byte in `assets/sounds/skills/`. They were
decoded to 48kHz float32 WAV archives in
`assets/source/audio/original-four-schools-decoded-v01/`, preserving their channel
counts and decoder headroom. Some MP3s decode above full scale, so integer WAV
intermediates were replaced before delivery to avoid unintended clipping.
The initial verification process for those interim exports was stopped; its
report is not a final result.

Runtime exports are Ogg Vorbis quality 8 in
`assets/sounds/skills/original-four-schools-ogg/`. There is no gain adjustment,
normalization, silence trimming, resynthesis or tempo change in conversion.
Decoded float WAVs are archives of the MP3 signal, not recovered lossless masters.

All 43 existing client imports now use these OGGs. The additional supplied
`thieu-lam-dao-E.mp3` is converted and archived but remains unmapped, as before.
Existing attack stages, shared-clip mappings, casting/hit timing and the
Vạn Kiếm Quy Tông 0.6-second seek are retained. Background music is outside scope.
The three approved synthesized-school packs and independent volume settings are
unchanged.

`scripts/convert-original-skill-audio.py` records source/WAV/OGG hashes,
channels, decoded duration and waveform correlation in the export manifest.
All 44 exported clips were decoded and checked for finite samples, less than
50ms terminal packet-duration difference and waveform correlation above 0.97;
the observed minimum for final float intermediates is 0.989411115.

`tests/original-skill-audio.test.ts` checks all three hashes per clip, the existing
43 imports and retained seek. Browser QA exercises real server-acknowledged A
inputs in all eight original-school branches and observes decoded audio starts.
