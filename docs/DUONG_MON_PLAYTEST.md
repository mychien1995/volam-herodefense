# Đường Môn trong trận M3D

Mở [game ở cổng 5572](http://127.0.0.1:5572/), tạo phòng, bấm Bắt đầu rồi chọn Đường Môn → Cơ Quan hoặc Ám Khí. Bản thử cấp 6 mở đủ Q/W/E/R/T. Cơ Quan dùng điểm thứ sáu cho E2. Ám Khí dùng điểm đó cho R2, nên A có ba mũi. R3 mở từ cấp 5. Mốc R4 là cấp 7; khi đủ bốn bậc, A có năm hướng với Thủy ở giữa.

| Phím | Cơ Quan · Tuần sa | Ám Khí · Dạ hành |
| --- | --- | --- |
| A | Tên cơ quan, đổi thành lông thép khi bay | Một băng châm Thủy ở giữa. Mỗi bậc R thêm một mũi Mộc gây độc, Kim tăng chí mạng, Thổ gây choáng 0,5 giây hoặc Hỏa nổ lan |
| Q | Truy Tâm Tụ Tiễn bắn ba làn song song gây chậm | Địa Diệm Hỏa đặt bẫy chỉ người đặt thấy. Bẫy nổ lan, gây choáng, có ba lượt hồi nối tiếp |
| W | Thiết Dực Hoành Không bật/tắt cánh, tăng tốc và hồi máu, miễn choáng và chậm khi bay. Hao 15 nội lực/giây trước hồi tự nhiên | Cửu Cung Phi Tinh phóng sáu phi đao theo hướng nhìn |
| E | Lưu Tinh Trục Nguyệt tụ 13 tick, phóng tia xuyên mục tiêu, dừng ở tường và làm chậm | Nhiếp Hồn Nguyệt Ảnh lướt và miễn sát thương trong khi lướt và hai giây sau khi dừng |
| R | Thiên Cơ Thiết Dực bọc cánh 2,5 giây, đứng yên, miễn sát thương và tăng hồi máu | Ngũ hành cách thể thuật nâng cấp A qua bậc R |
| T | Mãn Thiên Hoa Vũ rải 20 hoa trong vùng bán kính thử 74–245 đơn vị. Mỗi tâm nổ tính sát thương lan; 11 kim văng ở mỗi tâm là hiệu ứng hình ảnh | Bạo vũ lê hoa châm phóng lần lượt 9 phi đao làm chậm, 90 phi đao độc và 25 băng châm |
| Shift | Hai lượt lướt | Bốn lượt lướt |

Mãn Thiên Hoa Vũ có sát thương cơ bản 36/42/48/54 ở bậc 1–4, cộng 40% sức công tăng thêm so với chỉ số nền của phái. Mỗi vụ nổ dùng gấp đôi sát thương trước làm tròn, phòng thủ và chí mạng.

Cấu hình sát thương, hao nội lực và hồi chiêu dùng [dữ liệu thử](../packages/game-data/src/duong-mon.ts). Server xử lý đạn, va chạm, sát thương, thời gian và vị trí rải hoa. Client sử dụng byte PNG/JSON của [bộ atlas đã duyệt](../assets/reviews/duong-mon-vfx-v2/README.md), vẽ trên đấu trường M3D và giữ mốc chân (120, 200) của cel 240 × 240. Chân dung và icon cắt từ các cel tương ứng.

Để chạy lại, dùng `pnpm build:shared`. Mở hai terminal trong worktree:

- Server PowerShell chạy `$env:PORT='2789'; $env:NODE_ENV='development'; $env:VOLAM_DEV_DUONG_MON='1'; $env:VOLAM_DEV_PRACTICE_CREEPS='1'; pnpm --filter @volam/game-server dev`.
- Client PowerShell chạy `$env:VOLAM_QA_CLIENT_PORT='5572'; $env:VITE_SERVER_URL='http://127.0.0.1:2789'; pnpm --filter @volam/game-client dev`.

Cấp 6 và bia chỉ bật qua biến môi trường development. Bài kiểm tra dùng trận thường với hai trình duyệt và bốn người chơi kết nối SDK. `pnpm check:final --config playwright.duong-mon-game.config.ts` dùng cổng server 2794 và client 5574 khi đặt `VOLAM_QA_SERVER_PORT=2794` và `VOLAM_QA_CLIENT_PORT=5574`.

Ảnh trận sáu người ở 1280 × 720 · [Lưu Tinh Trục Nguyệt](evidence/duong-mon-playtest/tuan-sa-laser.png) · [Mãn Thiên Hoa Vũ](evidence/duong-mon-playtest/tuan-sa-blossom.png) · [Bạo vũ lê hoa châm](evidence/duong-mon-playtest/da-hanh-storm.png). Bản dev đã qua luồng vào trận một người và Playwright trong phòng sáu người. Tám cặp atlas và ảnh bia trong public khớp SHA-256 với bản artwork duyệt.

Kiểm chứng cuối qua `pnpm check:final --config playwright.duong-mon-game.config.ts`. TypeScript, 18 kiểm tra workflow, 1.067 bài unit/integration, build production, validator asset và Playwright trong phòng sáu người đều qua.

## Icon võ công v1

13 icon PNG 64 × 64 xuất từ [atlas ImageGen](../assets/source/skills/duong-mon/icons-v1/source-atlas.png), với [prompt gốc](../assets/source/skills/duong-mon/icons-v1/prompt.txt) và [manifest SHA-256](../assets/exports/skills/duong-mon-icons-v1/manifest.json). Cả hai thanh A/Q/W/E/R/T dùng icon riêng. Tứ tuyệt khí hiện cạnh tên phái trong trận và có icon trong giao diện Võ Công khi chế độ đó được mở. Bản cấp 6 giữ điều khiển nâng bậc O + Q/W/E/R/T. Artwork chờ người dùng duyệt trong game.

Đã kiểm tra đúng URL từng ô, icon nội tại tải được và không có lỗi tải PNG trong phòng sáu người ở 1280 × 720. [HUD Cơ Quan](evidence/duong-mon-playtest/co-quan-hotbar.png) · [HUD Ám Khí](evidence/duong-mon-playtest/am-khi-hotbar.png).

Lượt icon qua `pnpm check:final --config playwright.duong-mon-game.config.ts` với 1.067 bài unit/integration, build, kiểm tra tài sản và Playwright sáu người.
