# Võ Đang Quyền/Kiếm — thống nhất sprite, đợt 2

`wip/m3d/25d`, 2026-11-19. Director đã duyệt Cái Bang Bổng trong chat; thêm khóa sáu file canonical tại `assets/approvals/hero-coherence/cai_bang_bong.json`, cùng sáu file Chưởng đã khóa. Không xuất lại hai bộ đã duyệt. Hai nhánh Võ Đang là **candidate chờ director xem PNG/chơi ở normal zoom**. Chưa triển khai Thiên Sơn.

## Artwork và tích hợp

Baseline trong trận tái hiện ba texture khác nhau cho mỗi nhánh: `hero-finish`, `hero-motion`, rồi `vdq-punch` hoặc `vdk-body` khi đánh. Candidate giữ một atlas `hero-unified:<basic>` cho idle, đi, A, QWERT, hurt/stun/status, chết và trở lại idle sau hồi sinh. Portrait lấy từ chính neutral mới; không đổi bố cục/kích thước HUD. F8 tiếp tục đổi world depth, không đổi bộ body.

Giữ identity của artwork nét hiện có: áo trắng/đen than, búi tóc với cài Âm Dương và dải buộc trắng. Đọc/so `vo_dang_character_reference.png` và anti-reference placeholder thật. Đường dẫn lịch sử `vo_dang_art_direction_reference.png` không còn file; ghi rõ reference thay thế trong provenance. Chỉ dùng built-in imagegen và nguồn gốc artwork dự án, giữ raw, prompt và UTC request timestamps. Không video.

Quyền: 192 cel, tám hướng, 40 tag Aseprite; canvas256×224, foot128/192, scale0.5. Kiếm: 320 cel, tám hướng, 72 tag; canvas320×288, foot160/224, scale0.5. Mỗi bộ có bốn idle (thở/vải/chớp mắt), bốn bước chân thực, pose hành động, hai hurt và hai death. Kiếm có thêm 12 pose tay không mỗi hướng khi Nhân Kiếm Hợp Nhất đang bay. Sửa riêng hai hurt tay không up-right quay nhầm mặt; giữ mười cel còn lại của source gốc.

Root cố định ở giày, mật độ cơ thể theo nhóm; không co cả nhân vật theo độ vươn kiếm. Kiểm tra native roundtrip alpha và RGB nhìn thấy, tag/range/duration, biên/trim/public copies, opacity và độ cao cơ thể. Một guard ban đầu bắt chênh lệch 4 atlas pixel ở mép kiếm/vạt áo của idle-down; thân thực chỉ lệch1.4 pixel. Profile cho phép extent4 pixel (2 world), vẫn bắt body variation≤3 và không đổi scale/opacity theo cel. Bộ tay không dùng cùng độ cao đầu–chân89 atlas pixel; bản pilot thu nhỏ sai theo dải buộc đầu đã bị loại khỏi lựa chọn sản xuất.

Giữ cue từ renderer native trước khi thay texture. Quyền giữ hai tay trái/phải thật và sáu nhịp Thái Cực Trận. Kiếm giữ năm biến thể A do server chọn, thứ tự bảy nhát Thất Tinh, tư thế ngắm Vạn Kiếm và pose phòng thủ. Trạng thái không kiếm đọc projectile Nhân Kiếm thực từ state server, áp dụng cho idle/walk/A/hurt và trở về bộ có kiếm khi projectile tự hết hạn hoặc W tái kích hoạt. Không đổi projectile, VFX, hit geometry, timing, RNG, mana, cooldown, server/core/protocol hay luật gameplay.

Atlas Quyền6.45MiB, Kiếm13.64MiB RGBA; bỏ preload R5/R6 không dùng của hai nhánh (21MiB tổng). Hai atlas mới20.09MiB, giảm ròng khoảng0.91MiB cho nhóm thay thế này. Các atlas native còn cần để đọc cue/VFX vẫn được giữ; đây không phải số đo tổng GPU memory.

## Kiểm chứng có phạm vi

17 case trong ba file policy/portrait/Chưởng/Bổng đã PASS qua `pnpm check:quick tests/vo-dang-unified-policy.test.ts tests/unified-hero-policy.test.ts tests/cai-bang-chuong-body.test.ts`. Typecheck client và `tsconfig.tools.json` PASS. Hai validator `tools/verify-hero-unified.py --profile <profile> --native` PASS512 cel/112 tag và 12 khóa approved. Không chạy full balance/gameplay suite theo yêu cầu.

