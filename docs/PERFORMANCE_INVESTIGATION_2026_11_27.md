# Điều tra hiệu năng M4D — 27/11/2026

Phạm vi người dùng: giật khi đông quái/nhiều người dùng skill; bổ sung riêng PvP hai người. Đây là điều tra và đề xuất, chưa triển khai tối ưu gameplay, network hay artwork.

Follow-up: [các tối ưu client đã triển khai và kiểm chứng](PERFORMANCE_OPTIMIZATION_2026_11_27.md). Các số đo điều tra dưới đây giữ nguyên như bằng chứng trước thay đổi.

Ưu tiên xử lý các công việc phát sinh ngay trong lúc render/combat: phân tích pixel ánh sáng, tạo viền trúng đòn, khởi tạo shader; sau đó giảm công việc HUD và actor ngoài camera. Chưa có bằng chứng từ phép đo này cho thấy cần nâng tick rate hoặc nâng server để giải quyết vấn đề.

## Đông quái và nhiều skill

Probe hai browser context đo 0/80/200 quái generic đứng yên, damage 0, hai hero. 200 quái tạo 202 actor và 1.261 object Phaser; đưa quái ra ngoài camera vẫn giữ nguyên số actor/object và vẫn chạy cập nhật chúng. Đây là phép đo tải cấu trúc, **không phải** benchmark hình ảnh quái wave thật: fixture ban đầu đặt `e.invasionWave`, trong khi projection đọc `e.invasion.wave`, nên dùng body fallback. Không dùng kết quả này để kết luận FPS của wave thực tế.

HUD vẫn ghi nhiều text/attribute theo patch. Các nhánh `#players`, `#creeps`, `#map-markers` có điều kiện tồn tại node; không quy chi phí dựng lại các danh sách này nếu DOM hiện tại không có chúng. PvpUI và các menu đã có một số signature guard, cần giữ và mở rộng đúng chỗ.

Code xác nhận `ArenaScene.update` duyệt mọi creep cùng zone, parse statuses và cập nhật sprite/label/bar mỗi frame; camera culling của renderer không tự bỏ chi phí JavaScript này. `WorldDepthEffects` và `WorldDepthShadows` còn quét danh sách object, dựng danh sách nguồn và sắp khoảng cách mỗi frame. Đã có giới hạn 16 fire lights, 64 projected casts và cache shadow; đề xuất phải tiếp tục dùng các giới hạn/cache hiện hữu.

Một phép đo game-core riêng dùng sáu hero cấp 30, canonical arena collision, 0/80/200 quái wave 1, input A được submit đúng API, quái đứng yên và damage 0. Mỗi cấu hình chạy ba lần, 120 tick khởi động + 600 tick đo/lần:

| Quái | Mean ms/tick, khoảng ba lần | P95 ms/tick, khoảng ba lần |
| --- | --- | --- |
| 0 | 0,120–0,194 | 0,239–0,421 |
| 80 | 0,220–0,248 | 0,454–0,522 |
| 200 | 0,442–0,546 | 0,673–0,874 |

Budget ở 30 Hz là khoảng 33,3 ms/tick. Đây là core với fixture đơn giản, không gồm Room, serialization, quái chạy tìm đường, nhiều phòng hoặc boss; không chứng minh tải production đã đạt yêu cầu. Kết quả giúp hạ ưu tiên sửa thuật toán simulation trước các điểm nghẽn client đã thấy.

[Core measurements](evidence/sessions/m4d-performance-investigation-20261127/core.json), [crowd browser measurements và giới hạn fixture](evidence/sessions/m4d-performance-investigation-20261127/measurements.json).

## PvP 1v1

Đã chạy hai context Chromium riêng trong một phòng Rừng Trúc, hai hệ Thiên Sơn Đao/Cái Bang Chưởng, input bàn phím Q/W/E/R/A thật. Fixture server đặt vị trí bắt đầu và tăng HP để phép đo không kết thúc sớm; cooldown, skill và hit vẫn do server xử lý. Event window cuối có 15 cast và 21 hit; hai client không ghi nhận page error. Di chuyển được server và peer xác nhận.

