# M3C3 feedback gameplay trial

Scope: the director's eight-style feedback and explicit trial interpretations. Server-authoritative mechanics, retained-art presentation fixes, tests and evidence only. No artwork generation, new asset mapping, recordings, M3D/campaign/PvP/boss/equipment/crafting implementation. All numeric changes below are configurable trials in game-data, not final balance. Previous M3A–M3C3 notes are historical where superseded.

## Rank-1 changes (30 ticks/s)

| Ability | Before | Trial |
|---|---|---|
| Cái Bang Chưởng A | raw22, every18 ticks | same cadence; every sixth accepted A raw27.5, splash48; other five raw22 |
| Cái Bang Bổng A | range54, raw28 | range70; thrust/sweep/lift/smash, damage multipliers1/1/1.05/1.2 and half-angles36/90/60/45 degrees;18 ticks |
| Hỏa Vân Chưởng | three same-direction shots,3-tick spacing | simultaneous three-ray fan,60-degree total spread |
| Hoành Tảo Bổng | range85,234-degree sector | range110,360 degrees |
| Phá Giáp Bổng | range65 | range78; cast impact visible even on miss |
| Cầm Long Công | range160,pull90 | range220,pull120; silence+disarm, never stun |
| Truy Phong Bổng | raw44 | raw66 |
| Thiên Hạ Vô Cẩu | range90,finisher110 | range135,finisher160; four pulses and final damage retained |
| Thiên Sơn Phiến A | melee raw24,range62,14 ticks |9 ticks (0.3s), raw12 per leg,range220 outbound,speed400,radius10,piercing; return toward sampled owner position |
| Thiên Sơn Đao A |12 ticks,range58 |9 ticks,range72; raw30 retained |
| Liên Hoa Phiến |4×16,range78,4-tick spacing |6×16,range100,5-tick spacing |
| Lục Dương Chưởng |range80,6×15 |range100,6×15;65% reduction while action is active |
| Lưu Phong Bộ |no damage |raw30 once per crossed target |
| Chiết Mai Thủ |+30% move,+35% AS |same, plus20% CDR; ranks add3 percentage points, capped30%; total existing CDR cap40% |
| Bách Phiến Phong Bạo |10×22,range115,7-tick spacing |12×22,range150,8-tick spacing; four bursts of eight straight fans,raw6,range210,speed340 |
| Phi Ảnh / Phong Ảnh |no dash immunity / one-hit evade window |direct immunity on moving dash ticks only; DOT continues; Phong counter later takes damage |
| Truy Hồn Đao |two melee hits,range72 |two straight piercing blades,range240,speed420,radius14,3-tick spacing;25% slow75ticks;raw30,+40% vs already slowed |
| Bách Liệt Thiên Kích |range90,finisher100 |range110,finisher125 |
| Võ Đang Quyền A |13 ticks,range50 |9 ticks,range65,knockback10;left/right presentation stages |
| Võ Đang Kiếm A |18 ticks,range62 |12 ticks,range78; existing server-owned Kiếm Khí proc retained |
| Lưỡng Nghi Thủ |melee range64,CD60ticks |straight piercing projectile range240,radius14,speed390,CD42ticks;damage/debuff retained |
| Huyền Âm Chưởng |range170,radius22 |range260,radius30 |
| Dương Khí Kích |melee range60,CD75ticks |straight piercing projectile range220,radius16,speed390,CD48ticks;refund7MP once on hit |
| Thái Cực Thần Công |12MP,CD270ticks,timed180ticks,80% absorption |free activation,toggle,100% absorption;1.25MP/damage at rank1,1.15/1.05/0.95 later; unaffordable remainder reaches HP |
| Thái Cực Trận |damage/slow zone |same plus confinement; movement/attacks inside allowed, forced-movement immunity respected |
| Thiếu Lâm Quyền A |raw38,range48,28ticks |same mechanics plus left/right presentation stages |
| Thiếu Lâm Đao A |raw32,range62 |raw38,range80 |
| Tru Tà |range84,70% secondary damage,180-degree sector |range115,85% secondary damage,234-degree sector |
| Dịch Cân Kinh |base regen1.2HP/s,+0.12 per level after1 |unchanged, one source; surplus retains existing +0.08HP/s per eligible point |

Five-tick minimum A intervals bound Cái Bang/Thiên Sơn/Võ Đang; Thiếu Lâm Quyền has a six-tick floor and Đao retains its existing derived cadence. These are attack intervals, not an additional animation lock. Arrow/A/QWER and manual keydown input remain unchanged. Rank progression retains the existing rank improvements except the toggle has no MP/CD increase. Two fan legs each receive50% of Attack Power growth; ultimate auxiliary fans receive20%, avoiding full growth repeated on every extra projectile. Full machine-readable before/after: `artifacts/m3c3-feedback-tuning.json`.

## Mechanics and lifecycle

