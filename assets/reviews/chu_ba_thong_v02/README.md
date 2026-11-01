# Chu Bá Thông — art review v02 · feedback 01

**Prototype, chờ director duyệt.** Branch `wip/m3d/chu-ba-thong`. Đây là bản xem art/choreography Canvas độc lập; không sửa Phaser, server, game-core, protocol, đăng ký dungeon hay asset runtime.

Mở khi server review đang chạy: <http://127.0.0.1:5397/assets/reviews/chu_ba_thong_v02/index.html>.

Nếu cần bật lại, chạy từ root worktree:

```powershell
python -m http.server 5397 --bind 127.0.0.1
```

Sau đó mở đường dẫn trên trong trình duyệt. Arrow keys di chuyển nhân vật; Space dừng/chạy; H ẩn HUD; timeline cho phép xem từng thời điểm. Chọn đội 1–6 người. Trong pha phản chấn, A thử một đòn hình ảnh. Chọn **Cả đội vào trận** để quan sát đồng đội tiến vào giải trận. Nút **Sprite** mở contact sheet, nút **4 hướng** xem boss và tiểu đồng ở các hướng.


## Feedback 01 đang áp dụng

1. **Âm Dương Nghịch Chuyển:** cả 15 vòng nhỏ, 4 tâm sóng lớn và tâm trận lớn liên tục đổi vị trí theo đường cong mượt. Xung đi theo tâm đang chuyển động, không nhảy ngắt giữa hai vị trí.
2. **Túy Tiên Bộ:** vận tốc trục từ330/205 lên560/350px/s (~1.7×; độ lớn660px/s giữa các lần bật nảy), vẫn duy trì24 giây. Thêm vòng xoáy quanh boss, bán kính minh họa112px, scale art suy từ cùng bán kính; bóng lưu dùng đúng đường đi mới.
3. **Tiểu đồng:** đúng1 tiểu đồng cho mỗi người trong đội, kiểm tra đủ1–6. Carry-walk → giao rượu → idle, đường vào riêng và Y-sort theo chân với boss/player.
4. **Quyền trái/phải:** phong quyền nối dài tới340px trước mặt, nhân vật chứng kiến đứng cách280px để review tầm xa. Vẫn có tư thế quyền trái/phải gốc; không tạo lại body sprite.
5. **Quạt phong kình:** phủ sát chân boss bằng vùng bán kính112px, nối với vùng rộng phía trước bán kính170px/tâm cách80px. Đứng dưới chân vẫn hiển thị “Trong phong kình”.
6. **Song Thủ Hỗ Bác:** scale1.5 →1.2, nhỏ hơn20% chiều rộng/cao; giữ thời gian ép và chốt vị trí để thấy rõ thay đổi kích thước.

Thông số chỉnh tập trung tại `tuning.js`. Đây là phạm vi **choreography/footprint minh họa trong preview**; không có damage thật, không chốt cân bằng server. Không sửa Phaser hay PNG/atlas/source đã có. `feedback_01/verification.json` ghi28 nhóm kiểm tra browser, PNG mới nằm cùng thư mục, giữ nguyên bằng chứng bản đầu ở thư mục gốc. Browser coverage bao gồm di chuyển liên tục của mọi tâm vòng, tốc độ con quay, đội1–6 và giao rượu, phong quyền tầm xa, di chuyển player đúng xuống chân boss và tỉ lệ bàn tay80%.

## Nội dung review

