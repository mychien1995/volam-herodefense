# Skill revise — sprite/VFX/animation production

Latest authority (2026-11-23): director accepted the corrected sweep as “Tạm ổn”, requested full game integration, and selected the crescent projectile. The earlier production-only restrictions describe that earlier phase. See [runtime integration](SKILL_REVISE_INTEGRATION_2026_11_23.md); final in-game feel remains for director testing.

2026-11-22, branch `wip/m3d/skill-revise`. Continue existing M3D baseline.

Director approved Thiền Sư v03 and explicitly replied **“Duyệt các artwork còn lại, làm toàn bộ”** to the scope question. Ten selected concept boards are pinned by [approval lock](../assets/approvals/skill-revise/concepts-2026-11-22.json). Selection: v01 01/02/03/04/06/08/09/10, v02 07 star formation, v03 05 medium-long hammer. Old 05/07 versions remain superseded. Q/E concept 06 retains only its effect design; all Thiền Sư body/hammer production follows v03.

Authorization is to produce all requested sprite/VFX/animation assets. Concept approval is not final motion, alpha, integration or gameplay approval. Do not change combat, tune numeric values, replace normal runtime loaders or invent successful gameplay tests in this production step.

## Pipeline and deliverables

- Use original raster generation and the existing PNG/Aseprite export/registration pipeline; no video evidence or conversion. Retain exact prompts, raw PNGs, failed takes and source hashes. No procedural replacement art.
- Begin with one Thiền Sư directional slice at native gameplay density; inspect physical body/weapon/feet/alpha and live Phaser frame playback before bulk expansion.
- New authored body groups: Thiền Sư complete weapon-consistent state set; Hỏa Long palm/dash/recover; Phong Quyển retreat/gather and fan release; Cơ Quan airborne throw/dash states. Reuse retained bodies where existing cast poses satisfy the approved action.
- New raster VFX: fire dragon/trail/end burst; gathering wind/forward gust; broad sound wave/target ink impact; falling swords/impacts; electrical parry/return bolt; airborne feathers/ice bomb/ice blast/laser/ground beam. Reuse retained five-sword/Q explosion and existing status effects where applicable.
- Four revised icons are extracted from the approved icon board, not regenerated.
- Other requested changes (auto-focus, rank scaling, charge counter, stop/recall fan controls, stealth, confinement, mana steal, caps, ally buffs) need later authoritative implementation. Asset reuse/choreography plan records each instead of claiming a newly generated raster is necessary.
- Export versioned transparent PNG + atlas JSON, editable `.aseprite` where supported, phase/timing/pivot/facing manifest, source/contact PNGs and isolated playable review. Preserve approved source bytes.
- Preview timing is an authoring proposal; integration must map to actual server clocks, not derive hits from animation. Validate motion in live Phaser and leave multiplayer/authority acceptance for integration.

Full gameplay requirements remain in [canonical task specification](SKILL_REVISE_2026_11_22.md). Production status and evidence will be appended as measured.

## Batch1 produced

-[Phaser review and usage](../assets/reviews/skill-revise-v01/README.md):20banks /872atlas cels /251clips. Review timing is provisional.
-Thiền Sư:496cels /8directions =256effective authored normal cels +240explicit Chaos density derivatives. Four-phase A animations, locomotion, reactions and support pose library; `support`/`chaos_support` groups show independent parry/cast/throw/catch states, not a continuous action.89px source body target, renderer0.5, fixed512×448 logical canvas /foot256,320. Packed4095×1913=29.88MiB. Static frame/facing/body density validators PASS after retained scoped failures/repairs.
-Other19banks:376cels;6body banks,12FX banks,4icon crops.20rear-view cels are explicit horizontal reflections; no claim they are independently drawn facings. Cơ Quan state library is distinct from its separately authored Q/E sequences.
-All20banks have actual `.aseprite` sources; native roundtrip alpha/visible RGB checks PASS for496+376frames. [Component native proof](../assets/source/skill-revise-v01/native-validation.json), [Thiền Sư native proof](../assets/source/skill-revise-thien-su-v01/native-validation.json).
-[Asset audit](../assets/source/skill-revise-v01/audit.json) verifies PNG/atlas/frame coverage, native hashes,10approved concept hashes and linked retained sources. [Raw hashes](../assets/source/skill-revise-v01/source-hashes.json), [source jobs/prompts](../assets/source/skill-revise-v01/jobs.json), [extra Q/E jobs](../assets/source/skill-revise-v01/jobs-extra.json).
-Only source warning: `EXTRA_SOURCE_ROWS_RETAINED`, sonic-wave value9/expected8, unused zero-based row8. First8direction rows exported; original raw retained. No `SOURCE_CELL_EDGE_ALPHA` warning in exported banks.
-Phaser pilot passed actual62rendered frames/17clips for down_right at normal scale before bulk. First observation failure omitted one-shot first-frame events; corrected by observing `postrender`, not weakening expected frame count. Full final playback is separately reported when complete.
-[Reuse/composition plan](../assets/source/skill-revise-v01/reuse-and-integration-plan.json) covers all12requested branches and separates new art, retained art, server/state-machine work and cleanup. No combat/rank/status/targeting implementation or normal-game loader replacement has been performed.

