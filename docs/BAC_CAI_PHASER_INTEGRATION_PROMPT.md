# Prompt tích hợp Bắc Cái vào Phaser / trận đấu thật

Sao chép phần dưới vào chat thực hiện tích hợp. Visual v03 đã được director duyệt ngày 2026-11-02. Chat lập prompt này chỉ ghi nhận approval và chuẩn bị handoff, chưa triển khai combat.

---

Làm việc trong worktree hiện tại `C:\Users\ADMIN\.codex\worktrees\bac-cai\volam-hero-defense`, nhánh `wip/m3d/bac-cai`. Hãy tích hợp **Bắc Cái — Hồng Thất Công** vào trận đấu Phaser thật, sử dụng nguyên visual/choreography v03 đã duyệt. Hoàn thành luồng server → đồng bộ → render → kiểm thử; không dừng ở gallery/demo. Không merge sang nhánh khác khi chưa được yêu cầu.

## 1. Đọc và xác minh trước khi sửa

- `AGENTS.md`, `DECISIONS.md`, các tài liệu thiết kế/kiến trúc/acceptance và workflow mà repository yêu cầu.
- `docs/BAC_CAI_FINAL_DESIGN.md`, `docs/BAC_CAI_FEEDBACK_V03.md`, `assets/reviews/bosses/bac_cai_v03/director_approval.json`, `assets/approved_bac_cai.lock.json`.
- `apps/game-client/src/bac-cai-preview-model.ts`, `bac-cai-preview-tuning.ts`, `bac-cai-preview.ts`, `scripts/prepare-bac-cai-preview.mjs`, `scripts/verify-bac-cai-preview.py` và evidence v03. Preview là mốc visual, không phải combat engine.
- Dùng các skill local `colyseus`, `game-playtest`, `combat-balance-test`; `pixel-art-pipeline` cho tích hợp asset. Kiểm tra phiên bản cài thực tế và official docs trước khi dùng API: checkout được kiểm tra với Phaser4.2.1, SDK Colyseus0.18.8/schema5.x; đừng giả định phiên bản sau đó không đổi.
- Đọc `UI_UX_SPEC.md` và các positive/anti-reference bắt buộc trước khi đụng UI. Giữ nguyên một viewport game lớn, mọi HUD/dialog/ô chọn nằm trong world hoặc overlay bên trong viewport.

Visual approval chỉ áp dụng artwork/choreography đã xem, không phải final balance hoặc approval của bản tích hợp chưa chạy. Không generate/repaint/recolor/resize/export lại asset đã khóa, không thay bằng Phaser Graphics/SVG. Giữ concept và nhân vật cũ. Các metadata lịch sử ghi pending vẫn được giữ; approval hiện tại nằm trong record/lock nói trên. Những hướng art còn thiếu đã công khai trong review v02: tích hợp fallback hiện có một cách trung thực, không báo thành bộ artwork đủ hướng và không tự bulk-generate.

## 2. Phạm vi và điểm nối thật của checkout

- Bắc Cái là **wave boss ở arena chính**, đi từ bắc vào; tập trung đánh người, tuyệt đối không đánh tượng. Không tạo arena/dungeon/portal riêng. Không thêm item drop.
- Chỉ làm Bắc Cái và phần hạ tầng tối thiểu cần để nó hoạt động. Không triển khai artwork/AI của Đông Tà, Tây Độc, Nam Đế hay Vương Trùng Dương trong task này.
- Kiểm tra trạng thái code hiện tại trước khi chọn điểm nối. Tại lúc handoff: `packages/game-core/src/invasions.ts` điều khiển invasion; `boss-encounter.ts`/`boss-types.ts` chủ yếu là encounter Lý Mạc Sầu; `apps/game-client/src/arena-scene.ts` là renderer world. **Không gọi nguyên `spawnBossEncounter()` của Lý Mạc Sầu để spawn Bắc Cái:** nó hardcode boss Lý Mạc Sầu và clear creep/projectile trong world.
- Thêm lifecycle/main-boss runtime phù hợp cho arena, không xóa wave còn sống, không chiếm dụng singleton dungeon boss làm mất state khác, không dùng room creation làm gốc clock. Giữ invasion180s/hai phía và toàn bộ gameplay hiện tại.
- Giữ thứ tự boss Đông Tà → Tây Độc → Nam Đế → Bắc Cái → Vương Trùng Dương và gate wave tương ứng đã clear + nghỉ ngắn. Bắc Cái thuộc gate wave20 và các boss trước. Nếu chuỗi main-boss/gate chưa tồn tại, thêm điểm nối/state tối thiểu cho Bắc Cái và fixture server-only để kiểm thử. Không giả vờ ba boss trước đã chết, không auto-spawn sai tiến trình, không implement các boss khác chỉ để lấp dependency. Báo rõ phần natural progression còn phụ thuộc các tích hợp khác; vẫn hoàn thành encounter Bắc Cái có thể chạy kiểm thử từ server.
- Dùng tọa độ world/marker arena hợp lệ, không copy các tọa độ1280×720 của preview. Chọn điểm vào phía bắc, tâm chiến đấu và tám vị trí phân thân phù hợp collision hiện tại; không đặt boss vào collision tượng.

