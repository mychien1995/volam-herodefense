# Skill audio v01 — Côn Luân, Ngũ Độc, Đường Môn

Status override — 2026-11-22: the user approved the complete audio for Côn Luân,
Ngũ Độc and Đường Môn. `assets/approved_skill_audio_v01.lock.json` preserves all
261 source/export/manifest hashes. Historical candidate labels in the original
manifests are retained as production evidence; this approval supersedes them.
The synthesized four-school listening trial was rejected. The original supplied
four-school audio is retained and converted to OGG; see ORIGINAL_SKILL_AUDIO_OGG.md.
No previous school audio or approved artwork was replaced.

## Assets and provenance

129 original clips: Côn Luân 41, Ngũ Độc 45, Đường Môn 43. Runtime Ogg Vorbis
files total 1,162,651 bytes. Masters are 48 kHz mono PCM16 WAV. The sounds are
authored additive/subtractive synthesis, filtered noise, inharmonic metal modes,
short reflections and envelopes; there are no third-party recordings, model
outputs, voices or copyrighted game samples.

- Reproducible design: [generator](../scripts/build-skill-sounds.py).
- WAV masters: `assets/source/audio/{con-luan,ngu-doc,duong-mon}-v01/`.
- Runtime clips and per-file source/export SHA-256, peak/RMS, duration and design
  provenance: `assets/sounds/skills/{con-luan,ngu-doc,duong-mon}-v01/manifest.json`.
- Existing identical WAV/OGG files are retained on regeneration.
- Generator dependencies: Python, NumPy, SciPy and FFmpeg with libvorbis.
  Validation uses Python/NumPy, FFmpeg and ffprobe; nothing is installed at runtime.

```powershell
python scripts/build-skill-sounds.py --school con-luan
python scripts/build-skill-sounds.py --school ngu-doc
python scripts/build-skill-sounds.py --school duong-mon
pnpm verify:skill-audio
```

`--pilot` is for the initial representative slice, before full production, and
produces an explicitly partial manifest. A pilot cannot pass final validation.
The final inventory includes two variants for frequent basic/projectile/impact
cues. A sound's length is independent of the server's skill lifetime.

## Coverage

| Branch | A | Q | W | E | R | T / extra |
| --- | --- | --- | --- | --- | --- | --- |
| Côn Luân Thiền Sư | Four distinct hammer strokes; ranged Thiên Lôi; heavier Chaos playback | Ngũ Lôi Chính Pháp: both stance directions | Cuồng Lôi Chấn Địa: windup/contact | Ngũ Lôi Chính Pháp: expanding electric ring | Thiên Lôi Trấn Nhạc: launch/explosion | Vô Cực Phong Lôi Quyết: start, live bed, end |
| Côn Luân Kiếm Tôn | Orb and sword finisher | Lôi Động Thiên Địa: trigger/grouped detonations | Điện Quang Lôi Ảnh | Five real Bạo Lôi Kiếm Canh sweeps | Lôi Long Thiên Tường: launch/hit | Trận Pháp Năm Kiếm: windup, open, pulse, live bed, end; S Kinh Lôi plant |
| Ngũ Độc Bích Cổ | Normal/toxic palm and real contact | Ngũ Độc Chưởng: on/off | Độc Sa Chưởng: open/bed/end | Âm Tà Hấp Hồn Khí: on/bed/off | Vô Hình Độc: actual reflected poison, throttled | Âm Phong Thực Cốt: windup, real open, bed, end |
| Ngũ Độc Âm Linh | Skull-staff projectile/contact | Vạn Cổ Thực Thiên: swarm/contact | Yêu Cổ: call, emergence, minion contact/fade | Tâm Hình Cổ: launch, attach, detonate, return | Vô Hình Ma Cổ: actual zombie emergence/contact/fade | Thi Quỷ Phong Tận: call, emergence, Reaper sweep/wave/slam/contact/death |
| Đường Môn Cơ Quan | Mechanical bolt / flying feather | Truy Tâm Tụ Tiễn | Thiết Dực Hoành Không: open/bed/close | Lưu Tinh Trục Nguyệt: charge/actual release | Thiên Cơ Thiết Dực: close/bed/open | Mãn Thiên Hoa Vũ: cast, scatter appearance, grouped explosions |
| Đường Môn Ám Khí | Composite fan for each R rank, elemental contact | Địa Diệm Hỏa: private placement/trigger | Cửu Cung Phi Tinh: ready and six actual releases | Nhiếp Hồn Nguyệt Ảnh: dash/protection end | Ngũ hành cách thể thuật: encoded in ranked A, no invented cast | Bạo vũ lê hoa châm: ready, slow volley, six poison volleys, water volley |

