# Visual depth expansion R4 — wip/m3d/25d

Phạm vi: mở rộng visual R3 sang toàn bộ khu vực đang có. Giữ gameplay/server authority, tọa độ/collision, thời gian animation, HUD và bàn phím. F8 bật/tắt toàn bộ lớp visual mới; `?visualDepth=off` khởi động ở bản cũ. Không thêm ảnh sinh mới hay thay pixel nguồn.

## Các đợt

1. **Nhân vật và bóng:** dùng sprite thật, foot pivot và Y-depth; 14 nhánh, creep invasion, creep phó bản, summon và boss có chung cơ chế bóng nhẹ. Giữ đường riêng Chưởng/chó của R3. Props được đánh dấu riêng để không nhầm VFX thành đạo cụ.
2. **Môi trường:** arena giữ lát nền liền/cỏ/nắng R3. Forest có nắng xuyên tán; desert sáng khô; sea sáng lạnh; Cổ Mộ dùng ánh ngọc; Địa Ngục dùng dung nham và không có nắng; ba sân boss và Lôi Đài có profile riêng. Mask nằm đúng tầng mặt đất; bóng đạo cụ Lôi Đài quy về tâm chân dù sprite gốc dùng origin ở góc.
3. **Kỹ năng:** đăng ký metadata từ raster catalog và whitelist FX native. Hỏa/chưởng giữ R3; khí/gió/sét/độc có ánh màu nhẹ. Body, summon, cảnh báo đòn và mảnh vật lý không tự phát sáng. Pixel sample của từng cel quyết định điểm sáng, tránh đặt lõi vào phần trong suốt của vòng hiệu ứng.
4. **Giới hạn/kiểm chứng:** culling theo camera, tối đa64 bóng chiếu mở rộng,128 texture/24MiB cache; quái ngoài giới hạn vẫn có bóng tiếp xúc. Pool16 cụm ground/halo/core; cache hotspot1024 tọa độ. Tắt F8 phục hồi ellipse cũ. Bóng là xấp xỉ2D từ idle facing, ánh sáng không có ray-traced occlusion hay hình học3D.

## Kiểm chứng tập trung

Theo yêu cầu chỉ chạy test cần thiết: client TypeScript, tools/tests TypeScript, production build tách riêng và browser profile chuyên biệt. Không chạy lại toàn bộ unit/balance/asset suite vì không sửa gameplay hay PNG/JSON gốc.

