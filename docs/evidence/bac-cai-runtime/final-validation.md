# Bắc Cái — kiểm chứng gameplay, 2026-11-02

**PASS trong phạm vi dưới.** Encounter đã tích hợp core → Colyseus → production Phaser, giữ visual v03 đã duyệt. Chưa duyệt gameplay/balance cuối. Không commit/merge; không recording.

| Kiểm tra thực chạy | Kết quả |
|---|---|
| Project + test/tool TypeScript | PASS |
| Workflow regressions |18 PASS |
| Full unit/integration retry |505 PASS /44 files,101.18s |
| Regression sau chỉnh riêng thoại mở vote |22 PASS /2 files,5.73s |
| Production build cuối |PASS,11.20s; chunk-size warning có sẵn |
| Asset validators |16 PASS;514 file approval lock,425 Bắc Cái cũ nguyên bytes |
| Production browser đủ scope |3 PASS,4.6 phút: gallery +2 client cơ chế +6 client combat |
| Browser sau chỉnh riêng thoại vote |1 two-client case PASS,1.4 phút |
| Gallery |408 frame /102 clip, hai render contexts |
| Balance probes |288 scenarios, ba seed,1/2/6 người, bốn phái/hai branch, level1/6/15/30 |

Pipeline `pnpm check:final` đầu dừng ở assertion cũ protocol17 (503/504 qua). Schema hiện là18. Sau sửa assertion và bổ sung regression đánh nhầm giữ hình, full505 test qua. Các stage còn lại hoàn tất riêng theo `docs/DEVELOPMENT_WORKFLOW.md`; không ghi đè failure log thành thành công. Browser đầu dùng Vite dev nên gallery thấy HMR websocket và lần vào phòng sáu người gặp1006. Đã chuyển fixture sang production build và chạy lại đủ ba case: PASS. Validator Bắc Cái được chạy lại với `-X utf8` do cp1252 stdout. Thay đổi cuối chỉ đổi thoại mở vote thành lời nhắc như v03: đã chạy lại22 test, typechecks/build và hai-client browser; giữ kết quả gallery/sáu-client vì artwork/geometry/combat không đổi.

## Lệnh và môi trường

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:/Projects/volam-hero-defense/.cache/ms-playwright'
$env:VOLAM_QA_SESSION='bac-cai-runtime-final'
$env:VOLAM_QA_SERVER_PORT='2797'
$env:VOLAM_QA_CLIENT_PORT='5397'
pnpm check:final --config playwright.bac-cai.config.ts --trace off
# Các stage retry/hoàn tất sau sửa regression:
pnpm exec tsc -b --pretty false
pnpm exec tsc -p tsconfig.tools.json --noEmit --pretty false
pnpm exec vitest run
pnpm exec vitest run tests/bac-cai-runtime.test.ts tests/bac-cai-room.test.ts
$env:VITE_SERVER_URL='http://127.0.0.1:2797'
pnpm --filter @volam/game-client build
pnpm verify:assets
python -X utf8 scripts/verify-bac-cai-preview.py
node tools/run-playwright.mjs test --config playwright.bac-cai.config.ts --trace off
node tools/run-playwright.mjs test --config playwright.bac-cai.config.ts tests/e2e/bac-cai-runtime.spec.ts --grep 'two real' --trace off
pnpm --filter @volam/game-server exec tsx ../../tools/bac-cai-balance.ts
git diff --check
```

## Evidence đã mở

- `field-impact.png`: burst田 alpha0.55 dưới actors, silhouette boss hiện trên impact ở normal gameplay zoom.
- `detached-dragon.png`: rồng đã thả hoạt động cùng beam khác và thoại; beam native scale1×.
- `eight-forms.png`: cùng artwork, không marker chân thân. Browser sample vị trí trên các render frame trong12.2s để xác minh năm lượt crossing chậm, không chỉ seek timeline.
- `vote-open.png`, `vote-sleep.png`: ô chọn và lời nhắc nhớ câu cuối, rồi animation ngủ. Core kiểm10s/heal10% max/clamp/once, tie/zero sai.
- `six-client-natural-combat.png`: sáu session thật, A/QWER/movement, không phải sáu model gallery.

Core/SDK kiểm boss/chó attackable; miễn damage đúng shuffle; AoE thật+giả vẫn nổ theo hai thứ tự; đánh nhầm giữ hình; late snapshot không lộ real identity; zone isolation; dây đứt khi chết/rời zone/disconnect; không damage tượng/item loot; reward/cleanup một lần. Page-error lists trống. Screenshot không thay proof server hoặc proof motion.

## Giới hạn

Ba wave-boss adapter Đông Tà/Tây Độc/Nam Đế chưa có, nên Bắc Cái **chưa tự xuất hiện theo natural campaign**. Ordered gate wave20 đã có; fixture server không đánh dấu giả các defeat. Sáu client được server-only spawn/level30 setup rồi combat thường khoảng48s; không tăng clock hay đổi HP/damage boss. Boss không chết trong pass tự nhiên.288 probe không có kill trong60s và nhiều bot bị hạ; không có human dodge/equipment/respawn, chưa kết luận balance.

Art giữ fallback đã công khai: thrust mới hướng phải, sleep/drink hướng xuống, chó phải/trái mirror. Không re-export/generate asset. JSON snapshot chưa tối ưu bandwidth; không claim FPS/production capacity.

Chi tiết cơ chế/data/lifecycle: `../../BAC_CAI_RUNTIME.md`. Máy: `final-validation.json`, `two-client-verification.json`, `six-client-verification.json`, `gallery-regression/verification.json`, `balance-probes.json`. Logs ban đầu và retry giữ riêng. Bảy report validator lịch sử không liên quan đã trả về đúng HEAD bytes; nguồn/PNG đã duyệt không đổi.
