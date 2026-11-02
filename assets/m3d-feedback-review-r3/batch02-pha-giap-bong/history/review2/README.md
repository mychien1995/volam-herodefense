# R3 batch02 review2 — Phá Giáp Bổng: sửa ground trái và xoay gậy thật

**Chờ director duyệt pose/VFX; chưa phải animation production hoàn chỉnh.**

Viewer: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/>.

Scope: `pha_giap_bong`, Cái Bang Bổng. Bản mới **xoay → giơ gậy → hóa dài → bổ một đường xuống đất → hồi thế**. Đây là batch nhỏ theo [prompt director](../../../docs/M3D_PLAYTEST_FEEDBACK_2026-11-02.md), cần chốt pose mới trước khi mở rộng in-between. Ca Diệp đã duyệt giữ nguyên55 file source/export trong lock riêng; các mục r3 khác không được suy là đã duyệt.

Review2 đáp ứng feedback: “Phá Giáp Bổng animation trái đang hơi lỗi. Đường bổng đập không hiện dưới đất mà hiện ngang với player. Nếu hiệu ứng xoay có thể làm xoay gậy thì tốt”. Asset review1 chưa được duyệt; source/atlas/PNG/report cũ đã giữ tại `history/review1/`, raster nguồn cũ vẫn còn nguyên.

## Sản phẩm hiện có

