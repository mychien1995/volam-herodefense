# Bản xem Thiên Sơn Đao

Mở [review.html](review.html) trong trình duyệt. Ba nút hướng chém cho phép xem riêng từng động tác. Bấm `A` để chọn ngẫu nhiên một hướng. Hai nút Phi Ảnh Trảm và Phong Ảnh Hoán Vị mô phỏng một đòn đã trúng để thử tích điểm. Bấm `S` khi HUD xuất hiện.

## Luật đã yêu cầu

- **Bạo Vũ Cuồng Phong.** Một vòng xoáy hoạt động mỗi lần. Trong lúc xoay, vòng gây sát thương định kỳ trong phạm vi và tiêu hao mana của người chơi. Tái kích hoạt để thu về. Sát thương và tiêu hao dừng khi thu về xong, đồng thời bắt đầu hồi chiêu 2 giây. Tần suất, lượng mana mỗi nhịp và cách xử lý cạn mana chưa có thông số.
- **Hàn Nguyệt.** So sánh ở cùng chiều cao nhân vật. Đo chiều dài từ mép chắn tay đến mũi đao theo phương ngang. Đo bề rộng ở phần giữa lưỡi. Bản xem đặt mục tiêu dài ×1,50 và rộng ×1,20 so với Option A, với đường phản quang xanh bạc trên mặt thép.
- **Đánh thường.** Bỏ hồi chiêu đánh thường. Mỗi lần bấm `A`, chọn ngẫu nhiên chém trái sang phải, phải sang trái hoặc trên xuống dưới. Cả ba động tác để lại đao ảnh.
- **Tích điểm.** Một lần đánh thường, Phi Ảnh Trảm hoặc Phong Ảnh Hoán Vị trúng mục tiêu cộng 1 điểm. Đổi sang mục tiêu khác làm mất điểm. Quái đợt và quái phụ bản dùng chung một nhóm và giữ điểm khi đổi giữa các quái đó.
- **Tam Liên Trảm.** Đủ 6 điểm mới hiện phím `S` trong 2 giây. Hai đường lướt chéo tạo chữ X và đường cuối từ trên xuống. Cả ba xuyên qua mục tiêu. Gió xanh và cánh hoa đào theo mỗi đường lướt.

## Phạm vi duyệt

Bản xem dùng atlas 4×4 đã căn chân, ba đao ảnh, một dải gió hoa đào và biểu tượng QTE từ ảnh tạo mới. Nguồn và prompt nằm ở [thư mục nguồn](../../source/skills/thien-son/tam-lien-tram-2026-11-09/). Nền sân và hình nhân dùng lại tài sản dự án. Tệp xuất chỉ phục vụ bản xem này.

Để dễ thử lại, bản xem xóa điểm khi dùng QTE hoặc khi cửa sổ 2 giây hết hạn. Hình nhân mô phỏng một mục tiêu riêng, bộ chọn quái mô phỏng nhóm chung. Đây là quyết định của bản xem. Thời lượng từng nhát lướt và kích thước đao ảnh đang dùng để duyệt hình.
