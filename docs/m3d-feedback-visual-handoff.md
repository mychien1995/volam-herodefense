# M3D feedback visual — bàn giao sản xuất độc lập

Ngày: 2026-11-01. Branch: `wip/m3d/feedback-visual`. Base: `46d36869` từ checkout `milestone/m3d` sạch. Worktree được tạo riêng bằng công cụ của app; checkout gốc và thay đổi của các worktree khác được giữ nguyên. Không đọc/chờ/merge/cherry-pick worktree tech.

Gói mới nằm tại [assets/m3d-feedback-visual](../assets/m3d-feedback-visual/). Kết quả thực tế: **Bản r2:18 component (6 character,11 VFX,1 icon),917 lượt frame /255 clip,23 PNG nguồn và18 source Aseprite**. Inventory và byte size chính xác, bao gồm bản xem nhân vật bổ sung sau, nằm trong file_inventory.json. Số frame gồm các hướng suy ra và cel lặp theo phase, không phải853 hình vẽ độc lập. **Visual r2 đã được director duyệt** ngày2026-11-02, lời xác nhận: “duyệt visual”. Căn cứ hiện hành là director_approval_r2.json và approved_visual_r2.lock.json. Trạng thái trong source/export/provenance/test report được giữ nguyên như snapshot lúc xuất; approval register này supersede các nhãn chờ duyệt lịch sử cho phần visual r2 được chọn. Không tích hợp hoặc kiểm chứng trong Phaser production, không thay gameplay/server/damage/AI/cooldown/hitbox/HUD logic/loader/animation registry. Không tạo video/GIF/WebM/MP4.

## Gate và căn cứ đã đọc

Đã đọc AGENTS.md; ART_DIRECTION_REFERENCE.md; ART_ASSET_GUIDE.md; ART_PRODUCTION_STANDARD.md; CODEX_ART_QUALITY_RESCUE_TASK.md; docs/ART_ITERATION_WORKFLOW.md; docs/DEVELOPMENT_WORKFLOW.md, tài liệu camera/asset trong TECHNICAL_ARCHITECTURE.md và các mục roadmap/decision/acceptance liên quan. Chỉ đọc code hiện tại để hiểu convention: skill-art-registry.ts, forest-art.ts, atlas baseline và pipeline M3C3. Không sửa các file này.

- Baseline Võ Đang và Thiếu Lâm có approval riêng trong approved_vo_dang.lock.json và approved_thieu_lam.lock.json; baseline Thiên Sơn/Cái Bang và sáu quái Forest cũng có lock riêng.
- Gate concept/mẫu Bổng lịch sử đã được duyệt, bằng chứng trong assets/source/skills/m3c3_feedback_v2_batches/progress.json: “Tôi duyệt concept và animation mẫu Cái Bang Bổng vừa trình bày.” Đây không phải approval cho asset M3D mới.
- ART-01 arena/runtime director approval vẫn pending theo ART_ASSET_GUIDE.md và ART_PRODUCTION_STANDARD.md §2. Phiên này sửa các family hiện có theo yêu cầu art độc lập, không mở rộng school, environment hoặc map và không tự đóng ART-01.
- Gate còn lại: tích hợp sau, playback trong Phaser thật, so reference tại normal gameplay zoom, occlusion/feet-Y-depth, natural multiplayer readability và director review. Không suy approval từ validator PASS.

Ảnh đã xem trực tiếp: Võ Đang character reference; concept Võ Đang/Thiếu Lâm/Thiên Sơn đã duyệt; Cái Bang reference; world reference; forest reference; sheet quái đã duyệt; cả hai anti-reference theo tên file và ảnh dashboard thực tế. Readout: đầu chibi lớn, thân ngắn có lớp áo rõ, outline tối, highlight trên-trái, khăn buộc tóc trắng, Võ Đang đen/ivory và Thiếu Lâm vàng/nâu; camera orthographic 3/4 nhìn từ trên xuống. Anti-reference bị loại vì nhân vật hình khối, nền lặp và world nhỏ bên dashboard.

Alias lỗi được giữ nguyên, không tạo/sửa file dùng chung: vo_dang_art_direction_reference.png vắng trong checkout này; dùng vo_dang_character_reference.png làm ảnh tương đương đã ghi trong tài liệu repo. thien_son_thieu_lam_character_reference.png thực tế là town; dùng concept school đã duyệt cho identity. current_codex_dashboard_anti_reference.png thực tế là Võ Đang sheet; dashboard âm đúng là wuxia_town_world_reference.png. current_game_2026_10_29_placeholder_anti_reference.png là anti-reference chất lượng. in_game_world_reference.png hiện tồn tại và đã xem.

