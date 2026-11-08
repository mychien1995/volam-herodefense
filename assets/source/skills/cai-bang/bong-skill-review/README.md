# Cái Bang Bổng · Review ba kỹ năng

Nguồn PNG trong thư mục này là raster gốc từ OpenAI ImageGen, tạo riêng cho bản review. Atlas đầu ra nằm ở `assets/exports/skills/cai-bang/bong-skill-review`. Dùng `assets/source/skills/cai-bang/bong-combo-review/export.lua` trong Aseprite để tái xuất. Các file `.aseprite` chứa cel đã căn trục để chỉnh trực tiếp. Phần thân, quạt lửa và vết nứt là các lớp riêng trong game.

| Nguồn | Tham chiếu và chỉ dẫn tạo ảnh | Đăng ký |
| --- | --- | --- |
| `long-mach.png` | Ô B Long Mạch trong ảnh người dùng chọn và concept hạ thấp người. Bốn cel quạt lửa đặc quét theo thân bổng và bốn cel khe nham phân nhánh. | Cel 256×160, gốc (20, 120). Căn theo trục từ chân đến đầu gậy V8. |
| `contacts.png` | Concept Long Mạch và Nham Triều, đối chiếu sprite đánh A. Hàng trên hạ thấp hông, một chân duỗi và gậy sát đất. Hàng dưới hai tay giậm bổng cạnh hai chân. | Cel 512×448, gốc chân (256, 224). Hướng trái lật từ phải. Gậy dài dùng lại họa tiết raster đã tạo cho gậy review. |
| `nham-chan.png` | Phương án A Nham Chấn. Tám cel cùng tâm, tia chạm đất, khe nham mở và vành đá vỡ rồi dịu lửa. | Cel 256×172, gốc (128, 86). 680 ms, thu theo bán kính cú giậm. |
| `nham-trieu.png` | Thức hai của storyboard Nham Triều. Tám cel từ lóe sáng tới vòng nham, đá hạ xuống và tàn lửa. | Cel 256×172, gốc (128, 86). 839 ms, mờ dần ở 240 ms cuối. |

Thiên Hạ Vô Cẩu dùng lại atlas chạy bốn hướng của chó lửa R3. Sáu con chạy cách đều quanh một vòng, với nhịp chân lệch pha. Tư thế xoay dùng lại cel quét trong atlas đánh thường. Pha giơ gậy dùng cel lấy đà đánh A và tư thế chạm mới dùng chung với Truy Phong.

Trên M3D, Truy Phong dùng vùng giậm bán kính cơ bản 110, lấy đà 6 tick và giữ sát thương, thời gian choáng theo bậc. Các cel Long Mạch là nguồn tham khảo cho phương án trước; Phá Giáp hiện dùng atlas ở `../pha-giap-lava/`. Server phát sự kiện chạm để client phát hiệu ứng. Số chó lửa là phần trình bày của tuyệt kỹ.
