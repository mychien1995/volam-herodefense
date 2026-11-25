# Nam Đế hắc hóa — preview v01

Bốn bảng concept được tạo bằng built-in imagegen để director duyệt trước khi triển khai. Đây là ảnh minh họa, không phải sprite atlas, ảnh gameplay hoặc chứng nhận animation/authority. Director đã duyệt bốn concept trong chat ngày2026-11-25 và yêu cầu tích hợp bằng renovate-game-sprite. Phạm vi duyệt là các PNG concept; nguồn sprite/VFX mới và bản chơi vẫn là candidate để xem trực tiếp. Giữ nguyên source/runtime hiện có.

1. [Tạo hình](01-nam-de-hac-hoa.png): Nam Đế dưới40% HP, mắt đỏ, thân trần cơ bắp xám đen–trắng, giữ đầu trọc/râu trắng/hạt tràng. So sánh kích thước2× là ý đồ hình họa; scale chính xác được đo khi xuất sprite.
2. [Tiên Thiên Canh Khí](02-tien-thien-canh-khi.png): lớp băng khí bảo hộ, frost quanh chân người đánh và minh họa vỡ khí sau3 phản đòn.
3. [Tiên Thiên Băng Đao](03-tien-thien-bang-dao.png): băng khí bán nguyệt, Z đỡ/phản lại. Chỉ đề xuất keycap cho chức năng phase2, không đổi hotbar lúc này.
4. [Đại Lý Hoàng Quyền](04-dai-ly-hoang-quyen.png): dấu báo, quyền vàng từ trên giáng xuống, va chạm/choáng.

Yêu cầu gameplay được giữ theo user: phase2 bỏ Đại Lý Phong Huyệt và Liên Hoàn Nhất Dương Chỉ; Canh Khí tăng mạnh phòng thủ, đánh boss bị slow nhẹ; phản trúng3 Băng Đao làm vỡ khí; Hoàng Quyền dùng thường xuyên, có báo trước và gây stun. Các trị số damage/slow/phòng thủ/tần suất/cửa sổ Z chưa được tự đặt. Không chạy gameplay test/build vì turn này chỉ tạo preview.

Prompt nguyên văn, nguồn tạo, kích thước và SHA-256 nằm cạnh ảnh và trong manifest.json. Artwork mới là raster concept, cần xuất thân/VFX riêng, giữ foot pivot/góc nhìn và kiểm tra trực tiếp trong Phaser trước khi đánh giá bản game. Không cắt concept thành animation hoàn chỉnh.
