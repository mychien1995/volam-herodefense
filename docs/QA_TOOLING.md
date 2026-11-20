# QA preflight and shared helpers

Implemented 2026-11-19. Tooling/fixture changes only; game rules and runtime assets are unchanged.

Optional owned development iteration now uses `pnpm qa:iterate --plan rounds.json`: fresh tests and asset guards, byte-verified live compiler/service reuse, room/socket reset and scoped teardown. Only the dedicated smoke and explicitly selected default gameplay tests are supported. [Commands, measurements and limitations](QA_ITERATION_REUSE_2026_11_20.md). Final remains independent.

## Start a session

```powershell
$env:VOLAM_QA_SESSION = 'my-feature'
$env:VOLAM_QA_SERVER_PORT = '28741'
$env:VOLAM_QA_CLIENT_PORT = '28742'
pnpm qa:preflight --mode browser
# Then the existing focused/final command; it also runs preflight automatically.
```

Do not use example ports without checking that they are free. Preflight refuses an occupied port; it never borrows or kills its owner. Keep the existing service identity checks at launch because port availability can race.

`pnpm qa:preflight --mode quick` checks prerequisites for core iteration without requiring Chromium/Python. Browser checks use the same `PLAYWRIGHT_BROWSERS_PATH` as `tools/run-playwright.mjs` (default `.cache/ms-playwright`). Final also requires Python for asset validators. `--json` returns structured checks/remedies. The command does not install, compile, prepare assets or change environment/configuration files.

`pnpm qa:preflight --mode browser --ready` is a **before-launch** check of an already-built candidate: server output exists, source/dist protocol agree and client build endpoint matches. It does not prove that all compiled inputs are fresh. Keep compilation and real service run/protocol/endpoint checks. It still refuses occupied ports, including a previously running review service.

All 80 legacy profiles and the three focused QA profiles use explicit [profile contracts](../tools/qa-profile-contracts.json) through `qaWorkflowSession`. Preflight checks every service/fixture port and the configured bundled Chromium, Chrome, Edge or custom executable. Fixed-port and multi-service fixtures keep their existing ports; unsupported overrides fail explicitly. Shared profiles accept `VOLAM_QA_SERVER_PORT` / `VOLAM_QA_CLIENT_PORT`; alias profiles retain their named environment variables. Run with the actual `--config` to select the right contract. Unregistered/WIP configs still receive an explicit limitation note. Update the contract when changing a profile/setup; `qa-profiles.test.mjs` rejects missing tracked profiles.

`--ready` checks the build actually consumed: development clients require compiled server/protocol, preview clients also require the matching built endpoint, static review pages require no game build. The shared lifecycle now owns game/Vite startup, verifies run/protocol/client identity and restores fixture environment on success or failure. Child services additionally verify PID and IPC metadata; static PID review servers use an awaited owned-process cleanup. Two existing static profiles retain Playwright's no-reuse webServer ownership. This does not prove that every historical visual suite passes. See [shared UI/camera contracts and checks](SHARED_UI_CAMERA.md).

## Owned fixture lifecycle

Use `startOwnedGameQa` from [tools/qa-game-services.mjs](../tools/qa-game-services.mjs), or the thin TypeScript facade in `tests/e2e/owned-game-setup.ts`. Select the registered config or supply an explicit session. Preserve the fixture's existing `environment`, Vite options and authority middleware through `configure(server, owned)`.

- Ports and preview build endpoint are checked before creating services or mutating fixture environment.
- Server cleanup is registered before `listen`; client cleanup is registered as soon as its handle exists. Startup checks both server run/protocol and client run/endpoint. The dev adapter supplies the raster-alias bootstrap constant normally provided by the app Vite config.
- `ownedQaServices` closes in awaited reverse order, tries every owner even if one fails, and returns the same completion/failure to repeated or concurrent callers. Adding owners after cleanup starts is rejected. `runQaFixture` restores only its captured environment keys in `finally`; startup and cleanup errors are both retained.
- Use `startQaHttpFixture` for native fixture bridges, including their run/protocol identity and incomplete-connection cleanup. Use `startQaChildren` / `serveQaChild` for service processes: unique child run/PID/port handshake, HTTP confirmation, authenticated stop, parent-disconnect handling and bounded teardown. Force termination uses only the child handle created by the fixture.
- Do not put multiple Colyseus service instances in one process for the combined boss profile. Kim Luân/Lý Mạc Sầu now start their unchanged setup modules in separate owned children. The TS setup loader uses installed Vite; it does not depend on native Node TypeScript stripping.
- Static visual servers without a game protocol use `startQaStatic` and their existing live-PID `/health` contract. Existing Playwright `webServer` profiles keep `reuseExistingServer:false`. No static art server or artwork was edited.