## File và mục đích

| Đường dẫn trong gói | Nội dung |
|---|---|
| manifest.json | 16 component, mapping, atlas, tags, pivot, durations, phase/loop và trạng thái từng component |
| provenance.json | Nguồn/license declaration, prompt, hash reference/source, transform và phạm vi approval |
| file_inventory.json | Danh sách chính xác mọi file bàn giao, byte size và SHA256; không tự hash chính file inventory |
| frame_inventory.csv | Từng frame theo đúng thứ tự clip, facing, phase, duration, loop, pivot, opaque bounds và hash |
| source/generated/*.png | 22 PNG nguồn nguyên gốc; trạng thái draft, gồm bản bamboo trước và sau yêu cầu tách alpha |
| source/generation_records.json | Prompt chính xác, reference, tên output generator, thời điểm bắt đầu/kết thúc từng request |
| source/plan.json | Recipe chọn cel, mirror/rotation/projection, thứ tự và thời lượng gợi ý; không phải game manifest |
| source/character_measurements.json, effect_measurements.json | Bounding runs/alpha, anchor đo được và source scale |
| source/*.aseprite | 16 source chỉnh sửa được: RGBA cels, tag và slice feet/effect_anchor; không giả lập layer gốc bị mất |
| exported/<component>/<component>.png | PNG atlas thật có alpha |
| exported/<component>/<component>.json | Aseprite JSON-hash atlas, rect và tags rõ ràng, không suy grid từ ảnh |
| exported/<component>/<component>.animations.json | Metadata handoff với animation frame names/order, FPS/duration, phase, loop, origin và offset |
| exported/<component>/frames/*.png | Từng frame độc lập, kiểm bằng pixel với atlas |
| previews/*_contact_1x.png | Contact sheet toàn bộ frame của từng component ở native pixel scale |
| previews/overview_1x.png, overview_2x.png | Tổng quan pixel xuất thực tế; không phải screenshot game |
| previews/*_1x.png, *_display_2x.png | PNG từ canvas preview thật, nền sáng/tối và display2×; có nhãn độc lập |
| index.html | Preview Canvas2D không phụ thuộc Phaser/game/server; A phát một clip, key repeat không replay |
| source/tools/build.py, assemble.lua | Adapter pipeline raster/Aseprite sẵn có; chỉ xuất trong gói riêng |
| source/tools/review.mjs | HTTP server tạm + browser playback/PNG, tự đóng browser/server của nó; không video/trace |
| source/tools/finish.py | Metadata/provenance, CSV, overview, hash approval-lock, palette và loop seam report |
| source/omitted_source_cells.json, removed_export_frames.json | Lý do bỏ ô đuôi rỗng; giữ raw source, không bịa frame |
| previews/validation.json | PNG/atlas/frame/order/alpha/bounds/pivot validator |
| previews/browser_validation.json | Frame thực sự đã vẽ, số cycle và thời gian quan sát của từng clip |
| previews/loop_seams.json | Độ khác pixel last→first và hai cycle đã quan sát; chỉ là kiểm tra seam kỹ thuật |
| previews/protected_assets_validation.json | Hash các asset đã khóa được kiểm lại, không sửa approval lock |
| previews/handoff_summary.json | Tổng số file/component/frame/clip và các gate còn pending |

## Mapping nhân vật và VFX

Quy ước tag: `d` = right/down/left/up. Frame name luôn là `<tag>_<index>`, index từ 0. **Danh sách frames[] trong JSON là thứ tự có thẩm quyền**, không dựa thứ tự object atlas hoặc số hàng nguồn. Giá trị FPS/duration dưới đây chỉ gợi ý presentation, không quyết định cooldown/hit/damage.

| Component ID | Skill/nhân vật và tag chính | Frame/phase gợi ý |
|---|---|---|
| m3d_thieu_lam_quyen_character | Thiếu Lâm Quyền: left_fist_d, right_fist_d, front_kick_d, roundhouse_kick_d | 4 cel/thức, 70/70/90/100ms; 1 clip mỗi accepted A, không tự chạy cả chuỗi |
| m3d_thieu_lam_quyen_vfx | Cùng bốn thức: quyền trái, quyền phải, cước trước, cung đá vòng | 4–6 cel tùy hướng sau bỏ đuôi rỗng, 55ms/cel; quyền/cước ảnh có wake nối về thân |
| m3d_vo_dang_quyen_character | Võ Đang Quyền: left_fist_d, right_fist_d | 4 cel, 330ms/đòn; loop=false; mỗi A một đòn |
| m3d_vo_dang_basic_vfx | left_fist_wave_d, right_fist_wave_d, sword_qi_d | Sóng âm ngắn 5–6 cel, 55ms; kiếm khí từ giữa thân, không bake travel |
| m3d_vo_dang_kiem_character | Võ Đang Kiếm basic_attack_d; Nhân Kiếm Hợp Nhất nhan_kiem_launch_d | A 330ms; launch 500ms; cels cuối launch không còn kiếm cầm tay |
| m3d_nhan_kiem_hop_nhat_vfx | launch_d, flight_loop_d, hold_d, recall_outro_d, blink_departure, blink_arrival | launch3×80ms; flight6×100ms loop; hold1 cel tĩnh, gợi ý1500ms; recall5×70ms; blink3×55ms/phase |
| m3d_thien_son_dao_character | Thiên Sơn Đao basic_attack_d; liet_phong_{gather,gather_hold,slash,recover}_d | A330ms; gather2×100ms; hold1×100ms loop; slash130ms; recover140ms. liet_phong_cast_d là full-sequence tiện preview, không bắt buộc dùng khi tích hợp |
| m3d_thien_son_dao_vfx | Liệt Phong Đao liet_phong_{gather,gather_loop,slash,outro}_d; basic_slash_d; Bách Liệt Thiên Kích bach_liet_{intro,loop,outro}_d | Đao lớn tụ trên đầu, chém ra trước; các phase tách riêng. Bách Liệt intro2×90ms, loop3×85ms, outro2×100ms |
| m3d_khang_long_huu_hoi_vfx | Cái Bang Chưởng / Kháng Long Hữu Hối: dragon_{intro,loop,outro}_d | intro480ms, loop600ms, outro510ms; kéo dài bằng state, không kéo giãn một animation cố định |
| m3d_khang_long_burn_vfx | Kháng Long Hữu Hối cấp4: burn_intro, burn_loop, burn_outro | 6 cel/phase; 90/100/80ms mỗi cel; viền lửa nhỏ thấp, tâm trống, loop theo owner khi tích hợp sau |
| m3d_pha_giap_bong_vfx | Cái Bang Bổng / Phá Giáp Bổng: reach_{intro,loop,outro}_d và foot_explosion | Vệt dài riêng; explosion6×75ms gắn tại chân, không gắn đầu vệt |
| m3d_thieu_lam_skill_vfx | La Hán Quyền, Vi Đà Quyền, Như Lai Niết Bàn, Thiếu Lâm Đao A và Tam Giới Quy Thiền | Mỗi skill có intro/impact/outro_d, 2 cel/phase; rộng/vươn xa hơn bằng source mới. impact chỉ là tên phase hình ảnh |
| m3d_truc_lam_kiem_khach_character | Quái bamboo Trúc Lâm Kiếm Khách: idle_d, walk_d | 2×350ms idle, 4×120ms walk, đủ4 hướng; attack/hurt/death không được vẽ lại trong gói này |
| m3d_dash_vfx | Lướt chung dash_d | 6×40ms, 240ms, không loop; dust/streak ngắn, không dome/shield/miễn sát thương |
| m3d_dash_icon | Lướt / dash_icon | PNG32×32, art nhỏ có safe margin; không bake số charge, vòng hồi hoặc text |

“Thiết Lâm Đao” trong feedback được ánh xạ thành **Thiếu Lâm Đao**. Không tạo school/skill mới.

Sprite clarity được sửa ở các frame tấn công của Thiếu Lâm/Võ Đang và idle/walk của một quái bamboo tiêu biểu. Không vẽ lại toàn bộ idle/walk hero, năm loại Forest khác hoặc toàn roster. Những animation không có trong gói này tiếp tục dùng baseline hiện có khi bên tích hợp chọn reuse, không được gọi là mới sản xuất.

## Canvas, pivot, facing và footprint

| Loại | Canvas | Pivot pixel | Origin | Scale gợi ý |
|---|---|---|---|---|
| Hero |160×120|80,96|0.5,0.8|1; thân khoảng44px |
| Trúc Lâm Kiếm Khách |160×128|80,106|0.5,0.828125|1; thân khoảng44px |
| VFX chính |384×384|192,192|0.5,0.5|1; canvas trống để tránh cắt hiệu ứng |
| Vùng đốt |192×128|96,76|0.5,0.59375|1; oval nhìn thấy khoảng65×27px |
| Lướt |160×128|80,64|0.5,0.5|1; vệt nhìn thấy khoảng40–60px |
| Icon lướt |32×32|14,14|0.4375,0.4375|1 cho icon32px |

Canvas không phải footprint/hitbox. Xem opaqueWorldBoundsUnion trong JSON và opaque_bbox từng frame trong CSV để biết giới hạn pixel thật. Kiếm khí khoảng40–60px, quyền ảnh khoảng25–40px; burst/đao/long-wave khoảng80–150px tùy phase. Đây là gợi ý presentation, không đổi tầm trúng đòn.

Mapping canvas cũ → mới: hero Quyền80×80/feet40,64; Võ Đang Kiếm96×80/48,64; Thiếu Lâm Đao112×80/56,64; Thiên Sơn Đao80×80/40,64 → hero160×120/80,96. Forest128×128/64,106 →160×128/80,106. Giữ feet world position và scale1; không resize actor theo cả canvas mới.

Giữ facing cardinal của clip, camera không quay. Shaolin left được mirror và hoán đổi nhãn tay; vertical opposite fist cũng mirror strip mới để thấy rõ tay đối diện, không đổi facing. Tam Giới dùng hàng thật sự hướng phải cho right và bản mirror cho left; hàng nguồn gán nhầm facing không được dùng. Plan ghi từng transform. Source không tự bảo đảm grid; extractor dùng connected alpha runs thay vì cắt đều concept sheet.

placementOffsetFromFeet trong mỗi clip là local presentation offset. Quyền/kiếm khí thường bắt đầu giữa thân (0,-22/-24). Cung đá vòng dùng offset right(10,-18), left(-10,-18), down(0,-12), up(0,-24) và source scale×1,4 để nối gần chân đá; không đổi pivot actor. Vi Đà: ground origin phía trước chân cùng hướng nhìn, right/left±55px, down/up±36px; eruption giữ trục thẳng đứng. Tụ đao bắt đầu phía trên đầu (0,-44), không xoay cả hình đao đứng thành hình nằm khi đổi facing. Vụ nổ Bổng và vùng đốt có offset(0,0) tại feet. Vùng đốt cần vẽ dưới actor và đi theo owner; không để canvas trống làm vùng va chạm.

## Hướng dẫn phiên tích hợp sau

1. Đọc manifest/frame_inventory và bind stable ID/tag rõ ràng sang presentation adapter hiện có. Đây là schema handoff độc lập, không tự được loader game tiêu thụ. Chuyển placementOffsetFromFeet sang offset mà renderer đang dùng; không sửa gameplay để khớp artwork.
2. Dùng named frames từ JSON, nearest sampling và scale1. Giữ world feet pivot, shadow/Y-depth độc lập với artwork. Không suy frame/layout theo kích thước source PNG. Không dùng generated source/contact sheet làm atlas runtime.
3. Mỗi accepted A chọn đúng một thức/clip do state hiện tại quyết định. Không queue bốn thức hoặc tự lặp theo việc giữ A; animation kết thúc không phát sinh hit tiếp theo.
4. Damage, hit, range, AI, cooldown, RNG và lifecycle tiếp tục do server quyết định. Intro/impact/contact là phase hình ảnh; không tạo hit từ frame hoặc tự thêm vùng trúng đòn.
5. Nhân Kiếm: launch từ torso; flight_loop là sprite tại chỗ, code sau di chuyển world theo hướng đã chọn. Dùng hold_d tĩnh cuối tầm1,5s theo state; không phát lại launch/slash trong lúc hold. Blink departure/arrival và recall_outro là phase độc lập, cleanup đúng lúc; không giả định có damage ở trạng thái lưu.
6. Liệt Phong dùng gather/gather_hold rồi slash/recover và VFX outro theo state. Bách Liệt/dragon/staff reach có loop riêng để code điều khiển thời gian. Không bake hết quãng bay/thời lượng vào một sequence.
7. Vùng đốt cấp4 theo owner, đọc được ranh giới, tâm trống. Nổ Phá Giáp Bổng luôn ở feet; reach là instance khác có heading.
8. Dash chỉ là cue chuyển động. Metadata không cấp immunity, collision bypass, damage hoặc charge logic. Tham khảo người dùng: tối đa2 charge, hồi lần lượt6s/charge; không có logic này trong gói art.
9. Actor/VFX phải hủy khi state kết thúc/cancel/chết/đổi vùng/disconnect. Preview Canvas không xác nhận lifecycle trong game. Sau bind, chạy đầy đủ live Phaser/reference/normal-zoom và multiplayer gate của repo.

## Provenance, trạng thái và giới hạn

Công cụ: built-in image_gen; không dùng CLI/API key fallback. Prompt đầy đủ trong source/generation_records.json. Tạo pose/VFX mới theo identity/palette đã duyệt; không cắt concept làm animation atlas, không chỉ sharpen/upscale ảnh cũ, không dùng proprietary game pack, SVG/geometric placeholder hoặc procedural drawing làm final art. Transform crop/mask/nearest/palette/rotation được ghi trong plan và provenance. Source Aseprite có raster cels chỉnh sửa được; không khẳng định vẽ tay bởi con người hoặc có layer gốc của generator.

License declaration: tạo cho project, không nhập asset pack bên ngoài; không tự gán CC0 hay chứng nhận độc quyền/bản quyền. Reference đã có trong repo được dùng làm direction; quyền bên thứ ba không được xác minh độc lập. Xem provenance.json và SHA256 cho từng nguồn.

- Raw generated source: **draft**.
- PNG/atlas/source Aseprite đã xuất: **exported**, sau kiểm tra preview độc lập thành **preview-validated**.
- Live Phaser production, integration và director approval của mọi asset mới: **pending/false**.
- Các nguồn/approval lock cũ vẫn giữ nguyên byte; approval cũ không lan sang revision mới.

## Kiểm tra thực chạy

- build.py: xuất bằng Aseprite, kiểm RGBA, frame không rỗng, không chạm biên, rect trong atlas, tên/thứ tự/duration, tag, pivot/origin và từng PNG khớp pixel atlas. Tổng cuối:853 frame /243 clip PASS; xem previews/handoff_summary.json.
- review.mjs: renderer Canvas2D thực trong browser headless, chạy mọi clip đủ frame theo requestAnimationFrame; loop quan sát2 cycle; ghi thứ tự frame và thời gian. Sau khi căn lại cung đá vòng, chỉ chạy lại16 clip của component bị đổi và PNG; giữ227 clip không đổi từ full playback trước đó. Test repeated keydown A không replay. Chụp PNG logical640×360 và display1280×720 nền sáng/tối. Đây không phải test Phaser/gameplay.
- finish.py: kiểm alpha nhị phân, palette character, thống kê loop seam, provenance/hash và approved-file locks (3.678 lượt file kiểm, không mismatch), contact/overview/CSV/inventory.
- Có 12 lượt ô source không có cụm alpha đặc, thêm14 lượt đuôi mất hết pixel sau nearest downsample đã bị loại; report trước cleanup và raw source được giữ. Chỉ xuất lại component lỗi; không regenerate nguồn hợp lệ.
- Không chạy pnpm check:final/typecheck/full unit/build/game browser: phiên này không sửa code game và không tích hợp; các lệnh preparation/game sẽ ghi shared production output nằm ngoài phạm vi được phép. Không suy kết quả các suite này từ preview PASS.
- Không tạo recording, animated image hoặc trace screenshot stream.

PNG cần xem: [overview native](../assets/m3d-feedback-visual/previews/overview_1x.png), [Shaolin roundhouse 2×](../assets/m3d-feedback-visual/previews/shaolin_roundhouse_display_2x.png), [Wudang sword 2×](../assets/m3d-feedback-visual/previews/wudang_sword_display_2x.png), [wind dao 2×](../assets/m3d-feedback-visual/previews/wind_dao_display_2x.png), [burn boundary 2×](../assets/m3d-feedback-visual/previews/burn_boundary_display_2x.png), [static sword hold](../assets/m3d-feedback-visual/previews/sword_hold_display_2x.png).

Lệnh từ worktree visual:

```powershell
python -X utf8 assets/m3d-feedback-visual/source/tools/build.py --validate
node assets/m3d-feedback-visual/source/tools/review.mjs <checkout-có-node_modules-và-browser-cache>
python -X utf8 assets/m3d-feedback-visual/source/tools/finish.py
# Chỉ khi sửa source/recipe và cần xuất lại:
python -X utf8 assets/m3d-feedback-visual/source/tools/build.py --only <component_id,component_id>
# Preview thủ công, chọn một cổng trống:
python -m http.server 5277 --bind 127.0.0.1 --directory assets/m3d-feedback-visual
```

Build cần Aseprite ở đường dẫn đang dùng của repo, Pillow/numpy và retained M3C3 extraction tools. Review cần @playwright/test/browser cache của checkout truyền vào, không cài dependency hoặc sửa package manifest trong session này. finish.py chỉ ghi trạng thái preview-validated khi browser report thực đã PASS.

## Git bàn giao

Chỉ thêm assets/m3d-feedback-visual/** và docs/m3d-feedback-visual-handoff.md. Không ghi đè asset hiện có, sửa shared manifest/code/spec hoặc approval lock; không merge/cherry-pick, không tích hợp production. Thay đổi được để trong worktree/branch visual để review và phiên thứ ba tiếp nhận. Git status cuối được báo riêng trong chat; không tự commit/merge.


## Bổ sung: preview nhân vật thi triển cùng VFX

Mở `http://127.0.0.1:5277/performance.html` khi server preview đang chạy. Trang `index.html` cũ giữ inspector từng frame và có đường dẫn sang chế độ này.

- Chọn môn phái và đòn/skill:17 bản diễn, gồm đánh thường, các skill có VFX mới, lướt và idle/walk quái bamboo.
- Nhân vật có idle, pose thi triển, VFX theo phase và hồi về idle. Nhân vật/quái/VFX nằm trong một viewport; công cụ xem là overlay, không phải HUD game.
- Bấm A hoặc Thi triển để phát một lần. Thiếu Lâm A tiến từng thức trái/phải/đá trước/đá vòng; Võ Đang A xen trái/phải. Giữ A không tự lặp. Checkbox Tự lặp chỉ tự chạy lại bản diễn mỹ thuật.
- Mũi tên đổi facing; Space dừng/tiếp; timeline để kéo chậm; tốc độ0,25×/0,5×/1×; phóng1× pixel hoặc2× chi tiết; H ẩn công cụ.
- Quái tham chiếu đứng làm mốc, không có AI/hit/damage. Kiếm/rồng di chuyển bằng choreography riêng của viewer. Kiếm cuối tầm dùng frame tĩnh1,5s. Bật Di chuyển vùng đốt để xem loop bám feet của actor.
- Baseline idle/walk và một số pose cast cũ được sao chép nguyên byte vào `previews/support/`, có source/hash/provenance trong manifest riêng. Các skill chỉ có VFX mới được ghi rõ “Pose cũ + VFX mới”; không khẳng định pose cũ là art mới.13 atlas tham chiếu/32 file được giữ đúng hash nguồn, không thêm vào manifest853 frame của batch.
- `performance.html`, `performance.css`, `performance.js`, `performance-plans.js`: UI/renderer/choreography độc lập. Không import game-core/server/production loader/registry, không xác lập gameplay.
- `source/tools/prepare-performance.py`: chuẩn bị bản sao actor tham chiếu. `source/tools/test-performance.mjs`: kiểm tất cả preset/facing ở1× và2×, live playback, cleanup, A không repeat, hold tĩnh và burn theo actor. Kết quả thực: **17 bản diễn,136 tổ hợp preset/hướng/zoom PASS**, live17 bản diễn ở tốc độ1× trong khoảng46,5s, không lỗi browser. Sáu PNG chụp browser thực nằm tại `previews/performance_*.png`; không có video/trace.
- Choreography Liệt Phong chọn phần gió tàn cuối outro (từ frame3) để không hiện lại nguyên đao đứng sau nhát chém. Đây là lựa chọn preview, không sửa PNG hoặc registry và không buộc bên tích hợp dùng timing này.

Lệnh kiểm đúng phần preview bổ sung:

```powershell
python -X utf8 assets/m3d-feedback-visual/source/tools/prepare-performance.py
node assets/m3d-feedback-visual/source/tools/test-performance.mjs <checkout-có-node_modules-và-browser-cache>
python -X utf8 assets/m3d-feedback-visual/source/tools/finish.py
```

Các source/PNG/atlas của16 component mới giữ nguyên; không regenerate artwork. Gate Phaser production và director approval vẫn pending. Không chạy lại full game suite cho thay đổi viewer độc lập.


## Feedback r2 — 2026-11-02

Trang preview vẫn là `http://127.0.0.1:5277/performance.html` (F5 hoặc thêm `?feedback=r2` nếu tab cũ đang mở). Chỉ thay art/choreography độc lập, không dùng hoặc chờ worktree tech. Không sửa gameplay, hitbox, damage, cooldown, AI, loader/registry/HUD production.

| Feedback | Thay đổi thực tế trong bản diễn |
|---|---|
| Thiếu Lâm Quyền:3 thức đầu | Quyền/cước kình tách khỏi thân, bay thẳng thêm32 đơn vị trình bày theo facing; thức đá vòng thứ tư giữ nguyên |
| Vi Đà Quyền | Offset tới root vụ nổ nhân chính xác1,3: phải/trái55→71,5px; xuống/lên36→46,8px. Đây vẫn là canonical vi_da_quyen thuộc Quyền, không đổi nhánh vì feedback đặt dưới tiêu đề Đao |
| Như Lai Niết Bàn |8 đợt chưởng cách220ms, nhiều bàn tay cùng xuất hiện và bay thêm105 đơn vị; intro/glide/impact/outro độc lập. Body cast cũ lặp với timing fit để thấy liên tục ấn chưởng; bản diễn dài3,15s |
| Thiếu Lâm Đao A | Đao khí dịch ra trước; khoảng tới pixel đầu xa nhất bằng1,2 lần baseline đo từ opaque bounds. Không scale actor hoặc thay vùng trúng đòn |
| Võ Đang Quyền | Component r2 sửa chiều cong theo facing, root gắn điểm cuối từng nắm đấm. Wave nhỏ→lớn rồi tan, dịch ra55 đơn vị trong360ms. Vẫn một A một đòn |
| Nhân Kiếm Hợp Nhất | Nhân vật fade rời chỗ cũ ở2,290s, ẩn tại2,370s, xuất hiện cạnh kiếm ở2,455s rồi hiện đủ tại2,620s. Kiếm giữ nguyên endpoint trong hold1,5s, không cộng vị trí caster lần thứ hai. Timing/teleport ở đây chỉ là minh hoạ mỹ thuật |
| Liệt Phong Đao | Slash tăng visible reach1,4×; thêm PNG vỡ đất nguyên gốc, root28 đơn vị phía trước feet, phát ở1,350s khi đao chạm đất. Ground dưới actor; ending alpha tan trong160ms |
| Bách Liệt Thiên Kích |9 đợt đao khí riêng cách200ms, cùng tiến ra100 đơn vị; flurry nhân vật kéo dài, bản diễn3,2s |
| Kháng Long Hữu Hối | Bay200 thay vì125 đơn vị, thời gian bay850 thay vì1050ms: xa1,6×, tốc độ trình bày khoảng1,98×. Vùng đốt vẫn bám owner |

Thông số có thể cấu hình nằm riêng tại `feedback-r2.js`; contract máy đọc ở `feedback-r2-handoff.json`. Bên tích hợp sau phải lấy chuyển động/timing/lifetime thực từ state được server xác nhận, không biến các số preview thành gameplay mặc định.

Hai component mới:

- `m3d_vo_dang_sonic_vfx_r2`:44 frame /8 clip, canvas384×384, pivot192,192, bốn facing,55ms/source cel; viewer fit thành360ms/đợt. Tái xuất từ source white_basic_vfx nguyên gốc với chiều xoay đúng, root trái trước khi xoay và scale giữ chi tiết. Thay thế các tag wave cũ trong bản diễn; sword_qi cũ giữ nguyên. Wave cũ được bảo tồn để đối chiếu, không nên chọn lại khi tích hợp r2.
- `m3d_liet_phong_ground_vfx_r2`:20 frame /4 clip, canvas512×384, pivot256,192, bốn facing; frame durations55/65/85/100/160ms, không loop. Nguồn mới `source/generated/liet_phong_ground_r2.png`, tạo bằng built-in image_gen; prompt/timing/hash trong generation_records và ground_r2_generation_record. Chọn5 cel đầy đủ; ô cuối source thiếu clearance/tan thích hợp được giữ trong raw nhưng không gán vào atlas. Không lấy map/concept làm effect. Motion/ending alpha do code sau điều khiển, không bake quãng bay vào PNG.

File mới và cập nhật chỉ ở gói output: `feedback-r2.js`, `feedback-r2-handoff.json`, hai thư mục exported r2, hai source Aseprite r2, PNG nguồn ground, metadata recipe/provenance/CSV/inventory, plans/renderer preview, kiểm tra và PNG r2. Không overwrite16 source/atlas cũ. Hash cũ được đối chiếu với `source/revisions/before_feedback_r2/artifact_hashes.json`; không có thay đổi. Bản code/PNG/report trước feedback được giữ trong source/revisions và previews/history/before_feedback_r2.

Kiểm tra thực chạy sau feedback:

- Asset validator:917 frame /255 clip PASS, RGBA/alpha/bounds/order/atlas equality/pivot; hai component r2 được xuất bằng Aseprite.
- Inspector browser:12 clip mới PASS; giữ kết quả243 clip cũ không đổi. Report phân biệt retained/focused, không tuyên bố chạy lại toàn bộ frame cũ.
- Preview nhân vật:17 bản diễn live,136 tổ hợp preset/hướng/zoom PASS (khoảng47,8s). Kiểm tra riêng cả4 facing:32 travel, Vi Đà1,3×, Đao1,2×,8 chưởng, sóng đúng component và nối đầu nắm đấm, blink thật sự đổi vị trí/ẩn-hiện, kiếm hold tĩnh, ground contact,9 đợt đao khí, rồng200/850; cleanup và A không repeat đều PASS.
- PNG mới: `previews/performance_r2_*.png`, có ảnh trước/ẩn/sau blink, wave đã sửa, multi-palm, ground-break và blade barrage. Đã mở các ảnh kiểm tra. Không có video/GIF/trace.
- Các hash asset đã duyệt vẫn được guard; không chạy check:final/game production vì phạm vi vẫn là output art và preview riêng. Live Phaser/integration/director approval vẫn pending.

Xuất lại contract sau thay đổi thông số:

```powershell
node assets/m3d-feedback-visual/source/tools/export-feedback-r2.mjs
```


## Director duyệt visual r2 — 2026-11-02

Lời duyệt nguyên văn trong chat: **“duyệt visual”**. Đã ghi vào `assets/m3d-feedback-visual/director_approval_r2.json`; file `approved_visual_r2.lock.json` khóa1.004 file art/source/container/choreography/reference/evidence liên quan. Phê duyệt áp dụng cho sprite/VFX/icon r2 và cách trình bày được chọn, không thay đổi bản quyền hay gameplay.

Danh sách tag/frame trong lock là phạm vi có thẩm quyền: có18 component container, nhưng các wave cũ sai chiều, tag full-sequence tiện preview không dùng, cels raw bị loại và animation không liên quan trong atlas tham chiếu không được tự duyệt theo. Việc hash toàn bộ một atlas/source/reference chỉ bảo vệ container byte; không mở rộng phê duyệt sang tag/cel ngoài selection. Dash icon thuộc gói visual đã bàn giao được ghi riêng vào selection.

- `visualApproved=true`, `directorApproved=true` cho phạm vi được chọn.
- `productionIntegrated=false`, `phaserProductionVerified=false`, `runtimeDirectorApproved=false`.
- Source/export manifests, per-component flags, provenance và report cũ là snapshot lịch sử. Đọc register+lock trước khi kết luận trạng thái duyệt hiện tại. `previews/handoff_summary.json` phản ánh trạng thái visual-approved hiện hành.
- Nhãn viewer đã đổi thành VISUAL R2 ĐÃ DUYỆT · CHỜ TÍCH HỢP PHASER; PNG/evidence đã xem giữ nguyên byte và nhãn lịch sử của chúng.
- Không regenerate/export lại PNG hoặc Aseprite khi ghi duyệt. Không thay approved locks có sẵn ngoài gói này.
- Exporter từ chối ghi đè component đã khóa trước khi ghi file; sửa art sau này cần revision/ID và phê duyệt riêng. `finish.py` nhận biết approval: kiểm hash và cập nhật summary/inventory, giữ nguyên art/manifest lịch sử đã pin.

Kiểm tra approval-only:

```powershell
node assets/m3d-feedback-visual/source/tools/record-approval.mjs --verify
node assets/m3d-feedback-visual/source/tools/test-performance.mjs <checkout-có-dependencies> --approval-only
python -X utf8 assets/m3d-feedback-visual/source/tools/finish.py
```

Không chạy lại suite game hoặc toàn bộ playback chỉ để ghi approval. Session tích hợp thứ ba cần kiểm lock, merge hai commit đã chốt, bind vào state/events thật của tech rồi kiểm Phaser/multiplayer/normal gameplay zoom. Approval visual này không tự xác nhận kết quả runtime hoặc đóng gate ART-01 của toàn cảnh môi trường.
