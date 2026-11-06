## Renovation v7 runtime override — 2026-11-06

Hàng Long Hỏa Vũ (`hang_long_hoa_vu`): range308/329/350 at ranks1/2/3, exactly70% of former440/470/500. Forward flight ends at its cast-time locked landing point; the red fire dragon coils its own body once at that fixed point, rises and dives. No world-space orbit/overshoot. Retain87total ticks, one112px landing AoE, original damage/mana/CD and lifecycle cancellation. Phá Giáp Bổng changes presentation only: held-staff tip, bright downward trail endpoint and crack centre coincide. All v6 selective M3D reversions remain.

## Renovation v5 runtime override — 2026-11-06

Hàng Long Hỏa Vũ (`hang_long_hoa_vu`): fixed cast-time landing point; forward flight → one orbit → rise → dive, one112px AoE hit on landing after87ticks. Thất Tinh Kiếm (`that_tinh_kiem`): seven actual frontal strokes,3tick spacing, former four-hit budget divided across seven. Thái Cực Trận: only hostile creeps and bosses are confined, including resistant/scripted movers; all allied heroes pass. These director-requested mechanics supersede the historical rows below; see `DECISIONS.md` and `docs/evidence/renovation-v5/README.md`.

## M3D approved runtime catalogue override — 2026-11-03

This section and the revised rows below supersede earlier skill descriptions for the approved M3D integration. Stable IDs,43 actives,8 basics,4 passives,free school mixing and4 slots remain. `hoanh_tao_cuoc` now displays **Ca Diệp Thoái**; `tam_gioi_quy_thien` displays **Sư Tử Hống**. Exact data remain in `packages/game-data/src/thieu-lam.ts` and `m3d-feedback-tuning.ts`.

Thiếu Lâm Quyền A requires four presses (punch/punch/kick/roundhouse+travelling crescent), then1s cooldown; after2s idle the1s cooldown starts. Vi Đà ground explosion offset189. Toàn Phong is a golden piercing travelling tornado, range234, one hit/target. Ca Diệp is a stationary foot slam launching a travelling earth mound, range273; damage+stun to every crossed target once/cast, no caster dash. Vô Ảnh alone/failure emits one centered foot; valid Toàn Phong→Ca Diệp hits on the same enemy enable three parallel upper/middle/lower feet twice. Early finisher input buffers one cast until the real predecessor resolves, never creates combo progress. Như Lai uses the doubled Buddha, sky palm and a stationary Sanskrit field damaging each target on first entry only. Tru Tà is one enlarged attached slash without a crescent projectile. Kim Quang remains centered with a readable interior. Sư Tử Hống is a wide lion-roar AoE with damage, defense reduction and slow; its new original icon replaces the previous skill icon.

Cái Bang Phá Giáp raises/extends then slams the staff along the true facing vector, including diagonals; no spin. Thiên Hạ Vô Cẩu retains four fire dogs, larger whirl/final footprint, duration×1.3 and aligned ground impact. Thiên Sơn Liệt Phong retains the above-head hilt and correct blade-edge orientation when slashing left. Võ Đang Quyền and Kiếm basic knockback chances are10%. Shift8s/charge. Unlisted skills/effects and Phất Trần Công retain approved behavior. Numbers are current director-reviewed playtest tuning, not a claim of campaign/PvP balance.

## M3D technical feedback override — 2026-11-01

Canonical IDs/names remain unchanged. Thiếu Lâm Quyền A now cycles left fist, right fist, front kick and roundhouse kick. Both Võ Đang basics require individual A presses with a finite animation cadence and no additional cooldown. Liệt Phong Đao gathers a large overhead blade before one frontal downward strike. Nhân Kiếm Hợp Nhất is a slow piercing damaging sword with same-slot blink recast and a1.5s end-of-range linger. Kháng Long Hữu Hối rank4 adds a small fire area following its owner. Requested basic/skill reaches and active/status/visual lifetimes increase; see the exact trial table in `docs/m3d-feedback-tech-handoff.md`. Retained artwork is temporary for changed poses/effects; no new art is delivered in this technical worktree.

# Content Catalogue v1.0 — Canonical Vietnamese names