[Coverage, before–after measurements and verification](QA_OWNERSHIP_2026_11_20.md). The registry audit covers 82 profiles; fresh lifecycle probes and representative browser cases are distinct from running every historical art acceptance suite. No live service or successful test result is borrowed or cached.

## Reuse browser controls

Import from `tools/qa-browser.mjs` (TypeScript declarations are included):

- `waitForGameReady(page, { timeout })`: Phaser's actual ready marker plus confirmed authoritative `IN_GAME` state.
- `acknowledgeQaLobby(page, action, id, { timeout })`: only start/school/branch/confirm, retrying the existing DOM action while server acknowledgement is absent. School selection also requires the actual branch popup when applicable.
- `observeQa(page, predicate, argument, options)`: browser-side polling; returns the observed value and disposes its handle. Transport/prerequisite errors fail immediately, timeouts include compact readiness/tick/actor state.
- `pressQaAndWait(page, key, predicate, argument, options)`: check readiness/live actor, focus canvas, arm observation, send **one** key press. Use `keyDelay` for a deliberate movement hold. The predicate must identify a new sequence/event/projectile, not stale state. Combat inputs are never retried and outcomes are never injected.

Existing `startTogether` and `startAuditTogether` use the shared lobby/readiness contracts. Core-only polling still uses `tools/qa-wait.mjs`; do not replace deterministic simulation assertions with a browser helper.

## Skill prerequisites

Import from [tools/qa-skill-browser.mjs](../tools/qa-skill-browser.mjs). Helpers resolve the current actor from the current room/zone, use real UI/input and return compact authoritative receipts:

- `ensureQaSkillLearned(page, slot, abilityId)`: explicitly spend one legal skill point through the existing rank button only if unlearned; require the equipped ID, server rank and build revision.
- `castQaSkill(page, key, abilityId)`: one key, a fresh event and newer input sequence. Old events, actor/zone changes and death cannot satisfy the cast.
- `ensureQaKinhLoi(page)`: reuse an owned live area or place one with S and a real charge; call before Kiếm Tôn Q. It does not implicitly learn Q.
- `placeQaOwnerOnlyArea(owner, peers, { key, abilityId })`: require a new owner-visible area, then observe concealment on different actors in the same room/zone while their server ticks advance. A frozen peer is inconclusive.
- `captureQaSummon` / `waitQaSummonTransfer`: preserve the exact summon ID, resolve the current owner identity, require living server state and the destination Phaser actor/health bar, and check removal from old-zone peer rendering.

```powershell
pnpm qa:preflight --mode browser --config playwright.qa-skill-prerequisites.config.ts
pnpm check:browser --config playwright.qa-skill-prerequisites.config.ts
```

The focused profile uses existing server-only level-6 trial flags and harmless practice targets. Q is learned through UI; casts, private projection and dungeon travel are genuine gameplay. Three live browser clients cover prerequisites; this is not balance, natural-combat or art approval. Đường Môn and Ngũ Độc's existing six-player suites also consume the shared private-area/transfer helpers. See [measurements and coverage](QA_SKILL_PROFILES_2026_11_20.md).

## Focused verification

```powershell
node --test scripts/tests/qa-preflight.test.mjs scripts/tests/qa-browser.test.mjs scripts/tests/qa-session.test.mjs
pnpm check:browser --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile'
# After the final implementation change:
pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile'
```

The dedicated helper fixture uses the existing owned-server setup, removes the initial hostile practice creeps only in its named test rooms and places a durable harmless target. This keeps actors alive while art loads. Real keyboard input, simulation movement, projectile creation and peer replication remain under test. It is not natural-combat, balance, art or long-soak acceptance.

## Compact logs and measurements

The workflow prints stage summaries and a bounded failure tail. Full stdout/stderr streams to per-run files under the timing report directory, with paths and byte counts in the report. Files can be tailed during long stages. `VOLAM_QA_VERBOSE=1` prints full output after each stage. No assertion, validator or approval gate is removed; no PASS is reused.

See [measured before/after results](QA_TOOLING_MEASUREMENTS_2026_11_19.md). Compare the same scenario and preserve failures. Output bytes and driver calls are context/automation proxies, not billed token measurements. A baseline smoke failure is not a valid wall-time speed comparison against a later PASS.

Historical reference validation uses [scripts/reference_paths.py](../scripts/reference_paths.py) to locate the exact original image through the move manifest. The forest/renovation provenance validators still check their recorded hashes; no original provenance or approval lock is rewritten.
