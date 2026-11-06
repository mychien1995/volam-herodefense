# Skill review and directional VFX correction — 2026-11-06

Scope: user-requested visual corrections and a development-only skill review room. Normal combat definitions, ranks, damage, targeting, origin offsets and clocks remain unchanged. Artwork is integrated prototype artwork for director review, not a newly approved baseline.

## Skill review room

`NODE_ENV != production`, `VOLAM_DEV_LEGACY_SKILLS=1` **and** `VOLAM_DEV_SKILLS=1` must all hold on the server. Initial and late-joining heroes receive level 30, all own-school skills at their defined maximum ranks, full HP/mana, and four active slots. Mana and skill cooldowns refresh after each simulation step and before commands. Action/channel locks, stun/silence, input sequence checks, server-authoritative hits and the basic attack cadence remain active. The preview controls can select either weapon branch and equip any learned own-school skill into Q. These powers cannot be enabled with a client query parameter.

## Visual changes

- Liệt Phong Đao: readable physical dao above the head, then independent cracked-earth eruption and frontal slash on the real strike pulse.
- Bách Liệt Thiên Kích: alternating discrete frontal slashes on each of ten real sweep pulses and one larger finisher.
- Lưỡng Nghi Thủ: circular black/white yin-yang projectile, fitted uniformly and aimed along the server projectile velocity.
- Thất Tinh Kiếm: stronger blue/white slashes with seven small star accents; the existing four authoritative strikes remain four strikes.
- La Hán Quyền: horizontally reflected left-facing fist, keeping the fist upright. Right-facing source stays byte-identical.
- Vi Đà Quyền: earth erupts upwards at the retained 189-world-pixel forward origin. All four cels share a ground anchor, within one alpha pixel after resampling.
- Tru Tà: larger upright semicircular cutting edge, facing outward in either horizontal direction.
- Như Lai Thiên Diệp: actual server volleys render curved golden dao energy. The retained 15-second Buddha/defense presentation and straight projectile mechanics remain.

The root export defects were the broad `impact/outro/ending` upright classification (which left some directional cels facing right), 180-degree rotation of left-facing fists, and fitting new artwork into legacy nonuniform bounding boxes. V4 keeps new motifs at native density and uniform scale. It replaces 740 left cels across 57 school/helper atlases with horizontal reflections of their corresponding right cels, including mirrored logical trim placement. Duration, frame names, logical dimensions and unrelated raster bytes are audited. New native effects are separate from the retained native actor bodies; the old animator still owns cast phases. Existing v1/v2/v3 files stay intact. `renovationSkills=v3` remains available for direct comparison with the pre-correction version.

## Reproduction and verification

`docs/evidence/renovation-v4/before-directions.json` and the `before-*.png` files reproduce the La Hán/Tru Tà defect using real Q casts in the v3 renderer. `runtime.json` records the current cast frames, selected sources, runtime flips/rotation, positions, pulses and six-client agreement when run by the final profile. Server fixtures are explicitly labelled: level/rank setup and durable stationary targets. Keyboard casts and their hit/pulse events are real; this is not a natural campaign progression test.

The direction oracle checks native effects against their captured facing or server velocity, plus identified frontal legacy effects. Omnidirectional spins and returning effects must retain their own cast direction when the hero turns; fixture transitions wait for prior transients to finish. Read-only raster audits prove actual mirrored pixel equality rather than merely trusting a `_left` frame name. PNGs are at normal gameplay zoom. No recording or screenshot-playback trace is produced.

Commands: `node scripts/export-renovation-v4.mjs`; `python scripts/verify-renovation-v4.py`; focused SDK coverage `pnpm exec vitest run tests/skill-review-mode.test.ts`; final profile `pnpm check:final --config playwright.renovation-v4.config.ts`. Consult the final workflow report and runtime report for actually completed results.

Original AI-generated VFX, edit prompts, editable Aseprite files and SHA-256 provenance are retained in `assets/source/renovation-v4/`. The first Bách Liệt source included an unwanted actor and is retained only for provenance; the export uses the corrected isolated VFX source.

## Completed verification

Final PASS: 754 unit/integration tests in 81 files; 18 workflow checks; production build and all asset validators; 102 real keyboard cast cases (43 skills left/right, with all four facings for the eight revised skills); six clients with 18 replicated hit events and identical damage. `docs/evidence/sessions/renovation-v4-final-2/check-workflow/final-timings.json` records the 414.54-second final run. `runtime.json` records cast frames/geometry and party agreement. `test-mode-ui.json` separately records a real server-granted level30/max-rank hero and two consecutive casts with zero cooldown and full mana.

The first final run found two old room-test assumptions about review cooldowns and the dungeon rejection message. Ordinary resource/cooldown coverage now runs outside review mode; test loadout changes still reject dungeon use explicitly. Focused affected room tests passed before the successful final run. Earlier art-test fixtures also overlapped returning effects and placed the upward Như Lai target behind the statue pedestal. Corrected fixtures let prior effects settle and use an unobstructed position; gameplay collision was retained. Earlier failure reports are historical evidence, not the current result.

The final QA bundle targets its owned server on 2950. A separate endpoint-only production build restores the normal play link on client5546/server2946. The development skill-review link remains client5547/server2947. Both use the same current assets/runtime; create a fresh room after restart. No final director approval is implied by passing these checks.