- `pnpm exec tsc -b apps/game-client` — PASS.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit` — PASS.
- `$env:VITE_SERVER_URL='http://127.0.0.1:2968'; pnpm --filter @volam/game-client build --outDir ../../.cache/depth-expansion-dist` — PASS; cảnh báo bundle lớn hiện hữu. Giữ nguyên dist R3 đang được người dùng chơi.
- Browser: `node tools/run-playwright.mjs test --config playwright.world-depth-expansion.config.ts`, ports2968/5568, session riêng. Hai client dùng lúc sửa từng đợt; sáu client dùng khi chốt. Video/trace tắt.
- Metadata source SHA256 được đối chiếu với file thật trong `assets/source/world-depth-v1/manifest.json`: PASS; không sửa artwork gốc.

Các lần lỗi được giữ nguyên: fixture đầu dùng creep catalog sa mạc cũ; retry riêng môi trường cần level30 cho PvP; fixture tổng hợp giữ reference hero cũ sau khi PvP phục hồi hero. Chỉ sửa fixture, không đổi quy tắc game để test qua. Kết quả cuối và PNG nằm dưới đây.

## PNG và báo cáo

Các cặp ảnh tạm dừng đúng frame render/tick chỉ lúc chụp để so sánh công bằng; quan sát nhiều frame, cast thật, đồng bộ và di chuyển thực hiện khi game chạy. Ảnh là screenshot từ Phaser thật trong match, không phải mockup.

Bằng chứng từng đợt:

- [Đợt1 — 14 nhánh và20 creep](evidence/sessions/depth-batch1-retry/depth-expansion/verification.json).
- [Đợt2 — tám phó bản và PvP](evidence/sessions/depth-batch2-final/depth-expansion/verification.json).
- [Đợt3 — cast thật của14 nhánh](evidence/sessions/depth-batch3/depth-expansion/verification.json). Đòn thuần vật lý có thể không phát sáng; điều này là chủ đích.

Trạng thái artwork: prototype mở rộng, chờ director xem PNG ở zoom chơi thật; việc test qua không tự chuyển sang approved. Reference đã xem: arena/hub/battle, forest/desert/sea/hell, chuẩn Võ Đang và placeholder anti-reference; dùng lại reference không thay đổi trong cùng task. Không ghi video, không mở rộng HUD, không đổi gameplay.

## Phạm vi lượt chốt sáu client

Kiểm chứng được chia đợt để retry đúng stage, không lặp các bước đã qua:

- Session `depth-expansion-final-retry`: đủ14 nhánh,20 creep và9 khu vực. Pipeline dừng ở fixture cast sau PvP; các ảnh/quan sát trước điểm đó được giữ, không đổi nhãn cả run thành PASS.
- Session `depth-final-casts`:14 cast đại diện có event server xác nhận và frame VFX. Sau đó fixture boss bắt đầu khi đã có auto-cast, nên sửa reset và chạy lại riêng boss.
- Session `depth-final-boss-budget-retry`: đợi đầy đủ boss art pack ở6 client, kiểm tra7 dạng (Đông Tà, Tây Độc2 dạng, Nam Đế, Bắc Cái, Vương2 giai đoạn). Đã quan sát body/đòn thật; mỗi case lấy mẫu2.2s, không phải toàn bộ mọi chiêu của mỗi boss. Stage tải sau đó phát hiện5 mép texture bóng bị cắt.
- Sửa runtime cuối: bán kính blur của projection nhân theo tỷ lệ thu nhỏ cache. Điều này giữ độ mềm ở world space và không làm tràn padding của đạo cụ lớn. Chạy lại riêng PvP và96 quái/6 người trên build sau sửa.

Chọn stage bằng `VOLAM_DEPTH_STAGE=1|2|3|4|budget`; `VOLAM_DEPTH_BATCH` tương ứng dùng để dừng sau đợt. Profile mặc định stage3; stage1/2 dùng khi kiểm tra riêng nhân vật hoặc bản đồ. `VOLAM_DEPTH_PLAYERS=6` cho lượt chốt. Các lần sửa fixture, độ trễ lazy-load và lỗi mép bóng được giữ trong evidence gốc.

Ảnh nguồn của các khu vực giữ nguyên tỷ lệ/zoom của game. Các vùng HUD opaque (khung nhân vật và hotbar) đã được so pixel ở11 cặp arena/map: trùng khớp. Report pixel: `evidence/sessions/depth-expansion-final-retry/depth-expansion/pixel-comparison.json`.

## Kết quả cuối

[Summary các stage đã kiểm chứng](evidence/sessions/depth-expansion-delivery/summary.json). Giữ report thất bại gốc; đây là tổng hợp phạm vi đã qua ở từng stage.

- Lượt cuối `depth-budget-final`: **PASS**, browser test2.9 phút, tổng runner3.0 phút;6 client/96 creep, đúng64 bóng chiếu mở rộng, không cắt mép;29,260 byte cho một silhouette dùng chung trong cảnh này; peak6 cụm sáng trong giới hạn16.
-90 mẫu mỗi trạng thái: median OFF/ON đều16.7ms; p95 OFF33.3ms, ON16.8ms. Đây là browser frame spacing trên máy QA với6 client, không phải cam kết FPS hay kết luận visual mới làm game nhanh hơn.
- Client/tools TypeScript, build riêng và hash provenance: PASS. Không chạy lại full gameplay/balance suite.
- HUD opaque trùng pixel ở11 cặp arena/map trước đó và4/5 cặp cast/PvP cuối. Cặp stress có khác nội dung HUD động; không coi cặp đó là bằng chứng HUD trùng pixel. Không sửa mã/layout HUD. [Chi tiết pixel](evidence/sessions/depth-expansion-delivery/pixel-comparison.json).

### PNG trước/sau — F8 OFF / ON

| Cảnh | Trước | Sau |
| --- | --- | --- |
| Arena + party/creep | [PNG](evidence/sessions/depth-expansion-final-retry/depth-expansion/batch1-creeps-before.png) | [PNG](evidence/sessions/depth-expansion-final-retry/depth-expansion/batch1-creeps-after.png) |
| Rừng | [PNG](evidence/sessions/depth-expansion-final-retry/depth-expansion/batch2-forest-before.png) | [PNG](evidence/sessions/depth-expansion-final-retry/depth-expansion/batch2-forest-after.png) |
| Côn Luân, cast thật | [PNG](evidence/sessions/depth-final-casts/depth-expansion/batch3-con_luan_thien_su-before.png) | [PNG](evidence/sessions/depth-final-casts/depth-expansion/batch3-con_luan_thien_su-after.png) |
| Ngũ Độc, cast thật | [PNG](evidence/sessions/depth-final-casts/depth-expansion/batch3-ngu_doc_ta_hiep-before.png) | [PNG](evidence/sessions/depth-final-casts/depth-expansion/batch3-ngu_doc_ta_hiep-after.png) |
| Nam Đế | [PNG](evidence/sessions/depth-final-boss-budget-retry/depth-expansion/batch3-nam-de-before.png) | [PNG](evidence/sessions/depth-final-boss-budget-retry/depth-expansion/batch3-nam-de-after.png) |
| Lôi Đài, build cuối | [PNG](evidence/sessions/depth-budget-final/depth-expansion/batch2-loi-dai-before.png) | [PNG](evidence/sessions/depth-budget-final/depth-expansion/batch2-loi-dai-after.png) |
| 96 quái /6 client | [PNG](evidence/sessions/depth-budget-final/depth-expansion/batch4-party-stress-before.png) | [PNG](evidence/sessions/depth-budget-final/depth-expansion/batch4-party-stress-after.png) |

Các cặp sa mạc/biển/Địa Ngục/Cổ Mộ/Chu Bá Thông/Hồng Liệt/Kim Luân nằm cùng thư mục `depth-expansion-final-retry/depth-expansion`, tên `batch2-<zone>-before/after.png`.

Build mới: `.cache/depth-expansion-dist`. Không ghi đè dist đang phục vụ phiên chơi R3 của người dùng trên2967/5567. Port QA2968/5568 được helper dọn sau test. Mã worktree dùng visual mới mặc định khi dev/build tiếp theo.
