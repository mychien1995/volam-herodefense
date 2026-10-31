# Skill animation review v01 — 2026-11-01

Status: **DIRECTOR_APPROVED_PREVIEW_PENDING_GAMEPLAY_INTEGRATION**. On 2026-11-01 the director explicitly approved all animation previews and instructed not to integrate them into gameplay yet. Exact approved source/export/choreography hashes and scope are recorded in `assets/reviews/skills/animation-review-v01/director-approval.json`. Export-time pending statuses and preview labels remain historical snapshots of the exact reviewed build. This task does not change live combat, skill data, cooldowns, damage, movement, regeneration, invulnerability or server messages.

Open `http://127.0.0.1:5395/?artPreview=1&animationReview=1` while the retained preview service runs. Restart with `pnpm --filter @volam/game-client dev --port 5395 --strictPort`. Any client URL also accepts `?artPreview=1&animationReview=1`. The review requires no backend or match. “Về game” returns to that client's lobby; playing requires a separately running backend.

Controls overlay the full viewport: skill, facing, one/four/six copies, targets, light/dark/arena background, playback 0.25/0.5/1 and display 1× native / 2× matching normal desktop gameplay, pause/restart and timeline. Six copies are an art fixture, **not six connected players or natural combat evidence**. Two preview contexts do not join rooms or send commands. The target is a retained M1 practice placeholder, not newly completed enemy art.

## Choreography

| Skill | Preview |
| --- | --- |
| Liên Hoa Phiến | New cyan lotus opening/loop/fade, fixed at cast position; actor steps out/back, with protection cue only inside. Optional stationary variant.6s is preview timing. |
| Phong Ảnh Hoán Vị | Authored anticipation → retreat opposite facing → six time-separated light echoes using retained body/ghost cels → recovery. |
| Thất Tinh Kiếm | Seven silver-blue swords gather then strike in seven successive beats, with star impacts. |
| Vạn Kiếm Quy Tông | Gather → continuous eight-way bursts for5s → dissolution. Live duration unchanged. |
| Tọa Sát Bác Đồ | Existing sheathed stance, readable guard, received-hit cues and radial release; two branches below. |
| Đại Lực Kim Cương Chưởng | Authored thrust plus a new five-finger gold palm travelling straight, then handprint impact. |
| Tam Giới Quy Thiền | Three staggered retained gold seal layers, larger authored slash, armor-break cue. |
| Thiếu Lâm Đao A | Three preview attacks near the retained base interval, with fitted release/contact/recovery. No authoritative cadence change. |
| Bất Động Minh Vương | Retained activation/pulse/loop/ending with4s readable sustain; no live buff added. |
| Như Lai Thiên Diệp | Seven layered gold palm waves, handprint climax and fade; provisional2.4s choreography. |
| Lục Dương / Bách Phiến / Phi Ảnh | Retained animations arranged for comparison, no replacement mechanics. |

## Confirmed future Tọa Sát rule

Director-confirmed2026-11-01: guard lasts at most5s, damage taken is reduced70%; accumulate **actual damage received after reduction**. Release at5s or when accumulated actual damage is **greater than20% of maximum HP**. Reflect the accumulated actual damage. This is recorded for later gameplay implementation; only a scripted storyboard is delivered here.

- Threshold: maxHP1000, threshold>200. Raw200+200+200+100 becomes actual60+60+60+30=210. Release2.8s, reflect210. After the third hit180 remains below threshold.
- Expiry: raw200+200+100 becomes60+60+30=150. Guard stays until5s, then reflects150.

Numbers are labelled **MÔ PHỎNG** and never write HP or call combat. Survival/death, fractional rounding, DoT and other live edge cases belong to the later implementation/tests.

## Artwork and technical contract

Read the art-direction, production, asset, UI and iteration standards and design handoff. Visually inspected actual positive/negative images and v1.5 world/menu references. The old `vo_dang_art_direction_reference.png` alias is absent; actual `vo_dang_character_reference.png` was used. Historical mismatches: `current_codex_dashboard_anti_reference.png` shows the Võ Đang sheet; the dashboard is actually `wuxia_town_world_reference.png`. Both were inspected, along with `current_game_2026_10_29_placeholder_anti_reference.png`.

Art readout: expressive oversized chibi heads, layered robes, readable weapons, fixed foot pivots, charcoal/white Võ Đang and silver-blue energy. Keep detailed stone/foliage behind actors and fixed elevated orthographic view. The rejected block actors and crude flat effects are unsuitable. Approved character pixels, native scale and four facings are retained. New flower/hand/sword candidates need director review of pixel density, continuity, intensity and palette.

Three original built-in `image_gen` source PNGs live under `assets/source/skills/animation-review-v01/`; `generation.json` retains exact prompts/output IDs. Output resolution differed from requested dimensions. `scripts/export-animation-review.py` reuses existing alpha-gutter/connected-raster detection, nearest-neighbor extraction and preserved alpha. Lotus placement aligns its central transparent foot opening.24 cels, three PNG/hash-JSON atlases and source hashes are under `assets/exports/skills/animation-review-v01/`. PNG source inputs are retained; no layered Aseprite source, human hand-pixelled authorship or exclusive-rights claim.

