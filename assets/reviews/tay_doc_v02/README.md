# Tây Độc — sprite/VFX review v02

## Duyệt thiết kế — 2026-11-02

Director đã duyệt thiết kế/choreography **feedback03**. Approval hiện hành và hash: `director_approval.json`; các report cũ mang `directorApproved:false` là lịch sử trước khi duyệt, không sửa lại kết quả test. Approval không bao gồm gameplay multiplayer/runtime hoặc mọi cel cũ trong gallery. Đã chốt25%maxHP; vụ nổ không truyền dấu mới; P2 chỉ dùng Cáp Mô, giữ cọc/bãi độc P1 tới khi bị phá/hết hạn. Prompt tích hợp: `CODEX_TAY_DOC_INTEGRATION_TASK.md` ở root repository. Turn này chỉ ghi nhận approval và soạn prompt; chưa thay gameplay. Các pose mới thiếu hướng và cel v01 có lỗi vẫn cần xử lý đúng phạm vi khi integration.


## Bản hiện tại: feedback03 — 2026-11-02

Demo: http://127.0.0.1:5397/?revision=feedback03. Giảm **thêm15% so với feedback02**: Ngũ Độc Thần Chưởng153→130.05px/s; Vạn Độc Bạo Phát256.5→218.025px/s. Lifetime tăng tương ứng để giữ tầm484.5px. Timeline Ngũ Độc kéo tới8.2s để hiện đủ tầm của đợt đạn cuối. Cấu hình riêng `feedback03/tuning.json`; giữ nguyên cấu hình/evidence cũ. Chỉ chỉnh demo mỹ thuật; không tạo art, đổi server/combat hoặc recording. Kiểm tra cuối `pnpm check:final --config playwright.tay-doc-preview.config.ts` PASS201.47s: typecheck,18workflow,471unit/integration,build,15validator và browser59.3s. Phaser4.2.1 xác nhận tốc độ130.05/218.025px/s,tầm484.5px,cả3điểm đáp và đợt cuối Ngũ Độc còn tồn tại ở7.75s rồi hết trước7.8s; không bị timeline cắt sớm. Report trong `feedback03/`; đã trả các report tự sinh ngoài scope về nguyên bản.
## Lịch sử: feedback02 — 2026-11-02

Demo: http://127.0.0.1:5397/?revision=feedback02. Ba thay đổi nhỏ theo feedback mới, dùng lại nguyên toàn bộ PNG/atlas:

- Cáp Mô Chấn Kích: radius450→405px (−10% cả bán kính/chu vi), warning và sóng độc cùng thu từ đường kính900→810px; status mẫu chỉ hiển thị trên3người gần, không còn người đứng cách433px.
- Ngũ Độc Thần Chưởng: tốc độ170→153px/s (−10%).
- Vạn Độc Bạo Phát: tốc độ285→256.5px/s (−10%) trên cả3điểm đáp.

Lifetime của hai projectile tăng tương ứng để giữ cùng tầm484.5px. Không đổi nhịp phát đạn, số hướng, số lần nhảy, cọc rắn8hướng hoặc các skill còn lại. Đây là số thử cho demo mỹ thuật, chưa nối combat/server. Cấu hình mới nằm riêng trong `feedback02/tuning.json`; giữ nguyên lịch sử `feedback01/tuning.json` và toàn bộ evidence cũ. Kiểm tra mới đo displacement tại cùng thời gian (91.8px/600ms cho Ngũ Độc;15.39px/60ms tại mỗi lần đáp cho Bạo Phát), lifetime/range và warning/sóng cùng footprint810px. Không tạo art mới hay recording. PNG mới: `feedback02/evidence/`. Kết quả cuối: `pnpm check:final --config playwright.tay-doc-preview.config.ts` **PASS,251.06s**; typecheck,18workflow,471unit/integration,build,15validator và1browser case (52.9s) đều PASS. Phaser4.2.1 xác nhận508frame,footprint810px,3người trong vùng chấn kích và tốc độ/tầm bay của hai skill tại đủ3điểm đáp. Không lỗi console hay recording. Report: `feedback02/final_check_timings.json`, `feedback02/browser_verification.json`, `feedback02/asset_verification.json`. Các report tự sinh ngoài scope đã trả về nguyên bản.

## Lịch sử: feedback01 — 2026-11-01

Đã áp dụng sáu chỉnh sửa mới của director. Demo vẫn ở http://127.0.0.1:5397; tải lại trang để lấy phiên bản mới. Bảng v02 bên dưới giữ lịch sử và được mục này thay thế tại các điểm khác nhau.