## 3. Server authority và kênh hành động độc lập

`game-core` thuần, deterministic seeded RNG, không Phaser/DOM/Colyseus. Server quyết định di chuyển, target, cast/release/recovery, hit geometry, damage, immunity, chó, phân thân, dây nối, sở thích/vote, HP/heal, reward, chết và cleanup. Client chỉ gửi input hợp lệ và render state/event. Không lấy client animation completion hay preview clock làm thời điểm gây damage.

Tách ít nhất ba kênh:

1. **Thân boss / main action:** idle/move/basic/cast/recovery, phân thân, ngủ/uống.
2. **Hiệu ứng/summon đã thả:** rồng xoắn ốc, projectile, chó, dây, vùng đất có lifecycle riêng. Sau release không giữ cast lock trên boss đến hết VFX.
3. **Sở thích/dialog/vote:** clock và state độc lập; thoại không chiếm main action. Sleep/drinking outcome có animation riêng theo mô tả.

Dùng IDs và sequence/tick server cho đồng bộ, chống duplicate event và client vào muộn. Snapshot chứa đủ thông tin tái dựng hiệu ứng đang sống, không chỉ event thoáng qua. Không gửi đáp án `isReal`/`realSlot` hoặc RNG seed câu đố cho normal client, không gắn marker phân biệt chân thân sau phân thân. Preview debug bridge không được trở thành authority/network contract.

## 4. Cơ chế final phải giữ

- **Đả Cẩu Bổng Pháp, đánh thường:** gậy tre quét liên tục kèm lướt về phía trước. Quỹ đạo/hit và collision do server.
- **Hàng Long18 Chưởng, đánh thường:** đầu rồng phóng từ tay, hướng khóa lúc phóng, bay thẳng, không tracking. Boss chuyển linh hoạt giữa chưởng/gậy; không ép phase đổi vũ khí cố định chưa được yêu cầu.
- **Đả Cẩu Bổng Kích:** thu gậy, chọc như bi-a, phóng tia thẳng rất dài, warning ngắn. Dùng `bac_cai_beam_v03` với strip768×128, pivot(16,64), tỷ lệ đều1×; không kéo ngang4.8× ảnh nhỏ cũ. Thân boss chỉ chọc/thu một lần rồi rảnh. Giữ visual warning350ms/jab recovery700ms làm giá trị cấu hình ban đầu; server tick quyết định thời điểm hit. Đòn nhanh phải dùng swept geometry để không xuyên mục tiêu giữa hai tick.
- **Bổng Đả Ác Khuyển:** đúng bốn chó đen mỗi lần triệu hồi, đuổi/cắn người, có HP thật, người chơi đánh được, hurt/death đúng và chết thì ngừng tác động. Không render thành bốn VFX giả. Không tự đổi thành chó lửa Ma Khuyển. Không thêm item drop hoặc exploit farm reward từ summon. Không tự hiểu “bốn mỗi cast” là một cap bốn toàn trận chưa được chốt.
- **Mục Hạ Vô Nhân:** tổng tám hình (một thật + bảy phân thân). Chân thân từ từ bay từ giữa sân ra một vị trí trong lúc các phân thân xuất hiện ở các góc. Sau đó đúng năm lượt tráo chéo theo cặp, chậm; bám nhịp đã duyệt:1.4s di chuyển, lệch120ms/cặp, nghỉ340ms sau cặp cuối,2.1s/lượt. Dùng seeded pair/slot mapping có thể tái dựng chuyển động; không đổi thành xoay cùng chiều quanh chu vi. Miễn damage **trong tráo đổi**; không tự mở rộng immunity ra mọi phase. Tráo xong: đánh trúng thật làm các phân thân biến mất; đánh nhầm gây nổ/damage người trên map arena.
  - **Đã chốt:** AoE trúng phân thân **vẫn nổ kể cả cùng đòn/tick trúng chân thân**. Snapshot tập hit của lượt resolve trước khi xóa phân thân; thứ tự duyệt entity không được làm mất hình phạt. Dedupe event/hit để không resolve cùng một hit hai lần; không dùng dedupe để miễn nổ AoE.