Existing preparation copies these exports automatically. The review scene alone loads their manifest; gameplay registries and approval locks remain unchanged. Other cels are disclosed retained reuse from approved school atlases or the feedback-v2 candidate set. No Phaser Graphics art or recordings. The scene samples actual atlas frames in Phaser; one-shots fit storyboard windows using original relative duration weights, while loops keep native timing. Scrub uses the same timeline.

Installed Phaser4.2.1 and [official animation documentation](https://phaser.io/oss/docs/phaser/concepts/animations) / [Sprite API](https://docs.phaser.io/api-documentation/class/gameobjects-sprite) consulted. Camera orientation uses `getWorldPoint`, matching the installed API.

## Verification scope

Evidence: `docs/evidence/animation-review-v01/`. Checks cover complete live cycles in two independent contexts, four facings, every new VFX cel, retreat/cleanup, lotus exit/reentry/fixed placement, both counter branches, native actor pivots/scales/Y-depth, late sustained swords, pause/resume/scrub, six-copy readability, full 1280×720/1920×1080 canvas and no game-room connection (production QA has zero WebSockets; Vite dev may have an HMR tooling socket). Existing real two-player gameplay/projectile smoke is separate. PNGs alone do not prove animation. No natural six-player acceptance or production art approval is claimed.


## Final measured results

- `python scripts/export-animation-review.py`: exported only the selected three sheets /24 cels. Static PNG checks confirmed transparent backgrounds, nonempty cels, bounded atlas frames and retained source hashes.
- `pnpm check:quick tests/animation-review.test.ts`:5 PASS during iteration.
- Final environment: `VOLAM_QA_SESSION=animation-review-v01`, `VOLAM_QA_SERVER_PORT=2793`, `VOLAM_QA_CLIENT_PORT=5393`. Owned services use their own run identity and stop after QA. The separate review-only service stays on5395.
- `pnpm check:final tests/e2e/animation-review.spec.ts tests/e2e/gameplay.spec.ts tests/e2e/lobby.spec.ts --grep "animation review|ranged projectile|two clients share"`: compilation and tool/test typechecks PASS;18 workflow tests and358 unit/integration tests across31 files PASS; production build and all12 configured asset validators PASS. Current animation preview PASS with complete cycles for13 selections, four facings, all24 new VFX cels, pause/scrub/speed/scale controls, fixed lotus and retreat, both counter branches, no position jump at Thất Tinh gather/strike in any facing, native pivots/depth and no game-room socket. Projectile smoke PASS. Lobby fixture initially failed on stale English acknowledgement text.
- Earlier combat smoke exposed a separate stale fixture: selecting the Chưởng default branch now also selects its A, while the test still required a Bổng hit. Both fixtures were corrected **only in tests**: use the server's selected basicId and current Vietnamese connection/check text. No timeout, damage, cooldown, HP or reward assertion was weakened.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit` and affected browser-stage retry: **3 PASS,0 failed/skipped/flaky,89.52s**. Real two-client combat/cadence/skills/progression49.01s; straight projectile11.25s; two-client room/rejoin/check/leave26.74s. Raw failure pipeline reports are retained honestly; successful static stages and unchanged art playback were not repeated for assertion-only fixture fixes.
- Selected new-source Prettier checks and diff-whitespace checks PASS. The existing large Vite client-chunk warning remains. New source-generation tool wall durations were18.5/21.5/26.4s; exact UTC request boundaries were not captured and no speedup is claimed.

Machine summary: [verification-summary.json](evidence/animation-review-v01/verification-summary.json). Live frame/cycle observations: [observations.json](evidence/animation-review-v01/observations.json). Screenshots were actually opened and inspected after the final scale/continuity changes: [lotus](evidence/animation-review-v01/lotus-inside.png), [retreat](evidence/animation-review-v01/retreat.png), [palm](evidence/animation-review-v01/dai_luc_kim_cuong_chuong.png), [seven swords](evidence/animation-review-v01/that_tinh_kiem.png), [counter](evidence/animation-review-v01/counter-threshold.png), [sustained swords](evidence/animation-review-v01/swords-sustained.png), [six-copy scale/readability](evidence/animation-review-v01/six-copy-readability-1920.png).

Reference comparison: retained detailed robes/hair/weapon silhouettes and crisp integer scaling follow the positive school reference, while flower/palm/sword shapes are materially more distinct than the rejected flat effects. The new lotus remains a bright, large effect; radial sword release briefly overlaps the body and six simultaneous burst copies can overlap each other. Those intensity/coverage choices await director review. The old block practice target and unpopulated preview floor do not satisfy new environment/enemy art acceptance and are explicitly retained fixtures. No claim of perfect crowd readability, measured60FPS, new final character art or natural six-player combat.


## Director approval — 2026-11-01

All 13 preview selections are approved, including the three new VFX sheets / 24 cels and the retained-frame animation arrangements. No extra VFX generation is needed to reproduce the approved preview. Preserve these exact images and choreography. Later integration may require binding opening/loop/ending, facing and cleanup to authoritative state/events, with separate gameplay and natural-combat checks; this approval does not authorize that work yet. Existing character/school approval locks remain unchanged. Exact Toa Sat damage rules remain as confirmed above.
