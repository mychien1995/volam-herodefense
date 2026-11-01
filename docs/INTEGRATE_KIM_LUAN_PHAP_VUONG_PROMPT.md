# Prompt tích hợp Kim Luân Pháp Vương — approved preview feedback_02

Tích hợp encounter **Kim Luân Pháp Vương tại thành Tương Dương** vào game Phaser/Colyseus đang có. Làm đến khi chơi và kiểm tra được encounter thật, không dừng ở bản xem art.

## Worktree và phạm vi

- Chỉ làm tại `C:/Users/ADMIN/.codex/worktrees/kim-luan-phap-vuong/volam-hero-defense`, branch `wip/m3d/kim-luan-phap-vuong`. Kiểm tra cwd/branch trước khi sửa. Không tạo worktree mới, không merge/deploy hoặc sửa checkout khác.
- Worktree có các file art/choreography chưa commit: giữ nguyên, không reset/clean/xóa untracked, không checkout phiên bản cũ đè lên chúng.
- Director đã nói **“duyệt, gửi tôi prompt để integrate boss này vào phaser trong worktree hiện tại”** cho bản preview **feedback_02**. Dùng `assets/approved_kim_luan_phap_vuong.lock.json` và `assets/reviews/bosses/kim_luan_phap_vuong_v01/director_approval.json` làm mốc. Không hỏi duyệt lại cùng art/choreography trước khi tích hợp. Đây là duyệt preview để tích hợp, chưa phải duyệt combat balance hoặc runtime cuối cùng.
- Không tạo lại PNG, không thay sprite bằng Graphics/SVG, không mở rộng milestone/gameplay ngoài encounter này và các phụ thuộc tối thiểu để nó hoạt động.

## Đọc và kiểm kê trước khi code

Đọc AGENTS.md, DECISIONS.md, COMBAT_SYSTEM.md, UI_UX_SPEC.md, ART_ASSET_GUIDE.md, TECHNICAL_ARCHITECTURE.md, docs/DEVELOPMENT_WORKFLOW.md và các skill Colyseus, pixel-art-pipeline, game-playtest, combat-balance-test liên quan. Xem ảnh chuẩn/anti-reference theo AGENTS. Kiểm tra version cài đặt và official docs trước khi dùng API Phaser/Colyseus.

Nguồn chính xác của bản được duyệt:

- `assets/reviews/bosses/kim_luan_phap_vuong_v01/README.md`: đọc **feedback_02 trước**, các mục v01/feedback01 phía dưới là lịch sử.
- `choreography.mjs`, `review.js`, `data.json`, `asset_map.json` trong cùng folder: hành vi trình diễn, hằng số và binding mới nhất. Không quay lại Thiết Phiến36tia hoặc Chấn Thiên540px.
- `feedback_02/verification.json`, `feedback_02/final_check.json`, `feedback_02/revision-overview.png`: kết quả/ảnh preview thực tế.
- `assets/exports/bosses/kim_luan_phap_vuong_v01/manifest.json`: PNG/JSON/frame/provenance. Hiện có220cel gồm208character/VFX/voi/đá +12props; playback chọn184frame/53clip. 24baseline attack candidate bị loại vẫn nằm trong nguồn, không được tự đăng ký lại.
- `assets/exports/bosses/kim_luan_phap_vuong_v01/tuong_duong.tmj`: nền/props rời và marker đề xuất. Collision hiện chỉ là đề xuất, chưa phải server map.
- `assets/source/bosses/kim_luan_phap_vuong_v01/`: nguồn/prompt/exporter, giữ byte của các input đã ghim.

Kiểm tra code thật thay vì suy luận từ docs lịch sử: đã có Chu Bá Thông và Hoàn Nhan Hồng Liệt. Đọc `docs/CHU_BA_THONG_INTEGRATION.md`, `docs/HOAN_NHAN_HONG_LIET_RUNTIME.md`, `packages/game-core/src/chu-ba-thong.ts`, `hong-liet.ts`, `packages/game-data/src/dungeon-registry.ts`, room/protocol, renderer, dungeon selector và backend loot hiện có. Tái sử dụng foundation, không tạo lại room/combat/inventory song song.

