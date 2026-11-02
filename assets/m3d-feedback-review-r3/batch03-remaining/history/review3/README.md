# M3D VFX r3 — duyệt một lượt phần còn lại

Viewer: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/?review=3>.

23 mục art còn lại đã có candidate trong cùng viewer. Ca Diệp batch01 và Phá Giáp Bổng review3 đã duyệt được giữ nguyên ở package trước; approval của chúng không áp dụng cho batch này. Chưa sửa production Phaser, game-core, server, protocol hay merge milestone.

Chọn mục và biến thể ở hàng trên, A trình một cast; riêng A Thiếu Lâm cần bấm bốn lần cho bốn nhịp. Mũi tên đổi facing và hủy cast cũ. Space dừng; thanh thời gian và ±frame để xem pose/phase. Có tốc chậm, body/VFX riêng, baseline art, lặp chủ động, hold/release và cancel/chết/đổi vùng. “Nền / reference” mở bốn nền theo thứ tự đã chốt và ảnh tham chiếu. “Tags / bàn giao” hiển thị đúng frame, pivot, layer và recipe của mục đang chọn.

Canvas native640×360, hiển thị2×, school body44px và boss56–60px. Không thu người/map để nhét UI bên ngoài. Một số projectile đi ra ngoài viewport ở hướng dọc do range demo dài; không đổi zoom để làm vừa. Sàn nền là concept thu về viewport, chưa phải mật độ tile/runtime map được duyệt.

12 source raster mới sinh bằng công cụ image_gen tích hợp: lốc vàng, bàn chân khí, bán nguyệt, bộ Phật/chưởng/ground glyph, đầu sư tử/sóng, vòng phất trần, kim luân tròn, một đao lửa Hồng Liệt, body Kim Luân chém tay bốn hướng và ba concept arena. Aseprite xuất source chỉnh sửa được cùng PNG/JSON/individual frames. Source là raster phẳng; không giả có layer vẽ gốc được khôi phục. Các phần còn lại tái dùng art cũ và thay recipe trình diễn, giữ nguyên byte nguồn.

Các tài liệu chính:

- `manifest.json`: atlas registry, available tags và selected tags tách rõ; không chọn toàn bộ support container.
- `selected-tags.json`: 132 scene/facing/variant/beat, frame order/duration/pivot cùng actor/effect phases và tọa độ demo.
- `frame_inventory.csv`: frame được chọn, facing/phase và anchor.
- `provenance.json`, `source/generation_records.json`, `support-copy-manifest.json`: prompt, nguồn, thời gian sinh, hash và bản sao.
- `handoff.json`: contract gameplay đã chốt, thông số pending và gate tích hợp sau duyệt.
- `previews/*_contact_1x.png`: contact sheet native; `*-native-1x.png` và `*-display-2x.png`: PNG từ viewer thật.
- `previews/browser-validation.json`, `motion-validation.json`, `static-validation.json`, `protected-before.json`, `protected-after.json`: bằng chứng có phạm vi riêng.

Giới hạn cần director xem: đây là candidate art trong Canvas độc lập, chưa live Phaser/multiplayer. Wheel là billboard tròn thật; quỹ đạo orbit là ellipse ground, không squash wheel. Body Kim Luân chém tay mới đủ bốn hướng; action cũ của Kim Luân/Hoắc Đô/Đạt Nhĩ Ba giữ giới hạn hướng dưới đã có trong nguồn được chọn. Chọn facing khác cho chúng đổi hướng trình projectile, không chứng nhận body action bốn hướng. Ground chữ Phạn là họa tiết glyph trang trí từ ảnh sinh, chưa xác nhận văn bản Phạn ngữ.

Baseline là art cũ với recipe review có nhãn; không phải replay state/event của production r2. Timing, số salvo, quãng, trajectory và các hệ số chưa được chỉ định đều là fixture mỹ thuật. Không dùng chúng làm damage, cooldown, stun, collision, teleport hoặc tracking. Ba nền mới là concept bố cục, cần Tiled/layer/foreground/collision ở lượt triển khai sau. Overlay footprint80% hai chiều không đổi camera/sprite hay map thật.

## Lệnh kiểm

```powershell
python assets/m3d-feedback-review-r3/batch03-remaining/source/tools/build.py validate
node assets/m3d-feedback-review-r3/batch03-remaining/source/tools/select.mjs
python assets/m3d-feedback-review-r3/batch03-remaining/source/tools/finish.py
$env:PLAYWRIGHT_BROWSERS_PATH='D:/Projects/volam-hero-defense/.cache/ms-playwright'
$env:VOLAM_QA_SESSION='m3d-r3-batch03-all-remaining'
$env:VITE_SERVER_URL='http://127.0.0.1:2887'
pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs
```

Server xem art do task này sở hữu chạy tại5513 (`../source/tools/serve.mjs`). Không video/GIF/WebM/MP4, browser video và trace đều tắt. Kết quả final thực tế được ghi trong báo cáo quan sát, không suy từ việc có PNG.


## Kết quả verification cuối

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS, exit0**, 220.70s. Có18 workflow tests,498 unit/integration tests/43 files, build,15 asset validators và4 browser tests (75.22s). Hai test của batch03 cùng các regression Ca Diệp/Phá Giáp đều PASS. Không mượn kết quả trước để ghi PASS. Endpoint game preview vẫn là2887.

Batch03:23 item,132 scene/facing/variant/beat,300 selected tags với944 frame references đã paint từng cel bằng requestAnimationFrame; composite normal-speed và chuỗi A thủ công chạy thật trong viewer. Registry support có551 available tags/1768 references, KHÔNG phải tất cả được chọn.112 cel mới qua binary alpha, không chạm biên canvas và khớp atlas/individualPNG; wheel bbox42×41/42 hoặc41×42, sai số raster tối đa1px. 5.207 file trong approval/lock inputs đã kiểm nguyên hash. Native contacts25 component và PNG viewer được lưu tại previews.

Report: `docs/evidence/sessions/m3d-r3-batch03-all-remaining/check-workflow/final-timings.json`; static/protected/bounds/browser/motion reports trong package.7 report validator chỉ đổi newline đã được chứng minh LF-normalized giống HEAD rồi trả lại đúng bytes; không khôi phục hay ghi đè thay đổi nội dung khác. Chưa live Phaser/multiplayer r3; quality và mức độ che hình của VFX×4 vẫn cần director duyệt. Không video/GIF hoặc merge.
