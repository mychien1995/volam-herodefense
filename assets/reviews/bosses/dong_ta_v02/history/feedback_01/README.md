# Đông Tà — sprite/VFX demo V03 · feedback 01

**PROTOTYPE · CHỜ DIRECTOR DUYỆT.** Bản feedback 01 ngày 2026-11-02 thay choreography V02. Giữ nguyên concept, sprite và PNG/VFX đã có; không tạo arena riêng, không thêm raster mới, chưa tích hợp boss vào server/gameplay.

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
| Lạc Anh tam giác/vuông/thoi/Z, đường bay và vùng quét rộng hơn | Bốn hình đều rộng hơn rõ rệt và nằm trong sân. Có đoạn mở thế từ tâm tới đỉnh đầu, các vệt hoa ở hai rìa hành lang quét và kiếm khí ở vị trí boss. Không dùng các lớp sóng trắng chồng dày che sân. |
| Ngọc Tiêu rải hoa random, không theo đường | 48 cụm rải bằng điểm ngẫu nhiên có khoảng cách tối thiểu trong sân; không grid, không hàng/cột, không dọc đường. Mỗi cụm có giờ rơi riêng và nổ 2,8s sau. |
| Bạch Cốt Trảo: một trên xuống, một dưới lên, tâm là Mai | Hai đường vuốt đỏ đô ngược chiều đi qua tâm thân Mai; nhân vật render trên các vệt để vẫn nhìn rõ. Dùng lại hai atlas vuốt cũ, đổi hướng/đường chuyển động, không lật nhân vật. |
| Mai bám một mục tiêu, không cần animation khóa | Bỏ mục “khóa mục tiêu” khỏi menu chiêu và bỏ thông báo cast khóa. Sau hồi chiêu, Mai đuổi cùng P1 bằng walk, vào gần thì đánh bằng claw_attack. Chỉ chọn người khác khi mục tiêu đã chết trong fixture QA; không có spell/VFX khóa riêng. |

Triệu Hồn Đông Hải vẫn gọi cả Mai Siêu Phong và Hoàng Dung đúng một lần dưới 40% HP. Hoàng Dung vẫn chỉ có chưởng hồi máu cho Đông Tà/Mai và Linh Xà Bộ. Bọc độc, nổ độc, vùng độc đỏ đô và gió hút của Mai được giữ.

## Thông số thử và phạm vi thực hiện

Tất cả số đo dưới đây là configurable **demo values**, chưa phải combat tuning đã được duyệt:

- Sân nền có đường kính 600×540 ở cùng camera overworld; thêm 24px rìa mỗi phía, chừa 8px chân nhân vật khi giới hạn di chuyển.
- Boss tới tâm sau 3s; hiệu ứng gom đội dùng lại authored summon_column trong 450ms.
- Tà Kiếm 380px / 180°; Đàn Chỉ 8–14 hướng, 680px/s, một burst.
- Lạc Anh rộng 390–550px theo hình, hành lang quét đề xuất rộng 136px. Vệt hai rìa dùng PNG cánh hoa có sẵn; kiếm khí lưu lại được giảm để đọc được đường bay.
- 48 cụm hoa random, cách tâm nhau ít nhất 48px, chờ 2,8s rồi nổ.
- Mai đi 135px/s, vào trong 62px thì dùng normal claw có sẵn. Focus là lựa chọn mục tiêu, không phải cast.

choreography.mjs tách cấu hình/seeded cosmetic geometry khỏi renderer review.js. Vòng viền DOM trong viewport chỉ là chỉ dẫn chức năng cho vùng khóa, không phải asset môi trường/VFX vẽ mới. Không có Phaser Graphics hay PNG nhân vật/VFX mới được tạo.

Đây là **preview cục bộ**: khóa sân, gom đội, chọn mục tiêu và va chạm sát thương của encounter thật vẫn cần được thực hiện bằng server authority khi được yêu cầu tích hợp. Viewer không thay đổi game-core, protocol, AI, collision map, stats, damage, DOT, healing, reward hay invasion scheduler. “Hành lang damage” ở đây là hình trình diễn, không có hit/damage thật.

## Asset và lịch sử

- Giữ nguyên 432 cel nhân vật V01 cùng concept. Giữ nguyên 32 cel thrust/flute và 48 cel VFX V02.
- Thêm tham chiếu tới atlas Cái Bang Chưởng và Thiên Sơn Phiến đã có; không xuất lại hay sửa PNG của hai nhân vật.
- provenance.json giữ hash nguồn/asset; generation_jobs.json và extraction_recipes.json là hồ sơ sản xuất V02.
- history/v02/ giữ viewer/data/brief/báo cáo V02 trước feedback. Evidence V02 gốc ở evidence/ được giữ nguyên.
- feedback_01/evidence/ là screenshot Phaser mới. feedback_01/browser_verification.json và feedback_01/final_check.json là kết quả hiện tại.
- Hai ảnh initial-dash-too-dense.png / initial-claws-obscure-actor.png lưu lỗi visual của vòng lặp đầu; bản hiện tại đã làm rõ đường bay và giữ Mai trên lớp vuốt.
- Không tạo WebM/MP4/GIF hay trace playback.

## Kiểm chứng

python -X utf8 assets/reviews/bosses/dong_ta_v02/verify_assets.py

pnpm check:final --config assets/reviews/bosses/dong_ta_v02/playwright.config.mjs

Browser suite có kiểm hình học theo nhiều seed, quan sát tất cả clip thật qua sự kiện animation/loop/complete của Phaser, sáu sprite mẫu được gom/giữ trong sân, keyboard movement ra mép, visual states của tất cả feedback và hồi quy những chiêu còn lại. Video/trace tắt. Các nhân vật mẫu không phải sáu client multiplayer, không được coi là natural-combat hoặc runtime encounter acceptance.

Kết quả chính xác của lần final hiện tại được ghi riêng sau khi chạy. V02 trước feedback từng PASS 471 unit/integration tests và 159 clip / 628 frame; đó là lịch sử, không thay cho kiểm chứng V03.


## Kết quả final V03 — 2026-11-02

- Static atlas/provenance: PASS, 80 cel V02 giữ nguyên / 20 clip, 13 bundle tham chiếu. Feedback không tạo/sửa raster nhân vật hay VFX.
- check:final: PASS trong 275,44s. Typechecks, 18 workflow regression tests, 471 unit/integration tests, production build, cả 15 asset validators và hai Playwright tests đều qua.
- Live Phaser: quan sát đủ 183 clip / 708 frame; loop/one-shot completions được kiểm qua events. 52 kiểm tra browser qua, gồm keyboard bounds, recall cả 6 người mẫu, 180°/tầm kiếm, radial 8–14, bốn đường lướt, random petals, hai vuốt và passive focus; browser stage 33,97s. Không có page/asset error.
- overview.png / reference_comparison.png trong feedback_01/ ghép từ PNG thực tế; evidence/ chứa full native 1280×720. Đã mở xem lại các ảnh entry, kiếm 180°, bi radial, random petals, lướt thoi, vuốt và six-player reference.
- Visual iteration đã giảm vệt trắng quá dày trên đường lướt, dùng hai rìa cánh hoa để đọc đường, và đặt Mai trên lớp vuốt. Lưu ảnh lỗi ban đầu riêng để đối chiếu.
- Build vẫn có cảnh báo bundle lớn sẵn có. Chưa có art approval, server encounter, real damage hay multiplayer acceptance.
