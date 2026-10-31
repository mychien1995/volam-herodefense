# M3A — Cái Bang combat and generated skill integration

Implementation scope: ten canonical active skills, both existing normal styles, Tiêu Diêu Công modifiers, supplied cast/VFX assets, authoritative four-slot test loadouts and an optional live VFX preview. No M3B progression/respec UI or other-school combat implementation.

The pre-implementation catalogue/asset audit is in `docs/M3A_SKILL_ASSET_MAP.md`. The repository still recorded M2B when audited, despite the user reporting M2C complete. Existing arena, dungeon, invasion, defeat and late-join systems were reused. Concurrent enemy/other-character art work in the shared checkout was preserved and is not claimed as M3A work.

## Skills and provisional rank-1 tuning

Names/mechanics follow CONTENT_DATA.md. Numbers beyond the two M1 skills are configurable test proposals in `packages/game-data/src/cai-bang.ts`, not director-approved balance. No rank unlocks are inferred from illustrative artwork.

| Canonical skill | Mana / cooldown | Authoritative behavior |
| --- | --- | --- |
| Hỏa Vân Chưởng | 18 / 3s | Three straight, non-homing shots, 18 base damage each, three ticks apart; nearest-enemy position captured once. |
| Cuồng Long Loạn Vũ | 25 / 5s | One projectile, 32 base blast damage in radius58; burn4 per second for three seconds. One explosion event, separate victim hit feedback and persistent burn flecks. |
| Phi Long Tại Thiên | 22 / 6s | Facing-directed piercing fire shockwave, damage36, range240, radius28, knockback64. Each projectile hits each target once. |
| Kháng Long Hữu Hối | 20 / 12s | Self buff for six seconds: crit chance +0.30, critical multiplier +0.75. No invented attack/AoE damage. |
| Hàng Long Hỏa Vũ | 45 / 20s | Facing-directed large piercing wave, damage90, range440, radius48. No invented burn/CC. |
| Hoành Tảo Bổng | 18 / 5s | Wide staff sweep, damage40, range85, movement slow40% for three seconds. |
| Phá Giáp Bổng | 20 / 6s | One heavy frontal target, damage55, range65; defense reduction20 for five seconds. |
| Cầm Long Công | 22 / 8s | Frontal multi-target pull, range160, maximum displacement90; silence and disarm for two seconds. No damage, no stun, movement remains allowed. Terrain limits displacement. |
| Truy Phong Bổng | 24 / 7s | Facing dash140 at speed700, swept hit radius24, damage44 once per target and one-second stun; terrain blocks travel. |
| Thiên Hạ Vô Cẩu | 40 / 18s | Four nearby hits of18 at seven-tick intervals, followed by heavy75 smash at tick28. Radius90, finisher110. Light hits use small feedback; the heavy impact plays only for the finisher. |

The approved Bổng and Chưởng normal-art files are unchanged. Their distinct arc/cleave versus non-homing projectile behavior remains. Tiêu Diêu Công adds configurable per-level damage0.3, crit chance0.002 and crit multiplier0.005 after level1, alongside existing base growth; it spends no points and stores no reset-farmable bonus. Crit chance clamps to [0,1]. These growth values also remain provisional.

## Authority and lifecycle

- `combat.ts` retains one damage/crit/death/assist-reward pipeline. `skills.ts` composes projectiles, frontal effects, buffs, swept dashes and timed multi-hit actions. `status.ts` manages nonstacking status queries, refresh/expiry and collision-respecting displacement. No Phaser/DOM/Colyseus dependency enters game-core.
- Direct skill damage/crit statistics snapshot at cast so one victim granting a level cannot strengthen other victims in the same attack or an already launched shot. RNG rolls and target defense/hit decisions remain server-owned. Projectile impacts carry their authoritative travel heading even when the caster subsequently turns. Existing burn tick behavior is retained.
- Successful hostile control, including the zero-damage Cầm Long pull, records an assist in the existing eligibility window. Kill/assist EXP and gold still divide one fixed enemy pool; control creates no additional rewards.
- Slow, stun, silence, disarm, defense reduction and crit buff have explicit durations. Strongest nonstacking slow/defense/crit values apply; repeating a same-source status refreshes rather than adds. Stun blocks movement/basic/casting; silence and disarm independently block casts/basic attacks. Cầm Long does not stun or stop movement.
- Dash and whirlwind actions reject extra offensive inputs while running. Death, disconnect, zone transfer and loadout changes cancel owned actions, queued shots and travelling projectiles. Self buffs clear on travel/death. Loadout changes preserve hostile control and per-ability cooldowns. Applied enemy burns/debuffs retain their local expiry; an empty dungeon still pauses them, preserving M2A behavior. They do not follow the caster to another zone.
- Protocol6 synchronizes four equipped IDs/cooldowns, cast ability, filtered status state and authoritative effect/pulse events. Existing per-zone StateViews and event filtering are reused. Late joining never rebuilds existing heroes or resets invasion/statue state.

