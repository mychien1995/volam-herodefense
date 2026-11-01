# Chu Bá Thông integration — 2026-11-01

Scope: one boss dungeon, branch `wip/m3d/chu-ba-thong`. The director approved feedback 01 artwork/choreography and explicitly requested gameplay integration. `assets/approved_chu_ba_thong.lock.json` records 102 exact reviewed inputs. **Runtime director art approval remains pending.** No new artwork or approved PNG changes.

## Play

Create/join a match, choose a school, open **Phó Bản → Chu Bá Thông → Riêng / Chung → Vào Phó Bản**. Return by walking to the physical entrance/exit at (640,610), then press Space. Arrow keys/A/QWER retain their normal controls. All HUD, loot and inventory overlays remain inside the full match viewport.

The client uses the actual Phaser scene and existing Colyseus room. Private instances are owned per session; the shared instance belongs to that match only. No account/save system. The boss has fixed power independent of party size or repeated kills; players bring their current progression into it.

## Mechanics and trial tuning

`packages/game-data/src/chu-ba-thong.ts` owns trial HP6000, defense30, XP900/gold600, damage, timings, radii, velocities and drop table. `packages/game-core/src/chu-ba-thong.ts` owns deterministic mechanics. Numeric balance is **not approved/final**.

| Phase | Server behavior |
| --- | --- |
| Phong kình | Feet radius112px plus frontal radius170px, center80px forward; no feet blind spot. Damage28 per pulse. |
| Quyền trái/phải | Front reach340px, half width65px; alternating body cels and extended wind effect. Damage15 per strike. |
| Bắn chưởng | Samples nearest living player at release, speed300px/s; fixed velocity, swept contact, no tracking. Damage30. |
| Song Thủ Hỗ Bác | Four authored palms: .75s warning,2s travel,.6s contact, remaining dissipation. Scale1.2 vs earlier1.5. Swept capsule deliberately excludes transparent corners/trails. Each hand hits each player once. Damage45. |
| Thái Cực Âm Dương Trận | Captures living members present at cast. Traps one target inside radius62px with movement inside. Rescue requires all remaining required members inside; max30s. Dead/departed members stop blocking; target death/departure releases; late entrants are not added mid-cast. Solo releases immediately. |
| Túy Tiên Bộ | 24s, velocity560/350px/s per axis, radius112px. Every tick checks swept body contact; per-victim .5s damage cadence avoids tunnelling without tick-rate damage. Ghosts retain actual server positions. Damage16. |
| Càn Khôn Phản Chấn | 9s, pulls within210px at60px/s. Boss still receives damage; exactly100% of its actual HP decrement is reflected to the attacker, including DoT, without a second defense/crit/reduction calculation. Normal player invulnerability/owner protection and mana absorption still apply. Reactive reflection cannot reflect recursively or proc another reactive counter. |
| Âm Dương Nghịch Chuyển | 15 continuously moving small fields plus four moving expanding annuli. Geometry, activity, radius and wave position come from server snapshot; renderer uses those values. One damage application per victim/pulse even when fields overlap. Damage14 with .35s pulse interval. Large central formation is decorative cast dressing. |
| Tiểu đồng đưa rượu | One disciple per current member in the dungeon, up to6, with separate routes and carry/drop/idle cels. Delivery and boss drinking are presentation only; no wine immunity, buff, healing or item consumption inferred. |

Encounter control default follows `COMBAT_SYSTEM.md` §boss control resistance (precise durations were open): immune to stun/silence/disarm and hostile displacement; ordinary damage, defense break, attack break and other applicable damage modifiers retain their existing pipeline. This is explicit encounter-only behavior, not a new rule for ordinary creeps or all bosses.

A living empty boss instance resets HP/position/effects after30 match-clock seconds. Dead bosses use a separate45s respawn deadline from kill, including while empty. Hero death still uses the existing five-second central-arena recovery. Transfer/death/reset clears active boss missiles/hands/confinement as appropriate; events and state remain zone-filtered.

## Rewards and inventory boundary

XP/gold are a fixed shared pool divided among present players who actually hit this boss; eligibility lasts for that fight rather than ordinary creep's short assist window. One item is drawn per kill. The provisional table currently contains only the retained art-backed **Toàn Chân Tiên Tửu** material, so its draw probability is100%; it grants no combat buff or equipment stats.

Solo claims automatically. Shared eligible members choose Roll/Pass within15s; the server draws scores1–100 and uses seeded tie breaking. Leaving forfeits that member's roll. All-pass/empty outcomes leave one ground item, pickup requires living proximity64px. Duplicates remain separate owned slots. Inventory can sell a material for the proposed120 gold, or drop it inside the boss dungeon and pick it up again. Requests contain no trusted price, quantity, owner, damage or roll result, and enforce sequence/slot/id ownership. Four equipment slots remain unimplemented/read-only; no crafting/basic-item shop or other M4 content was added.

