# M3C3 feedback v2 — art production delivery

Status: **PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW**. Bốn batch đã có source và file xuất; chưa tích hợp hoặc duyệt art trong Phaser. Concept và mẫu Bổng đã được người dùng duyệt; mẫu Bổng cũ giữ nguyên byte/hash.

Không sửa logic, Phaser, runtime mapping, approval lock hoặc tài liệu gameplay. Không tạo GIF/video. Animation trình bày kết quả server; contact marker, duration và vòng VFX không gây damage.

| Batch | Frame | Tag | Source/atlas | Review + bảng skill/stage |
|---|---:|---:|---:|---|
| CÁI BANG | 484 | 102 | 17 | [Bàn giao](01_cai_bang/README.md) |
| THIÊN SƠN | 742 | 177 | 12 | [Bàn giao](02_thien_son/README.md) |
| VÕ ĐANG | 488 | 112 | 7 | [Bàn giao](03_vo_dang/README.md) |
| THIẾU LÂM | 462 | 148 | 7 | [Bàn giao](04_thieu_lam/README.md) |

Tổng: 2176 frame, 539 tag, 43 bộ editable .aseprite + transparent PNG + atlas JSON + animation metadata. Count gồm cels tái sử dụng được xuất thành bộ v2, không phải tất cả đều vẽ mới.

[Mockup bốn batch](batch_mockups_overview.png) · [Bảng component](component_inventory.csv) · [Thứ tự mọi frame](frame_inventory.csv) · [Skill/stage handoff JSON](asset_handoff.json) · [Kiểm tra file](static_delivery_audit.json) · [Danh sách file chính xác + SHA256](file_inventory.json)

## Cấu trúc bàn giao

- Source: assets/source/skills/m3c3_feedback_v2_batches/<batch>/. Mỗi component có source .aseprite với cels/tags/slice pivot chỉnh sửa được; generated PNG gốc, prompt, measurements, frame plan và provenance được giữ riêng.
- Export: assets/exports/skills/m3c3_feedback_v2_batches/<batch>/<handoff-id>/. Mỗi role có .png, hash-atlas .json, .animations.json schema2, cùng PNG từng frame.
- Review: thư mục này; PNG contact sheet native, crop kiểm tra nhân vật, mockup logical1x/display2x. Mockup ghép lên screenshot lịch sử, có nhãn NOT GAME CAPTURE; không phải ảnh chụp game sau tích hợp.

## Tương thích và cách đọc metadata

Nhân vật canvas160x120, pivot chân(80,96), origin(0.5,0.8), displayScale1. Chiều cao guard44px khớp idle gốc80x80 có chân(40,64). Mẫu Bổng giữ canvas112x100/pivot(56,80) đã duyệt; tham chiếu riêng trong batch Cái Bang. VFX256x256, anchor(128,128); placementOffsetFromFeet là offset trình bày, không phải hitbox. Không bake bóng mới: dùng foot-shadow hiện tại khi tích hợp.

Animation metadata ghi frames, frameDurationsMs, direction, framePhases/phase, pivot, loop/oneShot, contactMarkers và điều kiện server. Duration là playback tham chiếu; fit theo interval/state được nhận. Đánh thường Thiên Sơn có base300ms và min5ticks; không khóa input để chờ hoàn thành animation. Quạt đi/về dùng projectile leg; return samples owner một lần. Tám hướng ultimate có tag riêng và hướng tùy ý được phép theo heading thực.

Khiên có opening/loop/absorb/off/depleted riêng. Loop phải dừng theo toggle, cạn mana, chết hoặc cleanup. Trận pháp dùng cùng ground projection không quay camera; inward_response_* chứa cả viền, nên thay tạm frame loop của field khi phản ứng, không cộng thêm một viền thứ hai. Không tạo stun/cage.

## Kiểm tra đã làm và phần còn chờ

Kiểm tra từng atlas/cel PNG, alpha, clipping, frame duration, tag order, Aseprite header/frame count, pivot/origin, đủ bốn hướng; quạt ultimate đủ tám hướng; palette192 lấy từ foreground hero đã duyệt cho pose MỚI. Cels tái sử dụng được so pixel ở native scale; 860 lượt cel khớp nguyên bản. 240 lượt cel nhân vật mới nằm trong palette đã đối chiếu. Tất cả3023 file được bảo vệ, gồm mẫu Bổng và approval locks, giữ nguyên hash.

Quan sát tĩnh: kiểm tra mặt/tóc/trang phục/tay/vũ khí/chân trong source và contact sheet; loại pose Thiếu Lâm sai facing, thay riêng normal-palm source có nét dính giữa ô; tách VFX theo stroke raster nguyên vẹn để tránh cắt theo grid lệch. Nguồn lỗi vẫn giữ để provenance nhưng không gán vào atlas sử dụng. Đây chưa phải xác nhận motion continuity trong game.

Chờ chat tích hợp kiểm tra trong Phaser ở zoom chơi thường: playback đủ hướng, nối đòn và restart theo attack speed, boomerang và hit hai leg, moving-dash immunity cue, cleanup/ending, foot/Y-depth/shadow, trạng thái mana và containment, cuối cùng natural combat6người. Không chạy game/test suite trong chat art; không đổi approval lock.

## Provenance và alias tham chiếu

Tạo raster mới bằng OpenAI built-in image_gen theo concept đã duyệt, không cắt concept làm atlas. Crop/mask/nearest-neighbor downsample, palette match và atlas export bằng Aseprite1.3.18.6. Không dùng hình học procedural để tạo artwork, không phóng to concept giả sprite. Prompt, source-output path nếu có, source PNG hash và mọi transform nằm trong source generation_records.json / *_frame_plan.json.

Alias đã xử lý theo file thực tế: vo_dang_art_direction_reference.png → vo_dang_character_reference.png. thien_son_thieu_lam_character_reference.png thực tế là town. current_codex_dashboard_anti_reference.png thực tế là Võ Đang sheet; negative dashboard đúng là wuxia_town_world_reference.png. Placeholder negative đúng là current_game_2026_10_29_placeholder_anti_reference.png. in_game_world_reference.png hiện có. Không dùng nhầm alias làm chuẩn.

Mỗi role/gói có trạng thái pending runtime. Người dùng duyệt concept và mẫu không được chuyển thành runtime approval cho loạt mới.
