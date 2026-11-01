# Approved animation integration — 2026-11-01

Final status: **INTEGRATED_VERIFIED**. The complete final command passed:386 unit/integration tests,18 workflow tests,12 validators and6 live browser cases. Exact15 approved/100 retained hashes remain intact. No merge/deployment/recordings.

Worktree: `C:/Users/ADMIN/.codex/worktrees/animation-change/volam-hero-defense`; branch `wip/m3d/animation-change`, based on `b376bc51ef9102a7db68288a5d4a6e5ce9127622`. Source checkout `D:/Projects/volam-hero-defense` remains on `milestone/m3d`. No reset, clean, merge or deployment.

## Authority and provenance

The director's current instruction explicitly authorizes integration and supersedes the earlier temporary deferral. `ANIMATION_REVIEW_V01.md`, the approval register and preview verification summary remain historical snapshots. All13 reviewed selections were approved:10 revised and3 comparisons. No pending label from an older export is treated as a new approval gate.

The missing preview was transferred as individual approved assets/modules/tests/evidence. Only preview import/scene-selection/display-scale/debug-inspection hunks were ported into `main.ts`; the whole file was not copied. The15 approved file hashes and100 retained-reference hashes are checked before preparation. Existing CRLF bytes were restored from the source only after SHA verification (protected files) or a newline-only comparison; this avoids Git checkout normalization invalidating raw-byte art locks. Newlines were not normalized inside approved files. Git attributes also retain the exact bytes of the15 newly approved files across later checkouts; filtered/raw Git object comparisons passed for all15. The new guard runs after runtime atlas copies so a missing generated public file can be prepared before hash verification. No art was regenerated and no proprietary assets introduced. Source PNGs, generation provenance, export atlas JSONs and the original approval register are retained.

Installed APIs consulted: Phaser4.2.1, Colyseus core0.18.23, Schema5.0.42 and SDK0.18.8. Official animation/Schema documentation and installed declarations guided integration. The deterministic core remains independent of Phaser, DOM and networking. Existing status JSON now carries accumulated actual loss/threshold; the network Schema layout and controls remain intact.

## Server changes and provisional values

| Skill | Authoritative behavior / data |
| --- | --- |
| Liên Hoa Phiến | Fixed owner-only field at cast feet. No enemy damage. Immunity including DoT and increased HP regeneration only at feet distance <=radius; out/in toggles immediately. Rank1:6s, radius85, +8% maxHP/s,15s base CD; ranks +5radius/+2 percentage points regeneration with existing rank CD reduction. Provisional numerical tuning, not director-approved final balance. Strongest field only; recast replaces, does not stack. |
| Phong Ảnh Hoán Vị | Existing65unit/650unit-per-second swept dash travels opposite captured facing. Facing, movement-only dash immunity, existing counter and other mechanics unchanged. Phi Ảnh remains forward. |
| Vạn Kiếm Quy Tông | Initial configurable5s channel,13 bursts at400ms spacing,8 straight piercing swords per burst. Damage54/rank+9, range460/rank+5, mana42 and base CD510ticks unchanged. No old melee damage or homing. Projectiles remaining after channel end finish their real flight unless cancelled. |
| Tọa Sát Bác Đồ | Up to5s,70% reduction, store exact actual HP decrement after all mitigation/absorption. Release once at expiry or strictly >20% maxHP; equality stays guarded. Use exact stored sum, including fractions, without caster growth/crit, reapplying70%, or normal integer minimum/rounding. Enemy defenses still apply. Base mana14/CD180ticks unchanged, radius110/rank+5. Recast while guarded is ignored without spending mana or clearing accumulation. Reactive counters cannot recursively trigger; dead/travelling/removed/cancelled owners do not release. |

Liên Hoa's rank1 theoretical additional healing is48% maxHP over6s if continuously inside and injured, plus pre-existing regeneration; entering/leaving and HP caps reduce that. With15s base CD, continuous immunity is not offered by default. No balance conclusion is inferred from the preview's duration.

## Presentation adapters

All original PNG cels and immutable review cue plans remain unchanged. Gameplay adapters fit cue windows to real authoritative actions/lifetimes; scripted preview positions, damage and target flashes are never executed as combat.

