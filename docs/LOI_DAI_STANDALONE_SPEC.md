# Đặc tả Lôi Đài độc lập

Ngày tổng hợp: **2026-11-19**.

Trạng thái thiết kế: **đã chốt phạm vi trong chat**. Người dùng đã duyệt bộ concept và yêu cầu triển khai trên `wip/m3d/pvp` ngày 2026-11-19. [Bản tích hợp và bằng chứng kiểm tra](LOI_DAI_STANDALONE_IMPLEMENTATION.md) ghi trạng thái thực tế, artwork và các mặc định triển khai. Checklist dưới đây giữ yêu cầu gốc; chỉ kết quả kiểm chứng được dẫn mới là bằng chứng nghiệm thu.

## 1. Phạm vi

Lôi Đài là tính năng độc lập, tồn tại song song với Defense, có phòng riêng và link mời riêng. Không có hai chế độ 1v1/loạn chiến riêng: tất cả dùng một luật đấu hai phe. Chủ phòng muốn 1v1 thì xếp mỗi phe một người.

| Hạng mục | Luật |
| --- | --- |
| Sức chứa | Tối đa **8 người/phòng**, gồm chủ phòng, đấu thủ và khán giả |
| Nhóm | **Chính**, **Tà**, **Khán giả** |
| Đội hình | Mỗi phe tối đa **4 người**; cho phép lệch quân số |
| Chủ phòng | Chọn map, bật/tắt hiểm họa, chia phe, bắt đầu ván, chia sẻ link |
| Người mới vào | Luôn ở Khán giả |
| Lưu trữ | Chỉ trong vòng đời phòng; không lưu tiến trình nhân vật lâu dài |

Tài liệu [Lôi Đài Hồng Mộc hiện có](LOI_DAI.md) mô tả phần nằm trong Defense. Đặc tả mới không tự thay đổi luật của phần đó. Tái sử dụng map/art/mechanics cần đối chiếu khi được phép triển khai; không kế thừa tự động luật cấp 6, giữ tài nguyên lúc vào, hồi sinh sau 3 giây hay tạm dừng đồng hồ Defense.

Không bao gồm danh sách phòng công khai, mật khẩu, chat, xếp hạng hoặc thành tích lâu dài. Việc lưu tài liệu ban đầu chưa cấp phạm vi triển khai; yêu cầu triển khai và duyệt concept sau đó được ghi trong báo cáo tích hợp.

## 2. Thuật ngữ và luật thắng

- **Hiệp:** một lần hai phe giao chiến, tối đa **3 phút**.
- **Ván:** chuỗi hiệp; phe đạt **3 hiệp thắng** trước sẽ thắng ván.
- **Ready:** đã chọn đủ phái và hệ phái, đủ điều kiện được chủ phòng xếp phe.

Một ván có tối đa **5 hiệp phân thắng thua**. Hiệp hòa không cộng điểm và đánh lại, nên số lượt giao chiến thực tế có thể lớn hơn 5.

| Tình huống | Xử lý |
| --- | --- |
| Một phe còn người sống, phe kia hết người | Phe còn người thắng hiệp |
| Hai phe cùng hết người trong một nhịp xử lý | Hòa, không cộng điểm, đánh lại |
| Hết 3 phút mà chưa phân thắng thua | Hòa, không cộng điểm, đánh lại |
| Một phe đạt 3 hiệp thắng | Kết thúc ván, mọi người trở về màn hình chia phe |
| Đấu thủ rời/mất kết nối trong ván | Cả phe thua cả ván ngay; xem mục 6 |

## 3. Sảnh chờ, chọn nhân vật và chia phe

- Người tạo phòng cũng bắt đầu ở **Khán giả**.
- Người chơi chọn phái và hệ phái tại sảnh. Chưa chọn đủ thì **chưa ready**, chỉ xem và không thể bị kéo vào Chính/Tà.
- Chọn đủ thì tự được tính là ready; không cần cộng điểm kỹ năng.
- Chỉ chủ phòng kéo người đã ready giữa các nhóm, chỉnh cài đặt và bắt đầu ván.
- Người không phải chủ phòng nhìn thấy đội hình và phe của mình. Ngoài chọn nhân vật của bản thân và Thoát, họ không thao tác chia phe/cài đặt/bắt đầu ván.
- Điều kiện bắt đầu: mỗi phe ít nhất một người hợp lệ và không quá bốn người.
- Khóa đội hình trong cả ván. Người mới vào giữa ván chỉ xem, chờ ván kết thúc mới được xếp phe.
- Ván kết thúc thì trở về chia phe, chủ phòng có thể chuẩn bị ván mới.

