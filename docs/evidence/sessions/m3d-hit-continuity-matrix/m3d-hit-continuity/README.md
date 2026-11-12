# Kiểm tra va chạm và sprite trong trận M3D

Bản production chạy trên cổng client 5542 và server 2938, protocol 39, zoom trận 2. Hai Chromium cùng vào phòng qua sảnh và chọn nhánh. Bài thử chọn vị trí, build và pha boss ở phía server để rà nhanh từng hướng. Phím A và Q đi qua luồng lệnh bình thường. Hit kiểm thử bốn hướng đi qua bộ giải sát thương và phát sự kiện từ phòng Colyseus. [Quan sát từng khung](observations.json)

- Thiếu Lâm Đao giữ đúng đao vàng ở bốn hướng khi đứng, đi và trúng đòn. Kim Quang Hộ Trận, Bất Động Minh Vương và Sư Tử Hống đều hiện tư thế đã duyệt ở đủ bốn hướng. [Trúng đòn](thieu-lam-dao-hit.png) · [Ra chiêu](thieu-lam-dao-cast.png)
- Chín boss, 11 dạng tính cả Cáp Mô và hai dạng Vương Trùng Dương, đều qua kiểm tra trúng đòn và khung ra đòn của một chiêu đại diện theo bốn hướng. Toàn bộ 44 lượt dùng atlas renovate đúng hướng. [Đông Tà](dong_ta-cast.png) · [Lý Mạc Sầu](ly_mac_sau-cast.png)
- Hai client thấy cùng ba tia và viền khi đòn Bổng trúng ba mục tiêu. Lượt chí mạng có đúng một vòng nứt ở mục tiêu chính. [Đòn thường](normal-cleave.png) · [Chí mạng](critical-cleave.png)

Lệnh kiểm tra trận là `pnpm exec playwright test --config playwright.m3d-hit-continuity.config.ts --timeout=420000` với `VOLAM_QA_HIT_TWO_CLIENTS=1`. Lượt chạy đạt trong 3,2 phút. TypeScript cho ứng dụng và công cụ, build production và `pnpm verify:assets` đều đạt. Các test unit và integration đạt đủ 986 ca qua lượt toàn bộ và các lượt chạy lại riêng. Lượt toàn bộ ghi nhận timeout của test phòng Thiếu Lâm. Lượt song song ghi nhận xung đột cổng 2568 giữa các suite phòng. Hai test phòng đạt khi chạy riêng.

Lượt bổ sung sáu client dừng ở bước chọn phái. Phòng báo đủ sáu client và đã chuyển sang SCHOOL_SELECTION, nhưng Playwright không thấy nút chọn phái ở một client. Ma trận 44 lượt ở trên hoàn tất trong phòng hai client. [Log lượt sáu client](../../m3d-hit-continuity-six-combat/m3d-hit-continuity/last-failure.json)
