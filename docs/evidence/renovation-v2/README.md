# Renovation v2 — layout correction and two skill branches

Worktree `wip/m3d/visual-upgrade-2`, 2026-11-05. New action/VFX/floor drawings are **CANDIDATE**, pending director visual review. The previously approved v1 idle/walk sources remain pinned and unchanged.

The director requested the original main-arena layout, full Bamboo traversal, fewer dungeon rocks, coherent action bodies and a Võ Đang Kiếm/Thiên Sơn Phiến skill pilot. This delivery corrects layout/navigation and supplies the two requested branches as the action/VFX pilot. Other six weapon branches and boss actions/VFX still retain their previous drawings; they are not represented as renovated by this report. Hurt/death and special transitions remain retained. Shared channel poses are reused deliberately; 1,236 replaced frame references are not 1,236 unique drawings.

## Run and review

- Normal game: http://127.0.0.1:5536/ — fresh room, no QA encounter prerequisites. Build with endpoint2936, then run `VOLAM_QA_SERVER_PORT=2936 VOLAM_QA_CLIENT_PORT=5536 pnpm dev:renovation` (set variables using the shell's syntax).
- Skill review: http://127.0.0.1:5537/?debug=1&skillPreview=1 — `pnpm dev:renovation:skills`. This separate development server enables existing authorized loadout/target commands. It does not alter the normal server.
- Original skill art: append `&renovationSkills=old` to the review URL.
- Side-by-side PNG review: http://127.0.0.1:5537/assets/renovation-v2/review/index.html . Choose Võ Đang/Thiên Sơn before the match. In the preview overlay choose Kiếm/Phiến, choose a skill, Equip Q, then Cast Q. Arrow keys face/move; A basic; Q cast; Nhân Kiếm Q again teleports. Target line supplies practice enemies; Attacking dummy exercises Tọa Sát. Actual mana/cooldowns remain authoritative.

The launcher/control flow was exercised through both schools, changing the basic attack, equipping a pilot skill and casting with the existing button. `review-controls.json` records actual cast observations and no page errors.

## Layout and navigation

The arena has only statue(800,576) and lamps(744,578)/(856,578), each Y-sorted. Its new3200×2304 authored-material floor uses the old1600×1152 world mask: circle center(800,616), radius288, cross roads160wide. No merchant/portal/scenery is invented into the map; existing HUD access remains.

V1 camera1 and enlarged bodies doubled the world FOV/actor scale. V2 retains native canvas pixels but restores desktop camera2 and new locomotion world scale0.5. An88px source body still displays around88px; original action bodies keep world scale1. This preserves the old origin offsets, effect reach and actor footprint. Small views retain camera1. Ground always maps to actual authoritative dimensions; overscan is a dark backdrop, not navigable extra map.

The prior forest invisible river banks, rails and trunks conflicted with the new open floor. The focused real `moveCircle` traversal failed before the fix (`../renovation-runtime/navigation-before.log`) and passes afterward. Regular forest/desert/sea/hell each have two shared solid rock boxes; remaining props sit near edges. Sea and Hell retain outer water/lava boundaries. Cổ Mộ drops obsolete interior plinth collisions; the other boss maps already have perimeter-only collision. The browser checks a real arrow route through Bamboo and Space exit; `skill-comparison.json` records server positions.

## Artwork and placement

- Original generated source: `assets/source/renovation-v2/raw/`, exact prompts in `generation-jobs.json` and `additional-prompts.json`, hashes/references in `provenance.json`.
- Three new four-facing16-pose body sheets plus16 retained reviewed sword-attack poses:64 body keyposes. Eleven four-cel VFX groups:44 source cels. Windup/release/catch, empty-hand sword launch, upright guard, dash and spin postures are separate from effects.
- Aseprite performs alpha-preserving edits, scaling, pivot alignment and atlas packing; Python only measures and validates. Editable body/effect/floor `.aseprite` files remain beside the raw sources. Re-export via `pnpm assets:export:renovation-v2`; scoped override retry accepts `--only=id1,id2`.
-36 packed override atlases, density2, exact legacy names and virtual dimensions. Loader substitution preserves existing animators, origins, phase clocks, sizes, rotations and authoritative emission paths. Toa's guard is a dedicated alias because the original mana aura is also used by Quyền; no shared Quyền redraw is applied.
- `scripts/verify-renovation-v2.py` checks original input hashes, frame identity, density bounds, body/weapon clearance, feet mapping, manifest hashes and floor dimensions. New packed sources total66.58MiB uncompressed RGBA; this excludes retained textures/driver overhead.

The arena reference's small readable actors, continuous silhouettes and bright skill cores guided production. The dated placeholder anti-reference was inspected. Actual screenshots improve those details, but the main arena intentionally remains sparse per the director; the reference's crowd/architecture layout is not copied. Floor material is more textured than the prior pixel tiles. Long channels reuse a held body pose, with animated effects. Quick dash poses can be missed in a static screenshot; live metadata/input observations are required.

## Validation

Focused navigation/assets suite: four files,10tests passed; TypeScript projects passed. Two-client development iteration passed all10skills, Bamboo traversal and all74 identities/eight dungeons. Reports are `iteration.json`, `skill-comparison.json` and `asset-check.json`. Earlier fixture failures are retained as history: blob-source detection, dash interpolation tolerance, missing area-radius lookup and angle-bin aliasing. Production math was not changed to satisfy these assertions.

Final production results are recorded in `final-console.log`, `live-integration.json` and `../sessions/renovation-v2-final/check-workflow/final-timings.json` after the final run. The production profile checks six actual clients, A/Q damage/death/rewards, four authored gait cels/direction, both basic attacks and all10skills in four facings. Server-owned prerequisites supply legal level/loadout/targets and encounter placements; casts/hits/blink/field traversal/projectiles use actual simulation and keyboard commands. Held boss fixtures cover renderer identity, not natural boss defeats or new boss actions. No recordings or screenshot trace streams are generated.

Final coverage **PASS after scoped stage retries**. The single `pnpm check:final --config playwright.renovation-runtime.config.ts` passed preparation, TypeScript and18workflow checks, then stopped on three obsolete collision expectations (743/746 passed). Updated only those test expectations to the requested sparse layout; tools/tests typecheck and the affected four files/14tests passed (`focused-retry.log`). Thus all746tests/79files are covered across the full and affected reruns, not a second full-suite run. Production build passed. Asset validators1–19 passed; the twentieth hit Windows console encoding while printing Vietnamese. Retried it and remaining validators with UTF-8: all24 passed. Logs: `final-stages.log` and `validator-retry.log`. Browser-only production retry passed in6.5minutes (`browser-final.log`): six clients,40skill cases,8basic cases,74identities/eight dungeons; zero page/console/HTTP errors. `verification.json` records this composition without relabeling the failed pipeline report.

All four Tọa Sát facings actually accumulated received damage and dealt a counter hit (14.4,17.1,14.4,19.8 in this seeded fixture); these are observed test outcomes, not tuning changes. Nhân Kiếm recasts moved the server character to its real projectile, Liên Hoa retained its fixed anchor during leave/reentry, and both radial skills exposed eight real velocity headings. Native PNGs were opened and visually inspected, including all ten new skill comparisons and normal arena/forest views. Body/weapon edge clearance passed for every replacement.

PNG pairs are captured concurrently from old/new clients, cropping around the same actor at the same gameplay scale (different camera positions are accounted for). They are not rescaled after capture. Native arena/dungeon screenshots are1366×768. See the review HTML for all10pairs and live controls.
