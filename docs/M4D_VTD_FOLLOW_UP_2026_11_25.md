# M4D — Bắc Đẩu, luyện Thất Tuyệt và đuôi rồng · 2026-11-25

Checkout `milestone/m4d`, protocol **53**. Phản hồi mới yêu cầu nhiều sao hơn, ánh sáng gây damage di chuyển rõ, mode test riêng Thất Tuyệt, boss không áp sát khi còn Cửu Âm và đuôi rồng hoàn chỉnh. Các con số dưới đây là tuning của bản test hiện tại, không tự coi là final balance/art approval.

## Đầu rồng Bắc Cái

Bản v04 lấy phần đầu/cổ từ master lớn nên đuôi có mép phẳng. v05 vẽ lại **toàn bộ silhouette**, giữ đầu rồng ngọc lục/vàng, đuôi khí uốn và thuôn thành các ngọn riêng; không cắt bớt sừng/râu để nối đuôi. Export native1774×887, origin (0,8;0,5) gần đầu, width132 và scale đồng đều theo tỉ lệ ảnh. Chỉ thay đạn chưởng `palms`, giữ luồng dài/vòng lửa v04.

Nguồn và prompt nguyên văn ở `assets/source/effects/bac_cai_m4d_v05`; retained export/manifest ở `assets/exports/effects/bac_cai_m4d_v05`. Raw master không đổi. Cleanup chỉ loại alpha dưới4/255 ở vùng trong suốt; silhouette không repaint/crop. Bốn mép có alpha0, bounds alpha≥16 là (104,131)–(1705,749). Helper prepare kiểm tra master/export hashes, PNG RGBA/dimensions và copy đúng bytes. Đây là candidate cho director test; không thay approval byte của v04.

## Bắc Đẩu Kiếm Trận

28 sao = bốn cụm ×7 quanh tâm sân, spread130/85. Có một Thiên Quyền (index3), vẫn dùng Tam Thanh Phá Trận để phá và mở cửa hở đòn. Các sao có footprint12 hợp lệ trên cả ba map; đã kéo cụm vào để tránh cell collision mép nước Tụ Hiền Trang.

Mỗi nhịp bắn bốn luồng sáng đồng thời theo cạnh của bốn cụm, sau đó bốn cạnh nối cụm, gồm hai đường chéo qua giữa sân. Warning600ms, nhịp phát260ms, tốc độ330 đơn vị/s, radius12; giữ damage116/hit. Mỗi luồng sweep giữa hai tick và chỉ hit mỗi hero một lần. **Không gây damage toàn đoạn ngay lúc warning kết thúc.**

Hàm thuần `vuongStarLight` là vị trí chung cho server và client. Presenter dùng raster sao/kiếm khí có sẵn: đường dẫn mờ, đuôi sáng ngắn, đầu sáng32 lớn hơn sao tĩnh25 và quầng44 mờ. VFX chỉ thể hiện clock/geometry, không tạo damage từ callback. Đây là mở rộng độ phủ từ7 lên28 và số luồng đồng thời, không phải khẳng định đã cân bằng clear-time/survival với người thật.

## Test Thất Tuyệt Lôi Âm

Host phòng DEV progression bấm **Test Thất Tuyệt Lôi Âm** ở HUD hoặc ballot để tới thẳng VTD và nhận preset cấp27 theo nhánh đang chọn. Server từ chối peer/phòng thường/sequence cũ; client không gửi kết quả/vị trí.

VTD vào phase2 tại ngưỡng HP Thất Tuyệt, gỡ ba lớp giáp và tự mở minigame, không cần đánh A trước. Giữ sáu ô âm, chuỗi7 gồm đủ sáu âm và một âm lặp, đọc4,1s và mỗi nhịp2,6s. Toàn đội phải vào đúng ô. Mode chỉ chạy cơ chế này: không mưa kiếm/chiêu phase2 khác, boss không bị giết bằng auto/skill trong lúc luyện. Hero vẫn trượt/wipe theo luật thật. Nút **Test lại Thất Tuyệt Lôi Âm** tạo lượt mới, hồi hero và dọn ledger/effects cũ. Thành công thì boss đứng chờ, không tạo victory/reward. **Bỏ qua → Vương Trùng Dương phase2** thoát về phase2 thường.

Gate test có thể tiến nhưng không tự ghi kill/campaign clears/reward. Retry không cấp lại gear/potion mỗi tick. Campaign thường không có mode này.

## Cửu Âm Hộ Thể

Còn giáp: tốc độ tiến90 thay166, dừng ở khoảng120 thay24. Không lùi né người chơi/vòng sét. Vẫn phải dụ boss vào đúng ba lần sét để phá giáp. Regression dùng movement input thật để dẫn boss qua điểm đã khóa; không còn dựa vào boss tự đi sát người đứng ngay tâm vòng.

## Kiểm chứng

Hai regression trước sửa đã FAIL đúng lỗi: chỉ7 sao và bám sát người chơi. Sau sửa,4 file focused PASS57 test, rồi file progression PASS12 (thêm một case thành công/idle/protected boss), tổng58 test duy nhất. Bao gồm geometry ba map, light sweep tới trễ, ba sét phá giáp, auth, mode vào/thoát/retry thật, và không có chiêu khác/reward sau luyện thành công. Project/tools typecheck và client build PASS. Hai ca live hai client đã PASS cho mode+wipe+retry+28 sao/luồng di chuyển và đạn rồng mới. Độ sáng đầu pulse được tăng sau khi xem ảnh; chạy lại riêng ca Bắc Đẩu theo dependency này.

Không chạy full suite theo yêu cầu chỉ kiểm tra cần thiết; không video/trace, không claim kiểm tra sáu người/final-art approval. Kết quả cuối và service identity được bổ sung sau lượt xác minh cuối.


## Kết quả cuối và bản chơi

58 test liên quan PASS, project/tools typecheck PASS, build cuối13,76s. Hai ca live hai client PASS; sau tăng độ rõ chỉ chạy lại ca Bắc Đẩu, PASS1,1 phút. Đã xem PNG ở zoom chơi: [28 sao/đầu sáng](evidence/m4d-vtd-follow-up/stars.png), [đầu rồng có đuôi trọn](evidence/m4d-vtd-follow-up/dragon-tail.png). [Lệnh, kết quả, phạm vi và giới hạn](evidence/m4d-vtd-follow-up/verification.json).

Game đã restart trên `milestone/m4d`: client `http://127.0.0.1:5560/?debug=1&m4d=1&fix=vtd-notes-53`, server2960. Health/client identity cùng run M4D/protocol53; tạo phòng mới để dùng nút luyện âm. Owned service session12313. Không dừng service khác.
