# Prompt tích hợp Đông Tà — thiết kế V04 / feedback_02 đã duyệt

Tích hợp encounter wave boss **Đông Tà** vào game Phaser/Colyseus hiện có, làm đến khi chơi được combat thật và kiểm chứng được server authority. Đây là bước triển khai từ preview được duyệt, không phải làm thêm gallery.

## Worktree và phạm vi

- Làm tại C:/Users/ADMIN/.codex/worktrees/dong-ta/volam-hero-defense, branch wip/m3d/dong-ta. Kiểm tra cwd/branch và diff trước khi sửa. Giữ toàn bộ art/preview/untracked hiện có; không reset/clean hoặc checkout đè chúng.
- Chỉ triển khai Đông Tà, Mai Siêu Phong, Hoàng Dung và phụ thuộc tối thiểu của encounter này. Không tạo dungeon/arena riêng, không triển khai Tây Độc/Nam Đế/Bắc Cái/Vương Trùng Dương hay toàn bộ M5, không merge/deploy checkout khác.
- Director đã duyệt V04/feedback_02 ngày 2026-11-02. Nguồn: assets/approved_dong_ta.lock.json và assets/reviews/bosses/dong_ta_v02/director_approval.json. Không hỏi duyệt lại cùng art/choreography. Approval này chưa xác nhận final combat balance hoặc kết quả gameplay sau tích hợp.
- Không tạo lại PNG, đổi costume, dùng Graphics/SVG thay sprite, hoặc tái bật các skill cũ đã bị loại. Dùng đúng atlas/frame/pivot và các binding được chọn trong approval record.

## Đọc và kiểm kê trước khi code

Đọc AGENTS.md, DECISIONS.md, GAME_DESIGN.md, CONTENT_DATA.md, COMBAT_SYSTEM.md, BALANCING.md, ART_ASSET_GUIDE.md, ART_PRODUCTION_STANDARD.md, UI_UX_SPEC.md, TECHNICAL_ARCHITECTURE.md và docs/DEVELOPMENT_WORKFLOW.md. Xem các reference/anti-reference theo AGENTS. Dùng các skill colyseus, pixel-art-pipeline, game-playtest và combat-balance-test khi áp dụng; kiểm installed versions và official APIs trước khi dùng Phaser/Colyseus.

Đọc:
- assets/reviews/bosses/dong_ta_v02/README.md và director_approval.json: bản hiện hành là V04/feedback_02; history và feedback_01 là lịch sử.
- choreography.mjs, review.js, data.json, provenance.json trong folder đó; feedback_02/evidence/, browser_verification.json và final_check.json.
- PNG/hash-JSON/animation metadata dưới assets/sprites/bosses/main/dong-ta/, assets/sprites/summons/mai-sieu-phong/, assets/sprites/summons/hoang-dung/, cùng các folder effects tương ứng. Các sibling rework_v02 chứa pose thrust/flute và VFX mới.
- Chạy python -X utf8 assets/reviews/bosses/dong_ta_v02/verify_approval.py trước khi dùng các input.

Kiểm tra code thật: packages/game-core/src/invasions.ts, dungeons.ts, simulation.ts, combat.ts, types.ts và các adapter boss hiện có; packages/game-data/src/invasion.ts, arena.ts; apps/game-server/src/rooms/MatchRoom.ts; apps/game-client/src/arena-scene.ts, art.ts, các presentation boss; maps/arena.tmj và tests liên quan. Invasion hiện là nền M2B với ba recipe mẫu, chưa phải catalogue 20 wave/chapter-boss hoàn chỉnh. Mở rộng tối thiểu để Đông Tà spawn đúng gate; không giả định gate đã tồn tại và không thay encounter dungeon khác.

## Luật encounter đã được người dùng chốt