### Luồng chủ phòng

1. Menu chính → Lôi Đài → Tạo phòng → Chọn map → Màn hình chia phe.
2. Ban đầu chỉ có chủ phòng, ở Khán giả.
3. Nút **Cài đặt** mở chọn map và bật/tắt hiểm họa; nút **Share link** dùng mời người khác.
4. Người khác vào phòng và chọn phái/hệ; chủ phòng kéo người hợp lệ sang Chính/Tà.
5. Chủ phòng Start; các hiệp tự tiếp nối đến khi kết thúc ván.
6. Trở lại chia phe khi ván kết thúc. Chủ phòng rời thì giải tán phòng.

### Luồng người tham gia

1. Menu Lôi Đài hoặc link mời → Vào phòng ở Khán giả.
2. Thấy map hiện tại; chọn phái/hệ để ready.
3. Được chủ phòng xếp vào Chính/Tà.
4. Start → khóa điều khiển, đếm **1 → 2 → 3** → bắt đầu hiệp.
5. Chết trong hiệp thì xem phần còn lại, trở lại thi đấu ở hiệp tiếp theo.
6. Ván kết thúc thì trở về màn hình chia phe.

## 4. Trình tự hiệp đấu

1. Đưa đấu thủ về vị trí bắt đầu hiệp.
2. Đếm **1 → 2 → 3**. Trong giai đoạn này không được di chuyển hoặc dùng kỹ năng.
3. Mở điều khiển và bắt đầu đồng hồ **3 phút**.
4. Người chết chuyển sang xem, không hồi sinh trong hiệp; đồng đội còn sống tiếp tục đấu.
5. Hiệp kết thúc thì cập nhật tỷ số, tự chuyển sang hiệp tiếp theo nếu chưa kết thúc ván. Không cần chủ phòng bấm tiếp tục.
6. Sau khi ván phân thắng thua, mọi người trở lại chia phe.

Khán giả ở sảnh chờ có thể xem trực tiếp diễn biến trận đấu. Người đã chết và khán giả không tác động lên trận.

## 5. Nhân vật và chiến đấu

- Tất cả đấu thủ ở **cấp 30**.
- Toàn bộ kỹ năng thuộc phái/hệ đã chọn đạt cấp tối đa, không cần cộng điểm.
- Không tính trang bị; không có bình máu hoặc bình mana.
- Không mang buff từ Defense vào. Cách xử lý buff/nội tại do bộ kỹ năng tự tạo được ghi riêng tại mục 12, tránh coi đề xuất là luật đã duyệt.
- Hiện tại **chưa thêm hệ số sát thương PvP riêng**.
- Giữ điều khiển bàn phím/chuột hiện có của bản game; tài liệu này không sửa mapping hoặc cơ chế chọn mục tiêu.
- Giữ server authority đối với di chuyển, va chạm, kỹ năng, tài nguyên, sát thương, RNG, cái chết, thời gian, đội hình, tỷ số và kết quả. Không tin sát thương/vị trí/kết quả do client tự gửi.
- Phần mô phỏng trong game-core tiếp tục độc lập với Phaser, Colyseus, DOM và UI, có RNG seed và kiểm chứng xác định.

## 6. Thoát và mất kết nối

| Người rời/mất kết nối | Kết quả |
| --- | --- |
| Đấu thủ trong ván, kể cả chủ động Thoát | **Cả phe thua cả ván ngay**, không chỉ thua hiệp |
| Khán giả | Trận tiếp tục |
| Chủ phòng, dù đang đấu hay xem | Giải tán phòng, tất cả rời phòng |

Không chuyển quyền chủ phòng. Nếu người rời vừa là đấu thủ vừa là chủ phòng, áp dụng giải tán phòng.

## 7. Năm map và hiểm họa

Chủ phòng chọn map, có lựa chọn **tắt hiểm họa**.

