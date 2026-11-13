# Côn Luân trong trận Phaser

## Tích hợp milestone/m3d

Bản protocol 41 kết hợp Côn Luân Hắc Thiết với commit cập nhật phó bản và boss `f4067a54`. Chuẩn bị asset, hai lượt kiểm tra TypeScript, build client và 217 test tập trung trên 10 suite đã qua. Ca Playwright sáu người trên bản build đã qua sau khi đồng bộ phím A và lấy mẫu cel trong cùng cửa sổ Phaser.

## Chỉnh khống chế Côn Luân

- Kiếm Tôn Q tăng 30% sát thương chiêu ở mọi bậc, trước phần cộng từ chỉ số. Q và R choáng 2 giây ở bậc 1. E choáng 1 giây ở lần trúng đầu trên mỗi mục tiêu, đủ năm nhịp sát thương. Cả ba chiêu thêm 0,1 giây choáng mỗi bậc.
- Trận Pháp Năm Kiếm giữ nhịp sát thương, choáng mở và thời lượng 7,5 giây. Địch trong trận bị chậm 60% và khóa lướt, vẫn có thể đi bộ ra khỏi vùng. Áp dụng cả với người vào sau khi trận pháp mở.
- Thiền Sư E giữ mức làm chậm 35% trong 1,5 giây khi vòng sét chạm mục tiêu. W và R làm choáng 2 giây cho địch trong vùng nổ. Thời lượng choáng tuân theo kháng khống chế hiện có.

## Hắc Thiết v04

Bộ 15 icon mới dùng vàng hổ phách cho Thiền Sư và tím sét cho Kiếm Tôn. Hai thức A đầu của Thiền Sư có atlas mới, với cú đâm theo hướng nhân vật và cú quẹt qua hông. Hai thức cuối tiếp tục dùng cel Hắc Thiết đã duyệt. A cận chiến bỏ hồi chiêu, tối đa một lần nhận lệnh mỗi tick server. A tầm xa vẫn hồi một giây.

Điện Quang Lôi Ảnh lướt 132 đơn vị. Trận Pháp Năm Kiếm gây sát thương trong 7,5 giây kể từ khi trận mở, diện tích lớn hơn 20% so với bản trước. Vô Cực Phong Lôi Quyết kéo dài 10/12/14/16 giây theo bậc T, mở ở cấp 6/12/18/24.

[Nguồn và prompt](../assets/source/characters/con_luan_hac_thiet_v04/manifest.json) · [Atlas và kiểm tra](../assets/exports/characters/con_luan_hac_thiet_v04/validation.json) · [Hai thanh chiêu trong Phaser](evidence/sessions/con-luan-hac-thiet-v04/hac-thiet-v04-hotbars.png) · [Cel đâm và quẹt](evidence/sessions/con-luan-hac-thiet-v04/thien-su-melee-cels.png)

Phaser hiển thị đủ 16 cel đâm/quẹt qua bốn hướng trong lượt quan sát solo. Cả 13 icon trên thanh chiêu của hai nhánh, tính cả S của Kiếm Tôn, tải và giải mã ở kích thước 64 × 64 px. TypeScript, build, các trình xác thực asset và 1.026 bài unit/tích hợp đã qua. Ca projectile Cái Bang Chưởng đã qua. Ca trận sáu người đã qua trên cùng bundle sau khi bài test chờ Phaser hiển thị mỗi thức A trước khi bấm thức kế.

## Rà lại chuyển động và chiêu Thiền Sư

Hai nhánh Côn Luân nội suy vị trí hiển thị giữa các bản tin server và dùng tọa độ dưới một pixel cho thân/camera. Phaser đọc đúng thời lượng từng cel trong atlas. Bước đi thường giữ các cel Hắc Thiết đã duyệt.

Thiền Sư Q cộng thử 4 sát thương cơ bản cho A mỗi bậc ở cả hai thế, trước hệ số đòn, giáp và chí mạng. W giữ pose đập búa bốn hướng và phát bốn cel nổ sét tại tọa độ va chạm do server gửi. E dùng atlas vòng sét rộng 600 px ở tỷ lệ hiển thị lớn nhất, giữ diện tích chiến đấu và tăng kích thước mượt giữa các tick. Chaos có cel đứng và chu kỳ bước bốn hướng. Hai hướng ngang dùng cặp đối xứng và các pose thi triển vẫn dùng atlas thân cũ đã duyệt ở tỷ lệ lớn.

[Nguồn, prompt và SHA-256](../assets/source/characters/con_luan_skill_renovation/manifest.json) · [Atlas và kiểm tra pixel/thời lượng](../assets/exports/characters/con_luan_skill_renovation/validation.json)

[W chạm đất](evidence/sessions/con-luan-renovation-runtime/thien-su-w.png) · [Vòng E](evidence/sessions/con-luan-renovation-runtime/thien-su-e.png) · [Dạng Chaos](evidence/sessions/con-luan-renovation-runtime/thien-su-chaos.png)

