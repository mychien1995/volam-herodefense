# M3D feedback technical handoff

## Director approval — 2026-11-02

**TECH APPROVED.** The director explicitly confirmed: “Duyệt tech change”. Approval covers this delivered technical/gameplay implementation and its documented trial tuning. Sprite/VFX art approval and later visual integration remain separate. On 2026-11-02 the director separately requested committing the approved tech and this handoff. Delivery is a dedicated commit on `wip/m3d/feeback-tech`; merging and visual integration remain separate.

Branch: `wip/m3d/feeback-tech`, base `46d36869`. This worktree works independently of visual production. No merge or new sprite/VFX PNG is included.

## Confirmed behavior

- Shift: two charges, sequential6s refill. One used charge also refills. No mana, damage or immunity. Uses held movement vector, otherwise facing. Other active actions/stun reject it. Physical collision is swept. Remaining debt survives build changes, death and zone-clock transfer.
- A: fresh presses only. Both Võ Đang basics have no separate wait beyond the finite6-tick animation cadence. No click-rate damage or held autoattack.
- Thiếu Lâm Quyền: `left_fist`, `right_fist`, `front_kick`, `roundhouse_kick`; only accepted attacks advance the chain.
- Nhân Kiếm Hợp Nhất: same-slot recast, damaging piercing sword, each target once; slow straight flight and1.5s damage-free linger. Recast never supplies client coordinates or pays a second mana/cooldown cost. Terrain-invalid or confinement-invalid blink is rejected and retains the sword. A wall hit destroys the sword rather than creating an unsafe anchor. Existing cooldown starts on initial cast; an existing sword always takes recast priority.
- Rank4 Kháng Long fire follows its owner. Lower ranks retain crit buff only. Existing cleanup cancels owned effects on death/travel/respec/disconnect/defeat.
- Ordinary creep dungeons immediately target living members anywhere in that instance. Deterministic grid paths are used only when scenery blocks a direct route; creep melee cannot hit through scenery. Invasion and boss AI stay separate.

## Configurable trial tuning

All units below are logical world units;30 ticks =1 second. Rank growth still comes from the existing school progression data.

| Feature | Before | After |
| --- | --- | --- |
| Shift | absent |120 units at720/s;2 charges;180 ticks/charge |
| Dungeon solo/count coefficient |3 /0.6 |6 /0.2; six-player wave12;1/2/3/4/5/6 participants =>6/8/9/10/11/12 |
| Võ Đang Quyền A |range65;9-tick base/floor5 |range80;6-tick animation cadence |
| Võ Đang Kiếm A |range78;12-tick base/floor5 |range94;6-tick animation cadence |
| Thiên Sơn Đao A |range72 |86 |
| Thiếu Lâm Quyền A |range48;two fists |70;four stages; final half-angle0.75π |
| Thiếu Lâm Đao A |range80 |96 |
| Kháng Long |180+15/rank-step ticks |270+15/rank-step ticks; rank4 radius62, base6 damage/pulse,30-tick interval,0.15 attack-growth coefficient |
| Phá Giáp |range78;instant;armor break150 |range110;windup6/active duration30;armor break210 |
| Liệt Phong |range72;instant |range125;windup18/active duration30 |
| Bách Liệt |range110/finisher125;spacing2 |range145/finisher165;spacing4; ten hits+finisher damage unchanged |
| Nhân Kiếm |range420;speed390 |range540;speed180;45-tick linger |
| La Hán |range58 |85 |
| Vi Đà |range62 from caster |range68 from42-unit forward origin; caster-relative frontal eligibility |
| Như Lai Niết Bàn |range140 |180 |
| Tam Giới |instant;armor break135 |windup6/active duration30;armor break180 |

For single-strike extended arcs the same single damage packet is preserved. Bách Liệt preserves its ten packets plus finisher and stretches their spacing. Kháng Long extends crit-buff uptime; its new rank4 aura is intentionally additional damage. These are trial choices, not final balance approval.

## Protocol and integration contract

Protocol18 must be deployed to client/server together. `input` accepts `{kind:'dash', protocolVersion, sequence}` only; no submitted position/charge/cooldown/damage. `LobbyPlayer` adds `dashCharges`, `dashRechargeTicks`, `blinkTicks`; `ProjectileState` adds `lingerTicks`. Values are remaining zone ticks, not client timestamps. Existing creep `targetId` now reports dungeon aggro too.

