# Boss VFX feedback preview v02

**APPROVED PREVIEW VFX — đã tích hợp protocol28.** Đây vẫn là trang duyệt độc lập. Lock duyệt: `assets/approved_wave_boss_feedback_v02.lock.json`; ledger/runtime/evidence mới: `docs/WAVE_BOSS_FEEDBACK_V02_RUNTIME.md`. Manifest và các kết quả preview dưới đây là lịch sử trước tích hợp.

Mở **http://127.0.0.1:5461/**. Khởi chạy: `node assets/reviews/wave_boss_feedback_v02/server.mjs`. Server chỉ đọc art và phục vụ Phaser4.2.1 đang cài; không tạo phòng/game server, không có lệnh gây sát thương. Bản v01 và các source đã duyệt giữ nguyên byte.

Chọn Boss → Chiêu. Timeline, Space dừng/phát, nút tiến/lùi frame, R chạy lại/đổi random, H ẩn HUD. Mũi tên đi bộ, Shift thử lướt. Tùy chỉnh có bốn hướng,1/2/6người mẫu, camera, tốc độ, số tia1–5 và P1 tự đi/tự điều khiển. Bấm mũi tên sẽ nhận quyền điều khiển P1. Người mẫu và vùng gây sát thương đều là minh họa, không phải client multiplayer hay kết quả server.

Giữ đúng chính sách zoom của client: logical640×360 trên1280×720,960×540 trên1920×1080, camera zoom1/display scale2. Không thu map để chứa UI. Trên màn hình nhỏ, một phần arena/VFX có thể ngoài khung như gameplay; chọn camera tâm hoặc đi bộ để xem. Toàn bộ điều khiển là overlay trong viewport.

## Nội dung đã chốt cho preview

- Chữ nổi tên chiêu trên đầu boss khi ra chiêu đặc biệt; đòn thường im lặng. Có actor/cast thật của Lý Mạc Sầu, Hồng Liệt, Chu Bá Thông và Kim Luân để minh họa cùng quy tắc chữ hô. Các ví dụ phó bản không phát lại toàn bộ bộ skill.
- Bạch Cốt Trảo: hai trảo đối nhau, quét xa ra trước tới200px, trên xuống/dưới lên. Giữ raster0,9scale; tăng đường đi thay vì phóng to sprite.
- Mai: bắt đầu kéo ở0,40s, giật sát trong0,15s; xong kéo ở0,55s. Ma Ảnh đầu tiên ở1,35s, **đúng0,80s** để đi bộ né. Shift khóa0,40–5,40s (**5s**). Đường báo đầu tiên chốt sau kéo, loạt Ma Ảnh bay thẳng theo hướng đó. Thay đổi này chưa áp dụng vào server.
- Tây Độc: sáu cọc viền, mỗi cọc ba hướng vào tâm, không bắn tám hướng quay ra ngoài. Đạn cọc rắn mới50×18px; độc khí thường mới60×26px. Cáp Mô giảm bán kính405→364,5px, cả cảnh báo/viền nổ/mảnh văng cùng giảm10%.
- Tiểu Nhất Dương Chỉ: projectile vàng mới64×20px, ngẫu nhiên1–5tia cách0,16s; từng tia lấy vị trí P1 tại lần phóng của chính nó rồi bay thẳng. Mục tiêu tự đi giúp thấy loạt tia đổi hướng; chọn5tia để đối chiếu.
- Liên Hoàn: mẫu tốc độ xoay×1,5, vẫn bốn hướng/16loạt, thời gian một vòng12,8→8,53s; nhịp quét tương ứng nhanh hơn.
- Phật Quang Phổ Chiếu: Nam Đế chỉ vẫy tay một lần, không có tia nối từ boss tới người chơi và không tụ sáng ở tay; cột sáng/bụi vàng giữ trên người được chọn. Không đổi heal/status/sát thương server.
- Nhất Dương Quy Tông: Nam Đế lướt về tâm,96tia từ trên giáng xuống ở nhịp18tia/giây, mật độ gấp ba trong cùng thời lượng cũ; tất cả footprint nằm trong arena. Điểm đã báo giữ nguyên.
- Bắc Cái: thoại mới **“Ai còn nhớ lời lão phu?”**. Mục Hạ Vô Nhân chỉ hô tên lúc mở chiêu, không chèn thoại sở thích khi thi triển.
- Thiên Hạ Vô Cẩu: Bắc Cái gốc +8phân thân đều vừa xoay vừa di chuyển ngẫu nhiên riêng trong arena; từng người đổi điểm đến và hướng đi độc lập, cả9vùng sát thương đi theo từng người. Chín vùng sát thương minh họa độc lập; **bỏ toàn bộ hút/slow/slam cũ**, Shift luôn dùng được.
- Chuyển Nam Đế→Bắc Cái: minh họa xác tan hết trước boss kế tiếp vào. Lỗi cleanup trong trận thật được ghi nhận để sửa sau khi duyệt, không gọi là đã sửa server.

## Art và provenance

Built-in `image_gen` tạo mới bốn family raster: `snake_bolt`, `poison_bolt`, `gold_bolt`, `spotlight`. Prompt chính xác ở `source/prompts.json`; PNG gốc ở `source/`. Export16cel/4atlas bằng crop chung và downscale chung mỗi family, giữ alpha, không fit riêng từng frame và không vẽ đè pixel bằng script. Không có source Aseprite phân lớp; không sử dụng sprite pack bên ngoài hay art Star Wars. Tia vàng chỉ lấy ý tưởng loại chuyển động blaster theo yêu cầu.

