# Cái Bang Bổng — thống nhất body, đợt 1

`wip/m3d/25d`, 2026-11-19. Cái Bang Chưởng đã được director duyệt trong chat; sáu file canonical được khóa byte tại `assets/approvals/hero-coherence/cai_bang_chuong.json`. Đợt này chỉ đổi body và ảnh portrait Bổng. Bổng là **candidate chờ director xem/chơi**, chưa tự ghi approved và chưa bắt đầu Võ Đang.

## Bộ sprite và cách tích hợp

Baseline trong trận tái hiện ba nguồn xen nhau: `hero-motion:cai_bang_bong`, `hero-finish:cai_bang_bong`, `renovated-bong-combo-body`. Candidate dùng atlas `hero-unified:cai_bang_bong` cho idle/breath/blink, walk, A, QWERT, hurt/stun, death/corpse và trở lại idle sau hồi sinh. Portrait được xuất từ chính neutral mới. Giữ áo đỏ/cổ tay kem/đai vàng/tóc buộc đỏ và gậy đỏ khắc vàng theo artwork nét hiện có.

224 cel khác nhau, tám facing, nguồn Aseprite có 40 tag đúng phạm vi/thời lượng. Canvas logical864×720, foot(432,352), scale0.5, LINEAR như pipeline nét hiện hành; atlas được trim để không tải khoảng trong suốt. Root lấy ở chân, không lấy đầu gậy. Mật độ đầu được căn theo nhóm locomotion/action/reaction, không thu nhỏ nhân vật theo bounding box của vũ khí. Giữ raw/prompt, UTC request timestamps, các take bỏ và nguồn tham chiếu; manifest/provenance chỉ rõ phần chọn sản xuất. Không có video.

Pilot down-right qua xuất PNG/JSON và Phaser hai client trước khi sinh bảy hướng còn lại. Sửa riêng nhóm action down/up/down-left để hướng đâm gậy khớp mặt, tám cel neutral down để giữ tỷ lệ chibi, và contact Phá Giáp. Không lấy nguyên full-body cũ của Phá Giáp vì tỷ lệ đầu khác master. Không dùng rotation/scale của cả ảnh để giả animation.

A giữ bốn thức server `thrust/sweep/lift/smash`, ánh xạ hai tên cuối sang cel rising/overhead. W đọc đúng clock raise/strike/recovery; T có whirl, finisher_raise và stomp kết thúc. **Phá Giáp vẫn chọn bốn hướng cardinal như VFX hiện hành**; input chéo dùng facing cardinal tương ứng. Locomotion và các action còn lại dùng tám facing đã vẽ. Không nhận là Phá Giáp có tám contact mới.

Chỉ truyền thêm phase/progress của feedback vào renderer body; không đổi server/core/schema/content, damage, phạm vi, thời gian, targeting, movement hay VFX. HUD giữ cấu trúc/kích thước, chỉ đổi URL avatar Bổng. F8 tiếp tục bật/tắt world depth và không thay atlas body. Bỏ preload hai atlas R5/R6 Bổng không dùng nữa, tiết kiệm10.5MiB so với tải cả cũ lẫn mới. Atlas mới17.65MiB RGBA, tăng ròng khoảng7.15MiB so với hai atlas này; không nhận là tổng GPU memory giảm.

## Kiểm chứng có phạm vi