| Map | Nội dung đã chốt |
| --- | --- |
| **Lôi Đài hiện có / Hồng Mộc** | Một map trong danh sách; dùng phần Lôi Đài hiện có làm cơ sở, kiểm kê phần tái sử dụng |
| **Rừng Trúc** | Dựa trên dungeon Rừng Trúc, yêu cầu không gian đấu rộng; kích thước cụ thể chốt khi duyệt bố cục. Phi tiêu ngẫu nhiên, **không cảnh báo trước** |
| **Địa Ngục** | Đỉnh núi giữa nham thạch. Vùng an toàn thu nhỏ, phần ngoài biến thành nham thạch. Đứng trong nham thạch mất máu dần; vẫn có thể đi bộ/lướt về phần núi còn an toàn |
| **Thành Tương Dương** | Tên lửa bắn ngẫu nhiên vào đài, người chơi phải né |
| **Kiếm Hồ** | Độc Cô Cầu Bại đứng giữa, là NPC bất tử gây hiểm họa; hai chiêu: **chém nửa bản đồ** và **gọi sét xuống nhiều điểm**. Cả hai có cảnh báo trước |

Tắt hiểm họa: không có phi tiêu, tên lửa, sát thương nham thạch hoặc đòn tấn công NPC ảnh hưởng đấu thủ. Cách thể hiện vùng núi khi tắt hiểm họa được chốt tại bước thiết kế map.

## 8. Lịch sử phòng

- Giữ tối đa **30 entry hạ gục mới nhất**, thể hiện ai giết ai.
- Chết do hiểm họa ghi nguồn **Môi trường**, không quy công cho người gây sát thương gần nhất.
- Phi tiêu, nham thạch, tên lửa và Độc Cô Cầu Bại thuộc nguồn môi trường.
- Không thống kê assists; không lưu lịch sử kết quả hiệp/ván.
- Tỷ số ván hiện tại chỉ phục vụ ván đang diễn ra.
- Phòng giải tán thì lịch sử bị xóa; không cần giữ qua khởi động lại server.

## 9. Checklist artwork cần duyệt

Đây là danh mục **bộ artwork**, chưa phải số lượng file/frame cuối cùng. Nhân vật các phái và VFX đã duyệt được ưu tiên tái sử dụng; phải kiểm kê thực tế trước khi quyết định bổ sung. Không tự coi asset hiện có là đã được duyệt cho mọi mục đích mới.

11 concept trong [bộ artwork V01](../assets/concepts/loi-dai-standalone-v01/README.md) đã được người dùng duyệt. Checklist art dưới đây giữ cổng nghiệm thu sản xuất gốc; PNG/frame, provenance và ảnh runtime hiện có được dẫn trong [bản tích hợp](LOI_DAI_STANDALONE_IMPLEMENTATION.md). Duyệt concept và duyệt render cuối được ghi riêng.

### 9.1. Môi trường và hiểm họa

- [ ] **Lôi Đài Hồng Mộc:** kiểm kê nền, ranh giới, vật cản, điểm xuất hiện; xác định phần giữ lại/nâng cấp cho đấu đội.
- [ ] **Rừng Trúc:** nền, trúc, lớp che phía trước, đá/đạo cụ, ranh giới, bố cục rộng và điểm xuất hiện hai phe.
- [ ] **Phi tiêu:** sprite, đường bay, va chạm; không có cảnh báo trước.
- [ ] **Địa Ngục:** đỉnh núi, các trạng thái nền thu hẹp, mép đá/vết nứt và nham thạch.
- [ ] **Chuyển tiếp Địa Ngục:** nền thành nham thạch, hiệu ứng gây sát thương và khả năng nhận biết đường về vùng an toàn.
- [ ] **Thành Tương Dương:** nền đài, tường/cổng thành, đạo cụ và ranh giới.
- [ ] **Tên lửa:** sprite, đường bay, va chạm, lửa; cơ chế cảnh báo còn cần chốt.
- [ ] **Kiếm Hồ:** hồ, nền đấu, bờ, kiếm trang trí và bố cục trung tâm dành cho NPC.
- [ ] **Độc Cô Cầu Bại:** thiết kế nhân vật, idle và hoạt ảnh hai chiêu.
- [ ] **Chém nửa map:** vùng cảnh báo và VFX đòn chém.
- [ ] **Sét nhiều điểm:** vùng cảnh báo, sét và va chạm mặt đất.
- [ ] **Sảnh/người xem:** cách thể hiện khu chờ/quan sát nếu dựng trong thế giới.

### 9.2. UI và VFX chung

