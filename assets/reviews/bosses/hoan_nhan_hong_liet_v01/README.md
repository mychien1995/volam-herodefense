# Hoàn Nhan Hồng Liệt — bản thử mỹ thuật v01

Ngày: 2026-11-01. Branch: `wip/m3d/hoan-nhan-hong-liet`.
Trạng thái: **PROTOTYPE — CHỜ DIRECTOR REVIEW**. Chưa sửa hoặc tích hợp code Phaser, game-core, server, protocol, dữ liệu combat hay package/build configuration.

## Hiện tại: v03 — thêm pháo, boss lao theo nham thạch

Hỏa Pháo Thiên La thử 16 khẩu (bốn mỗi rìa), hai trục vẫn bắn đồng thời. Liệt Diễm: boss lao dọc làn, nham thạch để lại phía sau, viền đá và độ dày hiệu ứng đã giảm. [Preview, PNG, nguồn và kiểm tra v03](REVISION_V03.md). A1/A2 v02 giữ nguyên; các phần đang sửa vẫn chờ review. Chưa tích hợp Phaser.

## Lịch sử: v02 — A1/A2/pháo

Director yêu cầu sửa sau approval v01: A1 ba đường đao phía trước; A2 tăng tầm; pháo ở rìa bắn ngang/dọc đồng thời xuyên toàn sân. Preview v02 dùng góc ±18° và A2 tăng 50% để xem thử. [Xem thay đổi, PNG và kiểm tra v02](REVISION_V02.md). Ba phần này đang chờ duyệt lại; bản ghi duyệt v01 được giữ trong history. Chưa tích hợp Phaser. Nội dung và số đo v01 bên dưới là lịch sử nơi chưa được ghi đè bởi v02.

## Director approval v01 — lịch sử 2026-11-01

Anh đã xác nhận “approve” cho bản preview hiện tại và yêu cầu prompt tích hợp trên cùng worktree. Trạng thái hiện tại: **APPROVED VISUAL PREVIEW FOR PHASER INTEGRATION**. [Approval record](director_approval.json) ghim SHA-256 các input; không sửa pixel/atlas, không tự duyệt cels lỗi đã loại. Phaser/combat/multiplayer chưa được tích hợp hoặc xác minh. Các mục “chờ review” bên dưới là trạng thái lịch sử tại lần giao prototype.

## Mở bản xem

[Preview động](http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/).
Nếu server đã tắt, từ worktree chạy:

```powershell
python assets/reviews/bosses/hoan_nhan_hong_liet_v01/serve_review.py
```

Chọn animation ở góc dưới trái; bốn nút hướng ở góc trên phải; tốc độ 0,25×/0,5×/1×; kéo thanh thời gian để xem từng pha; chọn zoom 1×, 2× hoặc toàn arena. Nút Sheet PNG mở bộ atlas thực tế. Ghi chú bật/tắt trong viewport. Sáu hero Võ Đang chỉ là mốc tỷ lệ, không phải sáu client multiplayer.

## Đã dựng để review

| Nội dung | Bộ thử |
| --- | --- |
| Sprite boss | 4 hướng idle/walk; đại đao phải, giáp đen–đồng, cổ lông sáng, plume/áo choàng đỏ |
| Arena | Tái sử dụng concept đại bản doanh đã có; bố trí boss, cửa quân, điểm phun/rơi và trận pháo riêng trong `arena_layout_v01.json` |
| A1 v02 | Lấy đà → ba đường đao hình quạt đồng thời về trước → hồi; khóa hướng |
| A2 v02 | Chém 180° phía trước, tăng tầm 50% trong bản thử; không vòng 360° |
| Dung Nham Liệt Địa | Nhấc chân → dẫm → chấn động rộng → nguội; chữ choáng chỉ minh họa |
| Hỏa Sơn Bạo Phát | 5 điểm báo trước bằng dấu X → núi dung nham trồi lên → phun → nguội |
| Liệt Diễm Phong Tỏa | Cảnh báo làn → vẩy nham thạch → đường dài/rộng tồn tại khoảng 10 giây → sẹo đá nguội |
| Hỏa Tiễn Tề Phát | Hiệu lệnh → cung thủ đi vào từ hai cánh → kéo cung/bắn loạt; tên bay thẳng |
| Thiết Kỵ Triệu Binh | Hiệu lệnh → thiết binh đi bộ từ hai cánh → áp sát/đánh đao |
| Vạn Lý Nham Hỏa | 12 điểm, 3 đợt rơi so le; từng điểm cảnh báo → thiên thạch từ trời → nổ AOE rộng hơn Hỏa Sơn → nguội |
| **Hỏa Pháo Thiên La** (tên đề xuất) | 8 pháo ở bốn rìa, 2 ngang + 2 dọc thành ô cửa sổ; warning và khai hỏa đồng thời, viên bay xuyên toàn sân |
| Minion | Cung thủ và thiết binh: 4 hướng idle/walk, tư thế đánh; sprite pháo riêng |