## Verification scope

PNG/native checks and the isolated Phaser gallery do not establish natural combat, multiplayer synchronization, hitboxes, server authority or final director animation approval. Eight directions and component frames exist; sockets, precise server phase mapping and combined skill choreography still need the integration-stage review. In particular new Cơ Quan bodies include wings and must not be layered over the retained wing overlay; thrown-hammer rendering must be matched to the approved new hammer at integration.

Final command: `pnpm check:final tests/e2e/skill-revise-assets.spec.ts`. Record its actual completion and any scoped retry below; do not infer a PASS from the older pilot or native checks.

## Final verification result

`check:final` was invoked once. Preflight8checks, asset preparation, TypeScript compile and test/tool typecheck PASS. Workflow stage had69/70checks pass, then Windows `EPERM` removing the temporary compiler-owner fixture in `qa-compiler-watch.test.mjs`. Retained initial report/log at `.cache/check-workflow/9f22fc19-f2ba-4447-bf0e-5710d74d5b15/4-workflow-regression-checks.log`; no art or test thresholds changed to bypass it.

Scoped continuation after the prior native child exited:

- `node --test scripts/tests/qa-compiler-watch.test.mjs`:2/2PASS, including the failed owner-loss cleanup case.
- `pnpm exec vitest run`:1237testsPASS;282.21seconds. [Unit log](evidence/skill-revise-production/unit.log).
- `pnpm --filter @volam/game-client exec vite build`:PASS. [Build log](evidence/skill-revise-production/build.log).
- `pnpm verify:assets`:all34canonical asset validatorsPASS. [Asset log](evidence/skill-revise-production/asset-validators.log).
- `node tools/run-playwright.mjs test tests/e2e/skill-revise-assets.spec.ts`:1/1PASS,2.7minutes total. Live isolated Phaser observed20banks /251clips /872frames, checked one-shot completions and pivot/scale stability, errors[]. [Browser log](evidence/skill-revise-production/browser.log), [measured playback](evidence/skill-revise-production/playback.json), [normal-scale PNG](evidence/skill-revise-production/phaser-native.png).

These are completed scoped stages after a retained initial pipeline failure; the original `check:final` invocation itself remains FAIL, not relabeled PASS. No passing full suite was repeated for documentation or approval metadata. New sprite/VFX animation remains candidate for director review; normal-game integration is still pending.

## End-to-end motion review — 2026-11-23

