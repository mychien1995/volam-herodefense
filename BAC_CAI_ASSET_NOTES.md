# Bắc Cái — Hồng Thất Công asset package v01

**Current approval,2026-11-02:** visual/choreography v03 is explicitly director-approved for Phaser integration. Current approval scope and retained facing gaps: `assets/reviews/bosses/bac_cai_v03/director_approval.json`. Historical v01/v02 status/mappings below remain delivery history. Live combat integration and final runtime/balance approval have not occurred. Prompt: `docs/BAC_CAI_PHASER_INTEGRATION_PROMPT.md`.

**Superseded mapping, 2026-11-02:** The director's final boss brief in `docs/BAC_CAI_FINAL_DESIGN.md` overrides the historical skill-to-art mapping below. The v01 artwork stays intact and is reused by the isolated `bac-cai-preview.html` scene. The v02 supplement is under `assets/sprites/bosses/main/bac-cai/rework-v02/`; new art and final runtime approval remain pending. Historical delivery details below describe the original asset-only task, not the current preview verification.

Produced 2026-10-31. Stable boss ID: `bac_cai`; character texture key: `boss_bac_cai`.
**Asset production only.** Concepts automatically approved under the explicit task instruction. Production files are staged assets; runtime playback/approval is not claimed. No game, loader, AI, balance, boss progression, map or other-boss files are changed. No servers, Phaser, screenshots, recordings or test suites were started/generated.

## Files

| Content | Repository path |
|---|---|
| Master concept: four views, staff/gourd, five poses, palette, hero/boss scale direction | `assets/concepts/main-bosses/bac-cai/master_concept_v01.png` |
| Individual full-character illustration | `assets/concepts/main-bosses/bac-cai/individual_concept_v01.png` |
| Character atlas, animation metadata, 224 individual cels | `assets/sprites/bosses/main/bac-cai/boss_bac_cai.{png,json,animations.json}` and `frames/` |
| Staff VFX | `assets/effects/bosses/main/bac-cai/staff/bac_cai_staff.{png,json,animations.json}` |
| Dragon palm VFX | `assets/effects/bosses/main/bac-cai/dragon-palms/bac_cai_dragon_palms.{png,json,animations.json}` |
| Ultimate VFX | `assets/effects/bosses/main/bac-cai/ultimate/bac_cai_ultimate.{png,json,animations.json}` |
| Defensive/passive VFX | `assets/effects/bosses/main/bac-cai/defense/bac_cai_defense.{png,json,animations.json}` |
| Warning markers and shared impacts | `assets/effects/bosses/main/bac-cai/shared/bac_cai_shared.{png,json,animations.json}` |
| Portrait and eight skill/basic/passive icons | `assets/icons/bosses/bac-cai/`: nine named 64px PNGs, `portrait_256.png`, `bac_cai_icons.{png,json,animations.json}` |
| Inventory, provenance, hashes, status | `assets/sprites/bosses/main/bac-cai/package_manifest_v01.json` |
| Original generated PNGs, exact prompts, extraction recipe | `assets/sprites/bosses/main/bac-cai/source/` |
| One final offline verification | `assets/sprites/bosses/main/bac-cai/asset_verification_v01.json` |

Each VFX folder also contains its 32 individual frame PNGs under `frames/`. Texture keys are the PNG basenames shown above. Atlas JSON uses explicit hash-keyed untrimmed frame rectangles and named frame tags. No grid inference or loader registration is required by this delivery.

## Character frames

Four independently generated facings: `down`, `up`, `left`, `right`. Four authored cels per action/facing; 14 actions, 56 clips, 224 cels. Names: `{action}_{direction}_{0..3}`. Animation keys: `boss_bac_cai_{action}_{direction}`.

Actions: `idle`, `walk`, `staff_basic`, `staff_combo`, `staff_spin`, `palm_stance`, `dragon_charge`, `dragon_release`, `jumping_palm`, `counter_guard`, `ultimate_charge`, `ultimate_palms`, `hurt`, `death`.

Canvas **160×112**, fixed feet pivot **(80,88)** / normalized **(0.5,0.7857142857)**; roughly 56px standing silhouette, compared with the existing approved hero's roughly 44px body. The larger canvas clears staff/arms without enlarging collision geometry. Palm poses stow the staff behind the body. Jump cels include visual lifts `[0,14,7,0]`px relative to the common ground anchor; do not apply these a second time. Defeat is a four-cel collapse, not a faded idle.

Proposed visual durations: idle250ms, walk120ms, dragon charge160ms, ultimate charge180ms, death140ms, other actions85ms per cel. Idle/walk/palm stance loop; other character clips play once. These numbers are visual playback proposals only.

## Skill-to-art mapping

VFX groups below use four cels named `{group}_{0..3}`. Keys: `bac_cai_{family}_{group}`, where `dragon-palms` becomes `dragon_palms`. All effects have **160×160** canvases with **(80,80)** origins. Default100ms/cel; warnings120ms/cel. Explicit loop, placement, facing and suggested alpha are in each animation JSON.

