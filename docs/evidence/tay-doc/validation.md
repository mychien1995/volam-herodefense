# Tây Độc feedback03 — validation, 2026-11-02

Branch/worktree: `wip/m3d/tay-doc`. Source/runtime complete for this integration scope; final art/balance approval remains with the director. No merge, push or deploy. No videos, animated evidence or trace screenshot streams were generated.

## Final workflow and actual outcomes

`pnpm check:final --config playwright.tay-doc.config.ts` ran once after the last gameplay/renderer change. Preparation passed (0written/5207unchanged,593frozen Tây Độc input hashes), project compilation passed, tests/tools typecheck passed and18workflow regression checks passed. The first unit stage returned489passed/1failed: a retained Kim integration assertion still required protocol17. It was updated to18 for the new arena-scoped projection; existing destination/ownership assertions remain intact.

Per `docs/DEVELOPMENT_WORKFLOW.md`, recovery reran affected stages rather than repeating successful preparation/runtime compilation. The unit-stage retry passed485tests and skipped5because two old fixed test ports2638/2626 were temporarily occupied. Both ports were free on subsequent inspection; no foreign service was killed or borrowed. Targeted retry `pnpm exec vitest run tests/skill-room.test.ts tests/vo-dang-room.test.ts` passed all5. Together the final source state has490unit/integration tests passed across these retries, including19new Tây Độc mechanics/SDK tests. Error history, exit codes and per-stage timings are preserved in `validation-stages.json`; the initial `check:final` process itself returned1, not a falsely reported clean exit.

Remaining final stages all passed:

- Production client build via the installed Vite binary: PASS. Existing large-chunk advisory only.
- All16canonical `verify:assets` validators: PASS, including Tây Độc’s593approved hashes,60distinct candidate cels/15clips, bounds/pivots and exact runtime copies.
- `node tools/run-playwright.mjs test --config playwright.tay-doc.config.ts`:2/2PASS (two-client arranged observation and six-client natural combat); browser stage163.14seconds. Video and trace off.
- `pnpm --filter @volam/game-server exec tsx ../../tools/tay-doc-balance.ts`:192deterministic runs completed, seeds42/1337/9001, levels1/6/15/30, eight basics,1/6players.
- Additional `pnpm exec tsc -p tsconfig.tools.json --noEmit` and `pnpm --filter @volam/game-server exec tsx ../../tools/tay-doc-menu-smoke.ts`: PASS. Uses the real playable DEV helper on5398, verifies inventory/shop/dungeon windows remain inside the game viewport, Escape closes them, movement and A/Q resume, zoom1/rotation0, no page errors. The tool writes to absolute evidence paths.

Seven unrelated generated validator reports were returned to their unchanged pre-task Git bytes. Runtime/art inputs were not changed after the successful stages. Validation/hand-off metadata edits do not trigger another full suite under repository workflow.

## Live Phaser observations

The two real clients observed all60new directional cels, all64retained transition cels,12retained right-facing crawl/hop/exhale cels,8right-facing sweep/palm cels and all8pillar head frames. Entity frames, coordinates and depths are in `frame-observations.json`. Body rotation stays0; feet set body depth, and floor warnings stay below actors. Pillars retain their base while their authored heads turn. No page errors were recorded.

The latest six-client run used normal level1school selection and keyboard movement/A/QWER attempts, with DEV spawn as its only encounter shortcut. No pose, HP, rank, phase or position fixture was used. It entered phase2 and killed the boss after17.289seconds of fighting. All6players were synchronized; the statue remained intact. The preceding iteration took34.124seconds; wall-time outcomes depend on room seed/input cadence and do not constitute deterministic balance measurements. Full snapshots/events/rewards and the explicit natural profile are in `six-player-natural.json`.

PNG inspection at normal zoom1 confirmed: one dominant game viewport, in-viewport HUD/menus, the approved grey-haired human/green-violet identity, a human Cáp Mô crawl, persistent pillar bases/HP bars, translucent poison pools and a large circular stomp warning. Reference comparison used the approved character/action inputs and the repository’s detailed overworld/game-viewport benchmarks. Clustered six-player melee can overlap nameplates/damage numbers; the natural PNG records this honestly. Director runtime approval is pending, especially for the60new facings. The arranged HP100000profile is explicitly labeled and is not used to claim survival/balance.

Review PNGs:

- `arena-runtime.png`: retained right-facing Cáp Mô body in the actual arena, two real clients.
- `p1-eight-pools.png`, `p1-six-pillars.png`: warnings/hazards and destructible pillar health bars.
- `p2-stomp-warning.png`, `p2-radial-channel.png`: actual radius405warning and slow radial projectiles.
- `six-player-natural-phase2.png`, `six-player-natural-final.png`: natural group combat/outcome, not viewer sample sprites.
- `inventory-overlay.png`: existing inventory stays inside the same gameplay viewport.

## Trial balance measurements

| Level | Players | Clears within60s | Mean boss HP-loss DPS | Mean deaths |
| --- | --- | --- | --- | --- |
| 1 | 1 | 0/24 | 14.4 | 3.25 |
| 1 | 6 | 24/24 | 162.17 | 2.79 |
| 6 | 1 | 9/24 | 37 | 2.17 |
| 6 | 6 | 24/24 | 317.8 | 0 |
| 15 | 1 | 18/24 | 82.62 | 1.08 |
| 15 | 6 | 24/24 | 411.86 | 0 |
| 30 | 1 | 24/24 | 163.28 | 0.21 |
| 30 | 6 | 24/24 | 530.94 | 0 |

All192runs retained statueHP2000 and produced zero item rolls. These runs use legal automatic school branches with point/level gates, no equipment or combat HP/position overrides. Existing M1practice creeps remain in the real arena baseline, so aggregate gold/XP may include their kills; single boss-pool800XP/240gold settlement/no duplication is covered separately by deterministic tests. DPS uses boss HP loss (no overkill inflation); received event damage may include overkill. Entry time is included. See `balance.json` for raw numbers and configuration.

HP2600/defense12/damage/CC/cooldowns remain provisional. Six-player high-level builds clear quickly; no party HP scaling has been introduced. The approved405radius,16radial directions,130.05/218.025projectile speeds and8-direction/1.35s/390speed pillars remain guarded. The production gate is implemented/tested but still waits for the repository’s future actual Đông Tà completion hook; the dedicated DEV game is immediately playable without claiming that predecessor is already integrated.