- `universal_dash`: existing `cast` event with stage `dash`; owner world coordinate is foot anchor; server dash action owns motion. HUD reads charge/recharge projection. Temporary DOM icon lives at `#dash-status` beside A/QWER.
- Basics: existing `attack` events include the authoritative stage and logical reach. Foot anchor is actor world x/y; body center for sword qi is presentation y−22. Future left/right waves and monk fist/kick variants map to these stages.
- `liet_phong_dao`: `cast` begins600ms windup; `pulse/strike` is the server strike cue with captured facing/reach. Retained sword-qi raster is an overhead windup stand-in, followed by retained downward-strike VFX.
- `pha_giap_bong`: retained ground slam uses source contact pivot(128,160)/256 rather than the old center pivot and cancels its authored placement offset so its origin is at the caster's feet. Its temporary playback is1000ms. One hit occurs after200ms; armor-break status controls debuff lifetime.
- `vi_da_quyen`: caster-facing forward origin42; existing retained release is offset42 in the same heading. Impact events remain actual target positions. Future ground art must use the local source offset, never client hit inference.
- `nhan_kiem_hop_nhat`: projected sword x/y are ground coordinates; present the sword at body height. Stage `sword_linger` and `lingerTicks` identify the end window; velocity preserves heading. `pulse/blink_depart` emits old foot coordinate and `pulse/blink_arrive` emits new foot coordinate. Projectile removal is authoritative. `blinkTicks` keeps the assigned hotbar slot recast-ready even during cooldown or with insufficient mana for another initial cast.
- `khang_long_huu_hoi`: rank4 projects an ordinary moving `AreaState`, with radius/ticks; render loop follows area x/y. `pulse/area_tick` is presentation-only notification of a server pulse.
- `tam_gioi_quy_thien`: retained reviewed presentation is stretched1.5×, and confirmed armor-break continues to follow enemy status. Other retained assets expose their original aliases; final new-art timing/poses remain integration work.

Main files for later integration: `apps/game-client/src/feedback-bindings.ts`, `feedback-vfx.ts`, `skill-vfx.ts`, `approved-skill-vfx.ts`, `arena-scene.ts`, `ui.ts`, `arena-hud.css`. Sprite/atlas loading remains in `art.ts` and `skill-art-registry.ts`. Do not replace game-core/server timing with animation callbacks.

## Font and sharpness audit

UI headings previously mixed Georgia/Times New Roman with Segoe UI fallback. Headings now use the same Vietnamese-capable Segoe UI/Tahoma/Arial stack as the rest of the Windows UI. Nickname validation already normalizes NFC. This avoids per-glyph serif/fallback mixing; live screenshots and text inspection must still be reviewed on the player's platform.

The existing renderer already sets nearest texture sampling, integer desktop display scale, camera zoom1, roundPixels and CSS pixelated sampling. No sharpening/upscaling or image-byte changes are made. A read-only presentation probe reports actual texture filter mode. Remaining soft details are in source raster art and need the separate sprite batch. Existing raster aliases cannot depict the new four unique monk poses or final overhead blade/blink effects faithfully; their event contract is ready, their art is temporary.

The repo's requested `vo_dang_art_direction_reference.png` alias is absent. The existing `current_codex_dashboard_anti_reference.png` actually contains the Võ Đang art sheet; the dashboard is `wuxia_town_world_reference.png`. Those existing images plus in-game/world/menu references and the rejected placeholder screenshot were inspected; files were not renamed or regenerated.

## Verification and limits

Final pipeline passed. Executed focused and live results are listed below. Test services use2877/5477 and fixture2878, session `m3d-feedback-tech`; they never borrow another session's server or expose fixture routes in production. No recording or director art approval is claimed.

A clean Windows worktree exposed pre-existing Hong Liet runtime metadata EOL mismatches. The four affected metadata files were restored to the exact LF bytes matching existing provenance SHA256, and `.gitattributes` now keeps those LF bytes. No expected hash, approval lock or artwork is altered.


### Executed focused verification

- `pnpm install --frozen-lockfile`: succeeded; dependency versions and lockfile unchanged. Offline-only install lacked cached metadata; normal installation passed the package supply-chain check.
- Focused `pnpm check:quick` runs:186 tests across nine school/dungeon suites passed;61 tests across dungeon network, boss-animation and feedback suites passed;36 navigation/feedback/protocol tests passed; the final67-test feedback/animation regression scope passed.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: passed during iteration; the final pipeline independently repeats its required typechecks.
- `pnpm --filter @volam/game-server exec tsx ../../tools/m3d-feedback-balance.ts`:144 fixed-seed probes passed through the real simulation at levels1/6/15/30, both basics, four schools and legal custom builds. Raw output: `artifacts/m3d-feedback-balance.json`; compact retained output: `docs/evidence/sessions/m3d-feedback-tech/balance-summary.json`.
- Measured level30 aggregate three-target DPS ranges: Cái Bang566.75–851.08; Thiên Sơn760.5–1193.25; Võ Đang443.33–1066.58; Thiếu Lâm295.42–868.08. These probes include real knockback and fixed raw20 pressure; they do not model human dodging, dungeon survival, economy, boss/PvP/campaign balance. No automatic retuning followed these measurements.
- Iteration `pnpm check:browser --config playwright.m3d-feedback.config.ts`: five live tests passed,89.21s browser stage /107.54s including preparation/compile/build. Earlier browser attempts exposed a missing per-worktree Chromium cache and an invalid cross-school QA build; the browser cache was reused read-only and the QA fixtures were split into native-school builds. Production school restrictions were preserved.
- First final attempt:496/497 unit tests passed and the pipeline correctly stopped on a historical assertion locking protocol17. Only that expectation was updated to18; boss behavior/assertions were retained. The subsequent final report is authoritative for final completion.