| Nội dung | Trước | Feedback01 |
| --- | --- | --- |
| Cọc rắn | 4 hướng, 0.9s/lần | 8 hướng có PNG riêng; 1.35s/lần (+50% thời gian giữa hai tia) |
| Boss vào từ tây | Lệch xuống mép cỏ | Chân đi đúng giữa đường gạch: worldY616 / viewportY356 |
| Quẹt trượng | Crescent nhỏ, góc chưa cố định | Warning + VFX nửa vòng tròn180°, bán kính minh họa160, pivot ngay chân boss; cả4hướng |
| Độc Vụ Mê Hồn | 4 bãi | 8 bãi lớn, warning trước khi nở |
| Cáp Mô Chấn Kích | Radius minh họa250 | Radius450 (1.8×, diện tích3.24×); vòng warning/sóng độc rộng tương ứng |
| Ngũ Độc Thần Chưởng | Đạn285px/s |170px/s (chậm hơn40%); lifetime2850ms giữ cùng tầm khoảng485px |

Đây là số thử cho demo mỹ thuật, không phải tuning damage/cooldown đã duyệt. Tốc độ bay tia cọc rắn giữ nguyên; “bắn chậm lại” áp dụng vào khoảng cách giữa các lần bắn. Vạn Độc Bạo Phát giữ tốc độ đạn cũ vì feedback chỉ yêu cầu Ngũ Độc Thần Chưởng.

Hai sheet mới dùng built-in image_gen tại `feedback01/source/`; prompt nguyên văn `feedback01/generation_prompts.json`. Export tập trung: `python -X utf8 assets/reviews/tay_doc_v02/feedback01/export_feedback.py`. Không regenerate44frame v02. Tám cel đầu rắn ghép cùng một đoạn chân cọc được vẽ sẵn để chân hoàn toàn trùng pixel, không quay cả cọc. Hai strip warning/sweep mới được crop/fit/clip alpha đúng bán cầu180° trước caster; canvas512×512/pivot(256,256)/radius160, không có pixel phía sau. Recipes/manifest ghi đầy đủ nguồn, hình học và hash. Không có source nhiều layer. Vòng shockwave chấn kích tái dùng `transition_shockwave` dạng vòng rỗng, thay clip lunge dạng lưỡi liềm để diễn tả dậm lan360° mà vẫn thấy nhân vật.

Hiện có **508frame boss/VFX trong126clip**, gồm448frame v01,44frame v02 và16frame feedback01. Actor mới vẫn chỉ hướng phải; đầu cọc là đủ8hướng thực. PNG screenshot mới vào `feedback01/evidence/`, lịch sử `evidence/` được giữ nguyên. Kiểm tra mới quan sát đủ8đầu rắn lúc phát live,8vector bắn, nhịp1.35s và tia cũ vẫn giữ hướng sau khi đầu quay; entry nằm giữa đường, quạt180° cả4hướng,8bãi độc, footprint chấn kích900px và đạn channel170px/s còn cùng tầm. Kết quả cuối: `feedback01/verification_summary.json`, `feedback01/browser_verification.json` và `feedback01/asset_verification.json`. Ngày2026-11-02: typecheck/18workflow PASS; full unit stage469PASS/2skip do cổng2638 bị tiến trình khác chiếm, sau khi cổng trống chạy lại đúng2test Võ Đang PASS (11.73s). Build PASS (9.55s),15validator PASS và browser case PASS (52.0s; runner exit0, tổng5.6phút do teardown Windows). Fixture server riêng bị kẹt sau khi case PASS được đóng đúng PID đã xác minh; demo5397 được giữ. Không sửa test/game để né lỗi cổng, không dừng tiến trình khác. Đã trả các report tự sinh ngoài scope về nguyên bản. Không chạy lại các stage đã PASS.

Ngày 2026-11-01 · branch `wip/m3d/tay-doc` · **PROTOTYPE, chờ director duyệt**.

Mở demo: `node assets/reviews/tay_doc_v02/server.mjs`, rồi http://127.0.0.1:5397.
Windows: chạy `open-review.cmd` trong thư mục này. Node/dependencies của checkout cần có; server nhận `--dependency-root <checkout-có-dependencies>` khi cần. Demo dùng Phaser 4.2.1 đã cài, chỉ bind 127.0.0.1, không nối room hoặc production server.

Chọn 12 nút ngay trong viewport; Tùy chỉnh cho phép đổi hướng, tốc độ, 1/2/6 người mẫu, xem từng clip và thử đứng chung/ra góc khi mang độc. Có thanh tua và tạm dừng. Mũi tên di chuyển P1; A phá cọc trong tầm minh họa. Sáu người trong demo là sprite mẫu cục bộ, không phải sáu client multiplayer.

## Final mô tả của director và đối chiếu asset

