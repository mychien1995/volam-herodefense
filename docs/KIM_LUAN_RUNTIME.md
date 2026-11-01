# Kim Luân Pháp Vương · Tương Dương

Implemented in `wip/m3d/kim-luan-phap-vuong`, current worktree. No merge/deployment. The feedback_02 director approval and246 pinned source/export/review files remain unchanged. Runtime/combat balance approval remains pending; the historical export manifest is intentionally unchanged.

## Enter the real game

Run `pnpm dev` from this worktree and open the Vite URL. Create/join a room, start and confirm a school. Choose **Phó Bản → Kim Luân Pháp Vương · Tương Dương → Riêng / Chung → Vào Phó Bản**. Private is one player; shared supports six. Arrow keys move, A attacks, QWER use learned slots. Walk to `(640,670)` and press Space to exit. The existing normal integer display scale, nonrotating camera and full viewport overlays are retained.

## Authority and lifecycle

`packages/game-core/src/kim-luan.ts` runs after the existing world step in each dungeon instance. Actors use the existing creep, targeting, damage, statuses, contribution and death pipeline. Controlled/boss flags prevent generic AI/respawn/rewards. Hoắc Đô and Đạt Nhĩ Ba start together. The server checks both HP values before creating Kim Luân exactly once. Either kill order works; corpses do not independently respawn.

One ward moves between the disciples every4seconds, with60% damage reduction on its sole holder. The survivor inherits it on the next server step. Hoắc moves at155px/s around the nearest living player; Đạt moves at38px/s toward a protective position between Hoắc and that player. Existing boss flags confer control/displacement immunity. These combat policies are provisional configuration, not a new global school rule.

An empty instance cancels transients immediately and resets the whole encounter after30match seconds. Final defeat uses a separate45match-second respawn deadline, including when empty. Re-entry cannot create a duplicate boss. Travel clears hero statuses through the existing adapter; departed/dead cage targets release on the next step. Whole-party death and match defeat clear encounter hazards. RNG streams remain private to each seeded zone.

## Approved geometry and trial combat policies

- Thiết Phiến:3strikes×4rays,440px/s,0.6s warning,0.5s strike spacing,3.6s action cadence and2s projectile life. Captured headings rotate between strikes/casts. The blade has a48px transverse half-width and10px longitudinal half-width; swept contact expands by the hero footprint. Wide angular gaps remain.
- Five gusts span160° at280px/s and apply50px knockback plus30% slow for1.4s. Five front/five rear nails travel620px/s. Each projectile/target contact is consumed once. Poison escalation counts **actual HP loss** per cast/target; immunity, evade and fully absorbed hits do not advance it. Damage scales8/16/24/32; the fifth confirmed contact uses a lethal raw hit through the common defenses/shield/death pipeline. No direct HP assignment implements this mechanic.
- Spin emits eight radial nails every0.3s for3s, using real spin poses. Đạt's sweep is frontal180°/210px. Ground fissure captures its origin/direction, reaches650px and activates0.5s after the slam impact. Boulder speed720px/s uses relative swept collision. Triple slam has separate100/190/330px pulses and per-pulse hit sets.
- Basic Kim fan has five straight wheels from the captured feet position. Truy Hồn has exactly five20s bouncing wheels at260px/s; orbit has five wheels at radius145/6rad/s for3s then releases at680px/s. Persistent wheel contact cooldown is0.65s (20ticks at30Hz); ordinary projectiles hit each target once.
- Cage has90HP. The captive's attacks cannot damage their own cage; allies' legitimate A/QWER use normal targeting/collision/damage. Solo auto-release is2.2s; otherwise release on break/death/departure/4s timeout. If the last ally dies/leaves, the solo deadline is armed. The captured4s shockwave warning remains and can be dodged after rescue; it never retargets. Cage HP is visible.
- Chấn Thiên has three thin expanding ground ripples,900px/s,0.28s apart, max horizontal radius280. The ground ellipse Y ratio is0.4. Circle-shaped hero footprints and previous/current positions are tested against the swept ellipse annulus; there is no radius/ellipse-ratio horizontal inflation. Renderer uses the approved measured per-cel pivot/radius, not768px canvas bounds. Stun is0.35s per valid pulse.
- Bát Nhã creates five seeded rocks fixed during each cast. Normal uses12lanes×3rows,0.45s row spacing; enrage uses14×4/0.32s. Both have three alternating down/up volleys at480px/s, with transition warnings and time to switch shelter sides. Each lane's nearest upstream rock terminates the elephant before the shelter plane; downstream targets cannot be hit by that stopped elephant. Real run_up/run_down sprites are retained.
- Thập Tầng activates once strictly below30% HP. It moves at160px/s while firing five wheels every1.8s at430px/s, with captured release origins/headings. It owns one herd director; no normal/enrage director stacking.

Trial HP: Hoắc1100, Đạt1600, Kim4200; defense10/16/18. Encounter difficulty is fixed for1–6players. All tuning lives in game-data and is validated. Final Kim defeat divides one fixed1200XP/600gold pool among present contributors across the encounter and draws exactly one item. Disciples do not grant duplicate rewards. Trial item **Kim Luân Tàn Phiến** is text-only material, sell120gold, with no invented equipment stats/crafting/icon. Existing Chu roll/pass/pickup/drop/sell backend is reused, including seeded ties and replay/ownership checks; four equipment slots are unchanged.

