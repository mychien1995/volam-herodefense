# Skill revise — Phaser integration

Branch: `wip/m3d/skill-revise`. The director explicitly authorized integration of the first prompt, all clarifications and the corrected motion preview: “Tạm ổn. Integrate những thay đổi này vào Phaser…”. Phong Quyển uses **bán nguyệt**, selected explicitly after that instruction. This supersedes the earlier production-only/pending-integration status in the historical review documents. Live-game feel remains for the director's own Phòng test session.

## Implemented contract

Runtime definitions and rank tuning are applied once in `packages/game-data/src/skill-revise.ts`, after the existing rank construction, and validated by `abilitySchema`. Stable ASCII IDs, skill slots and build ownership remain unchanged. Display names are Vietnamese. The server chooses targets and owns RNG, damage, resources, movement and collision. Auto-focus takes the nearest selectable enemy in range at cast time, falling back forward; projectiles keep that direction and can be dodged.

| Branch | Integrated behavior |
| --- | --- |
| Cái Bang Chưởng | Cuồng Long, Phi Long and Hàng Long focus; Kháng Long keeps crit, gains mana regeneration and loses rank-4 burn aura; Hỏa Long Xuyên Sơn damages along the dash and explodes at the actual endpoint, including terrain-clipped endpoints. The flame trail is cosmetic. |
| Cái Bang Bổng | Phá Thạch name; successful main-target A hits build up to four charges, target changes reset them, skills never build them. Phá Giáp consumes all charges on accepted cast, including misses, and focuses/stuns 2s. Thiên Hạ's finisher stuns 2s. |
| Thiên Sơn Phiến | Liên Hoa reduction rises 40% → 60%. Phong Quyển retreats while gathering enemies, then releases a piercing crescent through the gathering point. Bạo Vũ has launch/stop/recall inputs, with automatic stop at maximum range and existing upkeep/cooldown. |
| Thiên Sơn Đao | Clone creation conceals and reduces incoming damage; the player cannot be selected by A/focus/boss targeting. Area damage still hits. Own A/new casts reveal; autonomous clone damage does not. Clones continue independently of new actions. Liệt Phong stuns 1s, then slows for 3s; the transition respects control resistance. |
| Võ Đang Quyền | Longer A reach, knockback/mana-steal proc with a small PVE refund when the target has no mana. Larger Đoài explosion. Q/W focus. Broad sound waves and five seeded random ink blasts around the target's locked position; ink stuns 1s. T radius scales by sqrt(0.85), giving 15% less area. |
| Võ Đang Kiếm | A sword-qi chance is exactly 15%. Bát Quái permits movement inside but clips walking/dashing across its boundary. Thất Tinh locks a remote region and drops seven closely staggered swords, with no ground warning ring. |
| Thiếu Lâm Quyền | Q/W/E focus in both stances. Vi Đà's endpoint offset is 40% of its old value. Longer A reach. Như Lai damage increases and slows. Same-target Phát Động and early-input buffering remain in force. |
| Thiếu Lâm Đao | Thiên Diệp fires twice as often with smaller per-blade damage. Kim Quang grants stronger defense/regen to self/allies. Minh Vương heals self once, then grants defense and damage to self/allies; it no longer heals allied HP. |
| Côn Luân Thiền Sư | New coherent hammer body and four two-handed stages: thrust, rising, right-to-left sweep, slam. **Old active Q stance/ranged toggle and its A damage bonus are replaced by passive Ngũ Lôi Chính Pháp.** Each eligible direct hit rolls separately; success negates that hit's damage and retaliates with lightning/stun 0.5s. PVP eligibility is player A only; PVE includes direct skills, excluding DOT, hazards and reactive recursion. E is renamed Lôi Đình Chấn Vực and retains its effect animation. R focuses. Chaos retains its existing gameplay. |
| Côn Luân Kiếm Tôn | A motion stays intact. T is Thần Long Cửu Hiện: five swords are spaced farther around the caster and connected as a crossed star. Expiry emits five Q-style explosions at their positions, using the same rank's Q damage/radius, without an expiry stun. Initial formation control is retained. |
| Đường Môn Cơ Quan | Ground Q/E focus. While flying, A uses the existing game feather at its existing scale in a three-shot cone; Q becomes three small ice bombs around the locked target; E shines a ground beam then dashes in the air with damage along its line. R ends flight. |
| Đường Môn Ám Khí | Trap capacities 3/4/5/5, at most five placed bombs; a sixth placement after recharge replaces the oldest. W focuses. Nhiếp Hồn emits eight radial darts after the actual dash. |