Always-on school innates are silent. Poison damage ticks are silent. No permanent
hum is attached to planted swords, idle minions or idle Reaper movement. Summons
returning across a zone boundary do not replay their summoning sound.

## Integration and authority

The existing `skill-sounds.ts` still owns old MP3 mappings. The new sound bank,
bounded mixer and school directors use actual combat messages and replicated
status/area/minion lifetime. No client timer predicts damage or a skill expiry.
Volume follows the existing setting; mute stops current new voices and unmute
resumes only currently valid beds. Cleanup is scoped to the new clips on death,
disconnect, room leave, scene shutdown, branch/session/zone changes.

The local-player listening policy is retained. Owned Ngũ Độc Reaper effect sources
are recognized from server summon ownership. Other players' traps cannot be
revealed through these sounds. Frequent hits are grouped by strike/tick, minion
and reflected-poison cues are throttled, and each kit is limited to eight transient
voices plus its valid beds. Conservative summed gain is capped at 0.9 at full
master volume, leaving headroom for overlap.

Server additions are presentation cues only: actual Đường Môn knife/storm batch
release, actual Ngũ Độc mark attachment/reflection and the hands field's first open.
Elemental projectile phases are carried in the existing `hitPhase` field.
No damage, RNG draw, rank, cooldown, resource, control, targeting, movement,
projectile trajectory, inventory or protocol schema was changed.

The Phaser sound manager is global, so the new handles are explicitly destroyed
on scene teardown; see the [official audio guide](https://phaser.io/oss/docs/phaser/concepts/audio).
Implementation was checked against installed Phaser 4.2.1 types/source. In this
version seamless Web Audio loops schedule successive buffer sources rather than
setting the browser source's native `loop` flag.

## Verification and listening

`verify:skill-audio` is included in `verify:assets`. It checks the complete design
inventory, generator/source/runtime hashes, channels/sample format, endpoints,
loop seams, container duration, decoded non-silence and peak headroom. Raw FFmpeg
Vorbis decode is trimmed to the container duration to exclude terminal packet
padding; actual Chrome decoded duration is observed separately in browser QA.

Deterministic regressions cover every basic profile, state changes, five Côn Luân
E sweeps, eight storm release batches, six knives, hit/miss mark paths, actual
reflection, ownership, grouping, voice limits, mute and lifecycle cleanup. Browser
tests use existing QA helpers, real UI/key inputs and fresh server acknowledgements.
The read-only evidence hooks expose loaded clip count, recent cue/event IDs and
active handles. Web Audio starts and decoded buffer peaks are observed as metadata;
no live audio or video is recorded.

Session reports are under `docs/evidence/sessions/*sfx*/`. The initial Côn Luân loop
assertion and initial Ngũ Độc pilot inventory failure remain in their original
reports; passing scoped retries are separate evidence. Final results are recorded
in the [delivery report](evidence/sessions/three-school-sfx-final/README.md), not
inferred from those earlier runs.

To listen: reload the game, open **Phòng test**, choose each branch, click the canvas
to unlock browser audio, and use A / QWERT (plus S for Kiếm Tôn). Check A repeatedly,
toggle Q/E/W as appropriate, wait for fields/protection to expire, and change branch
while a bed is active. R on Bích Cổ, Âm Linh and Ám Khí is passive and has no cast.
Automated playback checks establish integration; timbre, taste and the mix with
music remain for the user's listening review. Browser coverage is Chromium.
