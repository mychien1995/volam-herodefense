# M3D — wave boss VFX feedback preview v01

Status: **CANDIDATE — PENDING DIRECTOR REVIEW**. Isolated art/choreography viewer. Production Phaser renderers, game-core, rooms, protocol, encounter cadence and approved artwork are unchanged by this task. This does not claim gameplay balance, natural combat or network verification.

Open **http://127.0.0.1:5457/**. Start with `node assets/reviews/wave_boss_feedback_v01/server.mjs`. This read-only server serves retained original art and the installed Phaser **4.2.1**; it creates no room, connection, game-service settings or production routes. Automated checks own separate port5458. No recording or screenshot-playback trace.

## Review controls

Select boss and named skill. **Tùy chỉnh** offers facing,1/2/6 local models, original-preview comparison, polygon shape, both Nam Đế follow-ups, half/normal/double speed and camera follow. Arrow keys walk; Shift demonstrates dash availability/confinement; A changes sample boss HP; Space pauses; R restarts; H hides the overlays. Buttons and timeline support frame inspection. Changing a skill starts playback. Seek rebuilds scripted pull movement so an isolated frame agrees with forward playback without input.

Normal view matches the game's resize policy in `apps/game-client/src/main.ts`: **camera zoom1 and display scale2** on desktops at least960×600, otherwise display scale1. The logical canvas follows the viewport:640×360 at1280×720,960×540 at1920×1080. It does not fit the whole arena by reducing world scale. The edge and wide effects may leave the camera view, as in gameplay; walk toward the edge or choose boss/center camera. All controls remain overlays inside the viewport.

“Preview gốc” replays reference choreography at this same gameplay scale. It is **not a capture of the production encounter**, and it does not claim to reproduce every production projection detail. Its purpose is to compare retained reference pixels and motion. The normal Lạc Anh, Mai combo, new VFX and Bắc Cái pull changes require the candidate option.

## Director-confirmed target, implementation deferred

On2026-11-03 the director confirmed:

- Polygon dashes change **normal** Lạc Anh only; the four-direction +/X active remains.
- **All wave bosses** inherit Đông Tà's complete encounter policy: main circular court, statue hiding/protection, all-player recall/revival, confinement, wipe reset and unlimited retries. A faint boundary and Tây Độc-style overhead HP apply to all. The common entry/retry demos illustrate that target; no authoritative lifecycle change is implemented here.
- Bắc Cái pulls players with a fast visible tug, rather than instantaneous teleportation.

All original feedback is represented by named preview modes in `tuning.mjs`. Needle speed is exactly360→288px/s and Nhất Dương Chỉ charge1.5→0.75s. Other numeric proposals remain **review defaults**: Mai pull285px/s, needle scale1.5, dragon speed×1.3, post-dash choice50/50, Bắc Cái tug0.25s followed by48px/s pull and35% slow. Walk180×0.65=117px/s exceeds the sustained pull, so P1 can walk away while Shift is locked. These are not approved balance coefficients.

Bổng Đả Ác Khuyển uses four real retained black-dog animated sprites with sample bite/hurt/death and HP. Why the production AI was not observed using it remains a **runtime investigation for the next stage**; this preview does not fix or diagnose its cadence. The dog north/south artwork gap remains: retained right-facing clips and left mirror are disclosed, not newly authored four-direction dogs. Fallen party members in the common retry illustration are dimmed idle sprites with “Gục” labels, not a newly delivered death animation.

## Art provenance and scale contract

`source/prompts.json` and `source/retry_prompts.json` preserve exact built-in **image_gen** requests. `manifest.json` records source/export hashes, cell dimensions, shared downscale, retained input identities and candidate status. Original AI-assisted project artwork is subject to applicable OpenAI service terms; no external sprite-pack license or layered Aseprite source is claimed.

