# Đông Tà — bản thử sprite & VFX v02

Trạng thái: **PROTOTYPE · CHỜ DIRECTOR DUYỆT**. Brief final do người dùng cung cấp ngày 2026-11-01. Chỉ sản xuất/review sprite và VFX; chưa tích hợp encounter, AI, combat, invasion scheduler hay protocol vào game.

## Chạy và xem

Từ repository: python assets/reviews/bosses/dong_ta_v02/serve.py 5427
Mở http://127.0.0.1:5427/assets/reviews/bosses/dong_ta_v02/

Viewer dùng Phaser 4.2.1 đang cài trong checkout này, hoặc dependency của repository chính nếu checkout là worktree. Có thể chỉ định --dependency-root khi cần. Không tải thư viện từ CDN. Nền và props là asset arena chính hiện có; không tạo dungeon/arena Đông Tà riêng.

Chọn từng chiêu trong menu phía dưới. Tuỳ chỉnh: bốn hướng, 1/2/3/6 nhân vật mẫu, đường lướt, nhịp animation, zoom 1×/2×. Space dừng/chạy, ‹/› từng bước 100ms, thanh tua, ↑↓←→ di chuyển P1; A/Q/W/E/R gọi demo Đông Tà. H ẩn công cụ. Các điều khiển đều nằm trong viewport.

## Final brief và đối chiếu v01

| Nội dung final | Quyết định dùng lại / rework |
|---|---|
| Wave boss từ hướng đông, arena chính, đánh người, không đánh statue | Demo đi từ đông tới người chơi; giữ nền arena chính. Không tạo arena riêng. AI/server integration chưa thực hiện. |
| Tà Kiếm Liên Kích: chọc liên tiếp nhiều góc phía trước, tầm dài | Thêm 16 cel thrust bốn hướng, kiếm khí đâm thẳng mới. Không dùng broad slash cũ thay cho động tác chọc. |
| Đánh thường Lạc Anh: cone/quạt có hoa đào | Dùng lại sword_flurry_cast và sword_fan_wave / blossom_slash_wave. Đây là đánh thường thứ hai, tách mode khỏi active lướt. |
| Đàn Chỉ Thần Công: 5 viên bi nhanh, đuổi vị trí hiện tại | Giữ finger_cast; thay projectile bằng viên bi tròn mới. Demo mỗi viên lấy vị trí P1 lúc phóng rồi bay thẳng; cần director xác nhận cách hiểu này nếu muốn bi liên tục tự bẻ hướng. Đây là lựa chọn demo, chưa khóa luật AI. |
| Lạc Anh active: xuất kiếm, random tam giác/vuông/thoi/Z | Dùng lại cast/dash và afterimage, slash hoa đào. Bốn đường đều có thể chọn riêng; random của viewer là seeded cosmetic. Đảo Ảnh Di Hình không còn là skill độc lập trong brief final. |
| Ngọc Tiêu Hồi Phong: thổi sáo, hoa dày dưới arena rồi nổ | VFX force-wave vòng tròn cũ bị loại khỏi mode. Thêm 16 cel flute bốn hướng; hoa dưới đất + nổ mới. Hàng sáo trái bị sai hướng ở nguồn đầu được thay bằng nguồn trái mới, không lật nguyên nhân vật. |
| Triệu Hồn Đông Hải: cả Mai + Hoàng, một lần khi dưới 40% HP | Giữ summon_cast và VFX summon riêng hai người. Demo 45% → 40% (chưa gọi) → 39% (gọi cả hai một lần). |
| Mai: focus một người tới chết; tất cả chiêu đỏ đô/đỏ đậm | Giữ toàn bộ sprite nhân vật. VFX tím/xanh độc cũ không dùng trong choreography v02. Demo khoá P1 và đổi P2 sau cái chết được dàn dựng, không giả vờ có AI/HP thật. |
| Bạch Cốt Trảo: hai vuốt trái/phải | Dùng claw_attack; hai VFX vuốt đỏ mới, opposite curves. Claw phải nguồn hướng trái được mirror riêng VFX khi cần, không mirror nhân vật. |
| Ma Ảnh Tróc Hồn: vuốt xa liên tục | Dùng lại động tác claw_attack để phóng vuốt, thêm ranged_claw đỏ mới. Không dùng dash_attack thành lao người. |
| Âm Phong Hấp Lực: hút người chơi | Giữ pull_cast; thêm gió hút đỏ, chuyển động demo hướng vào tâm. |
| Độc Cốt Bạo: bọc độc, nổ lớn khi chạm đất, giữ vùng độc | Giữ pose ném hiện có (ID lịch sử poison_skull_throw chỉ là animation tag). VFX bọc vải, nổ và vùng độc đỏ mới thay đầu lâu/xanh độc. |
| Hoàng: chỉ Thanh Âm Hộ Trợ và Linh Xà Bộ | Giữ support_cast/heal_aura/evade/movement_trail; thêm chưởng hồi máu bay tới Đông + Mai. Không trình diễn Linh Động Kích/Bích Ba Hộ Thể/Đào Hoa Trấn Khí thành skill trong brief final. |
| Đào Hoa Loạn Ảnh Trận cũ | Không đưa vào brief/demo skill final. Nguồn lịch sử giữ nguyên. |

## Timing/choreography thử để duyệt

