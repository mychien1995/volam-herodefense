# Director approval — feedback_02

**APPROVED VISUAL PREVIEW FOR PHASER INTEGRATION — 2026-11-01.** Director: “duyệt, gửi tôi prompt để integrate boss này vào phaser trong worktree hiện tại”. [Approval record](director_approval.json) và assets/approved_kim_luan_phap_vuong.lock.json ghim đúng các input hiện tại. Duyệt184frame/53clip được chọn và choreography feedback_02; không duyệt24baseline attack candidate bị loại, không tự tạo hướng cast/hurt/death còn thiếu. Game runtime integration và final combat balance chưa được xác nhận. Các mục pending/prototype phía dưới và export/test manifests giữ trạng thái lịch sử tại thời điểm tạo.

Prompt tích hợp đầy đủ: docs/INTEGRATE_KIM_LUAN_PHAP_VUONG_PROMPT.md. Lượt này chỉ ghi nhận duyệt và chuẩn bị prompt, chưa tích hợp gameplay.

---

# Feedback 02 — giảm mật độ, thêm ngũ luân khi Thập Tầng di chuyển

[Preview hiện tại](http://127.0.0.1:5418/assets/reviews/bosses/kim_luan_phap_vuong_v01/?feedback=2). Đây vẫn là bản xem art/choreography, chưa có combat server.

- **Thiết Phiến Liên Hoàn:**3nhát ×4tia thay3×12, tổng12thay36tia; scale0,75thay1,2;440thay560px/s; cách0,5thay0,35s; lượt3,6thay2,5s. Có khoảng né rộng, góc cả lượt đổi dần để không cố định một góc an toàn.
- **Long Tượng Chấn Thiên:**bán kính280thay540px, giữ vòng sóng mỏng và tốc độ lan; rời khu vực gần boss để tránh.
- **Thập Tầng:**boss tiếp tục di chuyển trong lúc phóng loạt5luân mỗi1,8s, tốc độ430px/s. Walk bốn hướng giữa các lần phóng, cast không dừng vị trí. Đạn giữ origin/hướng đã chốt khi phóng; không bám người chơi. Sửa việc gọi hai pose boss trong cùng frame làm restart animation.

Kiểm tra feedback02: PASS8test quỹ đạo, PASS76nhóm kiểm tra Phaser/184frame/53clip; ảnh revision-overview.png đã mở kiểm tra. Hash toàn bộ source/PNG/atlas giữ nguyên. check:final vẫn dừng ở guard Beach terrain.tsj có sẵn; typecheck/full unit/build/global validators chưa chạy qua pipeline. Chi tiết feedback_02/final_check.json.

Các số là tuning thử. Không thay PNG/atlas hoặc các đợt voi/đá của feedback01. Kết quả và PNG mới nằm ở feedback_02/; các mục dưới là lịch sử. Tests kiểm tra khoảng né, phạm vi local và ngũ luân xuất phát từ vị trí di chuyển, không chứng minh damage/độ khó server.

---

# Feedback 01 — tăng áp lực với người chơi tầm xa

Bản xem hiện tại đã áp dụng feedback của director, vẫn là **choreography/art prototype**, chưa có combat server. [Preview](http://127.0.0.1:5418/assets/reviews/bosses/kim_luan_phap_vuong_v01/?feedback=1).

| Phần | Bản thử hiện tại |
| --- | --- |
| Thiết Phiến Liên Hoàn | 3 đợt ×12 hướng, đổi góc10° mỗi nhát; đao khí560px/s, tầm1288px |
| Cuồng Phong Tấn Lôi Công | 5 lốc, tỏa160°, tốc độ280px/s |
| Phiến Trung Độc Đinh | 5 đinh trước +5 đinh sau,620px/s; vẫn ghi đúng brief đủ5đinh chết, không giả lập HP |
| Ngũ Luân Hộ Thể | Xoay6rad/s thay2,5; sau3giây bắn680px/s thay240 |
| Long Tượng Chấn Thiên | 3 xung cách0,28s, lan900px/s, bán kính540px; có báo trước và góc chéo xa còn đường né |
| Bát Nhã Công | 12làn ×3hàng,0,45s giữa hàng; mỗi đợt cùng chiều, đợt kế đảo chiều |
| Bát Nhã Thập Tầng | 14làn ×4hàng,0,32s giữa hàng; luân phiên hai chiều |
| Đá/voi | 5mỏm đá có seed đổi theo cast, đứng yên trong cast; voi480px/s; nấp dưới đá khi voi từ trên, nấp trên khi voi từ dưới |
| Đạt Nhĩ Ba | Di chuyển38px/s bằng walk4hướng, dừng chân lúc cast; aura và chấn động bám đúng vị trí tương ứng |

Các số cụ thể là tuning **thử cho art**, chưa là cân bằng được duyệt. Quỹ đạo không bám mục tiêu. Giữa hai đợt voi ngược chiều có khoảng trống lớn hơn0,8giây và cue báo trước để đổi phía nấp, không chồng hai bức tường voi ngược chiều cùng lúc.

Bổ sung4cel voi chạy lên nhìn từ sau, tạo bằng built-in image_gen từ reference voi gốc; không lật ngược sprite xuống. Source request và hash lưu tại source folder. Tổng hiện tại220source/export cel (208character/VFX/voi/đá +12prop), playback184frame/53clip. Cả262file artwork/atlas giữ lại được kiểm tra nguyên hash.

Thông số/quỹ đạo: choreography.mjs. Kiểm tra quỹ đạo: node --test assets/reviews/bosses/kim_luan_phap_vuong_v01/choreography.test.mjs. Kết quả mới và PNG nằm trong feedback_01/; phần v01 bên dưới, verification.json và ảnh cũ là lịch sử, không bị ghi đè. Kiểm tra góc sân chỉ đo exposure của quỹ đạo visual, không chứng minh damage/difficulty hoặc sáu client multiplayer.

Kết quả feedback01: **PASS7test quỹ đạo và1browser test/73nhóm assertion**, quan sát184frame/53clip trong Phaser; static220cel/12prop/256tile và262artwork cũ nguyên hash. Ảnh cuối feedback_01/arena-design.png, arena-action.png và skill-overview.png đã mở kiểm tra. Bổ sung riêng4cel vòng sóng mỏng, hiệu chỉnh tâm/bán kính từ bounds alpha PNG thật để lan xa mà không che mặt sân. Lần đầu quá dày và nguồn thiếu padding được giữ làm lịch sử thử, không dùng trong kết quả cuối.

check:final dừng tại guard Beach terrain.tsj có sẵn, khớp byte Git HEAD; không sửa file/guard đó. Typecheck, full unit/integration, build và validators toàn cục chưa chạy qua pipeline. Browser stage chạy riêng PASS(34,8s). Chi tiết/hash/lệnh: feedback_01/final_check.json. Bản v01 bên dưới giữ nguyên kết quả lịch sử.

---

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