1. Đây là wave boss đầu tiên: chỉ spawn một lần sau khi wave 5 tương ứng đã được clear và qua một khoảng nghỉ ngắn cấu hình. Không cần clear wave 6+ để mở gate wave 5. Spawn/clear/retry đều server-owned và không được nhân đôi.
2. Boss đi từ phía đông, giữa con đường, tới tâm sân tròn của main arena. Không đánh tượng, chỉ đánh người. Nếu cần marker riêng, thêm marker boss tiếp cận; đừng sửa marker creep đông/tây để canh đường boss.
3. Khi boss tới tâm: tạm ẩn tượng; tượng BẤT TỬ trong toàn bộ encounter, bao gồm khoảng reset/retry. Không repair/refill HP tượng. Giữ entity/HP đã có để khôi phục đúng khi kết thúc. Xử lý collision phù hợp để không tạo vật cản vô hình trong sân.
4. Gom và HỒI SINH NGAY toàn bộ người chơi của match, bao gồm người đang chết hoặc ở dungeon/PvP, về các điểm hợp lệ trong sân. Dùng transfer/cleanup authoritative; không nhân bản hero, items, XP, gold, build hoặc skill points. Giữ luật empty reset/pause của instance cũ và xử lý pending claims hiện có.
5. Khóa người chơi trong sân tròn + một ít rìa ngoài. Server kiểm normal movement, dash, forced movement, travel/menu escape và respawn; client-only clamp không đủ. Giữ khả năng Quit.
6. Đồng hồ invasion vẫn chạy mỗi 180 giây, kể cả đang đánh boss/retry. Không hoãn wave, xóa creep đang sống, đổi clock origin hay đổi thành spawn theo clear. Creep vẫn thuộc hệ invasion; miễn sát thương tượng là exception có giới hạn encounter, không phải pause schedule.
7. Chỉ cần Đông Tà chết là thắng encounter này. Dọn Mai/Hoàng còn sống cùng tất cả projectile/field/status tạm thuộc encounter; mở vùng và hiện lại tượng với HP cũ. Match tiếp tục, không gọi đây là thắng toàn bộ game. Chỉ thưởng gold/XP đúng một lần, KHÔNG có item/loot roll.
8. Nếu cả đội chết: reset boss về full HP/trạng thái đầu và cho đánh lại; lặp đến khi qua hoặc người chơi Quit. Mỗi attempt mới dọn sạch casts, projectile, vùng độc, hoa, summons, target locks và quyền summon một lần của attempt cũ. Không rewind progression/inventory/economy hoặc cộng thưởng khi reset.
9. Trong một attempt, người chết lẻ dùng chính sách respawn hiện có rồi trở lại vùng encounter còn khóa. Wipe là toàn bộ người tham chiến hợp lệ đều chết; xử lý disconnect/all-disconnect theo lifecycle room hiện có để tránh ghost giữ trận hoặc vòng reset vô hạn khi không ai kết nối.
10. Scene/HUD vẫn là một viewport game, overlay trong viewport. Không tạo sidebar/dashboard ngoài map. Giữ arrow/A/QWER và chuột cho menu; không thêm mouse-targeted combat.

## Hệ tọa độ và hình học

- Preview là camera-local: center (640,376) do trừ offset (160,240). Tâm sân trong world là (800,616), từ assets/arena_v2.manifest.json; vị trí tượng (800,576) là một marker khác.
- Không đưa tọa độ viewport vào core/network. Tạo shared encounter config từ world/map markers.
- Sân vẽ 600×540; preview dùng bán kính (324,294), gồm 24px rìa và 8px chừa chân. Dùng làm giá trị đầu để khớp hình đã duyệt; collider/foot radius và swept bounds phải giải quyết trên server.
- Chuyển geometry cần thiết thành pure deterministic game-core logic; không import module demo phụ thuộc DOM/Phaser vào core.

## Bộ chiêu được duyệt

