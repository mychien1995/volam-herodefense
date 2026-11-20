# Boss sprite coherence rollout — 2026-11-20

**Current approval: APPROVED by the user on2026-11-20**, with instruction to merge into `milestone/m3d`. The reviewed art/runtime is commit54ede68b; [approval and44 SHA-256 snapshots](../assets/approvals/boss-coherence/v1.json). Candidate wording below and in original production reports is historical, recorded before this approval. The earlier commit-only/no-merge restriction is superseded by this explicit merge request.

User authorized staged renovation of bosses on `wip/m3d/25d`. Current result: **9 main bosses /11 body identities integrated as candidates**. Gameplay, server/core/protocol, hitboxes, skill/phase clocks, HUD, controls and F8 are unchanged. No merge/push. No recording.

## Delivered scope

| Batch | Main boss identities | Native frames | State |
| --- | --- | ---: | --- |
|1|Đông Tà|224|8-facing candidate; committed70055138|
|2|Tây Độc, Cáp Mô, Nam Đế, Bắc Cái|960|8-facing candidates; native/2-client/6-client checks complete|
|3|Vương Trùng Dương phase1/phase2|448|8-facing candidates; transition/death and native phase presentation complete|
|4|Chu Bá Thông, Hoàn Nhan Hồng Liệt|448|8-facing candidates; spin afterimages and detached cannon body release corrected|
|5|Kim Luân Pháp Vương, Lý Mạc Sầu|448|8-facing candidates; ring-away bodies and native Cổ Mộ action clips/clock corrected|

Total2528 packed native frames /456 animation tags. Unique authored drawings2472:11×224 directional library cels plus8 SOUTH-only Bắc Cái rest cels. Bắc Cái rest cels are deliberately shared across directional export groups (288 packed frames,232 unique drawings); runtime forces native south rest. Do not describe all2528 as unique drawings.

Idle/walk use actual four-cel cycles; locomotion/reactions have8facings. Action directions preserve the original cardinal choreography. Fixed anatomical density, foot pivots and renderer scale0.5; no per-action resizing or alpha-fade breathing. Larger logical canvases for long weapons do not enlarge the body. Idle face/skull/boot landmarks were checked independently from animated hair/plumes.

Source siblings: `assets/source/boss-*-unified-v1/` with editable Aseprite, raw libraries, exact generation receipts/prompts/references, registration profiles and rejected takes. Export siblings: `assets/exports/boss-*-unified-v1/`. Existing `assets:prepare` copies these exports normally; no special production endpoint. Asset/provenance index: [inventory](BOSS_COHERENCE_INVENTORY.json).

**Retained:** existing skill VFX rasters, their timing/owners/positions/lifecycle, environment and HUD artwork. This is a body/choreography renovation, not a redraw of every skill effect. Mai Siêu Phong, Hoàng Dung, Hoắc Đô, Đạt Nhĩ Ba and regular summons/minions retain their existing art. F8 retains its existing local world-depth comparison; `?debug=1&bossCoherence=0` selects the legacy boss body baseline separately.

## Corrected presentation paths

- Đông Tà corpse now routes through the canonical atlas until native cleanup.
- Tây Độc releases the staff before the native Cáp Mô transition; the transformed identity survives death.
- Nam Đế sustained finger beam holds its pointing pose while active. Bắc Cái vortex loops authored poses; all eight native doubles share the new identity/facing/fade. Drink/sleep use real dedicated cels and their own elapsed clock.
- Vương retains separate robed/jian and bare-torso forms. East sword source corrected from a curved saber to a straight jian; rejected take retained. Native QTE/read/hold effects stay with their owners.
- Chu spin and its native afterimages use the same four-pose cycle. Idle-phase basic palm follows the replicated projectile. Phase elapsed must not be reused as elapsed death time; death now starts at cel0.
- Hồng Liệt detached artillery clears its native cast ID immediately on release; keep ten ticks of body contact/recovery from the existing activeAt, without firing another effect or changing damage.
- Lý Mạc Sầu native `needle_cast`, `palm_channel`, `fast_sweep`, `summon_cast` names normalize to action states. Existing replicated castTicks supplies release timing; no schema/server change. Peer checks now require the expected contact/hold pose, preventing an idle loop from passing as a skill.

## Actual validation and limits

All browser stages use real room entry/school selection and actual Phaser rendering. Fixtures provide **server-owned spawn, earlier-boss/phase, legal build, HP, schedule and placement prerequisites**. Native encounter begin/AI/release and peer state/body observations remain real. Defeats/transitions use server-acknowledged arrow facing and manual A; hit/death results are not injected. These are presentation checks, not natural campaign progression, successful QTE, loot or combat-balance acceptance.

