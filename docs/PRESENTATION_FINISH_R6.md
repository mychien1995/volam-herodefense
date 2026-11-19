# R6 — Hoàn thiện motion và visual depth

Nhánh `wip/m3d/25d`. Phạm vi: client presentation, art nguyên bản và kiểm chứng. Giữ gameplay, server authority, thông số combat, HUD geometry và controls. F8 vẫn so sánh ánh sáng/bóng; avatar/motion mới có ở cả hai trạng thái.

## Kết quả triển khai

- 14 nhánh có idle4 cel/hướng: neutral, chớp mắt, hít vào, thở ra, kèm thay đổi tóc/vải được vẽ thật. Giữ gait tám hướng R5.
- Bổ sung body anticipation/contact/recovery và charge/release cho bốn hướng chéo, bao gồm đòn A và các kỹ năng chủ động. Bốn hướng thẳng giữ động tác riêng đã có; VFX, sockets, hit, damage, cooldown và projectile trajectory không bị thay.
- Pose cơ thể dùng lại theo họ động tác của từng nhánh, không phải một clip art riêng cho từng kỹ năng. Các dạng chaos/flight/shell/evade giữ nguyên bộ art riêng bốn hướng; không thay bằng người thường.
- Clock dựa trên `actionStartedAt/actionUntil` được server phát. Với A tức thời của Thiếu Lâm, dùng duration feedback đã có để trình diễn, không kéo dài action lock. Token/phase mô tả của renderer cũ không được dùng thay clock.
- Thiếu Lâm phân biệt pose quyền/cước theo động tác thật; `right_fist` không lấy pose đá, ba kỹ năng cước dùng pose chân. Đã chạy lại riêng nhánh, thế phụ và forms sau sửa.
- Thu thế ngắn khi về idle; đi lại nhận ngay pose đi, không thêm delay điều khiển. Giữ nội suy vị trí/camera45ms của R5 và các portrait tương ứng đúng nhánh.
- Bỏ readback kiểm tra mép bóng khỏi vòng update. `auditShadows()` kiểm tra pixel trong bước QA riêng. Chó hoang đi qua renderer/budget chung; bóng kéo dài tối đa64 đối tượng động, dành chỗ cho renderer Cái Bang Chưởng cũ khi đang dùng động tác cardinal. Bóng tiếp đất vẫn hiện cho số còn lại. Cache tối đa128 projection/24MiB, light pool16.
- Số sát thương dùng lại texture từ chính rasterizer Phaser Text cũ theo nội dung/style, tối đa256 entry giữ lại. Không đổi font, stroke, màu, số, anchor hay thời gian tween. Chỉ huỷ texture không còn người dùng; dọn tween/image/cache khi rời zone.

## Artwork và provenance

Nguồn mới: `assets/source/hero-finish-v1/`, xuất: `assets/exports/hero-finish-v1/`. Built-in imagegen, tham chiếu14 sprite nguyên bản R5, không chép art bên ngoài. Giữ raw/prompt/hash và bản thử bị loại riêng. Mỗi nhánh có64 cel mới trong sheet8x8, 80 tên frame gồm alias idle cho shadow, một nguồn Aseprite64 frame/16 tag. Tổng896 cel /1120 frame names /14 Aseprite.

Không phải toàn bộ64 cel đều thay renderer cardinal trong runtime: hai idle mới ở8 hướng và sáu pose hành động ở4 hướng chéo được dùng, nhằm giữ choreography cardinal đã có. Các sheet là thư viện pose có thể chỉnh sửa; tag `action_library` không phải timeline sát thương.

Exporter dò gutter alpha thực cả hàng/cột, giữ tỷ lệ đồng nhất và chân(96,158) trên canvas192x176, scale0.5. Bỏ alpha<4 và haze nằm ngoài vùng bảo vệ contour3px, giữ alpha mềm sát viền. Không đổi source đã khoá. `tools/verify-hero-finish.py` kiểm tra độc lập source hash, PNG/JSON, alias,896 cel riêng biệt, toàn bộ mép canvas rỗng, header/hash64 frame Aseprite và byte bản public. Artwork mới là prototype để director xem/chơi, không tự gắn nhãn approved.

## Kiểm chứng

[Summary cuối](evidence/sessions/finish-delivery/summary.json) và [coverage từng lệnh](evidence/sessions/finish-delivery/action-coverage.json) tổng hợp các stage đã chạy, không đổi nhãn pipeline lỗi thành PASS. Các lượt lỗi giữ nguyên; scoped retry chỉ chạy lại stage liên quan. Không ghi video và không chạy lại full combat/balance suite cho thay đổi client/art.

Các slot `ngu_hanh_cach_the_thuat`, `vo_hinh_doc`, `vo_hinh_ma_co` vốn bị động: không tạo cast giả cho phím R. Q Côn Luân Kiếm Tôn được thử sau S đặt Kinh Lôi thật. Event đặt bẫy Đường Môn chỉ gửi cho chính chủ; test quan sát từ owner và kiểm tra peer không nhận event ấy.

## Cách tái kiểm tra