Đông Tà có hai normal, bốn active:
- Tà Kiếm Liên Kích: nhiều nhát đâm trải đủ 180° trước mặt; đủ xa để đánh người dùng Cái Bang Chưởng/Thiên Sơn Phiến ở tầm bắn. Preview 380px; chọn hit geometry theo nhịp, có dedup mỗi nhát, không gây damage theo frame.
- Normal Lạc Anh Kiếm Pháp: quét cone/quạt phía trước có hoa đào. Tách rõ ID normal và active dù display name giống nhau.
- Đàn Chỉ Thần Công: mỗi cast server RNG chọn 8–14 hướng tỏa 360° và góc xoay; một viên mỗi hướng trong một đợt nhanh như V04. Bay thẳng theo vector đã chốt, không tracking. Không trở lại năm viên cùng một hướng.
- Active Lạc Anh Kiếm Pháp: chém bốn hướng cùng lúc, server RNG chọn chữ thập + hoặc chữ X. Boss xuất kiếm tại chỗ; không tái dùng lướt tam giác/vuông/thoi/Z. Hình, hướng và phạm vi server quyết định.
- Ngọc Tiêu Hồi Phong: thổi sáo, rải đúng 40 cụm hoa ngẫu nhiên trong sân, không grid/đường; mỗi cụm nổ sau delay. Vùng cảnh báo, timestamp và damage server-owned; không cho client roll lại vị trí.
- Triệu Hồn Đông Hải: ngay lần đầu HP dưới 40% trong attempt, gọi đồng thời Mai Siêu Phong và Hoàng Dung. Đúng 40% chưa trigger. Một lần mỗi attempt, không trigger lại do Hoàng heal lên rồi HP tụt tiếp; chỉ attempt reset mới khôi phục quyền summon.

Mai Siêu Phong:
- Chọn một người sống hợp lệ và đuổi/đánh người đó liên tục; không đổi chỉ vì người khác gần hơn hoặc gây thêm damage. Khi target chết/không còn hợp lệ do disconnect, chọn target mới theo policy cấu hình; tránh ghost/softlock. Đây là passive target selection, không phải cast/animation khóa riêng.
- Bạch Cốt Trảo: hai đường vuốt ngược chiều trong vùng PHÍA TRƯỚC theo hướng mặt Mai. Trái/phải/lên/xuống đều xoay vùng hit đúng; mục tiêu phía sau không bị đánh. Dùng chân actor để tính gameplay, offset thân chỉ dành cho render.
- Ma Ảnh Tróc Hồn: phóng vuốt xa liên tiếp về target đang khóa, captured vector ở từng release, bay thẳng.
- Âm Phong Hấp Lực: hút target lại gần bằng server forced movement; không tự thêm stun/silence.
- Độc Cốt Bạo: ném bọc vải độc, nổ khi chạm đất, để vùng độc gây DOT theo tick khi người chơi đi vào. Không dùng đầu lâu/xanh độc cũ.
- Toàn bộ VFX đỏ đô/đỏ đậm. Giữ trang phục/sprite đã có.

Hoàng Dung chỉ có:
- Thanh Âm Hộ Trợ: liên tục bắn chưởng hồi HP cho Đông Tà và Mai còn sống; không heal tượng, hồi sinh hay thêm shield/skill khác.
- Linh Xà Bộ: bứt tốc chạy, dùng lại evade/movement_trail.

Không đăng ký Đảo Ảnh Di Hình, Đào Hoa Loạn Ảnh Trận hoặc các skill Hoàng Dung V01 bị loại. Không dùng A/QWER của người chơi để điều khiển boss; hotkey trong viewer chỉ là công cụ review.

## Kiến trúc và tuning

