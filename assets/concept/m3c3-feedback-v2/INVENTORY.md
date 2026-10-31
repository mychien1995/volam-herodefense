# Kiểm kê art và đọc reference

Trạng thái: **CONCEPT_PENDING_REVIEW**. Kiểm kê trước khi tạo concept; số liệu lấy từ file thực, không suy từ screenshot. Bốn asset map đã đọc: `docs/M3A_SKILL_ASSET_MAP.md`, `M3C1_SKILL_ASSET_MAP.md`, `M3C2_SKILL_ASSET_MAP.md`, `M3C3_SKILL_ASSET_MAP.md`. Đã đọc AGENTS, ART_DIRECTION_REFERENCE, ART_PRODUCTION_STANDARD, ART_ASSET_GUIDE, reference README, TECHNICAL_ARCHITECTURE, ROADMAP và workflow art/development.

## 1. Giữ nguyên

| Art có thật | Quyết định |
|---|---|
| `assets/exports/characters/hero_cai_bang{,_chuong}.{png,json}` và source `assets/source/characters/cai_bang_v1_6/` | Giữ bộ mặt/tóc buộc/ribbon đỏ, áo đỏ cổ chéo sáng, belt và bổng gỗ. Idle/walk và basic cũ vẫn nguyên byte; combo mới cần revision riêng. |
| `assets/exports/characters/hero_thien_son{,_dao}.{png,json}`; source `assets/source/characters/thien_son_v01/` | Giữ tóc dài/jade/ribbon trắng, áo thêu trắng-cyan, sash teal. Quạt tay phải/đao hông trái; đao cầm phải khi đổi kiểu. |
| `assets/exports/characters/hero_vo_dang{,_kiem}.{png,json}`; source `assets/source/characters/vo_dang_v01/` | Giữ topknot/ribbon trắng, vest đen/áo trắng, đai âm dương, kiếm thẳng. |
| `assets/exports/characters/hero_thieu_lam{,_dao}.{png,json}`; source `assets/source/characters/thieu_lam_v01/` | Giữ cùng tiểu hòa thượng đầu trọc, áo vàng, tràng hạt sẫm, quấn tay/chân trắng và đao cong bạc. |
| Các icon, source/exports, concept đã duyệt và 8 approval lock | Không thay bytes hoặc trạng thái. Các concept hiện tại chỉ là đầu vào thiết kế, không cắt thành sprite. |
| Arena, enemy, props, HUD, map và reference hiện có | Giữ nguyên. Dùng PNG gameplay lịch sử làm nền mockup, không triển khai môi trường/UI mới. |

Baseline Cái Bang/Thiên Sơn/Quyền Võ Đang/Quyền Thiếu Lâm: canvas80×80, feet(40,64). Kiếm Võ Đang96×80 feet(48,64); Đao Thiếu Lâm112×80 feet(56,64). Origin(0.5,0.8), scale1, body khoảng44 logical px. Source skill Thiếu Lâm128×120 có feet(64,96); không ép về80×80 bằng cách thu/phóng cơ thể.

## 2. Có thể sửa/tái sử dụng trong revision mới

| Bộ retained | Có thật | Tái dùng về art |
|---|---:|---|
| `assets/exports/skills/cai-bang/` | 21 component | Palette lửa, small impact/burn flecks, motif đầu rồng; pha extend/retract và wave cũ làm tài liệu. Không coi cast dùng lại baseline là động tác mới đã vẽ. |
| `assets/exports/skills/thien-son/` | 20 component | Petal sweep, spin, wrist/heel loops, directional dash, slash/contact và endings. Đã có skill art được duyệt; bản mới không thay lock. |
| `assets/exports/skills/vo-dang/` | 20 component | Khí âm dương, shield activation/loop/absorption/ending, formation ground loop và sword slash. Cần vẽ thêm depleted mana và containment response. |
| `assets/exports/skills/thieu-lam/` | 26 component | Gold contact, armor break, empowered/support/ending motifs. Trạng thái skill retained là waiver/prototype, không suy thành director approval cho v2. |

Cả87 metadata `*.animations.json` đều có PNG sheet hiện hữu. [inventory.json](inventory.json) ghi từng sheet, kích thước atlas/canvas, pivot/origin, hướng, phase, loop và hash. Phản hồi “chưa có animation” không chứng minh file không tồn tại: runtime visibility/binding/timing là việc khác, không sửa trong nhánh art này.