- Lotus uses approved opening/loop/fade at server field coordinates, scaled to the real field diameter. Protection cue follows its owner only while the authoritative feet are inside.
- Phong ghosts sample actual server/interpolated retreat positions; six short light echoes retain the owner's actual costume, including mixed skill builds. Pose/wind timing fits the existing fast dash rather than changing server speed to match a scripted displacement.
- Thất Tinh draws all seven sword gathers/strikes from the reviewed plan, fitted to its existing four-hit channel. The seven visual swords create no additional hits.
- Vạn Kiếm draws real received projectile positions/headings with reviewed sword travel cels. Gather and dissolution accompany the real channel; server hits alone trigger contact impacts.
- Tọa Sát sheath/readiness loops follow guard state. Received flashes and unsheathing/radial release follow `guard_received`/`counter_release`, on both caster and observer.
- Đại Lực retains its12tick delayed arc and combo. The approved straight flying hand is fitted to that windup; it does not add a projectile or extra damage. Impact requires a real hit.
- Tam Giới keeps its three-seal/slash cues; armor-break persistence follows confirmed status.
- Đao A uses the approved first attack's body/contact/recovery on each accepted server attack. Cosmetic pose duration fits real cadence and respects the existing6attacks/s floor; no cooldown/attack-speed rule is changed.
- Bất Động retains its existing instant healing pulse. Approved opening/afterglow/ending remain readable cosmetic playback; no four-second buff or repeated healing is invented.
- Như Lai retains one real wide projectile and its existing ally-defense effect. Seven staggered palm echoes follow that projectile; confirmed hits supply handprint impact and departure supplies a fading travel ending. No additional hitboxes/buffs.

Accepted attacks can interrupt cosmetic body poses. Stun/death, owner removal, zone changes, build revision, effect expiry, defeat and scene shutdown clean views. Ground cues render on a floor layer below every actor, rather than using the caster feet depth and covering a northern neighbor; actor/prop Y-depth remains unchanged. Existing controls Arrow/A/QWER and viewport-contained HUD/menus remain. No new exterior panel or map shrink.

## Verification

Commands, results, PNG comparisons, frame observations, limitations and final stage details are recorded below and in `docs/evidence/animation-change/verification-summary.json`. Failed iteration evidence is retained and distinguished from final successful observations. No WebM/MP4/GIF/video/trace recording was created.

## Balance probe limits

`tools/animation-change-balance.ts` runs144 fixed scenarios: seeds42/1337/9001, all four schools, both normal styles, levels1/6/15/30, legal mixed loadouts/ranks filtered by gates and available points. Three stationary armor5 targets,12s combat, identical raw20/s external pressure, no equipment. This isolates mechanics and does not model optimal play, dodge, economy, boss clears, PvP, or full campaign balance. Existing regression tests cover shared rewards/scaling and straight projectile mechanics; no new balance acceptance for those systems is claimed.

The Võ Đang probe reaches about503–1084 total target DPS at level30; ranges depend on normal style, crit seeds and close target overlap. Other tested level30 ranges: Cái Bang624–931, Thiên Sơn300–935, Thiếu Lâm275–868. These are different legal school builds, not a controlled before/after causal estimate. Close multi-direction sword overlap is a follow-up balance risk; no unrelated school/skill damage was adjusted to force parity.


## Measured commands and repaired fixtures

- `pnpm check:quick tests/animation-change.test.ts tests/thien-son-skills.test.ts tests/vo-dang-skills.test.ts tests/m3c3-feedback.test.ts`:106 passed during core iteration. Subsequent fractional-reflection and non-refresh guard cases were included in the final unit scope.
- `pnpm check:quick tests/animation-change.test.ts tests/vo-dang-room.test.ts`:24 passed after fractional-expiry and real SDK early-release fixtures were completed; the later active-recast case also passed in the full unit run.
- `pnpm check:final --config playwright.animation-change.config.ts`: preparation, project/tool typechecks and18 workflow checks passed. The386-test unit/integration stage had384 passed and2 failures from old assumptions. It stopped there; this command is **not reported as an exit0 full pipeline**.
- The multi-school reward fixture used old damaging Liên Hoa; it now uses unchanged Lục Dương for that damage-participation assertion. `pnpm check:quick tests/dungeons.test.ts tests/thieu-lam-room.test.ts`: the room test passed, while the dungeon test still exposed its obsolete queued Vạn Kiếm expectation. The queue cleanup test now uses explicitly paced local projectile data. `pnpm check:quick tests/dungeons.test.ts`: all15 passed. Thus all386 unique unit/integration tests have successful coverage after the two fixture corrections.
- `pnpm verify:assets`: all12 validators passed, including source/PNG/atlas/frame/duration/pivot/provenance locks. Unrelated historical validation metadata was preserved after recording current results.
- `pnpm exec tsc -b`, `pnpm exec tsc -p tsconfig.tools.json --noEmit`: passed for the final implementation and affected test/helper changes. `pnpm check:browser --config playwright.animation-change.config.ts` and the focused invocations in the JSON summary rebuilt the production client and exercised the actual Phaser client. The existing large-client-chunk warning remains.
- `pnpm --filter @volam/game-server exec tsx ../../tools/animation-change-balance.ts`:144 deterministic legal-build probes completed; output retained in `balance-probes.json`.
- `pnpm assets:prepare`:115 exact approved/retained hashes passed,0 outputs rewritten/4710 unchanged. Raw/filtered Git object hashes match for all15 newly approved files.

