# Cái Bang Bổng combo v2 — bộ mẫu tích hợp thử

**PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW · 2026-10-31**

Concept đã được director duyệt hướng trong chat: “Tôi duyệt hướng hình ảnh của các concept vừa trình bày.” Lượt này chỉ sản xuất **Bổng A: chọc → quét → hất → bổ**, đủ down/left/right/up. Chưa tích hợp hoặc duyệt runtime. Không sửa Phaser, gameplay, combat data, runtime mapping, global manifest hoặc approval lock; chưa sản xuất các bộ khác. Không GIF/video.

## Mở để xem

- [Mockup gameplay 1280×720, display 2×](gameplay_mockup_display_2x_1280.png) — ghép **đúng pixel PNG mới**, không imagegen vẽ lại scene.
- [Mockup logical 640×360, 1×](gameplay_mockup_logical_1x_640.png).
- [So tỷ lệ baseline/v2, 2×](baseline_scale_comparison_2x.png); [bản 1×](baseline_scale_comparison_1x.png).
- [Character phải](character_contact_right_2x.png), [trái](character_contact_left_2x.png), [xuống](character_contact_down_2x.png), [lên](character_contact_up_2x.png).
- Composite native: [phải](combined_contact_right_1x.png), [trái](combined_contact_left_1x.png), [xuống](combined_contact_down_1x.png), [lên](combined_contact_up_1x.png).
- VFX riêng: [phải](vfx_contact_right_1x.png), [trái](vfx_contact_left_1x.png), [xuống](vfx_contact_down_1x.png), [lên](vfx_contact_up_1x.png).
- [Kết quả kiểm tra file](file_validation.json); [quan sát art và giới hạn](VISUAL_REVIEW.md).

Ảnh contact/mockup là **review tĩnh**, không phải screenshot art mới đang chạy trong game. [Ảnh nền gameplay thật lịch sử](reference_actual_gameplay_1280.png) được giữ nguyên byte. Mockup thêm các sprite mẫu vào vị trí minh họa, không sửa bản đồ, actor, camera hoặc HUD thật. Display 2× dùng nearest integer; bản logical 1× giữ body khoảng44 logical px.

## File bàn giao

| Thành phần | Source chỉnh sửa được | Transparent PNG + atlas JSON | Metadata |
|---|---|---|---|
| Character + bổng | [Aseprite](../../../source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_character.aseprite) | [PNG](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_character.png), [JSON](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_character.json) | [Animations](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_character.animations.json) |
| VFX riêng | [Aseprite](../../../source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_vfx.aseprite) | [PNG](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_vfx.png), [JSON](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_vfx.json) | [Animations](../../../exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/cai_bang_bong_combo_v2_vfx.animations.json) |

[Source README](../../../source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/README.md) có lệnh export và provenance. [Production manifest](../../../source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/production_manifest.json) ghi approval evidence, nguồn, hash, biến đổi và trạng thái.

Hai source là **editable raster cels thực trong Aseprite**, không phải PNG concept gắn vào layer rồi giả animation. Character/staff chung một raster layer; VFX có source/atlas riêng. Không tuyên bố đã phục hồi các layer tay/áo/weapon có ý nghĩa từ ảnh AI phẳng.

## Cấu trúc animation

Mỗi component **96 cel / 16 tag** =4 đòn ×4 hướng ×6 frame. Character có16 handoff cel cố ý trùng anticipation kế tiếp. Không gọi cả96 cel là96 pose độc nhất.

Tag: `combo_{thrust|sweep|rising|overhead}_{down|left|right|up}`.

| Frame | Thời lượng hình ảnh | Character | VFX |
|---|---:|---|---|
| 0 |40 ms|Anticipation|Anticipation nhỏ|
| 1 |40 ms|Coil/anticipation mạnh|Buildup|
| 2 |40 ms|Contact|Contact accent|
| 3 |50 ms|Follow-through|Follow-through|
| 4 |70 ms|Recovery|Decay|
| 5 |60 ms|Handoff, khớp pixel frame 0 đòn kế|Ending sparse|