- [ ] Thumbnail năm map; trạng thái map đang chọn và bật/tắt hiểm họa.
- [ ] Nhận diện Chính/Tà/Khán giả, chủ phòng, ready/chưa ready.
- [ ] Ô người chơi và trạng thái kéo thả hợp lệ/không hợp lệ.
- [ ] Chọn phái/hệ; kiểm kê khả năng dùng lại chân dung/icon hiện có.
- [ ] HUD tỷ số, đồng hồ, người còn sống và trạng thái khán giả.
- [ ] Đếm **1 → 2 → 3**, thông báo thắng/thua/hòa hiệp và thắng/thua ván.
- [ ] Lịch sử hạ gục và nguồn Môi trường.
- [ ] VFX xuất hiện đầu hiệp, bị loại, thắng hiệp/ván; ưu tiên asset đã duyệt.

### 9.3. Cổng duyệt art

- [ ] Đọc [quy tắc UI](../UI_UX_SPEC.md), [định hướng art](../ART_DIRECTION_REFERENCE.md), [chuẩn sản xuất](../ART_PRODUCTION_STANDARD.md), [hướng dẫn asset](../ART_ASSET_GUIDE.md) và inspect các reference bắt buộc trong [AGENTS.md](../AGENTS.md) trước công việc art/UI tương ứng.
- [ ] Duyệt bố cục năm map: vùng đấu, vật cản, điểm xuất hiện và phạm vi hiểm họa.
- [ ] Hoàn thiện một màn hình mẫu **hero + môi trường + HUD** theo cổng ART-01 trước khi mở rộng sản xuất.
- [ ] Kiểm tra mẫu trong Phaser ở zoom chơi thật và nhận duyệt chất lượng từ người dùng/director.
- [ ] Có sprite/tileset PNG thực, metadata và manifest nguồn/license; không dùng procedural Graphics hoặc hình khối thô làm final art.
- [ ] Giữ góc nhìn orthographic ba phần tư từ trên xuống, không xoay camera; xếp lớp theo chân/Y-depth.
- [ ] Kiểm tra frame, timing, facing, pivot, chuyển tiếp và độ đọc của hiệu ứng trong client thật.
- [ ] Có đối chiếu reference và PNG evidence thực tế. Không quay video/GIF hoặc tạo recording khi chưa được yêu cầu riêng.
- [ ] Chỉ sản xuất số lượng lớn map/hiệu ứng sau khi mẫu đạt duyệt.

## 10. Checklist màn hình và overlay

- [x] **Menu chính — cập nhật:** hai lối vào Defense và Lôi Đài.
- [x] **Menu Lôi Đài — mới:** tạo phòng, vào phòng bằng mã/link; link mời vào đúng phòng.
- [x] **Tạo phòng/chọn map — mới:** chọn map ban đầu rồi chuyển đến chia phe.
- [x] **Chia phe — mới:** Chính/Khán giả/Tà, chọn phái/hệ, ready, kéo thả của chủ phòng, Start, Cài đặt, Share link và Thoát.
- [x] **Cài đặt phòng — overlay:** chọn map và bật/tắt hiểm họa; chỉ chủ phòng chỉnh.
- [x] **Trận đấu — biến thể gameplay:** map chiếm toàn viewport, HUD hai phe, tỷ số, thời gian và người còn sống.
- [x] **Xem trận — trạng thái của màn hình trận:** khán giả/người chết xem trực tiếp, không điều khiển đấu thủ.
- [x] **Chuyển hiệp — overlay:** kết quả hiệp, tỷ số và đếm 1–2–3.
- [x] **Kết thúc ván — thông báo:** phe thắng rồi quay về chia phe; không tạo lịch sử kết quả.
- [x] **Lịch sử hạ gục — overlay:** tối đa 30 entry của phòng.
- [x] **Lỗi/vòng đời phòng:** link không hợp lệ, phòng đầy, phòng đã đóng/chủ phòng rời và đường quay về menu Lôi Đài.

Sau khi vào trận phải có **một viewport game chủ đạo**. HUD và menu ở trong viewport; không có cột dashboard bên ngoài, page title/footer cố định hoặc thu nhỏ map để dành chỗ cho UI. Màn hình chia phe trước trận có thể tách riêng; khi xem trận vẫn phải thấy diễn biến trực tiếp. HTML/DOM overlay bên trong viewport được phép.

## 11. Checklist nghiệm thu

Đây là danh sách tiêu chí gốc. [Báo cáo tích hợp](LOI_DAI_STANDALONE_IMPLEMENTATION.md) dẫn kết quả đã chạy và giới hạn kiểm chứng; không suy ra art approval chỉ từ test tự động.