- Focused unit: 14 test/3 file PASS (`unified-hero-policy`, `hero-finish-policy`, `renovation-v8-presentation`); sau sửa tuple type trong test, 9 test/2 file PASS (`unified-hero-policy` + `cai-bang-chuong-body`). Tổng17 case khác nhau, không chạy lại full balance/gameplay suite theo yêu cầu.
- `pnpm exec tsc -p apps/game-client/tsconfig.json --noEmit` và `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS. QA production build endpoint2990; build riêng endpoint2991 cho lượt party để giữ phòng chơi đang mở.
- `tools/export-hero-unified-native.ps1` và `python -X utf8 tools/verify-hero-unified.py --profile assets/source/cai-bang-bong-unified-v1/profile.json --native`: PASS224 cel,40 tag đúng range/duration, exact alpha/visible RGB roundtrip, hash/alpha/trim/biên, public copies và khóa Chưởng. Một lượt đầu phát hiện Aseprite tự kéo tag tới frame cuối; đã tạo tag sau toàn bộ cel và siết validator trước khi nghiệm thu.
- Browser: `node tools/run-playwright.mjs test --config playwright.hero-coherence-batch1.config.ts`, với `VOLAM_QA_SERVER_PORT`, `VOLAM_QA_CLIENT_PORT`, `VOLAM_QA_SESSION`, `VOLAM_CHUONG_DIST`, `VOLAM_CHUONG_PLAYERS` và stage theo report. Video/trace off.
- Sáu client:8 idle/8 walk,48 nhóm A/QWERT×6 =288 lệnh có ack; chuỗi A đủ4 thức qua phím thật và W đủ raise/contact/recovery. Các đoạn này hoàn thành trong report `checks/actions.json` còn nguyên FAIL ở bước kiểm tra HP sau đó. Không đổi report lỗi thành PASS.
- Retry chỉ phần ảnh hưởng: `checks/reactions.json` PASS40 case hurt/stun/status expiry/death/natural arena respawn, F8 và portrait. HP hồi mỗi tick nên so snapshot client với **server state cùng tick**, có tolerance float32 0.001, thay vì live HP ở thời điểm đọc sau. Đây là hook quan sát QA có restore, không sửa HP/regen hay clock production.
- `checks/party.json` PASS: sáu hero đầy đủ trong viewport,96 mục tiêu server đứng yên/HP100000,185 hit từ A/Q thật. Median16.7ms, p95 khoảng24.1ms trong mẫu sáu browser context; không phải cam kết FPS chơi bình thường. Không kiểm tra AI/reward creep ở fixture này.

Tổng hợp, command scope và hash: [summary](evidence/sessions/hero-coherence-batch1-delivery/summary.json). Giữ các báo cáo FAIL/partial gốc; chỉ các stage đã hoàn thành mới được tổng hợp. PNG review lấy từ game thật, crop nguyên pixel không repaint/sharpen; các ảnh là thời điểm gameplay độc lập. [Trước–sau](evidence/sessions/hero-coherence-batch1-delivery/sprite-before-after.png), [phòng chơi có HUD](evidence/sessions/hero-coherence-batch1-delivery/room-ready.png), [Phá Giáp](evidence/sessions/hero-coherence-batch1-delivery/W-pha-giap.png), [finisher](evidence/sessions/hero-coherence-batch1-delivery/T-finisher.png), [sáu người/mục tiêu](evidence/sessions/hero-coherence-batch1-delivery/party.png).

## Điểm director cần xem và việc ngoài đợt

Độ lệch đầu gậy contact so với socket VFX giữ lại khoảng5–23 world pixel; bên trái lớn nhất và còn là điểm review hình ảnh. Không gọi vị trí đó khớp tuyệt đối. Giữ nguyên hit geometry và các VFX cũ.

Lượt stress mục tiêu ít HP/AI trước lộ placeholder creep ở một số trạng thái. Báo cáo/PNG gốc vẫn giữ; không nhận là đã sửa artwork creep. Lượt đứng yên nhiều HP phục vụ đọc body hero rõ hơn. Việc sửa fallback creep, full AI/reward và các phái chưa rollout nằm ngoài đợt này.

## Phòng review

[http://127.0.0.1:5592/?debug=1](http://127.0.0.1:5592/?debug=1), room `a6xjizbt9` lúc bàn giao. Bổng cấp30, Q/W/E/R/T đều rank4, cooldown/mana/controls bình thường, F8 đã kiểm tra OFF/ON. Backend riêng2990; không đóng hay điều khiển phòng Chưởng5582. Launcher `node tools/presentation-hero-play.mjs` dùng production bundle `.cache/hero-coherence-batch1-dist` đã build cho2990; `node tools/open-hero-play.mjs` tạo/chọn branch qua lobby thật. Fixture mức/rank chỉ nằm trong tool review, không vào Room production. Các phòng mới tạo trên bản review này cũng nhận cấu hình Bổng30/rank4.

Dừng đợt1 để director duyệt PNG/animation ở normal zoom trước khi sang đợt2 Võ Đang Quyền/Kiếm.

## Director approval — 2026-11-19

Director xác nhận trong chat: “Duyệt thay đổi cái bang bổng.” Sáu file canonical hiện được khóa tại `assets/approvals/hero-coherence/cai_bang_bong.json`; toàn bộ mô tả candidate ở trên là trạng thái lúc bàn giao lịch sử. Không xuất lại raster/JSON/portrait/Aseprite đã duyệt. Cho phép triển khai đợt2 Võ Đang theo cùng quy trình.
