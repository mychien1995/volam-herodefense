# Thống nhất body các hệ phái — rollout theo đợt

Worktree/branch `wip/m3d/25d`. Director đã duyệt bản Cái Bang Chưởng trong chat ngày2026-11-19; raster/JSON/portrait/Aseprite được khóa hash trong `assets/approvals/hero-coherence/cai_bang_chuong.json`. Không tự coi các candidate sau là approved. Gameplay, HUD geometry, F8 và server authority giữ nguyên; chỉ test liên quan.

| Đợt | Nhánh | Trạng thái |
|---|---|---|
| Mẫu | Cái Bang Chưởng | Director approved, bytes locked |
|1|Cái Bang Bổng|Director approved, bytes locked|
|2|Võ Đang Quyền/Kiếm|Director approved, bytes locked|
|3|Thiên Sơn Phiến/Đao|Director approved, bytes locked|
|4|Thiếu Lâm Quyền/Đao|Candidate complete: native + 2/6 clients, PNG delivered|
|5|Côn Luân Thiền Sư/Kiếm Tôn|Candidate complete: native + 2/6 clients, PNG delivered|
|6|Đường Môn Cơ Quan/Ám Khí|Candidate complete: native + 2/6 clients, PNG delivered|
|7|Ngũ Độc Tà Hiệp/Cổ Sư|Candidate complete: native + 2/6 clients, PNG delivered|

Mỗi đợt: kiểm kê texture thực → lấy sprite nét hiện tại làm identity/quality master → một directional pilot xuất và xem trong Phaser → hoàn thiện tám hướng idle/walk/A/skill/hurt/status/death/respawn → cùng một body atlas, portrait cùng master → asset/native/hash/opacity checks → hai-client iteration và một six-client natural-combat/readability final → PNG thật và bàn giao candidate để director xem. Override được user duyệt 2026-11-19: gửi PNG thật mỗi đợt rồi tiếp tục tất cả các phái còn lại, không chờ duyệt giữa các đợt. Candidate mới chưa tự động được coi là art approved. Không ghi video.

Bổng cần giữ thêm: gậy đỏ khắc vàng đã duyệt và tỷ lệ dài/rộng, bốn thức thrust/sweep/rising/overhead, pull/Phá Giáp/chân giậm và finisher riêng. Không thay choreography bằng một pose ra chiêu chung. Giữ nguyên VFX/ground contact/hit geometry; đo source và các socket ở actual gameplay zoom.

Đợt1: [Cái Bang Bổng](CAI_BANG_BONG_COHERENCE.md), [PNG trước–sau](evidence/sessions/hero-coherence-batch1-delivery/sprite-before-after.png). Đợt2: [Võ Đang Quyền/Kiếm](VO_DANG_COHERENCE.md), PNG [Quyền](evidence/sessions/hero-coherence-batch2-delivery/quyen-before-after.png) / [Kiếm](evidence/sessions/hero-coherence-batch2-delivery/kiem-before-after.png). Thông tin chi tiết các đợt tiếp theo ở bên dưới.

Đợt3: [Thiên Sơn Phiến/Đao](THIEN_SON_COHERENCE.md), PNG [Phiến](evidence/sessions/hero-coherence-batch3-delivery/phien-before-after.png) / [Đao](evidence/sessions/hero-coherence-batch3-delivery/dao-before-after.png). Thiên Sơn được director duyệt 2026-11-19; tiếp tục đợt4–7 theo authorization mới.

Đợt4: [Thiếu Lâm](THIEU_LAM_COHERENCE.md), PNG [Quyền](evidence/sessions/hero-coherence-batch4-delivery/quyen-before-after.png) / [Đao](evidence/sessions/hero-coherence-batch4-delivery/dao-before-after.png). Tiếp tục Côn Luân theo authorization mới.

Đợt5: [Côn Luân](CON_LUAN_COHERENCE.md), PNG [Thiền Sư](evidence/sessions/hero-coherence-batch5-delivery/thien-su-before-after.png) / [Kiếm Tôn](evidence/sessions/hero-coherence-batch5-delivery/kiem-ton-before-after.png). Tiếp tục Đường Môn.

Đợt6: [Đường Môn](DUONG_MON_COHERENCE.md), PNG [Cơ Quan](evidence/sessions/hero-coherence-batch6-delivery/co-quan-before-after.png) / [Ám Khí](evidence/sessions/hero-coherence-batch6-delivery/am-khi-before-after.png). Tiếp tục Ngũ Độc.

Đợt7: [Ngũ Độc](NGU_DOC_COHERENCE.md), PNG [Tà Hiệp](evidence/sessions/hero-coherence-batch7-delivery/ta-hiep-before-after.png) / [Cổ Sư](evidence/sessions/hero-coherence-batch7-delivery/co-su-before-after.png). Hoàn tất cả8 nhánh còn lại, tổng14 nhánh canonical. [Tổng kiểm chứng](evidence/sessions/hero-coherence-all-remaining-delivery/summary.json), [PNG tám nhánh](evidence/sessions/hero-coherence-all-remaining-delivery/eight-branches-before-after.png).1904 atlas/native frames,1792 authored +112 derived Chaos-density cels,328 tags.

Git giữ byte-exact JSON cho các atlas/source unified để approval/native hashes còn đúng khi checkout mới. Re-stage metadata đã duyệt chỉ giữ đúng CRLF hiện tại đang được khóa; không re-export/re-serialize approved art. Kiểm tra index đủ36 locks PASS. Chỉ commit nhánh này, không merge/push.

Phòng review mới: `http://127.0.0.1:5614/?debug=1`, mở sẵn Ngũ Độc Cổ Sư cấp30, cả5 slot rank4, F8 off/on đã kiểm tra, không pageerror. Fixture local cho phép tạo phòng và chọn lại bất kỳ14 nhánh, nhận cấp30/rank4 theo đúng nhánh chọn; trận vẫn chạy luật/cooldown/wave bình thường. [PNG có HUD](evidence/sessions/hero-coherence-all-remaining-delivery/room-ready.png), [room metadata](evidence/sessions/hero-coherence-all-remaining-delivery/play-room.json). Room ID là thời điểm chụp, có thể kết thúc theo gameplay bình thường.


## Sprite correction — 2026-11-20

User phản hồi Thiên Sơn Đao khác style Phiến và hai Côn Luân nhỏ khi A. Current runtime chuyển ba nhánh này sang sibling `*-unified-v2`; v1/36 approved byte locks giữ nguyên. Đao redraw256cel/tám hướng theo material/contour Phiến, chưa director-approved. Côn Luân giữ nguyên nguồn art, sửa action export density và xử lý idle replacement khác resolution; renderer scale vẫn0.5. Native848frames/128tags PASS,16focused cases/types PASS; six-client coverage qua scoped stages, giữ các FAIL và retry đã ghi. Chi tiết/PNG: [SPRITE_CORRECTIONS_2026_11_20.md](SPRITE_CORRECTIONS_2026_11_20.md).
