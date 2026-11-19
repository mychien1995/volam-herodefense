# Thống nhất body các hệ phái — rollout theo đợt

Worktree/branch `wip/m3d/25d`. Director đã duyệt bản Cái Bang Chưởng trong chat ngày2026-11-19; raster/JSON/portrait/Aseprite được khóa hash trong `assets/approvals/hero-coherence/cai_bang_chuong.json`. Không tự coi các candidate sau là approved. Gameplay, HUD geometry, F8 và server authority giữ nguyên; chỉ test liên quan.

| Đợt | Nhánh | Trạng thái |
|---|---|---|
| Mẫu | Cái Bang Chưởng | Director approved, bytes locked |
|1|Cái Bang Bổng|Director approved, bytes locked|
|2|Võ Đang Quyền/Kiếm|Candidate đã tích hợp; dừng PNG/director review trước đợt3|
|3|Thiên Sơn Phiến/Đao|Chưa triển khai|
|4|Thiếu Lâm Quyền/Đao|Chưa triển khai|
|5|Côn Luân Thiên Sư/Kiếm Tôn|Chưa triển khai|
|6|Đường Môn Cơ Quan/Ám Khí|Chưa triển khai|
|7|Ngũ Độc Tà Hiệp/Cổ Sư|Chưa triển khai|

Mỗi đợt: kiểm kê texture thực → lấy sprite nét hiện tại làm identity/quality master → một directional pilot xuất và xem trong Phaser → hoàn thiện tám hướng idle/walk/A/skill/hurt/status/death/respawn → cùng một body atlas, portrait cùng master → asset/native/hash/opacity checks → hai-client iteration và một six-client natural-combat/readability final → PNG thật và bàn giao candidate để director xem. Dừng trước đợt tiếp theo theo yêu cầu người dùng. Không ghi video.

Bổng cần giữ thêm: gậy đỏ khắc vàng đã duyệt và tỷ lệ dài/rộng, bốn thức thrust/sweep/rising/overhead, pull/Phá Giáp/chân giậm và finisher riêng. Không thay choreography bằng một pose ra chiêu chung. Giữ nguyên VFX/ground contact/hit geometry; đo source và các socket ở actual gameplay zoom.

Đợt1: [Cái Bang Bổng](CAI_BANG_BONG_COHERENCE.md), [PNG trước–sau](evidence/sessions/hero-coherence-batch1-delivery/sprite-before-after.png). Đợt2: [Võ Đang Quyền/Kiếm](VO_DANG_COHERENCE.md), PNG [Quyền](evidence/sessions/hero-coherence-batch2-delivery/quyen-before-after.png) / [Kiếm](evidence/sessions/hero-coherence-batch2-delivery/kiem-before-after.png). Các phái từ đợt3 chưa đổi.
