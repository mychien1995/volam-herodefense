Latest practice/boss follow-up: [Thất Tuyệt,28 sao và đuôi rồng v05](M4D_VTD_FOLLOW_UP_2026_11_25.md).

# M4D — độ khó phòng và thử boss · 2026-11-25

Từ yêu cầu này, chạy game bằng checkout `milestone/m4d` tại `C:/Users/ADMIN/.codex/worktrees/milestone-m4d/volam-hero-defense`. Bản gốc dùng protocol **53**; runtime hiện tại là **55**. Cập nhật EXP mức Dễ ngày 2026-11-27 không đổi protocol; cần phòng mới và client/server cùng bản.

Host chọn **Dễ** hoặc **Khó** trong cửa sổ tạo phòng. Mặc định Khó giữ cơ chế và tuning hiện tại; peer/late join nhận lựa chọn của phòng và không thể ghi đè nó qua join options.

Dễ hiện có [EXP wave 110/450/750/750](M4D_EASY_WAVE_XP_2026_11_27.md) (2026-11-27), ngoài các thay đổi encounter Đông Tà (gồm sát thương kỹ năng của Mai Siêu Phong trong encounter):

- Lạc Anh lướt chỉ dùng đường chữ nhật. Server chốt đường lúc cast và báo trước một giây; client vẽ đúng bề rộng/đường đó. Cảnh báo hết khi bắt đầu lướt, hủy cast hoặc kết thúc encounter.
- Đòn quét nhiều tia kiếm phía trước, được người dùng xác nhận là chiêu hình quạt cần thu nhỏ, có chiều dài và bề rộng nhân `sqrt(0.3)`: diện tích danh định còn **30%**. ID thực thi hiện tại là `ta_kiem_lien_kich`. Bốn đường Lạc Anh +/X không đổi.
- Ngọc Tiêu Hồi Phong giữ Đông Tà trong action đến khi cánh hoa cuối cùng kết thúc, bao gồm thời gian chờ nổ.
- Mọi damage profile của encounter nhân **0.85**: giảm **15%**, còn **85%**. Đính chính trực tiếp của người dùng thay thế cách hiểu trước. Defense/scaling vẫn qua pipeline thường.
- Không đổi HP, EXP boss/phó bản, vàng, giá đồ, lịch wave, số hồi sinh hoặc các boss khác theo độ khó. Chỉ pool EXP wave thường thay đổi theo mức Dễ như cập nhật trên.

## Chế độ thử wave boss

`pnpm dev:boss-progression` dùng tool `tools/boss-progression-dev.mjs` sau khi chuẩn bị assets và compile server. Endpoint mặc định client **5559**, server **2959**; shared lifecycle từ chối dùng port của service khác. Dừng đúng service do phiên hiện tại tạo trước khi khởi động lại.

Chỉ có năm wave boss, tăng preset cấp **6/12/18/24/27** sau các lần hạ boss thật; không bật bất tử/tăng tốc/fixed-percent hits. Preset giữ bốn slot đồ và phân điểm hợp lệ, có 0/1/2/3/4 món ghép (Thanh Tâm, giáp aura slow, mũ recovery, vũ khí penetration), Long Châu chặng trước và 10 bình HP + 10 bình MP nhỏ cho mỗi boss mới. Retry/reconnect không cấp lại preset mỗi tick. Đây là tiền đề thử độ khó, không phải mô phỏng kinh tế toàn chiến dịch. Final test bỏ yêu cầu đi Kim Luân; trận thường giữ yêu cầu đó.

## Phạm vi kiểm tra

Focused tests: `tests/difficulty.test.ts`, `tests/difficulty-room.test.ts`, `tests/dong-ta.test.ts`, `tests/boss-progression.test.ts`, `tests/m4d.test.ts`; typecheck project/tools; browser `playwright.boss-progression.config.ts`. Browser chỉ đặt vị trí hợp lệ và chọn cast server làm tiền đề, dùng một đòn A thật để khiêu chiến theo M4D, rồi quan sát warning, đồng bộ và Ngọc Tiêu thật. Không tiêm hit/death/kết quả, không recording.

