# Kế hoạch improvement M4D — 2026-11-25

## Trạng thái và baseline

- Worktree: `C:/Users/ADMIN/.codex/worktrees/milestone-m4d/volam-hero-defense`.
- Nhánh `milestone/m4d`, tạo từ `milestone/m3d` tại `646657ff717bf6d829c460e78628c45902fade78`.
- Đã chuyển sang tích hợp theo yêu cầu sau khi người dùng chọn DH-B/TD-B/TH-B. Xem [bản triển khai](M4D_IMPLEMENTATION.md) để biết trạng thái thực và kiểm chứng.
- Các quyết định dưới đây được người dùng chốt trong chat ngày 2026-11-25. Người dùng đã chọn DH-B/TD-B/TH-B; đã tích hợp. Bản chỉnh theo feedback nằm ở M4D_ARENA_REVIEW_R2.md; art cuối vẫn chờ duyệt trong game.
- Kế thừa M3D, không khởi động lại milestone và không gộp inventory-v2 migration.

## Quyết định gameplay đã chốt

1. Mỗi cổng wave creep sinh hai hàng song song, gấp đôi số creep. Giữ luật chọn 2/3/4 cổng và scaling theo người chơi. Hai hàng là vị trí sinh tách nhau theo phương vuông góc hướng vào sân; không biến thành hai quái chồng vị trí.
2. Chu kỳ bắt đầu wave 180 → 120 giây. Giữ đợt stream 60 giây vì chưa có yêu cầu đổi. Giữ tổng EXP/vàng mỗi wave, chia lại theo số creep thực sinh. Boss giữ mốc wave cũ. Ngưỡng chapter theo thời gian của dungeon 900 → 600 giây.
3. Arena hiện tại mang tên Đào Hoa Đảo; thêm Tương Dương ban đêm chiến tranh và Tụ Hiền Trang hồ sen. Giữ kích thước/vị trí chức năng và luật trận chung ở mức có thể. Quyết định sau cùng: nước Tụ Hiền Trang chặn di chuyển, bốn cầu nối đảo giữa hồ, nên collision/navigation của map này là ngoại lệ riêng.
4. Chủ phòng chọn arena khi tạo phòng. Server kiểm tra ID và đồng bộ lựa chọn cho mọi client, late join và reconnect. Mặc định Đào Hoa Đảo; người chơi trong cùng room nhìn cùng arena.
5. Wave-boss encounter ẩn cả tượng lẫn hai đèn cạnh tượng; khôi phục khi trở lại arena thường.
6. Wave boss và dungeon boss chờ bị gây sát thương hợp lệ. Một người đánh mở giao chiến cả đội. Trước đó không đánh, cast, triệu hồi hoặc chạy hiểm họa riêng của boss. Mỗi attempt/retry trở về chờ. Phải bao quát cả giai đoạn đệ tử Kim Luân và các controller riêng.
7. Sửa creep death sprite to và mờ hơn lúc sống. Phải tái hiện trước, kiểm tra atlas/action fallback, body size, pivot và alpha; chưa kết luận nguyên nhân từ phản ánh.
8. Cho phép Shift lướt thoát hố cát sa mạc. Vẫn giữ luật stun/root, biên bản đồ và collision khác.
9. Bỏ chữ trạng thái dưới tên nhân vật. Thay bằng body reaction/VFX và dấu hiệu phía trên đầu, nhận trạng thái/thời hạn từ server.
10. Xóa kỹ năng giày chủ động và nút Z trong input, HUD, tooltip, hướng dẫn và protocol/handler. Giày ghép có ba nhánh thụ động:
    - Thanh Tâm: nhận debuff đầu tiên khi sẵn sàng → tự xóa các debuff thông thường đang có, gồm choáng. Cooldown 30 giây. Không thêm miễn nhiễm và không xóa cơ chế riêng boss.
    - Tốc hành: +2 charge Shift tối đa, giữ hồi tuần tự 8 giây/charge, cộng dồn nội tại Đường Môn Ám Khí (thường 2→4; Ám Khí 4→6).
    - Phùng Xuân: xác suất 10% khi một lần nhận sát thương thực tế >5% HP tối đa; hồi 10% HP tối đa, cooldown 30 giây chỉ khi kích hoạt thành công. Không hồi sinh từ hit đã gây chết. RNG server, giới hạn max HP.
    - Giữ giá/nguyên liệu/chỉ số giày hiện có; thay nhánh và cơ chế trong phạm vi này. Cooldown và charge debt không được reset bằng travel/death/reconnect/crafting.

