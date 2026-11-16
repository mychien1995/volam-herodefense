# Ngũ Độc trong trận M3D

Mở [bản chơi thử ở cổng 5582](http://127.0.0.1:5582/), tạo phòng, bấm **Bắt đầu** và chọn **Ngũ Độc**. Bản development bắt đầu ở cấp 6 với 250 vàng. Bích Cổ có Q bậc 2, Âm Linh có W bậc 2. Cả hai mở đủ năm ô kỹ năng. Mũi tên để di chuyển, **A** đánh thường, **P** mở phó bản và **Space** rời phó bản khi đứng cạnh cửa.

| Phím | Tà Hiệp · Bích Cổ | Cổ Sư · Âm Linh |
| --- | --- | --- |
| A | Phóng chưởng bàn tay xanh | Phóng đạn lục từ đầu trượng |
| Q | Ngũ Độc Chưởng bật/tắt hai ngọn lửa. Khi bật, A đổi chưởng và gây độc, chậm qua đòn trúng | Vạn Cổ Thực Thiên phóng bốn sâu cổ gây sát thương lan. Ưu tiên hướng về boss |
| W | Độc Sa Chưởng thả một bãi khói tròn, ưu tiên boss rồi tới quái trong tầm. Nếu trống, đặt trước mặt | Yêu Cổ gọi 1/2/3/4 cương thi theo bậc. Cương thi ưu tiên mục tiêu Cổ Sư đánh và tồn tại 20 giây |
| E | Âm Tà Hấp Hồn Khí bật/tắt vòng khói theo chân, gây độc và chậm | Tâm Hình Cổ đánh dấu qua đòn trúng. Sau 3 giây, dấu nổ gây sát thương lan, choáng và hồi máu cho Cổ Sư |
| R | Vô Hình Độc tăng phòng thủ, phản độc và làm chậm kẻ đánh trúng. Kỹ năng thụ động và không có VFX riêng | Vô Hình Ma Cổ cho mỗi lần đánh thường hợp lệ 14/18/22/26% cơ hội gọi zombie. Tối đa bốn zombie tồn tại cùng lúc, mỗi con tồn tại 13 giây |
| T | Âm Phong Thực Cốt gọi nhiều bàn tay độc trồi lên, gây sát thương lan và độc theo thời gian | Thi Quỷ Phong Tận kết ấn gọi Thần Chết. Quét hái làm chậm, sóng độc bay thẳng, bổ hái gây choáng và sát thương diện rộng |

Ngũ Độc Tâm Kinh tăng máu tối đa, hồi máu và hồi nội lực theo cấp. Cương thi, zombie và Thần Chết nhận 18% phần tăng từ trang bị của chủ đối với máu tối đa, sức công, phòng thủ, tốc độ di chuyển và tốc độ đánh. Mua hoặc nâng đồ tác động cả minion đang sống và giữ tỷ lệ máu hiện tại của chúng.

Thần Chết tồn tại đến khi bị hạ. Một Cổ Sư có tối đa một Thần Chết đang sống. Thần Chết theo vị trí chủ khi chủ gục và giữ thực thể, HP qua các lần chuyển giữa arena và phó bản. Khi chủ rời khu vực, cương thi và zombie cũ biến mất. Lôi Đài áp dụng vòng đời triệu hồi theo lượt đấu và giữ Thần Chết PvE để trả lại sau trận.

Game dùng PNG/JSON từ [bộ sprite đã chọn](../assets/reviews/ngu-doc-preview-v01/README.md) và [Q/W v02](../assets/reviews/ngu-doc-qw-v02/README.md). Icon và chân dung được cắt từ atlas và lưu [hash nguồn/xuất](../assets/exports/ngu-doc-runtime/manifest.json). Hai nhân vật dùng khung đứng và đi bốn hướng; minion lật ngang atlas. Khung bị đánh/gục của nhân vật dùng biến thể màu/alpha trên khung hiện có. Chỉ số thử nằm trong [dữ liệu chiêu](../packages/game-data/src/ngu-doc.ts) và [thông số độc/triệu hồi](../packages/game-core/src/ngu-doc-ids.ts).

Để chạy lại, dùng pnpm build:shared rồi mở hai terminal ở workspace.

- Server PowerShell chạy `$env:PORT='29221'; $env:NODE_ENV='development'; $env:VOLAM_DEV_NGU_DOC='1'; $env:VOLAM_DEV_PRACTICE_CREEPS='1'; pnpm --filter @volam/game-server dev`.
- Client PowerShell chạy `$env:VOLAM_QA_CLIENT_PORT='5582'; $env:VITE_SERVER_URL='http://127.0.0.1:29221'; pnpm --filter @volam/game-client dev`.
- Kiểm tra riêng dùng `$env:VOLAM_QA_SERVER_PORT='2802'; $env:VOLAM_QA_CLIENT_PORT='5581'; pnpm check:final --config playwright.ngu-doc-game.config.ts`.

Ảnh trong phòng sáu người ở 1280 × 720 · [Bích Cổ và đội triệu hồi ở arena](evidence/ngu-doc-playtest/ngu-doc-arena.png) · [Âm Linh và Thần Chết ở Rừng Trúc](evidence/ngu-doc-playtest/ngu-doc-forest.png).

Mẫu cân sơ bộ ở cấp 1/6/15/30, mỗi cấp chạy seed 42/1207/7777 với bia đứng yên và kỹ năng bậc 1. Giáp và vũ khí cấp 1 tăng HP cương thi từ 86 lên 91, HP Thần Chết từ 290 lên 295 và thêm 0,72 sức công cho mỗi con. Ở cấp 6, tổng sát thương của một cương thi và một Thần Chết trong 10 giây là 573 trước khi mua, 584 sau khi mua. Số này đo riêng tác động của trang bị trong mẫu cố định.

Kiểm chứng cuối trong 277,30 giây. TypeScript, 18 kiểm tra workflow, 1.097 bài unit/integration, build production, toàn bộ validator tài sản và 4 ca Chrome đều đạt. Một ca chạy trận thật với hai Chrome và bốn SDK. Ba ca còn lại kiểm tra các phân cảnh duyệt.
