# Côn Luân Thiền Sư · Hắc Thiết · Prototype v02

Bản v02 chờ duyệt trên `wip/m3d/con-luan`. [Mở cảnh Phaser](http://127.0.0.1:5597/). Dùng phím mũi tên để đi, bấm **A** bốn lần để xem **đâm → quẹt trái → hất từ dưới lên → đập xuống nổ sét**. Bấm **Q**, rồi **A**, để xem chĩa búa và sét tím giáng xuống giữa thân hình nhân.

- Búa cán dài được vẽ lại với mục tiêu gấp đôi chiều dài cán của prototype trước, giữ đầu sắt rãnh đồng. Độ dài chiếu trên màn hình thay đổi theo góc cầm và góc nhìn.
- Vệt đòn dùng raster Cái Bang Bổng đổi sang tím, căn mép ngoài ở mốc 105 đơn vị ở tỷ lệ preview 1×. Đâm, quẹt và hất theo hướng dọc dùng vệt gốc hướng ngang xoay trên mặt phẳng ảnh, vì các chuỗi Bổng đó chỉ xuất vệt ngang. Vệt đập dùng bốn hướng có sẵn và thêm nổ sét tím tại vị trí đầu búa chạm đất.
- Sét đánh xa dùng hình tia đã có với bảng màu tím. Điểm cuối dùng tâm thân raster hình nhân, gần 42 px trên điểm neo chân. Điện quấn búa khi bật Q tiếp tục dùng palette cũ.
- Phạm vi là artwork và scene duyệt riêng. Sét lan, W/E/R/T, phản ứng trúng đòn và tích hợp trận multiplayer thuộc lượt sau.

## Ảnh và kiểm chứng

[Đứng yên cạnh Cái Bang](evidence-v02/idle-arena.png) · [Đập nổ sét tím](evidence-v02/melee-slam.png) · [Sét tím chạm giữa thân](evidence-v02/ranged-hit.png) · [Báo cáo Playwright](evidence-v02/phaser-observations.json)

Playwright trên Phaser 4.2.1 và Edge quan sát đủ 28 clip, 88 frame thân và 76 frame VFX qua bốn hướng, xác nhận trở về idle, bật/tắt điện quấn đầu búa và dọn VFX sau đòn. Exporter so khớp PNG, thời lượng, phạm vi tag, alpha và mép vệt với mốc 105 trong dung sai 2 px. 64 cels thân riêng, 88 frame gồm cels chuẩn bị và hồi thế dùng chung. Bản này chỉ kiểm chứng hình ảnh ở tỷ lệ 1×.

[Manifest nguồn, prompt và hash](../../source/characters/con_luan_thien_su_v02/manifest.json) · [Atlas thân](../../exports/characters/con_luan_thien_su_v02/hero_con_luan_thien_su.png) · [Atlas hiệu ứng](../../exports/characters/con_luan_thien_su_v02/con_luan_thien_su_fx.png) · [Ảnh và log bản v01](evidence/)

## Chạy lại

```powershell
python -X utf8 assets/source/characters/con_luan_thien_su_v02/prepare.py --aseprite "C:/Program Files/Aseprite/Aseprite.exe"
node assets/reviews/con_luan_thien_su_v01/serve.mjs "<phaser-4.2.1>/dist/phaser.js" 5597
node assets/reviews/con_luan_thien_su_v01/verify.mjs "<playwright>/index.mjs"
```