## Artwork phải xem trước

[Bảng concept và prompt](../assets/concepts/arenas/m4d/README.md).

| Arena | Option A | Option B |
| --- | --- | --- |
| Đào Hoa Đảo | DH-A: sáng trong, nước xanh, đào hồng, thác nhỏ | DH-B: chiều ấm, vườn đá, đào đậm và đèn |
| Tương Dương | TD-A: trăng lạnh, thành bị vây, lửa ở rìa | TD-B: ánh lửa đỏ, thành cháy và nền đá phản sáng |
| Tụ Hiền Trang | TH-A: ban ngày, sen hồng, cầu đá sáng | TH-B: đêm xanh, cầu gỗ đỏ và đèn ấm |

Ảnh là concept original tạo bằng built-in image_gen (art_source: host_image). Chưa phải asset runtime, không lấy toàn cảnh làm một ảnh nền giả collision. Các vị trí prop, tỷ lệ và camera trong concept phải chuẩn hóa lại theo world/camera M3D trước sản xuất. TD v01 bị thay bởi v02 do góc camera quá thấp.

Điểm duyệt 1: chọn A/B hoặc phối chi tiết cho mỗi arena.
Điểm duyệt 2: một lát cắt đại diện trong Phaser ở zoom thường, có hero/creep và hai hàng tại cổng; với Tụ Hiền Trang phải có cầu, bờ, nước và đường đi thật.
Điểm duyệt 3: bản arena hoàn chỉnh trong game trước khi gọi art hoàn tất. Tuân theo AGENTS.md và ART_PRODUCTION_STANDARD.md, không suy diễn duyệt từ ảnh concept hoặc test pass.

## Brainstorm trạng thái — đề xuất visual, chưa duyệt art

Đối chiếu StatusKind, status.ts và controlLabels của ArenaScene; không thêm gameplay status chỉ để có visual.

| Hiệu ứng hiện có | Visual đề xuất |
| --- | --- |
| Choáng (stun) | Body pose choáng khi có art phù hợp; 3 sao vàng quay phía trên đầu, nhịp ngắn, silhouette rõ |
| Chậm di chuyển (slow) | Dấu chân nặng nhỏ trên đầu; vài vệt níu chân xanh xám, tránh giống đóng băng |
| Định thân (root) | Vòng dây/rễ hoặc xích ôm cổ chân; icon nút thắt trên đầu |
| Câm lặng (silence) | Lá bùa niêm âm với nét gạch, hơi rung phía trên đầu |
| Tước vũ khí (disarm) | Hai vũ khí nhỏ bị gạch chéo; tắt lớp vũ khí khi bộ pose hỗ trợ |
| Chậm đánh (attack_slow) | Icon lưỡi kiếm kèm đồng hồ cát, nhịp tối chậm |
| Giảm công (attack_break) | Kiếm nứt đỏ sẫm, mũi tên xuống nhỏ |
| Giảm thủ (defense_break) | Khiên nứt cam, tia mảnh ở thân; tái dùng Phá Giáp đã có nếu khớp |
| Độc (poison) | Giọt độc tím/xanh lục trên đầu, bong bóng độc rời rạc sát thân |
| Đốt (burn) | Icon ngọn lửa trên đầu, tàn lửa nhỏ ở vai/chân; không che cả người |
| Khóa lướt (dash_lock) | Icon đôi cánh bị khóa; phân biệt với định thân vì vẫn có thể đi |
| Hất/kéo/đẩy và hố cát | Pose/độ lệch thực tế, bụi/cát hoặc vệt lực theo hướng; không treo icon lâu hơn trạng thái thật |
| Vận công (channel), trạng thái lướt (dash) | Pose hiện có và vòng khí/afterimage theo hành động; không treo như debuff |
| Hộ thuẫn, giảm thương, tăng thủ, kháng gián đoạn | Vòng hộ thể mỏng và dấu khiên; phân biệt hiệu ứng đã có, không vẽ chồng |
| Tăng công/chí mạng/tốc/chạy/hồi chiêu/hồi HP-MP, aura | Tia khí hoặc một nhịp phát sáng khi bắt đầu, icon nhỏ khi cần; không thêm hào quang liên tục cho mọi buff |
| Tụ lực, phản đòn/hộ phản, vận may, ẩn thân | Tái dùng visual phái tương ứng, biểu tượng kích hoạt ngắn; không lộ người đang concealed cho đối thủ |
| Mark/aura Ngũ Độc, Côn Luân, bay/mai/né Đường Môn và stance riêng | Giữ/tái dùng VFX đã có, đối chiếu từng ID trước khi bổ sung để tránh trùng |

