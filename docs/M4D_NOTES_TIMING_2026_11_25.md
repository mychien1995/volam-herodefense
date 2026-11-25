# Thất Tuyệt Lôi Âm — nhịp và phản hồi

Tiếp tục milestone/m4d. Người chơi báo chết trước khi đi hết chuỗi.

Cơ chế hiện hành kiểm tra vị trí ở cuối từng nhịp, không đợi hết cả bảy nốt. Chưa có bằng chứng server chốt trước deadline. Regression mới kiểm tra ngay tick trước deadline: chưa wipe; tới deadline mới chốt. Người đã vào đúng ô nhưng rời ô trước deadline vẫn trượt; quay lại kịp thì qua nhịp.

Trước sửa, UI chỉ hiện tên nốt, thiếu countdown/giữ ô/xác nhận vị trí. Tiếng đọc dùng speechSynthesis.speak liên tục, có thể xếp hàng sau phần đọc bảy âm; không bảo đảm khớp nhịp server. Wipe cơ chế lại hiện thông báo hết lượt hồi sinh dù còn đủ ba lượt. Thử driver bàn phím tự động đã trượt ô đầu do overshoot; ghi nhận này không chứng minh server chốt sớm, nên không dùng làm bằng chứng lỗi timing.

Đã thêm HUD trong viewport: toàn chuỗi, nhịp hiện tại, countdown theo tick server, trạng thái đúng ô và số người trong đội đã đúng. Hướng dẫn giữ ô đến hết nhịp, và trạng thái hoàn tất 7/7 trong mode luyện. Server dùng cùng predicate để báo vị trí đúng và chốt nhịp. Lỗi nốt được lưu vào retry ledger, báo đúng số nhịp/tên nốt, thay thông báo hết lượt hồi sinh. Audio huỷ hàng đợi cũ khi chuyển nhịp; reset luyện âm bỏ đích di chuyển bằng chuột còn sót.

Ảnh kiểm tra phát hiện thêm ô Fa phía nam bị thanh kỹ năng che khi camera bám nhân vật ở zoom2. Trong Thất Tuyệt, camera cố định vào tâm vòng âm và vừa đủ sáu ô trong phần nhìn được giữa HUD/skill bar. Khi thoát hoặc hoàn thành thì trả về camera thường. [Trước](evidence/m4d-notes-timing/before-camera.png) / [sau](evidence/m4d-notes-timing/active.png).

Giữ nguyên luật bảy nhịp, sáu âm + một lặp, đọc4,1s, nhịp2,6s, bán kính29 và wipe khi một người sai. Không đổi cân bằng. Protocol54 yêu cầu tạo phòng mới.

## Kiểm chứng

Project/tools typecheck PASS. Hai file focused `tests/vuong-trung-duong.test.ts` và `tests/boss-progression.test.ts`: 33 tests PASS. Client build PASS. Browser preflight PASS7 checks. Solo dùng Playwright native right-click (không teleport/inject kết quả) đã đi đủ7 nhịp, giữ HP776,62 và còn đủ3 lượt hồi sinh; có chuyển ô đối diện Fa→Đô. Mỗi nhịp kiểm tra cả sáu tâm ô thực sự nhận click trên canvas qua elementFromPoint, nhận noteReadyIds từ server và sequence tăng. Test lại/thoát mode xác minh camera trả về zoom2. [Metadata](evidence/m4d-notes-timing/walk.json), [log](evidence/m4d-notes-timing/native-browser.log).

Lượt QA camera đầu có hai FAIL: hai peer chưa nhận scene-ready trong45s; solo trượt nhịp3 ở driver native. Không dùng các lượt này làm PASS. Sau dừng service chơi cũ của chính chat để chạy cô lập, solo native PASS1,7 phút; không tăng deadline hoặc inject vị trí để ép test qua. Hai peer chạy lại riêng trên cùng bundle PASS1,0 phút: mode/phase/HP sync, hụt nhịp1 báo nguyên nhân đúng, retry và thoát về phase2, camera restore cùng luồng sao hiện hành. [Log](evidence/m4d-notes-timing/two-peer-browser.log).

Không chạy full suite theo yêu cầu chỉ test cần thiết. Không ghi video/trace; không claim nghe giọng đọc thực tế trên máy người chơi hoặc thử mọi nhánh/số người/map.

## Bản chơi

Đã restart owned M4D service session85062, server2960/client5560, protocol54. Tạo phòng mới: http://127.0.0.1:5560/?debug=1&m4d=1&fix=notes-timing-54 . Health và client identity được lưu [ở đây](evidence/m4d-notes-timing/live-service.json).
