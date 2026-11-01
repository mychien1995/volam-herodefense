# Lý Mạc Sầu — bản thử artwork v02

Ngày 2026-11-01. **Art/animation preview đã được director APPROVED ngày 2026-11-01**, chưa tích hợp hoặc nghiệm thu trong Phaser. Bản duyệt và hash chính xác ở `art_approval_v02.json`; các trường pending trong export/report cũ giữ nguyên trạng thái tại thời điểm xuất. Duyệt art không duyệt tuning combat hoặc runtime.

Mở `index.html` để xem ngay trên checkout hiện tại. Nếu vừa checkout lại, chạy `open-review.cmd`; script dựng dữ liệu offline rồi mở trình duyệt. Không cần chạy game server. Có thể dừng, tua frame, đổi tốc độ, hướng nhìn, camera 1×/2× và số người mẫu 1/6. Toàn bộ điều khiển nằm đè trong viewport.

Worktree riêng `ly-mac-sau`, từ `milestone/m3d` tại `0aeddd21`. Branch là `codex/m3d/ly-mac-sau`: Git từ chối tên `milestone/m3d/ly-mac-sau` vì đã có branch cha `milestone/m3d`. Không đổi tên branch đang dùng của checkout chính.

| Nội dung | Xem trong preview | Nguồn |
| --- | --- | --- |
| Sprite Lý Mạc Sầu | `0` / Sprite; Tuỳ chỉnh để đổi động tác và hướng | Tái dùng 128 frame boss v01, thân khoảng 56px, canvas 144×128, chân (72,104) |
| Arena Cổ Mộ Phái | `1` / Arena; chuyển Nền minh hoạ hoặc Tiles và props | Nền trống v02 mới; chế độ lắp ghép dùng tiles/props v01 thực tế |
| Đánh thường | `A` | Frame phất trần v01 + basic hit |
| Băng Phách Ngân Châm | `Q` | Đúng một băng kim, chọn P1; chốt vị trí lúc phóng, không đổi hướng khi P1 né |
| Xích Luyện Chưởng | `W` | **16 cel tím v02 mới** cho vận khí, báo hướng, đạn, impact; phóng đồng thời 8 phía |
| Phất Trần Công | `E` | Quạt phất trần theo hình nón trước boss, đổi được bốn hướng |
| Cổ Mộ Kiếm Pháp | `R` | Pháp ấn + xuất hiện bốn cổ mộ âm binh; có idle, walk và đánh kiếm |
| Ngũ Độc Chưởng | `T` | Báo trước và phóng độc chưởng từ Bắc/Nam/Đông/Tây; mỗi phía ba làn |

Tên **Băng Phách Ngân Châm** theo tên đã có trong asset; yêu cầu hiện tại gõ “Bằng”. Không đổi tên canonical trong game.

P1 di chuyển bằng mũi tên; dùng Q rồi né để xem đường kim cố định. Space dừng/chạy. Các nút ‹/› tua mỗi 50ms; thanh thời gian cho phép chọn thời điểm. Phím tắt được bỏ qua khi đang thao tác input/select/button; bấm nền arena để trả focus nếu cần.

`choreography.json` giữ các mặc định review: kim 480px/s, chưởng tím 300px/s và tầm 620px, quạt trước 120px, bốn âm binh và 12 độc chưởng. Đây là nhịp và đường đi minh hoạ, **không phải luật combat đã duyệt**. Không có damage/HP, AI, hitbox, collision, room hay loot mới.

## Asset và nguồn gốc

- Boss giữ nguyên: `assets/sprites/bosses/ly-mac-sau/`.
- Âm binh giữ nguyên: `assets/sprites/summons/co-mo-am-binh/` (64 frame, thân khoảng 44px).
- VFX giữ nguyên: `assets/effects/bosses/ly-mac-sau/` (92 frame).
- Bản tím mới: `assets/effects/bosses/ly-mac-sau/purple_v02/` (16 PNG riêng, spritesheet, hash JSON atlas, animation metadata, contact sheet, source và extraction recipe).
- Arena mới: `assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png` — **nền minh hoạ phẳng để review**, không phải map có collision hoặc tileset hoàn chỉnh.
- Tiles/props giữ nguyên: `assets/sprites/environment/co-mo-phai/`.
- Người chơi tham chiếu: sprite Võ Đang Quyền đã có, giữ nguyên kích thước khoảng 44px; sáu hình trong preview là mẫu tỉ lệ, không phải sáu client mạng.

Hai revision mới dùng **built-in image_gen**. Prompt đầy đủ và nguồn tham chiếu ở `generation_prompts_v02.json`. Tái dùng hàm `cells()`/`pack()` trong exporter v01 để xuất riêng bốn nhóm chưởng tím; không chạy lại toàn bộ batch. Source là raster phẳng, không tuyên bố có layer Aseprite. Không dùng pack ngoài; không tuyên bố bản quyền độc quyền. `preview_manifest.json` ghi kích thước, pivot, SHA-256, nguồn, reference và trạng thái review. Không thay đổi byte của asset cũ.

