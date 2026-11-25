# M4D — phản hồi boss và arena · 2026-11-25

Checkout `milestone/m4d`, protocol **52**. Phòng mới dùng schema và tọa độ mới. Tiếp tục test progression, host có quyền chuyển boss/phase; các nút này không áp dụng vào campaign thường.

## Tâm sân

`arenaVariants.circleCenter` là nguồn chung cho authority, lớp plaza và đạo cụ, tách khỏi `roadCenter` dùng cho lane: Đào Hoa Đảo (800,535), Tương Dương (800,500), Tụ Hiền Trang (800,535). Match đăng ký vị trí trước khi có người chơi. Tượng/collider, điểm spawn, bounds và định nghĩa riêng của năm boss dịch cùng nhau, không sửa template hoặc phòng khác. Bắc Cái đi vào theo đường bắc chung để không mắc nước hồ sen trên Tụ Hiền Trang. Tây Độc sinh mây/cột theo cùng field đã đăng ký.

Trong hai trận cuối, presenter nhận cả snapshot chuyên dụng của Bắc Cái/VTD để ẩn tượng và hai đèn, kể cả khi generic creep projection không chứa hai boss này. Shadow/glow tiếp tục theo visibility của nguồn.

## Tuning và cơ chế

- Tây Độc: cooldown Cổ Độc Khoan Tâm, Vạn Độc Bạo Phát, Hỗn Thiên Phục Long Chấn từ 6s lên 18s. Hai skill độc nổ được giảm để bao phủ cả lời nguyền nổ phase 1 và đòn nổ phase 2. Không đổi sát thương.
- Võ Đang Kiếm — Vạn Kiếm: range gốc 320 → 480; tăng theo rank như cũ. Rise 51 → 30 tick (1,7 → 1s), aim 36 → 24 tick để nằm trong rise. Lần kiếm đầu 120 → 80ms, mỗi kiếm bay lên 520 → 300ms; vẫn đủ 48 kiếm, nhịp nghỉ và rơi cũ. Area marker tồn tại theo lifetime cũ nhưng ẩn sau khi hết đợt rơi.
- Cái Bang Chưởng — Hàng Long: server gửi thời điểm/bề dài stage và độ cao thực theo ability đã tính rank. Rồng bay lên từ người chơi, sau đó nội suy đến điểm đáp do server chốt; không dùng thời gian từ catalogue chưa tính rank để đoán stage. Không đổi hit hoặc target của chiêu.
- Nam Đế: sửa cue chỉ gửi x/y thay vì spread nguyên hero/boss vào envelope, để client nhận được sự kiện sealed/cast hợp lệ. QTE đúng 210 tick/7s; ô mũi tên desktop tối thiểu 42px, chữ 34px, có thu nhỏ cho viewport hẹp. Tiểu Nhất Dương Chỉ gốc 45 → 38,25 (×0,85); mitigation/scaling/rounding giữ pipeline hiện tại.
- Bắc Cái — Phi Long Tại Thiên: bỏ đầu rồng xoáy, dùng vòng lửa ellipse đồng tâm sân, bán kính 20 → 310 trong thời gian cũ, yScale 0,7. Annulus được sweep giữa hai tick và hai vị trí hero; đi bộ nhanh không xuyên được hitbox. Chỉ tick Shift thật sự dịch chuyển được miễn sát thương của vòng này, gồm tick cuối action; không thêm bất tử chung.
- Mục Hạ Vô Nhân: chặn riêng auto basic trong lúc chọn phân thân, đến khi thân thật/phân thân trúng đòn hoặc mechanic kết thúc. A thủ công và kỹ năng vẫn hoạt động; không đổi lựa chọn bật auto của người chơi.
- Ba ô sở thích Bắc Cái: x = tâm ±150/0, y = tâm −80.
- Ngũ Hành VTD: settlement đã là global trong baseline hiện tại. Thêm regression đủ năm hành với người đứng đúng ô, sai ô và ngoài mọi ô, để khóa hợp đồng: ngoài mọi ô vẫn bị đánh/apply effect; chỉ ô tương khắc bảo vệ.
- Test VTD phase 2: dùng cùng transition thật; gỡ ba lớp sét, HP về ngưỡng 55%, dọn mechanic phase 1, hồi hero và mở ledger hồi sinh mới. Host dùng được ở HUD hoặc ballot sau wipe; request lặp/stale, peer và phòng thường bị chặn. Không cấp reward/clear hoặc biến thành thắng trận.

