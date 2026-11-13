# Côn Luân · Duyệt chiêu thức trong Phaser

Hai cảnh trên nhánh `wip/m3d/con-luan`, cùng nền sân M3D và tỷ lệ hiển thị 1×.

- [Thiền Sư](http://127.0.0.1:5599/?phai=thien-su) dùng atlas thân, búa và đòn thường v03 đã được người dùng duyệt. Dùng **A**, **Q → A**, rồi **W/E/R/T** để xem đập búa, vòng sét, búa bay và biến thân Chaos. Vòng E rộng thêm 20%. Hai dải sét của T bám theo tâm thân Chaos ở cả bốn hướng. [Vòng sét E](evidence-v02/thien-su-e.png) · [Ném búa R](evidence-v02/thien-su-r.png) · [Chaos](evidence-v02/thien-su-t.png)
- [Kiếm Tôn](http://127.0.0.1:5599/?phai=kiem-ton) dùng phím mũi tên để xem bốn hướng với kiếm lơ lửng thẳng đứng. Bấm **A** bảy lần để xem sáu cầu sét rồi một kiếm sét. Dùng **S** để cắm tối đa ba kiếm, **Q** để kích nổ, **W** để lướt. Đi hoặc lướt từ ngoài vào vòng kiếm để xem tín hiệu hồi W. **E** đâm liên tiếp trong góc 90°. **R** phóng đầu rồng sét. **T** cắm năm kiếm quanh vị trí người chơi lúc bấm, với diện tích bao bởi năm điểm cắm tăng 20%. Trận pháp hoạt động 5 giây sau khi kiếm cuối chạm đất, với một nhịp hiệu ứng mỗi giây. [Sprite Kiếm Tôn](evidence-v02/kiem-ton-idle.png) · [Đầu rồng](evidence-v02/kiem-ton-r.png) · [Trận pháp](evidence-v02/kiem-ton-t.png)
- **P** phát một nhịp hình ảnh để duyệt nội tại Huyền Thiên Vô Cực Công. Mỗi cảnh có các nút tương ứng bên trong viewport.

Đây là cảnh duyệt artwork với mục tiêu đứng yên và thời lượng trình diễn. Sprite Kiếm Tôn dùng chung một tư thế thủ quyết mỗi hướng cho các chiêu trong lượt này. Dạng Chaos có sprite đứng riêng, dùng sprite đứng theo hướng khi di chuyển và dùng tư thế thi triển có sẵn ở cỡ lớn trong lúc ra chiêu. Tư thế ném búa và Chaos nhìn trái dùng cel phía phải lật ngang. Các quy tắc sát thương, trạng thái, chỉ số và hồi chiêu trận chưa được triển khai. Màu tím của Kiếm Tôn theo bảng Hắc Thiết đã duyệt, màu vàng trắng của Thiền Sư theo prototype v03.

## Tái lập

```powershell
python -X utf8 assets/source/characters/con_luan_skill_preview/prepare.py --aseprite "C:/Program Files/Aseprite/Aseprite.exe"
node assets/reviews/con_luan_skill_preview/serve.mjs "<phaser-4.2.1>/dist/phaser.js" 5599
node assets/reviews/con_luan_skill_preview/verify.mjs "<playwright>/index.mjs"
```

[Manifest nguồn](../../source/characters/con_luan_skill_preview/manifest.json) · [Kết quả xuất atlas](../../exports/characters/con_luan_skill_preview/validation.json) · [Báo cáo Phaser](evidence-v02/phaser-observations.json)