Kết quả thực tế được báo trong chat/log của lần chạy; tài liệu này không tự tuyên bố PASS hoặc final-art approval.

## Kiểm chứng ban đầu, trước đính chính sát thương

Typecheck project/tools PASS; 54/54 focused tests PASS; hai ca browser PASS. Ca Dễ được chụp lại bằng evidence hook `afterRender` và PASS sau khi so tọa độ mạng với sai số 0,01 world unit. [Lệnh/kết quả/giới hạn](evidence/m4d-difficulty/verification.json), [PNG cảnh báo đúng pha](evidence/m4d-difficulty/easy-rectangle.png). Lượt browser đầu sai locator và lượt capture đầu sai pha/float precision được giữ trong log; không coi chúng là PASS.

Phiên chơi hiện tại tách QA: client `http://127.0.0.1:5560/?debug=1&m4d=1`, server `2960`, health xác nhận M4D/protocol50 và đúng run identity. Tạo phòng mới rồi chọn Dễ; mặc định vẫn là Khó.

## Đính chính sát thương và chữ boss · 2026-11-25

Dễ còn **85% sát thương cũ**, tức giảm **15%**. Tên chiêu ưu tiên hơn hội thoại: xóa câu đang hiện và chặn thoại mới trong cửa sổ 1,25 giây gọi tên chiêu. Server giữ thời điểm gọi tên theo actor; client cũng chặn thoại đến trễ. Farewell kết thúc tên chiêu. Chữ chung cho tên chiêu/hội thoại là 14px, viền 2px, texture LINEAR và resolution theo camera/DPR (2–6).

Project/tools typecheck PASS, 19/19 tests về damage/room/banter PASS; ca browser hai client PASS và một PNG thực đã xem. [Lệnh, kết quả và giới hạn](evidence/m4d-boss-speech/verification.json), [chữ tên chiêu](evidence/m4d-boss-speech/boss-speech.png). Không chạy full suite theo yêu cầu kiểm tra tập trung. Cần phòng mới sau khi restart server M4D tại cổng 5560/2960.

## Bỏ qua boss trong phòng test · protocol 51

Chủ phòng thấy **Bỏ qua → tên boss kế tiếp** ở HUD; khi đã hết lượt hồi sinh, cùng thao tác có trong hộp thử lại. Dùng được khi đang chuẩn bị, giao chiến, hồi sinh, quan chiến hoặc ballot. Cả phòng nhận đúng preset cấp/đồ/Long Châu mốc mới; chờ chuẩn bị như các lượt khác. Không có nút bỏ qua Vương Trùng Dương thành chiến thắng.

Lệnh server `boss-test-skip` chỉ nhận trên phòng DEV progression đang chơi, từ host, với sequence mới và stage hiện tại. Client chỉ gửi ý định. Core dọn encounter, projectiles, effect/action, status và trial/respawn cũ; lưu danh sách `waveBossTest.skipped`, tiến gate test mà không tạo hit/death/kill reward hoặc thêm campaign clears thật. Request cũ không thể nhảy hai mốc. Trận thường và preview bất tử cũ không bật skip.

Regression liên quan: preset/skip trong `tests/boss-progression.test.ts`, quyền host/đồng bộ/từ chối request trong `tests/boss-progression-skip-room.test.ts`, browser solo bốn lần chết thật → ballot → skip lần lượt tới VTD. Không ghi video/trace.

Kiểm chứng skip: typecheck project/tools PASS, 14/14 focused tests PASS; browser solo đi từ ballot thật qua đủ bốn preset tới VTD PASS. [Lệnh/kết quả/giới hạn](evidence/m4d-boss-skip/verification.json), [nút trong ballot](evidence/m4d-boss-skip/skip-ballot.png). Các lỗi tiền đề chết tự nhiên và assertion nhầm generic creep/VTD projection được sửa trong test rồi chạy lại riêng browser; không sửa gameplay để ép test. Manual service đã restart tại 5560/2960, health M4D/protocol51, cần tạo phòng mới.