## Art and architecture

- `maps/boss_chu_ba_thong.tmj` retains ground and individual scenery, collision and spawn/exit markers. `prepare-chu-assets.mjs` adapts the retained sources and copies exact PNG bytes. No Canvas screenshot is used as the gameplay map.
- `chu-presentation.ts` registers107 Phaser clips/428 nonempty frame references with original pivots/nearest filtering, renders server phase/effect state, and Y-sorts boss/disciples/scenery. Normal gameplay zoom and camera remain unchanged.
- Baseline boss/casts and disciples have four facings. New sweep and left/right punch body groups remain **down-facing only**; their VFX follow the authoritative heading. Spin has real four-pose cels. Missing directional body art is disclosed, not invented or replaced by rotating bodies.
- Protocol14 adds boss destination, a zone-filtered encounter projection, owned material bag and validated loot/item messages. `game-core` imports no Phaser, DOM or Colyseus.
- A server-only HTTP arrangement fixture exists only under `tests/e2e/chu-setup.ts` on test-owned services. It is absent from production routes. The client debug frame fixture changes presentation only, never combat/state.

## Approval guard diagnosis

The previous Forest failure was a line-ending checkout defect: its CRLF bytes match the existing approved hash exactly, while Git's LF-normalized checkout did not. The same issue affected retained skill/beach/arena/desert metadata. Restored text bytes only when LF/CRLF conversion reproduced the recorded hash; no expected hash was replaced and no guard was disabled. Exact-path `.gitattributes` rules preserve those approved bytes on future checkouts. PNGs are unchanged. New Chu approved text sources are protected the same way.

## Verification

Focused core tests:20 deterministic cases. Real SDK test: instance/view isolation, forged/replayed roll, one owned item, authoritative sell and rejection of duplicate sale. Static validator:102 approval inputs,107 clips/428 nonempty frame references, origins, bounds and shared source-map markers.

Two-client iteration passed actual Phaser frame observations, peer movement, all phase presentation, then a legal level30 A-input boss kill and exactly-one shared item. Its107 clips and428 frame references are observed through actual Phaser animation events. Server parking is confined to the frame fixture; natural combat uses normal stats/cadence and production boss HP.

`tools/chu-balance.mjs` ran192 fixed-seed legal default-build probes:1/6 players, levels1/6/15/30, four schools, both basics and three seeds. The crude tangent-avoidance bot cleared6/24 solo level30 runs,24/24 six-player level30 runs (mean3.7s), and21/24 six-player level1 runs. This exposes substantial difficulty spread and party burst; it is **not balanced difficulty or a human clear-time prediction**. No equipment/PvP/general school balance was changed to force a target. Raw probes: `docs/evidence/chu-ba-thong/balance-probes.json`.

No video, GIF or trace recording.

## Changed-file guide

- `packages/game-core/src/chu-ba-thong.ts`, `chu-types.ts`: encounter state, authoritative AI/geometry, cooperative confinement, moving hazards, one-drop transactions; `combat.ts`, `status.ts`, `simulation.ts`, `dungeons.ts`: existing pipeline/lifecycle hooks.
- `packages/game-data/src/chu-ba-thong.ts`, `chu-ba-thong-map.json`, `maps/boss_chu_ba_thong.tmj`: trial definitions and authored gameplay map; dungeon registry adds the single destination.
- `packages/game-protocol/src/index.ts`, `apps/game-server/src/rooms/MatchRoom.ts`: validated messages, private/shared instance projections and state synchronization.
- `apps/game-client/src/chu-presentation.ts`, `chu-art.generated.json`, `chu-hud.ts`, `chu-hud.css`: retained atlas animations, terrain/prop assembly and in-viewport boss/loot/bag presentation; scene/menu/bootstrap files wire them into existing gameplay.
- `assets/approved_chu_ba_thong.lock.json`, `scripts/prepare-chu-assets.mjs`, `scripts/verify-chu-art.py`: pinned preview approval and import/validation; `.gitattributes` preserves the pre-existing approved text-byte hashes. The Thiếu Lâm generated validation report's approved-file count increases from3330 to3432 because the new102-file lock is included, with no Thiếu Lâm art changes.
- `tests/chu-ba-thong.test.ts`, `tests/chu-room.test.ts`, `tests/e2e/chu-ba-thong.spec.ts`, `tests/e2e/chu-setup.ts`, `playwright.chu-ba-thong.config.ts`, `tools/chu-balance.mjs`: deterministic, real SDK, real Phaser and trial balance verification.
- `DECISIONS.md`, `TECHNICAL_ARCHITECTURE.md`, `ACCEPTANCE_TESTS.md`: record this encounter's authorized scope and acceptance boundary.