| Nội dung | Art / choreography |
| --- | --- |
| Sprite boss | Giữ bộ Chu Bá Thông v01: 4 hướng idle/walk/cast/uống rượu. Bổ sung 16 frame tấn công/spin. |
| Arena | `arena_assembly.png`: lắp từ tileset, nền âm dương và prop raster Toàn Chân Trúc Lâm giữ lại. Chưa phải tilemap/collision runtime. |
| Đánh thường 1 | Quạt tay trước mặt, phong kình và hồi thế. |
| Đánh thường 2 | Quyền trái/phải luân phiên, tư thế tay/thân khác nhau. |
| Đánh thường 3 | Chưởng lấy vị trí tại thời điểm bắn, bay thẳng. Player có thể di chuyển để né. |
| Song Thủ Hỗ Bác | 8 frame bàn tay lớn âm/dương, đi từ bốn rìa viewport ép vào vị trí đã chốt. |
| Thái Cực Âm Dương Trận | Trận dưới chân player; player được đi trong phạm vi trận. Đủ toàn bộ đội vào mới phá; hết 30 giây tự giải. Solo đủ điều kiện một người. |
| Túy Tiên Bộ | 4 pose spin thật, bóng lưu và gió, bật nảy nhiều lần trong sân trong 24 giây. Không xoay bitmap nhân vật. |
| Càn Khôn Phản Chấn | Vòng phản chấn, luồng hút gần boss; chạy ra ngoài. A minh họa phản toàn bộ đòn. Không có HP/damage thật. |
| Âm Dương Nghịch Chuyển | Tâm các vòng âm dương và xung di chuyển liên tục khắp sân, không còn neo cố định. |
| Tiểu đồng đưa rượu | Giữ bộ Toàn Chân v01, carry-walk 4 hướng; số tiểu đồng bằng số người chọn (1–6), mỗi tiểu đồng có đường vào/vị trí giao riêng, boss uống. |

Các thời lượng ngoài mức nhốt tối đa **30 giây** là đề xuất cho review art, không phải tuning combat được chốt: vòng normal 1.6 giây, chưởng mỗi 2.2 giây, ép tay khoảng 2 giây, spin 24 giây, phản chấn 9 giây, ultimate 15 giây. Bàn tay chốt vị trí trước khi ép là giả định của choreography để review, không phải yêu cầu gameplay mới. Không thêm luật rượu/miễn nhiễm hay cơ chế loot từ metadata cũ.

## File và nguồn gốc

- `generation_prompts.json`: toàn bộ prompt thực tế; dùng **built-in image_gen**, không dùng CLI/API fallback.
- `manifest.json`: source, hash SHA-256, kích thước, pivot, danh sách 24 frame mới và asset giữ lại.
- `prepare.py`: export offline, ráp nền từ art raster có thật, không import game.
- Boss mới: `assets/sprites/bosses/chu-ba-thong/boss_review_actions_v02.png` + JSON. Canvas 112×96; chân (56,80), body khoảng56px. Ba hàng quạt/quyền hướng xuống; spin xuống/phải/lên/trái. Frame spin trái được sửa bằng source riêng, giữ cả source cũ.
- Bàn tay: `assets/effects/bosses/chu-ba-thong/skills/song_thu_ho_bac/giant_hands_v02.png` + JSON. Canvas224×224, pivot(112,112); preview hiện có scale1.2 (nhỏ hơn 20% so với scale1.5 của bản đầu).
- Source mới gốc được giữ nguyên ở `source/review_actions_v02.png`, `source/spin_left_correction_v02.png` và `giant_hands_source_v02.png`. Đây là PNG phẳng, không giả nhận có layered Aseprite source.
- Asset gốc v01, source/metadata/approval lịch sử, sprite player đã duyệt và ảnh/video lịch sử đều giữ nguyên. Nguồn: artwork AI-assisted nguyên bản của project; không sao chép pack game khác, không khẳng định quyền tác giả độc quyền.

## Kiểm chứng và giới hạn

Chạy export/kiểm tra browser riêng từ root worktree:

```powershell
python assets/reviews/chu_ba_thong_v02/prepare.py
node assets/reviews/chu_ba_thong_v02/verify.mjs
```

Cần dependencies của repo và Microsoft Edge đã cài; `VOLAM_ART_BROWSER_CHANNEL` đổi browser channel, `VOLAM_ART_DEPS_PACKAGE` có thể chỉ package.json của một checkout đã cài dependencies, `VOLAM_ART_REVIEW_URL` đổi URL server riêng.

