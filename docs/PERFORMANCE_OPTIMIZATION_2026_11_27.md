# Tối ưu hiệu năng client M4D — 27/11/2026

Triển khai theo [điều tra hiệu năng](PERFORMANCE_INVESTIGATION_2026_11_27.md), tập trung giảm công việc trong lúc đông quái và PvP. Không đổi simulation, network/protocol, input, targeting, damage, cooldown, đường đạn, animation timing, camera, chất lượng hình ảnh hoặc raster asset. Các thay đổi gameplay/wave pacing có sẵn trong checkout thuộc công việc khác và được giữ nguyên.

## Đã thay đổi

- [Ánh sáng](../apps/game-client/src/world-depth-emission.ts): cache theo đối tượng Frame, dùng chung giữa các hệ ánh sáng; chuẩn bị ba tone cho các frame emitter nhận diện được sau khi đăng ký/replacement texture hoàn tất và trước scene-ready. Chuyển map/art pack cũng chuẩn bị cache sau đăng ký. Frame mới chưa có cache vẫn dùng sampling gốc, bảo toàn kết quả; Frame được thay sẽ không đọc nhầm cache cũ. Không tạo texture GPU riêng cho từng điểm sáng.
- [Pixel math](../apps/game-client/src/pixel-analysis.ts): summed integer weights tìm cửa sổ sáng, giữ nguyên thứ tự cộng floating point cũ khi hòa và khi tính strength; contour dùng hai sliding maxima tuyến tính thay vòng lặp lân cận vuông. Canvas sampling, trim/flip/origin, màu/alpha và padding giữ nguyên. Regression so sánh tọa độ/strength chính xác và từng byte RGBA với thuật toán cũ.
- [HUD](../apps/game-client/src/dom-updates.ts): cache lookup ID khi node còn kết nối với document; lookup lại khi menu/viewport bị thay. Guard text/property/attribute/style ở 104 vị trí trong `GameUI.refresh`, kể cả shorthand CSS đã được browser normalize. Tránh đổi class icon A sang legacy rồi đổi lại trong cùng patch. Không giảm tần suất cập nhật số liệu hoặc trì hoãn phản hồi input.
- [Presentation state](../apps/game-client/src/presentation-state-cache.ts): parse status một lần cho mỗi raw value của actor; HUD/renderer dùng chung decoded PvP snapshot theo raw value. WeakMap không giữ actor/room đã bị thu hồi. Tick dùng chung trong một lượt render thay vì tính lại cho từng actor. Không sửa dữ liệu authoritative.

Không bỏ animation/cast ngoài camera, không giới hạn target, giảm lớp VFX hay thêm prediction PvP trong lượt này. Shader warmup riêng chưa được thêm; các thay đổi này tập trung vào đường xử lý pixel, DOM và JSON đã đo, với kiểm tra tương đương hình ảnh rõ ràng.

## Đông quái

Profile mới đặt 200 quái wave 1 tại các vị trí không va chạm, đứng yên, damage 0; hai browser context thật. Body quan sát là `renovated-creep_wild_dog`, không dùng fallback. Level/HP/vị trí là prerequisite fixture; di chuyển, học skill qua HUD, cast Q/W và sát thương không bị inject.

Focused R4 đã PASS: 200 body tồn tại, server/peer cùng nhận di chuyển, Q được nhận và gây damage, W gây thêm damage, mana HUD khớp state. Trong cửa sổ ổn định, tên hero và class/style icon A có **0 mutation thừa**. Số readback sampling ánh sáng giữ nguyên **6.074 trước/sau cast** trên client được quan sát. Đây là đếm readback với đúng đích 48×48, không lẫn canvas contour.

## PvP 1v1

Focused R4 đã PASS với hai context trên Rừng Trúc, Cái Bang Chưởng/Thiên Sơn Đao. Tắt hazard bằng UI để không nhận nhầm damage môi trường. Giữ passive Bắc Minh: Q đầu có thể hit hoặc dodge hợp lệ; Phi Ảnh thực sự làm giảm HP Cái Bang và peer nhận cùng kết quả. Extra HP/vị trí chỉ giữ ca đo sống đủ lâu.

