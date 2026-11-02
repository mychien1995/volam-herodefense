# Tích hợp Tây Độc feedback03 vào game Phaser

Thực hiện duy nhất encounter Tây Độc trên branch/worktree `wip/m3d/tay-doc`. Đây là yêu cầu tích hợp gameplay khi prompt này được giao thực hiện. Không merge, push, deploy hoặc mở rộng sang boss/milestone khác.

## Đọc và giữ đúng bản đã duyệt

Đọc AGENTS.md, DECISIONS.md, GAME_DESIGN.md, CONTENT_DATA.md, COMBAT_SYSTEM.md, ART_ASSET_GUIDE.md, ART_PRODUCTION_STANDARD.md, UI_UX_SPEC.md, TECHNICAL_ARCHITECTURE.md và docs/DEVELOPMENT_WORKFLOW.md; xem reference thực tế theo AGENTS.md. Dùng skill colyseus, pixel-art-pipeline, game-playtest và combat-balance-test cho phần liên quan. Kiểm tra phiên bản cài đặt và official docs trước khi dùng API.

Director đã duyệt **thiết kế/animation/VFX và choreography feedback03**, không phải gameplay runtime hoặc balance HP/damage. Nguồn:
- `assets/reviews/tay_doc_v02/director_approval.json`: phạm vi duyệt, SHA256 và những giới hạn còn tồn tại.
- `assets/reviews/tay_doc_v02/review_contract.json`, `README.md`, `packages.json`.
- `assets/reviews/tay_doc_v02/feedback03/tuning.json`: thông số trình diễn cuối, thay thế feedback01/02 tại nơi có khác biệt.
- Demo `http://127.0.0.1:5397/?revision=feedback03`, mở bằng `node assets/reviews/tay_doc_v02/server.mjs`.
- PNG/atlas/animations: baseline `assets/sprites/bosses/main/tay-doc/`, VFX `assets/effects/bosses/main/tay-doc/`, bổ sung `cap_mo_v02/`, `actions_v02/`, `effects_v02/`, `feedback01/snakes_8/`, `feedback01/staff_180/` dưới thư mục review.

Giữ nguyên byte artwork đã duyệt; xây prepare/copy/loader và guard hash từ nguồn retained. Không chạy generator/export hàng loạt, không thay ngoại hình, không dùng concept collage làm atlas. Baseline/transition có4hướng; các pose mới crawl/hop/exhale/sweep/palm chỉ có hướng phải. Audit từng hướng trước khi tích hợp: dùng cel đúng hướng có sẵn khi phù hợp; nếu thiếu thì hoàn thiện đúng nhóm pose/hướng còn thiếu, giữ thiết kế đã duyệt và lưu candidate riêng. Không xoay cả nhân vật/cọc để giả hướng, không gọi alias hay cel v01 bị cắt trượng/tay là animation hoàn chỉnh. Không xem mọi cel trong gallery lịch sử là đã được duyệt riêng.

## Encounter và luật đã chốt

- Wave boss trong **arena chính hiện có**, không tạo arena, dungeon card, portal hay instance riêng.
- Tây Độc đi từ tây vào đúng giữa đường gạch: worldY616 theo bản arena đang duyệt. Không dùng tọa độ màn hình356 hoặc vị trí demo làm world spawn/AI. Spawn/pathfinding/collision do server quyết định.
- Chỉ aggro/đánh người chơi sống cùng arena, kể cả projectile, AoE, poison và cọc rắn; không đánh tượng.
- Gắn gate đúng wave10 đã clear + short rest, trong thứ tự Đông Tà→Tây Độc→Nam Đế→Bắc Cái. Lịch invasion180s vẫn chạy độc lập, không chờ boss. Nếu framework chapter boss còn thiếu, chỉ thêm hook/gate tối thiểu và test cho Tây Độc; không giả đã giết Đông Tà hay tự tích hợp các boss khác. Có fixture DEV/QA riêng để gọi encounter nhanh, không rút ngắn production clock.
- Thưởng gold/XP theo pool/eligibility hiện hành, một lần; không item/loot roll vì đây là invasion boss. Không áp dụng cơ chế boss dungeon respawn/reset30s vào encounter này.
- Phase2 chỉ kích hoạt một lần khi HP **<50%**, không tại đúng50%. Cùng người luyện Cáp Mô, bò thấp như cóc, không biến thành con cóc thật; chạy nhanh hơn, đánh mạnh hơn.
- Phase2 chỉ dùng bộ Cáp Mô mới. **Cọc rắn/bãi độc đã tạo vẫn tồn tại tới khi bị phá/hết hạn**, không tự xóa khi chuyển phase.
- Khi boss chết, match kết thúc hoặc room bị hủy: cleanup toàn bộ entity/status do encounter sở hữu, không để sát thương hay phần thưởng lặp. Khi không có mục tiêu hợp lệ, không chuyển sang đánh tượng. Policy death/disconnect/travel/respawn của người mang dấu phải được mô tả rõ, bảo đảm không đánh xuyên zone, không nổ trên người vừa respawn hay nhân đôi damage.

## Các đòn phải có đầy đủ authority và hình ảnh

