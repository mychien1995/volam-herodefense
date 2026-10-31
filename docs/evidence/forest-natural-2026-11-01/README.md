# Forest roster — natural gameplay verification, 2026-11-01

Worktree branch: `wip/m3d/bamboo`, based on `de1b328`. Source checkout and other chats' services were preserved. The managed worktree is `C:\Users\ADMIN\.codex\worktrees\bamboo\volam-hero-defense`. Run/restart the game from this worktree to use the change; an already-running server from another checkout was not replaced.

The missing authoritative Forest roster is now supplied. Existing client atlases, animation registration, renderer and `creep_strike` bindings are reused. Forest alone continues its roster cursor through actual spawn counts when participant scaling changes wave size. No stats, AI, abilities, damage, status, RNG, loot, controls, camera, map/collision, artwork or approval locks were changed.

## Actual natural spawns and outcomes

| Case | Participants | Wave 1 | Wave 2 | Observed result |
| --- | --- | --- | --- | --- |
| Shared | 2 browser players | 3, first three IDs, 120 HP | 5, next five IDs, 160 HP | Both waves cleared; 480 XP/96 gold synchronized |
| Shared gate | 2 browser players + 4 SDK players | 3, first three IDs, 120 HP | 12, participant snapshot 6, 248 HP | Both waves cleared; 900 XP/180 gold synchronized on both browsers and all four SDKs |
| Private | 2 browser players in separate instances | 3 per instance, first three IDs | Farming instance: 3, last three IDs | Other private remains wave 1, full enemy HP, zero XP/gold and no leaked events; physical exit/re-entry preserves wave 2 |

Ordered IDs: `truc_xa`, `doc_chu`, `son_vien`, `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`.

Shared two-player wave 2: `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`, `truc_xa`, `doc_chu`.

Shared six-player wave 2: `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`, `truc_xa`, `doc_chu`, `son_vien`, repeated once. Private wave 2 contains only the first three IDs of that sequence. Counts follow the existing scaling; six species do not imply six creeps per wave.

These are real MatchRoom/DungeonMatch spawns and combat. Natural setup registers no pose endpoint and disables historical arena practice targets. Browser actions use the existing menus and keys. SDKs choose the normal ranged branch through validated `build-action`, enter/exit through validated dungeon messages and send ordinary movement/A/Q inputs. No entity HP, pose, position, cooldown, RNG, contributor list, damage event or reward is injected. Position comes only from server simulation. The final gate has six network players and **two renderers**, not six renderers.

## Motion, VFX, scale and lifecycle

Both final shared profiles record actual idle/walk/attack/hurt/death frames and one-shot completion. The two-player run observed eight creep death completions per renderer; the six-player run observed fifteen per renderer. Independent same-type instances exist in the 12-creep wave. Pivots `[0.5,106/128]`, scale `[1,1]`, feet depth, approved texture selection and fixed camera are asserted against actual actors. All valid Forest IDs render `forest_<type>`; none uses `creep_outlaw`. Missing/unknown types retain the separate labelled-fallback unit tests.

Across the final natural shared runs, actual authoritative events played all six contact groups: snake bite, spider fang, ape slam, swordsman sword contact, wood contact and bamboo splinter contact; also ape dust and left-facing swordsman/bamboo slashes. Recorded lists are in each `observations.json`. Different RNG/targeting/kill timing can omit a cue in an individual run; artwork is not forced to emit it. No attack frame determines a hit. Unsupported release/projectile/web/root/poison mechanics remain unbound. The 13 unsupported sequences are existing approved artwork, not missing files or implemented abilities.

Natural directions are those chosen by server movement, primarily left attacks with up/down/left walking. This report does not claim that normal combat displayed all 120 clips/four directions in full. Hurt/death can legitimately interrupt attacks. Unchanged authored coverage (384 character frames/120 clips and 112 VFX frames/28 sequences) passed current static validation; historical full-direction approved review remains separate.

Bamboo regression passed real collision, before/after bamboo depth, bridge crossing, full viewport at 1280 and 1920, normal hero scale and physical Space exit. Natural shared tests verify effect completion, clean actor/effect state after leaving, empty pause/re-entry, room leave and fresh `/` URL without any query or debug bridge. Ordinary gameplay needs no art-review flag. All owned test services were shut down after the passing run; services from other chats were not stopped.

## Exact validation commands and results

Commands ran in the Bamboo worktree. PNG-only: Playwright video and trace are off.

