# Tây Độc feedback03 — Phaser / authoritative encounter

Worktree/branch: `wip/m3d/tay-doc`. No merge, push or deployment.

## Play the encounter

Run `pnpm dev:tay-doc`, then open http://127.0.0.1:5398/?debug=1 in one to six clients. Create/join the same room, select schools and confirm. Arrow keys move, A attacks, QWER use unlocked skills. The dedicated helper uses server2795/client5398; it only enables the real DEV encounter spawn. It has no HP, position, phase or cast mutation endpoints. The normal invasion clock remains180seconds. Stop the helper with Ctrl+C; it closes only its own services.

The production gate waits for wave10 and all living invasion enemies through that wave to clear, followed by8seconds of rest and actual `tayDocGate.completeChapter('dong_ta')`. The repository does not yet have the complete ordered chapter boss director/Dong Tà completion flow. The hook is implemented and tested; it deliberately does not invent that predecessor victory. The DEV helper makes this encounter immediately playable without bypassing that production rule.

## Retained art and directional audit

`assets/reviews/tay_doc_v02/director_approval.json` freezes593 inputs. Preparation and validation check every SHA256 and copy exact retained PNG/atlas bytes. Historical gallery cels are not blanket-approved. The original design/choreography approval remains distinct from runtime director approval.

| State | Runtime source | Status |
| --- | --- | --- |
| Phase1 idle/walk/death, all4facings | retained `p1` | retained baseline; no clipped old attacks selected |
| Four-part transition, all4facings | retained `transition` |64cels retained |
| Crawl/hop/exhale right | approved `cap_mo_v02` |12cels retained |
| Staff sweep/palm right | approved `actions_v02` |8cels retained |
| Crawl/hop/exhale/staff sweep/palm left/up/down | `assets/exports/bosses/tay_doc_runtime_v01` |60new original candidate cels /15clips; runtime director review pending |
| Pillar heads | approved `feedback01/snakes_8` |8authored directions; fixed base, no character rotation |
| Staff arc | approved `feedback01/staff_180` |180° frontal warning/sweep |
| Remaining effects | approved phase1/phase2/transition +`effects_v02` | retained raster bytes |

The five missing pose groups were drawn as new flattened PNG sources, extracted with nearest sampling to160×144cels, feet pivot80,116. Source hashes, exact generation prompts, extraction recipes, atlas and provenance are retained under `assets/source/bosses/tay_doc_runtime_v01` and `assets/runtime/tay_doc_directions_v01.json`. They are not layered Aseprite files. No mirroring or rotation substitutes for these body facings.

Shared cast poses are explicit: phase1 skills reuse the new staff sweep; phase2 palm uses palm attack, stomp/eruption use hop, stationary channel uses exhale. These are pose reuse, not claims that every spell has a bespoke body animation. Phase2 death retains baseline phase2 death. Warnings and VFX distinguish the skills. The renderer seeks authored cels from server timestamps; animation never triggers hits. Feet determine body depth even during a cosmetic hop. PNG floor warnings are fitted to server geometry, not used as collision masks.

## Authority and confirmed behavior

`game-data/src/tay-doc.ts` contains validated tuning; `game-core/src/tay-doc.ts` owns the deterministic encounter. The server publishes one arena-scoped MapSchema projection with monotonic world ticks/cast/entity IDs. Removing the projection on zone transfer also deletes the client map entry. No new client combat/phase/damage/summon messages exist. Protocol is18.

Boss enters from west at world(80,616) along the brick road, then fights living arena heroes. Every hazard and pillar shot uses this target class; the statue is never a fallback. Cast aim is captured, shots fly straight with swept hero/wall tests and first-hit deduplication. Server collision owns placement and movement.

