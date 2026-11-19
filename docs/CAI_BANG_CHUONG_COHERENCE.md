# Cái Bang Chưởng — thống nhất sprite, bản thử

Nhánh `wip/m3d/25d`. Chỉ Cái Bang Chưởng được thay body/portrait; không đổi gameplay, server/schema/content, HUD geometry hay F8. Chưa mở rộng sang các nhánh khác.

## Nguyên nhân và thay đổi

Baseline hai client tái hiện ba texture trong một vòng idle/A: `hero-motion:cai_bang_chuong`, `hero-finish:cai_bang_chuong`, `renovated-action-hero_cai_bang_chuong_actions`. Idle từng đổi giữa hai đợt artwork; cardinal và diagonal action đi hai renderer khác nhau. Báo cáo baseline giữ nguyên trạng thái phát hiện lỗi.

Candidate dùng một atlas `cai-bang-chuong-unified` cho toàn bộ body: idle/breath/blink, walk, palm windup/single/double/recovery, skill charge/forward/rising/channel, hit/stun và kneel/prone corpse; đủ tám hướng. Tất cả cùng canvas160x144, pivot(80,132), scale0.5 và filterLINEAR như pipeline art nét hiện hành. Các state mới không đổi sang sprite R5/R6/cũ. Các phái khác tiếp tục đường chọn body cũ.

Lấy raw neutral/walk `renovation-v1/raw/hero_cai_bang_chuong.png` và raw action `renovation-v3/raw/hero_cai_bang_chuong_actions.png` làm chuẩn nét/tạo hình. Tám nhóm20 pose nguyên bản được tạo bằng built-in imagegen; prototype một hướng đã qua xuất file và Phaser hai client trước khi làm bảy hướng còn lại. Sáu cel có ribbon chạm biên được thay đúng từ một pack repair; giữ raw/prompt/hash, không che lỗi bằng thêm padding. Tất cả160 cel khác nhau và nguồn Aseprite160 frame/48 tag xuất lại khớp alpha và RGB nhìn thấy với runtime PNG.

Body A/skill lấy clock server/feedback hiện hành; thư viện pose được chia theo họ động tác, không coi đây là160 timeline sát thương hoặc một clip riêng cho mỗi skill. Hỏa Vân Chưởng/Cuồng Long dùng forward release, Phi Long/Hàng Long dùng rising release, Kháng Long dùng channel; anticipation/recovery thống nhất. Projectile, sockets, impact, movement, hit, mana/cooldown và các VFX giữ hiện hành. Hurt/stun có pose thật; chết giữ corpse; state sống lại trở về bộ body này. Không dùng co giãn/quay toàn ảnh làm animation giả.

Portrait và ảnh toàn thân trên các UI hiện có được xuất từ cùng cel neutral mới. Chỉ thay URL raster, không sửa cấu trúc/kích thước HUD. F8 tiếp tục chỉ bật/tắt world depth, không đổi body atlas.

## Kiểm chứng và giới hạn

- `pnpm check:quick tests/cai-bang-chuong-body.test.ts tests/hero-finish-policy.test.ts tests/renovation-routing.test.ts tests/renovation-actions.test.ts`:4 file/13 test PASS; guards giữ các nguồn approved,0 written/7415 unchanged.
- TypeScript client/tools PASS; production bundle riêng endpoint2980 cho QA.
- `pwsh -File tools/export-chuong-unified-native.ps1`:160 frame/48 tag Aseprite; exact visible RGB+alpha roundtrip PASS. `python -X utf8 tools/verify-chuong-unified.py` kiểm tra hashes, đủ atlas/pivot và biên alpha.
- Không chạy full suite cân bằng/gameplay; người dùng yêu cầu chỉ test cần thiết cho phần presentation một phái. Không tạo video.
- Lượt dev baseline đầu bị lỗi define raster alias của helper dev; dùng production bundle để tái hiện. Lượt hai hướng đã qua body/actions/reactions nhưng dừng ở lỗi Promise comparison trong test F8; giữ report FAIL, sửa riêng assertion.
- Hit/death được giải quyết bằng hàm combat server trên fixed tick và broadcast qua Room; status là fixture server. Lượt iteration dùng reset HP trình diễn; final retry chờ đủ timer hồi sinh arena thật, không đặt HP hay rút ngắn clock. Không nhận là đã kiểm thử lại luật hồi sinh boss/ballot. Fixture cũ còn timer hồi sinh sau reset HP đã được sửa bằng dọn timer chỉ khi reset case; báo cáo lỗi giữ nguyên.

Artwork là **prototype chờ director xem/chơi**, không tự ghi approved từ kết quả automation. Provenance và prompt: `assets/source/cai-bang-chuong-unified-v1/`; PNG/JSON/portrait: `assets/exports/cai-bang-chuong-unified-v1/`.

## Cách thử

Launcher riêng `node tools/presentation-chuong-play.mjs`, build vào `.cache/chuong-play-dist` với endpoint2982. Preview5582. Cái Bang Chưởng cấp30, cả năm skill rank4, mana/cooldown bình thường, có mục tiêu chó hoang để thử A/QWERT; F8 giữ nguyên. Không dùng lại/đóng phòng R6 cũ.

Python export tooling cần Pillow, NumPy, SciPy; game runtime chỉ dùng PNG/JSON đã xuất, không phụ thuộc công cụ art. API rendering đối chiếu [Phaser Texture API](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-texture) với Phaser4.2.1 đang cài.

## Kết quả trình diễn cuối

[Summary có provenance](evidence/sessions/chuong-coherence-delivery/summary.json): sáu client, đủ8 idle và8 walk direction,48 nhóm A/QWERT×6 =288 lệnh nhận ack;40 case nhận đòn/status/death/natural arena revival. Alpha idle luôn1; sprite/canvas/scale/pivot thống nhất qua mọi state. Party96 creep với23 hit thật; cả6 body bounds đầy đủ trong viewport ở normal zoom; F8 và portrait PASS. Lượt party chủ yếu kiểm tra hero source/framing trong stress combat, không phải duyệt art creep hay chạy lại toàn bộ game.

Các stage đã hoàn tất được tổng hợp riêng; các pipeline lỗi vẫn giữ FAIL. Không nhận partial pipeline là full PASS. Candidate/runtime art giữ nguyên qua các fixture/capture retry. Final natural arena revival không đặt HP, không rút clock, không thay luật game.

[PNG trước–sau các trạng thái](evidence/sessions/chuong-coherence-delivery/sprite-consistency-before-after.png) là crop nguyên pixel từ game, không repaint/sharpen. Các thời điểm gameplay độc lập, không nhận là cùng một simulation tick. [PNG phòng đang chơi](evidence/sessions/chuong-coherence-delivery/room-ready.png) có HUD thật.

Phòng **3P_YyPNqH**: `http://127.0.0.1:5582/?debug=1`, Cái Bang Chưởng30, năm kỹ năng bậc4, F8 ON và keyboard toggle đã xác minh, browser errors rỗng. Phòng R6 cũ được giữ nguyên.

Guard idle cuối: từng hướng có chênh chiều cao silhouette tối đa1px giữa4 cel; mean alpha vùng thân chênh dưới1.4/255, không có cel idle bị fade. Đây là kiểm tra kích thước/opacity, không thay thế director review độ nét và animation.