Đề xuất ưu tiên: choáng > định thân > câm lặng > tước vũ khí > khóa lướt > chậm; hiển thị tối đa ba dấu trên đầu, gộp cùng loại, dấu còn lại thành icon nhỏ. Độc/đốt giữ VFX nhẹ trên thân. Tên nhân vật giữ riêng; không đẩy thanh HP và icon vào nhau. Cleanup đúng lúc dispel/hết hạn/death/travel/reconnect; kiểm tra sáu người và khi nhiều trạng thái đồng thời. Một mẫu choáng + slow + poison cần duyệt trước khi mở rộng bộ art.

## Thứ tự công việc

1. **M4D-A — Chọn concept**: chọn một hướng cho mỗi arena; duyệt quy ước status VFX. Lưu prompt, PNG, provenance và bản cũ.
2. **M4D-B — Tái hiện và khóa regression**: creep death scale/alpha; hố cát từ input thật; boss hiện tự aggro; cảnh boss còn hai đèn. Kiểm tra version Phaser/Colyseus trước sửa và dùng skill tương ứng khi triển khai.
3. **M4D-C — Creep và nhịp trận**: đổi cadence/count/lane offset, cập nhật actual spawn reward budget, chapter 600 giây; test 2/3/4 cổng, 1/2/6 người, pause/resume, pending stream, tượng và mốc boss. Đo creep mỗi giây, HP tượng, progression và CPU/network.
4. **M4D-D — Boss và mobility**: dùng trạng thái giao chiến server cho mọi controller; test summon/hazard/timers, first hit, cả đội, retry/death/travel/reconnect. Ẩn/hiện cả cụm tượng + đèn. Cho Shift ra hố cát, giữ CC/collision khác.
5. **M4D-E — Giày thụ động**: catalogue/recipe/UI + ba nhánh, bỏ Z end-to-end; proc server trong status/damage pipeline; meaningful tests cho cleanse cùng tick, stun, DOT, ngưỡng >5%, RNG 10%, lethal, cooldown 30s và debt qua thay đổi trạng thái. Tốc hành phải test schema cũ giới hạn charge, Đường Môn, recharge tuần tự và HUD.
6. **M4D-F — Arena registry và lobby**: stable IDs dao_hoa_dao/tuong_duong/tu_hien_trang; server-owned selection, metadata/lobby/room creation/late join, preload chỉ asset cần thiết; geometry chung và map-specific collision/navigation. Nước chặn đi phải do server, không chỉ client.
7. **M4D-G — Sản xuất art được chọn**: làm một lát cắt mỗi hướng, import vào Phaser và duyệt zoom thường; sau đó tách ground/props/canopy/water/bridge/fire/smoke/lighting, pivots/Y-depth/alpha/manifest. Không che hai hàng quái, tâm chiến đấu hoặc telegraph boss. Chưa coi bộ lantern trong concept là luật thêm đèn lúc boss.
8. **M4D-H — Status presentation**: module VFX riêng khỏi ArenaScene, bỏ controlLabels dưới tên, reuse atlas/pose hiện có; một đại diện trước bộ đầy đủ.
9. **M4D-I — Kiểm chứng bàn giao**: focused deterministic tests + combat-balance-test cho thay đổi cadence/economy/proc; game-playtest có server acknowledgement; preflight trước QA, sau thay đổi cuối chạy check:final một lần với profile liên quan; 2-client authority và 6-client readability/performance. Chỉ PNG và quan sát frame/event, không tạo video.
10. Cập nhật spec/acceptance/decision cho hành vi thực đã triển khai; ghi phần còn prototype/chờ duyệt, lệnh thực chạy và giới hạn.

