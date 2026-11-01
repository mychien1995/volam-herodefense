# Kim Luân Pháp Vương · art review v01

Ngày 2026-11-01. Worktree/branch: wip/m3d/kim-luan-phap-vuong.
**PROTOTYPE — chờ director duyệt hình ảnh.** Bản xem dùng Phaser 4.2.1 thật, một viewport toàn màn hình. Chưa đăng ký dungeon hoặc triển khai AI, sát thương, status, RNG gameplay, loot hay multiplayer encounter.

Mở [bản xem động](http://127.0.0.1:5418/assets/reviews/bosses/kim_luan_phap_vuong_v01/). Nếu server đã tắt, chạy từ root worktree:

    python assets/reviews/bosses/kim_luan_phap_vuong_v01/serve.py

Chọn chiêu ở dưới; kéo timeline; dừng/chạy; tốc độ 0,25×/0,5×/1×; chọn hướng idle; chọn 1/2/3/6 hình người để xem tỷ lệ. Arrow keys di chuyển hero, Space dừng, H ẩn HUD. Trong cảnh Phong Tỏa, bật Đồng đội cứu rồi A ba lần để minh họa phá luân xa. Ba lần chỉ là thông số visual thử, không chốt cơ chế server. Sprite mở PNG atlas thực tế ngay trong viewport.

## Bộ giao

| Thành phần | File / phạm vi |
| --- | --- |
| Ba nhân vật | 96 cel baseline: bốn hướng × (2 idle, 4 walk, 2 pose đánh ứng viên); 48 cel kỹ năng riêng |
| Playback nhân vật | 72 idle/walk cel và 48 action cel; **24 baseline attack candidate không được dùng**, vì một số hướng đánh quay về camera |
| VFX | 48 cel / 12 sequence: quạt, gió, đinh độc, xoáy; nứt đất, địa chấn, đá, chân khí; kim luân, xung kích, luân xa, cường hóa |
| Voi / mỏm đá | 4 cel voi chạy xuống và 4 cel đá trồi lên |
| Tương Dương | 12 prop riêng (cổng thành, tường, tháp, doanh trại, cờ, trống, lò lửa, đá, hàng tiếp tế, đổ nát); 256 tile 32px từ 16 mảng vật liệu gốc; bản đồ Tiled ghép lớp |
| Bản xem | 17 lựa chọn: toàn trận và 16 đòn/kỹ năng; timeline tương tác, đội hình 1–6 |
| Nguồn / provenance | assets/source/bosses/kim_luan_phap_vuong_v01/ |
| PNG + JSON + từng cel | assets/exports/bosses/kim_luan_phap_vuong_v01/ |

Tổng source/export: **212 cel gồm 200 character/VFX/voi/đá + 12 prop**. Playback chọn **176 frame trong 50 clip**, không tính hero Võ Đang giữ nguyên và prop tĩnh. Manifest ghi đủ source rectangles, scale, anchor, hash, frame names và trạng thái.

## Choreography có thể xem

- Hai học trò hiện trước. Hoắc Đô đổi vị trí nhanh, Đạt Nhĩ Ba chậm hơn. Timeline minh họa Hoắc Đô rời trận ở giây6, Đạt Nhĩ Ba ở giây12; chỉ sau đó Pháp Vương xuất hiện. Đây là choreography review, không phải fake kill/damage.
- Hoắc Đô: ba nhát quạt và kiếm khí cuối bay thẳng; ba luồng gió; năm đinh độc theo nan quạt; bốn pose spin thật kèm đinh bắn liên tục mọi hướng. Quy tắc tăng sát thương theo số đinh/đủ5 chết được ghi lại, chưa giả lập HP.
- Đạt Nhĩ Ba: quét chùy rộng phía trước; nện đất với nổ chậm **0,5 giây**; đúng một aura chuyển giữa hai người; bê/ném đá chốt mục tiêu khi thả; ba vòng chấn động tăng kích thước.
- Pháp Vương: năm luân quạt trước mặt; năm luân bật quanh arena lâu rồi hết; năm luân orbit rồi thoát theo năm hướng; luân xa và xung kích khi đồng đội chưa phá; chấn động lan dần; đá trồi lên rồi đàn voi chạy từ trên xuống, các làn trúng đá dừng/hiện impact; pha29% minh họa tốc độ tăng và làn voi có seed.
- Hai đòn đều có tên Đại Lực Phá Sơn giữ nguyên tên hiển thị; ID khác nhau theo hành động, xem asset_map.json.

Toàn bộ thời lượng ngoài0,5giây, bán kính, tốc độ,3đòn phá luân xa, các mốc chuyển pha và seed đều là **cấu hình thử cho review**, không phải số liệu combat đã duyệt. Di chuyển, A, điều kiện 30% và số hit trong bản xem không có authority.

## Nguồn, xuất và giới hạn art

Nguồn mới là PNG gốc AI-assisted của project, tạo bằng **built-in OpenAI image_gen**, không dùng CLI/API fallback, không lấy pixel từ game/pack bên ngoài. Prompt thực tế lưu trong generation.json, requests_batch_02.json, source_prompts_supplement.json và safe_requests.json ở source folder. Bản sửa/lần thử được giữ nguyên; nguồn phẳng không được gọi là layered Aseprite. Không khẳng định quyền tác giả độc quyền.

Dùng lại alpha-gutter exporter của Hoàn Nhan, chỉ thêm tùy chọn base/out; defaults của batch cũ giữ nguyên. Mỗi source group dùng cùng scale, nearest-neighbor; không kéo giãn từng frame. Terrain và từng prop là nguồn rời được ghép theo Tiled; không dùng ảnh concept nguyên màn hình giả làm map. Collision/markers trong map là đề xuất cho lần tích hợp sau, không thay collision server.

**Idle/walk có bốn hướng; action chuyên biệt đang hướng xuống**, riêng Hoắc Đô spin có bốn pose hướng khác nhau. Không dùng mirror/rotate body để giả đủ hướng. Chưa có hurt/death riêng. Hoắc Đô khoảng52px, Pháp Vương60px; Đạt Nhĩ Ba nặng/rộng hơn, baseline scale0.30. Pivot actor chuẩn hóa(0.5,0.8), canvas128px cho Kim baseline,160px cho phần còn lại; VFX256px có pivot riêng.

Bề mặt pixel hiện được lấy từ raster chi tiết bằng nearest sampling, vẫn cần director đánh giá độ sắc và tính đồng nhất ở zoom thật. Mặt/đường viền nhỏ ít chi tiết hơn concept phóng to; nền đá vẫn có lặp và đường nối giữa mảng vật liệu, biên sân/khối thành cần polish. Fine cleanup, toàn bộ hướng cast, hurt/death và final production approval còn mở.

## Kiểm tra thực chạy

    python assets/source/bosses/kim_luan_phap_vuong_v01/prepare.py
    python assets/source/bosses/kim_luan_phap_vuong_v01/verify.py
    node assets/reviews/bosses/kim_luan_phap_vuong_v01/verify.mjs

- Static: PASS212source/export cel, hash/alpha/nonempty/atlas parity,256tile,12prop,176selectedframe/50clip.
- Phaser review: PASS **65 nhóm assertion**, mọi frame được chọn, đủ một chu kỳ loop và hoàn tất one-shot, interval sự kiện khớp cadence. Kết quả machine-readable: verification.json, static_verification.json.
- Browser Microsoft Edge, Phaser4.2.1; viewport944×466,1280×720,1920×1080. PNG arena-design.png và arena-action.png được mở/đối chiếu. Không video/trace recording.
- Sáu hình hero là mốc độ rõ, **một browser/client review**, không phải sáu client combat. Không có kết quả natural combat, room sync, damage, chết/loot hoặc balance mới.
- Full pipeline: dừng ở prepare vì hash Beach terrain.tsj khác provenance manifest có sẵn; file khớp byte Git HEAD. Giữ nguyên guard. Typecheck, full unit/integration, build và validators toàn cục chưa chạy qua pipeline. final_check.json ghi exact hash/lệnh. Browser stage chạy riêng PASS1test/65assertion (31,6giây); không suy diễn PASS các stage chưa chạy.

Đối chiếu ảnh thực với vo_dang_character_reference.png, cai_bang_character_reference.png, central_arena_hub_reference.png, arena_battle_reference.png và anti-reference hiện tại. vo_dang_art_direction_reference.png không tồn tại trên base này; dùng Võ Đang reference thật hiện có. current_codex_dashboard_anti_reference.png thực chất là ảnh Võ Đang; wuxia_town_world_reference.png mới chứa dashboard cũ. Giữ nguyên toàn bộ reference.

So với anti-reference: đã có sprite người nhiều chi tiết, prop raster riêng, VFX riêng và không có cột dashboard bên ngoài. So với positive: cảnh thành chủ đích ít cây/nước hơn hub; chất liệu đá còn đều/lặp, tương phản môi trường và cels kỹ năng cần review. **Pass kỹ thuật không có nghĩa director đã APPROVED.**

PNG giao kèm: characters_native.png, characters_2x.png, arena-design.png, arena-action.png, skill-overview.png (bốn panel từ Phaser thật) và reference-comparison.png. Tất cả ảnh runtime/comparison đã được mở kiểm tra; không có recording.
