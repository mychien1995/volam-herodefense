# Sơn Tặc Đao and caster contact bursts — 2026-11-06

Director override: Sơn Tặc Đao (`wave_03`) has only its normal Chém đao attack. Hoành trảm is removed from the canonical profile and consequently from authoritative AI and preview controls. This supersedes the r3 frontal-sector tuning. Normal attack damage/range/cadence are retained.

Live post-render observations on the r4 review service reproduced `metal_contact` and `stone_contact` bodies at melee actors' feet. These were the shared contact raster drawn at the origin of an attack, separate from the purple windup warning removed in r4. The new presentation policy removes these generic origin bursts for melee, forward lines, dashes, guards, counters, buffs and instant self stomps/rings, including normal attacks. Hit feedback belongs at the hit target. Actor attack/cast poses, labels, server geometry, damage, status application and cooldowns remain authoritative and unchanged for the other profiles.

Actual projectiles, persistent fields, requested target-point Thổ Phỉ burst/Tà Tăng drain/Thi độc/water pools, and deliberate self-destruction/death explosions retain their effects. No replacement caster aura or burst is introduced. Approved raster files are untouched. Suppressed body releases remain observable in read-only renderer diagnostics with `suppressed: true` and no rendered frames; this does not add network messages or authorize damage.

Regression scope: real full-tick Sơn Tặc Đao basic attacks over 300 ticks, every melee/defensive profile's presentation policy, retained target/projectile/death effects, two-client normal match, all 49 live preview identities, and the existing six-peer main-game/dungeon profile. The generic sector math tests now use an explicit synthetic fixture rather than granting Sơn Tặc Đao its removed skill. Generic ground-lob tests remain independent of Thi độc.

Before the data change, the Sơn Tặc Đao regression failed on its existing Hoành trảm profile. After the change, `pnpm check:quick tests/creep-feedback-r2.test.ts tests/creep-feedback-r3.test.ts tests/creep-feedback-r4.test.ts tests/creep-feedback-r5.test.ts tests/creep-upgrade.test.ts tests/creep-preview.test.ts` passed **99 tests across six files**, 43.62s total. Tool/test typechecking also passed. Live before-state metadata: [caster contact bursts](evidence/creep-feedback-r5/before-caster-bursts.json).

Final command: `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/creep-upgrade.spec.ts tests/e2e/creep-feedback-r4.spec.ts tests/e2e/creep-preview.spec.ts`, session `creep-feedback-r5-final`, isolated server 2928/client 5528. Executed final results and review identity will be appended after completion. No recordings or new art approval are implied.

Review restarted at **http://127.0.0.1:5627/** / **http://127.0.0.1:5627/?creepPreview=1**, server 3427, protocol 33, run identity `creep-feedback-r5-review-p33-20261106`. Health, HTTP 200 and the currently served renderer policy were verified. Reload and create a new room.

## Final verification

Final **PASS** in **638.15s**, browser **415.68s**: **856 unit/integration tests across 85 files**, 18 workflow checks, both typechecks, production build, 20 asset validators and **three production Phaser browser cases**. The normal-match Thi độc case, all 49 preview identities and the six-peer main-game case all passed. Preview post-render observations reported **zero purple warning circles and zero caster contact bursts**. Sơn Tặc Đao used its normal Chém đao animation and its special control was disabled. Six peers (two browsers plus four SDK clients) covered all 44 regular arena/dungeon identities, private-zone filtering, four-gate streaming and the 120-creep fixture; no client errors.

Inspected the actual target-field, both preview, forest web and arena crowd PNGs. Normal spell/attack poses and actual target effects remain readable in isolated views; dense packs still overlap sprites and health bars. This task does not claim improved difficulty/economy/performance or new art approval.

Evidence: [verification](evidence/creep-feedback-r5/verification.json), [pipeline](evidence/sessions/creep-feedback-r5-final/check-workflow/final-timings.json), [49-profile preview](evidence/creep-feedback-r5/preview/browser.json), [six-peer arena/dungeons](evidence/creep-feedback-r5/arena/browser.json), [normal match](evidence/creep-feedback-r5/normal-match.json), [crowd PNG](evidence/creep-feedback-r5/arena/arena-six-player.png). Historical r3/r4 evidence remains unchanged. Prettier and diff-whitespace checks passed.