- **Thiên Hạ Vô Cẩu:** đến tâm chiến đấu, xoay và hút người chơi trên toàn arena vào, sau đó đập gậy xuống đất gây AoE + stun. Các actor giữ vị trí đã bị hút khi slam, không snap về chỗ cũ. Hiệu ứng chỉ thuộc zone arena; không kéo người đang trong dungeon/PvP.
- **Kháng Long Hữu Hối:** chọn seeded-random hai người hợp lệ trong arena, hút về, nối dây **giữa hai người**, yêu cầu chạy đủ xa nhau để đứt; chưa đứt thì rút HP theo server tick. Chỉ có một người hợp lệ ở encounter thì không cast. Không nối player với boss thay cho nhau.
  - **Đã chốt:** một đầu dây chết, rời arena hoặc mất kết nối → dây tự đứt ngay, dừng rút máu người còn lại. Xử lý đúng cả disconnect, transition và same-tick death.
- **Kiến Long Tại Điền:** nhảy rất nhanh đến vị trí một người được chọn, chưởng xuống tạo vùng sát thương **田** rộng. Ground VFX dưới nhân vật, opacity ban đầu0.55; boss đầy đủ opacity, không bị mặt đất/target che mất silhouette, có hồi thế sau impact. Hit shape phải khớp vùng chữ Điền được cảnh báo, không thay bằng một vòng tròn damage vô hình.
- **Phi Long Tại Thiên:** xuất chưởng thả một rồng lửa, rồng tự bay theo xoắn ốc bán kính tăng dần, trong lúc boss có thể dùng chiêu khác. Giá trị visual ban đầu: release400ms, thân rảnh650ms, flight5600ms; tách server release/main-action recovery khỏi projectile lifetime. Quỹ đạo cố định theo điểm/hướng lúc thả, không bám target hoặc dính theo vị trí boss về sau. Damage kiểm tra liên tục/swept với giới hạn hit cadence rõ trong config; không phụ thuộc số frame client.
- **Sở thích Hồng Thất Công:** sáu sở thích: rượu ngon, mỹ nhân, thịt gà, thịt lợn, đánh cờ, tỉ võ. Boss nói bằng dialog trên đầu, đổi sau vài giây, **vừa nói vừa đánh skill khác được**. Đến lúc mở vote, hiện ba ô trên arena (có lựa chọn đúng theo sở thích cuối cùng + hai lựa chọn khác). Khóa giá trị cần nhớ theo câu sở thích cuối cùng được nói khi mở vote, khớp preview đã duyệt. Đếm số người đứng trong ô theo vị trí server khi deadline; mỗi người chỉ tính một ô, không gửi kết quả vote từ client.
  - Nhiều người nhất quyết định team. **Đã chốt:** hòa phiếu hoặc không ai chọn → sai ngay, không gia hạn.
  - Đúng → ngủ khoảng10s, nhận free damage. Sai → thất vọng, uống rượu hồi đúng10% **max HP**, clamp max HP. Outcome resolve đúng một lần.
  - Không kéo người ở zone khác vào vote. Dùng player hợp lệ còn sống/connected trong arena; trình bày policy membership/death/late join trong tài liệu integration. Các tương tác priority giữa vote outcome, main cast và hiệu ứng đã thả phải rõ, có test; không âm thầm thêm luật miễn damage cho người chơi hay xóa độc lập toàn bộ rồng/chó vì boss vừa nói một câu.

