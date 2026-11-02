# Chỉnh nhịp đánh boss

File nguồn: `packages/game-data/src/boss-cadence.json`. Tất cả giá trị là **giây**, server làm tròn thành tick (30 tick/giây). Sửa file rồi build/restart server; phòng đang chạy không tự nạp lại. Không gửi thông số từ client.

| Trường | Ý nghĩa |
| --- | --- |
| `restSeconds` | Khoảng nghỉ giữa các lần chọn đòn; tăng để boss có thêm khoảng trống |
| `initialRestSeconds` | Hồng Liệt nghỉ lúc bắt đầu encounter |
| `basicCooldownSeconds` | Lý Mạc Sầu: nhịp đánh thường dự phòng |
| `windupSeconds` | Thời gian báo/chuẩn bị trước khi đòn được thả |
| `recoverySeconds` | Thời gian hồi động tác sau khi thả đòn |
| `cooldownSeconds` | Thời gian tối thiểu giữa hai lần bắt đầu cùng đòn; các điều kiện chọn đòn khác vẫn áp dụng |
| `intervalSeconds` | Nhịp lặp của đòn Hồng Liệt có nhiều lần phát, bao gồm pháo tự động |
| `warningSeconds` | Thời gian báo đòn Kim Luân/đệ tử |
| `basicPalmSeconds` | Chu Bá Thông: nhịp chưởng thường |
| `phasesSeconds` | Chu Bá Thông: thời lượng từng phase, không phải cooldown độc lập |

Lý Mạc Sầu hiện nghỉ 1,2s giữa các đòn (trước 0,65s), đánh thường dự phòng 1,8s (trước 1s), độc châm có cooldown 4s. Muốn bớt châm: tăng `ly_mac_sau.attacks.bang_phach_ngan_cham.cooldownSeconds`; muốn giảm mật độ toàn bộ chuỗi: tăng `ly_mac_sau.restSeconds`. Các boss khác giữ nhịp cũ trong JSON ban đầu.

Giá trị phải hữu hạn, từ 0,05 đến 300; riêng warning Kim Luân có thể bằng 0. Thiếu khóa đòn/phase hoặc sai kiểu sẽ dừng khởi động. Giữ nguyên các ID. Damage, range, số projectile, tốc bay và luật hồi sinh nằm ngoài file này. Giá trị lớn là công cụ thử nghiệm, không phải đề xuất cân bằng đã duyệt.
