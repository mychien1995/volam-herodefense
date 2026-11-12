# M3D · Sảnh và trận sáu client

## Lỗi chọn phái

Trong lượt tái hiện, máy chủ và cả sáu Chromium cùng có pha SCHOOL_SELECTION và đủ sáu tên. Thao tác vẫn bị timeout. Client dựng lại toàn bộ panel mỗi khi đồng đội thay đổi lựa chọn, và Phaser vẫn render đấu trường phía sau sảnh. Bản sửa cập nhật danh sách và số người sẵn sàng riêng. Phaser tạm dừng khi sảnh hiển thị và tiếp tục khi vào trận. [Log tái hiện](../../m3d-six-lobby-repro/m3d-hit-continuity/last-failure.json)

Trong phòng sáu client, bài thử giữ chuột trên nút chọn Cái Bang của khách khi host chọn Võ Đang. Khách nhận được lựa chọn mới của host, nút cũ vẫn gắn với DOM và cú nhấp được máy chủ xác nhận khi nhả chuột. Sáu client sau đó xác nhận nhánh và cùng vào IN_GAME. [Quan sát sảnh](lobby-selection.json)

## Trận M3D

Chromium chạy bản client production qua phòng Colyseus protocol 39, zoom trận 2. Fixture đặt vị trí, cấu hình nhân vật và pha boss để lặp lại bốn hướng. Phím A/Q, sát thương và render đi qua luồng trận bình thường. [Dữ liệu từng lượt](observations.json)

- Thiếu Lâm Đao giữ atlas đao vàng ở bốn hướng khi trúng đòn. Quan sát đủ 12 lượt ra chiêu từ Kim Quang Hộ Trận, Bất Động Minh Vương và Sư Tử Hống. [Trúng đòn](thieu-lam-dao-hit.png) · [Ra chiêu](thieu-lam-dao-cast.png)
- Chín boss và 11 dạng có đủ 44 lượt trúng đòn và hiện khung ra đòn của một chiêu đại diện theo bốn hướng. [Đông Tà](dong_ta-cast.png) · [Lý Mạc Sầu](ly_mac_sau-cast.png)
- Hai góc nhìn trong cùng phòng thấy cả ba tia và viền cho đòn đánh lan. Các hit mang cùng tick máy chủ. Lượt chí mạng có đúng một vòng nứt ở mục tiêu chính. [Đòn thường](normal-cleave.png) · [Chí mạng](critical-cleave.png)

Typecheck, 18 kiểm tra workflow, 986 test unit và integration, build production và 30 bộ kiểm tra asset đã đạt trong `pnpm check:final`. Bước browser được chạy lại trên cùng bundle sau khi sửa bộ chờ trạng thái và thu khung hit theo từng sự kiện. Lượt chạy lại dùng `pnpm exec playwright test --config playwright.m3d-hit-continuity.config.ts --timeout=420000` và đạt sau 6,8 phút. [Log các bước build và kiểm tra](../../m3d-six-lobby-final/check-workflow/final-timings.json)
