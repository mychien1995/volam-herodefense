# Vương Trùng Dương trong Phaser

[Mô tả boss đã chốt](VUONG_TRUNG_DUONG_FINAL_DESIGN.md) là nguồn chuẩn. Protocol 30 thêm boss cuối, trạng thái chiến thắng và sprite/VFX sản xuất theo [concept v01 đã duyệt](../assets/concepts/main-bosses/vuong-trung-duong/README.md).

## Cách chơi thử

Chạy từ thư mục gốc dự án trong PowerShell rồi mở URL Vite in ra, mặc định `http://127.0.0.1:5173`. Khởi động lại cả hai dịch vụ cùng phiên bản và tạo phòng mới sau khi nâng protocol.

```powershell
$env:VOLAM_DEV_WAVE_BOSSES = '1'
$env:VOLAM_DEV_FINAL_BOSS = '1'
.\start-game.cmd
```

Chế độ này rút ngắn điều kiện đến boss, giữ thứ tự Đông Tà → Tây Độc → Nam Đế → Bắc Cái → Vương Trùng Dương. Phải tự đánh bại từng boss để mở boss sau. Chế độ thử có chạy nhanh, miễn HP loss thông thường và 5% HP boss mỗi hit trước các giới hạn riêng của trận cuối. Thất Tuyệt vẫn có thể buộc đánh lại lượt. Muốn thử sát thương và tiến trình chuẩn, bỏ hai biến môi trường rồi tạo phòng mới. [Chi tiết chế độ DEV](WAVE_BOSS_TEST_MODE.md)

- **Phase 1.** Dụ ông theo vòng báo sét tím ba lần để phá Cửu Âm Hộ Thể. Né ngang sau khi đường Tam Thanh khóa. Khi Phản Kiếm hút đội vào tâm, dùng các phím mũi tên hiện trên màn hình. Chỉ cần một người sai hoặc hết giờ thì cả đội ăn một nhát mạnh, tối thiểu 1 HP. Ngũ Hành yêu cầu vào ô khắc hành được xướng. Rễ Mộc khóa đi bộ và Shift, vẫn cho đánh và dùng võ công.
- **Phase 2.** Kiếm trắng rơi liên tục và có dấu báo. Dụ nhát Tam Thanh cuối qua Thiên Quyền hình thoi, hoặc dụ tia Nhất Dương Chỉ trúng kiếm cắm đất trong Huyền Vũ. Né hai lượt Chấn Mạch. Khi nghe hoặc thấy Thất Tuyệt, vào đúng vòng ở cuối từng nhịp. Sai nhịp buộc đội đánh lại lượt.

## Thông số đang thử

Boss có 7.900 HP solo, tăng 52% HP gốc mỗi người thêm. Phase 2 mở ở 55%, Thiên Quyền vỡ cho 4 giây đánh tự do. Huyền Vũ dùng ba kiếm, mỗi kiếm rút 1,6% HP tối đa mỗi giây. QTE lỗi chịu 72% HP tối đa trước sàn 1 HP. Thất Tuyệt bắt đầu dưới ngưỡng thử 24% vào nhịp chiêu kế tiếp, dùng bảy nhịp trên sáu vòng. Boss giữ ít nhất 1 HP tới khi Thất Tuyệt hoàn tất. Khoảng nghỉ sau Bắc Cái là 8,5 giây. Phương án thử cho phép boss cuối vào khi còn creep sót, giữ nguyên các creep đó và lịch wave. [Dữ liệu tuning](../packages/game-data/src/vuong-trung-duong.ts)

Máy chủ khóa sân theo cơ chế wave boss hiện có, gọi đội về, giữ nguyên HP tượng trong lúc tượng được bảo vệ và mở lượt thử mới sau wipe. Trạng thái chiến thắng chỉ phát một lần sau khi xác nhận tượng còn sống. Vàng/EXP chia cho người còn sống đã gây sát thương, theo pool cố định. QTE dùng input mũi tên đã được kiểm tra và dữ liệu riêng theo người. Các mốc cảnh báo, va chạm và kết quả do simulation quyết định. Client render snapshot trong sân, với báo hiệu thời tiết, bóng kiếm và kết quả cuối trận trong viewport.

## Artwork

