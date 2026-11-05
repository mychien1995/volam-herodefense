# Võ Đang Kiếm và arena · Bản duyệt tương tác

Ứng viên hình ảnh ngày 2026-11-05 trên nhánh `wip/m3d/visual-upgrade-2`. Mở `/visual-upgrade-2.html` ở client. Phiên đang dùng cổng 5526.

Phím mũi tên điều khiển Võ Đang. A đánh thường, QWER xem bốn chiêu đang chọn. Mở **Bộ chiêu** để xem đủ Thất Tinh Kiếm, Nhân Kiếm Hợp Nhất, Bát Quái Kiếm Trận, Tọa Sát Bác Đồ và Vạn Kiếm Quy Tông. **Đổi chiêu ô R** thay giữa hai chiêu cuối. **6 nhân vật** thêm các nhân vật đi lại để đánh giá độ rõ trong cùng cảnh.

## Hình ảnh và nguồn

[Arena ở 1366×768](arena-native-1366.png) · [Sáu nhân vật](arena-six-characters.png) · [Bát Quái Kiếm Trận](bat-quai-kiem-tran.png).

Nền sân, tượng, hai loại cây, cờ, trúc, quầy hàng, cổng và đèn là các raster mới. Nền được xuất ở độ phân giải gốc 1478×1064. Các props trong suốt có điểm neo chân và Y-depth. Trong cảnh 1366×768, canvas và màn hình cùng kích thước, zoom 1. Nền có phiến đá nhỏ, màu rêu và bóng vật liệu nhẹ hơn bản arena cũ. Các vật thể có mảng sáng tối rõ và được ghép thành các lớp riêng.

Võ Đang có thân khoảng 88 px gốc, bốn idle, bốn bước đi mỗi hướng và một pose xuất kiếm mỗi hướng. Tổng cộng 24 cel nhân vật và 24 cel hiệu ứng. Pose xuất kiếm được dùng chung cho các chiêu. Các đoạn phim trình diễn có nhịp riêng cho từng hiệu ứng, cùng điểm neo chân. PNG giữ chuyển alpha ở viền qua bước thu ảnh bilinear trong Aseprite và được hiển thị bằng lấy mẫu tuyến tính ở canvas gốc. Các pose tấn công chạm biên ô ở ảnh tạo ban đầu được giữ trong nguồn raw và loại khỏi atlas dùng trong cảnh. Mặt sau được lật ngang để giữ kiếm ở tay phải.

[Manifest và toàn bộ prompt](../../source/visual-upgrade-2/manifest.json) · [Nguồn PNG và Aseprite](../../source/visual-upgrade-2/) · [PNG/JSON xuất](../../exports/visual-upgrade-2/).

Các nguồn được tạo bằng ImageGen tích hợp, sau đó căn chân, thu ảnh và xuất bằng Aseprite 1.3.18.6. Đã đối chiếu concept Võ Đang được duyệt, ảnh Lôi Đài, ảnh hub trung tâm và ảnh gameplay bị từ chối. Tên lịch sử `vo_dang_art_direction_reference.png` thiếu trong checkout, nên ảnh hiện có `vo_dang_character_reference.png` được dùng. File `current_codex_dashboard_anti_reference.png` hiện chứa sheet nhân vật, nên ảnh runtime bị từ chối có ngày tháng được dùng để so chất lượng.

## Phạm vi duyệt

Đây là cảnh duyệt art tương tác trong Phaser. Các chiêu chạy theo thời gian trình diễn, và sáu nhân vật là các sprite trong cùng cảnh. Đánh giá cân bằng chiến đấu, đồng bộ sáu người qua server và tích hợp vào trận M3D thuộc bước sau khi director duyệt hình ảnh này.

## Kiểm tra

`pnpm check:final --config playwright.visual-upgrade.config.ts` chạy typecheck, test hiện có, build production, các validator asset và hai ca trình duyệt. [Kết quả đi lại và bố cục](walking-and-layout.json), [kết quả năm hiệu ứng](skills-frames.json) và [kiểm tra alpha, biên frame](raster-verification.json) lưu quan sát thực tế. Báo cáo thời gian bản cuối ở `docs/evidence/sessions/visual-upgrade-2-final/check-workflow/final-timings.json`.

Aseprite đã kiểm tra 48 cel trong atlas khớp nguồn chỉnh sửa bằng `assets/source/visual-upgrade-2/verify.lua`. Kiểm tra trình duyệt quan sát đủ 16 frame đi bộ, idle sau khi nhả phím, chặn phím di chuyển khi menu mở, hướng kiếm bay thẳng, đủ 24 cel VFX, dọn object khi hiệu ứng kết thúc và chân các nhân vật nằm phía trên hotbar.

Lần kiểm tra đầu qua các assertion nhưng bước đóng Vite preview qua tiến trình pnpm bị chậm trên Windows. Phiên Vite do lượt kiểm tra đó tạo đã được đóng theo PID đã xác minh. Ca kiểm tra hiện dùng Vite preview API trong cùng tiến trình để đóng server trực tiếp.

Chạy lại bằng `pnpm --filter @volam/game-client dev --host 127.0.0.1 --port 5526`, rồi mở `http://127.0.0.1:5526/visual-upgrade-2.html`. Máy cần chuẩn bị asset bằng lệnh build hiện có trước. Chạy lại việc xuất art bằng Aseprite batch với `assets/source/visual-upgrade-2/export.lua` và tham số `root` là thư mục repo.
