# Điểm chạm · Preview V01

[Mở trang đối chiếu](index.html) · [Bảng 35 cel](contact-sheet.png) · [Manifest](manifest.json) · [Kiểm chứng](qa.json)

30 mục duyệt bao phủ các chỗ thiếu dấu chạm trong báo cáo production. Bộ ảnh gồm 7 đòn A thiếu dấu riêng, 18 kỹ năng hoặc nhịp đã liệt kê, các nhịp xoay của Thiên Hạ và rồng cuộn của Hàng Long, đốt tồn dư của Cuồng Long, dải gần của Vi Đà, và một mục đối chiếu riêng sau khi đổi F ở Thiếu Lâm Quyền. Hai nhánh Đường Môn đã có dấu chạm hoặc nổ riêng ở phạm vi kiểm tra.

## Hình dáng theo hệ phái

| Phái | Ngôn ngữ hình ảnh |
| --- | --- |
| Cái Bang | Lõi vàng trắng với tàn đồng đỏ. Bổng dùng cạnh lực ngắn, Chưởng dùng lửa nén và mảnh than. |
| Thiên Sơn | Lam băng và trắng thép. Phiến dùng nếp gió cong, Đao dùng vết cắt sắc. Cánh đào chỉ xuất hiện ở Tam Liên Trảm. |
| Võ Đang | Trắng ngà, mực chàm và lam trăng. Quyền dùng hai nét đối nhau, Kiếm dùng cạnh bạc mảnh. |
| Thiếu Lâm | Kim quang, hổ phách và bụi đồng. Quyền đọc độ nén, Đao đọc cạnh kim sắc. |
| Côn Luân | Hai nhánh dùng cùng cấu trúc sét gãy. Thiền Sư giữ hổ phách Hắc Thiết, Kiếm Tôn giữ tím. |

## Đối chiếu bản đang chạy

- Bản production `f7bf3032`, protocol 42, cùng mã đã rà 828 tổ hợp sát thương. Dữ liệu cho preview gồm 82 PNG bắt từ khung render sau khi server nhận lệnh phím, trên một creep và Lý Mạc Sầu. Hai client thấy cùng ID hit và lượng sát thương cho đủ 82 khung. Mỗi mục có khung đối chiếu ở cả hai mục tiêu. Khi một biến thể dùng chung khung của chiêu, trang preview ghi điều đó cạnh tick.
- Điểm neo dùng vị trí tia M3D của hit thật. Vết đốt có mốc thấp hơn trên ảnh ghép. Ảnh nền giữ tia M3D để đối chiếu. Các điểm chạm lặp dùng lượng nét nhỏ hơn đòn đơn. Kích thước lõi từ 15 đến 26 pixel logic, ở camera 2× tương đương 30 đến 52 pixel trước khi trang thích nghi theo màn hình.
- Thử 5 mẫu đại diện trong Phaser ở chế độ QA, mỗi mẫu trên creep và Lý Mạc Sầu. Cả hai client vẽ PNG 64 × 64 ở đúng điểm neo, zoom 2×, cho đủ 10 ca. [Hoành Tảo Bổng trong Phaser](runtime-review/creep-hoanh_tao_bong-Q-contact.png) · [Bạo Vũ Cuồng Phong trong Phaser](runtime-review/ly_mac_sau-luu_phong_bo-E-contact.png)
- Kiểm tra trang đối chiếu qua 76 lựa chọn mẫu × mục tiêu, trên desktop và bố cục 375 px. Đây là bộ cel tĩnh tại pha chạm, chờ duyệt hình dáng trước khi sản xuất các frame chuyển động và đưa vào luồng phát hành.

## Nguồn và kiểm tra PNG

Năm sheet nguồn được tạo mới bằng ChatGPT ImageGen tích hợp. Prompt, ảnh tham chiếu và SHA-256 có trong `source/` và manifest. Bốn sheet có kích thước 1536 × 1024. Sheet Côn Luân có kích thước 1254 × 1254. Tệp tham chiếu trong handoff có tên cũ `vo_dang_art_direction_reference.png`. Lượt này đối chiếu bản hiện có `vo_dang_character_reference.png`, bộ tham chiếu v1.5, ảnh anti-reference và khung production.

Kiểm tra sheet thô ghi các kết quả dưới đây. Các ngưỡng này áp dụng cho sheet trước khi dọn alpha. Sau khi tách, đủ 35 PNG RGBA 64 × 64 với pivot (32, 32), biên alpha cách mép tối thiểu 10 px. Lõi nguồn cách mép ô tối thiểu 28 px.

| Tệp thô | Kiểm tra | Giá trị | Ngưỡng |
| --- | --- | --- | --- |
| `source/cai-bang.png` | `safe_frame` | 5 | 0 |
| `source/cai-bang.png` | `faint_specks` | `{"floor_px":158406,"detached_components":13}` | 0 |
| `source/thien-son.png` | `faint_specks` | `{"floor_px":280040,"detached_components":23}` | 0 |
| `source/vo-dang.png` | `faint_specks` | `{"floor_px":81831,"detached_components":7}` | 0 |
| `source/thieu-lam.png` | `empty_cells` | `[[1,3]]` · ô 8 để trống theo prompt | `[]` |
| `source/thieu-lam.png` | `safe_frame` | 1 | 0 |
| `source/thieu-lam.png` | `faint_specks` | `{"floor_px":200541,"detached_components":4}` | 0 |
| `source/con-luan.png` | `faint_specks` | `{"floor_px":34866,"detached_components":3}` | 0 |