## Gameplay phải thực thi trên server

### Cấu trúc encounter

1. Thêm dungeon destination `kim_luan` (ASCII ổn định), tên hiển thị **Kim Luân Pháp Vương · Tương Dương**, vào menu Phó Bản hiện tại. Riêng1người, chung tối đa6 trong cùng match; không rò state/event/reward sang zone khác.
2. Bắt đầu với **Hoắc Đô và Đạt Nhĩ Ba cùng sống**. Kim Luân không tồn tại/không target được/không gây sát thương trước khi **cả hai thật sự chết trên server**. Người chết trước không tự hồi sinh trong pha học trò. Gate hoạt động với mọi thứ tự kill, đồng thời kill, người ra/vào và reconnect/disconnect theo chính sách hiện có.
3. Sau gate, tạo Kim Luân đúng một lần. Boss là pháp vương Mông Cổ, đánh tay không và dùng năm luân; không thêm chùy/kiếm cho boss.
4. Hoắc Đô di chuyển nhanh liên tục, có lúc ra chiêu. Đạt Nhĩ Ba **có di chuyển nhưng chậm**, có xu hướng bảo vệ/ở gần Hoắc Đô; dùng walk thật và vị trí hợp lệ, không chỉ tween sprite quanh actor đứng yên.

### Hoắc Đô — giữ đúng feedback_02

- **Thiết Phiến Liên Hoàn:**3nhát, **4tia/nhát =12tia/cả chuỗi**, tia nhỏ hơn,440px/s, cách0,5s, warning0,6s, chu kỳ3,6s, lifetime2s. Góc nhát/lượt đổi như choreography hiện tại, còn khoảng né rộng. Không phục hồi12tia/nhát/36tia hay phủ kín sân. Đao khí xuyên mục tiêu theo hướng chốt, hit dedup mỗi projectile/target.
- **Cuồng Phong Tấn Lôi Công:**5lốc tỏa160°,280px/s; hit gây đẩy lùi và slow theo server, không homing. Chiều rộng va chạm theo thân lốc, không toàn hình chữ nhật alpha/trail.
- **Phiến Trung Độc Đinh:**5đinh trước +5đinh sau,620px/s. Damage dồn tăng theo đinh hợp lệ; đinh2 mạnh hơn đinh1; đủ5đinh hợp lệ phải chết theo yêu cầu gốc. Mặc định thử đếm theo cùng cast/target, mỗi viên tối đa1hit; ghi rõ cách tương tác với miễn nhiễm/shield. Resolve qua pipeline damage/death chung, không client-submitted hits hoặc trừ HP ngoài pipeline.
- **Cuồng Phong Vạn Nhận:**spin với pose thật, đinh phóng liên tục nhiều phía; không tăng damage theo render FPS.

### Đạt Nhĩ Ba

- Đánh thường quét chùy phía trước180°, đủ tầm, không tự thành vòng360°.
- **Đại Lực Phá Sơn — nện đất:**giơ/nện, tạo vết nứt, **sau0,5s tính từ impact** mới nổ dọc đường. Ground warning/hazard ở vị trí đã chốt dù boss đi tiếp.
- **Bất Động Kim Cang:**chỉ **một** chân khí hộ thể luân chuyển giữa hai người. Người giữ giảm damage; khi Đạt Nhĩ Ba chuyển cho Hoắc Đô thì bản thân dễ bị thương hơn. Không nhân đôi mitigation ở thời điểm chuyển. Quy tắc khi một người chết phải rõ và có test.
- **Đại Lực Phá Sơn — ném đá:**giữ cùng tên hiển thị, dùng ID riêng với nện đất. Bê/ném nhanh vào vị trí player đã chốt, bay thẳng, có thể né; swept collision.
- **Hàng Ma Tam Liên Chấn:**3impact riêng, vòng nhỏ → lớn → rất lớn, có telegraph và dedup/pulse chính xác.

### Kim Luân Pháp Vương