| Quan sát trong probe | Kết quả | Diễn giải |
| --- | --- | --- |
| World-depth idle | mean 0,12–0,14 ms/update | Chi phí nhỏ khi không cast |
| World-depth combat | mean 2,72–2,76 ms/update; max 91,8–102,9 ms | Có spike trong phần trình diễn ánh sáng |
| CPU profile combat | emission `world()` ~165 ms inclusive, trong ~230 ms sampled `ArenaScene.update` | Ưu tiên xác minh và loại bỏ phân tích pixel lúc combat |
| CPU profile combat | `getProgramParameter` ~673 ms self cộng dồn | Có chi phí truy vấn/chuẩn bị shader, cần warmup và đo cold/warm riêng |
| CPU profile combat | outline `drawContour` ~27 ms self; contour path ~31 ms inclusive | Tạo viền theo frame ngay trong combat cũng có chi phí |

`DepthEmissionPoints.world()` cache theo texture/frame/tone, nhưng lần gặp frame mới vẫn `drawImage`, `getImageData` 48×48 rồi quét vùng pixel bằng vòng lặp lồng nhau. `M3dHitArt.contour()` tạo CanvasTexture và tính viền theo alpha khi target đang nhận hit; cache có sẵn nhưng không loại bỏ spike khi gặp frame mới. Đây là công việc CPU đồng bộ có thể chuyển ra khỏi khung hình chiến đấu.

Phép so sánh depth on/off tuần tự có thay đổi cold/warm cache và skill cooldown, số frame ít; **không dùng để tuyên bố phần trăm tăng FPS**. Chi phí được nêu là số đo trên môi trường QA, không phải độ trễ trên máy người dùng.

Đo controller PvP riêng, không browser: ba seed-42 run, mỗi run 120 tick khởi động + 600 tick đo, 128 input được nhận, 28 cast và 85 hit trên toàn 720 tick. Mean simulation 0,197–0,269 ms/tick; P95 0,527–0,826 ms/tick. `snapshot()` + JSON.stringify riêng mean 0,0047–0,0066 ms, snapshot trung bình ~765 byte. Không bao gồm toàn bộ `MatchRoom.syncState`, Schema encoding, socket hoặc WAN.

Một điểm khác về cảm giác điều khiển: [ArenaScene](../apps/game-client/src/arena-scene.ts) bật local movement prediction cho arena thường nhưng loại PvP/practice; nhân vật PvP vẫn nội suy từ state server. Đây là khác biệt đã xác nhận bằng code, chưa phải nguyên nhân đã chứng minh của tụt FPS. Nếu sửa cần dùng đúng bounds/collision của map PvP và xử lý stun/root/dash/knockback, vẫn để server quyết định vị trí thật.

[PvP measurements/events](evidence/sessions/m4d-performance-investigation-20261127/pvp/measurements.json), [PvP core](evidence/sessions/m4d-performance-investigation-20261127/pvp-core.json), [CPU profile](evidence/sessions/m4d-performance-investigation-20261127/pvp/client-combat.cpuprofile).

## Thứ tự cải thiện đề xuất

| Ưu tiên | Thay đổi cụ thể | Kiểm chứng cần có |
| --- | --- | --- |
| 1 | Xuất metadata điểm sáng theo frame/tone lúc prepare asset; precompute hoặc chuẩn bị dần contour trước combat; warm shader/material đang dùng ở giai đoạn loading | Cold và warm cast, cùng skill/seed/map; giữ nguyên alpha, pivot, timing và approved PNG; không `getImageData` trên frame combat khi metadata đã có |
| 1 | HUD giữ tham chiếu DOM, chỉ ghi text/attribute khi giá trị đổi; menu đóng không dựng lại nội dung; phần phụ có thể cập nhật 10–15 Hz | HP/MP/cooldown và phím vẫn phản hồi đúng; kiểm tra PvP, party, menu/focus; đo UI CPU và layout trước/sau |
| 2 | Bỏ bớt công việc trình diễn cho actor/VFX ngoài camera với margin; tái sử dụng view khi quay lại; danh sách emitter thay cho scan mọi object | Giữ server state, lifecycle và event cleanup; không pop khi dash, quay camera, vào vùng hoặc reconnect |
| 2 | Pool transient VFX theo đường đã đo có allocation cao; giảm lớp halo/ánh sáng phụ trong quality setting | Giữ nguyên đường đạn, telegraph, vùng damage, nhịp skill và độ đọc multiplayer; đo allocation và frame tail |
| 2 | Nếu còn chậm phản hồi PvP: hỗ trợ prediction/reconciliation hình ảnh theo đúng geometry map | Đo input→server receipt→patch→render khi có RTT/jitter; test CC, va chạm, dash và peer authority |
| 3 | Cache parse PvP/status JSON theo raw value; cập nhật derived stats theo revision/dependency; xem xét typed state nếu bandwidth thực sự là điểm nghẽn | Hiện Colyseus đã gửi delta theo field; chuỗi JSON thay đổi vẫn là một field. Cần test privacy/zone/late join và đo wire bytes |