| Command | Actual outcome / evidence |
| --- | --- |
| `pnpm install --offline --frozen-lockfile` | Failed: local registry policy metadata missing for `@better-fetch/fetch`. |
| `pnpm install --frozen-lockfile` | PASS, exact locked dependencies installed. No lockfile edit. |
| `pnpm check:quick tests/dungeons.test.ts tests/dungeon-room.test.ts tests/forest-creep-art.test.ts tests/desert-dungeon.test.ts` | Initial preparation stopped at approved Forest JSON hashes, then an M3C3 supplied-JSON hash: checkout line endings. Exact retained byte variants restored after hash/content checks. Next run PASS, 29 tests/4 files, 50.43s including cold preparation. See `focused-timings.json`. |
| `pnpm exec tsc -p tsconfig.tools.json --noEmit` | Early fresh-worktree attempt failed before server dist existed and on an evidence object type; fixed/compiled. Final pipeline tool typecheck PASS. Later test-only SDK helper typing failures are retained in `network-typecheck.log` and `network-typecheck-retry.log`; exact protocol unions/literal typing fixed them. Latest `network-typecheck-final.log`: exit 0. |
| `pnpm check:browser --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts --grep '2 clients\|private Forest'` | 1 PASS private, 1 FAIL shared hero death; `iteration-2.log`. |
| `node tools/run-playwright.mjs test --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts --grep '2 clients'` | First retry failed the driver checking only host HP although a peer received the hit (`iteration-2-retry.log`). Corrected party-wide observation: PASS (`iteration-2-retry-b.log`). |
| `pnpm check:final --config playwright.forest-natural.config.ts` | Preparation, project/tool typechecks, 18 workflow tests, 357 unit/integration tests/30 files, production build and all 12 asset validators PASS. Browser: 5 PASS/1 FAIL. Total 568.05s; `final-check.log` and session `check-workflow/final-timings.json`. **The command exited 1; it was not an all-green invocation.** |
| `node tools/run-playwright.mjs test --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts` | Intermediate six-renderer retries are retained as `browser-retry.log`, `browser-retry-b.log`, `browser-retry-c.log`, `browser-retry-d.log`. Failures: idle input gaps/survival assumptions, lobby join timeout; the final six-renderer attempt also lost a private browser page. These are not claimed as passing six-browser gameplay. |
| `node tools/run-playwright.mjs test --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts --grep '6 clients'` | Six-renderer-only retry failed after host death/observation timing; `six-client-retry.log`. Actual participant scaling was preserved, not forced to 12 after participants died. |
| `node tools/run-playwright.mjs test --config playwright.forest-natural.config.ts tests/e2e/forest-natural.spec.ts` | **Latest affected scope: 3/3 PASS**, 2.7m: two-browser shared 59.6s; six-network-player shared 61.2s; private isolation 35.1s. `network-final.log`. Six-player profile reuses Bamboo's two-renderer/four-SDK convention with actual combat, state/ID decoding, rewards and exits. |
| `git diff --check` | PASS after the patch/documentation updates. |

Final runtime code did not change after `check:final`. Subsequent changes were test drivers/profiles, checked with tool typechecking and the affected browser scope. Successful unit/build/asset stages and unchanged three Bamboo/dungeon browser regressions were retained according to repository workflow. Combined current coverage has all six relevant browser scenarios passing, with exact profile boundaries above. Do not turn the original failed final-command record into a success.

Full six-canvas natural acceptance was not achieved in these runs. Final six-player acceptance is network/gameplay/readability through two actual canvases rendering all six participants, plus four independent SDK state decoders/controllers. No balance or performance/60fps claim is made. The existing clustered name/damage-number overlap is visible in the natural six-player PNG; HUD/number layout was not changed by this roster fix.

## PNG evidence actually captured and inspected

- `network-final/shared-2/wave-2-natural.png`: five-creep second wave.
- `network-final/shared-6/wave-2-natural.png`: live second-wave combat; roster capture records 12 spawns even when the screenshot HUD already reports a lower living count.
- `network-final/shared-6/natural-combat-rewards.png`: actual post-combat state.
- `network-final/shared-6/normal-url-no-flags.png`: fresh normal URL without debug/review query.
- `network-final/private-2/private-wave-2.png`, `independent-private-wave-1.png`: independent instances.
- `final/bamboo/behind_bamboo.png`, `in_front_of_bamboo.png`, `bamboo_collision.png`, `bridge_and_stream.png`, `six_players_1920.png`: unchanged environment regression (two renderers/four SDK participants).
- Failure PNGs, error contexts and logs stay in their original iteration directories. No video/GIF/animated evidence was made. Historical evidence under 2026-10-31 remains unchanged.

## Protected assets and exact files

`protected-assets.json` verifies all 60 approved Bamboo environment files and 565 approved Forest art files, with no mismatch. Exact unchanged approval-lock hashes:

- Bamboo environment: `1a6f89320a6f683b636df916d181ab32d916d95678c86223f4748bf5251cf515`.
- Forest creeps/VFX: `9769792b1effb2c83a5db512cab9aef0dab73ed1fabc82d37bc5a04075473bcc`.

New worktree checkout line-ending variants were repaired to exact already-approved hashes; no lock was rewritten or weakened. Unrelated generated arena/desert hash drift was restored only after full metadata and newline/hash preflight. A restore lacking that preflight was rejected by automatic review and made no writes. A global approved-count update from the unrelated Thiếu Lâm validator is preserved here as `thieu-lam-validator-current.json`; its historical production report was restored after checking that count was its sole difference.

`files-changed.json` inventories exact source/documentation changes and generated runtime metadata. Main functional files: `packages/game-data/src/forest-creep-roster.json`, `packages/game-data/src/dungeon.ts`, `packages/game-core/src/dungeons.ts`. Preparation/validation, roster/transport/fallback tests, natural browser tooling and current integration docs are updated. No client renderer, MatchRoom, protocol schema, map, artwork or approval-lock implementation was changed in this task.

Asset path remains source Forest PNG/atlas/manifests → `prepare-forest-creep-review.mjs` → `public/assets/forest_creep_review` pack/runtime manifest → normal preload/animation registry → server `archetypeId` lookup → existing ArenaScene/playback/effects. The legacy folder name is not a runtime gallery requirement.

Both environment and six-creep artwork are **already director-approved**. Original candidate production records are immutable history. Forest roster/type mapping is now integrated and natural-gameplay verified. Remaining VFX phase/ability/projectile contracts are intentionally outside this task; no new artwork, milestone, enemy ability or balance was introduced.
