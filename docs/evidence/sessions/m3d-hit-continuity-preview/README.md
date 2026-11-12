# Preview va chạm và sprite M3D

[Mở bản duyệt](preview.html) trong Chromium hoặc Edge. Trang chạy độc lập và hiển thị hai cảnh Phaser 448 × 304 cạnh nhau. Dùng **A** để thử trúng đòn, **C** để thử chí mạng, **Q** để xem chiêu đang chọn. Bật **Giữ khung chạm** để dừng ở nhịp nhìn rõ hiệu ứng.

- **Tia va chạm** dùng bốn khung vàng kem trong 110 ms. Viền ngoài lấy theo alpha của thân. Cảnh Quét Bổng có ba mục tiêu để xem độ đọc của hiệu ứng khi đánh lan. [Ảnh đòn thường](tia-va-cham.png)
- **Chí mạng** dùng cùng tia và viền, thêm vòng nứt rộng 47–64 px trong 210 ms dưới chân mục tiêu chính. [Ảnh chí mạng](chi-mang.png)
- **Thiếu Lâm Đao** dùng đúng bộ thân và đao đã duyệt khi trúng đòn, khi ra Kim Quang Hộ Trận, Bất Động Minh Vương và Sư Tử Hống. [Trúng đòn](thieu-lam-dao-trung-don.png) · [Ra chiêu](thieu-lam-dao-ra-chieu.png)
- **Chín boss** có đối chiếu ở cả bốn hướng, gồm Tây Độc dạng Cáp Mô và hai dạng Vương Trùng Dương. Bên preview dùng pose renovate theo nhóm động tác. Bên M3D dùng atlas hiện hành và hướng dự phòng ở 17 cặp atlas/hướng thiếu khung tương ứng. [Đông Tà ra chiêu](dong-ta-ra-chieu.png) · [Rà sprite trong trận M3D](../m3d-followup-visual/README.md)

Nhịp chuẩn bị, ra đòn và thu thế trong preview dùng thời lượng mẫu. Các đoạn boss dùng chung pose theo nhóm động tác và chỉ trình bày thân, vũ khí. VFX riêng của chiêu và thời điểm khớp với sự kiện server thuộc bước tích hợp sau duyệt.

Chromium đã chạy đủ 48 mẫu ra chiêu ở hướng phải, kiểm tra đứng, trúng đòn và chiêu đầu ở cả bốn hướng cho 12 đối tượng. Cả bốn khung tia và bốn khung vòng nứt đã hiện trên Phaser rồi tắt. Hai canvas xếp dọc ở khổ 390 px. [Kết quả kiểm tra](verification.json)

Tia chỉnh màu từ bốn khung Metal Contact của hiệu ứng quái ở thành. Vòng nứt cắt từ hiệu ứng dậm đất của Hoàn Nhan Hồng Liệt. [Aseprite](source/impact-vfx.aseprite) · [PNG](source/impact-vfx.png) · [Khung, pivot và thời lượng](source/impact-vfx.json) · [Đường dẫn và SHA-256 của nguồn](source/provenance.json)
