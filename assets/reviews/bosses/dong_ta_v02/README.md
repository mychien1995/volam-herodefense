# Đông Tà — sprite/VFX demo V04 · feedback 02

**DIRECTOR ĐÃ DUYỆT THIẾT KẾ V04 · 2026-11-02.** Bản feedback 02 ngày 2026-11-02 thay choreography V03 ở ba điểm: vuốt phía trước, ít hoa hơn và bốn hướng chém +/X. Giữ nguyên concept, sprite và PNG/VFX đã có; không tạo arena riêng, không thêm raster mới, chưa tích hợp boss vào server/gameplay.

## Approval và prompt tích hợp

Người dùng đã duyệt sprite/VFX và choreography V04 để làm đầu vào tích hợp. Canonical record: `director_approval.json`; exact-byte lock: `assets/approved_dong_ta.lock.json`; prompt: `docs/INTEGRATE_DONG_TA_PROMPT.md`. Chạy `python -X utf8 assets/reviews/bosses/dong_ta_v02/verify_approval.py` để kiểm tra. Các nhãn pending ở viewer/export/report lịch sử mô tả thời điểm kiểm chứng, không ghi đè approval mới.

Luật bổ sung đã chốt: tượng tạm bất tử trong encounter, wave vẫn mỗi 180 giây; gom và hồi sinh ngay toàn bộ người chơi kể cả dungeon/PvP; Đông Tà chết thì clear và dọn Mai/Hoàng; cả đội chết thì reset boss để retry không giới hạn đến khi thắng hoặc quit. Gameplay/server integration, final runtime art và combat balance vẫn chưa hoàn thành/chưa duyệt.

## Tích hợp gameplay sau approval

Người dùng đã yêu cầu thực hiện prompt; trạng thái và kiểm chứng runtime hiện hành nằm ở `docs/DONG_TA_INTEGRATION.md`. Viewer này vẫn là preview lịch sử, không phải encounter server. Canonical approval/PNG/hash được giữ nguyên; final runtime art và balance vẫn chờ duyệt riêng.

## Xem demo

Từ repository:

python assets/reviews/bosses/dong_ta_v02/serve.py 5427

Mở http://127.0.0.1:5427/assets/reviews/bosses/dong_ta_v02/

Chọn từng chiêu ở menu dưới; Tuỳ chỉnh có bốn hướng, 1/2/3/6 nhân vật mẫu, đường lướt, tốc độ và zoom. ↑↓←→ di chuyển P1; A/Q/W/E/R thử chiêu Đông Tà; Space dừng/chạy; ‹/› và thanh tua để xem từng pha; H ẩn công cụ. Toàn bộ điều khiển nằm trong viewport, không thu nhỏ map.

## Feedback đã áp dụng

