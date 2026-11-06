# Creep windup circles and Thi độc — 2026-11-06

Latest director override applies to all 49 creep profiles (invasion, regular dungeon and boss-support units): the generic purple circle/semicircle is no longer a pre-cast indicator, whether under the caster or at a target point. Existing skill names/character poses still show the windup. Released purple burst and life-drain rings remain real ability effects; this change does not remove those effects or alter their damage windows.

Thi độc now creates a delayed area directly at the target's captured feet. It uses the same 280 cast range, 24-tick windup, 88 radius, 90-tick field duration, 30-tick interval, 0.3 damage coefficient and poison status. It no longer creates a caster-origin projectile or derives the pool from projectile terrain contact. Moving the caster cannot move the field; moving out of the captured point before activation avoids it. Server targeting/line-of-sight still applies. The obsolete death-pool initializer is removed as well.

The main-game regression uses a real invasion-type Cương Thi and a target 240 units away, so the field cannot overlap the caster and be mistaken for a caster-foot effect. Browser prerequisites use the existing QA-only fixture with a fixed legal separated formation, then observe real AI casts, actual HP loss, two-client replication and raster placement. The standalone preview pass observes all 49 profiles and rejects any visible purple warning circle. No production coordinate/damage mutation endpoint is added.

Only validated content and the shared creep renderer change; the core/Room/protocol structure, approved raster bytes, HUD and normal controls remain unchanged. Generic ground-lob mechanics remain tested independently, but Thi độc no longer uses them. Prior r3 evidence is historical. No recordings or new art approval are inferred.

Focused tests: `tests/creep-feedback-r4.test.ts`, retained generic-lob cases in `tests/creep-feedback-r3.test.ts`, `tests/e2e/creep-feedback-r4.spec.ts`, and all 49 preview observations in `tests/e2e/creep-preview.spec.ts`. Final command: `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/creep-feedback-r4.spec.ts tests/e2e/creep-preview.spec.ts`.

Review services restarted at **http://127.0.0.1:5627/** (individual preview: **http://127.0.0.1:5627/?creepPreview=1**), server 3427, protocol 33, run identity `creep-feedback-r4-review-p33-20261106`. Health, client HTTP 200 and served renderer policy were checked. Reload and create a new room.

## Executed verification

Reproduced before the fix: the new Thi độc cases failed 2/3 under projectile delivery. After the change, the focused four-file set passed 88 tests, both TypeScript checks passed, and the normal-match browser iteration passed.

Final **PASS**, session `creep-feedback-r4-final`: full unit/integration stage (84 files, zero failed files in the current Vitest results), workflow regressions, both typechecks, production build, 20 asset validators and both browser cases. Total **514.50s**, browser **279.80s**. All 49 preview profiles were observed with **zero purple warning violations** and zero browser errors. The normal-match case asserted actual target HP loss and two-client replication at (980,740), while its caster remained at (740,740). Opened and inspected all three saved PNGs; the distant-target field uses the retained green poison raster under the target, and the preview windups have no purple circle.

Evidence: [verification](evidence/creep-feedback-r4/verification.json), [pipeline](evidence/sessions/creep-feedback-r4-final/check-workflow/final-timings.json), [normal match](evidence/creep-feedback-r4/normal-match.json), [all-profile preview](evidence/creep-feedback-r4/preview/browser.json), [target-field PNG](evidence/creep-feedback-r4/thi-doc-distant-target.png). Prettier check and diff whitespace check also passed.

Scope is two-client normal gameplay plus all-profile preview. Prior r3 six-peer stress evidence remains historical; this patch adds no raster files or protocol shape and makes no new density/performance, difficulty or art-approval claim. No recordings were made.
