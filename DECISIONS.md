## Thiền Sư A · nhịp chậm và sửa sprite 2026-11-24

Director chọn “Chậm cả animation và nhịp ra đòn”. Giới hạn A thủ công/tự động của Thiền Sư là 12 tick (0,4 giây), gồm Phòng test; giữ damage từng thức. Quạt xuất lại đúng mật độ đầu/thân, timing ba thức 375ms. Điều này thay phần A không giới hạn nhịp trước đó. [Hợp đồng v07](docs/SKILL_REVISE_THIEN_SU_V07_2026_11_24.md).

## Thiền Sư A · duyệt 2026-11-24

Director duyệt tích hợp ba thức **chọc → quạt hai tay → đập**, kèm lôi ảnh hiện tại. Mẫu quạt/đập theo ảnh động tác mới thay bản đập v05; bản hai thức trước đó là lịch sử. Giữ hệ số từng thức và quyền xử lý combat của server. [Phạm vi nguồn/runtime và kết quả](docs/SKILL_REVISE_THIEN_SU_V06_2026_11_24.md).

## Âm thanh đã duyệt và tích hợp M3D · 2026-11-22

Đã duyệt âm Côn Luân, Ngũ Độc, Đường Môn; giữ byte theo approval lock. Bốn phái còn lại dùng âm MP3 người dùng cung cấp, chuyển sang OGG và giữ nguyên mapping/mốc phát; bộ âm tổng hợp thử của bốn phái bị từ chối. Cài đặt tách nhạc nền và âm thanh game; mức SFX tăng nhẹ qua migration một lần. Người dùng yêu cầu tích hợp vào `milestone/m3d`. [Phạm vi và kiểm chứng](docs/AUDIO_M3D_INTEGRATION.md).

## Trình bày Phòng test/Lôi Đài và nhịp Độc Cô · 2026-11-19

Theo phản hồi người dùng: giữ label/nút nhập tên một dòng khi đủ chỗ, đưa map/hero về tỉ lệ gameplay Defense với camera trong bounds, thống nhất cỡ nút HUD và sửa nhát chém không kéo dãn ảnh. Tăng tần suất hai chiêu Độc Cô20% bằng khoảng chờ300/225tick, giữ warning/damage. [Nguyên nhân, triển khai và kiểm chứng](docs/PVP_VISUAL_REPAIR.md).

## Phòng test · 2026-11-19

Yêu cầu người dùng: nhập tên, chọn hero, vào Rừng Trúc không hiểm họa; cấp30/max kỹ năng, bất tử, nội lực vô hạn, không hồi chiêu; ba Chó Hoang đứng yên, máu bất tử. Triển khai mặc định mỗi người một room riêng; quyền thử nghiệm giới hạn namespace `practice`. Yêu cầu bổ sung: nút Đổi phái/hệ phái ngay trong room, dùng menu Defense; xác nhận đổi hero tại chỗ, không cần thoát phòng. [Luồng, mặc định và kiểm chứng](docs/PRACTICE_ROOM.md).

## Lôi Đài độc lập · 2026-11-19

Người dùng duyệt concept và yêu cầu triển khai trên `wip/m3d/pvp`: phòng riêng tối đa 8 người, Chính/Tà tối đa 4 mỗi phe, chọn phái/hệ mới ready, host chia phe, thắng 3 hiệp, mỗi hiệp 3 phút, hòa đánh lại; đấu thủ mất kết nối thua cả ván, host rời đóng phòng. Cấp 30/max kỹ năng, không đồ/bình, năm map và tùy chọn hiểm họa. Luật này chỉ áp dụng namespace mới, không sửa Defense. [Đặc tả](docs/LOI_DAI_STANDALONE_SPEC.md) · [Tích hợp/mặc định thử](docs/LOI_DAI_STANDALONE_IMPLEMENTATION.md).

> Reference-path maintenance — 2026-11-19: image naming/location issues are resolved in [the current index](assets/references/README.md) and [old-to-new manifest](assets/references/manifest.json). Original paths in historical entries below remain as recorded; they are not open asset requests. The cleanup changes no gameplay or art approval.

## Ngũ Độc · Bích Cổ và Âm Linh

Màn chọn phái dùng lưới 4 trên, 3 dưới và mở popup chọn hệ phái. Lượt Ngũ Độc này sửa tay chưởng hướng trái, làm mượt Thần Chết khi theo chủ, mở rộng Âm Phong Thực Cốt và cho trùng của Tâm Hình Cổ tự bay về.

Đã duyệt Bích Cổ và Âm Linh, bộ VFX, icon đánh thường và màn chọn phái để tích hợp vào milestone/m3d. Vô Hình Độc của Tà Hiệp phản độc thụ động và không có VFX riêng. Cổ Sư dùng W Yêu Cổ để gọi cương thi và R Vô Hình Ma Cổ tăng xác suất gọi zombie bằng đánh thường. Thần Chết còn sống theo chủ qua phó bản, về arena và khi chủ gục. Minion có thanh máu và nhận một phần chỉ số tăng từ trang bị của Cổ Sư. [Bản tích hợp](docs/NGU_DOC_PLAYTEST.md).

## Menu chính và điều khiển chuột · 2026-11-15

Menu chính mở trước màn biệt danh và có Vào game, Hướng dẫn, Cài đặt. Hướng dẫn có ba mục cho cơ chế chiến dịch, võ học theo phái/nhánh và boss. Âm lượng, tự đánh thường và kiểu điều khiển chỉnh được từ menu chính hoặc ngay trong trận. Lưu các lựa chọn trong localStorage và nạp khi mở game. Mặc định dùng bàn phím, âm lượng 45% và tự đánh thường tắt.

## Đường Môn · Tuần sa và Dạ hành

Đã duyệt Tuần sa 01, Dạ hành 06 và quạt R4 với băng châm Thủy ở giữa. Artwork VFX đã duyệt gồm laze trắng lam và 20 hoa đào thép nổ văng kim. Bản chơi thử dùng phòng M3D, bắt đầu Đường Môn ở cấp 6. [Bản tích hợp](docs/DUONG_MON_PLAYTEST.md).

Mãn Thiên Hoa Vũ gây gấp đôi sát thương mỗi vụ nổ ở mọi bậc, tính cả phần tăng theo sức công.

## Côn Luân · Hắc Thiết

Lượt chỉnh khống chế cho bản thử Hắc Thiết v04 tăng sát thương chiêu Q Kiếm Tôn 30%. Choáng bậc đầu của Q/E/R lần lượt là 2/1/2 giây, tăng 0,1 giây mỗi bậc. Trận Pháp Năm Kiếm kéo dài 7,5 giây, làm chậm 60% và khóa lướt trong vùng. Vòng E Thiền Sư giữ slow 35% trong 1,5 giây. W/R Thiền Sư choáng diện rộng 2 giây.

Đã duyệt sprite và chiêu Hắc Thiết, sau đó yêu cầu chơi thử với gameplay thật trong Phaser. Vòng E Thiền Sư rộng hơn 20%, sét Chaos bám theo thân. Kiếm Tôn phóng đầu rồng ở R. Trận pháp T có năm kiếm quanh tâm người chơi, diện tích tăng 20% và thời lượng ban đầu là 5 giây. [Bản tích hợp thử](docs/CON_LUAN_PLAYTEST.md).

## Sân Tương Dương và Bách Liệt Thiên Kích · 2026-11-13

Director duyệt sân Tương Dương 1.190 × 680 cho phó bản Kim Luân trong trận thường. Phaser hiển thị toàn bộ ảnh với cùng tỷ lệ hai trục. Va chạm tường và lối ra phía nam dùng chung cấu hình phó bản với server. Bốn bóng Bách Liệt Thiên Kích tiếp tục hoạt họa khi đòn trúng chỉ đổi tư thế nhân vật. Chúng kết thúc theo trạng thái thi triển của server.

## Sát thương boss, Long Tượng và Hồng Liệt · 2026-11-13

Chín boss chiến dịch và hai mini boss Hoắc Đô, Đạt Nhĩ Ba gây gấp đôi sát thương qua công thức đánh thường và kỹ năng. Các cơ chế trừ HP theo luật riêng giữ tỷ lệ đã duyệt. Đá Long Tượng cản đi và lướt đến khi biến mất. Hai cấp Long Tượng dùng 80 sát thương cơ sở mỗi lần voi trúng và gây choáng 2 giây. Đòn trúng của Hoắc Đô gây chậm và đòn trúng của Đạt Nhĩ Ba gây choáng 0,65 giây. Lính Hồng Liệt có 1.140 HP. Dung Nham Liệt Địa, Vạn Lý Nham Hỏa và Hỏa Sơn Bạo Phát đều gây choáng 2 giây.

## Độ khó Cổ Mộ và Liên Hoa Phiến · cập nhật 2026-11-13

Đã duyệt giảm 20% diện tích Cổ Mộ rồi thu thêm 10% trên diện tích đã giảm, còn 72% so với sân ban đầu và giữ tỷ lệ 4:3. Nếu Phất Trần Công ngoài tầm, Lý Mạc Sầu chọn chiêu tầm xa đang sẵn sàng và trong tầm. Phất Trần Công gây choáng 0,6 giây khi đòn hình quạt trúng sau báo chiêu. Âm Binh có 240 HP. Đạn Âm Binh làm chậm 60% trong 1,5 giây, đạn Ngũ Độc Chưởng làm chậm 70% trong 2 giây khi gây sát thương. Slow lấy mức mạnh nhất khi trùng thời gian. Vòng Liên Hoa Phiến tồn tại 6 giây, giảm 40% sát thương nhận và hồi 3–4% HP tối đa mỗi giây theo bậc cho người thi triển khi đứng trong vòng.

## Lôi Đài Hồng Mộc — 2026-11-12

Đã duyệt Lôi Đài 1v1, viền gạch trắng để quan chiến, sàn gỗ đỏ chữ nhật nới diện tích và pháo hoa chiến thắng. Xem [quy tắc và artwork](docs/LOI_DAI.md) để biết các quy tắc thay thế đề xuất PvP cũ.

## Áp lực wave, bẫy phó bản và Thiên Hạ Vô Cẩu · 2026-11-12

Wave creep chiến dịch dùng hệ số thử 1,10 HP và 1,08 sát thương trước làm tròn. Rừng Trúc, Sa Mạc, Biển và Địa Ngục có 10 quái mỗi đợt. Tổng EXP và vàng của một đợt giữ theo ngân sách cũ, chia đều cho 10 quái. Biển lên bốn tâm nổ nước mỗi đợt nếu có đủ mặt bằng, lặp mỗi 90 tick. Địa Ngục giữ nhịp nổ cách nhau 42 tick và bốc lại vị trí mỗi lần. Thiên Hạ Vô Cẩu giảm 80% sát thương nhận trong action và hồi 5% HP tối đa cho người thi triển khi đến cú đập cuối. Cú cuối bị ngắt thì phần hồi máu không phát.

## Tầm Bổng và hồi chiêu đánh thường M3D · 2026-11-12

Cái Bang Bổng đánh trong tầm 105 đơn vị với bốn thức và nhịp 8 tick mỗi thức. Bổng sơn đỏ khắc rồng vàng dài hơn 50%, rộng hơn 10%, thể hiện ở tư thế đứng, đi và đánh theo bốn hướng. Vệt đòn theo tầm mới. Võ Đang Quyền, Võ Đang Kiếm và Thiếu Lâm Quyền có hồi chiêu A bằng 0. Thiếu Lâm Quyền giữ chuỗi bốn thức và cửa sổ 60 tick. Nhịp hiện hành của Cái Bang Bổng, Thiên Sơn Phiến, Thiên Sơn Đao và Cái Bang Chưởng tiếp tục áp dụng. Mỗi lần nhấn A gửi một lệnh và server xử lý tối đa một đòn của mỗi người trong một tick.

## M3D · Sprite creep, báo chiêu và cát lún

Khôi phục sprite Renovation v1 đã duyệt cho creep. Giữ cùng atlas lúc trúng đòn và dùng chiêu. Giảm thời gian báo chiêu creep còn khoảng hai phần ba. Sa Mạc có tám hố cát ngẫu nhiên. Hố đổi chỗ sau mỗi 5 giây và khi vào lại. Nhân vật trong hố còn 10% tốc độ đi và bị khóa lướt.

## M3D review · Cổng Phải, phím học chiêu và phó bản

Director duyệt preview visual M3D và yêu cầu tích hợp vào trận. Phòng mặc định bốn cổng có thêm lựa chọn một cổng Phải. Giữ O rồi bấm Q/W/E/R/T để tăng bậc theo luật server. Đạn người chơi đi qua bệ Tượng Võ Thần, chân và lướt vẫn va chạm. Bổng bỏ hồi riêng sau thức thứ tư, giữ nhịp tối thiểu 8 tick. Bắc Minh Thần Công có né đòn trực tiếp. Vi Đà Quyền tăng sát thương cơ bản từ 44 lên 51 và gây choáng 2 giây. Sơn Viên dùng Ném đá. Độc Chu bắn tơ thường gây sát thương và định thân. Bốn phó bản có bẫy môi trường riêng. [Chi tiết và nguồn art](docs/M3D_REVIEW_INTEGRATION.md).

