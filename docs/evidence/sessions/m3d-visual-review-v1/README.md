# M3D · Preview visual v1

Mở `index.html` trong trình duyệt. Trang chạy offline bằng Phaser 4.2.1. Chọn phó bản và tên hiệu ứng, sau đó dùng Tạm dừng, 0,5× hoặc thanh thời gian để soi từng nhịp.

| Khu vực | Các mục duyệt |
| --- | --- |
| Rừng Trúc | Phun độc, tơ nhện đánh thường gây sát thương và định thân, Sơn Viên nhấc đá/ném/đá vỡ, rễ trồi theo tuyến, ám khí bay từ bốn phía |
| Sa Mạc | Cát nguyền, Sa thạch bộc phá, cát lún cố định |
| Biển | Song càng hai nhịp, Pháo kích, Triều dâng, gợn báo ngắn rồi cột nước gây choáng |
| Địa Ngục | Hỏa trảo ba vệt móng, khe lửa cố định báo ngắn rồi phun lệch nhịp gây choáng |
| HUD | Gợi ý giữ O + QWERT trong viewport và phản hồi minh họa với O + Q |

Bộ VFX ứng viên đến từ hai bảng Codex ImageGen. Bảng môi trường gồm gợn/cột nước, khe/cột lửa, cát lún và ám khí. Bảng chiến đấu gồm quạt cát có dấu tím, khe đá sa thạch, đầu sóng bọt trắng và ba vệt Hỏa trảo. `build.py` key nền, đăng ký gốc từng frame, cắt nền và ghép atlas. Atlas Motion v08 dùng khung và điểm neo có sẵn. Động tác nhấc đá của Sơn Viên ghép tư thế giơ tay sẵn có với một sprite đá riêng. Nguồn, hash và danh sách clip có trong `manifest.json`.

Nhịp bẫy, tầm hiệu ứng và trạng thái trúng trong preview là timeline minh họa. Tỷ lệ và thời lượng khống chế, sát thương, va chạm, đồng bộ nhiều người, bốn hướng của các clip creep và đường render của trận M3D sẽ cần được kiểm tra trong lượt tích hợp sau duyệt.

`browser-review.json` ghi kết quả Chromium offline cho cả 15 mục, thời điểm quan sát cel, phát tự động, phát chậm, tua, tạm dừng, phát lại, O + Q và bố cục ở 390 px. Ảnh PNG lấy từ Phaser trong Chromium.