**Current M3C3 feedback override (2026-10-31):** The director authorizes the feedback trial described in `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`. Cái Bang A gains sixth-palm/four-stage-staff chains; Hỏa Vân fires a three-direction fan; Hoành Tảo is radial. Thiên Sơn Phiến A becomes a two-leg ranged fan, both A profiles use 0.3s base cadence, Lưu Phong damages crossed enemies, Lục Dương mitigates while spinning, Chiết Mai adds bounded CDR, Bách Phiến adds eight-way fan bursts, Truy Hồn emits two slowing blades and the two evasive dashes protect only moving ticks from direct damage. Võ Đang Lưỡng Nghi/Dương Khí become straight projectiles, Quyền A knocks back lightly, shield is toggle and Thái Cực Trận confines without stun. Thiếu Lâm Dịch Cân's existing regen remains single-source; Đao/Tru Tà gain reach/cleave. Exact Vietnamese names, IDs, school mixing, four slots, 43 actives and eight basics remain unchanged. Historical descriptions below are superseded where they conflict with this override; numeric changes are proposals, not final balance.

**Scope:** 4 launch schools, **8 normal attack choices**, **43 active skills** (5+5 for Cái Bang, 5+5 for Thiên Sơn, 5+5 for Võ Đang, 8+5 for Thiếu Lâm), **4 innate passives**. Naming and user-requested changes are canonical; ability effects are design specifications subject to combat tuning. `U` = optional ultimate (max one equipped is PROPOSED). Use stable ASCII IDs for persisted/configured references and localized `vi-VN` display names.

## Cái Bang — Fire / Hỏa

**Identity:** high damage per hit, Critical Chance/Critical Damage. Bổng has more control for PvP, Chưởng more ranged/AoE PvE. **Innate passive:** `tieu_dieu_cong` — **Tiêu Diêu Công**, scales damage/crit automatically by level.

**Normal attacks (A):**
- `cai_bang_chuong`: **Cái Bang Chưởng** — ranged non-homing fire projectile, auto-aim once at closest enemy's present position; dodgeable.
- `cai_bang_bong`: **Cái Bang Bổng** — forward short-range staff arc; heavy primary, reduced cleave to others.

| ID | Vietnamese display name | Style | Proposed effect and reason |
|---|---|---|---|
| `hoa_van_chuong` | **Hỏa Vân Chưởng** | Chưởng | Fire three quick non-homing projectiles toward nearest foe; consistent ranged attacks/farming. |
| `cuong_long_loan_vu` | **Cuồng Long Loạn Vũ** | Chưởng | Fireball explodes on collision, damages and burns an area; wave clear. |
| `phi_long_tai_thien` | **Phi Long Tại Thiên** | Chưởng | Frontal fire shockwave that knocks enemies back; spacing and melee disengage. |
| `khang_long_huu_hoi` | **Kháng Long Hữu Hối** | Chưởng | Temporary Crit Chance + Crit Damage buff; timed burst. |
| `hang_long_hoa_vu` | **Hàng Long Hỏa Vũ** | Chưởng U | Massive forward-traveling fire wave; late-game AoE burst. |
| `hoanh_tao_bong` | **Hoành Tảo Bổng** | Bổng | Wide staff sweep causing damage and slow; melee wave control. |
| `pha_giap_bong` | **Phá Giáp Bổng** | Bổng | Heavy strike inflicting temporary defense reduction; boss/team synergy. |
| `cam_long_cong` | **Cầm Long Công** | Bổng | Pulls all enemies in front closer by a limited distance and prevents **both attacks and skill casting**, but not movement (`Disarm` + `Silence`); iconic PvP setup. Not stun. |
| `truy_phong_bong` | **Truy Phong Bổng** | Bổng | Directional dash that hits and stuns; gap-close and interrupt. |
| `thien_ha_vo_cau` | **Thiên Hạ Vô Cẩu** | Bổng U | Multi-hit staff whirlwind finishing in heavy smash; close-range finisher. |

## Thiên Sơn — Wind / Phong

**Identity:** high Movement Speed, Attack Speed, Crit Chance; relatively fragile; **both Phiến and Đao are melee**. **Innate passive:** `bac_minh_than_cong` — **Bắc Minh Thần Công** (auto speed/attack speed/crit growth).