Browser dùng production bundle endpoint2995, ports2995/5595 riêng; `node tools/run-playwright.mjs test --config playwright.hero-coherence-batch2.config.ts` với `VOLAM_QA_SESSION`, `VOLAM_QA_SERVER_PORT`, `VOLAM_QA_CLIENT_PORT`, `VOLAM_HERO_BRANCH=both`, số client qua `VOLAM_CHUONG_PLAYERS`. Pilot down-right hai người qua trước khi mở tám hướng; bộ tay không cũng qua pilot/kiểm tra kích thước rồi mới mở bảy hướng khác. Lượt iteration hai người down-right/up-left PASS cả hai nhánh, gồm choreography và vòng đời kiếm thật.

HP được đối chiếu snapshot client với state server **cùng tick serialized**, tolerance0.001; không so HP đang hồi theo tick với giá trị ở thời điểm đọc sau. Hook chỉ quan sát trong QA và có restore. Fixture reset legal charge stack giữa case để kiểm tra T tám hướng, không sửa charge/cooldown production. Crowd dùng96 mục tiêu đứng yên nhiều HP, giữ phím A/Q và sát thương thật; không nhận là kiểm tra AI/reward/placeholder creep.

Lượt sáu người hoàn thành đủ8 idle/8 walk,48 nhóm A/QWERT×6=288 lệnh có ack và40 case hurt/stun/status/death/natural arena respawn cho **mỗi** nhánh. Quyền hoàn tất cả choreography, F8/portrait và crowd. Report Kiếm giữ nguyên FAIL sau các stage đã hoàn thành: assertion kiếm trở về đòi down-right dù normal hit đã xoay state server thành down. Diagnostic sáu người tái hiện server fx0/fy1, idle và projectile hết hạn, client cũng fx0/fy1 và chỉ dùng `idle_2_down / idle_3_down / idle_0_down` đúng atlas. Sửa riêng assertion lấy hướng từ server, không thay input/hurt/gameplay hoặc artwork; chỉ retry extras/choreography/F8/party trên cùng production bundle.

Retry sáu người PASS: năm thế A, bảy cut đúng thứ tự, idle/walk/A/hurt tay không, kiếm tự hết hạn, W teleport có peer ack, Vạn Kiếm có hit server thật, F8/portrait và crowd. Cả sáu body nằm trong viewport. Crowd Quyền128 hit, median16.8ms/p95 18.9ms; Kiếm421 hit, median16.6ms/p95 20ms. Đây là mẫu chẩn đoán sáu browser context, không cam kết FPS chơi bình thường.

Báo cáo và PNG chọn để review: [summary](evidence/sessions/hero-coherence-batch2-delivery/summary.json), [Quyền trước–sau](evidence/sessions/hero-coherence-batch2-delivery/quyen-before-after.png), [Kiếm trước–sau](evidence/sessions/hero-coherence-batch2-delivery/kiem-before-after.png). Crop giữ nguyên pixel từ PNG Phaser thật, không repaint/sharpen; các cột là những thời điểm chơi độc lập. Nguồn crop ghi trong `screenshot-provenance.json`. Giữ nguyên các lần FAIL/baseline, chỉ tổng hợp stage thực sự hoàn thành.

Dừng đợt2 để director duyệt trước khi mở đợt3 Thiên Sơn Phiến/Đao.

## Phòng review

[http://127.0.0.1:5597/?debug=1](http://127.0.0.1:5597/?debug=1), room `W71goH-UQ` lúc bàn giao: Võ Đang Quyền30, QWERT rank4, F8 ON/OFF đã thử, không lỗi client. Hai nhánh Quyền/Kiếm trên review server đều nhận level30/rank4 khi chọn qua lobby thật và tạo phòng mới. Cooldown/mana/controls giữ bình thường. Fixture chỉ nằm trong `tools/presentation-hero-play.mjs`, không sửa Room production. Bundle `.cache/hero-coherence-batch2-dist`, backend2995; giữ các phòng Cái Bang cũ. [PNG có HUD](evidence/sessions/hero-coherence-batch2-delivery/room-ready.png).