## 3. Cần vẽ mới / sửa đáng kể để đáp ứng feedback

| Phái | Revision cần thiết |
|---|---|
| Cái Bang | Bổng bốn nhịp riêng; đầu rồng A6; bố cục Hỏa Vân ba hướng; rồng lớn một đầu đầy đủ thân; sweep quanh người; slam phá giáp; long trảo mở/thu; dash impact mạnh; chó lửa có dáng chạy/orbit. |
| Thiên Sơn | Quạt rời tay/đi/quay/thu/bắt và contact hai lượt; flourish Liên Hoa dài; mantle spin bảo vệ; contact khi lướt; wrist buff rõ; tám quạt phóng ra; A đao rộng; silhouette phase lướt/né; hai luồng đao khí/slow; flurry và finisher lớn. |
| Võ Đang | Quyền trái/phải; âm dương travel; Huyền Âm dài/lớn; bàn tay khí trắng; khiên off/depleted phân biệt; biên trận phản ứng vào trong; kiếm A nối động tác. |
| Thiếu Lâm | Quyền trái/phải; ba skill ba silhouette và ba variant empowered; A đao nặng; Tru Tà rộng/dài; hồi phục motes nhẹ. |

Những mục “rộng/dài/mạnh/nhanh/miễn thương/giữ địch” là mục tiêu minh họa feedback. Không chốt hitbox, damage, cooldown, mitigation, hit count hay thời gian combo.

## Reference đã mở và nhìn trực tiếp

- `cai_bang_character_reference.png`: đầu lớn nhưng thân gọn, mặt đọc rõ, outlines nâu sẫm, cổ áo chéo/ribbon nhất quán, gỗ bổng rõ. Pose phải chủ động xoay vai/hông, không dùng idle trượt.
- Alias `vo_dang_art_direction_reference.png` thiếu. Dùng file thực `vo_dang_character_reference.png` và concept đã duyệt `assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png`: đen/trắng, ribbon, silver, khí trắng có lõi tối đọc được cả trên nền sáng.
- `thien_son_thieu_lam_character_reference.png` thực tế là **cảnh làng**; dùng làm benchmark phối cảnh/chi tiết môi trường. Nhân vật lấy concept đã duyệt `thien-son-concept-v01.png` và `thieu-lam-concept-v02.png` cùng atlas thật, không invent nhân vật từ tên file.
- `in_game_world_reference.png` nay có thật, dù README cũ ghi thiếu; ảnh làng đầy viewport, mái/cây có lớp, paved axes vuông.
- Đã xem `central_arena_hub_reference.png`, `arena_battle_reference.png`, `forest_dungeon_reference.png`, `desert_dungeon_reference.png`, `sea_dungeon_reference.png`, `hell_dungeon_reference.png`: perimeter chi tiết, trọng tâm chiến đấu còn khoảng trống; dùng độ tham vọng, không copy bản đồ.
- Đã xem `dungeon_selection_menu_reference.png`, `merchant_shop_menu_reference.png`, `inventory_menu_reference.png`: overlay trong viewport, không tạo UI mới cho nhánh này.
- `current_codex_dashboard_anti_reference.png` thực tế trùng hướng sheet Võ Đang; anti-reference layout thật là `wuxia_town_world_reference.png`, đã mở và thấy sidebar ngoài map.
- `current_game_2026_10_29_placeholder_anti_reference.png`: nhân vật vuông/đồ vật phẳng/terrain lặp, bị reject. Không lấy nó làm ngưỡng art.
- Đã xem atlas thật của cả8 style, concept Cái Bang trước đó, contact sheet skill của ba phái còn lại, và PNG gameplay M3A/M3C1/M3C2/M3C3. Nền preview cuối dùng đúng nguồn được lưu ở [reference_actual_gameplay_1280.png](reference_actual_gameplay_1280.png).

## Khác biệt hình ảnh cần giải quyết

Character identity giữ được, nhưng VFX retained nhiều skill chỉ đọc như crescent/mote nhỏ và ba skill Quyền Kim chưa phân tầng silhouette. Concept v2 tăng khác biệt hướng, silhouette và contact, vẫn để hở đất/chân. Không bê tỷ lệ portrait vào game. Chibi concept có thể đẹp khi phóng lớn nhưng mặt/tay/weapon continuity phải được vẽ lại và duyệt tại44 px body trong production.
