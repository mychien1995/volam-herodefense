# Đồng bộ menu Lôi Đài với Defense — 2026-11-19

Thực hiện trên `wip/m3d/pvp`, theo bốn phản hồi của người dùng. Đây là chỉnh giao diện; không thay combat, ready phía server, chia phe hoặc luật thắng/thua.

## Thay đổi

- Menu tạo/vào phòng, chia phe, cài đặt và lịch sử dùng khung gỗ `pre-window`, tiêu đề và nút xanh đang dùng trong Defense. Giữ portrait, icon và toàn bộ artwork được duyệt; không tạo artwork mới.
- Thay dropdown phái/hệ bằng nút riêng. Mở lưới bảy phái (4 thẻ trên, 3 thẻ dưới), chọn một phái mở popup hai hệ với icon và mô tả hiện có. Cùng dùng `schoolCards/branchCards` trong `school-selection.ts` với Defense; helper render không chứa lệnh mạng. Defense giữ cơ chế ack cũ.
- Lựa chọn trong popup là bản nháp. Chỉ bấm **Xác nhận** mới gửi action `choose`; chờ server xác nhận rồi đóng menu. Hủy/Escape không làm người chưa chọn thành ready. Escape từ hệ quay về phái, rồi trở lại chia phe. Menu chia phe bị inert trong lúc chọn để không bấm nhầm bên dưới.
- Checkbox hiểm họa có kích thước 18×18, nhãn cách 8px. Trước sửa input kế thừa `width:100%`, đo được gần 692px tại viewport 1280×720. Có mô tả theo map, trạng thái Bật/Tắt và `aria-describedby`. Rừng Trúc ghi rõ phi tiêu không báo trước; Địa Ngục mô tả thu vùng an toàn/dung nham/cách trở lại; Tương Dương mô tả né đường tên; Kiếm Hồ mô tả NPC bất tử, chém nửa map và sét nhiều điểm; Hồng Mộc ghi không có hiểm họa.
- Thông báo dùng **Chính thắng hiệp**, **Chính thắng ván** (tương tự phe Tà), font Segoe UI/Tahoma/Arial hỗ trợ tiếng Việt. Bỏ Georgia ở kết quả và tiêu đề. Không tạo lại node chữ khi nội dung countdown/kết quả chưa đổi giữa các tick server.

## Kiểm chứng

Đã đọc UI_UX_SPEC, ART_PRODUCTION_STANDARD và đối chiếu reference positive/anti trước sửa. Tệp `current_codex_dashboard_anti_reference.png` thực tế là sheet Võ Đang; anti-reference chất lượng đúng được xem là `current_game_2026_10_29_placeholder_anti_reference.png`. Tất cả menu tiếp tục ở trong viewport.

- Bằng chứng trước sửa: [chia phe](evidence/sessions/pvp-menu-rework/before/lobby.png), [cài đặt](evidence/sessions/pvp-menu-rework/before/settings.png), [thông báo kết quả](evidence/sessions/pvp-menu-rework/before/series-result.png), [số đo](evidence/sessions/pvp-menu-rework/before/observations.json).
- Lượt tập trung đầu qua chọn/hủy/xác nhận phái, checkbox, mô tả, chia phe và combat; FAIL tại kiểm tra computed font vì node chữ bị thay mỗi tick. Giữ [timings FAIL](evidence/sessions/pvp-menu-focus/check-workflow/browser-timings.json). Sau đó đã đổi cập nhật banner để giữ node ổn định; test thêm đối chiếu cùng node sau 120ms.
- Test chọn phái chờ đúng branch được server ack; draft không ready, vẫn không kéo người chưa ready sang đội. Popup được kiểm tra vừa khung 850×480.
- Kết quả thắng hiệp được tạo bằng đòn A thật cho tới khi đối thủ bị hạ. Thắng ván được kiểm tra qua khách rời phòng theo luật hiện hành. Không gán kết quả combat hoặc state thắng để làm ảnh.
- Không ghi video, trace playback hoặc animation evidence dạng recording.

Lệnh cuối:

