# M3D r3 — batch 01: Ca Diệp Thoái, duyệt key-pose

**Lượt duyệt mới nhất: [batch03 review6 —22 mục, Phất Trần giữ nguyên](http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/?review=6).** Phá Giáp review3 đã duyệt và khóa34 file; Ca Diệp batch01 đã duyệt và khóa55 file. Các mục batch03 là candidate, chưa production Phaser. Phần dưới là lịch sử batch01.


**Director đã duyệt animation Ca Diệp batch01 được trình. Chưa tích hợp/duyệt runtime Phaser; các mục r3 khác vẫn pending.** Căn cứ hiện hành: `director_approval_ca_diep_batch01.json` và `approved_ca_diep_batch01.lock.json`. Các cờ pending trong manifest/export/viewer cũ là snapshot lúc xuất, được approval register này supersede đúng phạm vi batch01; không sửa lịch sử để suy thành approval toàn r3.

Viewer đang chạy: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/>.

Batch02 Phá Giáp Bổng mới, đang chờ duyệt pose/VFX: <http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/>; [bàn giao riêng](batch02-pha-giap-bong/README.md). Batch02 không thay thế hoặc sửa source/export Ca Diệp đã duyệt.

Batch02 hiện hành là **review3: bỏ xoay, chỉ nâng rồi đập, vệt ground dài hơn khoảng50% trong preview**. Static validator PASS24 frame references/20 tag. `check:final` qua21 prerequisite stages; browser đầu quét nhầm spec lịch sử, đã exclude history và rerun **2 browser tests PASS (26.7s), exit0**. Xem `docs/evidence/sessions/m3d-r3-batch02-review3/verification-summary.json`. Report review1/review2 và runner batch01 bên dưới là lịch sử, không phải trạng thái hoặc scope art mới nhất. Phá Giáp review3 vẫn chờ director duyệt.

Scope/decision mới nhất: [feedback tập trung](../../docs/M3D_PLAYTEST_FEEDBACK_2026-11-02.md).

## Đã làm

- Ba PNG raster nguồn gốc mới bằng built-in imagegen: 16 body key-poses, 20 ground cels, 4 status cels. Không dùng art/code/âm thanh DOTA. Earth Spike chỉ là ý tưởng director mô tả.
- Body bốn facing: anticipation → raise → foot contact → recovery. Một key-pose cho mỗi phase; **chưa thêm in-between** trước khi director chốt pose.
- VFX bốn facing: birth → travel (hai cel) → impact → outro. Một ụ đất tiến trên đường thẳng; caster đứng tại điểm thi triển. Stun là layer billboard độc lập trên đầu mục tiêu.
- Ba source Aseprite chỉnh sửa được, PNG atlas + JSON hash, PNG từng cel và metadata. Đây là **draft exports** phục vụ kiểm tra native scale và key-pose, không phải khẳng định sheet concept là animation production.
- Viewer Canvas2D độc lập, A một cast/bỏ key repeat, arrows chọn facing, Space pause, timeline scrub, tốc chậm, loop chỉ khi bật thủ công, cancel/chết/đổi vùng mô phỏng, R2 baseline toggle và source inspector.
- [handoff.json](handoff.json) và [frame_inventory.csv](frame_inventory.csv) ghi selected tags, facing axes, feet pivot/effect anchor, placement và phase order. Native storyboard PNG được nhóm lại từ đúng draft exports, không tạo thêm artwork.
- Inventory toàn scope r3 ở [review-inventory.json](review-inventory.json). Ngoài Ca Diệp và draft Phá Giáp batch02, các school/boss/background khác **chưa sản xuất**, không được ghi PASS từ batch này.

## Footprint và playback contract

| Component | Canvas | Pivot / anchor | Selected tags |
| --- | --- | --- | --- |
| r3_ca_diep_body_keyposes | 160×120 | feet (80,96) | anticipation/raise/contact/recovery × right/down/left/up |
| r3_ca_diep_ground_keyposes | 128×96 | effect (64,72) | birth/travel/impact/outro × right/down/left/up |
| r3_ca_diep_stun_keyposes | 64×48 | center (32,24), billboard | stun_loop |

Body dùng một scale cố định theo neutral pose khoảng44px, không fit riêng từng cel. Chiều cao giảm ở contact là tư thế cúi/dậm. Ground dùng một source scale cố định để footprint travel ngang khoảng48px, không xoay toàn ụ đất theo hướng hoặc làm đá nằm ngang. World travel thuộc viewer, không bake đường đi trong frame.