Art-readout: tham chiếu Võ Đang dùng đầu chibi lớn vừa phải, tóc búi rõ, nhiều lớp áo, viền pixel tối, điểm sáng có kiểm soát và tư thế lấy đà/contact/thu thế khác nhau. Boss giữ tóc đen/ribbon đỏ, áo trắng điểm đỏ và một phất trần trắng; arena giữ đá lạnh, đăng ngọc, vải đỏ phai và tượng tổ sư ở phía bắc. So với anti-reference placeholder, nhân vật/VFX là raster có chi tiết và các tư thế riêng; nền minh hoạ có mật độ trang trí tốt hơn. **Chế độ tiles/props vẫn lặp nền rõ và thưa hơn minh hoạ**; chưa đạt cùng mức hoàn thiện môi trường.

Đã đọc AGENTS, design handoff và các tài liệu art/workflow liên quan, đặc biệt `ART_DIRECTION_REFERENCE.md`, `ART_PRODUCTION_STANDARD.md`, `ART_ASSET_GUIDE.md`, `UI_UX_SPEC.md`, `LY_MAC_SAU_ASSET_NOTES.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/ART_ITERATION_WORKFLOW.md`. Đã xem reference nhân vật, world, arena/dungeon/menu, boss/âm binh/VFX và arena v01 thực tế. Tên cũ `vo_dang_art_direction_reference.png` không tồn tại: dùng file hiện có `vo_dang_character_reference.png`. File `current_codex_dashboard_anti_reference.png` hiện chứa sheet Võ Đang; dùng ảnh `current_game_2026_10_29_placeholder_anti_reference.png` làm benchmark âm thực tế. Giữ nguyên các file reference.

## Kiểm tra thực chạy

Các lệnh từ root worktree:

```powershell
python -X utf8 assets/reviews/ly_mac_sau_v02/build_preview.py
python -X utf8 assets/reviews/ly_mac_sau_v02/verify_assets.py
node --check assets/reviews/ly_mac_sau_v02/review.js
node --check assets/reviews/ly_mac_sau_v02/verify_preview.mjs
node assets/reviews/ly_mac_sau_v02/verify_preview.mjs --dependency-root D:/Projects/volam-hero-defense
git diff --check
```

Build cần Python + Pillow/numpy (đã có trên máy). Browser check dùng Playwright đã cài ở checkout chính và Edge headless riêng; không mở room hoặc dùng server của chat khác. Có thể bỏ `--dependency-root` nếu đã cài dependency tại worktree này. Viewer chạy trực tiếp qua `file:` và dữ liệu nhúng; `asset-data.js` được dựng cục bộ, không commit bản base64 trùng lặp.

- **PASS asset checks:** 300 frame (128 boss + 64 âm binh + 92 VFX cũ + 16 VFX tím), 83 clip; PNG/alpha/padding/pivot, bounds, atlas pixel equality, duration, frame khác nhau và hash input.
- **PASS browser check:** vẽ đủ 128 cel boss/bốn hướng với chân cố định; chạy live cả sáu chiêu, quan sát đủ bốn cel VFX mỗi chiêu và boss trở về idle; tám đạn tím với tầm quan sát 606px rồi biến mất; một kim giữ target/hướng trong lúc P1 né bằng phím thật; bốn âm binh sau pháp ấn; 12 độc chưởng từ đủ bốn mép; quạt trước đủ bốn hướng; 1/6 hình tham chiếu, chế độ tiles và overlay vừa viewport 900px. Không có lỗi trình duyệt hoặc tải ảnh.
- `asset_verification.json` nêu rõ 25 hash **metadata v01 cũ** đã lệch trước task này; các file đó khớp nguyên byte với HEAD gốc. 365 hash cũ còn lại khớp manifest cũ. Không sửa, ghi đè hoặc coi metadata lịch sử đó là được duyệt lại.
- Hai PNG chụp thật và đã mở xem: `evidence/arena-purple-eight-directions.png` ở 1280×854, một pixel logical trên một pixel ảnh; `evidence/arena-separate-tiles-props.png` ở chiều rộng hiển thị 1440px. Đây là ảnh **viewer Canvas2D**, không phải ảnh gameplay Phaser.

Không chạy full game suite/Phaser multiplayer vì đợt này chỉ tạo art và viewer độc lập, không thay đổi app/game data/map/server hoặc đăng ký asset runtime. Không tạo recording/GIF/video. Các báo cáo phân biệt rõ kiểm tra viewer và nghiệm thu game.

## Giới hạn còn lại sau duyệt art

Một số cast cũ quay mặt về người xem giữa gesture; padding/pivot cố định không tự chứng minh hết jitter hình thể. Hiện tám chưởng lớn, sáng mạnh hơn thân boss; xem ở 1× để đánh giá độ đọc khi chồng lên người chơi. Nền minh hoạ và bộ tile rời khác mật độ chi tiết; bộ tile cần thêm transition/seam/foreground trước tích hợp. Art/animation preview đã được duyệt; chưa có kiểm tra Phaser, collision, damage, multiplayer hoặc duyệt runtime cuối.
