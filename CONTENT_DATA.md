# Content Catalogue v1.0 — Canonical Vietnamese names

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
| `lien_hoa_phien` | **Liên Hoa Phiến** | Phiến | Several rapid frontal fan hits; reliable melee AoE. |
| `luc_duong_chuong` | **Lục Dương Chưởng** | Phiến | Moving spinning attack dealing repeated nearby damage; PvE wave farm. |
| `luu_phong_bo` | **Lưu Phong Bộ** | Phiến | Short directional dash; pursuit/escape and spacing. |
| `chiet_mai_thu` | **Chiết Mai Thủ** | Phiến | Temporary Attack Speed + Movement Speed buff; fast-attack identity. |
| `bach_phien_phong_bao` | **Bách Phiến Phong Bạo** | Phiến U | Large moving fan whirlwind; high AoE output. |
| `phi_anh_tram` | **Phi Ảnh Trảm** | Đao | Forward dash with hard slash; melee engage. |
| `truy_hon_dao` | **Truy Hồn Đao** | Đao | Two quick hits, bonus vs slowed targets; follow-up pressure. |
| `phong_anh_hoan_vi` | **Phong Ảnh Hoán Vị** | Đao | Evasive short step with timed counter window; reaction skill. |
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
| `toa_sat_bac_do` | **Tọa Sát Bác Đồ** | Kiếm | Short counter stance; being attacked prompts retaliatory slash; deliberate defense. |
| `van_kiem_quy_tong` | **Vạn Kiếm Quy Tông** | Kiếm U | Several sword-energy waves in wide frontal pattern; powerful burst. |

## Thiếu Lâm — Gold / Kim

**Identity:** highest natural HP/Defense, slower deliberate hits, devastating complete combos; Đao versatile defensive support. **Innate passive:** `dich_can_kinh` — **Dịch Cân Kinh** (auto Max HP, Defense, HP Regen).

**Normal attacks (A):**
- `thieu_lam_quyen`: **Thiếu Lâm Quyền** — heavy, slow, short frontal punch.
- `thieu_lam_dao`: **Thiếu Lâm Đao** — broader, moderately fast melee slash.

**Phát Động A:** `la_han_quyen` → `vi_da_quyen` → `dai_luc_kim_cuong_chuong` on **same target** (cleaved hits count). Final skill empowered only if target has the two preceding hits in order. **Phát Động B:** `toan_phong_thoai` → `hoanh_tao_cuoc` → `vo_anh_cuoc`, same mechanics. Exact window/rank scaling adjustable.

| ID | Vietnamese display name | Style | Proposed effect and reason |
|---|---|---|---|
| `la_han_quyen` | **La Hán Quyền** | Quyền | Heavy punch, brief guard, combo A step 1; setup and survival. |
| `vi_da_quyen` | **Vi Đà Quyền** | Quyền | Strike reduces target defense, combo A step 2; setup heavy finisher. |
| `dai_luc_kim_cuong_chuong` | **Đại Lực Kim Cương Chưởng** | Quyền | Slow large palm hit, empowered for same target after A1+A2; heavy finisher. |
| `toan_phong_thoai` | **Toàn Phong Thoái** | Quyền | Spinning kick, combo B step 1; opening AoE. |
| `hoanh_tao_cuoc` | **Hoành Tảo Cước** | Quyền | Wide sweep, combo B step 2; area setup. |
| `vo_anh_cuoc` | **Vô Ảnh Cước** | Quyền | Rapid kicks, stronger after B1+B2 on target; multi-hit finisher. |
| `kim_cang_bat_hoai` | **Kim Cang Bất Hoại** | Quyền | Short damage reduction and interrupt resistance; survive slow commitment. |
| `nhu_lai_niet_ban` | **Như Lai Niết Bàn** | Quyền U | Huge golden ground strike plus temporary defensive aftereffect; signature attack. |
| `tru_ta` | **Tru Tà** | Đao | Wide frontal slash that slows; consistent melee wave control. |
| `kim_quang_ho_tran` | **Kim Quang Hộ Trận** | Đao | Area defense aura for allies; team protection. |
| `tam_gioi_quy_thien` | **Tam Giới Quy Thiền** | Đao | Powerful slash with defense reduction; helps party damage. |
| `bat_dong_minh_vuong` | **Bất Động Minh Vương** | Đao | Area healing pulse (retained from previous proposal); **OPEN** whether changed to mitigation/protection due to name. |
| `nhu_lai_thien_diep` | **Như Lai Thiên Diệp** | Đao U | Golden wide wave damaging foes and boosting allied defense; support+offense. |

## Data model direction

A skill definition should have at minimum:

- Stable `id`, school ID, display `nameVi`, `style`, category (`active`/`ultimate`), optional asset keys.
- `targetingMode` (`directional`, `self`, `areaAroundSelf`, `projectileTowardNearestAtCast`, `counter`, etc.); **never require mouse targeting**.
- Rank config: allowed ranks, level gates, mana cost, cooldown, effect numbers per rank.
- Composition of reusable effects (damage, projectile, buff, debuff, pull, knockback, dash, spawnZone, shield, heal, silence, disarm, stun, reflect/counter).
- Optional combo membership, status resistance tags, and animation cues.
- Server validates eligibility/rank/cooldown; client renders effect. Keep `nameVi` in localization data, not embedded in simulation code.

Examples in `/examples` are *schemas/shapes for Codex to consider*, not production-validated types. Actual implementation must use validation and tests.
