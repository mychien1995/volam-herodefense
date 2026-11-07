# Creep preview feedback r3 — 2026-11-06

Director feedback replaces the earlier generic strips/feet warnings for the listed profiles. All49 identities remain; only their approved ability/visual changes below apply. Preview and ordinary matches use the same catalogue and authoritative handlers.

| Creep | Current behavior |
| --- | --- |
| Thổ Phỉ | No purple warning on its normal. Đập mạnh is one purple burst at the captured target feet, radius64,24-tick windup,1.5× damage,18 presentation ticks with a one-tick damage window. |
| Sơn Tặc Đao | Hoành trảm is a captured-facing180° frontal sector,192 reach. Trial damage2.4× replaces1.5×. The retained curved sweep is rotated into the front instead of drawing a reversed straight strip. |
| Hắc Y Sát Thủ; Ma Khuyển; Ngưu Ma; Ảnh Ma/Ảnh tập; Sa Xà; Hải Tặc; Địa Ngục Khuyển; Hắc Diện Ngưu Ma | Keep their dashes/burrow, hit logic and existing trails; remove the generic crimson warning strip. |
| Bọ Cạp Cát; Xác Ướp; Cua Khổng Lồ | Keep their attack geometry/statuses/multi-hit behavior; remove generic crimson strips and show compact contacts instead of stretching the contact raster along a line. |
| Tà Tăng | Hấp huyết chưởng drains the player at the captured target feet, with a purple ground ring; retains40% healing from actual HP lost, never from misses/shield-only damage. One-tick damage,18 presentation ticks, radius40,1.5× damage. |
| Khô Lâu Kiếm Sĩ; Bộ binh Mông Cổ; Ác Khuyển | Normal attacks only; the added signatures are removed, including the controlled boss-support signature hook. Encounter-owned steering/bites remain. |
| Khô Lâu Cung Thủ | Both arrows render18 pixels above their authoritative ground trajectory, starting around the torso. Gameplay collision and captured direction remain ground-space. |
| Cương Thi | Thi độc becomes an active poison lob instead of a death pool. It travels to the captured target point, then leaves an88-radius,3-second poison field at those feet. It cannot land early on a player's collision circle; walls still stop it. No generic purple warning on normal/lob/pool. Trial range280, windup24,cooldown210,speed220. |
| Thủy Quỷ | Vũng nước quỷ spawns at captured target feet rather than its own feet; retains the existing92 radius,3-second duration and slow. |

Target points and facing are captured when the server starts the skill; these attacks do not track a moving player. The poison lob has a zero-damage flight and an actual field after landing. The server owns field position, walls, AoE, damage and healing. Presentation duration is independent of the damage window. Special arcs explicitly marked as sectors retain angular collision; the other pre-existing forward attacks retain their mechanics. Poison landing uses the actual swept wall contact rather than the attempted end point.

No raster or approved atlas bytes are changed. The purple burst/ring reuse Hell `violet_black_impact`/`dark_sigil`; the curved frontal slash reuses Cổ Mộ `duster_sweep_trail`; the green poison pool reuses the original Cổ Mộ `needle_poison_impact`. The sweep/poison explicitly use the retained `co_mo_original_fx` source, since the approved replacement sheet adds an opposite-facing purple overlay; boss texture selection stays unchanged. The semicircle warning/body crop retained rasters to the authoritative front half; no procedural final art is generated. Child field/trail cues resolve their own presentation definition instead of borrowing their projectile/dash parent's settings. This update retains protocol33, using existing projected geometry/ticks and local validated content definitions. Restart both review services and create a new room after the change.

Regression scope: real casts/ticks for captured target hit/miss, all four sector facings and rear/side boundaries, actual drain healing, ground-lob landing/player crossing/walls, normal-only profiles, retained range/status settings and presentation flags. Browser scope covers the changed preview profiles with two real clients, and the existing six-peer44-identity main-game/zone-filter profile. Balance exposure probes use fixed seeds; they do not model human dodging or provide final difficulty approval. Reuse the unchanged references inspected during the preview task and the actual prior preview PNGs as the immediate visual baseline.

Validation results and PNG evidence will be recorded after execution under `docs/evidence/creep-feedback-r3/`. Historical r1/r2/preview reports remain separate. No recordings or director art approval are inferred.

## Executed validation

Final **PASS**, `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/creep-feedback-r3.spec.ts tests/e2e/creep-upgrade.spec.ts`, session `creep-feedback-r3-final`: **851 tests / 83 files**,18 workflow checks, both typechecks, production build,20 asset validators and both production Phaser cases. Total543.29s; browser288.30s. The two-client preview covers20 changed profiles, live HP drain, target placements, torso offset, normal-only controls and no unwanted strips. The main-game case covers44 regular identities, two browsers/fourSDK peers, natural opening streams, private-zone filtering, actual death input and a controlled120-creep fixture.

Opened all six final phase PNGs and the six-player arena PNG. Phase capture now waits for Phaser postrender and exports one PNG; it does not record a frame stream. The initial arrow observation was missed between separate RPC reads. Visual inspection also exposed the opposite-facing overlay on the replacement atlas; the requested sweep now uses/crops the retained original texture. No approved atlas bytes changed, and no new art approval is inferred.

`pnpm --filter @volam/game-server exec tsx ../../tools/creep-upgrade-balance.ts`:9,216 fixed-seed probes completed in64.53s, all numerical outputs finite. Solo streams remain60/90/120 and six-player streams240/360/480. The480-actor probe measured p9512.85ms/max51.72ms per tick, excluding network/GPU cost and uncontrolled machine-load differences. Many probes kill the basic creep before its opening signature; these averages cannot establish signature difficulty. The focused cast tests, not those averages, establish the changed hit/dodge/heal mechanics.

Evidence: [verification](evidence/creep-feedback-r3/verification.json), [pipeline](evidence/sessions/creep-feedback-r3-final/check-workflow/final-timings.json), [changed-profile presentation](evidence/creep-feedback-r3/presentation.json), [main game](evidence/creep-feedback-r3/arena/browser.json), [balance](evidence/creep-feedback-r3/balance.json), [front sweep PNG](evidence/creep-feedback-r3/front-180-sweep.png), [poison PNG](evidence/creep-feedback-r3/target-poison.png).

Review services restarted at **http://127.0.0.1:5627/?creepPreview=1**, server3427, protocol33, health/run identity `creep-feedback-r3-review-p33-20261106`; clientHTTP200 and current VFX source verified. Reload and create a new room.