**Phase1**
1. Quẹt trượng: một hình quạt **180° phía trước**, warning/VFX khớp pivot và hướng, radius160 world units theo scale demo; không đánh phía sau, tối đa một hit/target/cast.
2. Độc khí: bắn từ trượng, khóa vector lúc release và bay thẳng.
3. **Vạn Độc Phi Châm**: warning cone trước khi bắn nhiều kim; trúng gây slow + poison DoT.
4. **Độc Vụ Mê Hồn**:8bãi độc lớn, warning trước; người đi vào bị slow + poison DoT. Dùng seeded world positions hợp lệ, không bê8tọa độ viewport demo thành gameplay positions; không chặn kín mọi đường tránh.
5. **Cổ Độc Khoan Tâm**: chọn đúng1người, dấu không thể tẩy, sau countdown tự mất **25% máu tối đa**. Đây là khoản mất HP bắt buộc đã chốt, không thành25% máu hiện tại và không vô tình tính hai lần cho người bị chọn. Người này phải ra xa đồng đội. Vụ nổ chỉ gây sát thương/poison AoE cho người khác trong vùng; **không truyền dấu nổ mới, không lan dây chuyền**. Ghi rõ thời điểm lấy maxHP, tương tác defense/shield/immunity và death/travel theo rule bắt buộc này; không âm thầm giảm số25%.
6. **Hỗn Thiên Phục Long Chấn**: đúng6cọc rắn có HP, người chơi dùng combat A/QWER bình thường để phá; không phá bằng click. Đầu cọc quay8hướng với chân cố định. Mỗi cọc một tia/lần, interval tham chiếu1.35s; tia bay390units/s, vector đã release không đổi khi đầu quay. Destroy phải ngừng shot mới; cleanup projectile tồn tại theo policy rõ ràng.

**Phase2**
1. Bắn độc chưởng bay thẳng.
2. **Cáp Mô Chấn Kích**: dậm lan rộng, warning và shockwave vòng rỗng khớp bán kính **405**, gây poison + stun, không phải lane dash/lưỡi liềm.
3. **Ngũ Độc Thần Chưởng**: đứng yên nhả nhiều đợt độc360°. Projectile **130.05units/s**, range **484.5**, lifetime xấp xỉ3.72549s. Giữ16hướng/burst theo choreography đã duyệt; cho đợt cuối bay hết tầm.
4. **Vạn Độc Bạo Phát**: nhảy qua nhiều vị trí world hợp lệ; mỗi điểm đáp nhả độc360°. Projectile **218.025units/s**, range **484.5**, lifetime xấp xỉ2.22222s. Giữ3lần nhảy/16hướng tại mỗi điểm đáp của bản duyệt đầu; không nhả ở giữa không trung.

Các thông số chưa được chốt (HP, damage ngoài25%, cooldown, thời gian DoT/slow/stun, HP cọc, coefficients phase2, reward pool, policy cast interruption...) phải là **config thử nghiệm có validation**, nêu trước khi coding và đo bằng simulation. Không biến timer loop của demo thành AI/balance. Không thêm invulnerability cho boss hoặc debuff mới chỉ từ màu VFX.

## Kiến trúc và kiểm tra bắt buộc

Tái dùng combat/progression/invasion/protocol hiện có, không phá các dungeon/boss/school đã tích hợp.
- `game-data`: ID ASCII, tên Việt chính xác, geometry/timing/tuning, schema validation.
- `game-core`: seeded deterministic encounter director, phase/cast/hazards/projectiles/summons/CC/rewards; độc lập Phaser/DOM/Colyseus.
- Server/Colyseus: owns movement, aim, collision, damage/status, RNG, HP cọc, phases, spawn/gate/reward; snapshot/events scoped theo room/zone. Không nhận client-submitted damage/location/phase/loot.
- Phaser: data-driven PNG loader/registry, feet pivots/Y-depth, nearest sampling, warning dưới chân và HUD trong viewport. Render từ server state/event IDs và timestamps; animation không quyết định damage. Hình học collision là world data, không dùng alpha texture làm hitbox.

Tests phải cover: gate/clock/không đánh tượng; arc180° front-only và per-cast dedup; non-homing/swept projectiles; warning-before-damage; DoT/slow/stun tick/dedup/expiry/re-entry; đúng1dấu25%maxHP và không chain;6cọc/8hướng/nhịp bắn/phá cọc; threshold đúng50/<50, một lần, chỉ skill P2 và giữ hazard P1;3landing radial cùng speeds/ranges đã duyệt; death/disconnect/zone/room/defeat cleanup; reward một lần, zero item; inputs giả/replay không được tự tạo hit/entity.

Chạy headless balance có seed với1/6player, legal builds, báo tuning còn provisional. Browser dùng2client thật để iterate và6client thật natural combat ở normal zoom để nghiệm thu; không lấy6sprite mẫu của viewer làm bằng chứng multiplayer. Kiểm tra tất cả hướng/pose còn thiếu, chuyển phase, pivot, health bars cọc, warning/impact khớp authority, foreground/depth, input A/QWER và tương thích HUD/menu. Chỉ PNG/log/frame observations; tắt video/GIF/trace screenshot streams.

Sau thay đổi cuối chạy **`pnpm check:final --config <config Tây Độc thực tế đã tạo>`** một lần theo workflow; fixture dùng port riêng, chỉ cleanup service do task sở hữu. Báo lệnh/kết quả thực, defects và asset aliases/candidates còn tồn tại; cập nhật decision/spec/architecture/acceptance khi gameplay thật thay đổi. Không dùng kết quả standalone viewer thay cho runtime acceptance. Bàn giao game chạy được, PNG review và tài liệu integration; final runtime art approval tách riêng khỏi approval thiết kế feedback03.