```powershell
$env:VOLAM_QA_SESSION='pvp-menu-final'
$env:VOLAM_QA_SERVER_PORT='2796'
$env:VOLAM_QA_CLIENT_PORT='5596'
pnpm check:final --config playwright.pvp-regressions.config.ts --grep 'two clients agree|ranged projectile|statue opening|eight players|entry, link'
```

Lượt đầy đủ `pvp-menu-final`: **107 file / 1.138 unit/integration PASS**, 18 workflow checks, TypeScript/tools, build và toàn bộ asset validator PASS. Browser có 4 ca PASS (hai ca Defense, hình học lời dẫn, phòng tám người/năm map), một ca FAIL khi kiểm tra node tại sát ranh giới chuyển hiệp. Snapshot thất bại đã ở countdown, nên thay node tại thời điểm đó là hợp lệ. Giữ nguyên [timings FAIL của pipeline](evidence/sessions/pvp-menu-final/check-workflow/final-timings.json).

Đã chuyển quan sát sang frame đầu của chữ thắng hiệp, ghi font và so cùng node sau 120ms trong cùng phase/nội dung, chụp PNG ngay khi quan sát được. Một lượt retry phát hiện assertion ghi nhầm `round_over`; enum thật là `intermission`. Đã sửa assertion theo `PvpSnapshot['phase']` và type-check tools lại. [Quan sát đã ghi đúng font/node](evidence/sessions/pvp-menu-entry-final/standalone-pvp/round-result-observation.json), [PNG thắng hiệp](evidence/sessions/pvp-menu-entry-final/standalone-pvp/round-result-vietnamese.png).

Sau lượt đầy đủ chỉ chỉnh observer/assertion của browser test, không đổi runtime/build/unit inputs. Lượt chạy lại cuối dùng `node tools/run-playwright.mjs test --config playwright.pvp-regressions.config.ts --grep 'entry, link'` trên bundle vừa kiểm tra.

Lượt cuối `pvp-menu-verified`: **1 browser PASS (1,8 phút)**, quan sát đúng `intermission → intermission`, `sameNode=true`, font `"Segoe UI", Tahoma, Arial, sans-serif`. Cả bốn ca browser đã PASS ở lượt đầy đủ và ca chạy lại cuối hoàn tất **5 ca liên quan**. `pnpm exec tsc -p tsconfig.tools.json --noEmit` PASS sau chỉnh assertion; `git diff --check` PASS. Các pipeline FAIL được giữ nguyên trạng thái.

Phòng tám người giữ đủ 8 thành viên trên cả năm map, bắt đầu 4v4 mỗi map; NPC/hazard có thể hạ người trong lúc quan sát nhưng không làm mất thành viên. Có đủ NPC frame 0–9, console hai client rỗng, không có watchdog terminate hoặc close 1006 trong room tám người. Lượt full có close 1006 của room hai người trong cleanup sau assertion FAIL; không ghi nó thành lỗi tụt ghế của room tám người.

Đã mở và đối chiếu các PNG menu, popup ở 850×480 và chữ thắng hiệp/ván chạy thật. Bản chơi thường đã mở lại tại [localhost:5596](http://127.0.0.1:5596/), client/server cùng run identity và protocol 47, không bật fixture combat QA.

- [Chia phe](evidence/sessions/pvp-menu-verified/standalone-pvp/lobby.png).
- [Chọn phái 850×480](evidence/sessions/pvp-menu-verified/standalone-pvp/school-picker-compact.png), [chọn hệ](evidence/sessions/pvp-menu-verified/standalone-pvp/branch-picker-compact.png).
- [Checkbox và mô tả hiểm họa](evidence/sessions/pvp-menu-verified/standalone-pvp/settings-hazard.png).
- [Thắng hiệp](evidence/sessions/pvp-menu-verified/standalone-pvp/round-result-vietnamese.png), [thắng ván](evidence/sessions/pvp-menu-verified/standalone-pvp/series-result-vietnamese.png), [font/node đã đo](evidence/sessions/pvp-menu-verified/standalone-pvp/round-result-observation.json).
- [Tổng hợp nghiệm thu](evidence/sessions/pvp-menu-verified/acceptance.json).
