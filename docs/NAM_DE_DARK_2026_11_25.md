# Nam Đế hắc hóa — playable review, 2026-11-25

Branch: `milestone/m4d`. After reviewing the integrated playable version, the user explicitly approved it: “Duyệt. Integrate vào milestone/m4d và commit” (2026-11-25). This approves the current Nam Đế hắc hóa runtime art and integration. Exact approved source/native/export bytes are recorded in `assets/approved_nam_de_dark_v01.lock.json`. Earlier candidate labels and verification/failure records remain historical evidence; this approval supersedes their pending-review status. No artwork was regenerated for approval.

## Implemented behavior

- At 40% HP, Nam Đế transforms once. Phase-one damage stops at the threshold so overkill cannot skip the transformation. Boss collision radius and displayed anatomical height double.
- Bald elderly identity, white beard/eyebrows, grayscale muscular bare torso and red eyes follow the approved concept.
- Phase two excludes Đại Lý Phong Huyệt and Liên Hoàn Nhất Dương Chỉ. Other existing skills remain.
- Tiên Thiên Canh Khí reduces incoming damage by 75%. Actual attackers receive a 15% slow for 1.5s. Existing legal cleanse items still work.
- Tiên Thiên Băng Đao is a straight projectile. Z and the in-viewport button request an 0.6s guard, with 1.1s cooldown. A successful guard reflects the blade toward the boss's position at that instant; it does not home. Three actual reflected boss collisions break Canh Khí. Client messages contain intent only.
- Đại Lý Hoàng Quyền locks the warned ground position, then lands a golden fist with a one-second stun. Its damage area is an ellipse matching the ground marker. Fists are scheduled frequently, independently of the blade cycle.
- The development host can choose **Test Nam Đế hắc hóa** from a fresh boss-progression room. It supplies the existing level-18 progression preset and enters phase two without recording earlier boss kills/rewards. This shortcut is development-only and host-only.

Numerical defaults in `packages/game-data/src/nam-de.ts` are initial trial tuning, not final balance approval. Existing campaign progression, rewards and controls remain authoritative.

## Runtime art and retained sources

- Versioned body atlas: `assets/exports/boss-nam-de-dark-v1/`. 64 fixed-pivot cels across eight runtime directions; four authored camera source groups, mirrored directions and shared rear reaction poses are disclosed in provenance. Older retained abilities share the new unarmed slash/summon poses.
- Versioned VFX atlas: `assets/exports/effects/nam_de_dark_v01/`. 18 frames: authored directional ice blades, parry/frost, aura/shatter and fist warning/fall/impact/burst/crack. Directional blade sprites are selected without rotating the whole raster.
- Body canvas 640×704, feet at (320,624), scale 0.5. Native alpha-mask heights 249/127 yield 1.9606× including outline tolerance. The first oversized pilot is preserved under `docs/evidence/nam-de-dark/pilot/before-density-fix.png`.
- Aseprite native sources, exact prompts, rejected takes and provenance remain under the matching `assets/source/` directories. Body native round-trip matches all RGBA; VFX matches alpha and visible RGB. Aseprite's normalization of RGB under zero alpha is explicitly recorded rather than reported as an exact-RGBA match.
- Transparent logical frame edges, trimmed atlas gutters, fixed pivots and source/export hashes pass `scripts/verify-nam-de-dark.py`. Report: `docs/evidence/nam-de-dark/assets.json`.
- `artifacts/nam-de-dark/shield.png` records the actual Phaser renderer at normal gameplay zoom. A still image alone does not establish animation or multiplayer acceptance.

## Verification scope

Focused deterministic coverage includes threshold/overkill, phase-one cancellation, old-skill exclusion, shield/slow, three reflected collisions across three seeds, guard timing/cooldown/status rejection, straight travel, warned fist collision/stun/dodge, cleanup, strict protocol and host-only shortcut. The shortcut room test initially exposed a blocked marker when reinitializing a rebased runtime; the implementation now reuses the trusted initialized map runtime. Failed evidence is retained in `docs/evidence/nam-de-dark/failures/`.