## Supplied art and reusable renderer

Aseprite executable actually ran: version1.3.18.6-x64. `node assets/source/skills/cai-bang/build.mjs` batch-exported the retained editable sources without `--assemble`, reconstructing or generating no artwork. Twenty-one components contain 464 frames and105 tags. Source validation confirms binary alpha, bounds, source/export equality, anchors, no bleed and eight locked baseline files unchanged.

`packages/game-data/src/skill-art.ts` validates the generated metadata and owns stage/alias/status bindings. `skill-vfx.ts` loads named atlas frames, registers animations, applies authored pivots/directional offsets and configurable integer display scale, follows authoritative projectiles/status lifetimes and destroys temporary effects. Character casts use their supplied four-facing components. Accepted cast events retain the short one-shot presentation if a snapshot pose is skipped; death/stun/travel still cancel it. Effects remain in world/camera space below DOM HUD overlays. The existing enemy animation controller remains intact.

Ten hotbar icons are derivatives of supplied VFX frames, not new generated art or concept crops. `scripts/prepare-skill-assets.py` records exact source/frame, integer reduction/enlargement and hash in `icon_provenance.json`. Existing slot-frame artwork is reused. The HUD placement is unchanged; Q/W/E/R values, mana availability, controls and cooldowns are live state.

The supplied Phase B production manifest remains a historical record of export candidates. `assets/exports/skills/cai-bang/runtime_integration_v1.json` records current integration/file hashes and the actual observed runtime frames per component. All 21 components loaded and all 105 tags registered; motion was observed in each component. This does not assert that all 464 frames or all directions/tags were exercised during multiplayer play. Concept approval does not imply production-art/director approval. No new image generation, video or animated recording was performed. Existing recordings are preserved.

## Try all skills on Windows

Restart the server and refresh both clients because the protocol changed from5 to6. From repository root:

```powershell
$env:VOLAM_DEV_SKILLS = '1'
.\start-game.cmd
```

Choose Cái Bang. Open Settings → Võ Học and use the four development selectors, then Apply test loadout. This is an arena-only, rank-1 testing adapter, not M3B progression or a resource reset. Existing Q/W defaults remain until changed; no new level1 unlock rule is silently introduced. The normal attack selector still switches Bổng/Chưởng in the arena. Close menus and use arrows/A/QWER as before.

For the compact optional live preview, open `http://127.0.0.1:5173/?skillPreview=1` (use the actual Vite port if different). Select any skill, Equip Q and use Cast Q or the actual Q key. Arena practice enemies use the same server combat pipeline. Mana, cooldowns, collision and death remain active; no client damage, free resources or teleport controls exist. Both the server flag and a Cái Bang participant are required; production ignores the flag. The normal player flow hides the preview.

After testing, stop with Ctrl+C and clear the flag:

```powershell
Remove-Item Env:VOLAM_DEV_SKILLS -ErrorAction SilentlyContinue
```

## Reproduce asset and gameplay checks

```powershell
pnpm assets:export:skills
pnpm assets:icons:skills
python assets/source/skills/cai-bang/validate.py
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e:skills
node tools/run-playwright.mjs test --config playwright.m3a-regression.config.ts
pnpm test:balance:m3a
```