- [ ] Defense/Lôi Đài có luồng phòng riêng; link mời vào đúng phòng.
- [ ] Server kiểm soát giới hạn 8 người/phòng, 4 người/phe và quyền chủ phòng.
- [ ] Người chưa chọn phái/hệ không được xếp phe; chọn đủ thì ready.
- [ ] Cho phép lệch quân số, chặn Start khi một phe trống.
- [ ] Người mới vào giữa ván chỉ xem; đội hình khóa suốt ván.
- [ ] Đấu thủ cấp 30, kỹ năng tối đa, không có tác dụng trang bị/bình máu/bình mana từ Defense.
- [ ] Countdown 1–2–3 khóa di chuyển/kỹ năng trên server; đồng hồ 3 phút bắt đầu sau countdown.
- [ ] Người chết chỉ xem, không hồi sinh trong hiệp.
- [ ] Hết người thua hiệp; cùng chết hoặc hết 3 phút thì hòa, đánh lại và không cộng điểm.
- [ ] Phe đạt 3 thắng kết thúc ván; hiệp hòa không chiếm giới hạn 5 hiệp phân thắng thua.
- [ ] Hiệp tự chuyển; hết ván trở về chia phe.
- [ ] Đấu thủ rời/mất kết nối khiến cả phe thua ván; khán giả rời không ảnh hưởng trận.
- [ ] Chủ phòng rời giải tán phòng cho mọi người, không chuyển quyền.
- [ ] Năm map và bật/tắt hiểm họa hoạt động đúng đặc tả.
- [ ] Phi tiêu không cảnh báo; hai chiêu Độc Cô Cầu Bại có cảnh báo; NPC bất tử.
- [ ] Nham thạch gây mất máu dần và cho phép đi bộ/lướt trở lại vùng an toàn.
- [ ] Hiểm họa có attribution Môi trường; lịch sử giữ 30 entry mới nhất và mất khi đóng phòng.
- [ ] Không lưu assists/kết quả lâu dài; không lưu tiến trình nhân vật.
- [ ] Gameplay/xem trận dùng viewport chủ đạo và menu bên trong.
- [ ] Art có nguồn/license, duyệt chất lượng, kiểm chứng frame và quan sát trong Phaser; không có recording ngoài yêu cầu riêng.

## 12. Đề xuất và chi tiết còn cần duyệt

Các mục dưới **chưa phải quyết định đã duyệt**, không được âm thầm biến thành luật chính thức:

- Không gây sát thương đồng đội.
- Đầu mỗi hiệp: đầy HP/mana, xóa trạng thái hiệp trước, hồi toàn bộ cooldown và đặt lại hiểm họa/vùng an toàn.
- Buff/nội tại do bộ kỹ năng tạo ra vẫn hoạt động; phân biệt với buff từ Defense mang vào.
- Chỉ thay đổi map/tùy chọn hiểm họa tại màn hình chia phe.
- Giữ hay xóa đội hình/lựa chọn nhân vật sau khi kết thúc ván.
- Quyền vào lại của người rời/mất kết nối; không đảo ngược kết quả xử thua đã xác lập.
- Kích thước map, vật cản, điểm xuất hiện và camera xem trận.
- Tần suất, tốc độ, sát thương và cảnh báo của hiểm họa; riêng phi tiêu và hai chiêu NPC đã có quyết định cảnh báo tại mục 7.
- Nhịp thu vùng an toàn, sát thương nham thạch và hình thức map khi tắt hiểm họa.
- Thời gian chuyển hiệp/thông báo kết thúc ván; thứ tự xử lý các sự kiện biên cùng thời điểm.

## 13. Tài liệu liên quan và giới hạn kiểm chứng

- [Lôi Đài Hồng Mộc hiện có](LOI_DAI.md).
- [Quyết định dự án](../DECISIONS.md) và [thiết kế tổng thể](../GAME_DESIGN.md).
- [Bối cảnh M3D](M3D_INTEGRATION_MEMORY.md).
- [Bài học thực thi](SESSION_EXECUTION_LESSONS.md) và [quy trình kiểm chứng](DEVELOPMENT_WORKFLOW.md).

Khi được yêu cầu triển khai, đối chiếu các tài liệu trên và các quy chuẩn art/UI trước khi quyết định tái sử dụng. Quy tắc mới chỉ áp dụng cho Lôi Đài độc lập, không tự sửa luật Defense. Việc lưu tài liệu ban đầu chưa phải bằng chứng kiểm chứng hoặc art approval. Trạng thái triển khai sau yêu cầu của người dùng và kết quả hiện tại xem báo cáo tích hợp.
