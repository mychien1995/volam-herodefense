# Nam Đế gameplay integration

Worktree `C:/Users/ADMIN/.codex/worktrees/nam-de/volam-hero-defense`, branch `wip/m3d/nam-de`. No merge. Runtime art approval is **pending director review**.

## Scope and invasion audit
Existing InvasionDirector tags creeps by wave/lane and schedules invasions independently every 180 seconds. It had no chapter-boss gate. This change adds only the wave 15 living-creep clear/rest latch and one arena boss, entering from the south. Other chapter bosses and M5 are not implemented. Invasions can overlap Nam Đế. Only living arena heroes are targets; the statue never enters Nam Đế's damage candidate set. Empty arena waits; no dungeon pursuit. Common kill/assist gold/XP pools are reused, without dungeon items or loot rolls.

## Confirmed combat rules
- Nhất Dương Chỉ removes 90% maximum HP directly; failed Đại Lý Phong Huyệt removes 70%, bypassing armor, damage reduction and mana shields. Existing hit avoidance can evade the beam; QTE failure is forced HP loss.
- QTE has 10 physical arrow keys / 5 seconds, locks movement/combat input and grants incoming-damage immunity while pending. Correct completion unlocks and closes immediately. Wrong/timeout closes immediately, triggers world explosion,70% loss and 2-second stun. Boss heals 10% maximum HP only on wrong/timeout, capped at maximum.
- Barrage: 4 simultaneous fixed directions 90 degrees apart,27-tick warnings,24-tick volley interval,16 volleys / 64 rays and384-tick full turn. Directions stay fixed after warning.
- Instant small finger picks the farthest living target at release and flies straight. Palm is a wide/long swept shockwave. Phật Quang is one expanding centered ring.
- Confusion uses one server-owned arrow permutation for 300 ticks; physical QTE input is separate. Sky ultimate schedules 32 fixed strikes. Requested 0.28-second warning rounds up to 9 ticks / 0.30 seconds at 30 Hz.

## Authority and presentation
`game-core` owns seeded RNG, AI, cast IDs, positions/collision, timing, hit sets, damage/heal, QTE and statuses, without Phaser/DOM/Colyseus imports. Arena-only NamDeRuntime is optional in DungeonMatch. Protocol 18 projects world effects through BossEffectState and owner-filtered NamDeControlState. The strict per-key input accepts challenge ID/index/arrow, never success/damage/heal. Cleanup covers death, transfer, disconnect, boss death and immediate final-leave cleanup before an empty room pauses ticks.

Phaser samples retained raster frames from authoritative ticks, including release cels starting at activeAt. It does not determine damage from animation frames. World ray dimensions never depend on viewport dimensions. Existing arena/camera/controls remain, with HUD/QTE inside the single viewport. Feet pivot is(80,88) on160 × 112; nearest sampling, Y-depth and4 facings are preserved. A bounded 256-ray inspector history records received geometry for asynchronous multi-client observations; it has no gameplay authority.

## Artwork reuse
Source is `assets/reviews/nam_de_v02` feedback03. The 208 actor cels / 52 directional clips, atlas/pivot, clean thin beams and cropped telegraphs remain byte-identical. `assets/approved_nam_de_feedback03.lock.json` pins consumed sources; preparation copies runtime PNG/JSON without regenerating artwork.

Manual final PNG review found neighbour arcs already baked into plain_ring cels 1–3. Runtime uses the intact cel 0 as one centered expanding scale/alpha pulse, with measured alpha bounds. Later cels remain preserved/loaded but unused for that pulse. No original PNG or atlas was edited. Superseded v01 skill choreography is not reused.

## Provisional tuning
Tuning is in `packages/game-data/src/nam-de.ts`, validated on load. Initial boss HP 30000 / defense 60 / control resistance 65%; rest 10 s, movement 30 px/s, dash 1000 px/s / 64 px rear / 12% per action. Raw damage: palm 65 / ring 50 / small 45 / barrage 55 / sky 60. Ring radius 180; palm range 720; world ray cap 2000. Common reward pool: XP 3000 / gold 1800. These difficulty/economy values are provisional, distinct from the confirmed mechanics above.

## Actual validation
| Command | Result |
| --- | --- |
| `pnpm check:final --config playwright.nam-de-gameplay.config.ts` | PASS, exit 0, 301.05s |
| Final unit/integration tests |492/492 across 43 files |
| Workflow checks |18/18 |
| Production build and asset validators | PASS;16 validators |
| Final browser profile |3/3:2 clients, 6 clients,ring visibility/geometry |
| `python assets/reviews/nam_de_v02/verify_assets.py` | PASS, retained/source/cropped-cel checks |
| `python scripts/verify-nam-de.py` | PASS, pins/208cels/pivot/runtime bytes/ring bounds |
| `pnpm --filter @volam/game-server exec tsx ../../tools/nam-de-balance.ts` |384 runs, 22 clears, 57 surviving parties, 0 items |

Browser evidence includes different 1280×720 / 1024×768 viewports, identical received world warning geometry,4 barrage facings,64 barrage rays,4 thin-beam cels, physical 10-key completion with a menu input focused, wrong/timeout immediate close, continuing world explosion/stun, recovered movement, ability phases, overlapping invasion, physical-A boss kill/rewards and no items. Browser error lists are empty. Final death-cel samples are recorded exactly in verification.json;2-client acceptance requires all 4 cels,6-client acceptance requires every client reach authoritative death/final cel.

Balance uses 3 seeds, levels 1 / 6 / 15 / 30, all 4 schools / two basics, legal default/mixed-style builds, solo / 6. Maximum measured DPS 1612.97;22 clears took 18.63–59.67 seconds. Bots stand still, have no equipment and do not dodge/chase; this is diagnostic evidence, not a human difficulty verdict.

## Evidence and limits
Final timings: `docs/evidence/nam-de-runtime/final-check.json`; acceptance summary: `verification.json`; actual per-profile frames/geometry/state: `2-clients-observations.json` and `6-clients-observations.json`; balance: `balance.json`. PNGs cover all presented abilities. No video, GIF or screenshot-playback trace was generated.

Earlier attempts are retained: an old protocol 17 assertion was updated; a 2798 port conflict belonged to QA in another worktree and was left untouched; transient ray reads were replaced by received-geometry history; short death-cel sampling was separated from6-client synchronization. The final complete pipeline above passed after the final ring change.

Gate checks use an accelerated server-only fixture, not a 45-minute real-time match. Loaded/pinned 208 cels are not a claim of exhaustive natural combat playback in every facing. Runtime imagery and human difficulty tuning remain pending approval. The build retains its existing large-client-bundle warning.

## Installed versions and official APIs consulted
Phaser 4.2.1, Colyseus core 0.18.23, SDK 0.18.8, Schema 5.0.42. Consulted official [0.18migration](https://docs.colyseus.io/migrating/0.18), [Schema](https://docs.colyseus.io/state/schema), [Sprite](https://docs.phaser.io/phaser/concepts/gameobjects/sprite) and [animations](https://docs.phaser.io/phaser/concepts/animations) before integration.