Normal builds use retained PNG/JSON exports and do not require Aseprite/Python. Exporting editable sources requires Aseprite; regenerating icons uses Python/Pillow. Build preparation rejects missing atlas/PNG/icon files, invalid frame references/bounds/counts or duplicate animation keys. New assets should provide a stable ASCII component ID, PNG + JSON-hash atlas and ordered named animation metadata with duration/repeat, cardinal direction, origin, stage and placement offset. Image dimensions alone are never treated as animation metadata. Optional unprovided status art can use readable live labels/shared hit feedback; required asset failures are explicit.

## Actual verification checkpoint

- Aseprite batch export — 21 components exported, approved baseline hashes unchanged.
- `python assets/source/skills/cai-bang/validate.py` — passed, 464 frames /105 tags /92 source-cell boundary checks, no warnings/bleed.
- `python scripts/verify-assets.py` — passed; the current shared manifest has19 PNG entries /392 frame references, including concurrent art additions. Skill-pack validation is separate above.
- `pnpm typecheck` and `pnpm build` — passed at the latest checkpoint; Vite's existing large-bundle advisory remains.
- `pnpm test` — 134 tests passed in 15 files (final run33.57s), including 26 Cái Bang mechanics/lifecycle cases, two asset-contract cases and three real-SDK skill cases. These cover all ten skills, invalid casts, resource/cooldown spam, control/expiry, snapshots, passive growth, travel/death cleanup, control assists, loadout gates and zone isolation. Five additional enemy-presentation tests in the shared checkout are not claimed as new M3A work.
- `pnpm --filter @volam/game-server exec tsx ../../tools/m3a-balance.ts` — 240 deterministic four-second probes completed: ten skills, both normal styles, levels1/6/15/30 and three seeds. Results: `artifacts/m3a-balance.json`. Each probe casts once and attempts manual A against three stationary immortal defense5 targets. This measures controlled bursts, not optimal sustained play or final difficulty. Other schools, equipment, PvP and bosses were intentionally excluded.
- `node tools/run-playwright.mjs test --config playwright.skills.config.ts` — all five M3A scenarios passed together (3.6min), with two separate Chromium contexts: all-ten animation sweep, shared dungeon/projectile/buff-exit, invasion damage/resource-spam, natural mid-channel death, and staff armor-break/pull/dash/stun/slow/whirlwind/finisher plus confirmed large-wave impacts. No page/console/asset-loading errors were detected by these assertions.
- `node tools/run-playwright.mjs test --config playwright.m3a-regression.config.ts` —16 existing browser scenarios passed (4.5min): shared/private dungeons, fixed camera/movement/occlusion, A/Q/W combat and progression, projectile trajectories, approved animation registry, late joining, school selection, and overlay/input recovery at900×640,1280×720 and1920×1080.
- Screenshot-only evidence lives in `docs/evidence/m3a/`; traces have screenshot streams/video disabled and use task-specific artifact directories. These are real gameplay captures, not generated concepts. Static screenshots are supplemented by live frame-observation JSON and authoritative state assertions.

A final screenshot review exposed an existing zoom-transition defect: Phaser NONE-mode resize retained the previous CSS canvas dimensions when switching from 2× to 1×, leaving empty viewport space. `main.ts` now applies zoom after resizing the base canvas, keeping CSS dimensions and input bounds consistent. The all-ten two-client scenario was rerun and passed with explicit 1280×720 →944×466 →1920×1080 canvas-size assertions (50.7s). All five UI/overlay/input browser scenarios were then rerun and passed (1.1min). `preview-944.png` and `observer-1920.png` are actual gameplay captures. Typecheck, build and `git diff --check` passed after this correction; Git printed line-ending notices, not whitespace errors. Phaser 4.2.1 implementation and the official Scale Manager documentation were consulted: https://docs.phaser.io/phaser/concepts/scale-manager.

Early reruns caught test assumptions about mana regeneration, facing-key release order and short HP windows; checks now use server ticks and precise replicated-state polling. A concurrent viewport school attribute required school-card selectors to be scoped under pregame buttons. Concurrent test runs also removed shared trace files; M3A output is now isolated under `artifacts/playwright-m3a` and `artifacts/playwright-m3a-regression`. SDK tests use their own 2626 port after a concurrent server occupied the testing helper's fixed 2568 port. Existing room-security/dungeon tests also awaited an initial-state event that can already have arrived; they now poll actual replicated membership, fixing a reproduced timeout without weakening security assertions. Those interrupted/failing runs are not counted as passes.