Browser observations use real network messages and server acknowledgements. Isolated skill fixtures set prerequisites and freeze unrelated casts; they never inject guard results, reflection counts or hit outcomes. Cleanse boots are placed on cooldown only for the isolated slow/stun probe. Browser timing failures are retained and are not evidence of a passing mechanic.

Six-client review is scoped to two Phaser-rendered browser clients plus four real Colyseus SDK peers. It is not a claim of six simultaneous GPU views, a full campaign, human win rate or final balance acceptance.

The isolated reflection review confirms the physical browser Z binding separately from three accepted guard intents sent by a third real SDK peer. Two Phaser clients observe reflection counts 1/2/3 and the shield breaking. Browser-driven timed parries missed on this host; the retained audit shows coarse state observations and delayed guard acceptance. The game timing was not widened to satisfy the driver.

`tools/nam-de-dark-balance.ts` runs 96 deterministic 20-second probes: eight legal branches at level 18, one/six heroes, three seeds, with/without an ideal guard bot. The bot anticipates the blade windup at melee range, where waiting for the projectile to exist is too late. It does not dodge fists or drink potions. Guarded six-hero probes broke the shield in 21/24 cases; unguarded probes never did. Solo probes remain punishing and did not break the shield within the 20-second window. These results expose trial tuning; they are not human difficulty ratings. Earlier bot setup/duplicate-sequence errors are retained under failures and excluded from these results.

## Commands and limits

- `python scripts/verify-nam-de-dark.py`: PASS, 64 body / 18 VFX frames and native-source checks.
- `node node_modules/typescript/bin/tsc -b` and tools typecheck: PASS. The final workflow repeated both successfully.
- Focused Vitest run across six files: 60/61 passed before the rebased shortcut fix. The two affected progression files then passed all 15 cases, including the previously failing shortcut case. Both logs are retained; this is not represented as a single fresh 61-case run.
- Real-renderer representative slice: PASS after correcting render density.
- Six-network-client browser probe: PASS, two Phaser views and four SDK peers; retained `six-party.json/png`.
- Final focused multiplayer browser probe: PASS (1 test, 2.0m). It observes walk_a/walk_b in all eight directions, real keyboard Z acceptance, three actual SDK guard/reflection hits with shield states true/true/false replicated in both Phaser clients, a native arrow-key dodge without HP loss, authoritative fist damage/stun, visible shatter and fist fall/crack/burst phases, then an accepted A defeat and guard-UI cleanup. No browser errors. See `multiplayer.json/log`, `shield.png` and `verification.json`.
- `node apps/game-server/node_modules/tsx/dist/cli.mjs tools/nam-de-dark-balance.ts`: completed all 96 probes; `balance.json/log`.
- `pnpm check:final --config playwright.boss-progression.config.ts --grep 'Nam De dark multiplayer|Nam De dark six-client combat uses'`: run once. Preflight, asset preparation, project/tools typechecks and workflow regressions passed. The full unit stage reported two failures in existing `tests/room.test.ts` (including an obsolete health milestone expectation of M3B), then stopped making progress. The run was interrupted; no full-suite or final-workflow PASS is claimed. See `check-final-interrupted.log` and `check-final-unit-partial.log`.

The isolated browser dodge fixture returns `center`, not `y`; its test was corrected to use `before.center.y`. Replicated status durations use `ticks`, not core `until`. Impact verification accepts the visible impact/burst/crack phases because the seven-tick initial contact cel may be skipped by a slow renderer. These corrections do not change gameplay timing or inject successful results.

The owned manual review service runs on server 2960 / client 5560. `live-service.json` verifies HTTP 200, protocol 55, M4D and identical server/client run IDs.