- 48 body frame references và20 VFX references, đủ right/down/left/up; hai source Aseprite, PNG atlas/JSON hash, PNG từng frame, metadata, contact native và viewer độc lập. Tổng36 tag/**68 frame references**, không phải68 pose mới vẽ độc lập.
- Body có năm phase/hướng `spin`, `raise`, `elongate`, `strike`, `recovery`. Spin mới8 frame/hướng (40ms/frame,320ms/cycle) dùng6 pose raster khác nhau/hướng; frame vertical/diagonal được lặp để nối vòng quay.16 pose nâng/đập/hồi từ review1 giữ nguyên pixel. VFX spin2 cel đồng bộ320ms/cycle, các phase còn lại một cel/hướng. Chưa gọi đây là full in-between production animation.
- Source spin mới có24 cel. Cel trái cột4 sai chiều diagonal không được chọn; dùng mirror pose phải cột2 để tạo diagonal còn thiếu, không xoay toàn nhân vật bằng code. Mapping/reuse được ghi trong `source/spin-selection.json`, không giả rằng mọi frame tham chiếu là hình vẽ mới.
- Xoay dùng vệt vòng mở, không dome che nhân vật; ánh tụ đặt tại đầu gậy; impact là một vệt đập đất phía trước. Không chọn lại `foot_explosion` r2 cho rework này, không biến vệt đập thành projectile tự bay hoặc DoT.
- A một cast, giữ phím không tự phát lại; arrows chọn facing, Space pause, scrub, tốc chậm, loop chỉ khi bật, cancel/chết/đổi vùng fixture, R2 baseline và xem raster nguồn.
- Source v01 có strike_up sai hướng, giữ nguyên làm lịch sử; v02 cung cấp pose nâng/đập/hồi, v03 cung cấp xoay. Nguồn VFX raster giữ nguyên; chỉnh registration thay vì vẽ lại đường đập. Không dùng procedural Graphics làm art.

## Placement và phase contract

| Component | Canvas | Pivot/anchor | Placement |
| --- | --- | --- | --- |
| b2_pha_giap_body |256×192|(128,148) feet|caster feet, cố định; body target44px ở spin pose, các pose giơ gậy cao hơn vì weapon |
| b2_pha_giap_vfx |384×384|(192,192)|spin tại tay, charge tại đầu gậy, impact/outro theo đường sáng gần chân với offset riêng |

Offset cụ thể từng clip trong `*.animations.json`; frame order chỉ dùng named `frames[]`, không đoán từ grid. `source/foot-anchor-corrections.json` ghi các điểm giày sửa thủ công: detector cũ bắt nhầm đầu gậy dài là chân ở ba strike poses. Source scale cố định0.285714 cho nâng/đập/hồi và0.236559 cho source spin mới; cả hai neutral body khoảng44px. Không fit lại từng frame. VFX scale giữ cố định theo nhóm phase.

Lỗi vệt trái review1: anchorY lấy70% bbox cao170px của effect, trong khi core đường sáng gần caster ở55px; bbox có bụi làm đường bị kéo lên26.88 world pixels. Review2 đo median core gần đầu nguồn, chỉ dùng pixels thuộc effect. Export impact/outro trái có medianY192 đúng anchorY192 (phải193, sai số1px). Metadata offset impact/outro trái(-16,+6), phải(+16,+6), xuống(0,+12), lên(0,-12) đều từ feet; horizontal core nằm dưới giày, không gắn vào torso. Chi tiết tại `source/measured-ground-anchors.json`. Việc này không đổi range gameplay.

Một lần thi triển trong viewer minh họa1420ms, năm phase lần lượt320/300/300/220/280ms. Đây chỉ là fixture. Damage/range/cooldown/hitbox/giảm giáp phải bind tech/server ở lượt tích hợp sau. Canvas không phải vùng trúng đòn. Không tạo damage từ frame contact, kéo dài loop hoặc số lần vẽ.

## Kiểm chứng thực tế

- Static source/export validator review2 PASS:68 PNG frame references không rỗng, alpha binary, không clipping, atlas đúng PNG riêng,36 tag và frame order. Ground core phải nằm cách anchor không quá3px; spin body phải có ít nhất4 pose raster khác nhau, kết quả thực tế6/hướng. VFX canvas384×384 giữ từ bản sửa clipping review1.
- Focused browser command: `node tools/run-playwright.mjs test --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs --grep 'Phá Giáp Bổng'`: **1 passed (14.5s)**. Vẽ toàn bộ cel/tag qua rAF; bốn cast quan sát đủ spin/raise/elongate/strike/recovery; feet/world ground origin cố định; key repeat không replay; cancel/chết/đổi vùng/đổi facing dọn effect; pause/scrub và inspector hoạt động; không page error.
- Focused browser review2: cùng command, **1 passed (19.5s)**. Mỗi natural cast thực sự vẽ đủ8 body spin frames, observation tách khỏi clip inspector để không tính nhầm frame từ test trước. Assert vị trí render thực tế dùng offset từ feet; vệt trái/phải nằm dưới feet. Đã mở PNG `review2-strike-left-display-2x.png` và `review2-spin-left-display-2x.png` ở normal zoom: vệt trái nằm trên ground phía trước chân, staff và tay đổi tư thế thật. PNG cũ giữ trong history.
- Lịch sử final review1: command trên, session `m3d-r3-batch02`, PASS exit0 trong184.36s,2 browser tests (33.2s). Report cũ được giữ nguyên.
- **Final review2 mới nhất:** `pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`, session `m3d-r3-batch02-review2`, **PASS exit0 trong160.72s**: typechecks,18 workflow tests,498 unit/integration tests/43 files, build,15 asset validators và **2 browser tests (34.4s)** cho Ca Diệp đã khóa/Phá Giáp sửa mới. Timings tại `docs/evidence/sessions/m3d-r3-batch02-review2/check-workflow/final-timings.json`. Browser scope chỉ viewer độc lập, chưa live Phaser/multiplayer. VITE_SERVER_URL giữ2887.
- Giới hạn: các phase nâng/đập/hồi vẫn là key-pose, phần xoay đã có body/staff animation thật; chưa director duyệt review2 hoặc bind production. Body/robe/ponytail vẫn đọc được ở44px, không thay bằng quay một ảnh đứng yên.
- Đây là Canvas2D độc lập, logical640×360/display2×. Nền phẳng chỉ là mặt xem alpha, không phải arena art. **Không live Phaser/multiplayer/gameplay PASS**, không director approval tự suy từ tests.
- Không tạo video/GIF/WebM/MP4 hoặc trace playback. Không sửa production loader/registry/renderer/server/protocol và không merge milestone.

## Tái lập

Từ repo root, server review5513 của task phải đang chạy bằng `node assets/m3d-feedback-review-r3/source/tools/serve.mjs`:

```powershell
python -X utf8 assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source/tools/build.py
$env:PLAYWRIGHT_BROWSERS_PATH='D:/Projects/volam-hero-defense/.cache/ms-playwright'
node tools/run-playwright.mjs test --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs
python -X utf8 assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source/tools/finish.py
```

Builder tái dùng retained measurement/r2 raster assembler/contact exporter, không viết extractor mới. Có thể chỉ re-export VFX bằng argument `vfx`; body đã hợp lệ không cần vẽ/xuất lại khi sửa canvas VFX. Chỉ dùng trong batch02, không rebuild Ca Diệp đã khóa.