Mọi số lượng, kích thước và thời gian là **choreography đề xuất cho review**, không phải tuning đã duyệt hay luật combat. Pattern cố định giúp so sánh ảnh; chưa có RNG/server simulation, sát thương, stun thật, pathfinding hoặc loot.

## Feedback trước khi đưa vào game

1. **Nên giữ** silhouette boss và doanh trại: áo choàng đỏ/cổ lông sáng phân biệt boss với quân; sân giữa trống cho né AOE, dung nham thường trực ở ngoài hàng rào. Boss dùng mục tiêu cao khoảng 64px, hero giữ sprite đã có khoảng 44px; canvas lớn hơn chỉ để chứa vũ khí.
2. **Cần giảm chồng hiệu ứng cam**: nên tách nhịp Hỏa Sơn, Vạn Lý và làn nham thạch, giữ viền đá/ash sáng. Cảnh báo hiện còn khá giống màu sát thương; trước production nên làm warning mảnh và khác độ sáng/pattern hơn, giữ lối thoát.
3. **Hỏa Pháo Thiên La hợp arena**: ô cửa sổ dễ đọc. Yêu cầu v02 đã thay bắn so le bằng khai hỏa hai trục đồng thời từ rìa arena. Chưa đo tốc độ chạy/khả năng né bằng server nên chưa thể kết luận pattern công bằng.
4. **Thiết Kỵ đang dùng bộ binh** theo concept quân Mông Cổ đã có và mô tả “gọi quân lính”. Nếu cần đúng kỵ binh, phải bổ sung ngựa và animation cưỡi/phi/đánh; bản này không giả nhận có ngựa.
5. **Cleanup còn cần**: hướng đánh dọc của cung thủ/thiết binh còn xoay ngang ở một số cels; thân pháo ngang giữ cel đúng hướng khi phát VFX vì rest/recoil của nguồn không nhất quán. Đây là các candidate chưa đạt chuẩn production, không được coi bốn hướng attack đã duyệt.
6. **Arena hiện là ảnh concept**, không phải môi trường đã tách lớp hoặc tilemap/collision. Chưa kiểm tra Y-sort/occlusion, camera follow, sáu người đánh thật hoặc performance trong Phaser. Hurt/death và audio chưa thuộc bộ thử được yêu cầu.

## Chọn nguồn và sửa lỗi

- Boss locomotion gốc và bản yêu cầu alpha được giữ cả hai. Nền nâu trong RGB ẩn không phải nền đục; compositing lên nền tương phản xác nhận alpha sạch. Không chroma-key hoặc vẽ thay sprite bằng code.
- Tách frame dùng `cuts()` và, với nhóm đánh thường và chọc đao dọc, `components()` có sẵn trong repository. Scale chung cho cả source group, nearest-neighbor; ghi source rectangles, anchor và SHA-256. Không resize riêng từng cel để giả đồng nhất.
- Nguồn thiên thạch ban đầu bị cắt đuôi ở hai cels rơi; preview dùng `vfx_meteor_safe` thay hai cels đó. Giữ nguồn cũ để đối chiếu.
- Nguồn pháo đầu bị chồng flash qua hàng kế bên; preview dùng `cannon_clean` + VFX riêng. Hướng được chọn theo nội dung thực của cel, không tin mù thứ tự prompt.
- Chọc đao dọc dùng contact/lunge đã sửa; anticipation/recovery dùng nhóm gốc vì windup giơ đao mới chạm mép nguồn. Không dùng cel lỗi đó trong choreography.
- 226 frame rectangles trong 15 atlas là **inventory candidate**, bao gồm cả cels bị thay/không được chọn. Không có nghĩa 226 frame đều đã đạt mỹ thuật production.