## Thiếu Lâm Đao · bản tích hợp M3D · 2026-11-09

Trận thường dùng trường đao Kim Cang (1C), đao khí lưỡi liềm (2A), La Hán quét Tru Tà (3A) và đao sen cùng vòng sen Như Lai Thiên Diệp (4A). Tru Tà có tầm cơ bản 190 đơn vị và tăng 4 đơn vị mỗi bậc. Phaser đặt mép lưỡi quét theo bán kính trong sự kiện thi triển từ server. Đòn A nhắm vị trí địch hợp lệ gần nhất trong tầm 320 lúc ra đòn, rồi phóng đao khí theo đường thẳng. Tầm và nhịp A dùng cùng cấu hình với Cái Bang Chưởng, hồi chiêu cơ bản 18 tick và sàn 5 tick theo tốc đánh. [Chi tiết](docs/SHAOLIN_DAO_REWORK.md).

## Thiếu Lâm Quyền · bản duyệt M3D · 2026-11-09

Người dùng duyệt bản Phaser và yêu cầu đưa vào `milestone/m3d`. Bốn thức đánh thường dùng cùng mẫu nhân vật với sprite đứng yên và đi bộ, kèm quyền kình và cước kình vàng. La Hán Quyền có tầm cơ bản 140, với ba nhịp đấm xuống đất. Vô Ảnh thường phóng ba cước kình bậc thang. Phát Động B hợp lệ đổi thành đá bay lướt có va chạm server và hiệu ứng gió cuốn bụi sát đất. [Chi tiết](docs/SHAOLIN_QUYEN_REWORK.md).

## Đại Lực Kim Cương Chưởng v05 · 2026-11-09

Người dùng duyệt artwork khí chưởng và va chạm v05 để tích hợp thử trong Phaser. Đại Lực thường phóng ba bàn tay lần lượt trên, giữa, dưới. Khi có Phát Động A trên mục tiêu hợp lệ, chiêu phóng một bàn tay lớn ở luồng giữa. Vi Đà giữ tâm nổ ở 189 và vùng trúng kéo từ mốc 42 đến 189 để nối combo khi đứng gần. [Cấu hình và kiểm chứng](docs/DIAMOND_PALM_V05.md).

## Võ Đang Kiếm · artwork được duyệt ngày 2026-11-09

Đánh thường chọn ngẫu nhiên một trong năm thế A2 gồm chọc, chém trái, chém phải, chém xuống và chém lên. Kiếm Khí tiếp tục có xác suất phóng riêng. Thất Tinh Kiếm dùng vệt bạc và mực Q2 trên bảy nhát phía trước, cách nhau 0,2 giây. Vạn Kiếm Quy Tông có 2/3/4/5 lượt ở bậc 1–4. Mỗi lượt chỉ kiếm về một tâm phía trước, ưu tiên boss rồi quái. 48 thanh kiếm bạc chuôi vàng lần lượt vút lên từ sau lưng, khuất một nhịp rồi đâm xuống vùng quanh tâm đã đánh dấu. Mỗi thanh nổ nhỏ tại điểm chạm. [Bộ artwork đã duyệt](assets/reviews/vo-dang-kiem-rework-2026-11-09/README.md).

Trong lượt chỉnh tiếp theo, kiếm T dài thêm 20% và rộng thêm 10%. Diện tích từng vụ nổ tăng 10%. Tọa Sát Bác Đồ khóa di chuyển, lướt, đánh thường và dùng kỹ năng đến khi kết thúc thế thủ. Vẫn dùng được bình máu và bình mana.

## Võ Đang Quyền · rework được duyệt ngày 2026-11-09

