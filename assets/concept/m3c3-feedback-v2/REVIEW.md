# Rà soát concept v2

**CONCEPT_PENDING_REVIEW — chưa duyệt production.** Đây là ghi nhận quan sát ảnh thật đã tạo, không phải báo cáo Phaser PASS.

## Những gì đã kiểm tra

Đã mở trực tiếp positive/anti references, atlas8 style, các sheet concept mới và cả4 bản review1280×720. Key pose được thể hiện bằng t0→t1→t2; bảng STORYBOARDS tách rõ body/weapon choreography khỏi VFX. Đã kiểm kê87 component retained và chụp hash2765 file thuộc8 lock để bảo vệ art cũ.

PNG gameplay gốc: `docs/evidence/m3c3/six-player-combat-1280.png`. Bản copy `reference_actual_gameplay_1280.png` phải bằng hash; đó là screenshot thật **lịch sử**, không phải ảnh chạy game mới của lượt này. Bốn mockup là imagegen compositing từ ảnh ấy và sheet thiết kế, có nhãn concept; không xác nhận runtime mới.

## Quan sát theo bộ

| Bộ | Đọc được trên sheet / mockup | Điểm cần director xem hoặc chỉnh trước production |
|---|---|---|
| Cái Bang | Bổng phân biệt chọc, quét ngang, hất chéo, bổ xuống; A6 có đầu rồng nhỏ; Hỏa Vân đúng3 tia; ultimate một thân rồng dài; staff skill có vòng/ground crack/claw/dash/chó lửa. | Bản rồng lớn ban đầu che HUD, đã giữ nháp và làm r2 nhỏ hơn. R2 chừa HUD nhưng đuôi còn quấn che caster và đầu nhìn hơi ngang khi lane đi lên; cần vẽ facing-up và thu tail trong production. Bổng nhịp4 phải giữ chiều dài shaft/grip ở từng frame. |
| Thiên Sơn | Boomerang có tay trống/catch, return arrow trở lại; storm8 hướng; Liên Hoa kéo dài; spin mantle, buff knot, crossing contact; dao tàn ảnh/twin waves/terminalX. | Mockup có cả fan ở tay, các vị trí ghost và fan đang bay: chỉ8 emission trong ultimate, không suy số projectile từ toàn ảnh. Cyan trên foliage tương phản tốt; cần tinh gọn ribbon ở tâm và bảo đảm một quạt vật lý của A không nhân đôi qua frame. |
| Võ Đang | Quyền trái/phải; Yin-Yang glyph; Huyền Âm dark-core; Dương Khí hand silhouette; shield on/loop/absorb/off/empty; biên trận inward; sword nối2 cuts. | Trận pháp mockup vẫn lớn hơn footprint được prompt yêu cầu, chỉ là đề xuất art; cần giảm glyph density và duyệt tỷ lệ riêng. Sửa chú thích “five fingers + thumb” của ảnh07 khi vẽ source: **tổng5 ngón gồm ngón cái**. Cần phân biệt off/unthread với mana-empty/fracture bằng chuyển động thật. |
| Thiếu Lâm | La Hán=fist gọn; Vi Đà=pillar đứng; Đại Lực=palm rộng; cả3 normal/empowered; A trái/phải, dao nặng, Tru Tà rộng, recovery motes nhỏ. | Đừng nhân bản silhouette người/deity; empowered là lớp năng lượng. Các bàn tay năng lượng cần anatomy cleanup5 ngón. Fist/pillar/palm phải vẫn khác nhau tại44 px body và dưới chồng VFX6 người; ảnh phóng lớn chưa chứng minh điều đó. |

Sheet có composite body+VFX tại một số contact và cột VFX nghiên cứu riêng. Chưa có source semantic layer/alpha animation của art mới; production phải vẽ/tách đúng, không trích ô concept thành runtime frames. Các arrow/ghost-zone/scale guide là annotation, không hitbox.

## Bản sửa được chọn

- `04_cai_bang_staff_skills_r2.png`: thay đầu rồng ở Cầm Long bằng móng dài, retract arrows vào caster. Nháp 04 giữ lại, không đưa ra duyệt làm bản chính.
- `08_vo_dang_mana_formation_sword_r2.png`: địch ở trong cố thoát, hooks/mũi tên vào tâm. Nháp 08 trước đó giống chặn địch từ ngoài, không dùng làm hướng chính.
- `11_cai_bang_gameplay_mockup_r2.png`: rồng giảm footprint/chừa topHUD. Nháp 11 giữ lại, không dùng làm preview chính.

## Normal-size preview: giới hạn cụ thể

Generator trả 1672×941 dù yêu cầu1280×720. Đã dùng **Aseprite1.3.18.6-x64** batch export thu **toàn khung** với factor `0.7655502392344498`, tạo đúng 1280×720. Không crop concept thành sprites, không upscale concept làm runtime art, không đổi zoom game.

Mở4 file `*_review_1280.png` tại100% để xem density và phân cấp với HUD/party. Đây là **khung review cùng kích thước screenshot gốc**, không phải composite pixel-exact: generator đã redraw nhẹ cả nhân vật, vị trí, nền và chữ HUD. Không dùng mockup để ký duyệt body height, pivot, font text, damage/range, camera projection chính xác hoặc performance. Nguồn gameplay nguyên byte được để cạnh để thấy sai biệt. Screenshot gốc ghi nhận normal camera của lần kiểm tra trước; lượt này không khởi chạy Phaser.

## Provenance

Tạo original AI-assisted raster bằng **OpenAI built-in image_gen.imagegen**, không CLI fallback/API key, không third-party sprite pack, không claim độc quyền bản quyền hay human hand-pixelled authorship. Director-supplied concept references chỉ hướng thiết kế; quyền sở hữu reference bên thứ ba chưa được xác minh. Không đưa reference hoặc concept vào runtime.

Prompt đầy đủ theo từng lần ở `generation_prompts.json`; generator filename và saved PNG ở `generation_records.json`; manifest ghi hash/dimensions/status. Path reference trong JSON được chuẩn hóa tương đối với root repo; tool call đã resolve chính các file đó.

## Validation scope

Chỉ kiểm tra file PNG decode/dimensions/single-frame, JSON parse/schema liên quan, local links, bao phủ34 đề xuất, hash ảnh gốc và protected snapshots. Xem `validation.json` cho kết quả thực đo cuối cùng. Không chạy `pnpm check:final`, typecheck, unit/integration hoặc browser suite: nhánh này không thay runtime/code/data và không có animation mới để kiểm tra trong Phaser. Không lấy kết quả test lịch sử làm kết quả của lượt concept.

Sau concept approval mới production; sau integration phải kiểm tra frame/timing/facing/pivot/transition và normal-zoom6 player readability thực, rồi director final-art approval riêng. Không kế thừa waiver cũ. Không GIF/video.