Trong trận Phaser, lượt quan sát khung hình thu được đủ bốn cel W, bốn cel E và bốn cel của mỗi hướng Chaos. Hai bộ sprite thường đều chuyển vị trí dưới một pixel giữa khung. Build, các trình xác thực asset, 1.021 kiểm thử unit/tích hợp và ca projectile của Cái Bang Chưởng đã qua. Lượt Playwright sáu người chạy lại trên cùng bundle đã qua, gồm hai nhánh Côn Luân và bốn phái cũ.

Bản chơi thử trên `wip/m3d/con-luan` dùng protocol 41. Chọn Côn Luân và một trong hai nhánh ở màn chọn phái. Phím A đánh thường. Q, W, E, R và T dùng năm ô cố định. Kiếm Tôn có thêm S để cắm Kinh Lôi. Từ cấp 6 có thể học T bằng dấu +.

| Nhánh | Q | W | E | R | T |
| --- | --- | --- | --- | --- | --- |
| Thiền Sư | Ngũ Lôi Chính Pháp · đổi thế | Cuồng Lôi Chấn Địa | Ngũ Lôi Chính Pháp · vòng sét | Thiên Lôi Trấn Nhạc | Vô Cực Phong Lôi Quyết |
| Kiếm Tôn | Lôi Động Thiên Địa | Điện Quang Lôi Ảnh | Bạo Lôi Kiếm Canh | Lôi Long Thiên Tường | Trận Pháp Năm Kiếm |

Huyền Thiên Vô Cực Công tăng nhẹ sát thương và hồi nội lực theo cấp. Thiền Sư đánh búa hai tay theo chuỗi đâm, quẹt trái, hất lên và đập nổ sét. Tầm cận chiến 105. Q đổi sang đòn sét giáng vào vị trí mục tiêu server đã chọn, với lan nhẹ và nhịp tối thiểu một giây. Thế cận chiến tăng máu, hồi máu và sát thương. Vòng E rộng hơn 20%.

Kiếm Tôn đánh sáu cầu sét rồi một kiếm sét nổ. S lùi một đoạn ngắn khi cắm kiếm, tối đa ba kiếm, mỗi kiếm tồn tại tối đa 60 giây. Q chỉ kích nổ các kiếm của người dùng. W hồi khi người dùng đi từ ngoài vào vùng kiếm của mình. E đánh năm nhịp trong góc 90°. R phóng đầu rồng theo một hướng đã chốt. T cắm năm kiếm quanh vị trí người chơi lúc bấm, gây sát thương mỗi giây và choáng ở nhịp mở. Các con số sát thương, mana và hồi chiêu đang là thông số chơi thử trong `packages/game-data/src/con-luan.ts`.

Phaser dùng bộ thân Thiền Sư v03 làm nền cho các tư thế đã duyệt. Hai thức A đầu và icon HUD dùng asset Hắc Thiết v04. Kiếm Tôn dùng chung cel thủ quyết mỗi hướng cho các chiêu. Phản ứng trúng đòn và gục dùng cel thân hiện có kèm tint/alpha. Server quyết định sát thương, mục tiêu, thời gian và hiệu ứng trạng thái.

## Chạy thử riêng

Mở [client Côn Luân](http://127.0.0.1:5603/) khi server thử ở cổng 2973. Server development bật `VOLAM_DEV_CON_LUAN=1` để hai nhánh Côn Luân bắt đầu cấp 6 và `VOLAM_DEV_PRACTICE_CREEPS=1` để có creep tập. Các nhánh khác giữ cấp xuất phát bình thường. Máy chủ chạy thường bắt đầu ở cấp 1.

[Atlas và provenance](../assets/source/characters/con_luan_skill_preview/manifest.json) · [Bản duyệt Phaser trước tích hợp](../assets/reviews/con_luan_skill_preview/README.md)

## Kiểm chứng

Đối chiếu năm atlas với PNG/JSON nguồn đã duyệt và bản sao public. Tất cả 221 frame có pixel alpha hữu hình, nằm trong biên atlas. Kiểm tra TypeScript, build, các trình xác thực asset hiện có và 1.019 bài unit/integration đã qua. Bản Phaser cuối qua trận sáu người với hai nhánh Côn Luân và bốn phái cũ, cùng ca Cái Bang Chưởng bắn theo quỹ đạo cố định. [Chaos trong trận](evidence/sessions/con-luan-runtime/thien-su-chaos.png) · [Trận pháp trong trận](evidence/sessions/con-luan-runtime/kiem-ton-tran-phap.png)

Phép đo A cận/tầm xa theo fixture đơn mục tiêu đứng yên dùng 10 nhánh ở cấp 1, 6, 15 và 30, mỗi cấu hình chạy ba seed trong 10 giây. Cấp 6 đạt 75,73 sát thương/giây cho Thiền Sư cận chiến và 61,90 cho Kiếm Tôn, cùng điều kiện với 157,20 của Cái Bang Bổng và 58,90 của Cái Bang Chưởng. Số đo chỉ bao gồm A trong fixture này.

Ca trình duyệt cũ “two clients agree on combat, manual cadence, skills and progression” vẫn dừng ở assertion chữ giới thiệu Long Hồn Thần Thạch trong viewport. Các bước sau assertion trong ca đó chưa được xác nhận.