A dùng hai cú đấm luân phiên kèm quyền khí hình sóng Wi-Fi, không hồi chiêu. Q dùng thế chưởng đã duyệt và đạn tay lam đen của Huyền Âm Chưởng cũ, làm chậm và giảm sát thương mục tiêu. W đẩy lùi bằng hai sóng thẳng, sau đó tạo năm ấn âm dương quanh người thi triển và nổ mực sau đúng 1 giây. E đổi thành Bói Toán Thiên Cơ, chạy tám quẻ trên đầu và chốt bằng E lần nữa hoặc tự chốt sau 5 giây. R dùng cầu nội lực. T có sáu thế múa trước khi mở trận Âm Dương Bát Quái lớn hơn, với ba điểm sáng chạy quanh viền. Trận tiếp tục giữ quái và boss ở bên trong theo luật hiện hành. Xem mức cấu hình thử ở [CONTENT_DATA.md](CONTENT_DATA.md#võ-đang-quyền--rework-2026-11-09).

## Cái Bang Bổng · bản được duyệt cho M3D

Đánh thường có bốn thức chọc, quét, hất và vụt xuống, mỗi thức dài 8 tick. Hồi 15 tick sau khi thức cuối kết thúc. Các thức để lại vệt lửa, cú vụt cuối có vòng nổ tại điểm chạm đất. Phá Giáp Bổng vụt bằng gậy rồng cong, bổng khí chạy sau đầu gậy và nham thạch nổ tại điểm chạm. Tầm đánh ở cả bốn bậc là 144. Truy Phong Bổng giậm tại chỗ sau 6 tick lấy đà, gây sát thương và choáng trong bán kính cơ bản 110. Thiên Hạ Vô Cẩu có sáu chó lửa khi xoay và Nham Triều ở cú đập kết thúc. Bản này thay thế các quyết định M3D trước đó về tầm và hình ảnh của ba chiêu.

Bản thử 2026-11-11 thêm choáng 0,6 giây cho Phá Giáp Bổng. Hoành Tảo Bổng và Phá Giáp Bổng hồi 10% lượng máu mà các mục tiêu thực mất do cú đánh. Choáng tuân theo kháng khống chế hiện có.

## Cái Bang Chưởng · rework VFX được duyệt

Đòn thường dùng chưởng lửa và phượng hoàng ở thức thứ sáu. Cuồng Long Loạn Vũ dùng đầu rồng lửa, vòng nổ tròn và các đốm lửa báo thiêu đốt. Phi Long Tại Thiên dùng sóng mang hai rồng, để lại vệt lửa sát đất và đổ xuống hòa vào vệt khi hết tầm.

Hàng Long Hỏa Vũ cuộn bảy vòng trong 57 tick (1,9 giây), sau đó vút lên rồi giáng xuống vị trí hiện tại của nhân vật. Bán kính cuộn và đáp lần lượt là 89,7 và 128,8 đơn vị. Pha cuộn gây một nhịp sát thương 25%, cú đáp gây sát thương lan và choáng cơ bản 30 tick theo quy tắc kháng khống chế hiện có.

## Bình khởi đầu — 2026-11-11

Mỗi nhân vật trong trận chiến dịch nhận 10 bình máu nhỏ và 10 bình mana nhỏ khi vào trận lần đầu, kể cả khi vào phòng muộn. [Cấu hình chiến dịch](docs/CAMPAIGN_BALANCE_2026_11_06.md#experience-and-money).

## Nhịp lên cấp đầu trận — 2026-11-08

Director duyệt thử đường cong EXP mới trên `milestone/m3d`. Các mốc tích lũy cấp 2–6 là 45/135/270/450/670 EXP. Chi phí mỗi cấp tiếp tục tăng, và đường cong hội tụ về 7.480 EXP ở cấp 18. [Cấu hình và mục tiêu thử](docs/CAMPAIGN_BALANCE_2026_11_06.md#experience-and-money).

## Renovation v10 · giữ thân Cái Bang mới khi đánh thường — 2026-11-07

Đánh thường Cái Bang Chưởng dùng sprite mới trong cả năm đòn chưởng và đòn rồng thứ sáu. Đạn chưởng, đạn rồng, hiệu ứng phát chiêu và va chạm dùng bản M3D.

## Renovation v9 · hoàn tác đánh thường Chưởng và bỏ bàn tay Phi Long — 2026-11-07

Director yêu cầu đánh thường Cái Bang Chưởng trở lại bản M3D trước renovation: động tác thường, đạn chưởng, động tác/đạn rồng đòn thứ sáu, release và impact. Giữ idle/walk đã duyệt và luật mỗi sáu lần A. Phi Long Tại Thiên giữ đầu rồng mới, bỏ toàn bộ lớp sóng/impact cũ có hình bàn tay chạy chồng phía trước. Không sửa sát thương, tầm, mana, cooldown, knockback hay cơ chế server. Mọi chỉnh sửa v8 còn lại giữ nguyên.

## Renovation v8 · khôi phục độ vươn Phá Giáp và sửa impact rồng — 2026-11-06

Director xác nhận Phá Giáp v7 bị thu ngắn so với M3D. Đối chiếu cast thật và atlas M3D r3: giữ footprint đánh xa khoảng200world px ngang /128world px dọc, thay cho điểm chạm sát chân v7. Bổng phải dài ra lúc giơ và giữ chiều dài khi vụt/chạm đất; thân/điểm neo chân giữ nguyên kích thước. Vệt vụt đi tới đầu bổng dài; đường nứt bắt đầu từ chân và chạy tới điểm đánh xa, không chỉ là một vết nứt tròn ở đó. Không đổi combat range240, damage, mana, cooldown hay thời điểm strike.

Hàng Long v7 tạm được chấp nhận: giữ nguyên rồng đỏ, đường bay, cuộn/rise/dive, tầm70% và một landing hit. Chỉ ngừng phát bộ impact/ending cũ có hình đầu rồng trên từng mục tiêu; dùng một cú nổ tiếp đất mới cho cả nhóm mục tiêu. Kiểm tra hai mục tiêu cùng trúng và bốn hướng, đặc biệt hướng phải. Nguồn/PNG/Aseprite và so sánh cũ-mới ở`assets/source/renovation-v8` /`docs/evidence/renovation-v8`; art bổng mới chờ duyệt.

## Renovation v7 · rồng lửa cuộn thân và điểm chạm bổng — 2026-11-06

Director giảm tầm bắn tối đa Hàng Long Hỏa Vũ 30% ở mọi rank: 440/470/500 → 308/329/350. Rồng bay tới đúng điểm khóa lúc cast, cuộn chính thân thành một vòng tại chỗ, bay lên rồi đâm xuống; không đưa cả sprite chạy vòng quanh điểm rơi. Giữ 24+36+15+12 tick, bán kính nổ112, một lần sát thương khi chạm đất, mana/CD/damage và hủy khi chết/chuyển zone. Tên trường duration `orbitTicks` được giữ tương thích; phase hiện là `dragon_coil`. Rồng chuyển sang vảy đỏ lửa/bờm đỏ cam, giữ nhận diện và góc camera cũ. Hai ảnh mới của director chỉ là khái niệm chuyển động, không phải art cần chép vào game.

Phá Giáp giữ thân cầm bổng và luật đánh; vệt vụt trắng-vàng được vẽ rõ hơn, dùng cùng điểm neo chân với thân. Điểm cuối vệt và tâm vết nứt cùng gắn vào đầu bổng vẽ trong frame tiếp đất, không gắn vào tọa độ mục tiêu trúng đòn. Hình mới chờ duyệt; xem `docs/evidence/renovation-v7/README.md`.

## Renovation v6 · chọn lọc art và sửa chuyển động — 2026-11-06

Director yêu cầu hoàn tác **effect** Hỏa Vân Chưởng về M3D, bỏ bàn tay Kháng Long Hữu Hối, bỏ hình vòm Thái Cực. Luật nhốt chỉ quái/boss của v5 vẫn giữ. Rồng Hàng Long dùng góc nhìn được vẽ riêng và thân/đuôi uốn theo hướng bay, không xoay cả ảnh; đường bay và damage v5 giữ nguyên. Phá Giáp dùng thân cầm liền bổng: giơ cao → kéo dài → vụt xuống → nứt đất, giữ điểm phát/strike/hit server. Bách Liệt chỉ phóng đại VFX, không tăng tầm đánh.

Hoàn tác toàn bộ skill Đông Tà, Bắc Cái và Vương Trùng Dương; Mai Siêu Phong chỉ hoàn tác Độc Cốt Bạo; Tây Độc hoàn tác trừ Vạn Độc Phi Châm; Nam Đế hoàn tác trừ nhóm Phật Quang (`nam_de_aura`, `phat_quang_pho_chieu`). Giữ idle/walk mới và các hoàn tác v5. Atlas dùng chung phải có alias riêng cho các ngoại lệ, không thay nhầm skill khác. Hình mới chờ director duyệt; test không thay cho duyệt art. Xem `docs/evidence/renovation-v6/README.md`.

## Renovation v5 · phản hồi skill — 2026-11-06

Hàng Long Hỏa Vũ được rework theo director: bay tới trước, bay một vòng, vút lên rồi đâm xuống gây sát thương vùng một lần. Server khóa điểm rơi lúc nhận cast, không truy đuổi mục tiêu; 24+36+15+12 tick, bán kính nổ112px, hủy khi chết/chuyển zone. Giữ mana/CD/hệ số sát thương theo rank; thay đường gây sát thương xuyên thẳng cũ.

Thất Tinh Kiếm có bảy nhát chém thật, cách nhau3tick, không thêm finisher gây damage thứ tám. Chia ngân sách sát thương/AP của bốn nhát cũ cho bảy nhát (4/7), chấp nhận khác biệt làm tròn theo hit và thời gian chuỗi dài hơn. Thái Cực Trận chỉ nhốt quái/boss, kể cả boss kháng khống chế; mọi đồng đội đi xuyên. Chặn cả di chuyển thường và lướt theo script tại mép trận; vẫn di chuyển/đánh/cast bên trong, giải phóng khi hết trận hoặc chủ chết.

Hoàn tác hình skill Thiên Hạ Vô Cẩu, Lưỡng Nghi Thủ, Sư Tử Hống, toàn bộ Chu Bá Thông/Kim Luân và Lý Mạc Sầu trừ Băng Phách Ngân Châm về M3D; giữ idle/walk mới. Lưỡng Nghi chỉ hoàn tác VFX, vẫn dùng thân mới. Khôi phục cặp tượng Cổ Mộ tại marker cũ. Thêm mode development thử đủ năm wave boss, tướng30/max skill/không hồi chiêu; launcher game thường giữ luật thường. Hình v5 chờ director xem, test không thay cho duyệt art. Chi tiết: `docs/evidence/renovation-v5/README.md`.

## Renovation v2 · sửa bố cục, đường đi và thử hai nhánh skill — 2026-11-05

Director yêu cầu tăng độ nét nhưng giữ layout arena cũ: chỉ tượng Võ Thần tại (800,576) và hai đèn tại (744,578)/(856,578). Không thêm cây, cờ, cửa hay công trình vào arena. Nền dùng đúng mặt nạ vòng tròn và hai đường cắt nhau cũ. Canvas giữ mật độ màn hình gốc; camera desktop trở lại 2× và sprite 88px gốc hiển thị ở scale thế giới0.5, giữ kích thước/world FOV cũ.

Sửa Bamboo bằng cách khớp nền với kích thước map server và bỏ collision sông/hàng rào cũ không còn trong hình. Bốn dungeon creep chỉ còn hai mỏm đá có footprint dùng chung cho server và renderer; biển/lava vẫn có biên ngoài. Bỏ bệ đá vô hình bên trong Cổ Mộ; ba dungeon boss còn lại giữ biên cũ và không thêm đá nội thất. Không đổi tốc độ, sát thương, tài nguyên, hồi chiêu hay luật boss.

Bản thử mới thay cả thân hành động và VFX của đòn Kiếm/Phiến cùng năm skill Võ Đang Kiếm và năm skill Thiên Sơn Phiến. Giữ tên frame, kích thước thế giới, origin, điểm phát, thời gian và đường bay cũ. Nguồn mới là candidate để director xem; không ghi là đã duyệt. Các nhánh còn lại và hành động/skill boss vẫn dùng nguồn cũ, không coi idle/walk mới là đã hoàn thành hành động. Xem `docs/evidence/renovation-v2/README.md`.

## Renovation v1 · duyệt hình và yêu cầu tích hợp Phaser — 2026-11-05

Director duyệt bản preview đầy đủ với yêu cầu **“quá đẹp, hãy integrate vào phaser”** trong worktree `wip/m3d/visual-upgrade-2`. Phạm vi hình được duyệt: idle/walk bốn hướng của8 nhánh vũ khí,20 wave creep,24 dungeon creep,5 wave boss với7 dạng,11 minion/trợ thủ,4 dungeon boss; arena và8 sân phó bản. Khóa art tại `assets/approved_renovation_v1.lock.json`. Tích hợp vào trận Phaser thường ở mật độ màn hình gốc; giữ tranh attack/cast/hurt/death, skill/VFX và toàn bộ luật server hiện có. Phê duyệt preview không tự động trở thành phê duyệt ngoại hình trong trận sau tích hợp. Báo cáo và ảnh thật: `docs/evidence/renovation-runtime/README.md`.

## Commit toàn bộ M3D — 2026-11-07

Director yêu cầu commit tất cả thay đổi hiện có, bao gồm cân bằng chiến dịch, ba lượt hồi sinh/vote và toàn bộ code/artwork/tài liệu Vương Trùng Dương. Đây là ủy quyền commit trên checkout hiện tại, không tự xác nhận duyệt art runtime hoặc triển khai mạng. [Phạm vi và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Campaign balance và thử lại boss — 2026-11-06

Director duyệt và yêu cầu triển khai toàn bộ cân bằng chiến dịch, Long Châu từ tứ tuyệt, chuỗi boss và ba lần hồi sinh + vote ≥50%. Quy tắc và hệ số mới thay các giới hạn lịch sử tương ứng bên dưới. [Quy tắc, cấu hình và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Nhạc nền trận đấu — 2026-11-05

Ba bản nhạc do người dùng cung cấp phát cục bộ khi vào trận. Client xáo thứ tự mỗi lượt ba bài và tránh lặp liền khi sang lượt mới. Nhạc tự chuyển khi hết bài và dừng khi trận kết thúc hoặc người chơi rời phòng.

## Chế tạo và icon Cái Bang — 2026-11-05

Yêu cầu mở Chế tạo cho phép triển khai bốn công thức, 12 nhánh, Z từ giày và nguyên liệu cá nhân cần cho công thức. Giữ giới hạn một thành phẩm mỗi ô và mức phí thử đang có. Quy tắc đủ điều kiện và thông số thử ghi trong [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md). Long Châu và PvP thuộc phạm vi riêng.

## M3D gameplay update — 2026-11-04

Each player confirms one school and one of its two branches before spawning. Branch and A are locked for the match. Q/W/E/R/T are fixed to the branch, with T as the ultimate. Learn and rank up from the in-viewport hotbar. There is one point per level. Levels 1–20 fund skills, while levels 21–30 reserve ten points for a future stat allocation system. Unspent skill points carry forward. Standard ranks open at levels 1/3/5/7 and ultimate ranks at 6/12/18/24. There is no in-match respec.

Thiếu Lâm Quyền uses F to switch Quyền and Cước. Q/W/E share ranks by slot and keep cooldowns by ability. R (Kim Cang Bất Hoại) and T (Như Lai Niết Bàn) share their rank, cooldown and effects between stances. The existing basic-attack chain still uses A.

The statue is now **Tượng Võ Thần**, containing **Long Hồn Thần Thạch**. Player teams guard it from rival martial artists and the five masters. Hoàng Thường and the future post-Vương Trùng Dương reveal are reserved for a separate update.


## Vương Trùng Dương · chốt thiết kế và duyệt concept v01 — 2026-11-05

Boss cuối có hai phase, Toàn Chân Kiếm Pháp và Tiên Thiên Công. Cửu Âm Hộ Thể vỡ khi boss trúng sét ba lần. Toàn Chân Phản Kiếm chém mạnh cả đội một lần nếu bất kỳ người nào trượt QTE, với mức sàn 1 HP cho người còn sống. Phase 2 bỏ kiếm, dứt sấm và duy trì Phá Thể Vô Hình Kiếm cho đến khi boss chết. Thất Tuyệt Lôi Âm dùng sáu vòng nhạc, sai chuỗi khiến cả đội thua lượt đánh boss. Director đã duyệt tạo hình hai phase và hai bảng VFX concept v01. [Thiết kế boss cuối](docs/VUONG_TRUNG_DUONG_FINAL_DESIGN.md) và [prompt sản xuất sprite, tích hợp Phaser](docs/INTEGRATE_VUONG_TRUNG_DUONG_PROMPT.md).

## Đông Tà runtime approval and milestone integration — 2026-11-03

The director approves the delivered Đông Tà V04 runtime and explicitly requests integration into `milestone/m3d`. This supersedes prior worktree-only/no-merge delivery restrictions. Approval and exact reviewed runtime/evidence hashes: `docs/evidence/dong-ta-runtime/director-approval.json`. Retain the current milestone's newer school mechanics, controls, dungeon policies, Hell and merchant/inventory work. Đông Tà remains the specific wave-encounter exception: all-player recall/revival, protected statue, continued180-second invasions, unlimited wipe retries, boss-only clear and no items. Final numeric balance remains configurable trial tuning; no M4 or other chapter-boss expansion is inferred.

## Đông Tà V04 gameplay integration authorization — 2026-11-02

The user explicitly requests executing `docs/INTEGRATE_DONG_TA_PROMPT.md` in `wip/m3d/dong-ta`, including actual Phaser combat, server authority and multiplayer verification. This supersedes the preceding prompt-only scope. The implementation adds only the first wave5 boss gate and Đông Tà/Mai/Hoàng encounter in the existing central arena. Confirmed statue immunity, all-player recall/revival, court bounds, unlimited wipe retries and boss-only clear are implemented without pausing the180-second wave clock or repairing the statue. The approved sprite/VFX bytes remain locked. Numeric tuning, scripted-summon interrupt policy and final runtime art/balance approval are documented separately in `docs/DONG_TA_INTEGRATION.md`. No other chapter boss, new arena, item loot, merge or deployment is authorized.

## Đông Tà V04 design approval and integration handoff — 2026-11-02

The director approves the V04/feedback_02 sprite/VFX design as integration input and requests an implementation prompt, not gameplay code in this turn. Approval: `assets/reviews/bosses/dong_ta_v02/director_approval.json`; exact-byte lock: `assets/approved_dong_ta.lock.json`; handoff: `docs/INTEGRATE_DONG_TA_PROMPT.md`. Main arena/east entry, 180-degree thrust, 8–14 radial finger shots, four stationary +/X slashes, 40 random flower clusters, frontal two-stroke claws, passive single-player pursuit and under-40% once-per-attempt dual summon are the selected design. Polygon dash and extra legacy Hoàng abilities are superseded.

The user explicitly confirms: temporarily hide and make the statue invulnerable during this encounter and its retries, without repair; preserve the 180-second invasion clock. Recall every room player from all zones including dungeon/PvP and immediately revive dead players. Đông Tà's death clears the encounter without requiring Mai/Hoàng kills; clean up summons and restore the arena/statue. A full-party wipe resets the boss and attempt state for unlimited retries until clear or quit. Numeric HP/damage/cooldown/reward/scaling and retry delays remain configurable proposals. No live gameplay implementation or final runtime/balance approval is claimed here.

## Đông Tà preview feedback 02 — 2026-11-02

The director supersedes three V03 details: Bạch Cốt Trảo strikes the player-facing area ahead of Mai, not around her torso; Ngọc Tiêu uses slightly fewer randomly scattered petals; Lạc Anh active W slashes four directions in a randomly selected + or X pattern, replacing polygon dashes. The existing fan-shaped normal remains separate. Preview defaults are 40 rather than 48 flower patches, a 280px four-way slash, and a forward claw contact region that rejects rear targets. Front-target tint is cosmetic, never authoritative damage. Main-arena entry/temporary statue hiding/party recall/field bounds, the 180-degree sword normal, 8–14 radial finger shots, one-time under-40% dual summon and Hoàng's two abilities remain. This is still the requested sprite/VFX demo in wip/m3d/dong-ta, subsequently approved by the director in the entry above; this historical feedback task did not integrate the server encounter. See assets/reviews/bosses/dong_ta_v02/README.md. Historical V03 code and evidence are retained.

## Approved M3D feedback integration — 2026-11-03

Director approves all feedback/runtime through `521f73cd` and now explicitly authorizes integration into `milestone/m3d`, superseding earlier no-merge instructions for this work. Merge retains the milestone's Hell, approved inventory/merchant UI, trial purchases and potion1/2 controls. Full approved behavior and trial numbers: `docs/M3D_R3_GAMEPLAY_HANDOFF.md`, `docs/M3D_PLAYTEST_FOLLOWUP_HANDOFF.md`, `docs/M3D_VO_ANH_FIX_2026-11-03.md`; newest ledger entries override historical values.

Confirmed runtime: O Võ Công, P Phó Bản, Escape close/quit; remove Đồng Đội Kết Nối. Creep dungeons including Hell are private; boss dungeons shared, no access selector. Invitations30s real time, only to connected peers outside the selected boss; no solo summon prompt. Everyone connected inside the same boss freezes exterior arena actors/projectiles/statue damage/wave clock. First boss death auto-revives5s full HP/MP at entry; second becomes spectator (solo automatically returns to main arena). One revival per character/boss attempt, not refreshed by travel/reconnect; only boss reset refreshes. Reconnect returns to main arena.

Latest creep speed is64.8% of owner's actual buffed entry speed (90%×80%×90%), fixed for the wave. One sprite identity/wave, next wave changes identity; deterministic soft footprint separation. Boss arenas use width/height×1.1 from pre-feedback geometry. Ca Diệp and Sanskrit field each hit once per target/cast. Ca Diệp hits/stuns every target on the path. Vô Ảnh is one centered foot without valid same-target B chain, three parallel lanes twice with it; early finisher input waits for the real Ca Diệp action/hit. Shift recharge8s/charge; four fresh-press monk A stages with1s cooldown after finisher or after2s inactivity. Võ Đang basic knockback chance10%.

Chu wine is a real damageable-disciple/drop/proximity Space interaction; trial boss defense180, wine12s ignoring70% of Chu defense for the drinker only, refresh/nonstack, no heal/immunity, cleanup on death/travel/reset. Càn Khôn pulls120px/s arena-wide and blocks Shift. Hồng Liệt artillery is autonomous while boss continues A1/A2. Boss cadence is validated in `packages/game-data/src/boss-cadence.json`.

Do not silently implement the inventory-v2 boss reward/material/Long Châu/crafting/Z/PvP migration: those remain future work under the newer inventory design. This integration preserves the retained encounter reward backend and the milestone's current basic/potion economy. Approval of this integration is not approval of unrelated unfinished milestones.

## M3D approved tech commit authorization — 2026-11-02

The director explicitly requests: “commit phần tech đã duyệt và tài liệu bàn giao.” Commit the approved technical/gameplay changes, their tests and verification evidence, and the handoff on `wip/m3d/feeback-tech`. This does not authorize merging, deployment or integration of the separate visual worktree. The previously recorded successful final checks remain applicable because this step changes delivery/approval metadata only.

## M3D technical feedback approval — 2026-11-02

The director explicitly approves the delivered technical/gameplay changes in `wip/m3d/feeback-tech`: “Duyệt tech change”. This approves the implementation and documented trial tuning described in `docs/m3d-feedback-tech-handoff.md`, with the recorded final verification. It does not approve new sprite/VFX artwork, visual-worktree integration, a commit, or a merge. The separate visual batch and later integration remain distinct tasks.

## M3D technical feedback — 2026-11-01

The director authorizes only `wip/m3d/feeback-tech`, without visual-worktree integration. Confirmed: Shift has two charges, sequential six-second recharge; each A is a distinct key press (no held autoattack); Võ Đang has no additional basic cooldown beyond a finite animation cadence; Thiếu Lâm Quyền cycles left fist/right fist/front kick/roundhouse. Nhân Kiếm Hợp Nhất is a slow piercing damaging sword, one hit per enemy, same-slot recast blinks to its server-owned position; it lingers 1.5s at maximum range. Kháng Long rank4 gains a small owner-following fire aura. Requested reaches and skill lifetimes increase; ordinary extended attacks retain their prior per-cast damage, while the new aura adds damage. Dungeon creep waves grow and all living in-instance heroes are immediately eligible aggro targets.

Configurable trial numbers, authority/cleanup details, temporary retained-art adaptations and actual verification belong to `docs/m3d-feedback-tech-handoff.md`. No PNG/source/atlas generation, new-art approval, boss avatar, other milestone or merge is authorized here.

## Potion hotkeys — 2026-11-02

Director requests **1 = use health potion, 2 = use mana potion**. Top-row/numpad keys use the existing smallest-first HUD transaction with server-owned quantities/recovery/shared5s cooldown. Modal/text input, key-repeat and modified shortcuts cannot trigger potion consumption. Show1/2 badges and settings help inside the viewport; no new game effect or tuning.

## Runtime UI approval and delegated trial economics — 2026-11-02

Director: “Duyệt giao diện, hay commit. Về economics, bạn hãy tự gắn giá cho sản phẩm để tôi mua. Sau này tôi sẽ revise lại”. The reviewed runtime UI is approved and committed (`60498c09`); prior concept-only/unavailable-purchase notes below are historical. This authorizes provisional configurable prices and working server-owned basic purchases/upgrades and potion purchases/use. Four-slot level5 limits remain; select trial policy20 potions total, shared5s cooldown, instant fixed recovery, no consumption at full resource, alive-arena purchases only. No starting-gold/reward changes. Exact prices/stats and scope: [ECONOMY_TRIAL.md](docs/ECONOMY_TRIAL.md). Values are director-delegated trial defaults, subject to revision, not final balance approval. Craft fees are previews; crafted effects/Z, personal boss/Long Châu migration and PvP remain future work.

## Inventory HUD concept approval and UI integration — 2026-11-02

The director approves the five inventory/merchant/auxiliary-Z concepts and requests Phaser integration. Scope: in-viewport UI with modular retained/derived PNG art, live server gold/stats/held rewards, working inspection/selection and honest unavailable transaction/Z states where inventory v2 backend is absent. Do not invent prices/stats, client-only transactions/effects, PvP normalization or silently migrate retained boss rewards. Concept approval is separate from actual runtime approval. Details/checks: [INVENTORY_HUD_INTEGRATION.md](docs/INVENTORY_HUD_INTEGRATION.md).

## Inventory and merchant design revision — 2026-11-02

**CONFIRMED, design only:** [ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 records the director's inventory brainstorm. Four fixed equipment slots are weapon (damage), armor (defense/HP), hat (HP/MP regen), boots (movement speed/minor crit); necklace is removed. Buy matching basics to upgrade through level 5; max basic + designated boss material + gold selects one of three crafted branches. Potions have 5s use cooldown, limit 20 with total/per-type interpretation still open, larger sizes cost more, and cannot be bought inside dungeons.

Boss rewards replace the former one-random-item/roll rule: every character who damaged the boss and is still in that boss instance at death receives its material. Each character also receives Long Châu once per boss per match for in-match stat growth. No item resale, trading or transferable drops; merchant purchases remain. Existing fixed XP/gold pools and invasion no-item rules remain. Repeated private/shared kills cannot duplicate first-clear rewards.

Recipes: Lý Mạc Sầu → Ngọc Uyên Ương + boots5 (Thanh Tâm cleanse / forward blink / straight slow-poison needle); Hoàn Nhan Hồng Liệt → Đại Kim Chiến Giáp + armor5 (reflect / slow aura / burn aura); Chu Bá Thông → Đại Hồ Lô + hat5 (regen / HP+MP+defense / damage+crit); Kim Luân Pháp Vương → Kim Luân + weapon5 (spread / lifesteal / armor penetration). **Thanh Tâm replaces 10% healing Z; armor penetration replaces weapon stun.** Lifesteal is based on one A's emitted damage, not the number of creeps hit. All exact values not explicitly chosen remain open.

**PROPOSED/OPEN:** shared vs separate potion cooldown, total vs per-type cap, potion size/price/healing tables, Long Châu stat formula, equipment coefficients, inventory capacity, edge-case eligibility and merchant/crafting policies. **PvP ignoring equipment and banning potions is an idea, not a confirmed rule**; scope of shoe Z, Long Châu, level/passive/rank normalization remains open. No code/protocol migration or M4 completion is authorized by this documentation request; earlier encounter implementation reports describe retained runtime behavior.
## Nam Đế art feedback03 — 2026-11-02

The director accepts feedback02's rotation/firing speed and requests multiple directions at once. The standalone preview now emits four simultaneous rays 90 degrees apart per volley. Every direction has its own fixed 0.9s warning; volleys retain the accepted 0.8s cadence, 12.8s full rotation and 16s preview. Four directions per volley (sixteen volleys, sixty-four rays total) is a configurable visual default. The pressure-point dialog still closes immediately on success/wrong input, and existing world effects continue. No original raster changes, production encounter integration or final art approval are implied.

## Nam Đế art feedback02 — 2026-11-02

The director requests a slower Liên Hoàn Nhất Dương Chỉ with warning before each ray and a slowly turning boss. This supersedes the prior near-simultaneous full-circle volleys: the preview now rotates continuously through one circle, emits sixteen straight rays sequentially, warns each fixed lane for 0.9s and spaces releases 0.8s apart; 12.8s rotation and 16s total preview are configurable presentation defaults. Four authored facings advance in order; the sprite is not rotated out of the fixed overworld perspective. Đại Lý Phong Huyệt closes its dialog immediately after the complete correct sequence or the first wrong input. Wrong-input explosion, 70% backlash, 10% boss heal and the existing 2s preview stun continue in the world after dismissal. No encounter/server integration or final art approval is implied.

## Nam Đế art feedback01 — 2026-11-02

The director revises only the standalone sprite/VFX preview: Phật Quang is one simple light ring emitted from Nam Đế's center; an incorrect Đại Lý Phong Huyệt input must visibly explode and stun the victim; Liên Hoàn Nhất Dương Chỉ fires through all 360 degrees including front and back; Tiểu nhất dương chỉ is an immediate hand-flick shot without charging. The preview uses a configurable 2s backlash stun and nine randomized eight-direction volleys as presentation defaults. The original 70% backlash, 10% boss heal and five-second/ten-arrow challenge remain. These clarifications supersede conflicting v02 notes; no production encounter integration or final art approval is implied.

## Nam Đế final art/choreography brief — 2026-11-01

The director's final Nam Đế description supersedes the v01 skill-art concepts. Reuse the existing character/concept art, compare/rework skill VFX, and deliver a sprite/VFX preview first, exclusively in `wip/m3d/nam-de`. Nam Đế is a wave boss entering the main arena from the south, focuses players and never attacks the statue; no separate arena. Normals: long/wide forward palm shockwave, surrounding Phật Quang, one small finger ray at the farthest player. Slow movement with a random chance to dash behind a player.

Final specials: Nhất Dương Chỉ charges at a fingertip and fires a warned screen-crossing ray, 90% HP lost on hit; Liên Hoàn Nhất Dương Chỉ is a longer random-direction barrage favoring player directions; Đại Lý Phong Huyệt dashes into contact and locks a protected victim into ten arrow inputs over five seconds, one wrong input causes 70% HP backlash, boss heals 10%; Phật Quang Phổ Chiếu shines on one victim, causes dizziness and random arrow remapping for about ten seconds; Nhất Dương Quy Tông fires upward then rains dozens of quickly warned finger rays from the sky. Do not retain healing Phật Quang, sealing missiles or extra shield/passive skills as encounter mechanics from the old art package.

The current authorization is art-preview work, not authoritative encounter integration or final art approval. The standalone Phaser demo's actors/HP are illustrative. Unspecified numeric tuning, percent-health base, timeout behavior and precise heal trigger are documented as preview assumptions in `assets/reviews/nam_de_v02/README.md`, not new confirmed combat rules. Original sources and historical v01 notes remain intact.
## Bắc Cái visual approval and integration handoff — 2026-11-02

The director explicitly approved visual v03 and requested an integration prompt, not immediate integration in this turn. Final mechanic answers: hitting a clone still causes the explosion even if the same AoE/tick also hits the real body; tied/zero preference votes fail immediately; either tether endpoint dying/leaving the arena/disconnecting breaks the tether and stops drain immediately. Artwork/choreography hashes are pinned in `assets/approved_bac_cai.lock.json`; scope/known facing gaps are recorded in `assets/reviews/bosses/bac_cai_v03/director_approval.json`. This is not final live-runtime or combat-balance approval. Handoff: `docs/BAC_CAI_PHASER_INTEGRATION_PROMPT.md`.

## Bắc Cái director feedback v03 — 2026-11-02

Mục Hạ Vô Nhân swaps slowly along crossing pair paths. Đả Cẩu Bổng Kích needs a clean jab/beam animation. Kiến Long's ground explosion must not cover Hồng Thất Công. Preference speech is concurrent with normal combat/other skills. Phi Long releases a detached dragon and immediately permits subsequent skills while the dragon continues its own expanding spiral. The art preview implements these channels independently; no authoritative combat integration or final art approval is implied. Detail: `docs/BAC_CAI_FEEDBACK_V03.md`.

## Bắc Cái final boss brief and art-preview scope — 2026-11-02

The director's current Bắc Cái description is final and supersedes conflicting old boss-asset mappings. Reuse the existing character/concepts; preview sprite/VFX first in `wip/m3d/bac-cai`. North-entry wave boss in the main arena, player-only aggression, flexible staff/palms, four attackable black dogs, eight-body/five-shuffle trick, map-wide pull/slam, two-player breakable draining tether (disabled solo), broad 田 impact, expanding fire-dragon spiral and changing-preference majority floor vote with ten-second sleep or 10% healing. Exact wording, reuse audit and unresolved numeric/tie policies: `docs/BAC_CAI_FINAL_DESIGN.md`. This authorizes art choreography and a dedicated preview, not combat/server integration or final artwork approval. Playable Cái Bang school mechanics are unchanged.

## Lý Mạc Sầu selector correction — 2026-11-01

The director explicitly requests Lý Mạc Sầu as a peer dungeon card alongside Hồng Liệt and Chu Bá Thông, replacing the separate options-row button. Keep destination `co_mo`, private/shared access, server authority and the existing encounter unchanged. The retained approved Cổ Mộ arena illustration supplies the menu thumbnail without new art generation.

## Lý Mạc Sầu merge authorization — 2026-11-01

The director explicitly requests committing and merging the existing approved Lý Mạc Sầu integration into `milestone/m3d`, retaining current features and retesting the Cổ Mộ selector. This supersedes the earlier worktree-only delivery scope. Existing Forest/Desert/Beach, Hồng Liệt, Chu Bá Thông, school progression and Chu item transactions remain; Cổ Mộ pending claims stay separate. This merge approves delivery scope, not new artwork, final boss tuning or full M4 inventory. Exact merge/verification: `docs/LY_MAC_SAU_INTEGRATION.md`.

## Chu Bá Thông encounter authorization — 2026-11-01

The director explicitly approved feedback01 artwork/choreography and requested integration solely in `wip/m3d/chu-ba-thong`. This adds the private/shared Chu Bá Thông dungeon, three normals, five named specials, moving Yin–Yang fields, faster/wider spin, smaller hands and one wine disciple per member, reusing current progression/controls. Server owns all attacks/geometry/status/RNG/loot; wine delivery grants no inferred immunity/buff. Preview approval is pinned separately from pending runtime art approval. Damage/HP/reward coefficients and control policy remain documented trial defaults. Exact mechanics, ownership and limitations: `docs/CHU_BA_THONG_INTEGRATION.md`.

## Lý Mạc Sầu encounter authorization — 2026-11-01

The director explicitly authorizes only Lý Mạc Sầu/Cổ Mộ Phái integration in `codex/m3d/ly-mac-sau`, using the approved v02 preview assets unchanged. The encounter has private/shared instances, six requested attacks, server-owned casts/hostile projectiles/summons, fixed boss strength, 30s empty reset and cooldown respawn. Purple eight-way palms are mandatory; no poison/slow/stun is invented from VFX. Numeric attack/HP/reward/CC values and two loot identities are configurable trial tuning. A narrow single-item auto-roll produces a match-only pending claim; full inventory/equipment/crafting and other bosses are not authorized by this task. Art-preview approval is recorded separately; runtime director approval remains pending. See `docs/LY_MAC_SAU_INTEGRATION.md`.

## Forest authoritative visual roster — 2026-11-01

The director explicitly authorizes the Forest roster in order: `truc_xa`, `doc_chu`, `son_vien`, `truc_lam_kiem_khach`, `moc_linh`, `truc_yeu`. The existing server roster assignment owns these identities in private/shared gameplay. Forest continues the cycle by actual spawn count per instance, including when participant scaling changes wave size. Three-creep waves use the first three, then the last three. Existing counts, common creep stats/AI, rewards, RNG and collision remain unchanged. Artwork approval is already recorded separately; this authorization adds no species abilities, statuses, projectiles or balance changes. See `docs/FOREST_CREEP_RUNTIME_INTEGRATION.md` for current verification and retained historical review evidence.

## Small gameplay changes — 2026-10-31

The user explicitly requests Vietnamese product UI, compact school selection with Leave left/Confirm right, Space at physical dungeon doors, Quit first with confirmation, P for Võ Học, local grayscale death and central-arena respawn. New normal players use Default mode: choose a branch, automatically learn/equip Q→W→E→R, and skill ranks belong to slots when replacing same-branch skills. Custom retains manual rank allocation, mixed styles and independent A. All build edits remain living-arena-only and server-owned.

The user explicitly confirms retaining current regular4/ultimate3 caps, level gates and the existing surplus mechanism. Each slot's quota is floor((min(level,30)+3-slotIndex)/4); learned rank is bounded by quota, unlocked ranks and cap. Unallocated gated points remain pending; surplus applies only when all four skills are maxed. Four regular starters follow catalogue order (Thiếu Lâm Quyền uses combo A plus Toàn Phong Thoái). Mode/branch changes recalculate and preserve cooldown debt without resource refill. Normal dungeon exits retain their return marker; only death respawn now uses the arena hero-spawn marker, with the existing five-second delay and no gold/XP penalty. No new artwork or broader M3D balancing is authorized. Details: docs/SMALL_GAMEPLAY_CHANGES.md.

# Approved decisions & assumptions register

## Hell integration request — 2026-11-01

The user authorizes integrating retained Địa Ngục environment and six supplied creep identities in worktree/branch `wip/m3d/hell`, using destination `hell`, separate private/shared instances and the existing physical Space return. Generic M2A creep tuning, rewards and authoritative wave behavior are reused because species profiles are absent. Lava is an impassable boundary without damage/status/traversal additions; Dung Nham Cự Nhân remains a regular creep. Shared hurt/death clips are not four authored facings. No artwork is generated and runtime director approval remains pending. See `docs/HELL_INTEGRATION.md`.

## Beach integration request — 2026-11-01

The user explicitly authorizes Beach environment and six-creep integration exclusively in worktree/branch `wip/m3d/beach-dungeon`. The existing **Biển** card now selects authoritative destination `sea`, with separate private/shared instances. Existing forest/desert behavior, generic M2A tuning, server authority and Space-at-physical-door controls remain. No species-specific cannon/water/poison/summon profiles were supplied, so retained appearances reuse the common creep mechanics. The documented empty Thủy Quỷ death cel is corrected from its retained original raster; no bulk artwork is generated and runtime director approval stays pending. See `docs/BEACH_INTEGRATION.md`.

## Desert integration request — 2026-10-31

The user explicitly authorizes integrating the retained Sa Mạc environment and six creep appearances into Phaser, with the existing server-authoritative dungeon systems and in-viewport menu. Sa Mạc now supports separate private/shared instances; forest remains the default destination. This supersedes earlier descriptions of Sa Mạc as unavailable. Retained artwork is reused without bulk generation or automatic ART-01/runtime director approval. No species-specific stats/abilities were supplied: the six appearances reuse the current M2A generic creep profile and rewards, with specialized ranged/poison/area mechanics pending authored definitions. See `docs/DESERT_INTEGRATION.md`.

## M3C3 playtest feedback trial — 2026-10-31

The director explicitly authorizes the gameplay feedback revision without new artwork. This supersedes earlier melee-Phiến/timed-shield/single-hit-evasion descriptions: Phiến A is a two-straight-leg boomerang, one hit per target per leg; both Thiên Sơn A profiles have a 0.3s base cadence with a configurable floor. Cái Bang Chưởng empowers every sixth accepted A, not cleaves; Bổng cycles thrust/sweep/lift/smash without adding airborne control. Võ Đang/Thiếu Lâm hand alternation is an authoritative presentation stage, pending matching art. No-cooldown A means a finite attack cadence without an extra wait, never click-rate damage.

Chiết Mai has bounded active cooldown reduction. Phi Ảnh/Phong Ảnh immunity covers only moving dash ticks and never existing DOT; the later counter is not invulnerable. Thái Cực Thần Công is a resource-safe toggle with overflow to HP. Thái Cực Trận confines enemies without stopping actions inside and respects forced-movement immunity. Dịch Cân Kinh already owns HP regen and is not duplicated. All numeric reach/damage/duration/conversion changes remain configurable trial tuning. Exact before/after and pending asset contracts: `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`. Retained asset bytes/approval locks and unrelated concurrent art remain untouched; no M3D/campaign/boss/PvP/equipment expansion is authorized.

## School avatar and clean arena spawn — 2026-10-31

The user requests the Thiếu Lâm selection avatar be corrected,the three permanent spawn sơn tặc removed,and creep nameplates replaced by an upcoming-wave notice. Selection now reuses the approved monk idle sprite. Regular matches publish no practice enemies; scheduled invasions and dungeon populations are retained. Historical combat test targets require explicit development-only `VOLAM_DEV_PRACTICE_CREEPS=1`,ignored in production. Creeps retain sprites,health bars and effects but no under-sprite text; player names remain. The next invasion creep type and warning names come from the same retained wave art manifest as the rendered creeps. Wave timing,combat,rewards and server authority are unchanged.


## M3C3 Thiếu Lâm — 2026-10-31

The user explicitly authorizes the fourth school: all13 canonical actives,both independent basics,Dịch Cân Kinh and both same-target Phát Động chains with retained supplied artwork and existing multiplayer/progression. The request cuts off before its Đao section; the five canonical CONTENT_DATA definitions are used. Bất Động retains the proposed healing pulse. Six-second per-step windows,out-of-order same-chain resets,unrelated-active/A preservation and all numerical profiles remain configurable proposals in `game-data/thieu-lam.ts`. Interrupt resistance blocks new stuns/hostile displacement,never all damage. Ally support never heals statue or revives. Exact mechanics/tests/art status:`docs/M3C3_IMPLEMENTATION.md`. M3D and later systems are outside this assignment.


## M3C1 Thiên Sơn — 2026-10-31

The director explicitly authorizes Thiên Sơn as the second playable school: both Phiến/Đao basics remain melee, all ten canonical actives, Bắc Minh automatic speed/attack-speed/crit growth, M3B ranks/points/arena-only loadouts, existing sprite/VFX integration and mixed Cái Bang multiplayer. Supplied Võ Đang/Thiếu Lâm assets are audited only; their combat, equipment, crafting, PvP, bosses and new environments remain outside this batch. Existing approved character bytes are retained, without artwork generation or new art approval claims.

Configurable M3C1 proposals: school base/growth/surplus and explicit skill ranks are in `game-data/thien-son.ts`. Directional actions capture facing, moving spins follow current owner position, and active timed actions block another combat action until completion. Phong Ảnh's one-second rank1 window starts at cast, evades one incoming enemy hit and counters only in range with clear terrain; unused windows expire. These resolve previously unspecified numeric/timing details without replacing the canonical mechanics. See `docs/M3C1_IMPLEMENTATION.md`; final balance and supplied skill-art director approval remain separate.

**Confirmed evidence policy (2026-10-30):** Follow `AGENTS.md` visual verification and recording policy. Routine development, asset generation and tests use lightweight PNG screenshots and live Phaser assertions/frame observations. Do not create video/animated-image evidence or run recording, encoding or conversion tools. Recordings require an explicit user request for the current task; preserve all existing recordings. Animation, transition, positioning and gameplay validation remain required.

## Menu-only dungeon entry — 2026-10-30

The user explicitly removes Dẫn Lộ / Dungeon Guide from the arena. Living players enter supported dungeons through the top-right Phó Bản menu from anywhere in the arena. No NPC interaction or proximity gate remains. Server phase, alive/arena membership, instance ownership/capacity and availability validation remain authoritative. The physical dungeon exit and existing arena return point (960,576) remain. This supersedes earlier Guide-entry requirements; no new destination or recall action is added.

## Arena and selector visual update — 2026-10-30

The user approves expanding the court by approximately 35–40% and approach roads by approximately 60%, removing the interior green tree and corresponding server collider, concentrating decoration at the perimeter, replacing the fixed damage toast with world-space authoritative target numbers and replacing the four selector thumbnails with separate original illustrations. Preserve statue position, approved character bytes, compact HUD/camera/controls and existing gameplay. Rừng Trúc private/shared entry remains supported; the other destinations/Boss remain unavailable. This authorizes the matching map-layout/collision edits, not new gameplay or automatic runtime visual approval. See `assets/arena_v2.manifest.json` and `docs/ARENA_VISUAL_V2_REVIEW.md`; director review remains pending.

## M2A creep dungeon request — 2026-10-30

The user explicitly authorizes M2A only: Guide interaction, the existing in-viewport selection overlay, separate private/shared creep zones, authoritative combat/rewards, physical exits, empty pause/resume and two-client isolation verification. Existing arena/HUD composition and controls remain. Existing assets/placeholders may be reused; this does not authorize bulk dungeon art or grant ART-01 runtime approval. Invasions, boss dungeons, crafting and additional school mechanics remain outside this task. Stop and report before M2B.

**PROPOSED implementation defaults:** one private instance per session and one shared instance per match; configurable two-second inter-wave rest and five-second full-HP/mana arena respawn with no EXP/gold penalty. `game-data/dungeon.ts` records provisional wave scaling. These foundation values do not settle final balance or reconnect/persistence questions. The already-confirmed short arena death recovery is included to avoid permanent-death softlocks in dungeon play.

## ART-01 arena/HUD replacement request — 2026-10-30

The current implementation request authorizes replacing the arena environment and HUD using `assets/concept/clean-arena-concept.png` and `arena-concept-1.png` (corrected filename). Preserve the approved Cái Bang assets/controls and all server rules. Remove merchant-building and dungeon-portal world visuals; retain their existing menus through compact utility buttons in order Settings, Quit, Phó Bản, Thương Gia, Lôi Đài. Use compact player, bag/gold and A/QWER overlays; the earlier minimap/status banner is superseded for this screen. No fake ranks, quick-item counts or later-milestone backend actions. Concepts approve direction only; runtime ART-01 director approval remains pending. No other schools or dungeon art expansion is authorized.

**How to read:** **CONFIRMED** reflects explicit user choices or explicit acceptance of earlier recommendations. **PROPOSED** is implementable tuning advice, not binding game design. **OPEN** means no choice was made. Do not conflate these statuses.

## Confirmed — fundamental

- Browser-first, keyboard-oriented deployment is the **recommended technology approach** pending technical implementation checks. **CONFIRMED visual direction:** 2D pixel art, orthographic **top-down/three-quarter elevated Pokémon-style overworld perspective** ("third-person from above"), with character bodies visible. Not a top-of-head-only bird's-eye view, not isometric, side-scroll or 3D third-person. No proprietary Pokémon graphics/assets. See `ART_ASSET_GUIDE.md`.
- **Max 6 players per independent match room**, player enters a nickname only; no accounts or persistent progression.
- Four launch schools: **Cái Bang**, **Thiên Sơn**, **Võ Đang**, **Thiếu Lâm**. Expand later.
- Arrow keys move, `A` manual normal attack, `Q/W/E/R` active skills. Mouse used for NPC, shop, menus, equip, skill UI; no mouse-targeted skills. Auto basic attack **OPEN** (manual first).
- Ranged basic attacks auto-aim at nearest eligible enemy at the moment of release, projectile flies straight and **does not track**; enemy can dodge. Melee basic attacks hit forward arc; non-primary enemies receive **reduced cleave** (exact percentage proposed).
- Characters start at level 1; **max level 30**; receive **one skill point at each level including level 1**. School stats and one innate passive automatically grow by level. Skills can be learned, leveled and freely remapped in arena, not inside dungeon/PvP. Four equipped active slots; equipped ultimate is optional. A separate swappable basic attack.
- Surplus skill points **after fully ranking current four equipped skills** convert automatically into school-specific stats; recalc on respec; no permanent stacking of respec bonuses.
- School innate passives: **Cái Bang = Tiêu Diêu Công** (Fire/damage/crit), **Thiên Sơn = Bắc Minh Thần Công** (Wind/speed/attack speed/crit), **Võ Đang = Thái Cực Tâm Pháp** (Yin–Yang/mana/efficiency), **Thiếu Lâm = Dịch Cân Kinh** (Gold/HP/defense). School style does not lock active skill mix.
- Thiếu Lâm Phát Động sequences require consecutive skills to **land on the same enemy**; secondary/cleaved hits count as hits on that enemy. Combo expiration/time window is tunable.
- Bosses resist disables strongly; status and crowd-control handling must be explicit.

## Confirmed — arena, PvE, rewards

- Central arena protects one statue; item/crafting and optional PvP NPCs remain planned. Dungeons are **separate map/zone instances selected through the Phó Bản menu from the arena**, with no Dungeon Guide. The player leaves via a **physical exit portal**, returns to the arena return marker and walks to the statue. No instant recall from a dungeon.
- **Private dungeon permits only one player**; shared permits up to six. **Creep dungeon** advances only after current wave eliminated, gets stronger with wave progression; pauses when empty. **Boss dungeon** contains fixed-power boss that may be farmed repeatedly; if dungeon is empty for 30 seconds, boss health and position reset. Boss respawns after a configurable cooldown when killed.
- Dungeon creeps and statue creeps scale in count and strength according to active player count. Snapshot player count for wave creation to avoid live HP jumps. Dungeon bosses have fixed difficulty within their configured dungeon, **not** endless per-clear scaling.
- Killing/meaningfully assisting on creeps grants eligibility; a **single fixed creep EXP pool is divided among eligible participants**. Boss dungeon: player who landed at least one valid hit qualifies for shared boss EXP, subject to presence at completion as a proposed implementation safeguard.
- Dungeon boss materials are personal rewards for every player who damaged the boss and remains in its instance at death, without rolls. Long Châu is granted once per character/boss/match. No resale/trading/transferable drops; see [inventory v2.0](ITEMS_AND_CRAFTING.md). Earlier single-item/roll encounter records are historical runtime contracts, not the future inventory design.
- Shop sells potions and basics; matching purchases upgrade basics to **level 5**. **Max basic + designated boss material + gold → one of three crafted branches**. Any school can equip any item; **4 fixed slots: weapon/armor/hat/boots**, no necklace. Backpack size OPEN.
- Hero death: short respawn at arena, no EXP or gold penalty.
- **20 regular invasions from west/east (two directions)** on exact 3-minute intervals, at 03:00 through 60:00. Waves spawn even with prior waves alive. Warnings 60s and 15s before each; players must travel back themselves. **Statue cannot be repaired**.
- Invasion creeps detect nearby players and **prioritize the closest player inside detection range**; when no players in range, move to/attack statue. If player leaves detection range, resume statue path. Detection and attack radii separate.
- After every fifth regular wave **is completely cleared**, wait a few seconds (PROPOSED 10s), then spawn one chapter boss in order: **Đông Tà → Tây Độc → Nam Đế → Bắc Cái**. Strict regular-wave clock continues concurrently. After the four chapter bosses are defeated and their prerequisites are satisfied, final boss **Vương Trùng Dương** spawns. Win when final boss defeated and statue still lives; lose if statue HP reaches 0.
- Invasion enemies/bosses drop **gold and EXP but no items**, including final boss for v1.
- **Solo win possible but deliberately very hard**; six-player cooperative mode must remain difficult and fair.
- PvP is a minor optional feature: NPC creates/joins a PvP room (within current match), players wait at side A or B, start after ready. Total players limited by match (1–6). No change to skills inside PvP. PvP rewards/open clock behavior are proposed, not hard requirements.

## Proposed defaults — tune or ask before finalizing

- Release tech: Phaser 4.2.x + TypeScript browser client, Colyseus 0.18.x Node TypeScript authoritative server, shared TS game core, Vite, pnpm workspaces, Vitest, Playwright, Tiled; no DB initially.
- Headless fixed tick at 20–30 Hz, render at display refresh; prediction/interpolation staged, avoid full rollback prematurely.
- 32x32 square pixel-art terrain tiles, 48x48 or 64x64 sprite frames, 4-direction initial animations mapped from 8-direction movement, integer zoom, feet-origin Y-depth sorting; exact dimensions/zoom not user-approved. NPC interaction by mouse (confirmed).
- Regular skill max rank 4; ultimate max 3; ult unlock at character levels 6/10/14; regular rank gating at 1/3/5/7.
- Melee basic primary target 100%, cleave target 50% by default, school-specific overrides, independent crit rolls.
- Invasion boss rest 10s after fifth wave fully clears; warnings at T-60 and T-15; raid clock never pauses.
- Starter backpack 12 slots remains a proposal; weapon/armor/hat/boots categories are confirmed by the 2026-11-02 inventory revision, superseding the old accessory examples.
- No PvP gold/EXP reward; PvP duels should have clear win/end behavior and no item loss.
- No elemental-counter chart initially; elements provide visual/school identity.
- Suggested 6-second Phát Động window, configurable; crowd-control reduction for bosses not yet numerically specified.

## Open decisions

See `OPEN_QUESTIONS.md`. Ask a targeted question only when implementing a feature that **cannot** proceed safely under a clearly labeled provisional default. Record decisions here when approved.

## Art pipeline clarification (2026-10-29)

**Approved camera/presentation:** orthographic 2D Pokémon-style elevated overhead/three-quarter pixel art. **Proposed production standards:** `ART_ASSET_GUIDE.md` supplies tile sizes, sprite dimensions, folder conventions, editable sources, sprite-sheet/atlas export, provenance and quality gates. It does **not** claim finished artwork exists or change any gameplay rule. M0 can use placeholders; M1 must test animation integration and explicitly flag missing final art.

## Visual quality lock (v1.3)

- **CONFIRMED:** detailed chibi wuxia 2D pixel-art visual style, using `assets/references/vo_dang_art_direction_reference.png` as PRIMARY aesthetic reference. See `ART_DIRECTION_REFERENCE.md`. Existing Pokemon-style overhead camera requirement remains unchanged.
- **CONFIRMED:** image is concept/reference only, not sprite atlas; must build coherent original transparent in-game assets. Approve Võ Đang sample before artwork is expanded to four schools.
- **PROPOSED / TO VALIDATE:** 64x64 sprite frame canvas, 32x32 tiles, 4 facing animations initially, actual zoom and in-game character footprint.

## Confirmed in-game UI presentation — 2026-10-29 (v1.4)

The user explicitly rejects the current Codex **split web-dashboard layout** (map on left, persistent stats/room/enemy cards on right). Once in a match, the *map/world should occupy the game view*, while hero HP/MP/level/EXP, statue/raid timing, hotbar, inventory, skill selection, shop, dungeon menu, crafting and optional PvP menus render **as HUD or overlays inside the game viewport**. Pre-match lobby can be separate. Refer to `UI_UX_SPEC.md`. Exact widget dimensions, minimap feature, additional keyboard menu shortcuts and specific UI art palette remain proposed/not user-approved. No effect on combat/gameplay authority.

## Confirmed v1.5 reference/UI update — 2026-10-29

The game director approved the expanded hub/battle, forest/desert/sea/hell and menu references as primary **direction**, not runtime artwork or authoritative numbers. Confirmed HUD patterns now include top-left hero, bottom-center A/QWER, bottom-right minimap, top-right system buttons and lower-left bag/gold. Exact dimensions/ornament remain subject to review. All menu windows stay within the game viewport. No gameplay rules or new dungeon/item implementations are approved by this UI task. Supplied-file naming discrepancies are recorded in `assets/references/README.md`; actual image contents guide interpretation. The one-Võ-Đang character art approval gate remains open.

## Character baseline approval — 2026-10-30

The director explicitly approved the current Cái Bang Bổng and Chưởng authored idle/walk/normal attacks as the initial visual quality baseline. Preserve their exact source/export bytes in assets/approved_cai_bang.lock.json. This does not approve fallback cast/hurt/death artwork or the existing environment/enemy/VFX placeholders. First Gemini intake batch requires separate visual approval; no gameplay or architecture change is authorized.


## Confirmed dedicated pre-game school selection — 2026-10-30

The current user correction supersedes school choices in the waiting lobby: **Landing (nickname only) → Room Browser (create/join) → Waiting Lobby (players/host/status) → host Start Game → dedicated School Selection → all confirmations → Main Arena**. School choices do not appear in the waiting lobby. Four canonical schools only: Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm. Duplicate school choices are allowed. Players can change choices until confirmation, then their choice is locked. Confirmation progress is server state.

The existing Colyseus room owns WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME, host ID, school IDs and confirmations. Only the host can request Start Game in the waiting lobby. Simulation/input and matchElapsedMs remain stopped until every participant is connected and confirmed. Players then spawn at level 1 with one point near the central statue in the same room, retaining their chosen school in both network/player state and the core hero. No persistent accounts or progression. Invasions are still an unimplemented M2 feature; future scheduling must use the IN_GAME clock origin, never room creation.

Disconnect safety: during selection retain a disconnected/unconfirmed participant and hold the barrier. Never auto-pick, expire, or silently start without that participant. Current clients can leave/recreate the room. Host migration, reconnect/rejoin grace, removal of absent participants and any timeout/auto-selection policy remain OPEN; no such policy is implemented. Waiting-lobby host loss disables starting; no silent host promotion.

School descriptions, passives and basic styles come from CONTENT_DATA.md. School-specific numeric starting values and starting skill assignments beyond the Cái Bang M1 prototype are not finalized; show that explicitly instead of inventing mockup statistics. Phase 1 stores/validates selections but does not implement M3 school combat or bulk school gameplay art: the existing M1 combat tuning and approved Cái Bang runtime visual fallback remain in the arena. Distinct school card portraits are concept illustrations only.

## M2B implementation scope — 2026-10-30

CONFIRMED by the explicit M2B assignment: enable server-owned statue invasions every 180 seconds from the IN_GAME origin, 60/15-second warnings visible across zones without recall, west/east enemies and overlapping waves, reusable player aggro, permanent statue HP damage, existing rewards and no-loss respawn, terminal basic defeat and in-viewport defense HUD. No bosses, full 20-wave catalogue, additional school mechanics or M2C are authorized by this task.

PROPOSED configurable prototype tuning (not final approved balance): statue HP2000; three walker recipes with per-lane counts 2/3/4, HP120/150/180, damage8/9/10 and speed46/48/50; later waves repeat recipe three. Scaling uses the existing BALANCING draft coefficients (+60% count, +16% HP, +8% damage per additional participant) sampled at spawn. Detect160/chase240, a three-second reacquire rest, pedestal footprint80x28, and the existing five-second arena respawn are testable defaults. Development timing/HP overrides are server environment only and ignored in production. Existing practice creeps remain distinct from invasion enemies. Details and measured limitations: docs/M2B_IMPLEMENTATION.md.

## Join after host school selection — 2026-10-30 correction

The user reported that a second player cannot join after the host starts/selects a school. Rooms now remain joinable with free seats in WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME. This supersedes the earlier start-time room lock. During initial selection, new entrants join the existing confirmation barrier. During active play, only the entrant sees school selection; they spawn once, at level 1 with one point and no XP/gold, after server-validated confirmation. Existing participants, progression, statue HP, dungeon state and invasion deadlines are preserved. Pending entrants cannot move, attack or enter dungeons and do not count as spawned simulation participants. Confirmed school choices remain immutable. Six-seat capacity and defeat closure remain enforced. This does not implement reconnect/progress recovery or host migration.

## M3A Cái Bang integration scope — 2026-10-30

CONFIRMED by the explicit M3A assignment: implement all ten canonical Cái Bang active mechanics, preserve both approved basic styles, integrate the supplied character/VFX artwork into actual server-authoritative gameplay, and reuse the system for future schools. Cầm Long remains pull + silence + disarm, without stun or prevented movement. Artwork never determines damage, range, RNG or combat timing. Existing controls, room/dungeon isolation and the compact HUD remain.

PROPOSED implementation tuning: rank-1 numbers for the eight newly implemented skills and Tiêu Diêu Công growth are configurable in `packages/game-data/src/cai-bang.ts`; the exact values and measured probes are documented in `docs/M3A_IMPLEMENTATION.md`. These are not approved final balance. Strongest nonstacking status magnitudes and same-source refresh are the current test policy. Successful control records meaningful-assist eligibility in the existing fixed EXP/gold pool, without adding damage or another reward pool.

The user permits a development-only testing loadout before M3B. The implemented adapter is server-flagged, ignored in production, Cái Bang-only and arena-only; it preserves resources, hostile statuses and per-ability cooldowns. The live preview uses actual server commands. This does not decide progression unlocks/ranks or implement full respec. Supplied art is produced, integrated and runtime verified; director approval of production animations remains pending. No other-school combat or M3B work is authorized by this milestone.

## M3B progression authorization — 2026-10-31

The explicit M3B assignment supersedes the previous stop gate for this milestone only. Implement Cái Bang's real earned-point progression, four-slot mixed-style builds, independent A, rank upgrades, free arena-only respec, automatic school/passive growth, surplus accounting and the existing in-viewport skill menu. Reuse M3A mechanics/art. Other-school combat remains unimplemented; normal rooms no longer give unsupported schools the historical free Cái Bang active defaults. Their old A prototype is not a completed school kit.

PROPOSED defaults, recorded before implementation in `docs/M3B_RULES.md`: normal ranks4 at1/3/5/7, ultimate ranks3 at6/10/14, one optional ultimate in any slot, no duplicate assignments; one point/rank. New Cái Bang players have empty active slots and one available point. Allocations belong to the current four-skill build; moving preserves rank, removing refunds it, reset retains slot choices at rank0. Existing cumulative60 EXP/level is capped at1740 for level30. Numeric growth, rank values, surplus coefficients and clamps remain configurable proposals, not final approved balance.

Cooldown debt follows canonical ability IDs across all build changes; A shares one cooldown across its choices. Upgrades/resets never shorten existing expiry or refill resources. Build commits cancel owned temporary effects and preserve hostile control. Earned=allocated+available+surplus; only a fully maxed four-slot build converts remaining points into surplus. Stats derive fresh from separate layers, never from previously accumulated totals. Server phase/zone/life, expected revision, monotonic sequence, ownership, gates, budget and slot rules validate every atomic commit. M3C is not authorized by M3B.

## Thiên Sơn runtime art approval — 2026-10-30

The director explicitly approved the final normal-zoom Thiên Sơn character result after the seven-check Phaser review (user: “approved, please proceed”). Approval covers both current fan/curved đao styles, four-facing idle/walk/normal attacks, 80 authored cels and their exact approved concept `assets/concepts/heroes/thien-son/thien-son-concept-v01.png`. Both runtime entries are `approved`; `assets/approved_thien_son.lock.json` locks source/export/concept bytes. Cast/hurt/death reuse is outside authored approval. This closes the requested character-art workflow; it does not authorize school combat abilities, balance changes, other schools or environment expansion.


## Võ Đang character art approval - 2026-10-30

The user explicitly approved the final four-facing idle, walk, Quyền and Kiếm character artwork after the saved Phaser review. Exact concept `assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png`, two editable sources, two PNG/JSON atlases, idle previews and80 frame PNGs are protected as89 files in `assets/approved_vo_dang.lock.json`. Both character runtime entries are approved. Preserve those bytes; revisions require a separate reviewed version. Cast/hurt/death aliases are outside authored-art approval. This approval does not implement school combat/passives, change server authority or authorize other-school/environment work.


## Võ Đang skill artwork final approval — 2026-10-31

The user explicitly approved all produced Võ Đang skill artwork and all13 production icons after the final Phaser review (user: “all approved”). Approval covers20 character/VFX components,636 exported cels/163 tags,33 editable Aseprite sources, the two unchanged approved normal-attack reuses and the disclosed optional shared straight-qi preview. Exact files are protected separately by `assets/approved_vo_dang_skills.lock.json`; the original89-file character lock is unchanged. Thái Cực Tâm Pháp remains icon-only. This is final artwork approval, not approval or implementation of Võ Đang mechanics, numerical tuning or gameplay integration. See `assets/reviews/skills/vo-dang/README.md`.

## Thiên Sơn skill artwork final approval — 2026-10-31

CONFIRMED by the director after the M3C1 runtime delivery: “skill artwork approved”. Approval covers the ten integrated Thiên Sơn active character/VFX sets and thirteen active/basic/passive icons, including disclosed supplied-frame reuse. `assets/approved_thien_son_skills.lock.json` records exact approved source/export bytes; current runtime integration metadata marks productionArtApproved true. Historical export-time manifests remain historical snapshots. The existing approved character baseline is unchanged. Missing authored baseline hurt/death frames, other-school/environment art and provisional numerical balance are outside this approval. Stop after M3C1.

## M3C2 Võ Đang — 2026-10-31

The explicit assignment authorizes Võ Đang as the third playable school: both Quyền/Kiếm basics, all ten canonical actives, Thái Cực Tâm Pháp, M3B ranks/points/surplus/arena-only respec, retained approved sprites/icons/VFX, shared three-school multiplayer and dev preview. Thiếu Lâm and later milestones remain out of scope. Existing approved art bytes are preserved.

PROVISIONAL configurable defaults: timed mana shield (the toggle question remains open), stationary caster-position formations with scheduled ticks, a single counter trigger that takes the incoming hit and requires survival, and the numeric rank/growth/proc/absorption data in `game-data/vo-dang.ts`. These do not finalize balance or replace canonical mechanics. See `docs/M3C2_IMPLEMENTATION.md`.


## 2026-11-01 — approved animation integration authorized

The director now explicitly authorizes integration on `wip/m3d/animation-change`, superseding the historical preview-only deferral in the animation-review-v01 register. All 13 approved selections retain exact approved artwork/choreography source hashes; no new artwork approval is requested. The register remains a historical record.

Confirmed mechanical changes: planted owner-only Liên Hoa protection with inside/outside/reentry checks; backward Phong Ảnh movement preserving facing and existing other effects; 5s initial sustained radial Vạn Kiếm; Tọa Sát up to 5s, 70% reduction, cumulative actual post-mitigation HP loss, strictly >20% max-HP trigger or expiry, and one radial reflection of that exact sum. Reflection cannot recursively proc reactive counters. Death, travel and removal cancel without reflection. No gameplay changes to visual-only skills or the three comparison skills.

Provisional Liên Hoa rank1 data: radius85, duration180ticks/6s, +8% maxHP/s, cooldown450ticks/15s (rank radius+5, regeneration+2 percentage points; existing rank cooldown progression retained). Vạn Kiếm duration150ticks/5s, 13 eight-way bursts at12tick/400ms spacing; not final balance. Tọa Sát retains prior base cooldown180ticks/6s and mana14, radius110 with existing +5 rank scaling; active guards reject recasts rather than refreshing/discarding accumulated damage. See `docs/ANIMATION_CHANGE_INTEGRATION.md`.

## 2026-11-01 — Hoàn Nhan Hồng Liệt v04 gameplay integration

The user authorized integration on `wip/m3d/hoan-nhan-hong-liet` only, from preview82eaa5ca and approvald62da39e. Retain A1's three simultaneous +/-18/0-degree600-unit server lines, enlarged front-only A2, actual0.8s lava dash/light v03 trail, walking infantry and simultaneous16-cannon grid with full crossings/drain. World marker coordinates replace preview screen fixtures. Existing private/shared dungeon authority, controls and rewards remain; loot items/rolls are unavailable in the backend and are not fabricated. HP/damage/cooldowns are explicitly provisional. Runtime rendering uses pinned retained art, disclosed missing-pose fallbacks and a newly composed modular headquarters map; runtime verification and art approval are separate. See `docs/HOAN_NHAN_HONG_LIET_RUNTIME.md`.

## 2026-11-01 — Kim Luân integration

Director-approved feedback_02 is integrated as destination kim_luan in the real Phaser/Colyseus dungeon system. Confirmed mechanics: both disciples must die before Kim spawns; Thiết Phiến3×4rays; Chấn Thiên280px; Thập Tầng strictly<30%, moving while firing five wheels/1.8s. Artwork remains locked. HP/damage/ward/solo rescue/loot values are explicitly trial tuning, not director balance approval. See docs/KIM_LUAN_RUNTIME.md.

## Tây Độc design approval / integration prompt — 2026-11-02

The director explicitly approves the Tây Độc feedback03 design, animation/VFX and choreography and requests an integration prompt, not runtime implementation in this turn. The approved preview is frozen in assets/reviews/tay_doc_v02/director_approval.json. Production gameplay, multiplayer acceptance, final HP/damage balance and runtime art approval remain separate.

Confirmed clarifications: Cổ Độc Khoan Tâm takes25% of maximum HP from the selected player; nearby allies receive only area damage/poison and never a new exploding mark. Phase2 uses only the new Cáp Mô kit. Previously created snake pillars and poison pools persist until destroyed/expired. Retain6pillars/8headings/1.35s shot cadence,8pools,180-degree frontal staff sweep,405stomp radius,feedback03 projectile speeds130.05/218.025 and484.5range. Scope and implementation handoff: CODEX_TAY_DOC_INTEGRATION_TASK.md. This approval does not approve every historical cel, missing directional art or hypothetical gameplay defaults.


## Tây Độc feedback03 — integration authorization (2026-11-02)

The director explicitly requested execution of `CODEX_TAY_DOC_INTEGRATION_TASK.md` on `wip/m3d/tay-doc`, superseding the historical prompt-only scope for this encounter. Retain the593locked art inputs; new missing directional cels remain candidates. Implement server authority and Phaser projection with no merge/push/deploy.

Confirmed: curse loses25%maximum HP, allies receive normal damage/poison without new marks, phase2 selects only the Cáp Mô kit and retains existing pools/pillars. Settlements sample maxHP at detonation/travel, bypass mitigation/shields/evasion/counters, preserve fractional HP and can kill. Death/disconnect cancel stale marks; travel settles before transfer without a cross-zone blast and refuses a lethal transfer. Full lifecycle and provisional numerical defaults are documented in `docs/TAY_DOC_INTEGRATION.md`; these do not replace the approved geometry/speeds or constitute final balance approval.

Production uses the minimal ordered wave10+clear+rest hook and waits for actual Đông Tà completion. The DEV spawn fixture leaves the180second invasion clock intact. No predecessor completion or other chapter boss was invented.
## Nam Đế gameplay confirmation — 2026-11-02
- Nhất Dương Chỉ loses 90% max HP; failed seal loses 70% max HP directly, bypassing armor/shields.
- QTE timeout: failure explosion + 70% max HP + 2s stun.
- Boss heals 10% max HP only on wrong key or timeout, capped at max.
- Runtime scope and provisional tuning: docs/NAM_DE_INTEGRATION.md. Final runtime art approval is still pending.

## Nam Đế milestone integration authorization — 2026-11-03
The user explicitly requests integration into milestone/m3d with only necessary tests, superseding the previous no-merge/worktree-only restriction. Retain the latest M3D controls, party/reconnect/economy and Đông Tà/Tây Độc rules. Nam Đế is gated after actual Tây Độc defeat plus wave15clear/rest, using the arena clock under the existing pause policy. Protocol24 retains prior fields. No new artwork, M4 migration or runtime art-approval claim is added. Exact merge scope/checks: docs/NAM_DE_M3D_MERGE_2026-11-03.md.
# Bắc Cái gameplay integration — 2026-11-02

Requested implementation uses the director-approved v03 visual with pure authoritative arena runtime, independent body/hazards/dialogue-vote channels and protocol18 zone-filtered public projection. The three final decisions (AoE clone still explodes, tie/zero wrong, tether endpoint death/leave/disconnect breaks) are implemented. Numeric tuning remains trial; final runtime/balance art approval is separate. Main-boss progression has only the minimal Bắc Cái gate/hook: earlier wave-boss adapters are absent, so natural campaign arrival remains a dependency, not a fabricated completed prerequisite. No other bosses, arena, item drops or invasion cadence change. See `docs/BAC_CAI_RUNTIME.md`.


## Confirmed wave boss feedback and VFX approval — 2026-11-03

Director approved `wave_boss_feedback_v01` and requested runtime integration plus the original feedback. All four wave bosses inherit the complete Đông Tà arena/recall/revive/statue protection/unlimited retry policy and Tây Độc overhead HP style. Bắc Cái’s pull is a quick visible tug followed by sustained pull+slow, with walking allowed and Shift locked. Mai also locks Shift while pulling and fires Ma Ảnh immediately afterward. Skill details and trial preview numbers: `docs/WAVE_BOSS_FEEDBACK_RUNTIME.md`. This supersedes historical Tây/Nam/Bắc no-recall/no-immunity/no-retry restrictions; dungeon rules, inventory-v2 and gold/XP-only wave rewards remain unchanged. Preview approval does not fabricate final in-game director approval.


## Approved cumulative wave boss feedback v02 — 2026-11-03

Latest preview approval explicitly authorizes Phaser/server integration of every remaining feedback item. The canonical complete ledger is `docs/WAVE_BOSS_FEEDBACK_V02_RUNTIME.md`; reviewed inputs are frozen in `assets/approved_wave_boss_feedback_v02.lock.json`. The latest Thiên Hạ has all9actors independently moving at random while spinning and damaging, replacing pull/slow/slam and stationary-center/orbit variants. Mai provides0.8s after a quick tug before Ma Ảnh and locks Shift5s. Nam sky density triples to96impacts inside arena; Phật Quang Phổ Chiếu uses one hand wave with target light and no connecting beam. All bosses, including dungeon bosses, shout special names as overhead text; normal attacks stay silent. Existing arena/retry/rewards/control rules persist. Numeric defaults remain trial; final in-game visual approval remains separate.


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

This canonical override supersedes V02 random burst counts and the old repeated wrong-clone punishment. Đông Tà, Tây Độc and Nam Đế each have twenty original Vietnamese combat lines, selected server-side from seeded shuffled decks without repetition until the pool is exhausted. First line after 6 seconds of combat, then every 8–10 seconds when an action gap permits; overhead chat lasts 4 seconds in its own lane alongside the retained skill shouts. Bắc Cái keeps his separate preference/dialogue mechanic and stays silent during Mục Hạ Vô Nhân.

Mục Hạ Vô Nhân keeps its approved split and five pair swaps. At reveal, players have exactly 5 seconds to land a valid guess. A clone hit causes one arena-wide explosion and ends the skill in that simulation tick; all simultaneous clone/real hits settle as one failure, regardless of target iteration order. A real-body-only hit ends it without explosion and cancels the deadline, including on the deadline tick. No valid hit by the deadline causes one explosion and immediate cleanup. No extra explosions after cleanup.

Tiểu Nhất Dương Chỉ always releases five straight golden projectiles, spaced 0.16 seconds, re-aiming at the selected player's current position at each release. Each shot flies straight afterward. Its independent server channel can run with all main skills, QTE and movement without replacing their cast or clocks. Trial repeat interval is 90 ticks / 3 seconds, first windup remains 17 ticks; repeated starts cannot duplicate an active burst. Death, no living players, wipe and encounter cleanup cancel pending shots. The main special animation retains priority while concurrent native gold projectiles render normally.

Approved V01/V02 PNGs, JSONs and preview source remain byte-exact. This update changes runtime behavior and text, not the frozen preview. The common arenas, rewards, dungeon life ledgers, controls and separate inventory-v2 scope remain as in V02. Matching protocol 29 services and a new room are required. Current implementation/validation: `docs/WAVE_BOSS_FEEDBACK_V03_RUNTIME.md`.

## Skill renovation v3 — 2026-11-06

The director accepted the v2 visual style, reported the Chiết Mai matte, Vạn Kiếm sustained-body fallback and Thất Tinh registration defects, and explicitly authorized the same graphical treatment for every other school and boss skill. This is presentation work: preserve actual skill descriptions, authoritative mechanics, captured aim, hit clocks, emission sockets and arena layouts. Replace cast bodies as well as VFX. New v3 raster outputs remain candidates for director review; authorization to produce/integrate is not final art approval. See `docs/RENOVATION_ALL_SKILLS.md`. Inventory-v2 remains a separate future migration.

### Confirmed 2026-11-06 — isolated skill review

The development skill-test room provides level 30, all own-school skills at maximum rank, and no skill cooldown. This is a server-only review exception; preserve normal-game progression, cooldowns, four active slots and authoritative combat. Requested VFX revisions preserve the old skill descriptions, hit counts and points of origin. See docs/RENOVATION_V4_SKILL_REVIEW.md.

## Creep abilities and timed invasion streams — 2026-11-06

CONFIRMED by the director: implement all approved creep suggestions (20 wave identities, 24 regular dungeon species, five boss-support types) and integrate into Phaser. Room creator selects 2/3/4 invasion gates; west/east remain, third adds north, fourth south. This supersedes the historical two-side-only count-based invasion rule. Keep 180-second wave starts; each streams for 60 seconds at a configurable rate. Trial defaults: one spawn per two seconds per gate before snapshotted player scaling. Pending stream spawns block chapter-clear gates. Specials target heroes; statue pressure remains normal attacks, with no repair or item drops. The DEV-only `VOLAM_DEV_CREEP_TEST=1` cycles 20 waves with shorter streams and invulnerability, disabling chapter bosses. Full scope, tuning, artwork reuse and verification: [creep upgrade](docs/CREEP_UPGRADE.md). No approval to merge or deploy is inferred.

## Director creep feedback r2 — 2026-11-06

North/south gates now require a clear footprint-wide corridor toward the statue, not merely an empty spawn point. Forward smash/slash/claw specials start at their caster and damage a forward capsule; heavy smash geometry increases 50%, other spreading skill radius/width and pattern extent double. Archer basic/special shot range is reduced 15%; melee basic reach doubles. Trúc Xà is fully ranged with poison+slow, Độc Chu keeps melee and web has a 25% one-second root, Sơn Viên stomps with 0.8s stun, Trúc Lâm Kiếm Khách gains 25% chance to reflect 50% of actual direct damage (no recursion), Mộc Linh becomes ranged. Sa Xà becomes ranged with slow; Xác Ướp basic cooldown is 36 ticks and has 25% root; Cự Nhân Sa Thạch basic punch stuns in AoE. Hải Xà becomes ranged and Độc thủy slows. Dung bạo radius is 144 (previously 72). Root blocks movement/dash/blink, permits attacks/casting, and respects expiry/control resistance. Numeric proc chances and durations are trial defaults. Prior r1 verification reports describe the old tuning; r2 evidence is stored separately.
# Creep preview sandbox — 2026-11-06

Director requested preview/testing one creep type at a time. Development-only `?creepPreview=1` creates an isolated server-authoritative room, gated by `VOLAM_DEV_CREEP_TEST=1`, with one selected profile, no timed invasions, host-only controls, normal/signature/death testing and actual movement/statuses. All 49 current profiles are selectable. Normal room rules and canonical combat tuning remain unchanged. Protocol33; see `docs/CREEP_PREVIEW.md` for fixture defaults and limitations.
## Creep preview feedback r3 — 2026-11-06

Latest director override: target-point purple burst for Thổ Phỉ,180° frontal high-damage Hoành trảm, target-foot blood drain for Tà Tăng, active target-point poison lob for Cương Thi, target-foot puddle for Thủy Quỷ, torso-origin archer presentation, and removal of the listed generic crimson strips. Khô Lâu Kiếm Sĩ, Mông Cổ infantry and Ác Khuyển retain normals only. This supersedes their earlier generic forward-line/death-pool/signature definitions. Trial coefficients and exact changes: `docs/CREEP_FEEDBACK_R3.md`.

## Creep feedback r4 — 2026-11-06

Director removes generic purple pre-cast circles/semicircles for every creep. Released purple effects remain skill effects. Thi độc becomes a delayed area placed directly at captured target feet, replacing the r3 projectile/landing delivery and obsolete death pool; coefficients/radius/duration remain unchanged. This supersedes earlier purple telegraphs and Thi độc lob rules. See `docs/CREEP_FEEDBACK_R4.md`.

## Creep feedback r5 — 2026-11-06

Sơn Tặc Đao has normal Chém đao only; Hoành trảm is removed. Remove the shared caster-origin contact explosions for all creep melee/skill presentation, including instant self stomp/ring stamps. Real target-point effects, projectiles, persistent fields and deliberate self-destruction/death explosions remain. Other skill geometry and damage do not change. See `docs/CREEP_FEEDBACK_R5.md`.

## Review Thiên Sơn — 2026-11-09

Phong Ảnh Hoán Vị giữ hướng nhìn và lướt lùi bằng đúng tầm tiến của Phi Ảnh Trảm cùng bậc (150/158/166/174 px khi không vướng địa hình). Liệt Phong Đao dùng các pose nâng/chạm/thu đao theo hướng trái của bộ M3D đã duyệt; hiệu ứng đao tụ phản chiếu theo hướng ngang, không đổi nhịp đánh của server.

Hướng art yêu cầu cho lượt duyệt: Lưu Phong Bộ sẽ thành **Bạo Vũ Cuồng Phong**, phóng vòng quạt gió xoay, gây sát thương và làm chậm, tiêu mana và có thể bấm lần nữa để thu; **Bách Liệt Thiên Kích** tách bốn bóng ra bốn hướng rồi cùng chém liên tục vào giữa. Phạm vi lượt này ở hai mục đó là tạo artwork ứng viên.

Director đã duyệt bản phóng quạt Bạo Vũ Cuồng Phong. Với Bách Liệt Thiên Kích, bốn bóng tách xa nhau theo hai đường chéo thành chữ X rồi chém dồn dập. Các đao khí bán nguyệt màu xanh có nhiều dáng, bay xa hơn và đi xuyên qua vị trí mục tiêu ở tâm. Director duyệt artwork bản chữ X với 8 đợt cách nhau 210 ms và tầm bay thử 160 px. Bước tích hợp Phaser được để lại theo yêu cầu.

Director chọn mẫu A **Hàn Nguyệt** và yêu cầu tích hợp bộ đã duyệt vào Phaser. Đao dùng bộ đứng, đi và vung đao ở bốn hướng. Bạo Vũ Cuồng Phong thay Lưu Phong Bộ, giữ ID ô kỹ năng và tốn nội lực ở lượt phóng. Bấm cùng phím để thu quạt theo hướng chốt tại lúc bấm. Bách Liệt Thiên Kích phóng tám đợt đao khí xuyên tâm theo đường bay server tính, mỗi cung có thể trúng một mục tiêu một lần. Số sát thương, làm chậm và thời gian giữ quạt là thông số thử. Director yêu cầu bỏ qua chạy test.

## Thiên Sơn · Tam Liên Trảm và Bạo Vũ Cuồng Phong — bản duyệt M3D

Thiên Sơn Đao đánh thường bằng từng lần bấm A, bỏ hồi chiêu đòn A, chọn một trong ba nhát ngẫu nhiên và hiện đao ảnh. Một đòn A hoặc Phi Ảnh Trảm gây sát thương cộng tối đa một điểm. Phản kích trúng từ Phong Ảnh Hoán Vị cũng cộng một điểm. Đổi mục tiêu riêng xóa chuỗi cũ. Quái đợt và quái phụ bản dùng chung chuỗi. Đủ sáu điểm mở HUD phím S trong hai giây. Tam Liên Trảm thực hiện hai đường lướt chữ X và một đường từ trên xuống qua tâm, có gió và hoa đào. Kể từ lúc dùng chiêu, 10 giây hồi chiêu phải kết thúc trước khi đòn trúng bắt đầu tích lại. Hết cửa sổ QTE xóa điểm.

Bạo Vũ Cuồng Phong duy trì một vòng quạt xoay cho đến lúc thu xong. Vòng gây sát thương, làm chậm và hao mana định kỳ. Tái kích hoạt để thu vòng, sau khi về tay bắt đầu hồi đúng hai giây. Thông số thử gồm 2 mana mỗi 5 tick và tự thu khi không đủ mana trả nhịp kế tiếp.

Director duyệt bản Phaser sau khi chỉnh chiều đao ảnh, hạ vệt phải → trái khỏi mặt nhân vật và đặt HUD Tam Liên Trảm 200 × 46 px phía trên thanh kỹ năng. Đưa bộ Thiên Sơn đã duyệt vào `milestone/m3d` và chạy kiểm tra.

## VFX Hoàn Nhan Hồng Liệt v05 · 2026-11-13

Director approved the v05 preview of Dung Nham Liệt Địa, Vạn Lý Nham Hỏa, Hỏa Sơn Bạo Phát, Liệt Diễm Phong Tỏa and Hoành Tảo Đại Đao. The live match renderer loads v05 by default. Server cue geometry and combat rules continue to govern all five abilities. [Editable source, atlas and review notes](assets/source/bosses/hoan_nhan_hong_liet_vfx_v05/README.md).


## 2026-11-23 — approved skill revise integration

The director authorized the twelve-branch revision and selected the crescent Phong Quyển projectile. [Canonical integration contract and trial tuning](docs/SKILL_REVISE_INTEGRATION_2026_11_23.md) supersede the older skill behavior in this scope. Stable IDs, server authority and unrelated campaign/economy rules remain in force. Old active Q Ngũ Lôi stance is replaced by a reactive passive; E Lôi Đình Chấn Vực is a rename only. Gameplay feel awaits the director’s Phòng test review.
