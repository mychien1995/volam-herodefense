# Nam Đế — final-brief sprite / VFX demo v02

Worktree/branch: `wip/m3d/nam-de`. Status: **PROTOTYPE — pending director review**.

This isolated Phaser 4 preview uses the existing main arena, character and concept art. It adds no dungeon or boss encounter to the game. Visual witnesses and HP bars are illustrative; they are not network clients or authoritative combat. Original actor/concept/VFX files are preserved.

## Run

`node tools/serve-nam-de-review.mjs`

Open <http://127.0.0.1:5413/assets/reviews/nam_de_v02/>. The optional `--deps-root D:/Projects/volam-hero-defense` uses the existing installed Phaser bundle; art and code always come from this worktree.

Arrows move, A previews an attack, Space pauses, H hides review controls. Choose clips, facing, 1–6 visual witnesses, speed, native 1×/normal 2× zoom and timeline inside the viewport. Sprite opens the retained atlas; Pose / 4 hướng plays the actor poses. Each skill can be replayed independently. Click the world before using arrows if a select/range control owns focus.

## Final brief and asset comparison

The director's 2026-11-01 description supersedes the original v01 skill interpretations. Nam Đế enters the main arena from the south and focuses players, never the statue. No separate arena is created. Slow walking and a behind-player dash are shown; actual probability and AI selection await encounter integration.

| Final action | Reuse / rework in the demo |
| --- | --- |
| Forward long-range palm shockwave | `palm_attack` + `palm_trail`, enlarged traveling front |
| Phật Quang normal | One plain authored light ring expands from the boss center; ornate radial shockwave removed |
| Tiểu nhất dương chỉ | Immediate hand-flick release, no charge pose/VFX; narrow `rapid_projectile` snapshots the farthest witness at launch |
| Behind-player dash | Retain pressure-point pose, new `dash_wake`; opposite the victim's facing |
| Nhất Dương Chỉ | Finger charge at hand socket, warning then screen-crossing straight beam; illustrative −90% HP on hit |
| Liên Hoàn Nhất Dương Chỉ | Slowly rotate through 360 degrees and release four rays at once per volley, 90 degrees apart; each lane has its own warning before firing |
| Đại Lý Phong Huyệt | Replace sealing missile with contact dash/pressure seal; ten arrows in five seconds; wrong key: −70% player HP / +10% boss HP plus an explosion and stun; victim protected during the input challenge; correct sequence releases immediately; dialog closes on success or the first wrong input while world VFX continue |
| Phật Quang Phổ Chiếu | Replace healing with golden light on one victim, new dizzy halo and randomized arrow permutation for about ten seconds |
| Nhất Dương Quy Tông | Raised finger/gather reused, one upward ray then 32 individually warned downward strikes with new sky-ray cels |

Old Kim Cang Hộ Thể, Kim Thân Bất Hoại, sealing missiles, generic projectile stun/slow and healing behavior are excluded; the explicitly requested backlash stun is retained from this final kit. Their files remain intact.

Unspecified combat tuning remains open. Preview-only timing proposals: 1.5s major-beam startup/warning, 0.9s warning before each Liên Hoàn ray, 0.8s between releases and 12.8s for a complete rotation, 0.28s individual sky warnings, 2s backlash stun. Stun blocks movement/A locally in the demo and expires cleanly; its exact duration is not finalized. Damage percent base (max/current HP), timeout result and exact boss-heal trigger need precise encounter definitions. This demo labels its HP as illustrative, uses max HP, releases on timeout with no invented extra penalty, and shows healing on wrong input only. Controls use one random bijection for the duration of a cast. None of these implementation proposals claims final balance approval.

## Source, export and checks

Built-in `image_gen` produced one original transparent VFX source, retained in `source/vfx_rework_v02.png`. Exact prompt: `generation_prompt.json`. No layered Aseprite original is claimed. `export_v02.py` crops actual drawn cels, applies one shared scale per action, preserves meaningful alpha, pads frames and exports 16 individual PNGs / four clips / hash atlas. It does not fabricate actor animation by transforming idle art. Original asset provenance remains in `assets/sprites/bosses/main/nam-de/package_manifest_v01.json`; `manifest.json` pins reused bytes and new outputs.

`python -X utf8 assets/reviews/nam_de_v02/verify_assets.py` validates hashes, alpha, atlas bounds/cel identity and distinct frames. `node tools/run-playwright.mjs test --config playwright.nam-de.config.ts` observes actual Phaser playback, controls and choreography. Final project verification uses `pnpm check:final --config playwright.nam-de.config.ts`.

Actual screenshots and frame observations are saved under `evidence/`. PNGs and live observations only; no video, GIF or trace screenshot streams. This is art-preview verification, not multiplayer/combat/ART-01/final runtime approval.

## Director feedback01 — 2026-11-02

Implements the four requested presentation revisions above, without production combat integration. The plain ring is a new original built-in image_gen PNG; exact prompt and original source are retained under `source/phat_quang_ring_feedback01.*`. Existing `pressure_impact` and `stun_status` cels animate the victim after a wrong arrow input. No new character sprite is generated.

Export only the added ring with `python -X utf8 assets/reviews/nam_de_v02/export_feedback01.py`. For a full offline rebuild, run `export_v02.py`, `export_feedback01.py`, then `export_feedback02.py`. The second exporter restores the feedback package in data.json and refreshes its hashes. Feedback source/alpha/atlas checks are part of `verify_assets.py`. New screenshots and live results are under `evidence/feedback01/`; prior evidence is preserved.

## Director feedback02 — 2026-11-02

Liên Hoàn uses the slow sequential timings above, with at most one active ray and two overlapping warning lanes. The random initial angle is followed by a predictable clockwise turn, keeping all four authored facings and a fixed camera perspective. Every lane direction stays fixed from warning through release. The sixteen-ray count and exact timings are preview defaults.

The pressure-point dialog only exists while the ten-arrow input challenge is pending. It disappears on the tenth correct key, the first incorrect key or challenge expiry. Wrong-input explosion and stun continue after the dialog disappears. Replaying the challenge opens a fresh dialog.

`export_feedback02.py` crops the transparent borders from four retained warning cels to align the warning with the firing hand; it records source rectangles and hashes in `feedback02/manifest.json`. No character or original VFX files are altered. Validation uses `verify_assets.py` and the `feedback02` browser case; current PNGs/frame observations are under `evidence/feedback02/`. Earlier evidence is preserved.

## Director feedback03 — 2026-11-02

The director accepts the current speed and asks for simultaneous directions. Each of sixteen volleys now emits four straight rays at once, 90 degrees apart, for 64 rays total. All four lanes share the volley launch time and each has a 0.9s warning. The 0.8s volley cadence, 12.8s turn, 16s preview duration and dialog dismissal are unchanged. Four simultaneous directions is a configurable preview default.

Only choreography changes; existing sprite/telegraph/beam PNG bytes are reused. Current six-witness PNGs and assertions are under `evidence/feedback03/`. The focused/final browser scope for this revision is `--config playwright.nam-de.config.ts --grep feedback03`; it checks simultaneous warning/fire timing, four orthogonal directions, frozen lanes and the accepted rotation speed. Earlier evidence remains historical.