The director requested complete moving actions for Côn Luân normal attacks and the new skills. The root [local review](http://127.0.0.1:5608/) now composes body, movement, staged targets, projectiles, contact/impact and recovery on a single authoring clock. The prior [component gallery](http://127.0.0.1:5608/components) remains available.

Eighteen selections cover Thiền Sư's four-hit hammer chain plus each strike individually, Kiếm Tôn's retained A sequence, Hỏa Long Xuyên Sơn, Phong Quyển Tàn Vân, Huyền Âm Chưởng, Thất Tinh Kiếm, Ngũ Lôi passive reaction, Lôi Đình Chấn Vực, Thần Long Cửu Hiện, airborne Cơ Quan A/Q/E, three-stage Bạo Vũ and eight-direction Nhiếp Hồn. Controls include eight facings, pause/replay, timeline scrub, 1×/0.5×/0.25× playback, zoom, repeat and play-all.

[Composition source](../assets/reviews/skill-revise-v01/choreography.js) records proposed phase timings and contacts. [Retained source list](../assets/reviews/skill-revise-v01/retained.json) identifies reused bodies and effects. Hammer trails retain four cardinal facings even when the body uses eight. Bạo Vũ uses the existing fanless throw pose while its fan is away. Cơ Quan state-library poses are held poses; Q/E use the separate authored sequences. No extra raster frames or final-art approvals are implied by the composition.

Five planted sword tips are registered to measured vertices of the actual pentagram raster, with five simultaneous end impacts. Fire dash passes all staged targets before its end burst; wind retreat gathers before releasing the gust; ink impact is target-centered; seven swords fall in a tight stagger without a warning ring; the laser follows the airborne dash. These are visual staging rules, not server-acknowledged combat outcomes. Target positions, bomb offsets, preview cadence and trigger probability are illustrative. Hit detection, CC, resources, random selection and multiplayer acceptance remain pending authoritative integration.

[Browser verifier](../tools/verify-skill-revise-end-to-end.mjs) observes post-render frames/events, full-chain completion, eight-direction hammer playback, pause/seek and cancellation cleanup. [Evidence](evidence/skill-revise-end-to-end/playback.json) and lightweight PNGs document the isolated review; no video or GIF was created. New motion remains candidate for director review.

Final verification for this composition change: `pnpm check:final tests/e2e/skill-revise-end-to-end.spec.ts` **PASS**, 519.87 seconds. Compilation, tools/test typecheck, workflow regressions, all 1,237 unit/integration tests across 126 files, production build, all 34 canonical asset validators and the scoped browser test passed in this invocation. [Full stage timings/logs](evidence/skill-revise-end-to-end/final/check-workflow/final-timings.json). This is separate from the earlier component-production invocation and its retained failure history above.

The browser measured 18 selections, 25 continuous takes (including the hammer chain in every facing), 144 directional compositions resolving real atlas frames, errors `[]`, stable pause/seek and clean action cancellation. Its assertions cover four ordered hammer contacts, seven staggered sword impacts, five simultaneous formation impacts, three cone feathers/ice bombs, eight post-dash darts, end-of-dash fire impact, retreat-before-gust and target-centered ink. [Sword socket alignment PNG](evidence/skill-revise-end-to-end/five-swords-alignment.png), [laser alignment PNG](evidence/skill-revise-end-to-end/air-laser-alignment.png). Scope remains isolated motion review; this PASS does not approve the art or claim game integration.

## Director corrections — v02, 2026-11-23

The subsequent director review rejected the hammer's size/grips/sweep/slam presentation and requested faster/wider wind gathering with two wind projectile options, five random target-centered ink spots, retained gameplay feathers ×3 and half-size flying bombs. Kiếm Tôn A is outside the rework; Lôi Đình Chấn Vực only changes its name, preserving existing animation. [Canonical corrections](SKILL_REVISE_2026_11_22.md), [scoped motion decisions and accepted-raster hashes](../assets/approvals/skill-revise/motion-review-2026-11-23.json).

[Versioned v02 source/prompt/native pipeline](../assets/source/skill-revise-feedback-v02/README.md) adds 256 effective cels: 192 hammer attack cels (six per strike/facing) and two 32-cel wind alternatives. V01 art and all approved concept bytes remain intact; native sources are separate. Idle remains retained; corrected actions use a common anatomical scale per directional source rather than a transient runtime scale. Back-right facing and down-left attack direction/source clipping required explicit generated repairs, retained alongside the first takes.

The root review now has 17 selections. Wave/crescent share the same revised two-beat staging. Ink splats change positions each cast; preview seeds are local authoring values, not server outcomes. Feathers use the actual current `vfx:feather` and scale 0.55, copied unchanged by the normal asset preparation path; bomb bodies use 0.175 instead of 0.35 while blast size is unchanged. Fire dash, seven swords, airborne laser, fan and eight darts retain their accepted composition. [Current rendered observations](evidence/skill-revise-feedback-v02/playback.json). These corrections remain pending director review and authoritative integration.

V02 verification: `pnpm check:final tests/e2e/skill-revise-end-to-end.spec.ts` **PASS**, 626.48 seconds. [Complete current timings/logs](evidence/skill-revise-feedback-v02/final/check-workflow/final-timings.json). All compilation/workflow checks, 1,237 unit/integration tests, production build, 34 asset validators and the scoped browser test passed in this invocation. Native pixel validation passed for all 256 new cels. Phaser observed 17 selections/24 continuous takes, all 24 A poses in each of eight directions, and resolved 136 directional compositions; errors `[]`. Assertions additionally check five distinct changing ink spots, current feather frame/scale ×3, precisely half-size bomb bodies, revised gather timing and effect cleanup. [Wave option PNG](evidence/skill-revise-feedback-v02/wind-retreat.png), [crescent option PNG](evidence/skill-revise-feedback-v02/wind-crescent.png). These runtime stills supplement actual frame/event observations and do not replace motion approval.

## Sweep-only v03 correction

Director clarified the two-handed horizontal right-to-left arc. [Separate source/prompt/native bundle](../assets/source/skill-revise-sweep-v03/README.md) adds 48 authored sweep cels across eight directions. The front slice was rendered beside retained idle at native scale before expansion. A compact expansion was rejected; seven individual facing sheets replace it. Only sweep presentation changes; all v01/v02 export bytes are hash-checked and retained. [Open front sweep at 0.5×](http://127.0.0.1:5608/?action=monk-sweep&direction=down&speed=0.5).

`pnpm check:final tests/e2e/skill-revise-end-to-end.spec.ts` PASS in 427.83 seconds: compile/type/workflow checks, 1,237 tests, production build, 34 asset validators and browser. [Current timings](evidence/skill-revise-sweep-v03/final/check-workflow/final-timings.json), [post-render observations](evidence/skill-revise-sweep-v03/playback.json), [motion-phase PNG](evidence/skill-revise-sweep-v03/monk-sweep.png). The new bank passed native alpha/visible-RGB roundtrip; 24 continuous takes cover 17 selections and all eight combo facings. Motion remains candidate pending director review; combat/game integration is outside this correction.