| Yêu cầu | Demo hiện tại |
|---|---|
| Boss vào từ phía đông, giữa đường, tới giữa arena | Dùng courtCenter (800,616) từ assets/arena_v2.manifest.json, trừ camera offset (160,240) thành (640,376). Boss đi thẳng trên trục giữa đường y=376 và dừng đúng tâm. |
| Tạm ẩn tượng, triệu hồi cả đội, khóa sân tròn + chút rìa | Khi tới tâm, ẩn sprite tượng thật, gom toàn bộ số người mẫu đang chọn vào sân, hiện ranh giới trong viewport và chặn cả bước đi thẳng/chéo ra ngoài. Về chế độ Sprite hoặc tua về trước lúc boss đến sẽ hiện lại tượng/mở vùng. |
| Tà Kiếm xa và rộng 180°, trúng Chưởng/Phiến | 13 nhịp đâm trải đủ π rad phía trước, tầm thử 380px. Đối chiếu tầm hiện tại 320px của Cái Bang Chưởng và 220px của Thiên Sơn Phiến. Hai sprite trường phái đã có được dùng làm mốc. |
| Đàn Chỉ nhiều hướng xung quanh, random 8–14 hướng | Mỗi lần thử chọn 8–14 hướng phủ 360° với góc xoay ngẫu nhiên; một viên bi mỗi hướng trong một đợt nhanh. Thay hoàn toàn cách bắn 5 viên cùng hướng của V02. Sau khi phóng, bi bay thẳng. |
| Lạc Anh W chém bốn hướng, chữ thập/chữ X random | Boss xuất kiếm tại chỗ; bốn nhát chém hoa đào tỏa cùng lúc theo trục + hoặc chéo X, chọn ngẫu nhiên mỗi lần thử. Hai hình có thể chọn riêng trong Tuỳ chỉnh. Đánh thường hình quạt không đổi. Không còn đường lướt đa giác. |
| Ngọc Tiêu rải hoa random, không theo đường | 40 cụm (giảm từ 48, khoảng 17%) rải bằng điểm ngẫu nhiên có khoảng cách tối thiểu trong sân; không grid, không hàng/cột, không dọc đường. Mỗi cụm có giờ rơi riêng và nổ 2,8s sau. |
| Bạch Cốt Trảo đánh phía trước, chạm người phía trước | Hai đường vuốt ngược chiều nằm trong vùng trước hướng mặt Mai. Vùng chạm demo quay theo trái/phải/lên/xuống, loại người đứng sau/lệch ngoài tầm. P1 được đặt trước và P2 sau để đối chiếu, người chạm có tint nhẹ, không hiển thị damage/HP giả. Nhân vật vẽ trên lớp vuốt để nhìn rõ contact. |
| Mai bám một mục tiêu, không cần animation khóa | Bỏ mục “khóa mục tiêu” khỏi menu chiêu và bỏ thông báo cast khóa. Sau hồi chiêu, Mai đuổi cùng P1 bằng walk, vào gần thì đánh bằng claw_attack. Chỉ chọn người khác khi mục tiêu đã chết trong fixture QA; không có spell/VFX khóa riêng. |

Triệu Hồn Đông Hải vẫn gọi cả Mai Siêu Phong và Hoàng Dung đúng một lần dưới 40% HP. Hoàng Dung vẫn chỉ có chưởng hồi máu cho Đông Tà/Mai và Linh Xà Bộ. Bọc độc, nổ độc, vùng độc đỏ đô và gió hút của Mai được giữ.

## Thông số thử và phạm vi thực hiện

Tất cả số đo dưới đây là configurable **demo values**, chưa phải combat tuning đã được duyệt:

- Sân nền có đường kính 600×540 ở cùng camera overworld; thêm 24px rìa mỗi phía, chừa 8px chân nhân vật khi giới hạn di chuyển.
- Boss tới tâm sau 3s; hiệu ứng gom đội dùng lại authored summon_column trong 450ms.
- Tà Kiếm 380px / 180°; Đàn Chỉ 8–14 hướng, 680px/s, một burst.
- Lạc Anh W chọn ngẫu nhiên +/X, đúng bốn hướng vuông góc; nhát chém tỏa tới 280px trong 500ms. Không di chuyển boss theo đường cũ.
- 40 cụm hoa random, cách tâm nhau ít nhất 48px, chờ 2,8s rồi nổ.
- Mai đi 135px/s, vào trong 62px thì đánh. Hai đường vuốt có tâm cách thân 58px về phía trước; vùng chạm minh họa dài 112px, nửa rộng 56px. Đây chỉ là preview contact, không gây sát thương server. Focus vẫn là lựa chọn mục tiêu, không phải cast.

choreography.mjs tách cấu hình/seeded cosmetic geometry khỏi renderer review.js. Vòng viền DOM trong viewport chỉ là chỉ dẫn chức năng cho vùng khóa, không phải asset môi trường/VFX vẽ mới. Không có Phaser Graphics hay PNG nhân vật/VFX mới được tạo.

