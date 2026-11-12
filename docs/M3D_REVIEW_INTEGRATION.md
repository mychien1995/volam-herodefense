# Tích hợp M3D review

Art được duyệt từ [preview v1](evidence/sessions/m3d-visual-review-v1/README.md). Hai bảng nguồn được lưu tại `assets/source/m3d-review`. Bộ 33 cel có điểm neo và SHA-256 trong `assets/exports/m3d-review`. Bản sửa sau phản hồi khôi phục sprite Renovation v1 cho 44 creep thường và năm creep hỗ trợ. Creep giữ thân từ atlas này lúc đứng, đi, trúng đòn, choáng và tung chiêu. Tư thế phản ứng và tung chiêu dùng lại cel theo hướng với điểm neo cũ. Thân giữ tỷ lệ gốc lúc tung chiêu để hình raster không bị cắt ngang như khung Trúc Xà quan sát được khi xoay thân. Các clip đánh thường, chết và hiệu ứng chiêu có sẵn tiếp tục dùng atlas đã duyệt.

## Sprite khi ra đòn và khả năng nhìn thấy nhân vật

[Đối chiếu cùng hướng và camera 2×](evidence/sessions/m3d-sprite-comparison/doi-chieu-sprite.png) cho thấy bốn thức A của Bổng và các tư thế đánh/chết của Trúc Xà và Độc Chu đổi sang atlas mật độ thấp. Bản sửa xuất lại bốn thức Bổng, Cắn, bắn tơ và chết từ ảnh nguồn độ phân giải cao. Phun độc dùng tư thế hàm mở của Trúc Xà trên nhịp thi triển riêng. Hiệu ứng độc và tơ dùng atlas đã xuất lại. Phaser vẽ các atlas mới ở scale 0,5 với lọc tuyến tính. [Nguồn và cách xuất](../assets/source/m3d-sprite-continuity/README.md)

Trên mỗi client, thân và thanh sinh lực của creep che trực tiếp nhân vật đang điều khiển được vẽ phía sau nhân vật đó. Tên chiêu đè lên vùng thân được dời lên trên. Cảnh vật tiếp tục che theo chiều sâu trục Y.

Bản này qua `check:final` với 981 test unit/tích hợp, 18 kiểm tra workflow, typecheck, build production, validator asset và hai ca Chromium trong phòng sáu người. Phạm vi browser tập trung Trúc Xà, Độc Chu, Bổng và cảnh thử 120 creep. Client khác giữ thứ tự hiển thị riêng và client của người chơi trở về thứ tự theo trục Y sau khi các creep thôi che. Bảng ảnh dùng 12 khung chụp trong một trận hai client ở camera 2×. [Bảng đối chiếu sau sửa](evidence/sessions/m3d-sprite-continuity/doi-chieu-sau.png) · [Cảnh thử 120 creep](evidence/sessions/m3d-sprite-continuity-final/creep-motion/arena-six-player.png) · [Mốc kiểm tra](evidence/sessions/m3d-sprite-continuity-final/check-workflow/final-timings.json)

## Luật trận

- Bốn cổng mặc định. Một cổng dùng Đông, nhịp mỗi cổng giữ nguyên. Tổng EXP/vàng phân bổ theo số creep thật lên lịch.
- Giữ O + Q/W/E/R/T gọi cùng giao dịch nâng bậc với nút cộng. Đạn thân thiện xuyên bệ tượng khi chọn đích và bay. Va chạm đi/lướt vẫn dùng bệ tượng.
- Bổng chọc, quét, hất, vụt cách tối thiểu 8 tick, không có 15 tick hồi thêm. Vi Đà Quyền gây 51/59/67/75 sát thương cơ bản trước hệ số, phá giáp và choáng 60 tick ở cả bốn bậc, theo quy tắc kháng khống chế của mục tiêu.
- Bắc Minh Thần Công có 4% né ở cấp 1, thêm 0,2 điểm phần trăm mỗi cấp, tối đa cấu hình 10%. Áp dụng cho đòn trực tiếp của địch, sau phản đòn chủ động. Độc, thiêu đốt, bẫy và trừ HP trực tiếp dùng luật riêng.
- Độc Chu bắn tơ gây sát thương và định thân 30 tick khi trúng. Sơn Viên khóa điểm rơi lúc ra chiêu, hòn đá bay thẳng theo tọa độ mặt đất với cung cao trình bày. Khi đến đích, server xét sát thương diện rộng một lần.

## Bẫy và mốc thử

- Rừng Trúc: đạn thẳng luân phiên Tây/Bắc/Đông/Nam, mỗi lần cách 47 tick, choáng 21 tick khi trúng.
- Sa Mạc có bốn hố được server bốc vị trí khi vào phó bản, kể cả khi vào lại cùng instance. Hố tránh điểm vào, cổng ra, vật cản và nhau. Hố giảm tốc 38% và chặn Shift theo vị trí chân nhân vật.
- Biển: khóa vị trí người chơi lúc báo, cột nước bật sau 19 tick, choáng 26 tick nếu còn trong vùng.
- Địa Ngục: ba khe cố định lệch nhau 62 tick, báo trước 18 tick, choáng 26 tick khi phun.