## Review services

Normal gameplay review is running at <http://127.0.0.1:5409/> with game server <http://127.0.0.1:2809>. Health is200/protocol14 and the client is200. These services have **no test arrangement endpoint**. Test-owned services use2799/5399 and are shut down by their own fixture. Enter through the actual Phó Bản menu described above.

Installed API versions checked before implementation: Phaser4.2.1, Colyseus core0.18.23/schema5.0.42/sdk0.18.8. Consulted official [Phaser Sprite](https://docs.phaser.io/api-documentation/class/gameobjects-sprite), [Phaser atlas loader](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#atlas) and [Colyseus Schema](https://docs.colyseus.io/state/schema) documentation. Phaser4 remains installed.

## Limits and next tuning pass

New sweep/punch body art still needs the other three facings; no generated substitute or rotated body was added. The retained down-facing poses are an integration limitation even though directional VFX and server hits are correct. Runtime visual approval remains the director's decision.

Automated combat is a legal level30 default-build benchmark after an explicit server-side test arrangement; it does not prove a full progression run, long-duration human encounter feel, latency/reconnection behavior or every school/build combination. Deterministic tests cover1–6 participants, but actual browsers were run at2 and6 only. Frame playback coverage uses a parked server and a presentation-only fixture; gameplay/rewards use the real authoritative pipeline separately.

Next proposed tuning work: measure human groups of1/3/6 at representative levels15/30, then choose fixed boss HP/cadence and reward/drop catalogue values. Current192 probes show party burst and solo difficulty spread; increasing HP alone would worsen solo clears. No party scaling, equipment tuning or unapproved wine combat buff was added.


## Final measured results

`pnpm check:final --config playwright.chu-ba-thong.config.ts` passed asset preparation, TypeScript project compilation, test/tool typechecks,18 workflow checks, **411 unit/integration tests**, production build and **all14 asset validators**. The first full run exposed a core-boundary type-only import syntax violation; it was fixed with a static `import type` and the complete unit/build/asset stages passed on the next run. Its browser stage initially failed because the hand-observation party stood in both palm axes and died; no production damage/geometry was weakened. The raw failed run is retained in [check-final-stages.json](evidence/chu-ba-thong/check-final-stages.json), not relabelled as an uninterrupted green command.

Following fixture/assertion-only fixes, `pnpm exec tsc -p tsconfig.tools.json --noEmit` and `node tools/run-playwright.mjs test --config playwright.chu-ba-thong.config.ts` passed. The final six-client case took129.790s and observed107 clips/428 frame references, an actual arrow-key projectile dodge with unchanged projectile velocity/HP, moving server fields aligned to rendered sprites, spin body cels/position ghosts, all hand stages, one natural peer death/recovery/reentry, a real A-input boss kill, exactly one owned reward, private isolation/solo rescue and960×600 in-viewport overlays. No page/console errors. The extra ranged observation initially sampled after close-range contact; the test witness was placed250px away rather than altering the projectile. See [verification.json](evidence/chu-ba-thong/verification.json), [two-client report](evidence/chu-ba-thong/report-2-players.json) and [six-client report](evidence/chu-ba-thong/report-6-players.json).

Actual Phaser PNGs opened for visual inspection: [arena](evidence/chu-ba-thong/arena-6-players.png), [hands impact](evidence/chu-ba-thong/hands-impact-6-players.png), [spin](evidence/chu-ba-thong/spin-6-players.png), [moving ultimate fields](evidence/chu-ba-thong/ultimate-6-players.png), [dodged palm](evidence/chu-ba-thong/palm-dodge-6-players.png), [boss death/one reward](evidence/chu-ba-thong/natural-combat-loot-6-players.png), [narrow private viewport](evidence/chu-ba-thong/private-960-6-players.png). HUD stays inside the viewport; dense six-player names/effects can overlap at close range. The fast spin can leave a player's follow camera; the retained PNG samples its rebound. Screenshots support visual review; live frame/state assertions provide motion/authority evidence.

All102 reviewed hashes still match; no approved tracked PNG changed. Forest approval guard now passes its original hash after exact CRLF restoration; [restoration audit](evidence/chu-ba-thong/approved-byte-restoration.json) is preserved. `git diff --check` passed. No new videos/GIF/recordings. No claim of final human balance, four-direction attack-body completion or director runtime art approval.