- Staff: frontal180°, radius160, one hit per target/cast; no rear-center hits.
- Needles: cone warning,3volleys ×9needles, slow and one refreshed poison schedule per victim.
- Mist:8seeded, collision-valid pool positions with warnings; pools last8seconds, tick once per second and refresh slow/poison on contact. Failed full placement refuses the cast rather than emitting fewer pools/pillars.
- Curse: exactly one mark for4.5seconds. At detonation, sample that hero’s **current maximum HP**, remove25% directly (fraction preserved), bypass defense, shields, dash evasion, protection, mitigation and counters. It can kill. It is separate from cleanseable statuses. The marked player is excluded from the normal ally explosion. Nearby other living arena heroes receive normal damage+poison, no mark and no chain propagation.
- Pillars: exactly6normal combat targets with HP; A/QWER can damage/destroy them. Each turns through8directions and fires one ray every1.35seconds on a fractional40.5tick schedule (40/41ticks at30Hz), speed390, range663. A destroyed pillar stops new shots; existing shots finish their straight trajectory. All shots disappear on encounter termination.
- Phase2: once, strictly below50%, with a69tick human Cáp Mô transition. No transition invulnerability. The previous uncommitted cast is canceled; already released pools/pillars/shots persist. Only the new phase2 rotation is selected afterwards.
- Stomp: circle405, warning then hollow shockwave, poison+stun. This AoE uses circular distance; it is not a dash/lane attack.
- Stationary channel:10volleys,16directions each, speed130.05, range484.5 (~3.72549s). Eruption:3collision-checked jumps,16directions on each actual landing, speed218.025, range484.5 (~2.22222s). Ending the body cast never truncates the final volley’s lifetime.

## Lifecycle and provisional choices

Death removes a hero’s mark/poison before respawn. Disconnect cancels that departing hero’s mark without an explosion: this game removes the hero and all unsaved progression, with no reconnect continuation. A living marked hero who tries dungeon travel pays the25% loss **before** transfer, without a cross-zone ally explosion; a lethal settlement stays dead in arena. Ordinary travel resets statuses through the existing transfer path. No stale mark detonates on a respawned hero.

Boss death cleans owned hazards, summons, statuses and cast immediately, retaining a short death presentation before removing the corpse. Existing kill/assist XP/gold sharing executes once. No item, loot roll, dungeon reset or boss respawn is added. Match defeat/room disposal also removes the boss actor. With no living arena target, casts stop and pillars stop firing; released hazards expire normally, and the boss never attacks the statue.

Trial tuning: HP2600, defense12, speed92→145, phase2 damage×1.25, rest0.8s, individual cooldown6s, pillarHP100, poison6HP/sec for3s, slow25% for2s, stun1.2s, CC duration scale0.2, reward pool800XP/240gold. Attack damage is20/16/8/8/22/12 in phase1 and20/24/10/14 before phase2 multiplier. These numbers remain provisional. HP does not currently scale with party size. Committed casts finish through ordinary CC; stun blocks new casts/ordinary movement while active; silence blocks new spells and disarm blocks new basic attacks without rooting movement; slows affect approach speed; forced displacement is resisted, and phase transition/death cancels the cast. Pillar damage inherits the phase2 damage coefficient when firing during phase2.

## Verification and evidence

- `tests/tay-doc.test.ts`: deterministic mechanics, threshold, hazards, damage, swept collisions, lifecycle, rewards, gate and defeat.
- `tests/tay-doc-room.test.ts`: actual SDK peers, A destructible pillars, replay/forged-message rejection, zone-scoped deletion and cleanup.
- `playwright.tay-doc.config.ts`: real Phaser, separate test services2798/5399 and test-process-only loopback fixture2799; video/trace disabled. Two-client arranged poses are explicitly separate from six-client natural input combat. Fixture code is only under tests and never part of the shipped server.
- `scripts/verify-tay-doc.py`:593approved hashes,60distinct bounded candidate cels, all directional clips, exact public copies and playback registry.
- `tools/tay-doc-balance.ts`:192runs (3seeds ×4levels ×8basics ×1/6players), normal inputs, legal default branch/rank gates, no combat HP/position overrides. DPS uses actual boss HP loss, not overkill event damage. Received damage is reported event damage and may include lethal overkill. The baseline uses the real invasion arena/statue with the180s clock, so no invasion arrives in60s. Existing M1 practice creeps remain; aggregate gold/XP can include their kills as well as the boss, and XP is capped at level30. There is no equipment. Single boss-pool settlement is tested separately. Simple bots do not model coordinated human dodge/curse isolation.

Runtime PNGs and reports live in `docs/evidence/tay-doc/`. `frame-observations.json` records observed cels and directions; `six-player-natural.json` records actual joins, keyboard combat, transition, rewards and errors. `balance.json` contains trial config, per-run outcomes and summaries. See `validation.md` for commands/results from the final pass. Runtime art approval remains pending director inspection at normal zoom.