Không giảm simulation tick, bỏ collision, giới hạn target, đổi damage hoặc bỏ telegraph để đạt số đo đẹp. Chưa có phép đo deployment/WAN nên không kết luận ping/băng thông bình thường. Chưa có chứng cứ cần thay engine/framework.

Phaser cũng khuyến nghị giảm object/data upload/draw call và tránh update text texture liên tục ([Phaser 4 rendering concepts](https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Rendering%20Concepts/Phaser%204%20Rendering%20Concepts.md)). Truy vấn shader/program có thể gây đồng bộ và chờ compile ([MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_blocking_api_calls_in_production)). Colyseus theo dõi thay đổi từng property; không cần thay bằng broadcast full snapshot ([state sync](https://docs.colyseus.io/state)).

## Môi trường và lệnh đã chạy

- Checkout bắt đầu trên `milestone/m4d` ở `C:/Users/ADMIN/.codex/worktrees/milestone-m4d/volam-hero-defense`. Trong lúc điều tra có tác vụ khác thay source và chuyển nhánh sang `wip/m4d/diff-level`; không switch/revert/commit thay đổi của họ. [Hashes lúc kết thúc](evidence/sessions/m4d-performance-investigation-20261127/source-hashes-at-end.json) là thông tin truy vết, không khẳng định khóa nguyên trạng toàn bộ thời gian đo.
- Phaser 4.2.1; Colyseus core 0.18.23, SDK 0.18.8, Schema 5.0.42; Chromium 156.0.8078.4; dev client, viewport 1440×1000/context. WebGL renderer dùng **ANGLE SwiftShader phần mềm**. Frame spacing rất thấp ngay idle nên không suy ra FPS phần cứng, không cam kết 60 FPS.
- `pnpm qa:preflight --mode browser --config playwright.config.ts`: PASS ở các lần trước browser, ports riêng 28941/28942 và 28943/28944. `pnpm exec tsc -b`: exit 0 trước probe. Không build production cho điều tra này.
- Các probe đã chạy từ `.cache/performance-investigation`: `pnpm --filter @volam/game-server exec tsx ../../.cache/performance-investigation/probe.ts`, tương tự `pvp-probe.ts`, `core-probe.mjs`, `pvp-core.mjs`. [Bản mã probe lưu để xem/rerun](evidence/sessions/m4d-performance-investigation-20261127/probes/) đã sửa relative import cho vị trí lưu. Rerun cần set QA session/ports/browser path, preflight và kiểm tra lại source/build hiện tại; dùng thư mục output mới để bảo toàn kết quả cũ.
- Hai lần probe đầu lỗi do working directory và chữ ký helper quan sát; giữ riêng `failed-probe-cwd.json`, `failed-probe-helper-signature.json`. `core-idle.json` là run trước khi sửa chữ ký submit input, chỉ là idle, không phải kết quả combat. Các kết quả hoàn tất chính không ghi nhận page error.
- Service/browser do probe sở hữu đã đóng; kiểm tra không còn listener tại bốn cổng QA trên. Không ghi video/GIF/trace screenshot stream.
- Chỉ tạo báo cáo/evidence/probe điều tra; không sửa runtime/asset/spec. Không chạy `check:final` vì chưa có thay đổi implementation. Chưa chạy production GPU, WAN/jitter, sáu browser chơi thật, đầy đủ trường phái/boss hoặc soak dài.