| Stable asset skill ID / display name | Character action | VFX family: groups |
|---|---|---|
| `da_cau_bong_kich` — Đả Cẩu Bổng Kích | `staff_basic` | staff: `staff_slash`, `multi_hit_impact`; shared: `boss_hit` |
| `bong_da_ac_khuyen` — Bổng Đả Ác Khuyển | `staff_combo` | shared: `frontal_warning`; staff: `staff_slash`, `multi_hit_impact`, `heavy_finisher`, `knockback_wake` |
| `thien_ha_vo_cau` — Thiên Hạ Vô Cẩu | `staff_spin` | shared: `circle_warning`; staff: `wide_jade_arc`, `staff_whirlwind`, `ground_smash`; dragon-palms: `palm_shockwave` available as a separate golden finisher accent |
| `khang_long_huu_hoi` — Kháng Long Hữu Hối | `dragon_charge` → `dragon_release` | shared: `direction_warning`; dragon-palms: `palm_gather`, `dragon_projectile`, `dragon_trail`, `dragon_impact`, `gold_dissipate` |
| `phi_long_tai_thien` — Phi Long Tại Thiên | `jumping_palm` | shared: `landing_warning`; dragon-palms: `leap_dragon_trail`, `landing_dragon_burst`, `palm_shockwave`; staff: `ground_smash` for dust/stone |
| `kien_long_tai_dien` — Kiến Long Tại Điền | `counter_guard` | defense: `shield_activate`, `counter_shield`, `counter_warning`, `shield_expire`; dragon-palms: `palm_shockwave`; defense: `strong_hit` |
| `hang_long_thap_bat_chuong` — Hàng Long Thập Bát Chưởng | `ultimate_charge` → `ultimate_palms` | shared: `ultimate_lane_warning`, `direction_warning`; ultimate: `ultimate_aura`, `arm_dragon_spirals`, `dragon_fast`, `dragon_wide`, `dragon_twin`, `sequential_palm`, `final_dragon_burst`, `ultimate_end`; dragon-palms: `palm_shockwave` |
| `cai_bang_tong_su` — Cái Bang Tông Sư | presentation over current action | defense: `master_aura`, `strong_hit`, `critical_hit`, `resistance_flash` |
| Shared / optional reusable staff projectile | `hurt`, `death` as applicable | staff: `jade_projectile`; shared: `projectile_impact`, `boss_hit`, `boss_death` |

The six signature skill IDs above are asset names scoped to this boss, including names shared with playable Cái Bang. They do not redefine the existing school's skill mechanics.

## Integration handoff

- Retain nearest sampling and native scale. Sources were newly generated for this boss, not enlarged/recolored hero sprites or cropped concept poses. Whole drawn cels are cropped/aligned with one scale per source sheet; no synthetic walk/combat poses.
- Gold is internal dragon-shaped qi, not fire or Nam Đế's Buddhist beams. Defense uses open asymmetrical paired dragon-whisker arcs; staff uses jade/mint and physical dust/stone. Binary alpha removes low-alpha RGB fringes in raw outputs.
- Right-authored projectiles/linear markers expose that facing in metadata. Orient their presentation to the authoritative aim; do not make projectiles track targets. Ground ellipses retain the fixed overworld perspective. Frontal fan expands rightward from the left; its later integration should use the warning's rear/apex as emitter rather than assume its canvas center is the caster.
- Keep warning rims visible above decorative energy, with open safe gaps between ultimate lanes. Master aura suggested opacity0.35; shield/ultimate aura0.65. Avoid layering multiple maximum-size bursts over the entire arena. These are visual suggestions, not verified six-player results.
- Server events must own trajectories, impact, damage, counter triggers, invulnerability, resistance, knockback and defeat. Animation duration, visual footprint and suggested loops never establish gameplay range/timing or stance-switching logic. No forced phase transition is supplied.
- Maintain main invasion progression Đông Tà → Tây Độc → Nam Đế → Bắc Cái → Vương Trùng Dương. No dungeon, arena, minions, drops, portals or dungeon UI are included.

## Verification, sources and limitations

Built-in `image_gen` produced the original raster art. Exact prompts and generator filenames are retained in `source/generation_jobs_v01.json`; source/output hashes and extraction rectangles are recorded. Source files are flattened PNGs with a reproducible Pillow/NumPy preparation recipe, not layered Aseprite documents. Re-export: `python -X utf8 assets/sprites/bosses/main/bac-cai/source/export_assets_v01.py`.

Inspected references: approved Cái Bang/Thiên Sơn character exports, playable-school concept references, Cái Bang Thiên Hạ Vô Cẩu effects, arena Ma Khuyển, Chu Bá Thông dungeon boss, Đông Tà/Tây Độc concepts and approved arena artwork; also the mandatory rejected placeholder screenshot. The old Võ Đang reference path is absent; actual `assets/references/vo_dang_character_reference.png` was inspected. Nam Đế assets were unavailable at the initial audit.

All requested asset categories are supplied. The generated concept's hero/boss scale panel is an illustrative comparison, not a byte-for-byte reproduction of an approved hero frame. Runtime animation smoothness, directional transitions and six-player readability remain unverified because this task explicitly forbids Phaser. No runtime approval is implied by automatic concept approval. See the final asset verification JSON for actual PNG/metadata checks and any issues.