Basic stages are stored on the server and advance only after a valid A; clearing/respeccing/travel/death/disconnect clears chains without resetting shared A cooldown. Boomerangs clear hit IDs only at turnaround, sample the owner's position once for the return leg and never chase afterward. Walls stop travel. Projectile refunds share one per-cast flag and require an actual hit, including kills. Periodic damage cannot be evaded by a dash/counter; moving protection ends with the actual dash tick, not the counter window. Spin guard applies only while its action exists. Buff CDR is strongest-only, capped, and never shortens existing cooldown debt.

Shield toggles cannot refill HP/mana; activation is free, one tick prevents same-tick packet spam, and the existing strongest-shield/post-armor/post-guard pipeline pays finite mana before HP. Zero mana grants no absorption. Lifecycle cancellation removes it. Confinement owns target IDs per area, samples entry every simulation tick, clips normal/forced movement without stun, respects terrain and forced-movement immunity, and releases on area expiry/owner cleanup. Boss behavior itself remains unimplemented; the opt-out is tested without inventing bosses. Same-target Thiếu Lâm chains and cleave rules remain intact.

Protocol10 adds projectile radius/stage/leg projections. Strict client input schemas still reject fabricated state/damage. New fields contain presentation information only; all targets, hits, shields, RNG and counters remain server-owned.

## Presentation audit and temporary art contract

The retained map already had all active components; no asset absence was established. Actual alpha-bound inspection showed that several palm effects occupied only10–15px inside96px canvases. The trial scales those retained raster effects, gives new travelling effects world/projectile anchors, draws Hoành Tảo from four retained directional sweeps, emits Phá Giáp's cast impact, scales owner-following channel effects to reach and removes the old procedural basic staff arc. Only real sweep pulses advance alternating VFX; refund/control/mitigation pulses cannot accidentally spawn extra attack visuals. Toggle-off does not play another activation.

Existing Hàng Long wave remains synchronized to server projectiles, visible above ground and rotated to fixed velocity. It is a temporary fire wave, **not the requested new dragon**. All following art remains pending production/in-game approval; no new concept/export was loaded:

| Requested asset ID | Phases / directions | Anchor / playback | Temporary reuse |
|---|---|---|---|
| `cai_bang_bong_basic_v2` |thrust/sweep/lift/smash × down/up/left/right |feet pivot matched to baseline; one-shot per accepted A |baseline character + Hoành Tảo/impact |
| `cai_bang_chuong_dragon_v2` |release/travel/impact, cardinal art with arbitrary-heading support |hand → world projectile → target; travel loop |Phi Long wave at reduced scale |
| `hang_long_hoa_vu_dragon_v2` |gather/release/travel/impact/ending |caster then projectile; travel loop, other phases one-shot |retained Hàng Long wave |
| `bong_controls_v2` |radial sweep,slam,extend/retract,dash impact |caster/ground/target; directional one-shots |retained staff effects |
| `thien_ha_vo_cau_dogs_v2` |dog run/whirlwind/final smash |owner-relative orbit; loop then one-shot finish |retained whirlwind; no dog art |
| `thien_son_fan_v2` |throw/catch × four facings;spin/travel/impact |hand/projectile/target; same fan for two legs and eight-way bursts |Liên Hoa sweep raster following projectile |
| `thien_son_wind_actions_v2` |extended fan chain,guard spin,dash hit,buff activation/loop/ending,storm |feet/caster/target; channel loops tied to server action |retained wind sprites |
| `thien_son_dao_v2` |air blades,evade trail,flurry/finish,cardinal directions |projectile/caster/target; travel loop and one-shots |retained cuts/trails/flurry |
| `vo_dang_hands_v2` |left/right A × four facings;yin-yang travel,white palm travel |feet/hand/projectile/target |baseline character and enlarged release rasters |
| `vo_dang_shield_formation_v2` |on/loop/absorb/off/depleted,boundary reaction |owner or fixed ground; loop while authoritative state exists |retained shield/formation |
| `thieu_lam_hands_combo_v2` |left/right A,La Hán/Vi Đà/Kim Cang,empowered × four facings |feet/hand/target; discrete casts/impacts |retained character; scaled gold effects |
| `thieu_lam_dao_v2` |basic slash/Tru Tà release and impact × four facings |caster-front/target; one-shot |retained gold slash |

New art must supply transparent PNG + atlas and frame/timing/origin metadata, preserving character foot scale/pivot. These are handoff IDs, not runtime mappings or a claim that files exist. No new art approval is requested by this code task.

## Validation and measurements

Focused iteration commands: `pnpm check:quick tests/m3c3-feedback.test.ts ...` and `pnpm check:browser --config playwright.feedback.config.ts --project feedback-preview`. Browser services own5210/5212 and2606/2608, separate caches/logs, video/trace off. Retained baseline M3C3 evidence is redirected to the new feedback evidence directory for this profile.