`manifest.json` ghi source/export hashes, kích thước, pivot, protected art và baseline177file production. `verify_assets.py` kiểm tra frame/alpha/durations/bounds/pixel equality và byte giữ nguyên. Art giữ lại tiếp tục theo provenance/approval cũ; art mới chưa được duyệt. Cáp Mô vẫn dùng bốn cel core có sẵn + mảnh độc + một rim lớn fade; không gọi là bốn cel nổ mới.

## Kiểm tra

- `python -X utf8 assets/reviews/wave_boss_feedback_v02/verify_assets.py`
- `pnpm check:quick tests/wave-boss-vfx-preview-v02.test.ts`
- `pnpm check:final --config playwright.wave-vfx-preview-v02.config.ts`

Browser check dùng server riêng5462, xác minh PID sở hữu, giữ video/trace tắt. Kiểm tra frame chuyển động đủ16cel mới, tên chiêu, ba hướng vào sân, từng lần ngắm, khóa/mở Shift, đi bộ trong cửa né,9người xoay và6người mẫu ở zoom gameplay. Không có websocket/phòng/server damage và không tạo recording. PNG và báo cáo thật nằm ở `evidence/`; thành công tự động không thay quyết định duyệt art.

API tham khảo theo bản Phaser cài sẵn: [Image](https://docs.phaser.io/phaser/concepts/gameobjects/image), [Text](https://docs.phaser.io/phaser/concepts/gameobjects/text), [Texture](https://www.phaser.io/oss/docs/api-documentation/class/textures-texture). Filter đặt một lần trên mỗi texture; renderer lấy mẫu raster theo timeline.

## Kết quả baseline trước chỉnh chuyển động (lịch sử)

**PASS qua các stage retry.** `check:final` qua preparation/typechecks/18workflow checks và701test; dừng vì cổng2798 của test Chu Bá Thông đang được dùng. Cùng test đó được chạy bằng bản sao tạm chỉ đổi2798→2938:1passed, file gốc giữ nguyên hash, bản sao đã xóa và dịch vụ2798 không bị chạm. Tổng coverage riêng biệt702case;9case mới cho preview đều passed. Báo cáo FAIL ban đầu được giữ nguyên, không đổi nhãn thành PASS.

Đã chạy tiếp production build,20validator asset, validator mới43bundle/1977frame references/16cel mới/270file giữ nguyên và browser profile cuối: **1passed,12,3s**. Browser thật quan sát đủ16cel mới, mốc0,8s/5s, phím thật, shot aims,9spinner và6người mẫu ở gameplay scale, không websocket/lỗi client/recording. PNG đã mở kiểm tra thật. Source gameplay177file và93art/metadata giữ nguyên. Chi tiết: `evidence/final-validation.json`, `evidence/verification.json`, `evidence/asset-verification.json`; prompt ở `source/prompts.json`.

Preview hiện đang phục vụ trên5461 để duyệt. Mọi thay đổi cơ chế/chữ hô/cleanup trong game chính vẫn chờ lượt tích hợp sau khi duyệt art.

## Feedback chuyển động 2026-11-03 (lịch sử: tám phân thân đi vòng)

Tăng tia giáng32→96, giữ tổng thời lượng; thay tụ chỉ bằng động tác vẫy tay và bỏ tia nối; tám phân thân vừa xoay vừa đi vòng, boss gốc giữ tâm. Ba regression mới đã được chạy trước sửa và đều thất bại đúng lý do, sau sửa12/12test model đã passed. Kết quả cuối của lượt chỉnh này được lưu riêng tại `evidence/moving-clones-feedback-verification.json`. PNG trước sửa nằm ở `evidence/before-moving-clones/`.

Lượt chỉnh này:705case unit/integration riêng biệt passed qua retry cổng (bản full gốc704passed/1skipped vẫn giữ FAIL);18workflow checks và hai typecheck passed. Production build14,44s,20validator, validator preview270file và browser1passed/15,8s. Browser quan sát chuyển động thật >35px của phân thân trong lúc phát,96điểm rơi, ít nhất7tia giáng cùng lúc, gesture vẫy tay, không tia nối. Ba PNG hiện tại đã mở kiểm tra; không tạo recording và không sửa gameplay.

## Sửa theo chốt cả chín người đi ngẫu nhiên

Bắc Cái gốc cũng di chuyển ngay khi bắt đầu xoay, cùng8phân thân; mỗi người chọn điểm đến riêng, di chuyển145px/s và đổi hướng khi tới nơi. Không giữ boss tại tâm và không dùng quỹ đạo tròn. Mọi đường đi và vùng sát thương nằm trong arena; replay/tua giữ đúng seed, R đổi random. Nhãn chiêu đổi thành “9 người xoay và di chuyển”. Chỉ preview; art và gameplay production giữ nguyên. Kết quả lượt này: `evidence/nine-random-verification.json`. Lịch sử trước sửa: `evidence/before-nine-random/`.

Kiểm tra thực chạy:13/13test model;18workflow checks và typecheck passed. Full ban đầu705passed/1skipped dừng do cổng2798 bận; test Chu chạy lại cổng2938 passed, file gốc/dịch vụ cũ nguyên trạng. Tổng706case riêng biệt. Build23,39s,20validator asset và browser1passed/19,3s. Browser đo cả9người dịch chuyển71,8–73,2worldpx trong lúc xoay;9vùng sát thương theo actor. PNG đã mở kiểm tra; không recording hoặc websocket. Chi tiết ở `evidence/nine-random-verification.json`.
