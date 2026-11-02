# R3 batch02 review3 — Phá Giáp Bổng: nâng rồi đập, vệt dài hơn

**Director đã duyệt visual review3; 34 file art được khóa trong approved_pha_giap_review3.lock.json. Chưa tích hợp gameplay/Phaser.**

Viewer: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/?review=3>.

Quyết định mới nhất: “Bỏ hiệu ứng xoay gậy đi, chỉ giơ lên và đập thôi, hiệu ứng quãng bị đập dài hơn”. Quyết định này supersede yêu cầu xoay gậy của review1/review2. Nguồn và bản xem cũ được giữ tại `history/review1/`, `history/review2/`; không chọn clip xoay trong manifest hiện hành.

## Phần được chọn

- Body: `b3_pha_giap_body`, 16 frame references/12 tag. Mỗi hướng có raise2 cel (nâng gậy thường rồi gậy dài), strike1 cel, recovery1 cel; không có phase xoay, tụ lực hoặc hold hóa dài riêng.
- VFX: `b3_pha_giap_vfx`, 8 cel/8 tag, chỉ impact/outro bốn hướng. Vệt dài được tạo bằng image_gen từ style nguồn cũ, không kéo giãn cả bitmap cũ. Giữ source/prompt/provenance.
- Tổng24 frame references/20 tag, hai source Aseprite, PNG atlas/hash JSON và PNG riêng từng frame. Body tái dùng16 pose hợp lệ; source xoay cũ chỉ còn là lịch sử, không được load bởi manifest này.
- A một cast, bỏ key repeat; arrows chọn facing, Space pause, scrub, tốc chậm và manual loop cả lượt trình diễn. Inspector chỉ trình contact sheet của frame được chọn, không có tab xoay.

## Feet, anchor và quãng minh họa

| Component | Canvas | Pivot/anchor | Placement |
| --- | --- | --- | --- |
| b3_pha_giap_body |256×192|(128,148) feet|caster feet cố định trong từng cast |
| b3_pha_giap_vfx |512×512|(256,256)|đường sáng gần nguồn, offset theo feet |

Giữ cách đo median near-end ground seam của review2, không lấy phần trăm bbox có bụi làm groundY. Offset trái(-16,+6), phải(+16,+6), xuống(0,+12), lên(0,-12). Core ngang export ởY256 khớp anchor, vệt vẫn nằm dưới chân.

Phần forward opaque extent từ feet, đơn vị world pixel của viewer:

| Hướng | Review2 | Review3 | Tỉ lệ |
| --- | ---: | ---: | ---: |
| Phải |142|213|1.50 |
| Xuống |89|133|1.49 |
| Trái |146|219|1.50 |
| Lên |94|140|1.49 |

**Khoảng +50% là lựa chọn minh họa art cho yêu cầu dài hơn, chưa phải thông số range gameplay được chốt.** Dùng scale đồng đều X/Y trên từng effect mới để giữ tỉ lệ spark/đất, không kéo giãn trục riêng. `source/measured-ground-anchors.json` ghi baseline/target/scale. Không biến canvas, footprint, flash hoặc thời điểm frame thành hitbox/damage.

Timeline fixture740ms: raise280ms → strike220ms → recovery240ms. Gameplay range/damage/cooldown/giảm giáp và lịch hit tiếp tục chờ bind tech/server ở lượt tích hợp sau. Caster được bố trí khác nhau khi chọn hướng lên/xuống để cả vệt dài nằm trong vùng review; vị trí không thay đổi giữa một cast, không phải gameplay movement.

## Kiểm chứng và giới hạn

- Static validator PASS:24 frame không rỗng, alpha binary, không clipping, atlas đúng PNG riêng; không chọn spin/charge/elongate. Forward extent cả bốn hướng bằng khoảng1.5 lần baseline. Ground core ngang khớp pivot.
- Browser scope kiểm toàn bộ20 tag/24 frame, ba phase đúng thứ tự, hai pose raise, không frame xoay/tụ lực, không VFX trong raise, cleanup, A một cast và cả vệt dài nằm trong viewport ngoài HUD. Kết quả cuối ghi tại `docs/evidence/sessions/m3d-r3-batch02-review3/`.
- Kết quả cuối: `check:final` qua21 prerequisite stages, gồm typechecks,18 workflow tests,498 unit/integration tests/43 files, build và15 validators. Lượt browser đầu quét nhầm một spec review2 trong history nên command exit1; hai spec hiện hành đều PASS. Đã thêm testIgnore history và rerun riêng bước browser: **2 passed (26.7s), exit0**. Giữ report FAIL ban đầu và diagnostic; không lặp các prerequisite đã PASS. Chi tiết trong `verification-summary.json` của session trên.
- Đã mở PNG normal zoom `review3-strike-left-display-2x.png`, `review3-strike-right-display-2x.png`: vệt mới dài hơn rõ, neo dưới chân, không có xoay.16 pose body giữ nguyên pixel so với review2; chỉ phase selection/timeline được rút gọn. Chưa director duyệt review3.
- Đây là Canvas2D độc lập, logical640×360/display2×, body neutral khoảng44px. Các PNG review3 là bằng chứng thực tế; không được gọi là live Phaser/multiplayer PASS.
- Giữ nguyên1004 file khóa visual r2,55 file Ca Diệp đã duyệt và8 file baseline Cái Bang. Không sửa production loader/registry/renderer, server/protocol hoặc merge milestone.
- Không tạo video/GIF/WebM/MP4, không trace playback. Không tự đánh dấu Phá Giáp đã approved.

## Tái lập

Từ repo root, server5513 do task sở hữu đang chạy bằng `node assets/m3d-feedback-review-r3/source/tools/serve.mjs`:

```powershell
python -X utf8 assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source/tools/build.py
python -X utf8 assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source/tools/build.py validate
$env:PLAYWRIGHT_BROWSERS_PATH='D:/Projects/volam-hero-defense/.cache/ms-playwright'
$env:VITE_SERVER_URL='http://127.0.0.1:2887'
pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs
python -X utf8 assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source/tools/finish.py
```

Builder tái dùng retained measurement/raster assembly/contact exporter. Component IDs mới b3 giữ các export b2 cũ làm lịch sử. Source body v02 tái dùng, ground v04 mới; source spin v03 không được chọn. Ca Diệp đã khóa không bị rebuild.
