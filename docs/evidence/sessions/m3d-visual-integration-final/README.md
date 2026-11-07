# M3D visual integration

This merge combines milestone base `bd5480a3` with visual worktree `1b031790`. Match entry uses M3D's school and branch selection. The renovated arena uses the existing four-gate schedule and north ingress, with the renovated character and effect atlases. The skill review applies its server-gated level and loadout after shared player creation.

Focused comparison reproduced six existing failures on the milestone base. The fixes align the reward and room fixtures with campaign rules, wait for Kim Luân's population scaling before the finishing hit, and keep the existing legacy retry and reconnection tests in their explicit legacy mode. The north ingress stays at the M3D depth when the old wall is removed. Browser capture ignores unrelated wave feedback when comparing Cái Bang's basic effects. The first full run was interrupted and its partial timing file is retained separately. The focused retry passed 20 tests across eight files.

`pnpm check:final --config playwright.renovation-v10.config.ts` passed in 346.57 seconds. It covered both typechecks, 18 workflow checks, 940 unit and integration tests, the production build, 30 asset validators and the six-client Phaser test. The browser verified all 24 current A inputs, including the sixth dragon in each facing, M3D effect sources and head-only Phi Long. The six clients agreed on damage across 22 natural combat hit events. See the [frame report](renovation-v10/runtime.json), [sixth attack PNG](renovation-v10/current-basic-sixth.png) and [pipeline timings](check-workflow/final-timings.json).

`node tools/run-playwright.mjs test --config playwright.campaign.config.ts` passed all three production browser cases on the same build. The cases cover Long Châu and life-counter layout, plus two-player dungeon and wave boss deaths, votes and retries.

The live entry smoke checks passed for normal matches, level-30 skill review and wave boss review on ports 5546, 5547 and 5548. See [live service results](live-services.json).
