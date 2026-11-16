# Ngũ Độc · Preview VFX v01

[Q Ngũ Độc Chưởng và W Độc Sa Chưởng đã có bản v02](../ngu-doc-qw-v02/README.md).

**Tà Hiệp Bích Cổ** và **Cổ Sư Âm Linh** là hai tạo hình được chọn để dựng sprite. Mở `/ngu-doc-preview.html` trên Vite để duyệt trực tiếp trong sân Võ Đang visual-upgrade-2. Đổi tạo hình và mục tiêu bằng nút trong viewport, dùng mũi tên để di chuyển và P/A/Q/W/E/R/T để diễn chiêu. Nút **Đặt lại** đưa nhân vật về vị trí đầu và dọn hiệu ứng.

Bản này dùng sân và các hình nhân kiểm tra Võ Đang có sẵn. Các phân cảnh chỉ chạy trong trang duyệt Phaser. Artwork chờ duyệt trước bước tích hợp vào trận.

## Tà Hiệp · Bích Cổ

| Phím | Diễn biến |
| --- | --- |
| P | Ngũ Độc Tâm Kinh lóe sáng ngắn ở ngực và đưa một vệt lục lên cao, gợi máu tối đa, hồi máu và hồi mana. |
| A | Chưởng thường có dấu bàn tay xanh ngọc bay thẳng. |
| Q | Ngũ Độc Chưởng bật lửa cả hai tay. A đổi sang chưởng viền vàng lục, khi trúng có độc bám và khói thấp báo làm chậm. Bấm Q lần nữa để tắt. |
| W | Độc Sa Chưởng đặt khói vào boss trong tầm, kế đến là creep gần nhất. Đổi mục tiêu sang **Trống** để xem bãi khói đặt trước mặt. |
| E | Âm Tà Hấp Hồn Khí bật/tắt vòng khói theo chân. Đi sát hình nhân để xem dấu độc và làm chậm. |
| R | Vô Hình Độc diễn một đòn đến, giáp lóe, tia độc bật ngược và bám đúng mục tiêu tấn công trong phân cảnh. |
| T | Âm Phong Thực Cốt cho nhiều bàn tay trồi đất, mở rồi bóp vào khoảng không, kèm hạt độc sau đòn. |

## Cổ Sư · Âm Linh

| Phím | Diễn biến |
| --- | --- |
| P | Ngũ Độc Tâm Kinh dùng chung tín hiệu hồi phục. |
| A | Hốc mắt đầu lâu phát đạn lục theo một đường thẳng. |
| Q | Vạn Cổ Thực Thiên phóng bốn sâu cổ thành quạt hẹp về boss hoặc creep, với cụm độc bung khi kết thúc đường bay. |
| W | Yêu Cổ hiện bùa và nâng **1–4 cương thi** lên khỏi khói. Chọn số lượng ở góc trên, cương thi nhảy về phía mục tiêu rồi đánh bằng hai tay duỗi. |
| E | Tâm Hình Cổ bắn trùng huyết để bám lên mục tiêu. Từ lúc bám, đếm ba giây rồi nổ, hiện tín hiệu choáng và luồng lục hút về Cổ Sư. |
| R | Vô Hình Ma Cổ diễn một lần đánh thường kích hoạt **zombie**. Zombie khom người trồi lên, bước tới và vung tay. Bản duyệt gọi zombie khi bấm R để dễ xem lần kích hoạt. |
| T | Thi Quỷ Phong Tận dùng pose quỳ chạm đất, mở ấn và gọi Thần Chết không chân. Thần Chết lướt tới và tự diễn quét hái gây chậm, phóng sóng độc và bổ hái tạo chấn động kèm tín hiệu choáng. |

## Sprite và nguồn chỉnh sửa

- [Aseprite, nguồn raster, thông số cắt và provenance](../../source/ngu-doc-preview-v01) và [PNG/JSON](../../exports/ngu-doc-preview-v01).
- Bích Cổ có 24 cel và Âm Linh có 25 cel. Mỗi hướng có một idle, bốn cel đi giữ nhịp 110 ms và một pose ra chiêu dùng chung theo hướng. T của Âm Linh có thêm pose chạm đất hướng xuống.
- Khung nhân vật là 176×144, chân tại (88,118), idle chính diện cao 88 px. Mỗi nhóm hướng dùng cùng tỷ lệ và xuất giữ alpha bằng Aseprite 1.3.18.6. Mốc 88 px lấy từ Võ Đang visual-upgrade-2.
- Bộ 14 cel minion dùng dáng hướng ngang, lật khi di chuyển sang phía còn lại. Tách 32 cel hiệu ứng khỏi sprite nhân vật. [Prompt và SHA-256](../../source/ngu-doc-preview-v01/manifest.json).
- Chạy `pnpm check:final --config playwright.ngu-doc-preview.config.ts` để dựng và kiểm tra. Trên máy có Chrome cài riêng có thể đặt `VOLAM_REVIEW_CHROMIUM` tới executable của Chrome.

## Ảnh kiểm tra trong Phaser

- [Bích Cổ · giáp, vòng độc và bàn tay trồi đất](bich-co-1366.png)
- [Âm Linh · W Yêu Cổ với bốn cương thi](am-linh-yeu-co-1366.png)
- [Âm Linh · R Vô Hình Ma Cổ với zombie](am-linh-vo-hinh-ma-co-1366.png)
- [Âm Linh · T Thần Chết quét hái](am-linh-thi-quy-1366.png)

Các ảnh được chụp ở canvas và viewport 1366×768, camera 1×. Aseprite đối chiếu pixel của 95 cel, thời lượng và biên với bốn atlas. Qua Chromium, hai tạo hình chuyển khung khi đi bốn hướng rồi về idle. Các bài kiểm tra cũng quan sát các trạng thái bật/tắt, ba cách đặt bãi W của Tà Hiệp, nhóm W của Cổ Sư từ 1 đến 4, lần R gọi zombie, khoảng ba giây giữa trùng bám và nổ, ba đòn Thần Chết và dọn hiệu ứng.

Sau khi build, mở lại trang duyệt bằng lệnh sau.

```powershell
pnpm --filter @volam/game-client exec vite preview --host 127.0.0.1 --port 5536 --strictPort
```


Kết quả cuối của pnpm check:final --config playwright.ngu-doc-preview.config.ts — typecheck và build đạt, 18 kiểm tra workflow, 1073 test unit/integration, 32 validator tài sản và 2 case Chromium. Tổng 249,30 giây.
