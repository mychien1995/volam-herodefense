# Côn Luân Thiền Sư · Hắc Thiết · Prototype v01

Artwork Hắc Thiết v02 được người dùng duyệt ngày 2026-11-13. Sprite, chuyển động và hiệu ứng dưới đây đang chờ duyệt. Worktree dùng nhánh `wip/m3d/con-luan` từ `milestone/m3d`.

## Duyệt trong Phaser

Mở [preview Thiền Sư](http://127.0.0.1:5596/). Dùng phím mũi tên để đổi hướng và đi bộ. Bấm **A** từng lần để xem móc thấp, hất lên, quét ngang và bổ xuống. Bấm **Q** để bật điện quấn đầu búa, rồi bấm **A** để xem chĩa búa và sét giáng từ trên xuống đầu hình nhân theo hướng đang nhìn. A và Q cũng có nút trong cảnh preview.

Cảnh dùng Phaser 4.2.1 ở tỷ lệ 1×, nền sân M3D và Cái Bang Bổng ở cùng tỷ lệ để đối chiếu. Bốn Sơn Tặc đứng yên làm mốc hình ảnh. Lần này xem sét đánh mục tiêu chính, bốn vệt búa và điện quấn búa. Nhánh sét lan, W/E/R/T, phản ứng trúng đòn và ngã thuộc các lượt art sau. Trang chỉ phát animation tại máy, với thời lượng dùng để duyệt hình ảnh.

- [Ảnh đứng yên cạnh Cái Bang](evidence/idle-arena.png)
- [Ảnh sét chạm đầu mục tiêu](evidence/ranged-hit.png)
- [Kết quả Playwright và các frame quan sát trong Phaser](evidence/phaser-observations.json)
- [Artwork Hắc Thiết đã duyệt](../../concepts/heroes/con-luan/02-hac-thiet-thien-su.png) · [bảng chiêu thức v02](../../concepts/heroes/con-luan/10-hac-thiet-thien-su-vfx-v02.png)

## Sprite và nguồn

| Atlas | Cels riêng | Khung atlas | Tags | Canvas mỗi khung | Điểm neo |
| --- | ---: | ---: | ---: | --- | --- |
| [Thân và búa](../../exports/characters/con_luan_thien_su_v01/hero_con_luan_thien_su.png) | 64 | 88 | 28 | 176 × 144 px | Chân (88, 120) |
| [Sét](../../exports/characters/con_luan_thien_su_v01/con_luan_thien_su_fx.png) | 12 | 12 | 6 | 160 × 208 px | (80, 160) |

Thân đứng cao 88 px như Cái Bang Bổng M3D. Mỗi hướng có hai pose đứng, bốn bước, bốn động tác đánh gần dùng các khung chuẩn bị và thu búa chung, và bốn pose đánh xa. Cels gốc được vẽ riêng cho từng hướng. Giữ búa sắt rãnh đồng, vai lông sáng, tóc cạo hai bên và đai đỏ gạch theo master. Cảnh tái sử dụng các tài nguyên sân, đèn và nhân vật so sánh đã có trong repo.

[Manifest và nguồn](../../source/characters/con_luan_thien_su_v01/prototype_manifest.json) · [Prompt ImageGen](../../source/characters/con_luan_thien_su_v01/generation.json) · [Aseprite nhân vật](../../source/characters/con_luan_thien_su_v01/hero_con_luan_thien_su.aseprite) · [Aseprite hiệu ứng](../../source/characters/con_luan_thien_su_v01/con_luan_thien_su_fx.aseprite)

## Chạy lại trong worktree

```powershell
node assets/reviews/con_luan_thien_su_v01/serve.mjs "<phaser-4.2.1>/dist/phaser.js" 5596
node assets/reviews/con_luan_thien_su_v01/verify.mjs "<playwright>/index.mjs"
python -X utf8 assets/source/characters/con_luan_thien_su_v01/prepare.py --aseprite "C:/Program Files/Aseprite/Aseprite.exe"
```

Hai lệnh Node mặc định tìm các dependency trong worktree nếu đã cài. Lượt duyệt dùng Phaser và Playwright đã cài ở checkout chính, và Microsoft Edge headless. Lệnh Python tái dựng từ PNG gốc và xuất lại Aseprite/atlas với Pillow, NumPy, SciPy và Aseprite. Dùng file Aseprite để chỉnh cel bằng tay, rồi xuất riêng từ Aseprite nếu cần giữ các chỉnh sửa tay. Lượt duyệt này dùng PNG tĩnh và nhật ký frame. Kết quả chỉ bao phủ cảnh duyệt Phaser riêng, chưa qua kiểm tra phòng multiplayer hay tích hợp trận production.