## Art and transport

`scripts/prepare-kim-assets.mjs` verifies the exact approval lock, copies retained PNG bytes and derives filtered atlases. All184selected frames/53clips load; the24excluded candidate cels never register. Map runtime visibility/opacity is normalized in a derived map; ground and independently placed props remain separate. The locked north/west/east collision proposals are adopted as server rectangles with spawn/exit/reachable-ground tests. Roof/prop canvas rectangles are not used as collision.

Four-facing idle/walk and true Hoắc spin are available. Action bodies mostly face down; there is no new hurt/death artwork. Hit tint/damage text and corpse omission are disclosed integration conventions. No body mirroring/rotation invents missing art. Ground ripples stay beneath actors; feet Y controls body/prop depth. `assets/runtime/kim_luan_feedback_02.json` records provenance and these limits.

Protocol16 extends the existing BossEffectState map for hazard deltas; static future volleys/rocks are not retransmitted as a large JSON blob every tick. Dungeon JSON carries only phase/casts/loot summary. Existing StateViews filter both effect entities and Kim encounter summaries to the current zone. A128KiB initial encoder buffer accommodates dense boss snapshots. No new room, client damage/location command, or production fixture endpoint was introduced. Test-only fixture routes and the frame hook exist only in the dedicated Vite QA service/compile flag.

Installed Phaser4.2.1 / Colyseus core0.18.23 / schema5.0.42 / SDK0.18.8 were checked before API changes. Official references: [StateView](https://docs.colyseus.io/state/view), [Phaser AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager).

## Verification evidence

Focused core/SDK checks cover both gate orders, unique ward, escalating/lethal nails and immunity, straight/swept shots, three slam extents, orbit release, wheel bounce/cadence, ellipse dodge gaps, ally/solo cage policy, seeded rock blocking, strict enrage/move+fire, fixed rewards, private/shared isolation and reset/respawn. Asset tests verify all246hashes and exact selected atlases/PNG copies.

`tests/e2e/kim-luan.spec.ts` runs real clients:53native Phaser clips/184frames with timestamped observations; actual server hazards/enrage/Space exit; two-client movement/combat/isolation; and six-client ordinary-keyboard combat. Frame/phase fixtures are labeled separately and never count as natural boss kills. PNGs and JSON are under `docs/evidence/kim-luan-runtime/`. No video/GIF/trace screenshot streams are generated.

`tools/kim-luan-balance.ts` runs192input-driven seeded cases (three seeds, eight legal basic styles/four schools, levels1/6/15/30, one/six players). Same-school mixed-style custom slots respect actual rank/point gates. Normal deaths/re-entry are preserved. Bots measure damage, ranged hits, dodge reactions and transitions; they do not prove director balance approval. Final-state results and full pipeline status are recorded after the final checks.

The earlier beach guard failure was proven to be LF versus retained CRLF: converting only `assets/tilesets/beach/terrain.tsj` recreated existing expected SHA256 `3f77f94292b30f7a3661058613e001bd4dc21f4aaff309bf9f81233055219922`. Its exact bytes were restored and its eol policy pinned; expected hashes/guards were not changed.

## Final measured result — 2026-11-01

`pnpm check:final --config playwright.kim-luan.config.ts` **PASS**,335.68s:18workflow tests,460unit/integration tests across39files, production build, all14asset validators and all3browser cases. Preparation wrote0files/5102unchanged. The first attempt stopped at a Phaser4 tint method type mismatch; corrected before this complete pass. No guard was disabled.

The six ordinary-input browser clients naturally reached disciples → boss → Thập Tầng → defeated, with all three actors at0HP and one Kim Luân Tàn Phiến drawn. Normal death/arena respawn/re-entry occurred. Only the three present contributors at the final kill shared the fixed pool; the one eligible roll was still pending when that browser test ended. The separate SDK room test settles a legitimate roll and verifies ownership, replay rejection and sell behavior. No combat HP/position fixture was called in the natural run. The184frame/53clip test and explicit phase PNGs are separate fixture evidence.

The final192seeded120s simulations produced130clears,174boss transitions and139enrage transitions. Level1solo cleared0/24; level30solo20/24; six-player groups cleared21/24 atlevel1 and24/24 atlevels6/15/30. All point allocations were legal. These heuristic outcomes expose the large party-size advantage and do not approve final balance.

Read `docs/evidence/kim-luan-runtime/verification.json`, `frames-and-runtime.json`, `six-clients.json`, `balance.json` and `visual-comparison.json`; pipeline stage timings are in `docs/evidence/sessions/kim-luan-runtime-final/check-workflow/final-timings.json`. Actual PNGs were opened and compared with feedback_02 and world references. Closely clustered melee labels can overlap; down-facing action/hurt/death-art limits remain disclosed. All246approved hashes were checked again after final validation.

A normal game service is available locally at http://127.0.0.1:5394/ with compiled authoritative server on2794; this is separate from the stopped QA services and contains no test fixture endpoint/hook. No merge/deployment or runtime director approval is claimed.

## Director approval for milestone integration

The director approved the implemented encounter with “duyệt, hãy tích hợp nó vào milestone/m3d”. See `assets/reviews/bosses/kim_luan_phap_vuong_v01/runtime_approval_2026_11_01.json`. This supersedes the pending runtime-review status in the historical verification above. The246preview pins remain unchanged. Combat numbers retain their disclosed trial status.
