# Boss playtest feedback integration — 2026-11-03


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

This canonical override supersedes V02 random burst counts and the old repeated wrong-clone punishment. Đông Tà, Tây Độc and Nam Đế each have twenty original Vietnamese combat lines, selected server-side from seeded shuffled decks without repetition until the pool is exhausted. First line after 6 seconds of combat, then every 8–10 seconds when an action gap permits; overhead chat lasts 4 seconds in its own lane alongside the retained skill shouts. Bắc Cái keeps his separate preference/dialogue mechanic and stays silent during Mục Hạ Vô Nhân.

Mục Hạ Vô Nhân keeps its approved split and five pair swaps. At reveal, players have exactly 5 seconds to land a valid guess. A clone hit causes one arena-wide explosion and ends the skill in that simulation tick; all simultaneous clone/real hits settle as one failure, regardless of target iteration order. A real-body-only hit ends it without explosion and cancels the deadline, including on the deadline tick. No valid hit by the deadline causes one explosion and immediate cleanup. No extra explosions after cleanup.

Tiểu Nhất Dương Chỉ always releases five straight golden projectiles, spaced 0.16 seconds, re-aiming at the selected player's current position at each release. Each shot flies straight afterward. Its independent server channel can run with all main skills, QTE and movement without replacing their cast or clocks. Trial repeat interval is 90 ticks / 3 seconds, first windup remains 17 ticks; repeated starts cannot duplicate an active burst. Death, no living players, wipe and encounter cleanup cancel pending shots. The main special animation retains priority while concurrent native gold projectiles render normally.

Approved V01/V02 PNGs, JSONs and preview source remain byte-exact. This update changes runtime behavior and text, not the frozen preview. The common arenas, rewards, dungeon life ledgers, controls and separate inventory-v2 scope remain as in V02. Matching protocol 29 services and a new room are required. Current implementation/validation: `docs/WAVE_BOSS_FEEDBACK_V03_RUNTIME.md`.

## Validation

**Completed: PASS_WITH_STAGE_RETRIES.** Preserve the V02 evidence under its original directory.

- Focused reproduce-first checks initially failed on the four requested old behaviors; final focused combat checks passed.
- `pnpm check:final --config playwright.wave-boss-feedback.config.ts` ran preparation, project/test/tool typechecks and 18 workflow checks, then stopped with 722 passed / 1 failed in the original 723-test suite. Original report remains `evidence/sessions/wave-banter-final/check-workflow/final-timings.json` with FAIL status.
- The old three-player tether fixture assumed B was selected by RNG before leaving. It now arranges and asserts B is a real victim before testing disconnect cleanup. Cosmetic dialogue also has its own world-seeded PRNG and a new regression proving it never advances combat RNG. Focused retry: 6 passed.
- Final-state retries: `pnpm exec tsc -b`, `pnpm exec tsc -p tsconfig.tools.json --noEmit`, then `pnpm exec vitest run`: **75 files / 724 tests passed**,127.18s. Full output: `evidence/wave-boss-feedback-v03-runtime/unit-retry.log`.
- `pnpm --filter @volam/game-client build`: PASS. Asset validation: first19 passed; the last validator completed assertions but failed printing Vietnamese under Windows cp1252. `python -X utf8 scripts/verify-bac-cai-preview.py` passed, completing all20 validators. Retained approved V01/V02 locks and source/raster checks passed in preparation and unit checks. No approved preview files were edited.
- Chu room fixture accepts `VOLAM_QA_CHU_ROOM_PORT`; this run used free port2938 while leaving the existing unowned2798 service untouched.
- Final-state exposure matrix: **768 seeded20-second probes**,30.87s, every statue protected,0items. Four schools, both branches, levels1/6/15/30 and solo/six covered. Bots do not model human dodging, guessing or votes. `balance.json` and `balance.csv`; pre-isolation iteration retained separately.

## Playable local service

`http://127.0.0.1:5515` uses its own development client and matching protocol29 server at2915, no QA fixture middleware. Owned process handles/run identity are recorded in `.cache/boss-playtest-20261103/owner.json`. Server health and HTTP client readiness were checked. A separate real browser used the actual lobby, school selection/confirmation and arrow input; it entered IN_GAME with DEV wave-boss mode and the live Đông Tà actor, without browser errors. Evidence: `evidence/wave-boss-feedback-v03-runtime/playable-launch.json`.

Create a new room. Existing DEV mode is explicitly enabled: god mode,3× arrow speed, each valid boss hit removes5% max HP, natural boss skills/CC/heals/puzzles still operate, four bosses in order and no ordinary waves. This is an accelerated local playtest, not production balance. Historical previews at5461 are separate.

 Current checks use `docs/evidence/wave-boss-feedback-v03-runtime/`, protocol 29 and isolated ports. No recordings, asset regeneration or final art approval are claimed. Broad style and UI references were inspected earlier in this same cumulative integration; current V02 screenshots and frozen preview remain the immediate visual baseline.

## Final live results

All four unique production-browser cases passed across scoped retries: two Phaser clients retained approved native art/timings/arena/pull/corpse behavior; six actual network peers (two renderers plus four SDK clients) cleared full-HP bosses with natural AI and legal level30 inputs; four dungeon bosses displayed natural special-skill shouts in both clients; latest-feedback case synchronized all three banter pools, observed a complete five-projectile burst during the unchanged sky cast, and verified both Mục Hạ endings in both clients. No browser errors in passing reports. The six-peer profile does not claim six simultaneous local renderers or final balance.

Latest-feedback browser initially read `clonePhase` before the new Bắc Cái snapshot arrived. It now waits for both clients' combat phase and polls the revealed state with acknowledgement. Test/tool typecheck and the affected browser case passed without rerunning unchanged unit/build stages. Original failure report and PNG remain. The successful repeat observed clone-hit termination in763ms including network/render/input, and no-input termination5063ms after observing reveal. Exact150-tick timeout and same-tick accepted-basic cleanup are proved by deterministic core regressions, not inferred from screenshots.

PNG review: Nam Đế's new banter and existing shout are visibly separate and legible at normal zoom. Banter follows the world actor, so a boss outside the camera can also take its text outside the view; no permanent exterior panel or global chat banner was introduced. Source values and motion/cleanup are checked through live frame observations and server snapshots. Native VFX and the127reviewed V02 inputs stay unchanged; no new art/recordings or final director art approval are claimed.

Final compact evidence: [verification.json](evidence/wave-boss-feedback-v03-runtime/verification.json), [latest gameplay case](evidence/wave-boss-feedback-v03-runtime/latest-feedback.json), [real launch check](evidence/wave-boss-feedback-v03-runtime/playable-launch.json).