Level-1 four-second probe DPS ranges (both normal styles and three seeds, one skill cast plus A attempts): Hỏa Vân49.5–63.25; Cuồng Long70.75–82.5; Phi Long23.75–58; Kháng Long49.75–72; Hàng Long101.25–115; Hoành Tảo65.25–80.5; Phá Giáp51.5–68.75; Cầm Long36.75–99.25; Truy Phong21–57.75; Thiên Hạ135.25–150.25. These include basic attacks, not skill-only damage. Cầm Long itself deals zero damage; pulling targets into melee range changes later A hits. Dash/knockback can move actors out of reach. Whirlwind has the largest close-range burst in this fixture; duration, mana and cooldown prevent treating these burst numbers as sustained DPS. Immortal targets yield no economy or survival measurement. Full campaign, boss-resistance, PvP and six-player performance balance remain unmeasured here.

## Changed implementation files

- Core: `packages/game-core/src/{combat,skills,status,types,simulation,dungeons,index}.ts`.
- Data/protocol/server: `packages/game-data/src/{cai-bang,skill-art,m1,index}.ts`, `packages/game-protocol/src/index.ts`, `apps/game-server/src/{app.config,rooms/MatchRoom}.ts`.
- Client: `apps/game-client/src/{skill-vfx,skill-preview,facing,art,arena-scene,main,ui,menus}.ts`, `skill-preview.css` and `arena-hud.css`. Shared enemy/other-school art edits in those files were retained.
- Assets/build: retained `assets/source/skills/cai-bang/` editable sources; `assets/exports/skills/cai-bang/` PNG/atlas/animation metadata, icons/provenance and runtime record; `scripts/prepare-assets.mjs`, `scripts/prepare-skill-assets.py`, package scripts and ignored generated metadata entry.
- Verification: `tests/{cai-bang-skills,skill-assets,skill-room}.test.ts`, `tests/e2e/{skills.spec,skills-setup}.ts`, `playwright.{skills,m3a-regression}.config.ts`, default Playwright exclusion, `tools/m3a-balance.ts`; initial-state polling corrections in room/dungeon-room tests and school-card selector scoping in existing pregame/late-join tests.
- Records: this report, skill/asset mapping, ROADMAP, DECISIONS, ACCEPTANCE_TESTS, TECHNICAL_ARCHITECTURE, ART_ASSET_GUIDE, source README and screenshot/frame/probe evidence. Pre-existing dirty or concurrent artwork changes are not claimed as M3A deliverables.

## Remaining limits and approval

- No rank/unlock/respec UI, other-school combat, boss dungeons, crafting, PvP or production20-wave content. M3B has not started.
- All ten generated cast/VFX components exist. No ambiguous skill assignment was found. Standalone icons were missing and have been derived from existing art with provenance.
- The skill pack does not replace the existing legacy hero hurt/death fallback artwork. It also does not replace dungeon enemy/environment placeholders. Do not describe the entire game or all character states as finished/approved.
- Production animation candidates await director visual approval at normal gameplay zoom. Numerical tuning and the 240 seeded probes are not a balance approval. Existing assets intentionally reuse approved hero poses; no separately drawn missing frames are claimed.

Changed files are grouped by purpose above: core `combat/skills/status/types/simulation/dungeons`, data `cai-bang/m1/skill-art`, protocol, MatchRoom/health, art/arena/VFX/HUD/preview clients, asset build/icon scripts, three unit/SDK test files, isolated Playwright setup/spec/config, scoped existing selection helpers, probe/package scripts and M3A documentation/evidence. Existing concurrent art work was retained.

## M3B compatibility note — 2026-10-31

Normal rooms now use real point-validated progression; no development flag is needed. The historical arbitrary-rank1 M3A sandbox requires both VOLAM_DEV_LEGACY_SKILLS=1 and VOLAM_DEV_SKILLS=1 outside production. Dedicated M3A test setup enables them explicitly. Production ignores both. The original verification results above remain historical; see docs/M3B_IMPLEMENTATION.md for the current build experience.
