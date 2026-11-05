# Renovation v1 — bản preview để duyệt

Mở **http://127.0.0.1:5526/renovation-preview.html** trong dịch vụ dev của worktree `wip/m3d/visual-upgrade-2`. Chọn **Chọn bộ hình** để đổi địa điểm, nhóm và nhân vật. Mũi tên điều khiển nhân vật đang chọn; nút hướng và **Đi tại chỗ** duyệt frame; **So với bản cũ** đặt hai bản ở cùng chiều cao nhìn thấy. Nhóm đông chia trang, tối đa8 sprite để giữ nguyên kích thước và tránh che hình. Menu, điều khiển và toàn bộ cảnh nằm trong một viewport.

**Cập nhật 2026-11-05:** chủ game đã duyệt bộ hình với yêu cầu “quá đẹp, hãy integrate vào phaser”. Bộ **idle/walk bốn hướng** và môi trường được tích hợp vào trận Phaser thường; xem [ghi chú tích hợp](../../../docs/evidence/renovation-runtime/README.md). Những skill và clip tấn công/cast/hurt/death vẫn dùng tranh đã có. Bản preview này tiếp tục dùng để đối chiếu art gốc; phê duyệt ngoại hình trong trận sau tích hợp là bước review riêng.

## Phạm vi đã có

| Nhóm | Số lượng |
| --- | ---: |
| Nhánh vũ khí của4 môn phái hiện có |8 |
| Quái xâm lăng |20 |
| Quái4 phó bản thường |24 |
|5 wave boss |7 dạng, gồm hai dạng Tây Độc và hai phase Vương Trùng Dương |
| Minion/trợ thủ |11 |
| Boss phó bản |4 |
| Tổng nhân vật/quái/boss |74 dạng |
| Sân phó bản mới |8 nền +48 props tách lớp |

Tám sân mới: Rừng Trúc, Sa Mạc, Bãi Biển, Địa Ngục, Chu Bá Thông, Hoàn Nhan Hồng Liệt, Kim Luân, Cổ Mộ. Võ Đang Kiếm và trung tâm arena đẹp đã duyệt ở lượt trước được dùng lại. Có tổng9 lựa chọn cảnh.

73 sheet thân nhân vật mới ×20 cel =1460 cel gốc, cộng20 cel idle/walk Võ Đang Kiếm dùng lại. Hero thử ở88px gốc, scale1, camera zoom1; quái/boss giữ kích thước theo vai trò. Alpha mép được giữ qua Aseprite. Cắt theo từng silhouette thực tế, tránh cắt tóc, lưỡi kiếm hoặc đuôi khi ảnh sinh lệch lưới. Vật thể môi trường và thân nhân vật tách lớp, depth theo chân.

## Xem ảnh và lấy asset

- [8 nhánh tại arena](arena-native-1366.png), [so sánh Cái Bang Bổng](comparison-native-1366.png).
- [Wave boss](wave_bosses-page-1.png), [4 boss phó bản](dungeon_bosses-page-1.png).
- [Rừng Trúc](forest-native-1366.png), [Sa Mạc](desert-native-1366.png), [Bãi Biển](sea-native-1366.png), [Địa Ngục](hell-native-1366.png).
- [Sân Chu Bá Thông](chu_ba_thong-native-1366.png), [Trại Hoàn Nhan](hong_liet-native-1366.png), [Sân Kim Luân](kim_luan-native-1366.png), [Cổ Mộ](co_mo-native-1366.png).
- PNG/atlas trong [exports/renovation-v1](../../exports/renovation-v1/); menu preview có link PNG và JSON của nhân vật đang chọn.
- [Nguồn, editable Aseprite và quy trình xuất lại](../../source/renovation-v1/README.md), [prompt đầy đủ](../../source/renovation-v1/generation-jobs.json), [provenance](../../source/renovation-v1/PROVENANCE.json), [hash89 ảnh gốc](../../source/renovation-v1/raw-hashes.json).

## Nhập baseline M3D

Local branch `milestone/m3d` chưa có commit mới hơn common head `5bca353c`; phần mới nhất nằm trong working tree nguồn. Đã checkpoint visual work cũ ở `f59bfd60`, kiểm tra merge fast-forward, rồi nhập snapshot ổn định80 file (gồm50 untracked,31,639,355 bytes) thành commit `c823a4a5`. Snapshot giữ thay đổi mới của M3D, gồm Vương Trùng Dương/protocol30. Worktree nguồn ở D: được giữ nguyên. [Danh sách và hash snapshot](../../../docs/evidence/m3d-renovation-import/source-snapshot.json).

## Kiểm tra đã chạy

- `pnpm assets:export:renovation`: đo73 sheet, xuất đủ74 dạng và9 cảnh, validator đạt.
- `pnpm check:final --config playwright.renovation.config.ts`: **PASS,235.38 giây**,18 workflow checks,742 unit/integration tests, typecheck/build,22 asset validators và3 Playwright tests.
- [Báo cáo final](../../../docs/evidence/sessions/renovation-v1-complete/check-workflow/final-timings.json), [kiểm tra PNG/atlas](asset-verification.json), [quan sát frame thật trong Phaser](live-frame-observations.json), [nhịp chuyển động](live-motion-cadence.json).

Trình duyệt đã nạp và phát đủ4 walk cel ×4 hướng ×74 dạng, kiểm tra chuyển idle/walk, di chuyển bằng bàn phím, quyền điều khiển khi mở menu, snake pedestal đứng tại chỗ, đổi cảnh/nhóm liên tục và giới hạn texture đang nạp. Chu kỳ bốn cel đo được449.9ms so với mục tiêu440ms; bước chân đi tại chỗ giữ cùng tọa độ. 6,640 ảnh/source skill giữ nguyên SHA-256. Không có video/GIF/recording.

Lượt final đầu dừng do đăng ký validator dùng `python -X utf8` không đúng cú pháp parser workflow; đã sửa đăng ký về cú pháp chuẩn. Bản final sau cùng chạy trọn và PASS; báo cáo lượt đầu được giữ dưới `renovation-v1-final`.

Kết quả này xác nhận bộ preview và file xuất. Chưa xác nhận natural combat, animation tấn công mới, collision bản đồ mới hay đồng bộ server với các atlas mới; các phần đó thuộc bước tích hợp sau khi duyệt hình.
