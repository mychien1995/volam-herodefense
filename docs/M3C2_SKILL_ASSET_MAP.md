# M3C2 — retained Võ Đang asset mapping

All artwork is retained. `assets/exports/skills/vo-dang/production_manifest_v01.json` and `assets/approved_vo_dang_skills.lock.json` record the director's 2026-10-31 approval; `assets/approved_vo_dang.lock.json` protects the previously approved baseline. This task adds gameplay integration, not new artwork or a new approval claim. Original AI-assisted project provenance, prompts, editable Aseprite sources and disclosed reused pixels remain in the supplied manifests. No external sprite pack is introduced.

The actual audit (`scripts/audit-m3c2-assets.py`) found **753 PNGs** including retained individual frames, **20 skill components** and **13 icons**. Full dimensions, alpha, atlas bounds, named frames, animation metadata, source/provenance and hashes are in `docs/evidence/m3c2/asset-inventory.json`. `asset-contact-sheet.png` contains actual crops. Preparation validates the combined Cái Bang/Thiên Sơn/Võ Đang registry and copies unchanged retained bytes.

## Baselines and icons

`assets/exports/characters/hero_vo_dang.png/json`: Quyền, 80×80 frames, feet(40,64). `hero_vo_dang_kiem.png/json`: Kiếm, 96×80 frames, feet(48,64). Both have 40 frames: four facings × (2 idle,4 walk,4 basic attack); origin(0.5,0.8), scale1, idle350ms/frame, walk120ms/frame, attack75ms/frame. The school card, HUD and dungeon avatar reuse these approved idle PNGs. QWER never require matching A style.

All thirteen retained 64×64 icons follow `assets/exports/skills/vo-dang/{canonical_id}/icon.png`: ten actives, `vo_dang_quyen`, `vo_dang_kiem`, `thai_cuc_tam_phap`. The individual PNGs are used in M3B menus/hotbar; the retained icon strip remains available.

## Active mapping

Every row uses `assets/exports/skills/vo-dang/{id}/{id}_character.png/json` and `{id}_vfx.png/json`. Ordered frames, origins, offsets, placement and fps come from the production manifest, not a guessed grid. Character tags are `cast_down/left/right/up`, four frames at12.5fps (shield/ultimate11.111fps; formations10fps), Quyền80×80 or Kiếm96×80, feet origin(0.5,0.8), scale1.

| Canonical ID / skill | Gameplay status | VFX binding | VFX frame canvas |
| --- | --- | --- | --- |
| `luong_nghi_thu` — Lưỡng Nghi Thủ | Implemented | `release_*`, hit `impact_*`, target `weakening` while Attack Power reduction lasts |96×96|
| `huyen_am_chuong` — Huyền Âm Chưởng | Implemented | `release_*`, server projectile `travel_*`, hit `impact_*`, target-feet `slow` |96×96|
| `duong_khi_kich` — Dương Khí Kích | Implemented | `release_*`, hit `impact_*`, authoritative successful-hit refund `mana_return_*` |96×96|
| `thai_cuc_than_cong` — Thái Cực Thần Công | Implemented, timed prototype | `activation`, owner `loop`, damage-triggered `absorption`, `ending` |112×112|
| `thai_cuc_tran` — Thái Cực Trận | Implemented | `activation`, synchronized stationary area `loop`, server tick `pulse`, fixed-position `ending` |192×192|
| `that_tinh_kiem` — Thất Tinh Kiếm | Implemented | scheduled `slash_a_*` / `slash_b_*`, target `impact_*` |96×96|
| `nhan_kiem_hop_nhat` — Nhân Kiếm Hợp Nhất | Implemented | `release_*`, piercing projectile `travel_*`, target `impact_*` |96×96|
| `bat_quai_kiem_tran` — Bát Quái Kiếm Trận | Implemented | `activation`, synchronized stationary area `loop`, tick `pulse`, fixed-position `ending` |192×192|
| `toa_sat_bac_do` — Tọa Sát Bác Đồ | Implemented | owner `readiness_*`, incoming `received_*`, authoritative `counter_*`, `ending_*`; character `ready_*` / `counter_*` |96×96|
| `van_kiem_quy_tong` — Vạn Kiếm Quy Tông | Implemented | `preparation`, `release_*`, five server-owned `travel_*` waves, target `impact_*` |96×96|

`*` means four authored cardinal facings. Travel art rotates from its authored cardinal direction to the actual fixed server velocity, including the ultimate fan. Formation loops/pulses/endings use server radius and a fixed world anchor, behind actor feet. Other VFX retain the supplied scale1/origin/hand/body/target offsets. Single-play effects destroy on animation completion plus a bounded fallback; statuses/area/projectile removal controls persistent cleanup. No client animation causes a hit or resource change.

Quyền A reuses its approved baseline attack plus Lưỡng Nghi's supplied palm release/impact; Kiếm A reuses its baseline sword attack plus Thất Tinh slash/ Nhân Kiếm impact, and the **server-owned proc** uses Nhân Kiếm's retained sword-qi travel frames. No generic fire impact is substituted for Yin–Yang attacks.

## Missing / retained unused artwork

- Independently authored baseline hurt/death remain missing. Existing idle aliases are disclosed; generic baseline cast aliases are superseded by the ten dedicated skill sheets. No claim of newly completed hurt/death art.
- Optional `ending_*` tags on Lưỡng Nghi, Dương Khí, Thất Tinh and Nhân Kiếm remain in the retained gallery but are not separate gameplay phases; their gameplay effects finish via the bound impact/despawn. Duplicate individual PNGs, raw generation attempts, concept images and the icon strip remain retained.
- The existing shared-qi reuse is documented by the approved production manifest. No dedicated replacement Kiếm Khí asset was generated.
- Legacy practice creeps and unrelated environment/UI art limitations remain outside this school integration. The old `vo_dang_art_direction_reference.png` alias is absent; the actual `vo_dang_character_reference.png`, supplied world/menu references and placeholder anti-reference were inspected. `current_codex_dashboard_anti_reference.png` contains the duplicated character reference; the genuine full-world reference and negative placeholder screenshot were inspected separately.