- [Body PNG](../assets/exports/vuong-trung-duong/body.png) và [atlas](../assets/exports/vuong-trung-duong/body.json) có 48 cel raster. Canvas 128×112, pivot chân (64,90), nhìn trái lật cel nhìn phải. Cel hurt, giơ kiếm, chuyển phase và gục dùng góc bên. Bốn cel chuyển phase thể hiện bỏ kiếm và rũ áo.
- [VFX PNG](../assets/exports/vuong-trung-duong/effects.png) và [atlas](../assets/exports/vuong-trung-duong/effects.json) có 36 cel raster. Canvas 160×160, origin (80,80). Các lớp warning, release và fade lấy nhịp từ tick máy chủ.
- [Nguồn, prompt và hash](../assets/source/bosses/vuong-trung-duong/provenance.json), [metadata animation](../assets/exports/vuong-trung-duong/animation.json). Tái xuất bằng `python -X utf8 assets/source/bosses/vuong-trung-duong/export_atlas.py`. Ba concept v01 được kiểm hash trong validator. Art runtime là bản để director xem ở zoom gameplay.
- Trên thiết bị có giọng đọc tiếng Việt, trình duyệt đọc tên hành và nốt. Dấu, chữ và nhịp hiển thị trong sân luôn có ở cả hai trường hợp.

## Kiểm chứng

- `pnpm check:final --config playwright.vuong-trung-duong.config.ts` qua typecheck, build, 18 kiểm tra workflow, 742 test unit/integration và 21 validator asset. Stage browser được thử lại sau khi sửa fixture và bố trí nhãn. Bản build cuối qua 2/2 bài Playwright. Các log pipeline vẫn giữ trạng thái lỗi của các lần chạy ban đầu. [Log pipeline mới nhất](evidence/vuong-trung-duong/final-check-root.log) · [Log trình duyệt bản build cuối](evidence/vuong-trung-duong/browser-final.log)
- Hai client Phaser thấy pha sét, khóa mục tiêu, cú chém Phản Kiếm cả đội sau một phím sai, chuyển phase do đòn A, cả bốn cel rũ áo/bỏ kiếm, Bắc Đẩu và kiếm rơi. Đòn A thứ hai mở Thất Tuyệt sau khi qua ngưỡng thử. Sáu vòng lên hình, rồi việc bỏ nhịp dẫn tới trạng thái đánh lại trên máy chủ. Sáu peer gồm hai trình duyệt và bốn SDK, tất cả gây sát thương lên boss từ đủ 28.440 HP và cùng nhận phase 2. Fixture chỉ chuẩn bị tiến trình, cấp độ, vị trí, hộ thể và HP sát ngưỡng cho một số đoạn. Máy chủ vẫn tính đòn đánh, kết quả QTE và chuyển phase. Đường đi đủ 20 đợt và hạ boss trong trình duyệt chưa nằm trong lượt chạy này. Các kết quả cuối trận và thử lại có test mô phỏng. [Quan sát hai client](evidence/vuong-trung-duong/two-client-frames.json) · [Kết quả sáu peer](evidence/vuong-trung-duong/six-peer.json)
- Probe seed chạy 384 lượt với bốn môn phái, hai nhánh, cấp 1/6/15/30, đội 1/6 và hai phase xuất phát. Có 328 lượt cả đội không sống sót và 0 item. Bot đứng tại chỗ, dùng A/QWER và nhập QTE đúng. Số liệu đo phơi nhiễm khi bỏ qua di chuyển và các trận pháp. [Bảng probe](evidence/vuong-trung-duong/balance.csv) · [Dữ liệu JSON](evidence/vuong-trung-duong/balance.json)

| Phase | Concept đã duyệt | Phaser 1280×720 tại zoom gameplay |
| --- | --- | --- |
| Toàn Chân Kiếm Pháp | [VFX tím và giáp sét](../assets/concepts/main-bosses/vuong-trung-duong/phase-1-vfx-v01.png) | [Sét và giáp trong sân](evidence/vuong-trung-duong/phase-1.png) |
| Tiên Thiên Công | [Kiếm khí vàng ngà và Bắc Đẩu](../assets/concepts/main-bosses/vuong-trung-duong/phase-2-vfx-v01.png) | [Kiếm rơi và Bắc Đẩu](evidence/vuong-trung-duong/phase-2.png) · [Thất Tuyệt](evidence/vuong-trung-duong/that-tuyet-loi-am.png) · [Sáu peer](evidence/vuong-trung-duong/six-peer-phase-2.png) |

Ở zoom gameplay có thể phân biệt đạo bào và tay cầm kiếm với thân cởi trần tay không. Đã tách tên Bắc Đẩu khỏi nhãn Thiên Quyền sau khi thấy hai nhãn chồng nhau ở lần thử đầu. Vòng nhạc đã được xuất lại với alpha sạch. Dòng xướng nhạc nằm trong vùng nhìn được khi camera theo người đứng lệch tâm. Dáng nhìn trái dùng lật ngang, một số tư thế dùng cel nhìn bên. Art trong game và mức sát thương còn chờ director xem ở zoom mặc định.