## Nguồn và quyền sử dụng

Nguồn mới: OpenAI built-in `image_gen`; PNG gốc giữ trong `assets/source/bosses/hoan_nhan_hong_liet_v01/generated/`. Prompt đầy đủ và các lần sửa nằm trong [generation.json](../../../source/bosses/hoan_nhan_hong_liet_v01/generation.json). Không dùng API/CLI fallback, không lấy sprite từ game bên ngoài, không khẳng định tác giả pixel thủ công hoặc quyền độc quyền.

Concept boss/quân/arena là tài liệu local đã có do dự án cung cấp; quyền bên thứ ba chưa được xác minh riêng. Chúng chỉ phục vụ thiết kế/preview; chưa được đưa vào runtime bundle. Hero Võ Đang tái sử dụng export đã có, không thay đổi pixel. [Manifest](../../../exports/bosses/hoan_nhan_hong_liet_v01/manifest.json) ghi PNG/JSON, kích thước thực, pivot, directions, frame timing đề xuất, scale, hash và trạng thái. [Provenance](asset_manifest.json) ghi hash tham chiếu và phạm vi.

## Kiểm tra thực tế

- `python -X utf8 assets/source/bosses/hoan_nhan_hong_liet_v01/package_assets.py`: xuất 15 atlas; một lần đầu chặn clipping của thiên thạch sửa, đã chỉnh scale/anchor và xuất lại thành công.
- `python -X utf8 assets/source/bosses/hoan_nhan_hong_liet_v01/validate_assets.py`: **PASS_STATIC_ONLY**, 15 PNG/JSON, 226 cels: hash nguồn/export, atlas bounds, alpha/padding, không clip pixel đục ở mép export; 5 nhóm nguồn/candidate có vấn đề được công khai.
- `node --check assets/reviews/bosses/hoan_nhan_hong_liet_v01/review.js`: PASS.
- `node assets/reviews/bosses/hoan_nhan_hong_liet_v01/check_review.cjs`: **PASS_STANDALONE_ONLY**, Microsoft Edge, 244 mẫu pha/hướng, 4 chu kỳ walk live đủ a/b/c/d, điều khiển scrub/tốc độ/sheet, viewport 1280×800 và 1920×1080; console/page errors rỗng. Thời gian đo 14,013 giây trong lần ghi báo cáo.
- Nếu thiếu module trong worktree, chỉ để kiểm tra standalone có thể trỏ `VOLAM_REVIEW_PLAYWRIGHT` tới thư mục `@playwright/test` đã cài. Dùng Edge cài sẵn vì headless shell bundled chưa có; không cài browser hay dependency mới.
- PNG cuối: [dẫm đất](review_stomp_1x.png), [pháo ngang](review_cannon_1x.png). [Sprite board](sprite_review_board.png) từ export thật; [so sánh tham chiếu](REFERENCE_COMPARISON.md). PNG đầu `preview_stomp_initial.png` lưu chẩn đoán tỷ lệ trước khi mở rộng chấn động.
- Không chạy `pnpm check:final`, unit/network/full-game suite hoặc Phaser playtest vì task này chỉ sản xuất asset và playback tách biệt, theo yêu cầu chưa sửa Phaser. Các kiểm tra trên **không thay thế** gate Phaser/multiplayer/normal-zoom/director approval khi tích hợp sau này.
- Không tạo video, GIF, animated-image, trace hoặc recording.

Đang chờ review mỹ thuật của anh. Chưa merge về `milestone/m3d`.
