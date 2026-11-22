# Bản nghe thử âm thanh ba phái

Mở [game trên máy này](http://127.0.0.1:55861/?debug), chọn **Phòng test** rồi
lần lượt thử hai nhánh của Côn Luân, Ngũ Độc và Đường Môn. Bấm vào canvas để
mở khóa âm thanh của trình duyệt. A đánh thường; Q/W/E/R/T dùng kỹ năng; Kiếm
Tôn có thêm S Kinh Lôi. R thụ động chỉ thể hiện qua hiệu ứng thực tế, không có
tiếng cast khi bấm. Phản độc cần địch đánh trúng trong trận thường; các bia phòng
test không chủ động tấn công.

Preview dùng đúng bundle đã qua [kiểm chứng cuối và các retry](../three-school-sfx-final/README.md).
Máy chủ bình thường, không bật fixture thay luật trận; Phòng test có sẵn cung cấp
cấp 30 và đủ bậc chiêu. Các clip đang chờ người dùng nghe và đánh giá chất âm/mix.

Thông tin process do phiên này tạo, không thuộc server khác:

- Node PID: `25704`, chạy ẩn bằng `Start-Process -WindowStyle Hidden`.
- Backend: `http://127.0.0.1:28861`, health `ok`, protocol 48.
- Run ID: `41ec7005-60d3-4c0e-a7c7-df7da2766637`.
- Client: `http://127.0.0.1:55861`, đã xác minh HTTP 200.
- Entry: [serve.mjs](serve.mjs); stdout/stderr nằm cùng thư mục này.
- Dùng lại `startOwnedGameQa`; chưa có phòng chơi nào của người dùng bị dừng.

Lần mở inline với stdin của tool gặp lỗi Windows/Node `UV_HANDLE_CLOSING` sau
khi báo ready. Process đó đã thoát; bản chạy ẩn tách stdin phía trên được kiểm
tra lại bằng HTTP, health và PID liveness trước khi bàn giao.