- game-core độc lập Phaser/Colyseus/DOM; fixed ticks, seeded RNG, state machine lifecycle rõ ràng. Server là authority cho AI, vị trí, target, RNG, bounds, hit/damage, HP, hồi máu, pull, DOT, summon, revive, reset và rewards.
- Mở rộng pipeline hiện có thay vì viết lại World/DungeonMatch hoặc copy nguyên dungeon boss lifecycle. Entry → center/recall → fighting → wipe/reset/retry hoặc clear phải có attempt IDs để event cũ không tràn sang attempt mới.
- Protocol chỉ chiếu state/events được server xác thực; client không gửi tọa độ/damage/heal/loot hoặc kết quả random. Cập nhật protocol/version/adapters nếu cần; view-filter đúng match/zone.
- Phaser load PNG/JSON/animation metadata đã ghim, nearest sampling, feet/Y-depth và origin đúng. VFX đi theo authoritative cast/shape/timestamps; animation frame không quyết định damage. Tint contact ở preview phải chuyển sang confirmed hit event, không coi nó là combat engine.
- HP, defense, damage, cooldown, attack interval, cast windup/recovery, summon stats, heal cadence, DOT, pull strength, CC resistance, XP/gold và scaling 1–6 người chưa có final tuning. Đặt trong game-data có validation, ghi rõ PROPOSED, chọn mặc định thử nhỏ có thể chỉnh và đo bằng simulation/playtest. Không hỏi lại chỉ để được phép đặt những số này.
- Giá trị hình/timing trong choreography.mjs là mốc để khớp preview, không phải final damage balance. Hai con số 8–14 hướng và 40 cụm, pattern +/X, ngưỡng dưới 40% và một lần summon là luật đã duyệt.
- Non-blocking defaults: giữ resource/respawn/cooldown-debt policy đang có; người đang sống không tự được refill vì recall; người chết hồi sinh dùng HP/MP policy hiện tại. Khoảng nghỉ trước spawn/retry, initial target selection và scaling là config thử, không gọi đã được director duyệt. Không reset build hay tạo stat duplication.
- Không sửa PNG đã duyệt để giải quyết lỗi mechanics; nếu asset binding thiếu, báo chính xác và dùng semantic reuse đã có khi phù hợp.

## Kiểm chứng và bàn giao

1. Guard exact approved bytes, atlas bounds/pivots/clips và production/public copy hashes. Approval mới dùng record/lock; giữ các manifest/history export-time nguyên trạng.
2. Deterministic tests cho gate wave5/clear/rest/one spawn; statue immunity không repair + restore; clock180s/overlap; recall living/dead từ mọi zone; server bounds kể cả dash/pull/menu escape; RNG radial/pattern/petals; hit phía trước/không phía sau; delay/DOT/heal; summon once threshold; wipe lặp/reset attempt; boss chết dọn summons; rewards once/no item; disconnect và cleanup.
3. Headless balance với seed cố định, cả bốn school, legal builds, solo và party. Báo số thực đo, giữ tuning provisional.
4. Browser iteration hai clients, sau đó một final six-client combat/readability pass: real movement/hits/HP, summon/heal/pull/poison, các phái tầm xa bị Tà Kiếm đe dọa, recall/bounds, wipe→retry→clear, statue restore và reward sync. Recheck existing schools/dungeons/bosses và approved-art guards liên quan.
5. Dùng QA session/ports riêng; không mượn hay dừng service của chat khác. Giữ video/trace playback tắt; chỉ PNG, frame observations và logs. Capture actual match 1×/normal zoom, không chỉ standalone viewer.
6. Sau thay đổi implementation cuối, chạy pnpm check:final với browser config/scope mới phù hợp một lần, ví dụ --config playwright.dong-ta.config.ts nếu tạo fixture đó. Không dùng một gallery-only pass làm final acceptance. Nếu chỉ sửa fixture/metadata sau kết quả thành công, rerun đúng stage bị ảnh hưởng theo docs/DEVELOPMENT_WORKFLOW.md.
7. Cập nhật docs/DONG_TA_INTEGRATION.md, spec/acceptance/architecture khi behavior thật đổi; ghi rõ rule confirmed, số thử, approval và limitation. Báo file thay đổi, commands/results thực chạy, PNG thực tế, state/rewards test và pending final runtime/balance approval. Không tuyên bố complete khi mới có visuals hoặc chưa có multiplayer authoritative combat.