The requested stray lights are suppressed at their dynamic-light owner for Kháng Long, Kim Cang, Toàn Phong, Ca Diệp/Hoành Tảo and Kim Quang. Their physical character motion and retained skill artwork remain available.

## Asset and playback integration

`skill-revise-art.ts` preloads the approved exported PNG/hash atlases, renders revised bodies after the retained motion layer, and routes new projectile/area/event VFX. Replaced legacy effects are suppressed to avoid duplicate skill graphics. Source PNGs are preserved. Runtime metadata is reproducible with `node tools/prepare-skill-revise-runtime.mjs`; icons are exact unscaled atlas extractions.

Thiền Sư uses v02 thrust/rising/slam and **v03 sweep**, at scale 0.5 with logical canvas 512×448 and foot `(256,320)`. The rejected v01/v02 sweep banks remain historical. Eight facing directions are retained; down-right sweep follows its approved cel order. An accepted A starts its six-cel 600ms visual take, with at most one cel advanced per rendered frame under load. Walk, hurt, stun, death, zone change and the next accepted action interrupt it. This recovery presentation changes neither the server's A cadence nor damage timing. Other reworked effects use authoritative action/projectile/area timestamps and coordinates. The original feather renderer remains in use at scale 0.55; ice-bomb sprites use 0.175, with the original blast size retained.

## Trial tuning

Exact director values above are requirements. The following unspecified values are initial integration defaults, **not director-approved balance numbers**:

| Value | Default |
| --- | --- |
| A reach: Võ Đang / Thiếu Lâm Quyền | 112 / 104 |
| Phá Giáp bonus per charge, ranks 1–4 | 18/21/24/27% of base skill damage |
| Ngũ Lôi chance / retaliation, ranks 1–4 | 12/16/20/24%; 18/24/30/36 damage |
| Clone damage reduction | 35% |
| Mana steal / mana-less refund | 8 / 3, on the existing knockback proc chance |
| Phong Quyển | retreat 78 at speed 300; gather range 360, center 180; gust range 440, radius 44 |
| Liên Hoa intermediate reduction | 47% / 53% |
| Thất Tinh | range 340, scatter radius 36, blast radius 42; first fall at 15 ticks, next impacts 2 ticks apart |
| Thần Long spacing | both axes ×1.35 |
| Air Q / E | bomb damage ×0.65, blast radius 36, scatter radius 26–44; dash 180 |

## Verification evidence

New deterministic regressions live in `tests/skill-revise.test.ts`. Historical tests whose mechanics were explicitly superseded have been migrated; unrelated damage/combos, authority, cooldown, terrain, status and resource checks remain.

The balance probe writes [288 fixed-seed exposure runs](evidence/skill-revise-game/balance/balance.json) and CSV for all twelve branches, levels 1/6/15/30, solo/six, with normal resources and legal fixed builds. It is a 12-second stationary-target/constant-pressure diagnostic, not a campaign or human-PVP balance approval. It found no non-finite DPS values; 73 configurations lost all bots under that artificial pressure. This is retained as evidence, not hidden by HP or resource overrides.

Live iteration uses `playwright.skill-revise.config.ts` and the existing owned-service/real-room QA helper, two clients first and six in final mode. The probe records submitted Phaser frames, scale/pivots, accepted inputs, actual HP changes, fan stages, five ink blasts, seven sword impacts, five expiry bursts, passive retaliation, cleanup, and natural enemy death/reward replication. Browser outcomes and the final pipeline result are appended only after execution.

### Executed results

[Acceptance summary](evidence/skill-revise-game/acceptance-summary.json): completed with focused reruns. `pnpm check:final --config playwright.skill-revise.config.ts` passed 1,268 unit/integration tests, 70 workflow checks, build/type checks and 34 asset validators; its browser stage failed an endpoint mismatch. That original FAIL report is preserved. After fixing configuration and short-effect presentation, browser checks were retried separately rather than repeating passing suites.

The six-connected-client art run passed all 32 hammer stage/direction combinations and the first five revised skill checks. The next retry passed air laser, five star-expiry bursts and real-creep passive retaliation with zero HP lost. The three-input fan test passed in the earlier two-client run; a six-window retry missed its transient outbound phase and remains recorded as FAIL. The separate final natural-combat retry passed with all six renderers active: normal A killed the enemy, incoming damage and rewards occurred, death replicated to every peer, no browser/server errors were reported, and new VFX cleaned up. Individual partial runs retain `finalAcceptance: false`; the aggregate explicitly identifies their coverage.

