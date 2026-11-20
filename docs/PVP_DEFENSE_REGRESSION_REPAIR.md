# Sửa lời dẫn Tượng và phòng 8 người — 2026-11-19

Thực hiện trên `wip/m3d/pvp`, tiếp nối [bản tích hợp Lôi Đài](LOI_DAI_STANDALONE_IMPLEMENTATION.md). Không thay luật thắng/thua, đội hình hoặc reconnect.

## Lời dẫn Tượng Võ Thần

Đã tái hiện bằng hai client Phaser ở 1280×720, zoom 2. Chữ có mép trên Y=410 trong thế giới, nhưng camera bắt đầu ở Y=452. `presentStatueStory` tạo được chữ và đặt visible=true; camera không đưa chữ vào vùng nhìn.

Phép tính headroom dùng `camera.height / 2` (pixel viewport) cùng tọa độ thế giới. Đổi sang `camera.displayHeight / 2`; khoảng chừa HUD 112 pixel được chia cho `zoomY`. Giữ nội dung lời dẫn, trình bày phần lời dưới HUD và trên Tượng; tên Tượng vẫn ở HUD. Khung chữ rộng 330 đơn vị để giảm số dòng. Camera không đổi mức zoom, không thu viewport.

Hồi quy mới kiểm tra cả văn bản và bốn cạnh của khung chữ trong vùng nhìn, có khoảng cách với HUD tại 1280×720 và 850×480. Helper lobby đưa trang chủ phòng ra trước khi bấm Start. Smoke Defense gốc vẫn giữ nguyên assertion lời dẫn, combat, kỹ năng và progression.