## 5. Render Phaser và giữ visual đã duyệt

Tích hợp retained PNG/hash-atlas/animation metadata qua loader/registry đang dùng; không biến standalone scene thành live simulation. Scene thật lấy pose/facing/action từ server state; VFX từ event/snapshot có start/release/end tick và owner/effect ID. Server late snapshots/room patches phải không reset animation mỗi frame hoặc phát lại một đòn đã kết thúc.

Giữ nearest sampling, canvas/pivot native, foot/Y-depth, camera orthographic không quay và tỷ lệ gameplay đã duyệt. Mọi hướng vũ khí/VFX theo aim server. Đặt ground effect dưới actors, air effect ở depth phù hợp; dialog sở thích không bị VFX che. Không thêm dashboard/sidebar ngoài viewport, không thu map cho UI. Giữ Arrow/A/QWER, mouse menu và input-focus blocking đúng.

Giữ nguyên asset lock; nếu thiếu native-facing bắt buộc, báo đúng hạn chế và giữ fallback đã duyệt. Không sửa art được khóa để lách integration. Không copy toàn bộ thuật toán storyboarding/tọa độ màn hình, `realSlot`, HP giả hay kết quả success/failure cố định từ demo sang gameplay.

## 6. Lifecycle, tuning và kiểm thử bắt buộc

- Tách HP/damage/range/speed/cooldown/dog stats/tether break distance/DOT/stun/telegraph/reward sang config có validation. Những chỉ số chưa được chốt là trial defaults, nêu rõ và chạy deterministic balance probes solo/2/6 người. Không hỏi lại ba quy tắc đã chốt. Không đánh dấu final balance approved.
- Cleanup đúng khi boss/summon/player chết, end/defeat/room disposal hoặc rời zone: không ghost actor, drain/drag/clone immunity tồn đọng, duplicate reward hay projectiles tiếp tục tác động sau khi chủ thể đã bị cleanup theo policy. Lifecycle wave boss không áp dụng nhầm empty-reset30s của dungeon. Boss không bị đánh tượng và không có item loot.
- Unit/integration cho toàn bộ geometry, exact-four spawn, target/zone isolation, immunity intervals, five crossing swaps/bijection, AoE vừa thật vừa giả vẫn nổ, vote tie/zero sai ngay, heal10% max/clamp/once, sleep10s, tether solo/break/death/leave/disconnect, detached dragon + cast khác, damage independent of frame rate, death/reward idempotence và cleanup.
- Phát triển với hai client thật trong cùng room. Kiểm tra position/HP/cast/phase/đường bay/hit/kill đồng bộ từ server, không suy ra server correctness từ screenshot. Sau đó một lượt sáu client thật để kiểm tra natural combat/readability; sáu hero model trong gallery không thay thế bước này.
- Giữ nguyên test gallery408 frames/102 clips và các hash guard. PNG bình thường1×/target zoom, frame/timing observation, console/server logs và report scope trung thực. Không WebM/MP4/GIF, không video/trace screenshot streams.
- Sau thay đổi implementation cuối, chạy **một lần** `pnpm check:final` với config/spec Playwright Bắc Cái live mới và các regression thực sự liên quan. Không tự ghi PASS cho command/spec chưa tồn tại. Nếu stage fail, sửa và chỉ chạy lại stage/dependency bị ảnh hưởng theo `docs/DEVELOPMENT_WORKFLOW.md`. Không rerun full suite vì chỉ sửa summary/approval metadata.

## 7. Bàn giao

Cập nhật mapping asset/runtime, config trial, API/state/event ownership, rules đã chốt, acceptance, phase priority/edge policies và dependency của natural main-boss progression. Báo file đổi, lệnh/thời gian/PASS/FAIL thực chạy, PNG đã xem, giới hạn art còn lại. Giữ approved visual/choreography nguyên vẹn và xin review riêng cho gameplay tích hợp; không biến approval visual v03 thành approval final runtime/balance. Không tự commit/merge hoặc triển khai boss khác khi ngoài phạm vi yêu cầu.