| Động tác | Dùng lại | Thay đổi v02 |
| --- | --- | --- |
| Wave boss từ tây, đánh người | Arena chính ground/props hiện có, walk/idle P1 | Timeline từ tây vào; không sản xuất arena riêng; không có đòn nhằm tượng |
| Quẹt trượng hình quạt | Ngoại hình và chất liệu trượng | Vẽ lại bốn pose hướng phải do bộ cũ thiên về đâm và bị cắt trượng; thêm crescent quẹt |
| Bắn độc khí bằng trượng | poison_bolt, basic/cast | Bay thẳng từ đầu trượng |
| Vạn Độc Phi Châm | needle_fan_warning, poison_needle, poison_status | Cone có warning trước loạt kim; diễn họa slow + độc đốt |
| Độc Vụ Mê Hồn | cloud_warning, cloud_expand, cloud_loop, poison tick | Nhiều vùng độc to trên nền đất; warning trước độc |
| Cổ Độc Khoan Tâm | Large cast, vòng warning, poison_status | Dấu độc mới trên duy nhất P1; đếm ngược; ra góc hoặc nổ lan; người bị chọn luôn mất 25% HP, không có thao tác giải |
| Hỗn Thiên Phục Long Chấn | Large cast, projectile poison_bolt | Cọc rắn mới: mọc lên, 4 hướng đầu quay, vỡ; đúng 6 cọc có thanh máu; mỗi nhịp mỗi cọc một tia, A phá cọc |
| Dưới 50%: Cáp Mô Công | Toàn bộ transition 4 hướng và nhận diện P2 | Bổ sung bò sát đất; diễn họa 49% HP và di chuyển nhanh |
| Bắn độc chưởng | giant_palm_projectile | Sửa riêng bốn pose bàn tay hướng phải bị cắt ở v01 |
| Cáp Mô Chấn Kích | lunge_impact, lunge_shockwave, warning vòng | Nhảy/dậm lan rộng, thể hiện độc + choáng; không dùng lane dash cũ |
| Ngũ Độc Thần Chưởng | poison_bolt, warning | Đứng yên nhả nhiều đợt 360°; thêm pose phồng má/nhả độc; bỏ diễn giải nhiều đại chưởng phía trước |
| Vạn Độc Bạo Phát | circular_eruption, poison projectiles | Ba lần nhảy minh họa; mỗi điểm đáp phát độc 360°, thay vụ nổ đứng yên |

`Độc Long Xuất Hải`, serpent_wave/serpent_lane_warning không còn nằm trong bộ skill final. File v01 được giữ nguyên làm lịch sử. Một số clip cũ khác cũng chỉ dùng trong gallery để audit, không tự gán thành skill mới.

## Nguồn, export và giới hạn

Giữ nguyên toàn bộ concept/actor/VFX v01. Tạo **3 sheet nguồn có alpha** bằng built-in image_gen; prompt nguyên văn trong `generation_prompts.json`. Xuất **20 frame actor + 24 frame VFX/cọc** qua alpha-gap extraction tái dùng từ exporter cũ. Riêng sheet sửa sweep/palm có cell thứ ba rộng hơn để giữ nguyên đầu trượng và bàn tay; crop rectangles ghi trong `extraction_recipes.json`. Không cắt concept thành animation, không bob/rotate ảnh tĩnh để giả pose. PNG nguồn phẳng là source; không tuyên bố có file Aseprite nhiều layer.

`cap_mo_v02/`: crawl/hop/exhale, mỗi clip 4 frame, canvas160×144, pivot chân(80,116). `actions_v02/`: sweep/palm, mỗi clip4frame cùng canvas/pivot. Các pose mới **chỉ hướng phải** trong lần duyệt đầu. Bộ baseline/transition cũ vẫn có4hướng. Khi chọn hướng khác, skill thường dùng baseline cũ; các pose mới Cáp Mô vẫn hướng phải. Chưa được gọi là bộ 4 hướng final.

`effects_v02/`: snake_rise, snake_facing, snake_break, curse_mark, curse_burst, staff_sweep, mỗi nhóm4frame, canvas256×256. snake_facing là4góc đầu, không phải4frame thời gian; demo chọn góc riêng, giữ chân cọc cố định. Cọc đặt base tại y=178 trên canvas; runtime origin(0.5,0.5) kèm offset−50px để chân đúng ground. VFX khác dùng center(128,128). Manifest từng nhóm ghi source SHA, palette/provenance và trạng thái.

Các con số chưa được director quy định chỉ là **timing/geometry của demo**: 3 loạt×9kim, warning1s,4đám độc, độc nổ4.5s/radius145, HP mẫu100→75, cọc100HP/4 lầnA/tầm160,16hướng radial,3lầnnhảy. Không phải tuning combat đã duyệt. 25% HP người được chọn được trình bày theo thanh HP tối đa chuẩn hóa100; cơ sở HP tối đa hay hiện tại cần xác nhận khi triển khai combat. Đồng đội chỉ hiện “Nhiễm độc”, không gán sát thương chưa được chỉ định. Không có immunity phase, spell cleanse, statue damage hay loot mới.

