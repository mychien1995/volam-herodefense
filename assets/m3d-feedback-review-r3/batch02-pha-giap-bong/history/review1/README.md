# R3 batch02 — Phá Giáp Bổng: pose và VFX rework

**Chờ director duyệt pose/VFX; chưa phải animation production hoàn chỉnh.**

Viewer: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/>.

Scope: `pha_giap_bong`, Cái Bang Bổng. Bản mới **xoay → giơ gậy → hóa dài → bổ một đường xuống đất → hồi thế**. Đây là batch nhỏ theo [prompt director](../../../docs/M3D_PLAYTEST_FEEDBACK_2026-11-02.md), cần chốt pose mới trước khi mở rộng in-between. Ca Diệp đã duyệt giữ nguyên55 file source/export trong lock riêng; các mục r3 khác không được suy là đã duyệt.

## Sản phẩm hiện có

- 20 body key-poses và20 VFX cels, đủ right/down/left/up; hai source Aseprite, PNG atlas/JSON hash, PNG riêng từng cel, metadata, contact sheet native và viewer độc lập.
- Body có năm phase/hướng `spin`, `raise`, `elongate`, `strike`, `recovery`; một key-pose/phase. VFX có `spin` hai cel, `charge`, `impact`, `outro` một cel/phase/hướng. Tổng36 tag/40 cel. Không gọi đây là full in-between animation.
- Xoay dùng vệt vòng mở, không dome che nhân vật; ánh tụ đặt tại đầu gậy; impact là một vệt đập đất phía trước. Không chọn lại `foot_explosion` r2 cho rework này, không biến vệt đập thành projectile tự bay hoặc DoT.
- A một cast, giữ phím không tự phát lại; arrows chọn facing, Space pause, scrub, tốc chậm, loop chỉ khi bật, cancel/chết/đổi vùng fixture, R2 baseline và xem raster nguồn.
- Source v01 có strike_up sai hướng, giữ nguyên làm lịch sử; v02 đã sửa đúng lưng/đánh lên và là source body được chọn. Nguồn VFX là raster gốc mới; không dùng procedural Graphics làm art.

## Placement và phase contract

| Component | Canvas | Pivot/anchor | Placement |
| --- | --- | --- | --- |
| b2_pha_giap_body |256×192|(128,148) feet|caster feet, cố định; body target44px ở spin pose, các pose giơ gậy cao hơn vì weapon |
| b2_pha_giap_vfx |384×384|(192,192)|spin tại torso, charge tại đầu gậy, impact/outro tại ground origin của caster |

Offset cụ thể từng clip trong `*.animations.json`; frame order chỉ dùng named `frames[]`, không đoán từ grid. `source/foot-anchor-corrections.json` ghi các điểm giày sửa thủ công: detector cũ bắt nhầm đầu gậy dài là chân ở ba strike poses. Source scale cố định0.285714 cho body, không resize riêng từng frame. VFX spin/charge/impact có scale theo nhóm phase, giữ cố định giữa các hướng/cel trong nhóm; không ép mọi effect bằng cùng footprint.

Một lần thi triển trong viewer minh họa1400ms, năm phase lần lượt300/300/300/220/280ms. Đây chỉ là fixture. Damage/range/cooldown/hitbox/giảm giáp phải bind tech/server ở lượt tích hợp sau. Canvas không phải vùng trúng đòn. Không tạo damage từ frame contact, kéo dài loop hoặc số lần vẽ.

## Kiểm chứng thực tế

- Static source/export validator PASS:40 PNG cel không rỗng, alpha binary, không clipping, atlas pixels đúng PNG riêng,36 tag và frame order đầy đủ. VFX canvas đã được nới384×384 sau khi validator bắt đường impact_right bị cắt ở canvas256×192; không cắt ngắn artwork để né lỗi.
- Focused browser command: `node tools/run-playwright.mjs test --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs --grep 'Phá Giáp Bổng'`: **1 passed (14.5s)**. Vẽ toàn bộ cel/tag qua rAF; bốn cast quan sát đủ spin/raise/elongate/strike/recovery; feet/world ground origin cố định; key repeat không replay; cancel/chết/đổi vùng/đổi facing dọn effect; pause/scrub và inspector hoạt động; không page error.
- Final command: `pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`, session `m3d-r3-batch02`, **PASS exit0 trong184.36s**: typechecks, workflow/unit/integration tests, build,15 asset validators và **2 browser tests (33.2s)** cho cả Ca Diệp đã khóa và Phá Giáp mới. Timings tại `docs/evidence/sessions/m3d-r3-batch02/check-workflow/final-timings.json`. Browser scope là viewer độc lập, không được gọi là live Phaser/multiplayer verification. VITE_SERVER_URL giữ2887 để game preview cũ tiếp tục kết nối đúng.
- Đã mở và xem source, contact native, `previews/elongate-display-2x.png`, `strike-display-2x.png`; body/robe/ponytail đọc được ở44px, hướng up cho thấy lưng, staff/charge tip và đường ground impact không bị crop. Giới hạn: mới là key-pose; vệt xoay có chuyển cel nhưng body chưa đủ in-between cho vòng quay mượt.
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