Before/after simulation: `node scripts/prepare-feedback-baseline.mjs` then `pnpm --filter @volam/game-server exec tsx ../../tools/feedback-balance.ts`. The baseline uses actual Git HEAD core/data in an isolated ignored directory and retained prepared map/art JSON.384 probes cover both versions, all four schools/both basics/levels1,6,15,30/three seeds/two12-second scenarios. Point/rank budgets and resources are real; stationary and simple approach AI use immortal targets. Reports do not prove campaign balance, human feel, PvP, bosses, economy or six-player performance. Exact outputs: `artifacts/m3c3-feedback-balance*.json`.

Final verification command:

```powershell
pnpm check:final --config playwright.feedback.config.ts --grep 'feedback|normal four-school|six-player natural combat|two clients agree|ranged projectile|two real clients'
```

**PASS,553.67s total.** Asset preparation wrote0 files,2150 unchanged. Shared project and test/tool typechecks passed. All8 workflow checks and330 unit/integration tests in26 files passed. Production build passed with the existing large-chunk advisory. All10 asset validators passed, including protected character/skill bytes. Browser:11 passed,0 skipped/unexpected/flaky,481.85s stage time. The profile name matches the grep, so it ran all11 cases in the configured browser scope, including camera/occlusion and baseline four-direction registry checks.

Earlier final attempts stopped on a strict report-tool row type and one historical dungeon fixture expecting queued Hỏa Vân shots. Both were corrected: the cleanup fixture now uses the existing paced Vạn Kiếm ability, retaining queued/already-spawned cancellation assertions. School regressions were updated only where the director changed mechanics; no test result is claimed from an earlier code state. No successful full suite was repeated for report-only edits.

All three new two-client preview cases passed with empty console/network error lists. Both caster and observer recorded4 character frames for Truy Hồn/Bách Phiến/Lưỡng Nghi/Dương Khí/Hàng Long and the three Gold punches. Observed VFX frame sets include7 Truy Hồn,10 Bách Phiến,11 Lưỡng Nghi,10 Dương Khí,7 Hàng Long and13/10/6 Gold punch frames. These are cumulative observed subsets, not claims that every phase/frame/facing was newly exercised. The separate baseline registry case checks retained four-direction animations.

The natural six-player dungeon snapshot has XP34/10/34/34/34/34,all alive. Subsequent arena checks passed with six living heroes,normal zoom1,rotation0,feet/Y-depth and two owner-bound Gold auras; all six error lists are empty. Natural fighting/rewards and staged arena readability remain separate evidence. The invasion interval30s/statue100000 in these isolated test services are development fixtures, not production tuning.

PNG inspection opened `wind-runtime.png`,`fire-wave-runtime.png`,`gold-runtime.png`,`yin-yang-runtime.png` and `six-player-combat-1280.png` under `docs/evidence/m3c3-feedback/`, compared with the positive world/character references and placeholder anti-reference. Wind/formation extents and forward fire travel are visible,hero silhouettes/feet remain intact,and normal gameplay keeps a dominant viewport. Preview screenshots contain an explicitly enabled in-viewport developer tool. The dense inherited foliage and primitive preview targets remain existing presentation limitations; enlarged/reused effects do not establish production-art quality. Gold's static screenshot is after impact; motion evidence is the actual frame/event report, not that still image. New dog/fan/dragon/palm/alternating-hand production art remains pending and was not integrated or approved.

Machine-readable result: `docs/evidence/m3c3-feedback/verification-summary.json`; browser report and caster/observer state/frame logs are in the same directory. No tracked assets/concept/source/export/approval-lock changes were made by this implementation; concurrent untracked art remains outside the code delivery.

### Measured balance observations

The retained baseline commit is `c810cf87f69e51bb62d907ecd4b9fa0664ebe38a`. The384 actual probes were rerun after final mechanic changes. Stationary three-target aggregate DPS ranges (both basics,three seeds;12s including identical periodic raw20 pressure) were:

| School | Lv1 before → after | Lv30 before → after |
|---|---|---|
| Cái Bang |30.25–50.75 →37.25–65.75 |572.25–822.50 →624.00–931.25 |
| Thiên Sơn |90.50–97.25 →101.42–117.83 |894.33–1094.42 →880.50–1258.83 |
| Võ Đang |50.75–83.17 →27.58–119.75 |512.17–589.00 →432.50–748.33 |
| Thiếu Lâm |68.17–101.00 →68.17–116.33 |368.75–478.92 →368.75–494.42 |

The wider Võ Đang range is material: repeated Quyền knockback can push stationary targets out of follow-up reach, reducing sustained output in that setup; faster Kiếm raises the upper end. Do not represent all changes as unconditional DPS buffs. Thiên Sơn's initial full-growth-per-leg probe was excessive, so the final fan splits growth between legs and auxiliary fans use20% growth. The approach scenario still kills low-level Cái Bang/Thiên Sơn against three immortal attackers in12s; it is a pressure probe, not evidence that early-game fairness is solved. Actual farm/kill pacing and human movement require the browser/manual review; boss/PvP/economy/campaign tuning remains outside scope.