Thời gian báo chiêu đặc biệt của creep còn 2/3, ví dụ 24 → 16 tick và 30 → 20 tick. Khoảng cách giữa các nhịp của cùng chiêu vẫn theo dữ liệu chiêu.

Các mốc thử nằm trong `packages/game-data/src/creep-abilities.ts`. Server phát cue và xử lý khống chế, Phaser đọc cùng tọa độ và mốc tick để vẽ.

## Kiểm chứng

- `node scripts/check-workflow.mjs final --config playwright.creep-upgrade.config.ts tests/e2e/creep-upgrade.spec.ts tests/e2e/m3d-review.spec.ts` với `VOLAM_QA_CREEP_PRODUCTION=1` đã qua typecheck, 18 kiểm tra workflow, 979 test unit/tích hợp, build production và các validator art. Hai ca campaign M3D qua trên hai trình duyệt, gồm phòng sáu người với bốn SDK client. Ca rà creep dừng ở quan sát cùng lúc trạng thái server và frame Phaser. [Mốc kiểm tra](evidence/sessions/m3d-review-final/check-workflow/final-timings.json)
- Lượt browser tiếp theo build lại CSS HUD và ghi cel sau mỗi lần Phaser render. Các lượt rà creep dùng cùng đường server/client của trận campaign. Fixture dựng vị trí, kéo gần thời điểm xâm lăng và bảo vệ tượng trong lúc thử phó bản. Đòn đánh, chiêu, trạng thái và chết của creep thường vẫn do simulation xử lý. Lượt cuối thu đủ các ID còn thiếu sau khi fixture được chỉnh để đợt ngoài đấu trường không kết thúc phòng trong lúc audit.
- [Báo cáo gộp trong trận](evidence/sessions/m3d-review-final/combined-runtime-audit.json) có đủ tám nhánh với đòn A, trúng đòn, slow và stun. Lượt kiểm tra lịch sử trước bản sửa ghi nhận 44 creep thường dùng raster Motion v08 lúc đánh, tung chiêu và chết. Đây là lần hiển thị bị báo regress.
- [Cột nước](evidence/sessions/m3d-review-motion-audit/live-stills/water-column.png) và [cột lửa](evidence/sessions/m3d-review-motion-audit/live-stills/fire-column.png) là PNG từ đúng cel nổ trong canvas Phaser. [HUD sau chỉnh khoảng cách](evidence/sessions/m3d-review-motion-audit/live-stills/skill-upgrade-hint.png) đã được kiểm tra không đè nút nâng bậc. Ảnh Sơn Viên của lượt chụp riêng nằm ngoài góc camera sau khi dời vị trí, nên dùng quan sát atlas/hiệu ứng trong audit cho ca này.

## Rà lại sprite creep và cát lún

- `node scripts/check-workflow.mjs final --config playwright.creep-upgrade.config.ts tests/e2e/creep-upgrade.spec.ts` với `VOLAM_QA_CREEP_PRODUCTION=1` đã qua typecheck, 18 kiểm tra workflow, 980 test unit/tích hợp, build production và kiểm tra asset. Cổng client QA bị chiếm nên bước Chromium được chạy lại trên cùng bản build bằng `node tools/run-playwright.mjs test --config playwright.creep-upgrade.config.ts tests/e2e/creep-upgrade.spec.ts`. [Mốc kiểm tra](evidence/sessions/m3d-creep-restore-verified/check-workflow/final-timings.json)
- Trận Chromium có sáu người, gồm hai trình duyệt và bốn client SDK. Các kiểm tra trong trận qua và xuất báo cáo trước khi runner hết thời gian chờ đóng kết nối. Sau khi tắt tự kết nối lại của client SDK lúc đóng phòng thử, lượt chạy tập trung Tiểu Hỏa Quỷ và Trúc Xà qua cả bước đóng kết nối. Quan sát 44 creep đứng, đánh thường, trúng đòn và chết. Có 39 creep thi triển chiêu đặc biệt. Tiểu Hỏa Quỷ nhận đòn trước rồi tự bạo thật. Trúc Xà báo chiêu 16 tick và giữ atlas Renovation v1 qua các cel chuẩn bị và nhả độc. [Báo cáo cel](evidence/sessions/m3d-creep-restore-all/creep-motion/browser.json) · [Lượt chạy tập trung](evidence/sessions/m3d-creep-restore-cleanup/creep-motion/browser.json) · [Ảnh Trúc Xà nhả độc](evidence/sessions/m3d-creep-restore-all/creep-motion/forest-venom-cast.png)
- Hai ca campaign trong lượt trước kiểm tra tám nhánh và năm creep hỗ trợ. Vào lại Sa Mạc có đủ bốn hố ở tọa độ mới. Shift được server nhận khi nhân vật đứng trong hố và không tiêu hao lượt lướt. [Báo cáo sáu nhánh](evidence/sessions/m3d-creep-restore-final/review/six-branches.json) · [Báo cáo hai nhánh và bẫy](evidence/sessions/m3d-creep-restore-final/review/two-branches-traps.json) · [Ảnh hố cát](evidence/sessions/m3d-creep-restore-final/review/desert-quicksand.png)