| Change | Asset / treatment |
| --- | --- |
| Phật Quang | Four newly authored golden-ring cels, common pivot and common downscale. No per-cel fit or enlarged first frame; no clipped neighboring ring arcs. |
| Độc Vụ | Four new same-footprint poison-pool loop cels; bubbles/smoke change. Footprint export192px wide, displayed0.9×, under actors. |
| Cáp Mô | New native-sized810px outer rim plus retained four-frame center impact and native poison fragments moving outward. The outer rim is **one new cel** fading in/out; it is not claimed as a new four-cel explosion. |
| Nhất Dương Chỉ | Native8×20 retained raster shaft fragments tile into a long ray; no stretching an8px cel to2000px. Warning uses retained raster segments. |
| Bạch Cốt Trảo | Retained `claw_left` / `claw_right`; two opposing paths in front of Mai, four selected facings. |
| Nam Đế palm | Restores retained `palm_trail` from the original approved-preview choreography. Production currently selects the ground-impact `palm_shockwave` clip instead. |
| Remaining characters / effects / arena | Original project atlases reused byte-for-byte; source paths/hashes are listed in `manifest.json`. No new hero or environment art. |

Initial cloud/impact attempts are retained in `source/` as **rejected attempts**. The initial cloud touched cell borders; the initial impact contained excessive haze and insufficient native resolution. The replacement sources and export recipes are explicit. Only `export_assets.py` assembles crops/downsamples RGBA; it does not paint substitute art or overwrite approved files.

## Inspected references

Inspected `vo_dang_character_reference.png` (the existing equivalent of absent `vo_dang_art_direction_reference.png`), `in_game_world_reference.png`, `arena_battle_reference.png`, `current_game_2026_10_29_placeholder_anti_reference.png` and `current_codex_dashboard_anti_reference.png`. The latter currently contains the same Võ Đang character sheet, not the named dashboard screenshot; the written viewport rule still governs layout.

Positive criteria: layered chibi silhouettes, fixed elevated perspective, authored raster edges, feet pivots and readable school-colored effects. The rejected game screenshot establishes that simple geometric actor/environment substitutes are unacceptable. This viewer reuses the actual detailed arena and sprites; it does not redesign environment art. Immediate VFX comparisons are the retained Đông Tà V04, Tây Độc feedback03, Nam Đế feedback03 and Bắc Cái V03 assets. Sources remain locked.

## Verification

Re-export only this candidate: `python -X utf8 assets/reviews/wave_boss_feedback_v01/export_assets.py`.

Static check: `python -X utf8 assets/reviews/wave_boss_feedback_v01/verify_assets.py`.

Focused contract cases: `pnpm check:quick tests/wave-boss-vfx-preview.test.ts`.

Final scope: `pnpm check:final --config playwright.wave-vfx-preview.config.ts`.

Actual results and PNGs live in `evidence/`. Browser observations check actual advancing Phaser frames for all eight new ring/pool cels, sample named-skill phases, physical Shift rejection during pull, physical walking away from continued pull, Shift reopening,640×360/zoom1 and1920-display integer scaling. Six models are **local readability witnesses**, not six multiplayer clients. No production gameplay integration is authorized or implied by an automated pass. Director review of this running viewer remains required before the requested runtime changes.

Official APIs consulted against installed Phaser4.2.1: [Image](https://docs.phaser.io/phaser/concepts/gameobjects/image), [Textures](https://docs.phaser.io/phaser/concepts/textures), [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager).

## Final result — 2026-11-03

`pnpm check:final --config playwright.wave-vfx-preview.config.ts` **PASS**,309.85s: project/test/tool typechecks,18workflow checks,685unit/integration cases across70files, production build,20existing asset validators and1real-browser preview case. The additional candidate validator passed30bundles/1521frame references/56protected files. Actual PNGs for claws, pool, ring, beam, toad impact, needles and1920-display dragon were opened and inspected. Per-frame/native-scale records and input hashes are retained in `evidence/verification.json` and `evidence/final-validation.json`.

The first final attempt caught tuple typing errors in the new tests; that failed report remains `evidence/initial-typecheck-failure.json`. A prior browser iteration passed but its shell-wrapped server teardown stalled on Windows; only that owned server was stopped. The final test owns a direct child process, verifies its PID and cleans it up explicitly; the final browser stage completed in19.14s. No production fix was made for either testing issue. The production build retains its existing large-chunk warning. No final art approval, network combat result or server encounter changes are implied.