Nhân vật P2 vẫn là người với tư thế bò như cóc, đúng identity concept hiện có, không biến thành con cóc thật. Tăng damage phase2 là yêu cầu final được ghi nhận; demo mỹ thuật không tính damage.

## Kiểm tra và trạng thái

- `python -X utf8 assets/reviews/tay_doc_v02/build_preview.py`: tái xuất chỉ v02, không regenerate nguồn.
- `python -X utf8 assets/reviews/tay_doc_v02/verify_assets.py`: kiểm tra492frame boss/VFX trong123clip, frame bounds/alpha/distinct cels, hashes44frame mới và byte v01 không đổi.
- `node assets/reviews/tay_doc_v02/verify_preview.mjs`: renderer Phaser thực, từng492frame,10chuỗi skill live với4cel thực, walk4hướng live, warning/kim,4cloud, độc nổ isolated/grouped,6cọc/phá bằngA,16vector radial và3điểm đáp. PNG trong `evidence/`; không video/GIF/trace.
- `pnpm check:final --config playwright.tay-doc-preview.config.ts`: pipeline cuối + cùng browser verifier trên port5398 riêng; kết quả thực tế ghi dưới đây sau khi chạy.

Phaser có registry animation từ atlas; timeline mỹ thuật chọn frame theo durationsMs để có thể tua chính xác. Đây là **Phaser art preview**, chưa tích hợp encounter vào playable match. Không có server state, authoritative hitbox/damage/status, phase AI, shared clients, natural combat hoặc sáu-client acceptance. Không tuyên bố runtime gameplay hoàn tất hay art approved.

Quan sát reference: giữ mặt/tóc/râu sáng, lớp áo rách jade đậm, đai tím, staff và góc nhìn elevated orthographic của concept Tây Độc; body nhân vật khoảng54–64px cạnh hero44px. Động tác crawl mới thấp hơn, đổi chân/tay giữa cel; hop có co/ngửa/duỗi/tiếp đất. So với Võ Đang reference, Tây Độc ít chibi hơn do tái dùng identity cũ; chi tiết bị nén ở1× cần director duyệt. Nền arena tái dùng có độ tương phản và chi tiết cỏ cao, độc xanh vẫn khó thấy ở một số vị trí cỏ; projectile dùng additive core để cải thiện. Cọc nằm trên sân đá đọc rõ hơn. Không dùng primitive placeholder như anti-reference. `reference_comparison.png` so actual screenshot với positive/negative; `reference_inventory.png` ghi các reference đã kiểm tra.

Cần duyệt sprite/VFX lần này trước khi mở rộng pose mới sang đủ4hướng hoặc nối gameplay. Những lỗi cell v01 ở các hướng/clip chưa sửa vẫn tồn tại trong gallery lịch sử; không khẳng định toàn bộ448frame cũ sạch lỗi hình ảnh chỉ vì validator cấu trúc PASS.


### Kết quả thực tế cuối — 2026-11-01

`pnpm check:final --config playwright.tay-doc-preview.config.ts`: **PASS, 189.49s**. Typecheck project/tools/tests,18workflow regression,471unit/integration trong41file,production build,tất cả15validator hiện có và1browser case PASS. Browser cuối36.1s,Phaser4.2.1,492frame/123clip,10chuỗi live và4hướng walk; không page/console error. Asset validator riêng PASS sau kiểm tra thêm hash3source PNG. Chi tiết: `final_check_timings.json`, `browser_verification.json`, `asset_verification.json`.

Lượt pipeline đầu dừng đúng tại hash4JSON Hồng Liệt do `.gitattributes` ép CRLF nhưng runtime provenance khóa LF. Đã xác minh normalize CRLF→LF khớp chính xác hash đã duyệt rồi khôi phục byte trong checkout cô lập. Không đổi hash lock, nội dung, PNG hay cơ chế game Hồng Liệt; Git index được refresh/renormalize về cùng blob, không stage diff. Lượt đầy đủ sau đó PASS. Các report cũ bị validator ghi lại đã được trả về phiên bản checkout, giữ diff đúng scope Tây Độc. Lỗi preview ban đầu khi tua thẳng tới mốc nổ đã sửa bằng timeline vị trí deterministic; `evidence/failure.png` giữ nguyên lịch sử, các report PASS mới là kết quả cuối.

Các prompt mới dùng built-in image_gen, không CLI/API fallback. Alias `vo_dang_art_direction_reference.png` không tồn tại; đã xem `vo_dang_character_reference.png` thực tế. File `current_codex_dashboard_anti_reference.png` thực tế chứa sheet Võ Đang, nên screenshot placeholder 2026-10-29 cung cấp benchmark âm; không sửa reference. Đã xem và lưu bảng toàn bộ reference world/menu trong `reference_inventory.png`.