- A:5luân quạt trước mặt, phủ sát chân và đủ xa để gây áp lực lên người tay dài, không có blind spot vô lý ngay chân boss.
- **Kim Luân Truy Hồn:**đúng5luân bay lâu/bật quanh arena theo state server; capture hướng, không tracking. Quy định hit cadence/dedup tường minh, không gây damage mỗi tick do overlap.
- **Ngũ Luân Hộ Thể:**5luân orbit6rad/s, radius145px; sau3s phóng5hướng ở680px/s. Không bật lại nhịp chậm v01.
- **Ngũ Luân Phong Tỏa:**nhốt một player trong luân xa và chuẩn bị xung kích hướng đã chốt. Đồng đội giải cứu bằng đòn A/QWER hợp lệ theo cơ chế entity/HP hoặc hit rule server; không nút client tự phá. Ba đòn ở preview chỉ là minh họa, không phải damage balance đã duyệt. Chọn mặc định thử có giới hạn, xử lý solo/death/leave/timeout để tránh softlock và ghi rõ policy.
- **Long Tượng Chấn Thiên:**vòng sóng mỏng, lan nhanh, gây stun nhưng **max radius280px**, không540px/không toàn map. Giữ đường né ngoài vùng gần boss. Renderer bám geometry thật, không lấy kích thước canvas atlas làm hitbox.
- **Long Tượng Bát Nhã Công:**5mỏm đá có seed ngẫu nhiên mỗi cast, vị trí cố định trong cast;12làn ×3hàng, cách hàng0,45s, voi480px/s. Đợt từ trên xuống hoặc dưới lên; các đợt đảo chiều có warning/khoảng chuyển chỗ nấp. Đá chắn voi thật, safe shadow đúng phía tương ứng, không chỉ hiển thị nhãn “an toàn”. Dùng sprites run_down/run_up thật.
- **Long Tượng Bát Nhã Thập Tầng:**kích hoạt khi HP **strictly dưới30%**.14làn ×4hàng, cách hàng0,32s, đá/voi hai chiều như preview. Boss tăng tốc chạy/đánh, **vẫn di chuyển trong lúc phóng5luân mỗi1,8s ở430px/s**, origin/hướng chốt tại thời điểm phóng; walk/cast không restart liên tục hoặc đứng lại vì attack lock dùng chung. Chỉ chuyển trạng thái một lần theo policy rõ, không spam thêm director mỗi tick.

Thông số hình học/choreography trên là baseline preview được duyệt. HP/damage/defense/stun/slow/ward strength/cooldown chiến đấu, loot table, solo rescue chưa được duyệt cân bằng: đặt trong game-data, validate, dùng mặc định thử nhỏ và ghi rõ; không âm thầm đổi luật đã chốt hoặc dừng xin duyệt lại các chi tiết không chặn công việc.

## Kiến trúc, art và lifecycle

