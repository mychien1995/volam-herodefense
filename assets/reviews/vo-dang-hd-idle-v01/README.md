# Võ Đang · Pose Kiếm hướng xuống

Ứng viên chờ duyệt trên nhánh `wip/m3d/visual-upgrade-2`. Đối chiếu [ảnh Lôi Đài](so-sanh-loi-dai.png), [PNG sprite](vo-dang-kiem-idle-down.png) và [PNG kiếm khí riêng](kiem-khi-right.png). [Manifest](manifest.json) ghi prompt ImageGen, tham chiếu, file nguồn, pivot và dấu vân tay của file.

- Sprite hiện tại có thân 44 px gốc, hiển thị 2×. Ứng viên được xuất từ ảnh vẽ mới thành thân 88 px gốc, hiển thị 1×. Hai sprite có chiều cao thực đo 88 px, chung điểm đặt chân trong hai khung nền giống nhau. Ứng viên rộng hơn 10 px do thế đứng và góc kiếm.
- Ở kích thước đó, tay cầm, cạnh lưỡi kiếm, hai ống tay và khoảng tách giữa hai giày đều đọc được trên nền gạch. Kiếm khí nằm ngoài ảnh so sánh để giữ phép đối chiếu thân nhân vật.
- Aseprite 1.3.18.6 xuất lại từ hai nguồn chỉnh sửa cho RGBA trùng từng pixel. Chromium render bằng Phaser 4.2.1 WebGL với nearest và DPR 1. Từ ảnh chụp, vùng pixel của hai nhân vật đo được lần lượt là 62×88 và 72×88, cùng chạm mốc chân y=265 trong hai khung. [Báo cáo Phaser](phaser-review.json) ghi kích thước và lỗi trình duyệt.
- Ảnh nền là một phần của concept Lôi Đài. Đây là cảnh duyệt độc lập bằng Phaser, do nhánh hiện chỉ có cửa sổ xem trước PvP. Sprite ứng viên cần đường render ở mật độ cao hơn để giữ đủ 88 px gốc khi đưa vào trận. Duyệt pose này trước khi làm idle/walk bốn hướng, Quyền, Kiếm và xác minh chuyển động ở client.

Chạy lại ảnh duyệt với Node và Playwright của repo. Đối số thứ hai có thể trỏ vào checkout đã cài dependencies. Đặt `VOLAM_REVIEW_CHROMIUM` thành đường dẫn Chrome cục bộ nếu máy chưa cài Chromium của Playwright.

~~~powershell
node assets/reviews/vo-dang-hd-idle-v01/render-review.cjs
~~~

