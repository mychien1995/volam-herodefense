# Wave-boss env mode verification — 2026-11-03

`VOLAM_DEV_WAVE_BOSSES=1`, development server, protocol 26, production Vite client bundle. This is an accelerated developer test, not production balance acceptance.

Focused compilation passed: `pnpm exec tsc -b --pretty false` and `pnpm exec tsc -p tsconfig.tools.json --noEmit --pretty false`. Asset preparation and the client build passed; all approved asset guards passed. No art was changed.

Focused Vitest command: `pnpm exec vitest run tests/wave-boss-test.test.ts tests/wave-boss-test-room.test.ts tests/m3d-bac-cai-integration.test.ts tests/m3d-nam-de-integration.test.ts tests/m3d-kim-integration.test.ts tests/m3d-hell-integration.test.ts tests/protocol.test.ts`. **27 cases / 7 files passed**, including real SDK peers, god mode, 3× movement, exact hit damage, ordinary-mode preservation, zone travel and server-only flag enforcement. Full suite was not run, following the requested focused scope.

Browser command: `node tools/run-playwright.mjs test --config playwright.wave-boss-test.config.ts --trace off`, with `PLAYWRIGHT_BROWSERS_PATH=D:/Projects/volam-hero-defense/.cache/ms-playwright`, server 2896/client 5496. **1 case passed**, two independent Chromium contexts using actual arrows/A as Thiên Sơn. No fixture endpoint, teleport, HP edit, synthesized hit or injected boss defeat. Active gameplay lasted 66,652ms.

| Boss | Max HP | Accepted damage hits | Damage per hit |
| --- | ---: | ---: | ---: |
| Đông Tà | 8,990 | 20 | 449.5 |
| Tây Độc | 2,600 | 20 | 130 |
| Nam Đế | 30,000 | 20 | 1,500 |
| Bắc Cái | 29,700 | 20 | 1,485 |

Both peers observed the ordered stages ending in `complete`, no ordinary invasion creeps, no client errors, and full player HP throughout (final 309/309 for both after actual reward level-ups). In-game PNGs show the DEV HUD, live damage and completed sequence inside the existing viewport. The final PNG also retains an existing Nam Đế 0-HP HUD row after his defeat; this test-mode change does not repair that unrelated HUD cleanup issue.

The first two browser attempts failed because the melee bot held A outside reach, then failed to update its facing near a moving target. Their reports/PNGs are preserved as `attempt-1.*` and `attempt-2.*`. The final test uses the normal aim-once Phiến attack, not altered boss AI. Tools typechecking and the affected browser stage were rerun after the helper changes; unchanged runtime/build stages were not repeated.

This fast sequence does not validate every long boss choreography, six-player readability or normal 180-second wave pacing. Existing approved visual evidence remains the art baseline. No video, GIF or trace recording was created.
