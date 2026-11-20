# UI và camera dùng chung · 2026-11-19

Refactor presentation trên bản merge `3cbf3b05`. Giữ nguyên server, core, protocol, tuning và artwork đã duyệt.

## Sửa ở đâu

- `apps/game-client/src/ui-components.ts`: escape nội dung động, nút action và hàng nút. Action dùng một trong ba attribute hiện hành; nút luôn `type="button"`.
- `ui-components.css`: khung `.pre-window`, tiêu đề `.pre-title`, hàng `.pre-actions`, skin nút/disabled/focus. CSS từng mode giữ bố cục và mật độ riêng.
- `school-selection.ts` + `school-selection.css`: thẻ phái, nhánh và `branchDialog`. Truyền `titleId` riêng mỗi màn, lựa chọn, enabled, actions và notice; không chép HTML popup vào từng mode.
- `arena-hud.css`: `--utility-button-width` chung, giữ cỡ mỗi nút theo nhóm năm nút Defense dù chỉ hiện hai hoặc ba nút.
- `camera-policy.ts`: `nativeGameplayZoom`, `cameraZoom`, `frameWorld`; đầu vào là viewport/map, không phụ thuộc HUD/panel.

Handler từng mode vẫn sở hữu Escape, focus canvas, chặn input, pending và server acknowledgement. Component không gửi command. Defense chọn qua server; Lôi Đài/Practice giữ draft đến lúc xác nhận. Không gộp state machine chỉ vì markup giống nhau.

## Camera

| Trường hợp | Framing | Bounds / tâm |
| --- | --- | --- |
| Defense, dungeon thường | `native` | Giữ bounds/spawn/follow hiện hành |
| Năm map Lôi Đài độc lập, Practice | `cover` | Clamp map; tâm map khi fit, follow/pan hiện hành |
| Hồng Mộc cũ trong Defense | `overview` | Giữ courtyard ngoài bounds hiện hành |
| Kim Luân | `overview`, cap `1.35` | Giữ tâm/bounds arena hiện hành |

Native = 2 khi viewport ít nhất 960×600, còn lại 1. Cover = max(native, viewportWidth/mapWidth, viewportHeight/mapHeight). Overview = min(hai tỉ số, cap). Toàn viewport, rotation 0, overhead cố định. Giữ feet-depth, sampling, follow offset, spectator input và đơn vị screen/world của lời dẫn.

## Kiểm chứng cho lần sau

```powershell
$env:VOLAM_QA_SESSION = 'ui-camera-next'
$env:VOLAM_QA_SERVER_PORT = '28771' # Chọn cổng rảnh của session.
$env:VOLAM_QA_CLIENT_PORT = '28772'
pnpm check:quick tests/ui-camera-policy.test.ts
pnpm check:browser --config playwright.ui-camera.config.ts --grep 'shared UI and camera|practice presentation'
# Sau implementation cuối cùng:
pnpm check:final --config playwright.ui-camera.config.ts --grep 'shared UI and camera|practice|entry, link|statue opening'
```

Profile dùng preflight/fixture sở hữu server, production client, PNG/JSON; video và trace tắt. Defense fixture chỉ thay initial creeps trong room QA quy định bằng mục tiêu vô hại, không bơm kết quả input/combat. Practice/PvP dùng room thật. Kiểm tra ba viewport, năm map, menu/cancel/ack/input và combat hai browser; không thay thế test balance/campaign dài. Xem [báo cáo thực chạy và đo trước–sau](SHARED_UI_CAMERA_REPORT_2026_11_19.md); không suy ra billed token từ số dòng code.