### PNG and frame observations

Evidence root: `docs/evidence/sessions/m3d-feedback-tech/m3d-feedback-tech/`.

- `lobby-font.png`, `school-font.png`, `dungeon-menu-font.png`, `arena-dash-font.png`: opened and inspected; Vietnamese headings/labels remain composed and readable. Changed source text is NFC, and the live DOM reports Segoe UI. No per-letter DOM splitting is present.
- `forest-aggro.png`, `natural-observation.json`: seven rendered actors, including all six Forest creep identities; nearest filter mode1 on every rendered actor. Two real clients agree on charge state. Shift drains/refills serially; held A does not repeat; all dungeon creeps publish the living local hero as their aggro target.
- `sword-flight.png`, `sword-linger.png`, `sword-blink-arrive.png`: retained sword art and hotbar recast indication. End-of-range sword can be outside the current camera; state assertions verify its live anchor/linger and same-E-slot arrival rather than inferring these from the still image.
- `monk-skills.png`, `monk-observation.json`: four accepted A stages, advanced native-school casts,35 legacy VFX frames and45 feedback VFX frames observed in the iteration run; the underlying four distinct new kick/fist sprite poses remain a visual-integration task.
- `armor-slam-burn.png`, `cai-bang-observation.json`: moving rank4 fire and longer Phá Giáp. Direct atlas inspection identified the source contact at(128,160), and final live assertion checks the corrected pivot against the hero's foot coordinate.
- `blade-windup.png`, `thien-son-observation.json`: retained overhead sword raster during the server windup and exactly eleven Bách Liệt hits;11 legacy VFX frames and26 feedback VFX frames observed in the iteration run.

PNG observations were compared to the inspected world/menu references: one dominant viewport, compact overlays, no exterior dashboard columns. Raster fidelity and new pose design remain the separate visual batch. No recordings were created and no final artwork/director approval is implied.

### API references consulted

Installed Phaser4.2.1, Colyseus core0.18.23, SDK0.18.8 and Schema5.0.42. Consulted the local Colyseus skill/reference and installed Phaser `TextureSource.setFilter`/animation implementation, plus official [Colyseus Rooms](https://docs.colyseus.io/room), [Schema](https://docs.colyseus.io/state/schema) and [Phaser Texture API](https://docs.phaser.io/api-documentation/class/textures-texture). The installed implementation confirms nearest sampling is mode1.


### Final completion

`pnpm check:final --config playwright.m3d-feedback.config.ts` — **PASS**,208.65s total,86.99s final browser stage. Environment: `VOLAM_QA_SESSION=m3d-feedback-tech`, server2877/client5477, `PLAYWRIGHT_BROWSERS_PATH=D:/Projects/volam-hero-defense/.cache/ms-playwright` (existing Chromium revision1248, read-only reuse).

- Incremental project compilation and test/tool typechecking: PASS.
- Workflow regressions:18/18 PASS.
- Unit/integration tests:497/497 across42 files PASS.
- Production client build: PASS; existing large-chunk warning remains.
- All15 asset validators: PASS; preparation reported0 written/5118 unchanged.
- Live Chromium/Phaser tests:5/5 PASS, including corrected Phá Giáp origin(0.5,0.625) and foot-coordinate assertion. Final PNG opened and inspected: explosion contact now aligns with the character's feet.
- Exact retained metadata checks: the four Hong Liet LF restorations equal both existing provenance SHA256 and original HEAD blob bytes. No sprite/tileset/VFX PNG or animation atlas content changed. The Thiếu Lâm validator refreshed only its generated report's aggregate protected-file count3432→3678, reflecting the existing246 Kim approval pins.
- Final report: `docs/evidence/sessions/m3d-feedback-tech/check-workflow/final-timings.json`.

The director authorized committing the approved implementation, tests, evidence and this handoff on 2026-11-02. Delivery is a dedicated commit on `wip/m3d/feeback-tech`; no merge, deployment, visual-worktree read or asset integration is included. The next integration session should inspect that commit and the independent visual handoff before importing any new raster assets. Only approval/delivery metadata changed after the successful final pipeline, so its results remain applicable without rerunning the full suite.