Đây là **preview cục bộ**: khóa sân, gom đội, chọn mục tiêu và va chạm sát thương của encounter thật vẫn cần được thực hiện bằng server authority khi được yêu cầu tích hợp. Viewer không thay đổi game-core, protocol, AI, collision map, stats, damage, DOT, healing, reward hay invasion scheduler. Vùng chạm và vệt chém ở đây chỉ dùng trình diễn, không có hit/damage server.

## Asset và lịch sử

- Giữ nguyên 432 cel nhân vật V01 cùng concept. Giữ nguyên 32 cel thrust/flute và 48 cel VFX V02.
- Thêm tham chiếu tới atlas Cái Bang Chưởng và Thiên Sơn Phiến đã có; không xuất lại hay sửa PNG của hai nhân vật.
- provenance.json giữ hash nguồn/asset; generation_jobs.json và extraction_recipes.json là hồ sơ sản xuất V02.
- history/v02/ giữ viewer/data/brief/báo cáo V02 trước feedback. Evidence V02 gốc ở evidence/ được giữ nguyên.
- history/feedback_01/ giữ mã/brief trước thay đổi; feedback_01/ và ảnh cũ được giữ nguyên. feedback_02/evidence/, feedback_02/browser_verification.json và feedback_02/final_check.json là kết quả hiện tại.
- Hai ảnh initial-dash-too-dense.png / initial-claws-obscure-actor.png lưu lỗi visual của vòng lặp đầu; bản hiện tại đã làm rõ đường bay và giữ Mai trên lớp vuốt.
- Không tạo WebM/MP4/GIF hay trace playback.

## Kiểm chứng

python -X utf8 assets/reviews/bosses/dong_ta_v02/verify_assets.py

pnpm check:final --config assets/reviews/bosses/dong_ta_v02/playwright.config.mjs

Browser suite có kiểm hình học theo nhiều seed, quan sát tất cả clip thật qua sự kiện animation/loop/complete của Phaser, sáu sprite mẫu được gom/giữ trong sân, keyboard movement ra mép, contact vuốt trước/sau ở cả bốn hướng, hai hình +/X ngẫu nhiên, 40 cụm hoa và visual states của tất cả feedback và hồi quy những chiêu còn lại. Video/trace tắt. Các nhân vật mẫu không phải sáu client multiplayer, không được coi là natural-combat hoặc runtime encounter acceptance.

Kết quả chính xác của lần final hiện tại được ghi riêng sau khi chạy. V03 trước feedback từng PASS 471 unit/integration tests và 52 browser checks; đó là lịch sử, không thay cho kiểm chứng V04.



## Kết quả final V04 — 2026-11-02

- check:final: PASS trong 211,04s. Typechecks, 18 workflow regressions, 471 unit/integration tests, production build, cả 15 asset validators và hai Playwright tests đều qua.
- Live Phaser PASS: 183 clip / 708 frame được quan sát bằng animation events và loop/completion; 55 kiểm tra browser. Không có page/asset error; video/trace tắt.
- Kiểm cả bốn hướng Mai: P1 trước mặt nhận contact/tint demo, P2 sau lưng không nhận. VFX nằm trước và dưới lớp nhân vật để vẫn nhìn rõ người bị chạm. Tint là phản hồi minh họa, không HP/damage thật.
- Kiểm cả + và X, đúng bốn hướng, boss không còn lướt theo đường đa giác; nhiều lần random sinh cả hai mẫu. Ngọc Tiêu có đúng 40 cụm random và giữ nổ trễ.
- Đã mở và xem PNG runtime của hai hình chém, vuốt trước mặt, hoa random. feedback_02/overview.png là bảng ghép các screenshot; evidence/ giữ ảnh native 1280×720. mai-front-detail-2x.png chỉ là crop phóng nearest từ screenshot native, không phải art mới.
- Đối chiếu concept/Phaser/anti-reference ở feedback_02/reference_comparison.png. Không thay PNG/atlas nhân vật hoặc VFX. Chưa có art approval hoặc server encounter acceptance.
