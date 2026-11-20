# Kiểm chứng UI/camera dùng chung · 2026-11-19

Baseline: `milestone/m3d`, merge `3cbf3b05`. Refactor client presentation; người dùng đã yêu cầu commit riêng phần UI/camera, test, tài liệu và evidence liên quan vào `milestone/m3d`.

## Kết quả triển khai

Ba màn dùng chung `branchDialog`, action buttons/rows và skin panel. Styles của school component đã tách khỏi file riêng Defense. Utility HUD dùng một biến cỡ nút. Camera gom ba chiến lược native/cover/overview; giữ nguyên ngưỡng zoom và ngoại lệ Hồng Mộc trong Defense/Kim Luân. Handler, network command và input/focus của từng mode được giữ lại. [Vị trí sửa và lệnh dùng lại](SHARED_UI_CAMERA.md).

## Đo trước–sau

Cùng test `practice presentation`, Chromium, production client, cổng QA28771/28772; session riêng, video/trace tắt. Baseline chạy trước khi tích hợp code mới. Số đo sau ở `ui-camera-iteration-2`; final chạy lại cùng test trên cùng implementation.

| Viewport | Zoom trước → sau | Cỡ mỗi nút trước → sau |
| --- | --- | --- |
| 1280×720 | 2 → 2 | 48 → 48px |
| 1872×800 | 2 → 2 | 68,796875 → 68,796875px |
| 850×480 | 1 → 1 | 44 → 44px |

Form và toàn bộ số đo worldView của scenario này khớp trước–sau. Định nghĩa HTML branch dialog giảm3→1; định nghĩa ngưỡng native zoom giảm3→1. Đây là giảm nơi đọc/sửa để tránh lệch giữa các mode, không phải phép đo billed token hoặc chứng minh build/game nhanh hơn. [JSON đo](evidence/sessions/ui-camera-final/before-after.json), [baseline](evidence/sessions/ui-camera-before/practice/presentation.json), [sau refactor](evidence/sessions/ui-camera-iteration-2/practice/presentation.json).

## Kiểm chứng thực chạy

- `pnpm check:quick tests/ui-camera-policy.test.ts`: PASS7 test; không thay cho typecheck client.
- Baseline `pnpm check:browser --config playwright.ui-camera.config.ts --grep 'practice presentation'`: PASS1 test.
- Lượt đầu `ui-camera-iteration` dừng tại compile vì optional selected branch; đã sửa bằng fallback chuỗi rỗng, giữ báo cáo FAIL.
- `ui-camera-iteration-2`, grep `shared UI and camera|practice presentation`: PASS2 test. Popup ba mode cùng computed background/border/color/font; group/label hợp lệ; không vượt viewport; hủy PvP không ready. Defense/Practice và cả5map PvP qua ba kích thước, world chiếm toàn viewport, zoom/bounds/cỡ nút đúng; không có page/console error. [Số đo](evidence/sessions/ui-camera-iteration-2/shared-ui-camera/contracts.json).
- Final: `pnpm check:final --config playwright.ui-camera.config.ts --grep 'shared UI and camera|practice|entry, link|statue opening'`: **PASS**, 590,57s / 41 stage; project + tools typecheck, 1.159 unit/integration test, 27 workflow test, build production, 33 validator asset và 6 ca browser (297,94s). [Timing report](evidence/sessions/ui-camera-final/check-workflow/final-timings.json).
- Browser cuối kiểm tra Practice đổi phái/nhánh, Escape/hủy/khóa input, dọn summon, room isolation, lặp cast/di chuyển/F bằng input thật; hai browser PvP đồng bộ movement/hit/HP, countdown, menu/history và kết quả; lời dẫn Defense; 21 mẫu camera qua ba viewport ở Defense/Practice và năm map PvP. [Contract cuối](evidence/sessions/ui-camera-final/shared-ui-camera/contracts.json). Form và toàn bộ số đo Practice cuối khớp baseline; hai cổng dịch vụ QA đã được trả lại.

Đã xem PNG baseline/after ở wide và compact, popup Defense/Practice/PvP và map Địa Ngục: HUD/menu trong viewport, khung/nút nhất quán, không thêm panel ngoài game. Giữ góc overhead và art hiện hành; đây không phải phê duyệt artwork mới. Defense scenario dùng fixture mục tiêu vô hại thay initial creeps để quan sát camera/input khi tải art; hình mục tiêu QA không phải art runtime mới.

Ảnh cuối: [popup dùng chung](evidence/sessions/ui-camera-final/shared-ui-camera/pvp-picker.png), [combat hai client](evidence/sessions/ui-camera-final/standalone-pvp/two-client-combat.png), [Practice wide](evidence/sessions/ui-camera-final/practice/native-wide.png), [Practice compact](evidence/sessions/ui-camera-final/shared-ui-camera/practice-850.png).

## Bảo toàn và giới hạn

Cả352 file dirty/untracked ban đầu giữ nguyên hash và trạng thái Git. Không diff trong server/core/data/protocol hoặc runtime assets; approved asset validators vẫn bắt buộc trong final. [Đối chiếu WIP](evidence/sessions/ui-camera-final/wip-preservation.json). Không chạy campaign dài, đánh giá cân bằng hoặc tạo video. Các kết quả browser chỉ chứng minh các thao tác/assertion thực chạy; báo cáo lịch sử không được tính lại là test của task này.

Validator Thiếu Lâm cập nhật riêng số đếm file trong metadata đã có từ trước; lưu [output mới](evidence/sessions/ui-camera-final/thieu-lam-validation-run.json) vào evidence và trả metadata ngoài task về baseline. Không thay assertion hoặc kết quả validator. Không chạy lại full suite cho thay đổi báo cáo/link sau PASS.
