# Ngũ Độc — Concept tạo hình và hiệu ứng

Sáu phương án nhân vật, ba minion và hai bảng phân cảnh hiệu ứng cho Võ Lâm Hero Defense. Tạo hình dùng vải dệt lớp, hoa văn hình học và phụ kiện kim loại, lấy cảm hứng từ trang phục các cộng đồng dân tộc thiểu số ở Tây Nam Trung Quốc trong một bối cảnh võ hiệp hư cấu. Xanh lá là màu chủ đạo. Tà Hiệp để trống hai tay, Cổ Sư mang trượng đầu lâu.

| Hệ phái | Mẫu | Dấu hiệu nhận diện |
| --- | --- | --- |
| Tà Hiệp | [01 · Thanh Xà](01-ta-hiep-thanh-xa.png) | Áo xanh ngọc, bím tóc dài, lược bạc và khóa đai hình rắn. Dáng mở với một chưởng vươn trước. |
| Tà Hiệp | [02 · Sơn Diệp](02-ta-hiep-son-diep.png) | Xanh rêu, khăn dệt vàng lệch vai, tóc búi cao. Thế trụ rộng để đọc hai bàn tay đang cháy độc. |
| Tà Hiệp | [03 · Bích Cổ](03-ta-hiep-bich-co.png) | Xanh thông, cổ tay viền ngọc, hai vòng bím và phụ kiện đồng. Tay áo rộng tạo dáng đối xứng khi vận chưởng. |
| Cổ Sư | [04 · Lục Cốt](04-co-su-luc-cot.png) | Nón dệt cao, áo xanh rừng, trượng sọ thú bằng gỗ. Dáng nón và mõm sọ vẫn rõ khi thu nhỏ. |
| Cổ Sư | [05 · Sơn Vu](05-co-su-son-vu.png) | Pháp sư lớn tuổi, râu tết xám, áo choàng vai rộng xanh rêu và trượng gỗ treo chuông đồng. |
| Cổ Sư | [06 · Âm Linh](06-co-su-am-linh.png) | Mũ trùm xanh đậm, áo vạt dài và đầu lâu treo trong khung đồng cong. |

## Tạo hình đã chọn

**Bích Cổ** cho Tà Hiệp và **Âm Linh** cho Cổ Sư. Cổ Sư dùng **W · Yêu Cổ** để gọi **1–4 cương thi** và **R · Vô Hình Ma Cổ** để có xác suất gọi **zombie** khi đánh thường. Bảng hiệu ứng Cổ Sư bên dưới lưu bản concept ban đầu. [Phân cảnh hiện hành trong preview Phaser](../../../reviews/ngu-doc-preview-v01/README.md).

## Nội tại chung

**Ngũ Độc Tâm Kinh** tăng máu tối đa, tốc độ hồi máu và tốc độ hồi mana. Ô **P** phác một nhịp sáng xanh ở ngực và vài hạt sáng đi lên để gợi hồi phục cho cả hai hệ. Dùng ánh sáng ngắn và gọn để trạng thái tay cháy, vòng độc và giáp vẫn dễ đọc.

## Ngũ Độc Tà Hiệp

[Bảng hiệu ứng Tà Hiệp](08-ta-hiep-vfx.png) dùng Sơn Diệp để diễn chiêu.

| Ô | Chiêu | Phân cảnh |
| --- | --- | --- |
| A | Đánh thường | Đẩy một chưởng bàn tay xanh ngọc theo đường thẳng, năm ngón rõ và vệt đuôi gọn. |
| Q | Ngũ Độc Chưởng | Khi tắt, hai tay trống và dùng chưởng thường. Khi bật, lửa xanh bám cả hai tay và chưởng có lõi xanh sẫm, viền vàng lục. Khi trúng, đốm độc bám mục tiêu và vệt khói sát chân báo làm chậm nhẹ. |
| W và W ALT | Độc Sa Chưởng | Khói xanh rêu đọng thấp trên nền và nhả từng nhịp độc trong thời gian tồn tại. Tâm bãi đặt vào boss trong tầm nếu có, bằng không chọn mục tiêu gần nhất trong tầm. Ô W ALT minh họa trường hợp không có mục tiêu trong tầm, khói xuất hiện phía trước mặt. |
| E | Âm Tà Hấp Hồn Khí | Khi bật, các dải khói quay thành vòng elip quanh chân Tà Hiệp. Vòng di chuyển cùng nhân vật, giữ phần giữa thoáng. Địch trong vùng có đốm độc và khói bám chân để đọc đốt độc và làm chậm liên tục. |
| R | Vô Hình Độc | Giáp ngọc mỏng ôm ngực và vai biểu thị lớp phòng thủ nhẹ. Khi bị đánh, giáp lóe tại điểm chạm và một tia độc phản về đúng kẻ tấn công, để lại đốm độc và khói chậm sát chân. |
| T | Âm Phong Thực Cốt | Nền nứt thành cụm, nhiều bàn tay độc trồi lên rồi co ngón bóp vào khoảng không. Nhịp bóp biểu thị sát thương diện rộng, bụi độc lưu lại trên mục tiêu. |

