# Quan sát art tĩnh — Bổng combo v2

Trạng thái: **PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW**. Đã mở trực tiếp PNG sau export và so với atlas/reference thật. Đây là quan sát từng pose/contact sheet, không phải claim đã xem motion trong Phaser.

| Hạng mục | Quan sát trên file xuất |
|---|---|
| Nhân vật/trang phục | Giữ cùng nhân vật tóc buộc/ribbon đỏ, áo đỏ cổ sáng, belt/pants/boots sẫm. Palette chung192 màu từ baseline. Bản mất màu đỏ đã bị loại; bản hiện tại giữ đỏ ở cả front/back/side. |
| Bốn đòn | Thrust co–đẩy–rút; sweep có vai/hông quay và shaft qua eo; rising thấp→cao; overhead hai tay cao→bổ thấp. Chúng không dùng cùng idle trượt hoặc một pose xoay làm cả animation. |
| Bốn hướng | Front/back vẽ riêng, up không lộ mặt; side trái mirror phải được công khai. Các hướng cùng mật độ/body~44 logical px; pose cúi thấp có nén thân chủ đích. |
| Vũ khí/bàn tay | Một bổng gỗ liền; hai tay giữ, có che khuất theo hướng. Bản thrust đã sửa để thấy shaft phía sau. Độ dài chiếu vẫn đổi theo góc/foreshortening: cần đặc biệt xem contact thrust bên và up-facing slam lúc playback trong Phaser; không coi kiểm tra tĩnh là chứng nhận chiều dài vật lý tuyệt đối. |
| Pivot | Foot anchor metadata cố định(56,80), origin(0.5,0.8), scale1; source dùng phép đo giày và override tránh nhầm đầu bổng. Marker cyan chỉ là annotation review. Foot sliding ở tốc độ game chưa được kiểm chứng. |
| Nối đòn |16 handoff cel khớp chính xác pixel với anticipation kế tiếp. Đây là kiểm tra seam, chưa chứng minh toàn bộ easing/cadence khi nhận event mạng. |
| VFX riêng | Source/PNG/atlas riêng. Thrust needle, sweep ellipse, rising hook, slam crack khác silhouette; ending thưa. Giảm scale cố định mỗi beat để tránh che người; canvas 160là padding, không hitbox. |
| Scale/mockup | Review1×/2× nearest từ chính frame xuất. Gameplay background giữ pixel cũ; bốn sprite/vfx minh họa được thêm tĩnh. Không imagegen vẽ lại scene hoặc đổi camera game. |

## Những gì chưa chứng minh

Chưa load vào Phaser; chưa quan sát live playback, chuyển trạng thái movement/attack/cancel, bổng/tay ở mọi thời điểm thực, foot depth/occlusion, event contact alignment, camera interpolation hoặc six-player density. Không kiểm tra server damage/cooldown/targeting vì không sửa game logic. Không có recording.

Candidate hoàn chỉnh về bộ file để tích hợp thử; **chưa là final runtime artwork**. Cần kiểm tra các điểm trên trước final approval và trước bulk sản xuất bộ tiếp theo.