| Check | Retained evidence / result |
| --- | --- |
|11 full source/alpha/native roundtrip + protected hero byte locks|[asset-validation.json](evidence/sessions/boss-all-delivery/asset-validation.json) PASS;2528native frames|
|Focused client policy|`pnpm exec vitest run tests/boss-unified-policy.test.ts` —8cases PASS|
|Types/build|client and tools TypeScript PASS; scoped Vite build PASS; normal chunk-size notices only|
|Đông Tà2/6client six native cast releases + idle/walk/facing/F8|`boss-dong-lifecycle`, `boss-dong-party`, `boss-dong-final-facings` PASS|
|Batch2 all28 native cast releases,8doubles, drink/sleep, F8|`boss-batch2-full-iteration`2clients; `boss-batch2-party-final`6clients PASS|
|Remaining native phases/skills|`boss-remaining-full-iteration`2clients PASS47cases; later Ly/Hong contact defects found by frame audit and corrected|
|Vương1/2 and Chu six-client complete cases|24cases complete in original mixed `boss-remaining-party-final` run; [scoped contact summary](evidence/sessions/boss-all-delivery/vuong-chu-six-client-contact.json) rechecks every peer's expected native contact/hold frame and fixed scale/family|
|Hồng/Kim/Lý final contact assertions|`boss-contact-iteration`2clients and `boss-contact-party-final`6clients PASS23cases, with expected contact/hold on every peer|
|Tây Độc transition / Cáp Mô, Nam, Bắc death|`boss-batch2-lifecycle` completed first transition; `boss-batch2-lifecycle-phase` remaining3cases PASS|
|Chu/Hồng death|`boss-remaining-lifecycle-clock` first2cases complete before later Kim fixture spacing failure|
|Kim/Lý death and Vương transition|`boss-remaining-lifecycle-spacing` first3cases complete before Vương final director prerequisite failure|
|Vương final native death/corpse|`boss-vuong-final-lifecycle` PASS; normal director receives prior4boss/Kim-clear prerequisites and resolves defeat itself|

PNG evidence is supplemented by RAF frame observations, canonical texture/fixed-scale assertions, real server releases and peer replication. Counter/notes cover their native guard/read stages; no claim of successful full QTE. Ordinary hurt/stun selection is policy/source checked; boss CC immunities were not bypassed to manufacture gameplay acceptance.

Retain original FAIL/RUNNING reports without relabelling them: initial Dong event assumption/partial-facing pilots; batch2 barrage/dash probe semantics; Nam bald landmark and idle bobbing source retries; Kim unsettled capture and moving-target spacing; Chu phase-clock death skip; Vương missing earlier-boss prerequisites; mixed6-client Hong transient cast ACK missed. The latter now accepts a replicated native effect as ACK and arms frame observers before begin. Source/body fixes rebuild their dependencies; fixture-only retries use the unchanged relevant bundle. No full suite/check:final or video/GIF/trace recording was run.

## PNG review and playable fixture

[Đông Tà](evidence/sessions/boss-dong-delivery/dong-ta-before-after.png) · [Tây/Nam/Bắc](evidence/sessions/boss-all-delivery/batch2-before-after.png) · [Vương/Chu](evidence/sessions/boss-all-delivery/vuong-chu-before-after.png) · [Hồng/Kim/Lý](evidence/sessions/boss-all-delivery/hong-kim-ly-before-after.png).

Comparisons are crops of actual runtime PNGs at1:1; full original viewports remain in their session directories. Different facing/blink/walk moments are labelled, never represented as matched frames. Kim's existing dungeon camera zoom1 is preserved, while the other comparisons use native zoom2. Source crops and paths: `boss-all-delivery/comparisons.json`. Vương shield-cleared prerequisites and Ly placement are matched in final captures.

Local review tools: `node apps/game-server/node_modules/tsx/dist/cli.mjs tools/presentation-boss-play.ts`, then `node tools/open-boss-play.mjs`. Normal lobby/school entry; Cái Bang Chưởng level30/rank4, native boss AI, invulnerable player for art review. HUD/F8 unchanged. Isolated review ports3022/5622 and exact run identity are checked; other sessions are not stopped. Session metadata lives in `.cache/presentation-boss-play-session.json`. Switch only that owned active review room with `node tools/set-boss-review.mjs kim_luan` (other IDs in inventory); after final victory start a new room. This localhost/run-token review endpoint exists only in the external tool, never production Room/client code.

**Approval:** all new boss art remains candidate pending director PNG/play approval. Automatic PASS and earlier hero approvals do not approve new boss artwork.