Browser iteration repaired a cold-join15s deadline, a7s wall-clock expectation for a150tick guard under machine load, and a helper that tried to click disabled Apply when the server already held the requested loadout. Those changes do not fabricate casts or bypass server costs. The dedicated natural profile now uses canonical180s invasion spacing instead of the inherited accelerated30s fixture, and retains the existing development statue-HP fixture. Its scope is skill combat/readability, not statue/campaign balance. Errors and failed iteration reports remain available; they are not relabelled as successful runs.

The final approved art status is unchanged. Measured animation integration verification is separate from art approval. PNG screenshots were opened and inspected: lotus placement, new straight gold palms, radial silver-blue swords and natural six-player contact/readability. The ground-layer overlap found during PNG review was corrected without changing artwork, opacity or gameplay. Motion/cleanup claims come from observed frames/events/states, not still images alone. No FPS benchmark, PvP balance, optimal-play/campaign or economy acceptance is claimed.

After a subsequent genuine travel/respawn focus miss, the movement fixture closes any open menu with Escape, restores canvas focus and retries real key input within its existing25s bound. Final server coordinates remain mandatory. No HP, position, resources or XP are injected. The dedicated six-client joins use45s initial-state deadlines; authoritative skill duration checks still use actual server ticks/statuses.


Detailed later join diagnostics established WebSocket1006 disconnects, rather than a successful join delayed solely by the UI. Installed0.18 transport defaults (3s pings/two missed replies) and [official transport documentation](https://docs.colyseus.io/server/transport/ws) were checked. The server factory accepts an optional internally supplied transport; all default production options remain unchanged. Only the test-owned animation profile supplies10s pings/six missed replies to tolerate headless multi-atlas initialization. The temporary room-list input experiment was removed; real code-form joins and keyboard controls remain under test. No connection/reward/skill state is fabricated. This runtime factory addition warrants a new complete final pipeline for the final code state.


## Final result

After the actual server-factory/QA transport change, `pnpm check:final --config playwright.animation-change.config.ts` was run again for the final implementation: **PASS**, exit0. All32 unit/integration files/386 tests,18 workflow checks, project/tool typechecks, production build,12 asset validators and6 actual browser cases passed in one complete invocation. Total541.88s; browser450.56s. Read `docs/evidence/animation-change/final-stages.json`, `final-results.json` and `verification-summary.json` for actual stage timings and results.

The final natural room has six real connected players with positive XP, all alive after their real return, camera zoom1/rotation0 and no client/server errors. Final1920/1280 PNGs were opened and inspected after the floor-depth correction; ground effects are below every actor. A retreat may physically overlap an ally, as normal server movement permits; no artificial separation was introduced for screenshots. Three school reports retain actual four-facing frame/event/phase observations and lifecycle checks. Earlier failed iteration reports are historical diagnostics, not final successes.

The final fixtures keep real code-form joins. Detailed diagnostics established1006 disconnects during headless loading, so the only network allowance is the test-owned transport's documented10s/six-retry heartbeat. Production networking options remain unchanged. The final artifact hashes and Git filtered/raw byte checks passed again after verification.


## Subsequent merge into milestone/m3d — 2026-11-01

The director explicitly authorized integration into `milestone/m3d`, superseding this document's earlier source-worktree-only/no-merge delivery state. Source commit `0e3b10c9` merges with target base `0aeddd21`, retaining the existing Bamboo/Beach work. Five approved JSON add/add conflicts were newline-only and resolved to exact approved bytes; both Beach preparation and the approved-animation guard are retained. Ten mechanics/renderer blobs match the fully verified source exactly, and eleven existing Beach/Bamboo/main integration blobs match the target base.

Merge validation: **115 tests in7 focused files, project/tool typechecks and2 live two-client browser scenarios PASS**. These exercise the revised defensive mechanics/room synchronization, dungeon travel, four-facing Thiên Sơn visuals and owner/zone cleanup. All115 file hashes and the15 staged approved byte streams match. The live lotus PNG was opened and inspected. No art regeneration, recordings or deployment. The prior successful386-test/six-browser final suite and six-player evidence remain historical source verification; they were not rerun for this merge. Separate current-main evidence/commands are in `docs/evidence/animation-change-merge-2026-11-01/verification.json`. The test fixture accepts a separate evidence directory to preserve the source-worktree evidence.