## Ngũ Độc Cổ Sư · bản concept ban đầu

[Bảng hiệu ứng Cổ Sư](09-co-su-vfx.png) dùng Lục Cốt để diễn chiêu. [Bảng tạo hình minion](07-co-su-minion.png) xếp từ trái sang phải theo thứ tự zombie Yêu Cổ, cương thi Vô Ảnh Ma Cổ và Thần Chết Thi Quỷ Phong Tận. Zombie vai bè, bước khom. Cương thi nhỏ và thẳng, hai tay duỗi, lá bùa nổi trên trán. Thần Chết lướt trên đuôi khói, mang lưỡi hái cong lớn.

| Ô | Chiêu | Phân cảnh |
| --- | --- | --- |
| A | Đánh thường | Hốc mắt đầu lâu lóe lên rồi phóng đạn xanh nhọn theo đường thẳng. |
| Q | Vạn Cổ Thực Thiên | Một loạt sâu cổ thân đốt lao về trước theo hình quạt hẹp, hướng theo boss ưu tiên hoặc creep. Khi chạm, độc tóe thấp để đọc sát thương diện rộng. |
| W | Yêu Cổ | Bụi độc bung ở chân từng zombie khi trồi lên. Bốn cụm minh họa 1/2/3/4 zombie theo cấp chiêu. Máu và sát thương tăng theo cấp. Cả nhóm quay về mục tiêu Cổ Sư đang tấn công để biểu thị ưu tiên truy đuổi. |
| E | Tâm Hình Cổ | Trùng huyết cổ màu đỏ sẫm vỏ xanh bay đến và bám mục tiêu. Sau ba giây, trùng nổ diện rộng, tia gãy trên đầu báo choáng và một dải lục chạy ngược về Cổ Sư báo hút máu. |
| R | Vô Ảnh Ma Cổ | Khi đánh thường kích hoạt nội tại, một cương thi nhỏ bật ra trong làn khói ngắn. Dáng tay thẳng và bùa trán giúp phân biệt với zombie. Cương thi yếu hơn về dáng thể hiện, máu và sát thương tăng theo cấp chiêu. |
| T | Thi Quỷ Phong Tận | Cổ Sư hạ người, chạm tay xuống đất kết ấn. Thần Chết trồi khỏi ấn trong cột khói xanh, áo choàng tan vào đuôi khói để đọc dáng lướt. |
| T A | Đòn thường của Thần Chết | Quét hái thấp thành cung rộng qua nhiều địch. Khói xoáy sát chân mục tiêu biểu thị làm chậm. |
| T FX | Hai chiêu của Thần Chết | Sóng độc chạy dọc mặt đất. Cú bổ hái xuống nền phát xung diện rộng, kèm tia gãy trên đầu mục tiêu bị choáng. |

Các bảng phân cảnh giản lược hoa văn và phụ kiện để ưu tiên tư thế. Bảng minion lưu chi tiết áo choàng và lưỡi hái để duyệt tạo hình. Các hình nhỏ cạnh nhân vật là phác thảo tỷ lệ chibi. Bộ PNG đang chờ duyệt concept, trước bước tạo sprite, animation và kiểm tra trong Phaser.

Nguồn hình là ImageGen tích hợp trong Codex. Tham chiếu đã đối chiếu gồm bảng Võ Đang tại `assets/references/vo_dang_character_reference.png`, bảng Cái Bang, ảnh prototype bị loại và cách trình bày concept Côn Luân. [Prompt tạo ảnh và chỉnh sửa](PROMPTS.txt).
