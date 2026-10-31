# Small gameplay changes — 2026-10-31

Branch: `wip/m3d/small-game-play-change`.

The seven requested changes reuse the existing gameplay, viewport and artwork. No character, tile, icon or concept generation is included. Original checkout's uncommitted forest-art work stays outside this worktree.

## Võ Học rules

Normal players start Default on the school's first basic branch. The menu can switch to the other branch or Custom only while alive in the arena. Every branch starts with its first four regular catalogue skills; Thiếu Lâm Quyền starts La Hán Quyền/Vi Đà Quyền/Đại Lực Kim Cương Chưởng/Toàn Phong Thoái. Exact presets are in packages/game-data/src/default-builds.ts and validated at startup.

Default cycles points Q→W→E→R. Replacement uses the receiving slot's quota rather than the skill's former rank. Existing caps4/3 and rank gates1/3/5/7 or6/10/14 remain, as explicitly confirmed by the user. Gated points wait; capped four-skill builds receive existing recalculated school surplus. Planned rank0 slots appear in the menu but are not equipped/castable until learned. At most one ultimate and no duplicates, cross-branch or foreign-school skills.

Switching to Custom keeps the current learned assignments/ranks. Custom reset/refund, style mixing and independent A work as before. Returning to Default restores its planned branch slots and recalculates from character level. Changing Default branch selects its matching A/preset. No transition heals/refills or resets per-ID cooldown debt.

## Controls and presentation

Space replaces clicking the physical forest/desert door. The client shows a proximity hint; server still validates phase, living membership and range. P toggles Võ Học except while typing/selecting or another modal owns input. Quit is the first button in the existing utility group, opens a confirmation and only sends leave after confirmation. All windows remain in the full game viewport.

Local death applies grayscale to #game only, keeps HUD/countdown readable and blocks gameplay input. Server retains five-second/no-penalty recovery and places the hero at arena base.spawn; normal door exit still uses its separate return marker. Leaving clears the filter.

School cards show element, concise identity and two branch names. The six-player roster and Leave/Confirm actions fit supported desktop sizes without scrolling. Product copy, tooltips, accessibility labels and normal authoritative rejection messages are Vietnamese. Stable IDs and protocol names remain ASCII; familiar host/connected/keys and PvP notation remain.

## Verification

Iteration checks:
- `pnpm install --frozen-lockfile` completed with the locked versions (offline attempt lacked cached metadata).
- Focused progression, dungeon and SDK suites passed after updating historical custom-mode fixtures and localized assertions.
- The new eight-branch Lv1–30 allocation/lifecycle suite plus forest-copy checks passed14 tests.
- Focused Chromium six-player selection passed at944×466,1280×720 and1920×1080 with explicit scroll and action-button bounds checks.
- Real Chromium iteration separately passed automatic learning/custom mixing, both physical doors, local death/respawn and quit confirmation. The first broad run found five historical assertions for the superseded return marker/English messages; these were updated before the next final attempt.

Final verification completed2026-11-01 (Asia/Saigon):
- `pnpm check:final --config playwright.small-gameplay.config.ts` passed project/tool typechecks,8 workflow checks,353/353 unit/integration tests in30 files, production build and all12 asset validators. Its browser stage finished11/12; a test helper measured position before server movement release settled.
- Only browser-test helpers/config were changed afterward: wait for authoritative idle pose, wait for the complete initial roster, and allow15 seconds for initial state/DOM synchronization on the loaded host. Gameplay thresholds, server timers and runtime code were unchanged. `pnpm exec tsc -p tsconfig.tools.json --noEmit` passed afterward.
- Final `node tools/run-playwright.mjs test --config playwright.small-gameplay.config.ts`:12/12 passed in one invocation, without retries. This is the final browser result; it does not retroactively make the earlier pipeline command exit0.
- Earlier transient synchronization timeouts and selector/movement-fixture failures are resolved in the final rerun. The existing large-client-chunk build warning remains.

The final browser scope includes all seven requested behaviors, four-school pregame synchronization/disconnect barriers, all in-viewport menus at1280×720/1920×1080/900×640, six-player school selection at944×466/1280×720/1920×1080, modal focus/held-key release and live two-client simulation. Older standalone art/campaign suites were not rerun; affected legacy manual-build/door selectors were updated and typechecked. Source artwork bytes and approval locks are retained; asset preparation refreshes the existing generated arena manifest hashes for this checkout.

Machine-readable results and PNG hashes: `docs/evidence/small-gameplay/verification-summary.json`. Playwright's complete final results: `docs/evidence/small-gameplay/playwright-results.json`.

Visual PNG review: school cards and both action buttons fit the short screen; the Default menu shows one branch and four slot ranks; Custom exposes manual allocation/mixing; both door hints stay within the world viewport; only the dead local world is grayscale and the respawn message/HUD remain readable; Quit is first and opens an in-viewport confirmation. The map retains its full viewport and existing artwork/placeholder status. Browser fixtures use fresh dedicated ports2667/2668/5207 and a production client build. The fixture-only service can set up XP/position/death to test lifecycle boundaries; it is not part of production server routes. One real keyboard kill checks reward-driven Lv2 and automatic W learning. Door approach, combat controls, input blocking and multiplayer replication use actual Chromium/Phaser and authoritative snapshots. PNGs only; no video or screenshot trace streams.

Reference review: hub/battle/dungeon/menu and character sheets plus both actual anti-reference screenshots inspected. The historical in_game_world_reference.png and vo_dang_art_direction_reference.png aliases are absent, as documented in assets/references/README.md; the retained hub and vo_dang_character_reference.png are used. No new final-art approval is claimed.