Báo cáo thực tế: `verification.json`; PNG thật từ browser: `arena-review.png`, `song-thu-ho-bac-review.png`, `thai-cuc-review.png`, `am-duong-review.png`, `compact-review.png`. Browser video/trace tắt. Các quan sát frame/timing và điều kiện review là assertion của preview, **không** phải kết quả combat/multiplayer/Phaser. Không có game authority trong bản xem này.

Đã đối chiếu hướng chibi, mặt/tóc/áo nhiều chi tiết, tỉ lệ boss56px/player44px, ánh sáng và 3/4 top-down với `vo_dang_character_reference.png`, `master_concept_v01.png`, các world/menu reference và hai anti-reference. File `vo_dang_art_direction_reference.png` được tài liệu nhắc tới không có trên base này; dùng ảnh Võ Đang hiện có, không tạo ảnh thay thế. So với positive concepts, arena vẫn còn lát nền lặp, biên cỏ/đá cần trau chuốt và VFX phóng lớn có pixel thô hơn sprite. Đây là nội dung cần director review, chưa đạt final-art acceptance.

Chưa tích hợp/check trong Phaser theo đúng yêu cầu hiện tại. Tấn công mới chỉ có hướng xuống; trước tích hợp cần thêm hướng còn lại, cleanup/tối ưu atlas và duyệt độ liên tục/tỉ lệ. Chưa kiểm tra authoritative damage, collision, dungeon hoặc sáu client đồng thời. Không ghi APPROVED mới vào bất kỳ manifest/lock nào.


## Kết quả thực chạy — 2026-11-01

- `python assets/reviews/chu_ba_thong_v02/prepare.py`: PASS, 24 frame mới, 98 input art/metadata được hash.
- `node --check assets/reviews/chu_ba_thong_v02/review.js`: PASS.
- `node assets/reviews/chu_ba_thong_v02/verify.mjs`: PASS, 22 nhóm assertion, tất cả frame mới và 32 baseline idle/walk cel được vẽ trong browser; timing chạy bằng requestAnimationFrame, projectile không retarget, trap 1/3/6 người và timeout30s.
- `pnpm check:final --config assets/reviews/chu_ba_thong_v02/playwright.config.mjs`: dừng ở prepare assets do hash đã có của `assets/effects/dungeons/forest/atlas.json` không khớp `assets/approved_forest_creeps.lock.json`. File khớp chính xác Git HEAD; task này không sửa file hay lock. Chi tiết/hash: `final_check_limitation.json`. Typecheck/full unit/build/remaining validators chưa chạy qua pipeline đó.
- `node tools/run-playwright.mjs test --config assets/reviews/chu_ba_thong_v02/playwright.config.mjs`: PASS, 1 browser test bọc toàn bộ 22 nhóm kiểm tra art, server riêng5401 do test tự bật/tắt. Server review5397 vẫn để bạn xem.
- `git diff --exit-code HEAD -- apps packages scripts tests .gitattributes package.json pnpm-lock.yaml`: PASS, không có runtime/game/dependency source edit. `git diff --check`: PASS.

`pnpm install --offline --frozen-lockfile` ban đầu thiếu metadata local; `pnpm install --frozen-lockfile` sau đó thành công và qua supply-chain policy theo lockfile, không đổi dependency source. Browser mặc định Playwright chưa có binary trong worktree mới; QA dùng Edge đã cài. Không bỏ qua approval guard hoặc cập nhật hash Forest để làm xanh kiểm tra.

Feedback01: browser stage PASS (1 test / 28 nhóm assertion), syntax check PASS; 98 nguồn art/metadata giữ nguyên hash. `check:final` đã thử lại một lần sau thay đổi và vẫn dừng tại cùng guard Forest trước typecheck/unit/build. `feedback_01/validation_scope.json` lưu lệnh, hash file preview và giới hạn kiểm chứng.
