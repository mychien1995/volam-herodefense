# Skill revise — sprite/VFX/animation review

Current sweep correction: [Thiền Sư v03, two-hand right-to-left sweep](../../source/skill-revise-sweep-v03/README.md). [Open this action at front view / 0.5×](http://127.0.0.1:5608/?action=monk-sweep&direction=down&speed=0.5). Only the sweep segment changes; the remaining v02 corrections below are retained.

Branch `wip/m3d/skill-revise`. Candidate assets after concept approval, **not final animation/gameplay approval**.

Run from project root:

```powershell
node assets/reviews/skill-revise-v01/serve.mjs
```

Open [end-to-end Phaser review v02](http://127.0.0.1:5608/). Choose a complete action, direction, playback speed and zoom; pause, scrub, replay, loop or use “Phát tất cả”. The default is Thiền Sư's corrected four-hit hammer chain. There are 17 selections, including four individual hammer strikes, both wave/crescent wind options, the newly authored skill bodies/effects and retained-art fan/dart sequences. Kiếm Tôn A and Lôi Đình Chấn Vực are excluded from new motion review per director feedback. Eight facings are available. Body, target staging, projectiles, impacts and cleanup play on one review clock. Preview timing, targets and bomb offsets are illustrative, not authoritative match results.

[Historical v01 component gallery](http://127.0.0.1:5608/components) retains the 20 separate banks/251 clips and baseline comparison, including superseded hammer actions. Both pages use installed Phaser4.2.1 and retained ground/body art. Normal game loaders and combat remain unchanged. See [v02 corrections and exact prompts](../../source/skill-revise-feedback-v02/README.md), [composition timelines](choreography.js), [retained assets](retained.json), and [current rendered motion observations](../../../docs/evidence/skill-revise-feedback-v02/playback.json).

## Historical v01 candidate bundle

- Thiền Sư:8directions,496cels =256authored +240explicit1.34-density Chaos derivatives. Medium-long shaft, larger head, one/two-hand actions. Four-phase thrust/rising/sweep/slam, idle/walk, support and reactions. Old runtime loader is unchanged.
-6new body banks: Hỏa Long, Phong retreat, Phong release, Cơ Quan airborne state library, airborne Q and airborne E. Each has8direction entries; explicitly recorded rear-view horizontal reflections are derivatives, not new authored facings.
-12VFX banks: fire dragon/impact/trail, wind gust/gather, sonic wave/ink impact, sword rain/impact, lightning parry/return bolt, star formation, bomb/ice/feather, laser/contact.
-4icons are crops of the approved board, not regenerated artwork.
-Total20review banks,872atlas cels. Of these240Chaos cels,20rear-view reflections and4icon crops are explicit derivatives; remainder608generated effective body/effect cels. The source includes unused/rejected attempts and repair material, so raw generation count differs from effective exported count.

The four-pose airborne state library is **not** a continuous cast animation. Q/E have separate generated sequences. Preview timings are authoring proposals, not new cooldowns or server-hit clocks. Travel/confinement/charges/stealth/status/rank rules remain pending integration.

## Art/QA limits

See [production document](../../../docs/SKILL_REVISE_ASSET_PRODUCTION.md), [catalogue](catalogue.json), [component validation](../../exports/skill-revise-v01/validation.json), [native roundtrip](../../source/skill-revise-v01/native-validation.json).

One source warning is retained: sonic-wave has9source rows; first8are assigned directions and row8(zero-based) is unused. Raw remains intact; no ninth direction is claimed. Some rear views use explicit reflections listed in manifests; handedness/socket and full server-timed choreography still need integration review.

No recording, video, GIF, game balance, real combat, multiplayer or authority acceptance is claimed here. All new sprite/VFX animation art remains candidate pending director review. Approved concept bytes and baseline source bytes are preserved.