## Điểm kỹ thuật cần giữ rõ

- Mật độ xuất hiện theo thời gian khoảng 3 lần baseline (2 lần số mỗi wave × 1,5 lần wave/phút); thưởng mỗi creep khoảng một nửa nhưng thưởng/phút có thể tăng 50% khi dọn hết. Không tự đổi giá hoặc sức mạnh quái để bù.
- Boss theo số wave tới sớm hơn; dungeon floor 10 phút đã được người dùng chốt.
- Hồ sen có collision riêng; pathfinding creep hai hàng, route qua bốn cầu và destination Shift phải được kiểm tra. Mặc định đề xuất projectile thẳng bay qua nước nếu không gặp vật chắn, không tự thêm luật nước chặn projectile.
- Boss nhận hit hợp lệ, không dùng client click/target selection làm trigger. Hazard môi trường độc lập cần phân biệt với hazard do boss sinh.
- Thanh Tâm cần whitelist debuff rõ ràng; không xóa dấu/khóa của scripted boss mechanic chỉ vì cùng được render như trạng thái.
- Khoảng cách lane, màu/icon status, tỷ lệ art còn là tuning/đề xuất cần xem trong game.

## Context đã đọc và phạm vi kiểm tra turn này

AGENTS.md, campaign override, các phần liên quan của DECISIONS/M3D memory/architecture/content/combat/balancing/game design/items, UI/art docs và reference index; actual central hub reference, approved arena preview và atlas scenery. Source chính: invasion-config.ts, invasions.ts, arena.ts, arena-art01.ts, ArenaScene, types/status/mobility/equipment-combat/economy/campaign.

Đã xác nhận HEAD hai nhánh trùng baseline trước thay đổi; chưa chỉnh gameplay và chưa chạy build/test/browser. Chỉ kiểm tra metadata, PNG/hash/link cho tài liệu/concept ở bước này.


## Artwork override — 2026-11-25

Người dùng yêu cầu bỏ hình quầy shop và cổng phó bản khỏi cả sáu option concept arena. Các bản hiện hành là Đào Hoa Đảo v02, Tương Dương v03 và Tụ Hiền Trang v02; bản cũ giữ làm lịch sử. Yêu cầu chỉ áp dụng artwork, không xóa chức năng shop/phó bản trong gameplay. Prompt và hash nằm ở assets/concepts/arenas/m4d/generation-remove-shop-portals-v01.json.

## Concept selection — 2026-11-25

Người dùng chọn DH-B, TD-B và TH-B từ các bản bỏ shop/cổng phó bản, yêu cầu tích hợp toàn bộ improvement ban đầu, tách lớp/shading và chỉ kiểm tra phần cần thiết. Final art trong game chưa được coi là duyệt chỉ vì concept đã chọn.
