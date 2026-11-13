# Đường Môn · Sân tập hiệu ứng

[Bản v2 với arena, sprite và VFX độ nét cao](../duong-mon-vfx-v2/index.html).

[Mở index.html](index.html) trực tiếp bằng Chrome hoặc Edge. Có thể mở từ ổ đĩa. Trang đọc PNG tương đối trong worktree và chạy hoàn toàn offline.

- Chọn **Tuần sa** hoặc **Dạ hành** ở đầu sân. Di chuyển bằng **↑ ↓ ← →**.
- Bấm **A, Q, W, E, R, T, Shift** hoặc bấm ô chiêu. **P** xem ba dấu hiệu của nội tại Tứ tuyệt khí. Dòng trên hotbar hiện pha đang diễn ra.
- Ở **Tuần sa**, bấm **W** để bay, rồi **A** để xem lông thép. Bấm **W** lần nữa để đáp. **R** bọc cánh và giữ chân. **T** có nhịp rải, chờ và nổ hoa cùng lúc.
- Ở **Dạ hành**, chọn **Cấp R** từ 0 đến 4 rồi bấm **A** hoặc **R** để so các quạt phi tiêu. Mặc định là **R4** đã duyệt. Băng châm xanh băng ở giữa, hai bên dùng màu ngay trên thân đạn. **Q** cho xem góc nhìn người đặt và bia kích nổ. **E** giữ dấu miễn sát thương hai giây sau khi lướt. **T** trình diễn ba pha 9 phi đao, 90 phi đao độc, rồi quạt kim châm.
- Bấm **1×** để chuyển sang **½×**. **Về vị trí** đưa nhân vật về chỗ ban đầu và dọn VFX.

## Lựa chọn đã duyệt

[Tuần sa 01, Dạ hành 06 và R4](../../concepts/heroes/duong-mon/tuan-sa-da-hanh/APPROVAL.md). Các mốc nhịp, độ cao bay, khoảng cách và độ xòe trong preview là giá trị trình diễn. Sân tập dùng Canvas 2D với ba bia và các cue hình ảnh. Số lượt, hồi chiêu, mana và luật sát thương không được mô phỏng. Hệ phái chưa được đăng ký trong Phaser, trận đấu hoặc server. Các pose bên trái dùng ảnh lật từ pose bên phải. Pose dọc tái sử dụng hình tương ứng giữa các phase khi chỉ cần thấy trạng thái chính.

## Nguồn và xuất ảnh

Hai tạo hình được duyệt định hướng 6 sheet nhân vật mới. [Nguồn ImageGen và prompt](source/prompts.md) giữ 7 sheet gốc, gồm 56 pose và 12 cel VFX. `python -X utf8 assets/reviews/duong-mon-vfx/prepare-art.py` xuất atlas RGBA, ô 120 × 120, mốc chân (60, 100), và sinh `frames.js` với chỉ số cel, kích thước và SHA-256 nguồn. Mỗi hướng đi có một pose đứng và hai pose bước. Các ô VFX lấy tâm (60, 60). Sân dùng tileset sa mạc, cảnh vật sa mạc và bia Toàn Chân Trúc Lâm có sẵn trong repo. Preview dùng sprite và VFX gốc đã tách nền, đang chờ duyệt chuyển động.

## Kiểm chứng

`node --check assets/reviews/duong-mon-vfx/preview.js` kiểm tra cú pháp. `node assets/reviews/duong-mon-vfx/verify-preview.cjs [đường-dẫn-module-Playwright]` mở HTML qua `file://` trong Chrome và kiểm tra hai hệ, bốn hướng, mọi phím chiêu, Q ba làn song song, R0–R4, hướng băng châm, khóa bước khi bọc giáp, bay/đáp, ba đợt tuyệt kỹ và lỗi console. Có thể xem [Tuần sa bay](tuan-sa-bay.png) và [Dạ hành R4](da-hanh-r4.png).
