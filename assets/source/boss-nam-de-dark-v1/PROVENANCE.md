# Nam Đế hắc hóa — nguồn thân v1

Cập nhật duyệt 2026-11-25: sau khi xem bản tích hợp trong game, user yêu cầu “Duyệt. Integrate vào milestone/m4d và commit”. Runtime art v1 hiện APPROVED; hash bản duyệt trong [approval lock](../../approved_nam_de_dark_v01.lock.json). Mô tả CANDIDATE phía dưới là lịch sử sản xuất trước lần duyệt này; không thay PNG/native/atlas.

Bốn concept v01 được user duyệt ngày2026-11-25, yêu cầu tích hợp bằng renovate-game-sprite và giữ nét. Nguồn thân được redraw bằng built-in imagegen từ concept và Nam Đế unified hiện tại, không cắt concept thành animation. Prompt nguyên văn nằm trong prompts/.

4 nhóm góc nhìn được vẽ: down(front three-quarter), right(side three-quarter), up(rear), up_right(rear three-quarter). Down_right dùng cùng viewfront3/4; left/down_left/up_left dùng bản lật có ghi trong profile/manifest. Hurt/death có3view nguồn, rear3/4 dùng rear. Tổng64cel có tám hướng runtime, mỗi hướng idle, hai nhịp đi, windup/release, summon, hurt, death. Các chiêu cũ còn lại dùng chung pose unarmed windup/release hoặc summon; không đổi lại thân áo vàng. Không claim64pose mới độc lập hoặc đầy đủ motion capture.

Điểm chân320/624 trên canvas640x704, scale0,5. Thân idle đăng ký248px so với124px cấu hình phase1; maskalpha24 thực tế249/127≈1,96. Giữ tỉ lệ trong nhóm pose, không co theo bbox tay vươn hoặc corpse. Không lật mặt phẳng toàn ảnh để giả tám góc.

PNG gốc và lượt walk lặp bị loại được giữ trong raw/. Bản down.png là lượt sửa nhịp bước; phong cách/pose cần director nhìn bản chơi. PNG/JSON ở assets/exports/boss-nam-de-dark-v1; body.aseprite có đủ tag,64frame roundtripRGBA nguyên vẹn. manifest ghi source/export/celSHA256, native-validation ghi kiểm tra. Tạo hình concept APPROVED; sprite integration CANDIDATE, chưa có final-runtime art approval.