Đây là giá trị trình diễn, không phải tuning đã duyệt: 5 viên cách 105ms, tốc độ 770px/s; từng đoạn lướt 240ms; 45 cụm hoa rải theo nhịp, nổ khoảng 2,6–2,8s sau khi xuất hiện; bọc độc bay 700ms, vùng độc khoảng 3,8s; chưởng hồi máu lặp 600ms tới cả hai đồng minh. Không có HP heal/damage, DOT, CC hoặc RNG server nào được thực thi bởi viewer.

Mai vẫn giữ thiết kế trang phục tím/đen cũ theo yêu cầu dùng lại sprite nhân vật; **VFX** đã chuyển đỏ đô. Không tự thay concept/costume.

## Asset/provenance

- Giữ nguyên concept và 432 cel nhân vật v01. Không ghi đè atlas/sprite/concept cũ.
- Thêm 32 cel Đông Tà (thrust + flute, bốn hướng, 4 cel/clip), canvas 160×112, feet (80,88).
- Thêm 48 cel VFX (5 nhóm Đông/Hoàng + 7 nhóm Mai), canvas 160×160, pivot (80,80).
- Nguồn PNG phẳng do built-in image_gen tạo cho project. Không dùng sprite pack ngoài, không tuyên bố có source Aseprite phân lớp. Các PNG nguồn và prompt đầy đủ được lưu.
- Reuse exporter/packer và feet anchoring của Lý Mạc Sầu; generalized alpha-gutter extraction đọc đúng nguồn thrust thực tế 5 cột (chọn pose 0/1/3/4). Nearest resampling, binary alpha, fixed canvas. Không tự vẽ nhân vật/VFX bằng Graphics.
- New source/export paths: assets/sprites/bosses/main/dong-ta/rework_v02/; assets/effects/bosses/main/dong-ta/rework_v02/; assets/effects/summons/mai-sieu-phong/rework_v02/.
- generation_jobs.json: prompt của 5 request built-in image_gen. extraction_recipes.json: source SHA, crop, scale và pivot; provenance.json: nguồn và hash. PNG xuất tách từng cel kèm atlas JSON và animation JSON.
- Source duration exact per request không được đo; không suy ra từ thời gian hoàn thành cả batch.

## Đọc art reference

Đã xem concept Đông Tà/Mai/Hoàng và sprite thực tế, Võ Đang reference thay thế alias bị thiếu, current placeholder anti-reference, central arena hub và nội dung thật của current_codex_dashboard_anti_reference (thực ra là concept Võ Đang theo inventory). Tỷ lệ đầu lớn vừa phải, tóc bạc/đen và áo nhiều lớp, viền pixel rõ, tông jade/ivory, chân cố định và góc overworld nhất quán được giữ. Chất lượng không được suy ra từ một concept đẹp: screenshot ở zoom 1× và clip thực sự chạy trên Phaser là evidence riêng.

## Kiểm chứng và giới hạn

verify_assets.py kiểm PNG/atlas/cel riêng, alpha, padding, bốn cel khác nhau, source và retained hashes, scope.
verify.mjs chạy Chromium với video/trace tắt; quan sát tất cả clip qua sự kiện animation của Phaser và loop/completion, kiểm choreography, bàn phím và bố cục responsive, chụp PNG.
static_verification.json và browser_verification.json là kết quả lần chạy thực tế. evidence/ chứa PNG thực tế; không có WebM/MP4/GIF.

Sáu người trong viewer là sáu sprite scale-reference; không phải sáu client multiplayer. Chưa kiểm damage/rewards, AI thật, summon lifecycle server, natural combat, multiplayer hoặc final in-game art approval. Director review bản demo này đi trước bước tích hợp runtime.


## Kết quả kiểm tra cuối

- Static PNG/atlas: PASS, 80 cel mới / 20 clip.
- pnpm check:final --config assets/reviews/bosses/dong_ta_v02/playwright.config.mjs: PASS. 18 workflow regressions, 471 unit/integration tests, project/test/tool typechecks, production build, cả 15 asset validators và browser preview.
- Browser PASS: 159 clip / 628 frame quan sát qua Phaser animation events, hoàn tất loop/one-shot; 30 kiểm tra choreography, phím, responsive. Thời gian browser thực tế 26,77s. Tất cả VFX/sprite mới đã load và chạy, không có asset/page error. Sáu sprite mẫu không được coi là multiplayer verification.
- Final PNG: evidence/arena-sprites-native.png, arena-flute-petals.png, arena-mai-poison.png, arena-hoang-healing.png và arena-six-player-visual.png. sprite_vfx_overview.png là bảng ghép từ atlas thật; reference_comparison.png đối chiếu concept / Phaser / anti-reference.
- Các lỗi iteration được sửa: test tua đọc snapshot cũ; hero scale reference không có death_left nên mode khoá mục tiêu hiện loại P1 khỏi scene sau chết được dàn dựng, không chế animation chết.
- Worktree checkout đổi CRLF cho bốn JSON Hồng Liệt trong khi hash runtime đã duyệt yêu cầu LF. Đã khôi phục đúng byte khớp pin (xác nhận chỉ khác newline), thêm bốn eol=lf overrides trong .gitattributes và kiểm guard lại. Không sửa hash hay gameplay Hồng Liệt.
- Build vẫn có cảnh báo chunk lớn có sẵn. Không tạo recording. Chưa có director approval / AI / combat boss Đông Tà.
