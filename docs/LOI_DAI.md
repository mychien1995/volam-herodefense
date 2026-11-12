# Lôi Đài Hồng Mộc

Lôi Đài 1v1 dùng chung trong phòng, yêu cầu cấp 6. Nút Lôi Đài và Về đấu trường mở xác nhận trong viewport. Viền gạch trắng là sảnh chờ. Người xem dùng phím mũi tên đi lên bậc thang phía nam khi sàn còn chỗ. Chỉ hai đấu thủ trên sàn có thể giao chiến.

Máy chủ giữ nguyên máu, nội lực và thời gian hồi còn lại lúc vào. Trong Lôi Đài chỉ tính sức mạnh theo cấp, nội công và võ học đã học. Trang bị, Long Châu, bình và kỹ năng Z không áp dụng. Phó Bản và Thương Gia bị khóa. Đấu thủ có thể rời về đấu trường qua xác nhận. Khi có người gục, người thắng đầy máu, đầy nội lực, hết hồi chiêu và có pháo hoa. Người thua thấy màn hình xám trong 3 giây rồi hồi sinh ở viền với cùng trạng thái hồi phục. Cổng nhận đấu thủ mới sau đúng khoảng 3 giây đó. Nếu cả hai gục cùng tick, cả hai hồi sinh ở viền và không phát pháo hoa.

Khi toàn bộ người chơi đang kết nối đều ở Lôi Đài, đồng hồ đấu trường, xâm lăng và boss dùng đồng hồ đấu trường dừng. Các thực thể ngừng đồng bộ ra ngoài trong thời gian này. Khi có người trở lại, quái và boss xuất hiện lại với trạng thái còn lại, không được tính là đã hạ trong thời gian tạm dừng.

## Artwork

Ảnh gốc PNG trong `assets/source/loi-dai` được ImageGen tạo từ concept Hồng Mộc sàn chữ nhật đã nới và pháo hoa đã duyệt. Nền sử dụng bản đã xóa đấu thủ, người xem vẽ sẵn và khép lan can sau. Sàn, lan can và hiệu ứng được xuất thành PNG riêng qua `python scripts/export-loi-dai.py`. Manifest trong thư mục xuất mô tả cảnh logic 836 × 470, vị trí và chiều sâu từng lớp, cùng 16 khung pháo hoa 132 × 132 ở 14 FPS, pivot giữa đáy. Độ sâu nhân vật tính theo chân. Các vùng di chuyển do máy chủ xác định. Đây là bản để duyệt trong Phaser.

## Chạy thử

`VOLAM_DEV_LOI_DAI=1` với `NODE_ENV=development` bắt đầu nhân vật tại cấp 6 để kiểm tra trực tiếp. Các luật chọn môn phái, học kỹ năng và giao chiến vẫn chạy qua luồng bình thường. Mặc định bắt đầu cấp 1.

## Kiểm chứng

`pnpm check:final --config playwright.loi-dai.config.ts --trace off` đã qua typecheck, 18 kiểm tra workflow, 972 bài unit/integration, build và các trình kiểm tra asset. Chromium chạy một cửa sổ Phaser và hai client Colyseus cùng phòng. Bài thử kiểm tra vào/ra, tạm dừng/tiếp tục wave, giới hạn sàn, thắng bằng đòn đánh thật, thay đổi khung pháo hoa, màn hình xám và hồi sinh. [Ảnh sàn đấu](evidence/sessions/loi-dai-verified/hong-moc-live.png) · [Ảnh pháo hoa](evidence/sessions/loi-dai-verified/fireworks-live.png) · [Kết quả pipeline](evidence/sessions/loi-dai-verified/check-workflow/final-timings.json).

## Hồng Mộc v2 · sửa theo ảnh chơi 1896 × 919

Camera giữ trục giữa sân tại (418, 235) khi đấu thủ di chuyển và khi viewport đổi kích thước. Phần sân phụ chỉ hiển thị bên ngoài tọa độ di chuyển. Máy chủ dùng mép trong lan can đo trên ảnh gốc, với các dải va chạm liên tiếp cao 4 đơn vị ở hai mép nghiêng của sàn. Đi bộ, lướt và chặn đạn dùng chung biên này.