- [Trạng thái camera trước sửa](evidence/sessions/pvp-repair-repro/pvp-repair/statue-camera.json).
- [PNG trước sửa](evidence/sessions/pvp-repair-repro/pvp-repair/statue-camera.png).
- [Tài liệu Phaser về worldView/displayHeight](https://docs.phaser.io/phaser/concepts/cameras).

## Vì sao phòng còn 7 người

Đã tái hiện đúng đường đi browser qua Hồng Mộc → Rừng Trúc → Địa Ngục. Sáu peer SDK còn kết nối; người bị ngắt là client trình duyệt Tà Khách. Nhật ký server ghi `onDrop(1006)` trong lúc chuyển hiệp/lobby, sau đó mọi tập thành viên phản ánh đúng việc người này rời.

Dấu vết socket gốc xác nhận chính watchdog `WebSocketTransport.autoTerminateUnresponsiveClients` gọi `terminate()`: `pingCount=2`, `pongAge=9045ms`. Không có lỗi protocol trước đó trong log. Cấu hình mặc định probe mỗi 3 giây, chỉ chịu hai lần thiếu pong, nên khoảng im lặng 6–9 giây bị xem là socket chết. Ở lượt này server chủ động cắt kết nối trước khi trình duyệt có cơ hội trả pong lại. Chưa quy được khoảng chậm pong cụ thể cho GPU, JavaScript hay hệ điều hành; không ghi các giả thuyết đó thành kết luận.

Chuỗi sự kiện là: một peer SDK chủ động rời để thử xử thua (8→7), khách trình duyệt bị watchdog cắt (7→6), sau đó peer thay thế vào (6→7). Room cho phép lệch quân số đúng đặc tả, nên vẫn Start được 4v3. Không có bằng chứng schema làm mất ghế còn kết nối.

Cấu hình vận hành mới trong `apps/game-server/src/socket-config.ts` giữ probe mỗi 3 giây và yêu cầu năm probe không được trả lời. Socket im lặng liên tục bị ngắt khoảng 15–18 giây tùy pha timer. Payload cap giữ 2048 byte. Production và real-room tests dùng cùng cấu hình.

Đây là ngưỡng phát hiện **socket im lặng**, không phải thời gian chờ reconnect. Khi socket đóng hoặc server nhận sự kiện drop/leave, room vẫn xử thua ngay; host rời vẫn đóng phòng, không giữ chỗ hay tự nối lại.

- [Toàn bộ sự kiện join/drop/leave và stack terminate trước sửa](evidence/sessions/pvp-repair-native/pvp-repair/server-lifecycle.ndjson).
- [Trạng thái browser khi còn 7 người](evidence/sessions/pvp-repair-native/standalone-pvp/actor-failure.json).
- [Vòng đời Colyseus](https://docs.colyseus.io/room/lifecycle).

## Khởi động client khách và smoke fixture

Trong khi tăng kiểm chứng client khách, đã phân biệt lobby đồng bộ qua socket với scene Phaser hoàn tất tải. Mẫu điều tra ghi `ready=false`, scene chưa active suốt các lần poll; một lần hoàn tất boot mất thêm 11 giây trong lúc chờ. Bản đồ trong snapshot đã đúng trong toàn bộ thời gian này. Không kết luận đây là lỗi mất roster hoặc lỗi serialize Playwright.

Khi đã biết đang vào Lôi Đài tại preload, gói `pvp` được xếp cùng asset khởi động và đăng ký ở create, thay vì cần khởi động thêm lượt tải sau create. Đường tải động vẫn dùng khi đổi từ Defense sang Lôi Đài. Test khách chờ `#scene-status[data-ready=true]` và map thực tế trước khi thao tác; cùng ngưỡng boot 45 giây của chủ phòng. Kiểm tra chuyển map sau boot vẫn giữ 20 giây, đối chiếu đúng tám session ở hai client.

Smoke Defense gốc còn hai fixture lỗi thời: tên texture Cái Bang Chưởng chưa có tiền tố `renovated-`; nút xác nhận có thể đổi tên/disabled trong lúc chờ art. Cập nhật texture hiện hành và dùng DOM action có ack server của helper audit sẵn có. Promise quan sát vòng sáng độc lập có rejection handler khi test kết thúc sớm, nhưng vẫn được await và giữ assertion đủ frame khi test thành công. Không bỏ assertion lời dẫn, combat hoặc progression.

## Hồi quy và phạm vi

`tests/standalone-loi-dai-room.test.ts` thêm ba ca:

1. Tạo đủ tám kết nối thật, tạm bỏ các phản hồi pong trong 9,5 giây rồi phục hồi handler transport. Trước sửa: FAIL, phòng còn 7. Sau sửa: PASS, giữ cùng tám session và pong trở về bình thường; chủ động leave vẫn bỏ ghế ngay.
2. Socket đấu thủ không trả pong liên tục vẫn bị terminate và cả phe thua ván.
3. Ba mươi chu kỳ thay ghế, chọn phái, chia 4v4, Start và chuyển năm map; đối chiếu thành viên mô phỏng, schema server, kết nối thực và bản sao của cả tám SDK.

Cả 10 test trong file room đã PASS ở lượt tập trung sau sửa. Không gán kết quả thắng/thua hoặc danh sách thành viên để làm test qua. Chỉ rút ngắn countdown/result trong ca churn có cấu hình fixture rõ ràng.

`tests/e2e/pvp-repair-setup.ts` chỉ bọc các hook QA để ghi nhật ký; không thay kết quả handler. Các lượt điều tra có thu lỗi Chromium qua một session CDP phụ, nhưng kiểm tra cuối đã bỏ session phụ và chạy đủ năm map với topology browser ban đầu. Mọi bản FAIL được giữ riêng; không relabel thành PASS. Không tạo recording.

Final command:

```powershell
$env:VOLAM_QA_SESSION = 'pvp-repair-final'
$env:VOLAM_QA_SERVER_PORT = '2796'
$env:VOLAM_QA_CLIENT_PORT = '5596'
pnpm check:final --config playwright.pvp-regressions.config.ts --grep 'two clients agree|ranged projectile|statue opening|eight players|entry, link'
```

Kết quả thực tế (giữ nguyên lịch sử FAIL):

| Lượt kiểm tra | Kết quả |
| --- | --- |
| `pnpm exec vitest run tests/standalone-loi-dai-room.test.ts` | 10 PASS, gồm pong trễ phục hồi, im lặng kéo dài và 30 chu kỳ thay ghế/map. |
| `pnpm check:final …` ở trên | 107 file / 1.138 unit/integration PASS; 18 workflow checks, TypeScript/tools, build và toàn bộ asset validator PASS. Pipeline tổng FAIL vì browser lúc đó còn fixture cũ và gate scene khách chưa đầy đủ. |
| `pnpm check:browser --config playwright.pvp-regressions.config.ts --grep 'two clients agree\|ranged projectile\|statue opening\|eight players\|entry, link'` | Build lại sau chỉnh preload/diagnostic; **5 browser PASS**, 321,16s; toàn stage browser 350,29s. Không sửa assertion để bỏ kiểm tra combat/progression hoặc giảm yêu cầu 8 người. |
| `pnpm exec tsc -p tsconfig.tools.json --noEmit` | PASS sau chỉnh helper/test cuối. |
| `git diff --check` | PASS. |

Lượt browser cuối dùng session `pvp-repair-browser-final`, hai Phaser client + sáu peer SDK. Cả năm map có 8 thành viên, 4 Chính/4 Tà. Guest đã boot trước vòng chuyển map; mỗi lần xác nhận map mất 143–254ms. Có đủ NPC frame 0–9, ba cel chém và ba cel sét; console hai client rỗng. Log socket có **0 terminate, 0 close 1006**; các close 1001/4000/4011 là đóng context/rời chủ động/host đóng phòng trong kịch bản.

Sau lượt đầy đủ, chỉ đổi preload/diagnostic phía client và fixture browser; đã chạy lại compilation, build, tools typecheck và toàn bộ browser liên quan. Không có thay đổi đầu vào game-core/server/unit sau lượt 1.138 test PASS. Không chạy lại cả suite chỉ để cập nhật báo cáo.

- [Timings lượt đầy đủ, giữ trạng thái FAIL](evidence/sessions/pvp-repair-final/check-workflow/final-timings.json).
- [Timings browser cuối PASS](evidence/sessions/pvp-repair-browser-final/check-workflow/browser-timings.json).
- [Tượng ở 1280×720](evidence/sessions/pvp-repair-browser-final/pvp-repair/statue-normal.png), [850×480](evidence/sessions/pvp-repair-browser-final/pvp-repair/statue-camera.png), [hình học camera](evidence/sessions/pvp-repair-browser-final/pvp-repair/statue-camera.json).
- [Rừng Trúc đủ tám người](evidence/sessions/pvp-repair-browser-final/standalone-pvp/rung_truc-eight.png), [Kiếm Hồ](evidence/sessions/pvp-repair-browser-final/standalone-pvp/kiem_ho-eight.png).
- [Frame/state của năm map](evidence/sessions/pvp-repair-browser-final/standalone-pvp/eight-player-frame-observations.json), [log vòng đời/socket](evidence/sessions/pvp-repair-browser-final/pvp-repair/server-lifecycle.ndjson).
- [Tổng hợp nghiệm thu cập nhật](evidence/sessions/pvp-repair-browser-final/acceptance.json).

Đã mở PNG lời dẫn ở hai kích thước và PNG phòng tám người để đối chiếu trực quan. Không tạo artwork mới hoặc thay byte bộ artwork được duyệt. Không tuyên bố soak dài hạn hoặc không còn mọi nguyên nhân ngắt mạng.