300 ms/đòn;1200 ms cho vòng bốn đòn là **cadence art đề xuất**, không cooldown hay hit schedule. Tất cả tag trong metadata là one-shot, repeat 0; việc nối/chọn đòn do event/state server ở lần tích hợp quyết định. Aseprite tag đặt forward để review.

Metadata schema 2 dùng `frameDurationsMs` theo thứ tự `frames`; atlas Aseprite cũng giữ duration từng frame. Không áp một FPS đồng đều làm mất timing khác nhau. Phases, direction, origin, pivot, displayScale và VFX foot-relative offset có trong từng tag.

## Pivot và scale

| Component | Frame canvas | Pixel pivot | Normalized origin | Display scale |
|---|---|---|---|---:|
| Character |112×100|feet(56,80)|(0.5,0.8)|1|
| VFX |160×160|anchor(80,80)|(0.5,0.5)|1 + authored feet offset|

Baseline Cái Bang80×80/feet(40,64) giữ nguyên byte. Canvas v2 thêm padding, không tăng body: guard head-to-feet khoảng44 logical px. Pivot normalized giữ tương thích actor anchor hiện tại; **không dùng pivot pixel cũ (40,64) cho canvas mới**. VFX 160chứa phần đệm tránh clipping khi xuất hướng, không phải radius hay hitbox.

Character dùng scale cố định mỗi source strip/facing; không fit từng frame. Right mới vẽ; left đối xứng right như baseline Bổng hai tay; front/back vẽ riêng. VFX up/down được vẽ riêng cho ground sweep; needle thrust dùng quarter-turn đúng90° từ source right; không quay nhân vật hoặc quay ellipse ground thành mặt phẳng đứng.

## Kiểm tra đã chạy

- Aseprite1.3.18.6-x64: assemble source mới, export PNG/hash JSON, tags/slices.
- `python -u -X utf8 assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/tools/build_reviews.py`
- `python -u -X utf8 assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/tools/verify_sample.py` — PASS.
- Đã mở và nhìn trực tiếp contact bốn hướng, composite/VFX và mockup; không chỉ kiểm tra tên file.
-96 character +96 VFX: true binary alpha, không frame rỗng/chạm mép, không bleed do clip, PNG riêng bằng crop atlas; source header RGBA/canvas/frame count hợp lệ.
-16 handoff bằng pixel frame0kế tiếp; timing/phase/direction/pivot/scale nhất quán.
-Palette character192 màu lấy bằng median-cut từ baseline, không mất đỏ áo/ribbon; ít nhất232 pixel đỏ trên mỗi character frame.
-8 lock và2765 file được bảo vệ giữ nguyên hash.

Không chạy `pnpm check:final`, unit/browser game suite hoặc Phaser vì các file v2 **chưa được đăng ký/đưa vào runtime**, theo phạm vi bàn giao mẫu riêng. Không lấy static PASS làm bằng chứng motion/network/gameplay hoặc director final-art approval.

## Tích hợp thử ở lượt riêng

Load hai PNG/atlas bằng **ID v2 riêng**, lấy frame rect/tag từ JSON, giữ origin/scale theo bảng. Dùng duration từng frame, owner feet +offset cho VFX. Contact/impact/cancel phải bám authoritative event; frame 2 không được tự gây damage. Khi ngắt combo, chết hoặc chuyển zone, vòng đời theo server. Không thay texture hay byte approved baseline.

Cần kiểm tra Phaser thật: đủ4 hướng/4 đòn, tốc độ playback và recovery, bàn tay/bổng/đầu-ribbon xuyên suốt, feet/Y-depth, offset tiếp xúc, cancel/ending, scale ở zoom thường và độ rõ6 người. Chỉ sau thử tích hợp và director duyệt mới coi runtime art hoàn tất. **Dừng ở bộ mẫu này.**