HUD ổn định có **0 mutation thừa** trên hai vùng được theo dõi; readback sampling giữ nguyên **6.073 trước/sau cast**. Không có page error ở hai ca. Đã mở PNG crowd/PvP và kiểm tra HUD nằm trong viewport, body, pivot/feet và bố cục hiện tại. PNG không thay cho quan sát cast/hit trong browser.

## Số đo CPU và giới hạn

[Benchmark CPU](evidence/sessions/m4d-performance-optimization-20261127/pixel-benchmark.json) dùng cùng RGBA synthetic có seed, đảo thứ tự cũ/mới qua bảy vòng, so median; [mã benchmark gốc](evidence/sessions/m4d-performance-optimization-20261127/pixel-benchmark-source.txt) giữ nguyên để truy vết:

| Batch | Cũ | Mới | Tỉ lệ |
| --- | --- | --- | --- |
| 900 lần tính điểm sáng, ba tone | 121,34 ms | 51,43 ms | 2,36× |
| 50 contour 192×192, padding 2 | 155,34 ms | 120,12 ms | 1,29× |

Đây là thuật toán CPU; không gồm sampling Canvas, upload GPU hay FPS. Giới hạn hình ảnh/frame, seed và byte oracle được giữ trong [regression](../tests/presentation-performance.test.ts) và [cache regression](../tests/depth-emission-cache.test.ts).

Sampling/preparation batch lúc loading có khoảng thời gian quan sát **1,97–3,31 giây** trong focused R4; đây là chi phí chuyển ra trước combat, không phải tuyên bố startup nhanh hơn. Trong final, khoảng thời gian này là 3,81 giây (PvP) và 4,52 giây (crowd); số đo phụ thuộc tải máy QA. Browser QA dùng Chromium/ANGLE SwiftShader phần mềm. Chưa đo GPU thật, WAN/jitter, toàn bộ cặp phái, six-client combat hoặc soak dài. Không cam kết mức tăng FPS từ các số đo này.

## Kiểm chứng

- `pnpm check:quick tests/presentation-performance.test.ts`: PASS 6 tests.
- `pnpm exec vitest run tests/depth-emission-cache.test.ts tests/presentation-performance.test.ts`: PASS 7 tests; có tọa độ trim/flip, cache chia sẻ và Frame replacement.
- `pnpm exec tsc -b apps/game-client` và `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS trên candidate trước focused R4.
- Focused browser R4: preflight PASS, `node tools/run-playwright.mjs test --config playwright.performance.config.ts`: **2 passed**, 1,7 phút. [Crowd](evidence/sessions/m4d-performance-optimization-r4-20261127/performance-optimization/crowd.json), [PvP](evidence/sessions/m4d-performance-optimization-r4-20261127/performance-optimization/pvp.json).
- `pnpm check:final --config playwright.performance.config.ts`: **PASS** cả 43 stage, 1.424 unit/integration tests, toàn bộ workflow/typecheck/build/asset guards và 2 browser tests. Tổng 615,38 giây; browser 163,23 giây. [Final timings](evidence/sessions/m4d-performance-final-20261127/check-workflow/final-timings.json), [final crowd](evidence/sessions/m4d-performance-final-20261127/performance-optimization/crowd.json), [final PvP](evidence/sessions/m4d-performance-final-20261127/performance-optimization/pvp.json). Hash mười file client đã đổi giữ nguyên xuyên suốt kiểm tra. Không chạy lại full suite sau cập nhật báo cáo.

Các vòng browser thất bại R1–R3 giữ nguyên log trong evidence riêng. Chúng phát hiện vị trí/hướng chưa đúng với Q dạng dash hiện tại, passive dodge hợp lệ và ring debug chỉ giữ 60 event không phù hợp với 200-target burst. Fixture cuối dùng receipt cooldown/input cho stress, HP authoritative và event dodge đúng luật; không sửa production combat để làm test PASS. Profile có contract preflight/owned services riêng, video/trace tắt; service được teardown bằng handle của chính ca QA.

Không có PNG/WebP/Aseprite tracked nào thay đổi bởi công việc này. Approved hash/asset guards của final đã PASS; passing test không cấp thêm art approval.