Các duration trong atlas (body180ms, ground110ms, stun140ms) chỉ để xem key-pose. Demo cast1900ms, travel800ms, quãng minh họa ngang260/dọc155px và status cửa sổ minh họa đều **không phải giá trị gameplay**. Đã chốt: **ụ đất xuyên mọi mục tiêu trên đường, tất cả nhận damage và stun; không dừng ở mục tiêu đầu**. Damage value, stun duration, range, width, speed, cooldown và số lần trúng lại cùng mục tiêu vẫn pending. Không dùng thời điểm impact trong viewer làm damage clock. Không có hất tung. Viewer hiện một mục tiêu chỉ minh họa art, không chứng minh cơ chế all-target đã được implement.

Tái dùng đúng idle_* từ support Thiếu Lâm r2 để đối chiếu và làm mục tiêu. Không ghi đè source/export/lock đã duyệt. Không tích hợp loader/registry/renderer, Phaser, game-core/server/protocol hoặc UI production.

## Quan sát và giới hạn

- Đã mở và xem PNG nguồn, contact native, PNG viewer display2× và native1×. Bald head, áo vàng/nâu, beads và wraps nhận diện được ở cỡ game; hướng up thể hiện lưng, left/right giữ chân hướng tương ứng. Viền alpha bán trong suốt từ nguồn được xử lý bằng workflow alpha>=220 và palette Thiếu Lâm trong draft export; giữ nguyên raster nguồn.
- Qua playback rAF và browser assertions, toàn bộ33 tag/40 cel đã được vẽ; bốn cast đầy đủ có birth/travel/impact/outro, ụ đất tiến đơn điệu đúng một trục, caster feet không thay đổi. Cancel/chết/đổi vùng/đổi facing xóa effect của fixture. Đây là quan sát từ viewer, **không phải live Phaser/multiplayer**.
- Động tác hiện chỉ bốn key-pose/hướng nên chuyển tiếp vẫn có giới hạn của draft. Director đã duyệt animation body/ụ đất/stun được trình; không tự suy approval cho frame hoặc choreography mới chưa được xem.
- PNG vẫn không tự chứng minh motion; dùng kèm `previews/browser-validation.json`, `static-validation.json` và viewer đang chạy.
- Nền phẳng là mặt xem alpha trung tính của viewer, không phải arena art mới. Ba nền arena vẫn ở backlog concept.

## Chạy lại

Từ repo root, dùng PowerShell:

```powershell
python -X utf8 assets/m3d-feedback-review-r3/source/tools/build-draft.py
node assets/m3d-feedback-review-r3/source/tools/serve.mjs
```

Ở terminal thứ hai:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:/Projects/volam-hero-defense/.cache/ms-playwright'
node assets/m3d-feedback-review-r3/source/tools/review-draft.mjs
python -X utf8 assets/m3d-feedback-review-r3/source/tools/finish-draft.py
```

Build adapter tái dùng `measure_characters.py`, `measure_effects.py`, r2 Aseprite assembler/contact exporter; chỉ đổi output sang package r3. Có bản provenance/source prompts và file inventory/hashes. Không tạo video/GIF/WebM/MP4 hoặc trace playback.

Đã chạy `pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`:21 stage trước browser PASS, gồm typecheck,18 workflow tests,498 unit/integration tests/43 files, build và15 asset validators. Browser đã ghi assertion PASS nhưng runner treo khi teardown server phụ trên Windows; đã chủ động dừng, giữ report snapshot của lượt đó, không tuyên bố command ban đầu exit0.

Đã sửa harness dùng Playwright page fixture và viewer5513 do chính task này sở hữu; chạy lại riêng bước browser bằng `node tools/run-playwright.mjs test --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **1 passed (18.2s), exit0**,33 tag/40 cel. Không lặp các prerequisite stage đã PASS. Snapshot và kết quả phục hồi nằm tại `docs/evidence/sessions/m3d-r3-concept-review/verification-summary.json`.

Build kiểm tra dùng endpoint mặc định; đã build lại client với `VITE_SERVER_URL=http://127.0.0.1:2887` để khôi phục link game production preview cũ. Không đổi source production. Các report validator khác chỉ đổi CRLF/LF được so sánh với HEAD rồi trả lại đúng byte ban đầu. Live Phaser/gameplay/multiplayer gate cho art r3 vẫn để lượt tích hợp sau; browser PASS này chỉ áp dụng viewer độc lập.

## Bước duyệt hiện tại

Director xác nhận: “Animation ok, nhưng nên nhớ, tất cả target trên đường ụ đất di chuyển đều nhận dmg và bị stun”. Ghi approval cho đúng batch01 đã trình; bảo toàn asset đã khóa. Phần scope r3 khác vẫn giữ trong inventory. Khi tích hợp, cần kiểm chứng nhiều mục tiêu dọc đường đều nhận damage + stun và ụ đất không dừng ở mục tiêu đầu; chưa sửa gameplay ở lượt approval này.
