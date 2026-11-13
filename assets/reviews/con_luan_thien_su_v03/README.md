# Côn Luân Thiền Sư · Prototype v03

[Mở bản duyệt Phaser](http://127.0.0.1:5598/). Dùng phím mũi tên để di chuyển, bấm **A** bốn lần để xem đâm, quẹt trái, hất lên và đập xuống. **Q → A** để xem sét đánh xa giáng xuống giữa thân hình nhân.

Đầu búa sắt rãnh đồng được vẽ lớn hơn. Bốn thức cận chiến có hai tay trên cán ở tư thế lấy đà, ra đòn và thu búa. Tư thế cầm khi đứng, đi và chĩa búa dùng một tay. Vệt cận chiến là nhánh sét vàng trắng riêng theo từng thức, với điểm xa nhất giữ mốc 105 của bản trước. Thức đập có một tia chạy sát đất và một cụm nổ tại đầu búa chạm đất. Đòn xa phục hồi tia sét vàng trắng của v01 và dùng điểm chạm giữa thân như v02.

[Đầu búa khi đứng](evidence/idle-arena.png) · [Quẹt búa hai tay](evidence/melee-sweep.png) · [Đập nổ sét](evidence/melee-slam.png) · [Đòn xa chạm thân](evidence/ranged-hit.png)

## Kiểm tra

Aseprite xuất 88 khung thân từ 64 hình riêng và 76 khung sét. Kiểm tra xuất so khớp pixel, vùng khung, alpha, thời lượng và tag, đồng thời kiểm tra tầm vệt 105 với sai số tối đa 2 px. Playwright trên Phaser 4.2.1 và Edge kiểm tra bốn hướng, thứ tự frame, vòng đứng và đi, đổi Q, điểm chạm thân mục tiêu và dọn hiệu ứng. Đây là scene art riêng ở tỷ lệ 1×.

[Báo cáo Playwright](evidence/phaser-observations.json) · [Nguồn và prompt](../../source/characters/con_luan_thien_su_v03/manifest.json) · [Atlas thân](../../exports/characters/con_luan_thien_su_v03/hero_con_luan_thien_su.png) · [Atlas sét](../../exports/characters/con_luan_thien_su_v03/con_luan_thien_su_fx.png)

```powershell
python -X utf8 assets/source/characters/con_luan_thien_su_v03/prepare.py --aseprite "C:/Program Files/Aseprite/Aseprite.exe"
node assets/reviews/con_luan_thien_su_v03/serve.mjs "<phaser-4.2.1>/dist/phaser.js" 5598
node assets/reviews/con_luan_thien_su_v03/verify.mjs "<playwright>/index.mjs"
```
