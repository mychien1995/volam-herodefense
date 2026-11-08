# Cái Bang Bổng · Bản review trong Phaser

Các cel raster được tạo bằng OpenAI ImageGen dựa trên hai concept gậy đỏ khắc rồng vàng và tư thế Vụt xuống nắm sát một đầu, cùng các pose Cái Bang Bổng hiện có của dự án. `right.png`, `down.png`, `up.png` là nguồn thân và gậy. `up-smash.png` là dải riêng cho thức cuối khi quay lưng. `trail.png` chứa bốn vệt lửa, `ground.png` chứa vòng nổ và tàn lửa. Aseprite `export.lua` cắt cel, căn chân, thu về kích thước game và lật cels hướng phải để tạo hướng trái. Các file `.aseprite` giữ cel chỉnh sửa được. Bản này dùng lại vệt lửa định hướng lên/xuống cho ba thức đầu.

Atlas `body` có 64 cel trên khung 128×144 với gốc chân (64, 104). Atlas `trail` dùng khung 128×112 với gốc (64, 76). Atlas `ground` có 8 cel trên khung 112×84 với gốc (56, 44). Vòng nổ phát khi cel chạm đất xuất hiện và giữ nguyên vị trí đầu gậy đã chạm trong 580 ms. Server vẫn quyết định sát thương và thứ tự bốn lần A. Mỗi thức dài 8 tick ở 30 tick/giây. Sau thức thứ tư có thêm 15 tick hồi.

Bộ đánh thường này được tải mặc định trên M3D. Dùng `pnpm dev:renovation:skills` để xem các chiêu trong phòng luyện. Asset được xuất sang `assets/exports/skills/cai-bang/bong-combo-review`, sau đó `pnpm assets:prepare` đưa vào thư mục public của client. Dùng `Aseprite -b --script-param root=<repo> --script assets/source/skills/cai-bang/bong-combo-review/export.lua` để xuất lại từ PNG nguồn.

`pull.png` và `pha.png` là nguồn ImageGen mới, lần lượt đối chiếu với tạo hình đánh A và tư thế Phá Giáp V8. Cầm Long dùng cel một tay cầm gậy, một tay vận chưởng. Phá Giáp dùng cel riêng và căn đầu gậy theo vị trí chạm của V8. Hoành Tảo và pha xoay của Thiên Hạ dùng lại động tác quét. Truy Phong và Thiên Hạ dùng chung tư thế giậm chạm đất. Bản Phá Giáp hiện hành ở `../pha-giap-lava/`.
