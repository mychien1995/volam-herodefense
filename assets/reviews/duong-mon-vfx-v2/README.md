# Đường Môn · Sân tập VFX v2

[Mở bản v2](index.html) trực tiếp bằng Chrome hoặc Edge. Chọn Tuần sa hoặc Dạ hành ở đầu sân. Dùng phím mũi tên để đi, A / Q / W / E / R / T / Shift để diễn chiêu và P để xem Tứ tuyệt khí. Nút tốc độ chuyển giữa 1× và ½×. Dạ hành mở sẵn R4. [Bản v1](../duong-mon-vfx/index.html) dùng để đối chiếu.

## Chơi thử trong Phaser

Mở [sân tập Đường Môn trong Phaser](http://127.0.0.1:5549/duong-mon.html). Khi dịch vụ chưa chạy, khởi động client từ worktree này bằng cách đặt `VOLAM_QA_CLIENT_PORT=5549` rồi chạy `pnpm --filter @volam/game-client dev`. Bản build Vite thường có trang `duong-mon.html`.

Sân tập Phaser 4.2.1 dùng trực tiếp tám atlas PNG/JSON và nền sa thạch đã duyệt, với lọc LINEAR. Scene đọc kích thước viewport và DPR để vẽ canvas theo pixel thiết bị. Ở 1280 × 720 và DPR 1, ô sprite 240 × 240 dùng tỷ lệ 1:1 và mốc chân 200 px. Sân tập dùng cùng trình tự VFX với trang offline và không kết nối phòng trận.

[Phaser · Tuần sa bắn laze](phaser/tuan-sa-e-laze.png) · [Phaser · Mãn Thiên Hoa Vũ](phaser/tuan-sa-t-no-kim.png) · [Phaser · Dạ hành R4](phaser/da-hanh-r4.png)

## Độ nét và phối cảnh

| Hạng mục | V1 | V2 |
| --- | --- | --- |
| Canvas ở cửa sổ 1280 × 720 | 640 × 360, trình duyệt phóng 2× | 1280 × 720, hiển thị 1:1 ở DPR 1 |
| Tuần sa và Dạ hành | Thân đứng 52 px, mép alpha nhị phân | Thân đứng 104 px ở cùng chiều cao màn hình, viền giữ alpha chuyển tiếp |
| Arena | Nền ô lát cũ, đạo cụ độ phân giải thấp | Mặt sân sa thạch gốc 1672 × 941, sáu loại đạo cụ vẽ riêng, độ sâu theo chân |
| VFX | Atlas nhị phân, ví dụ tên 30 px nguồn | Tên 60 px nguồn, các phi tiêu 42–46 px nguồn, hoa và vụ nổ xuất riêng trong atlas RGBA |

[So sánh Tuần sa ở cùng 104 px trên cùng nền](compare-at-104px.png) · [Arena v2](arena-native.png) · [Dạ hành R4](da-hanh-r4.png)

Bản v2 giữ tạo hình [Tuần sa 01, Dạ hành 06 và R4 đã duyệt](../../concepts/heroes/duong-mon/tuan-sa-da-hanh/APPROVAL.md). Cơ Quan vẫn có tên khi đứng, lông thép khi bay và ba làn Q song song. Dạ hành vẫn có băng châm giữa quạt ở mọi cấp, màu ngũ hành trên thân phi tiêu và khoảng trống giữa tay với đạn. Pose trái của đòn dùng ảnh lật từ phải. Một số pha dùng chung pose ở hướng dọc. Mốc chiêu và tương tác với bia thuộc sân tập; chưa có thay đổi nào trong gameplay, server hoặc trận đấu.

## Cơ Quan · E và T

- **E · Lưu Tinh Trục Nguyệt** tụ sáng ở hộp cơ quan rồi phóng một tia laze liền, lõi trắng viền lam. Tia hiện dọc hướng bắn ngay khi nhả, thu mỏng rồi tắt. Bia nằm trên tia lóe và hiện dấu làm chậm. [Ảnh tia laze](tuan-sa-e-laze.png)
- **T · Mãn Thiên Hoa Vũ** rải 20 hoa đào thép, tăng từ 8, trên hai dải bán kính xê dịch theo từng lần tung. Tất cả hoa nổ tại chỗ đã rơi. Mỗi tâm có chớp hoa, sóng xung kích sát đất và 11 kim văng ra. Số lượng và độ rộng ở đây dùng để duyệt hình. [Ảnh rải hoa](tuan-sa-t-rai-hoa.png) · [Ảnh kim văng](tuan-sa-t-no-kim.png)

Sáu cel ImageGen bổ sung được xuất riêng bằng `prepare-co-quan-effects.py`. [Atlas PNG](art/co-quan-effects.png) · [Atlas JSON và hash](art/co-quan-effects.json) · [Nguồn Aseprite](source/co-quan-effects.aseprite)

## Nguồn và kiểm chứng

- [Nguồn và prompt ImageGen](source/prompts.md), [manifest SHA-256](source/manifest.json), [atlas PNG/JSON](art/vfx.json), [nguồn Aseprite](source/tuan-sa-walk.aseprite). Sân, sáu đạo cụ và 68 cel là artwork gốc của preview. Các nguồn tham chiếu chỉ dùng để định hướng tạo hình và chất lượng.
- `python -X utf8 assets/reviews/duong-mon-vfx-v2/prepare-art.py` xuất bảy atlas, ô 240 × 240, mốc chân (120, 200). Chạy `source/build-editable.lua` với Aseprite để đóng gói cel có tag và so pixel khi mở lại. 68 cel và 7 ảnh môi trường khớp bản xuất.
- `node assets/reviews/duong-mon-vfx-v2/verify-preview.cjs` kiểm tra bản offline qua Chrome. Qua kiểm tra cả hai hệ, bốn hướng, toàn bộ phím chiêu, bay/đáp, khóa bước khi bọc giáp, Q song song, R0–R4, ba đợt T của Dạ hành, tia E ở hai hướng, hoa T đổi chỗ qua hai lần tung, 220 kim và canvas theo kích thước viewport. Không có lỗi console.
- `node assets/reviews/duong-mon-vfx-v2/verify-phaser.cjs` kiểm tra riêng trong Phaser 4.2.1. Cả tám atlas, gồm atlas bổ sung cho E và T, tải đúng. Quan sát được 24 khung đứng/đi của hai nhân vật, mốc chân 200 px, đạn kết thúc và canvas 1280 × 720. [Số đo Phaser](phaser-check.json).

- `pnpm check:final --config playwright.visual-upgrade.config.ts` qua typecheck, 18 kiểm tra workflow, 1050 bài unit/integration, build và các validator. Browser stage ban đầu thiếu Chromium headless. Chạy lại riêng hai bài Võ Đang bằng Chrome cài sẵn qua `VOLAM_REVIEW_CHROMIUM`, cả hai qua.

Lượt cập nhật Cơ Quan E/T: Chrome offline, Phaser 4.2.1, đối chiếu sáu cel Aseprite và `pnpm check:final --config playwright.visual-upgrade.config.ts` đều qua. Pipeline gồm 1050 bài unit/integration và hai bài browser của sân Võ Đang.