## Chữ và VFX

Tượng và tên boss dùng font 14px, resolution theo camera/DPR 2–6, texture LINEAR, viền mảnh. Tên chiêu ưu tiên hội thoại. Thoại sở thích chuyên dụng của Bắc Cái cũng nhường cửa sổ gọi tên chiêu.

VFX mới giữ tại `assets/source/effects/bac_cai_m4d_v04`, master và hash/provenance được giữ; export lưu ở `assets/exports/effects/bac_cai_m4d_v04`; `prepare-m4d-boss-vfx.mjs` kiểm tra hash master/export, PNG RGBA/dimensions rồi copy ba crop sang `public/assets/bac-cai-m4d-v04`. Luồng dài, đạn đầu rồng và vòng lửa dùng ảnh riêng, LINEAR, không kéo giãn atlas cũ. Vòng lửa nở theo cùng clock/bán kính server và không xoay đầu rồng. Đây là candidate đã tích hợp cho director test; chưa có final-art approval. Kiểm tra hai client không thay cho duyệt art hoặc đo readability sáu người.

## Kiểm chứng

137/137 focused tests (9 files) PASS; project/tools typecheck và client build PASS. Phép đo 3 seed × 2 phase × trước/sau, mỗi mẫu 180s: đứng gần, không auto đánh, HP được phục hồi mỗi tick, xử lý cột sau 1s để đo cooldown thay vì thời gian sống của cột. Cổ Độc 14 → 8, Hỗn Thiên 13 → 8, Vạn Độc Bạo Phát 12 → 7 lần mỗi mẫu. Đây là phép đo tần suất có kiểm soát, không phải clear-time/survival hoặc mô phỏng kinh tế campaign.

Lệnh và bằng chứng browser được ghi sau khi hoàn tất lượt kiểm tra hiện tại; không suy PASS từ lượt cũ. Không quay video/trace. Không chạy toàn bộ pipeline theo yêu cầu chỉ chạy test cần thiết. Bộ test Tây Độc cũ có một assertion 180s của M3D không còn khớp override wave 120s của M4D; giữ nguyên lỗi baseline đó, không sửa lịch wave trong task này.


## Kết quả cuối

155 test liên quan PASS (11 file, tính duy nhất; riêng Nam Đế 22 core + 1 SDK sau sửa envelope), 1 assertion lịch wave M3D được loại khỏi scope như trên. Bốn ca browser đã PASS: mỗi map hai client và ca Vạn Kiếm/QTE Nam Đế. QTE được đo từ tick sealed của server đến `until`, không từ thời điểm driver đọc UI; kết quả đúng 210 tick. Kích thước ô được đọc đồng thời ở frame mở bảng. Tầm 450 được cả hai client xác nhận. VTD Ngũ Hành gây hit cho người ngoài tất cả ô và phase 2 đồng bộ cả hai bên.

[Lệnh, kết quả, giới hạn và lịch sử lỗi tiền đề](evidence/m4d-boss-fixes/verification.json). PNG đã xem: [rồng bay lên](evidence/m4d-boss-fixes/hang-long-rise.png), [luồng chưởng mới](evidence/m4d-boss-fixes/beam.png), [vòng lửa](evidence/m4d-boss-fixes/spiral.png), [bảng QTE](evidence/m4d-boss-fixes/nam-de-qte.png). Đây là xác minh kỹ thuật, không phải final-art approval.

Phiên chơi đã restart trên `milestone/m4d`: client `http://127.0.0.1:5560/?debug=1&m4d=1&fix=boss-review-52`, server 2960. Health/client identity cùng run, M4D/protocol52. Cần tạo phòng mới. Owned process session hiện tại: 36651; không dừng service của checkout/phiên khác.