**Normal attacks (A):**
- `thien_son_phien`: **Thiên Sơn Phiến** — rapid, wide fan melee arc (PvE).
- `thien_son_dao`: **Thiên Sơn Đao** — narrower, stronger rapid sword/đao slash (PvP).

| ID | Vietnamese display name | Style | Proposed effect and reason |
|---|---|---|---|
| `lien_hoa_phien` | **Liên Hoa Phiến** | Phiến | Fixed owner-only protective lotus: immunity and increased HP regeneration while inside; leaving removes both and reentry restores them until expiry. No damage. |
| `luc_duong_chuong` | **Lục Dương Chưởng** | Phiến | Moving spinning attack dealing repeated nearby damage; PvE wave farm. |
| `luu_phong_bo` | **Lưu Phong Bộ** | Phiến | Short directional dash; pursuit/escape and spacing. |
| `chiet_mai_thu` | **Chiết Mai Thủ** | Phiến | Temporary Attack Speed + Movement Speed buff; fast-attack identity. |
| `bach_phien_phong_bao` | **Bách Phiến Phong Bạo** | Phiến U | Large moving fan whirlwind; high AoE output. |
| `phi_anh_tram` | **Phi Ảnh Trảm** | Đao | Forward dash with hard slash; melee engage. |
| `truy_hon_dao` | **Truy Hồn Đao** | Đao | Two quick hits, bonus vs slowed targets; follow-up pressure. |
| `phong_anh_hoan_vi` | **Phong Ảnh Hoán Vị** | Đao | Short retreat opposite the facing captured at cast, preserving facing; existing movement-only evasion/counter remain unchanged. |
| `liet_phong_dao` | **Liệt Phong Đao** | Đao | Hard strike with partial defense penetration; anti-tank. |
| `bach_liet_thien_kich` | **Bách Liệt Thiên Kích** | Đao U | Extremely fast multi-hit forward melee combo; PvP finisher. |

## Võ Đang — Yin–Yang / Âm Dương

**Identity:** mana capacity/regen, low costs, short cooldowns, balanced offense and defense. Quyền cheap utility; Kiếm stronger melee damage and occasional ranged kiếm khí. **Innate passive:** `thai_cuc_tam_phap` — **Thái Cực Tâm Pháp** (auto Mana, Mana Regen, Cooldown Reduction).

**Normal attacks (A):**
- `vo_dang_quyen`: **Võ Đang Quyền** — quick, modest melee palm hit.
- `vo_dang_kiem`: **Võ Đang Kiếm** — melee strike with random chance to emit **non-homing ranged Kiếm Khí**, aimed at nearest eligible enemy at spawn, dodgeable.

| ID | Vietnamese display name | Style | Proposed effect and reason |
|---|---|---|---|
| `luong_nghi_thu` | **Lưỡng Nghi Thủ** | Quyền | Quick inexpensive palm that debuffs enemy Attack Power; consistent protection. |
| `huyen_am_chuong` | **Huyền Âm Chưởng** | Quyền | Short Yin wave slowing movement/attack speed; cheap control. |
| `duong_khi_kich` | **Dương Khí Kích** | Quyền | Short palm skill refunding some mana on successful hit; sustain. |
| `thai_cuc_than_cong` | **Thái Cực Thần Công** | Quyền | Mana shield absorbs damage by spending mana; whether toggle or timed buff still PROPOSED. |
| `thai_cuc_tran` | **Thái Cực Trận** | Quyền U | Yin–Yang field periodically damages/slows within area; team zone control. |
| `that_tinh_kiem` | **Thất Tinh Kiếm** | Kiếm | Several strong close-range sword slashes; dedicated melee damage. |
| `nhan_kiem_hop_nhat` | **Nhân Kiếm Hợp Nhất** | Kiếm | Piercing non-homing sword-energy projectile; ranged option. |
| `bat_quai_kiem_tran` | **Bát Quái Kiếm Trận** | Kiếm | Sword formation damaging enemies in a zone; defensive zone control. |
| `toa_sat_bac_do` | **Tọa Sát Bác Đồ** | Kiếm | Guard up to 5s with 70% damage reduction; accumulate actual HP loss, release once radially at expiry or strictly above 20% maximum HP, using exactly accumulated loss. |
| `van_kiem_quy_tong` | **Vạn Kiếm Quy Tông** | Kiếm U | Continuous straight eight-way sword bursts for a configurable initial 5s; provisional tuning, no homing. |