- `python -X utf8 tools/export-hero-finish.py` xuất PNG/JSON và runtime copies; `tools/verify-hero-finish.py` xác minh artefact.
- `pwsh -File tools/export-hero-finish-native.ps1` dựng nguồn Aseprite, đợi GUI batch hoàn tất, xuất PNG để đối chiếu mọi pixel/alpha nhìn thấy và lưu hash/proof. Dùng wrapper có `-Wait` trên Windows để tránh race khi chốt hash.
- `playwright.hero-finish.config.ts`: `VOLAM_FINISH_STAGE=all` cho nhánh + moving combat; `modes` cho F/forms; `scenes` cho dungeon/PvP/boss. `VOLAM_FINISH_PLAYERS=6` cho party; offset/actor filter phục vụ scoped retry. `VOLAM_FINISH_DIST` phải đúng endpoint build, ports và QA run identity.
- Không dùng FPS của sáu cửa sổ cùng render như cam kết mọi máy. Số liệu có provenance và raw samples; phép đo chỉ phản ánh môi trường QA đó.

## Kết quả thực chạy cuối

- TypeScript client/tools, hai production build cô lập (endpoint2968 cho QA,2973 cho phòng chơi): PASS.
- Vitest5 file liên quan:14 test duy nhất PASS (regression pose mới được kiểm tra lại riêng4 test, lưu `shaolin-policy-unit.json`); asset preparation giữ7410 file không đổi và kiểm tra các approved-byte guards. Không chạy full balance/unit suite.
- Sáu client:14 nhánh,112 hướng đi (ít nhất3 cel stride),112 hướng idle (đủ4 cel),14 A có hit/server event và peer HP, avatar và F8: PASS (`finish-motion-final-retry`,2.2 phút test/2.3 phút runner).
- Bốn hướng chéo/nhánh:336 lượt A/slot mặc định gồm324 lệnh chủ động nhận ack và12 lần xác nhận slot bị động không cast. Thêm12 cast của3 chiêu thế phụ qua F. Kinh Lôi đặt bằng S trước Q; bẫy được quan sát đúng từ owner. Bộ Bổng đã thử lại đầy đủ sau khi sửa idle để gậy không co ngắn.
- Bốn dạng chaos/flight/shell/evade, F chuyển thế và số sát thương đúng nội dung/style: PASS. Chaos kết thúc slice bằng fixture cleanup, flight bằng toggle thật, shell/evade hết hạn thật; không coi đây là phép đo đủ mọi frame/chiêu của từng biến thân.
- Tám dungeon: đi và A thật sau chuyển zone, profile sáng/bóng và alpha edge audit; sảnh/spectator Lôi Đài: body idle + ánh sáng. Bảy dạng boss arena: native encounter casts lấy mẫu2.2s/case và kiểm tra pixel viền bóng: PASS. Không nhận là đã chơi hết trận hoặc toàn bộ chiêu mọi boss.
- Đi450 world-unit qua arena,6 client: median16.6ms, p9518.5ms cả OFF/ON;0 khung đứng khựng/đi ngược. Độ lệch vận tốc OFF33.67, ON36.08 (baseline trước sửa109.16/104.61).
- Vừa di chuyển vừa giao chiến,6 client/96 quái: ON median16.8ms,p9526.6ms;27 cast thật nhận ack; tối đa64 bóng động, pool sáng16. Profile và độ nóng cache khác phép đo baseline; không diễn giải thành cam kết FPS cho mọi máy.
-14 Aseprite xuất lại khớp mọi pixel RGB nhìn thấy và alpha với runtime PNG.896 cel,1120 frame names,14 native64 frame; manifest/hash/copy runtime: PASS.

Các retry đã sửa lỗi pose dùng phase mô tả thay clock, A tức thời không có action-lock, tiền đề Kinh Lôi, event bẫy owner-only, identity hero sau PvP và fixture creep native. Lỗi/chạy dở được giữ đúng trạng thái; không sửa gameplay để test qua. Profile pilot R3 được lưu dạng text trong `finish-delivery/historical-r3-profile`, thay bằng các profile R6 còn chạy được. Commit chỉ thu các nguồn/exports, profile hiện hành và evidence cần đối chiếu; các PNG/report thử lỗi cũ vẫn được giữ tại worktree.

## Phòng chơi và PNG

Phòng R6: `http://127.0.0.1:5573/?debug=1`, server2973, Cái Bang Chưởng30,5 kỹ năng rank4, normal cooldown/mana. Launcher `tools/presentation-finish-play.mjs` chỉ seed trong process review riêng; không sửa Room production. Run identity và loadout trong `finish-delivery/play-room.json`.

[Trước — F8 OFF](evidence/sessions/finish-delivery/matched-before.png) · [Sau — F8 ON](evidence/sessions/finish-delivery/matched-after.png). Đây là phase Q thật, scene và tick QA cùng được giữ để hai PNG có cùng actor/HP/mana/camera; [assertion](evidence/sessions/finish-delivery/matched-proof.json). Phòng người dùng riêng vẫn chạy bình thường khi chụp QA.

Nguồn PNG/raw/prompt/Aseprite mới được lưu trong worktree; dùng built-in imagegen. Chưa tự ghi nhận art director approval thay cho người chơi.
