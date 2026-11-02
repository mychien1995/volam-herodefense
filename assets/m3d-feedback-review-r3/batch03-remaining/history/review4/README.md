# M3D VFX r3 · review4 theo feedback director

Viewer: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/?review=4>.

22 mục active; **Phất Trần Công đã rút khỏi thay đổi**, giữ hiện trạng trong game. Review3 cũ cùng PNG/recipe/handoff được giữ ở `history/review3/`. Ca Diệp batch01 và Phá Giáp review3 đã duyệt vẫn nguyên byte. Batch này chưa được duyệt cả lượt, chưa sửa production Phaser/game-core/server/protocol hay merge milestone.

Chọn mục/biến thể/facing, A trình một cast; A Thiếu Lâm cần bốn lần cho bốn nhịp. Mũi tên đổi hướng và cleanup cast cũ; Space dừng, thanh timeline/±frame xem pose. Có slow playback, body/VFX riêng, baseline, lặp chủ động và hold/release/cancel/chết/đổi vùng. Nền/reference và tags/handoff nằm trong overlay của cùng viewport. Canvas native640×360, hiển thị2×; school44px, boss56–60px.

Review4 sửa bằng cách tái dùng raster đã có và chỉnh renderer/recipe, không sinh raster mới. Đao trái phản chiếu ngang đúng lưỡi/sống, giữ chuôi trên đầu và ground-break. Khôi phục bốn chó lửa và animation xoay lướt Túy Tiên Bộ runtime. Tru Tà và A2 Hồng Liệt là nhát chém gắn với người, không projectile. Các gốc phát nằm giữa thân. Vô Ảnh Cước có ba làn song song bậc thang. Kim Quang đứng giữa trận, dùng idle/walk sau activation thay vì lặp pose cast. Âm Dương dùng lại ground ring/waves runtime với tâm di chuyển, bỏ riêng large_formation/core.

Các giá trị chưa director chỉ định như lane18px, release200/510/820ms, needle400px, whirl radius120px hay aura motion đều là fixture trình bày. AOE phất trần360 +20% hiển thị bằng scale1.2 của radius; không suy thành +20% diện tích hay tuning server. Range A2 vẫn theo yêu cầu A Phiến220+10%=242; đây là cung chém180° trước boss. Skill stats và hit contracts phải chốt/bind state/event thật sau duyệt.

Tài liệu hiện hành:

- `source/review4-render-corrections.json`: từng quyết định, anchor và transform cụ thể.
- `manifest.json`: available/selected tags tách riêng, withdrawn và history.
- `selected-tags.json`:128 scene/facing/variant/beat, frame order/duration và actor/effect recipe; mirror/placement/pivot nằm trong effect record, không suy render facing từ source tag khi có mirror.
- `frame_inventory.csv`: selected source frame inventory; `handoff.json`: contract và gate tích hợp.
- `provenance.json`, `support-copy-manifest.json`: source hashes, exact retained copies;12 raster source của review3 vẫn giữ nguyên cùng prompt trong `source/generation_records.json`.
- `previews/review4-*-native-1x.png`, `*-display-2x.png`: PNG viewer mới; contact source cũ vẫn giữ vì raster không đổi.
- `previews/review4-corrections-validation.json`: assertions hình học và mẫu playback normal-speed; browser/motion/static/protected reports có scope riêng.

Chưa phải live Phaser/multiplayer acceptance. Các action body cũ Kim/Hoắc Đô/Đạt Nhĩ Ba vẫn có giới hạn hướng dưới; body chém tay Kim mới đủ bốn hướng. Ba nền mới vẫn là concept, chưa Tiled/collision. Một số VFX/range vượt viewport theo normal scale, không đổi zoom để giấu.

Phạm vi baseline là art/recipe so sánh, không phải replay state production. Với Chu Bá Thông, giữ đúng source spin/ring/wind/rotating_ring/rotating_waves hiện dùng. Tech chuFields đang có cell base+jitter; director yêu cầu không lưới cố định đã ghi cho integration sau. Viewer cho các tâm đi liên tục, không dùng đường demo làm gameplay. Không tuyên bố server đã thay đổi.

Kiểm tra theo `docs/DEVELOPMENT_WORKFLOW.md`: focused static/geometry/browser khi lặp, sau thay đổi implementation cuối chạy `pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`. Giữ `VITE_SERVER_URL=http://127.0.0.1:2887`, `PLAYWRIGHT_BROWSERS_PATH=D:/Projects/volam-hero-defense/.cache/ms-playwright` và session `m3d-r3-batch03-review4`. Report cuối được ghi sau khi command hoàn tất. Không video/GIF/trace playback.


## Verification review4

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS exit0, 252.94s**,18 workflow tests,498 unit/integration tests/43 files, build,15 validators và5 browser tests. Batch03 có293 selected tags/915 references được paint từng cel,22 mục active. Guard sửa lỗi có73 assertions và20 cặp PNG native/display; playback normal-speed/lifecycle trong report riêng. Không recording, không Phaser/multiplayer acceptance r3.

Report cuối: `docs/evidence/sessions/m3d-r3-batch03-review4/verification-summary.json` và `check-workflow/final-timings.json`.7 report validator chỉ đổi newline đã chứng minh LF-normalized bằng HEAD và trả lại đúng byte; không khôi phục bất kỳ thay đổi nội dung khác. 5.207 entry trong approval/lock được đối chiếu; r2, Ca Diệp và Phá Giáp nguyên byte.