Renderer chiêu dùng tick của vùng phát sự kiện. Trong Lôi Đài, các pha dựng theo tick dùng `loiDaiTick` kể cả khi đồng hồ wave bên ngoài tạm dừng.

Bản v2 lấy hình Hồng Mộc đã duyệt làm nguồn bố cục và màu. Chuẩn độ nét là cảnh Võ Đang visual-upgrade-2, còn ảnh chơi dùng để đối chiếu vị trí chân, mật độ hiển thị và khoảng trống cạnh HUD. `assets/source/loi-dai-v2/layout.json` lưu mặt nạ nguồn có thể chỉnh, vị trí, độ sâu và prompt tạo tấm gạch ImageGen. `python scripts/export-loi-dai-v2.py` xuất cảnh logic 836 × 470 ở mật độ 2×, với nền, mặt sàn, cầu thang, lan can chia theo độ sâu, mái, cờ, trống và cây tách riêng. Bản v2 giữ tỷ lệ hiển thị của nhân vật. Bản xuất v1 và atlas pháo hoa được giữ trong thư mục cũ.

`python -X utf8 scripts/verify-loi-dai.py` kiểm tra kích thước, alpha, hash nguồn và ghép lại ảnh gốc đã xử lý độ nét theo từng pixel. Phaser dùng bản v2 trong `milestone/m3d`.

Bản dựng Aseprite `assets/source/loi-dai-v2/hong-moc.aseprite` có 24 lớp có thể chỉnh, được lắp bằng `assemble.lua`. Mở lại và xuất PNG bằng Aseprite cho ảnh 1672 × 940 khớp từng pixel với bản ghép đã kiểm tra. Hai dải ảnh ngoài biên được dựng bằng phản chiếu họa tiết ven sân, để camera phủ viewport rộng mà vẫn giữ nguyên bố cục trung tâm.

Chromium ở 1896 × 919 và 1280 × 720 kiểm tra tâm camera, độ hiện diện của các lớp và các khung hình nối tiếp của Thiên Hạ Vô Cẩu, Hàng Long Hỏa Vũ, Bách Liệt Thiên Kích, Bách Phiến Phong Bạo. Phòng có một cửa sổ Phaser và năm client Colyseus. [Ảnh sân trong game](evidence/sessions/loi-dai-v2-verified/hong-moc-wide.png) · [Bách Liệt Thiên Kích](evidence/sessions/loi-dai-v2-verified/bach-liet-live.png).

Kiểm tra cuối `pnpm check:final --config playwright.loi-dai.config.ts --trace off` đã qua typecheck, 18 kiểm tra workflow, 973 bài unit/integration, build, kiểm tra asset và 2 bài Chromium. [Kết quả](evidence/sessions/loi-dai-v2-verified/check-workflow/final-timings.json).

## Tích hợp vào M3D

Client và máy chủ dùng protocol 40. Phòng đã mở với bản cũ cần được tạo lại khi chuyển sang bản này.

`pnpm check:final --config playwright.loi-dai.config.ts --trace off` qua TypeScript, 18 kiểm tra workflow, 990 test unit/tích hợp, build production, các validator asset và hai ca Chromium. [Kết quả pipeline](evidence/sessions/loi-dai-m3d-final/check-workflow/final-timings.json).

`node tools/run-playwright.mjs test tests/e2e/gameplay.spec.ts --grep "six players keep a full arena viewport" --trace off` qua ca đấu trường chính sáu người, gồm đồng bộ học chiêu và đòn đánh thật.

Kiểm tra trong Lôi Đài trên bản gộp ghi nhận khung thi triển hoặc hiệu ứng cho đủ 43 kỹ năng chủ động bậc 1, tám đòn A và Tam Liên Trảm (S). [Kết quả từng chiêu](evidence/sessions/loi-dai-m3d-final/skill-visuals.json).