Low-FPS presentation now submits a short VFX's contact cel at least once before cleanup. A confirmed airborne E also retains its endpoint beam briefly if the server dash finishes between drawn frames. Neither adjustment changes authoritative damage or movement. Final TypeScript checks, client production rebuild and `git diff --check` passed after these client changes.

The normal game is launched separately without QA encounter fixtures; the director opens Phòng test manually. Final gameplay feel and unspecified trial balance values remain subject to that session.

## Runtime feedback v04

The director's next live review requested removal of baked icon borders, an endpoint blast beneath Hỏa Long's feet, consistent left-facing hammer placement and idle/A transitions, and a high overhead slam. The new [versioned source/native bundle](../assets/source/skill-revise-feedback-v04/README.md) keeps all earlier PNGs/approval records intact.

The four icons now use exact unscaled interior crops. The fire burst is centered on the authoritative endpoint at floor depth0, vertically compressed to42% for the ground plane; radial AOE, dash damage and non-damaging trail are retained. Runtime tests check actual HP on both sides of the endpoint and outside its radius.

Thiền Sư idle and all A entry/recovery cels now share the exact V02 neutral for each facing. V02 thrust/rising and the four interior V03 sweep cels remain, with the exported sweep order used once. Five new overhead takes supply interior slam poses, with three explicit mirrored left derivatives and one targeted rear anticipation repair. Other bodies remain retained. The bank adds236 registered cels and editable Aseprite/native roundtrip; it is a repair candidate awaiting the director's next live review. The four idle frame names intentionally alias a static neutral.

New evidence lives under `docs/evidence/skill-revise-feedback-v04/`: an accepted-input baseline, the preserved pilot asset-loading failure, the corrected right pilot, full two-client motion iteration, and final verification. Source/native checks pass236 cels and four exact icon crops; focused AOE/runtime asset regressions pass32 tests. Final results are appended after execution.

The same direction defect was also reproduced in left-facing walk art. V04 includes twelve mirrored retained gait cels for left/down-left/up-left; real arrow input and displacement are checked for all three. The first final run was interrupted before completing this follow-up; its evidence is retained.

V04 final verification completed with a targeted test retry: [current acceptance summary](evidence/skill-revise-feedback-v04/acceptance-summary.json). The full command passed1,268 tests and stopped on one obsolete V01 icon-path expectation; the corrected Võ Đang and asset files passed54 tests on retry, completing1,269 verified tests across runs. Production build, all34 asset validators, browser preflight and the final six-client browser test then passed. Six clients observed all six A cels in32 stage/facing takes, all four walking cels in each of three corrected directions, ground-depth fire AOE with both flank hits/outside miss, natural incoming damage/death/rewards and VFX cleanup. Two renderers were active during focused art; all six resumed for combat. The original FAIL/interrupted reports remain unchanged. The normal endpoint was rebuilt for2926 and health/index/build identity verified; [game readiness](evidence/skill-revise-feedback-v04/manual-ready.json).


### Thiền Sư A — v05

Yêu cầu mới nhất thay chuỗi bốn thức bằng **chọc → đập**. Đập dùng10pose với nhịp nâng/dồn lực rõ, downstroke nhanh và giữ chạm đất; cả hai tay giữ cán và cổ tay xoay vào trong. VFX chấn đất chờ frame7; server giữ sát thương và input. [Nguồn, prompt, native và balance](../assets/source/skill-revise-thien-su-v05/README.md). Các nhánh/skill khác giữ bản tích hợp trước.

V05 completed: [current evidence summary](evidence/skill-revise-thien-su-v05/acceptance-summary.json). Full logic passed1,271tests plus workflow/build/34asset checks. Original six-client browser FAIL retained for3/4 sampled unchanged walk cels. A separate regression reproduced600ms animation exceeding the300ms server pose; the final slam is270ms, thrust300ms, with damage/cooldown timing preserved. All80native cels and weighted durations pass,51affected regressions pass, and the rebuilt production six-client retry passes all16new A takes (six thrust/ten slam cels per facing), contact effect and natural combat/rewards/cleanup. Unchanged walking explicitly retains fresh two-client coverage. Normal server was restarted to load the two-stage data; [current owned service](evidence/skill-revise-thien-su-v05/manual-service.json). Director art/gameplay-feel review is separate.