## Thiếu Lâm — Gold / Kim

**Identity:** highest natural HP/Defense, slower deliberate hits, devastating complete combos; Đao versatile defensive support. **Innate passive:** `dich_can_kinh` — **Dịch Cân Kinh** (auto Max HP, Defense, HP Regen).

**Normal attacks (A):**
- `thieu_lam_quyen`: **Thiếu Lâm Quyền** — four manual punch/punch/kick/roundhouse stages; finisher emits a travelling crescent.
- `thieu_lam_dao`: **Thiếu Lâm Đao** — broader, moderately fast melee slash.

**Phát Động A:** `la_han_quyen` → `vi_da_quyen` → `dai_luc_kim_cuong_chuong` on **same target** (cleaved hits count). Final skill empowered only if target has the two preceding hits in order. **Phát Động B:** `toan_phong_thoai` → `hoanh_tao_cuoc` → `vo_anh_cuoc`, same mechanics. Exact window/rank scaling adjustable.

| ID | Vietnamese display name | Style | Proposed effect and reason |
|---|---|---|---|
| `la_han_quyen` | **La Hán Quyền** | Quyền | Heavy punch, brief guard, combo A step 1; setup and survival. |
| `vi_da_quyen` | **Vi Đà Quyền** | Quyền | Strike reduces target defense, combo A step 2; setup heavy finisher. |
| `dai_luc_kim_cuong_chuong` | **Đại Lực Kim Cương Chưởng** | Quyền | Slow large palm hit, empowered for same target after A1+A2; heavy finisher. |
| `toan_phong_thoai` | **Toàn Phong Thoái** | Quyền | Golden travelling piercing tornado, one hit/target; combo B step 1. |
| `hoanh_tao_cuoc` | **Ca Diệp Thoái** | Quyền | Stationary foot slam; piercing earth mound damages/stuns every crossed target once; combo B step 2. |
| `vo_anh_cuoc` | **Vô Ảnh Cước** | Quyền | One centered foot normally; valid same-target B1+B2 enables three parallel lanes twice. |
| `kim_cang_bat_hoai` | **Kim Cang Bất Hoại** | Quyền | Short damage reduction and interrupt resistance; survive slow commitment. |
| `nhu_lai_niet_ban` | **Như Lai Niết Bàn** | Quyền U | Buddha and sky palm, then a Sanskrit field hitting each target on first entry once/cast; retained defensive buff. |
| `tru_ta` | **Tru Tà** | Đao | Wide frontal slash that slows; consistent melee wave control. |
| `kim_quang_ho_tran` | **Kim Quang Hộ Trận** | Đao | Area defense aura for allies; team protection. |
| `tam_gioi_quy_thien` | **Sư Tử Hống** | Đao | Wide lion-roar AoE damage, defense reduction and slow. |
| `bat_dong_minh_vuong` | **Bất Động Minh Vương** | Đao | Area healing pulse (retained from previous proposal); **OPEN** whether changed to mitigation/protection due to name. |
| `nhu_lai_thien_diep` | **Như Lai Thiên Diệp** | Đao U | Phật quang follows the caster for 15 seconds. Once per second, a straight blade launches toward each nearby enemy with line of sight. Nearby allies receive defense on cast. |

## Data model direction

A skill definition should have at minimum:

- Stable `id`, school ID, display `nameVi`, `style`, category (`active`/`ultimate`), optional asset keys.
- `targetingMode` (`directional`, `self`, `areaAroundSelf`, `projectileTowardNearestAtCast`, `counter`, etc.); **never require mouse targeting**.
- Rank config: allowed ranks, level gates, mana cost, cooldown, effect numbers per rank.
- Composition of reusable effects (damage, projectile, buff, debuff, pull, knockback, dash, spawnZone, shield, heal, silence, disarm, stun, reflect/counter).
- Optional combo membership, status resistance tags, and animation cues.
- Server validates eligibility/rank/cooldown; client renders effect. Keep `nameVi` in localization data, not embedded in simulation code.

Examples in `/examples` are *schemas/shapes for Codex to consider*, not production-validated types. Actual implementation must use validation and tests.
