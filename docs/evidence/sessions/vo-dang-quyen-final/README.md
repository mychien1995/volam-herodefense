# Võ Đang Quyền trong Phaser

Người dùng duyệt bản tích hợp Võ Đang Quyền ngày 2026-11-09.

Bài Playwright chạy trên build production, với hai client cùng phòng và nhánh cố định. Fixture cấp EXP cho người thử để mở mốc học T. Người thử học cả năm kỹ năng qua hotbar và bấm A/QWERT qua bàn phím.

- A ghi nhận hai lệnh đánh với hai tay luân phiên, cùng atlas đấm và quyền khí Wi-Fi trong các frame đã render.
- Q dùng frame `huyen_am_travel_right_*` của atlas tay lam đen, hai trục scale bằng nhau và vận tốc server `[390, 0]`.
- W có hai sóng trên màn hình, năm ấn và năm lần nổ mực. Cả năm event nổ cách tick xuất hiện ấn đúng 30 tick.
- E hiển thị các quẻ luân phiên, đổi ô E sang “Chốt quẻ” và đồng bộ kết quả chốt tay đến client thứ hai. Mô phỏng kiểm tra hiệu ứng của cả tám quẻ và tự chốt ở tick 150.
- R hiện cầu nội lực trên cả hai client. T đổi thế múa trước khi hiện trận, trận nằm đúng tâm nhân vật khi mở và điểm sáng đổi vị trí theo thời gian.
- Kiểm tra PNG/JSON xác nhận 72 frame hợp lệ trong bốn atlas mới và tái sử dụng. Mô phỏng W với seed 42 tại cấp 1, 6, 15 và 30 đều phát đúng năm event nổ sau 30 tick.

[Huyền Âm Chưởng lúc nổ mực](w-ink.png) · [Thái Cực Trận với cầu nội lực](t-formation.png)

Lượt `check:final` đầu dừng ở kỳ vọng cooldown cũ, phiên bản giao thức và thứ tự test khiên. Sau khi cập nhật bài test, stage Vitest đầy đủ qua 956/956 test trong 97 file. TypeScript, 18 kiểm tra workflow, build Vite, `pnpm verify:assets` và Playwright với `playwright.vo-dang-quyen.config.ts` đều qua.