- game-core TypeScript deterministic, seeded và độc lập Phaser/DOM/Colyseus. Server quyết định AI, target, movement/collision, trajectories, casts/statuses/hits, RNG, death/reward và toàn bộ lifecycle. Client chỉ gửi input hợp lệ và trình bày state/event zone-filtered. Không đưa helper DOM/review trực tiếp vào core; port dữ liệu/geometry cần thiết qua module phù hợp.
- Tái sử dụng damage, shields/immunity, status, contribution, progression, networking và dungeon foundations. Fast projectile/elephant/expanding-ring collision cần swept checks hoặc cách tương đương để không xuyên hero giữa tick. Duration/tốc độ không phụ thuộc FPS; contact cooldown/hit sets không lặp vô hạn.
- Chuyển map ghép lớp sang map runtime dùng chung marker/collision; không lấy screenshot làm nền. Không biến toàn rectangle của mái/ảnh/đá thành hitbox. Test spawn, exit, đường di chuyển và chỗ nấp có thể tới được.
- Đối chiếu world/screen projection khi port geometry: vòng sóng pixel là ellipse trên mặt đất, không tự dùng một circle damage lớn hơn vùng nhìn thấy. Giữ mốc280px đã duyệt và ghi rõ cách map ellipse/annulus, bán kính hero, warning/travel/contact sao cho người đứng ngoài VFX không bị hit.
- Giữ full match viewport, camera/normal zoom, feet/Y-depth, overlays trong viewport; Arrow/A/QWER và Space tại exit thật. Không sidebar ngoài game hoặc click-targeted spells.
- Nguồn chọn184frame/53clip phải load và chạy trong client thật. Characters idle/walk4hướng; cast body phần lớn chỉ có hướng xuống, Hoắc spin có4pose; không rotate/mirror body để giả art còn thiếu, không đăng ký24cels bị loại. VFX có thể định hướng theo vector server; disclosed art limits giữ nguyên. Đọc bounds/pivot thật cho luân, nứt đất và ripple mỏng.
- Thêm guard ở asset preparation để kiểm tra approval lock, copy exact retained PNG bytes và giữ approval riêng với metadata tích hợp mới. Không ghi đè export-time manifest chỉ để biến mọi status cũ thành approved.
- Boss fixed difficulty cho1–6, không tự nhân HP theo số lần clear. Empty30s reset toàn encounter về hai học trò ban đầu, HP/position/gate/transients sạch. Final-kill respawn dùng deadline riêng với empty reset, không duplicate spawn. Death/transfer/disconnect/reset/defeat dọn cast, luân, đinh, cage, đá/voi và temporary statuses đúng scope.
- Tái sử dụng backend contribution/reward/loot hiện có sau khi đọc code thực. Một fixed XP/gold pool, đúng1item ngẫu nhiên/kill Kim Luân và eligible-player roll theo quy tắc repo; không vô tình tạo3item cho3actor hoặc reward trùng. Bảng item chưa có dữ liệu duyệt: dùng cấu hình thử được ghi rõ, không tự thêm combat stats/crafting hoặc fake artwork. Giữ giới hạn4equipment, không mở rộng hệ thống inventory toàn game.

## Kiểm tra và hoàn tất

1. Test deterministic từng skill/hit/status, gate2học trò, ward độc nhất, poison escalation/fifth hit, dưới30%, Thập Tầng move+fire, straight shots, swept contact, khoảng né Thiết Phiến/Chấn Thiên, đảo hướng voi/đá che thực sự, corpse/reset/re-entry và reward/roll một lần.
2. Test room thật cho private/shared/zone isolation, forged/replay input và lifecycle. Không coi preview không server là kết quả multiplayer.
3. Hai browser client cho iteration; final6client natural combat/readability qua input bình thường, không hạ HP/đánh giả để claim boss kill. Fixtures dàn cảnh/frame chỉ trong test services, không production route. Quan sát tất cả184frame/53clip, timing, walk/cast transitions, pivot/Y-depth, hazards đúng phase và cleanup; so PNG actual-run với preview feedback_02 và references.
4. Sim seeded với builds hợp lệ1/6player, melee/ranged, các school/level phù hợp; đo khả năng né, sống sót, chuyển phase và ranged pressure. Không chỉ dùng DPS dummy hoặc nói “đã cân bằng” từ unit tests.
5. Sau thay đổi implementation cuối, chạy `pnpm check:final` một lần với scope Kim Luân phù hợp theo docs/DEVELOPMENT_WORKFLOW.md. Không disable guard để làm xanh. Preview từng bị chặn bởi `assets/tilesets/beach/terrain.tsj` khác provenance hash dù khớp Git HEAD. Chẩn đoán trên checkout hiện tại; chỉ khôi phục byte nếu chứng minh khớp đúng hash đã có, không recalculate expected hash. Nếu còn blocker, giữ evidence và chạy phần scoped không phụ thuộc, báo chính xác stage chưa chạy.
6. Không WebM/MP4/GIF/FFmpeg/video/trace screenshot streams. Chỉ PNG cần thiết, frame/event assertions, JSON/logs. Giữ evidence lịch sử.
7. Cập nhật docs/DECISIONS/acceptance/architecture khi gameplay thực sự thay đổi. Giao link demo trong game thật, entry steps, file changes, commands/results, evidence và các art/balance limits còn mở. Không tự claim runtime director approval, không merge/deploy. Không dừng ở kế hoạch hoặc demo canvas độc lập.
