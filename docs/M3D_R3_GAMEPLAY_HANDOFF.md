# M3D r3 — tích hợp gameplay và Phaser để director test

Worktree: `C:/Users/ADMIN/.codex/worktrees/m3d-feedback-integration/volam-hero-defense`; branch `wip/m3d/feedback-integration`; base `0b79e483`, đã có tech `c3021925` và visual r2 `4bf2dbd2483e1817ebc2fc2c574194a15aeaa8cf`. Không merge `milestone/m3d`.

Nguồn quyết định: [feedback toàn phiên](M3D_PLAYTEST_FEEDBACK_2026-11-02.md), [checklist hợp nhất](M3D_FEEDBACK_GAMEPLAY_INTEGRATION_PLAN.md). Visual r3/review6 đã duyệt; tuning bên dưới được director giao agent chọn để test. **Director chưa duyệt bản chạy trong game này.**

## Chơi thử

Client production đang chạy tại `http://127.0.0.1:5497`, server `http://127.0.0.1:2897` (health protocol19,runId `m3d-r3-director-review`). Đã kiểm bundle endpoint trỏ đúng2897; không dùng server r2 protocol18 ở2887. Không có fixture mutation endpoint trong server chơi thử. Muốn khởi động lại: từ worktree chạy `PORT=2897 NODE_ENV=production node apps/game-server/dist/index.js` (PowerShell dùng `$env:PORT='2897'; $env:NODE_ENV='production'`), và `pnpm --filter @volam/game-client exec vite preview --host 127.0.0.1 --port 5497 --strictPort`.

Tạo phòng, chọn môn phái và xác nhận. Mũi tên di chuyển, A một lần/đòn, QWER cast, Shift lướt; O Võ Công, P Phó Bản, Esc đóng overlay hoặc hỏi rời trận. Mở hai cửa sổ trình duyệt với hai biệt danh để thử lời mời. Boss theo thứ tự Lý Mạc Sầu → Hoàn Nhan Hồng Liệt → Chu Bá Thông → Kim Luân; nút I giải thích mechanism. Trong boss có nút Mời trợ giúp để gửi lại cho người chưa vào.

## Contract đã triển khai

- Quái luôn private, boss luôn shared, server chuẩn hóa cả payload legacy; bỏ selector và nút Đồng Đội Kết Nối. Multiplayer vẫn hoạt động.
- Người chọn boss vào ngay, popup hỏi mời; người nhận chọn vào ngay hoặc ở ngoài. Lời mời hết hạn sau30 giây thực, chỉ gửi tới người đang kết nối và chưa ở boss đó. Reply cũ/hết hạn bị từ chối.
- Khi mọi người đang kết nối đều ở **cùng** boss, đóng băng world ngoài arena: creep/boss invasion, projectile, sát thương lên tượng và đồng hồ. Dungeon tiếp tục chạy. Một người ra ngoài thì resume; vào lại đủ người thì pause lại. Người đang spectator vẫn đang ở dungeon.
- Chết lần đầu trong một lượt boss: tự hồi sau5s tại entry, đầy HP/MP. Chết lần hai: màn xám, mũi tên pan camera, Space về arena. Quay lại vẫn spectator. Lượt hồi sinh gắn identity/attempt, giữ qua ra-vào và transport reconnect; chỉ boss reset mới cấp lại. SDK reconnect trong cửa sổ30s trở về arena chính, giữ identity và ledger. Không bổ sung tài khoản/lưu tiến trình qua phiên mới.
- Một sprite identity/wave quái; wave kế đổi identity. Tốc quái bằng90% movementSpeed thực gồm buff được chụp **mỗi lúc vào**, giữ cố định trong wave, không cập nhật theo buff từng tick. Transfer vẫn dọn status/effect theo contract hiện có.
- Mọi arena boss rộng và dài ×1.1 từ bản trước feedback (diện tích×1.21), gồm collision, bounds, spawn, exit, emitter và scenery. Không dùng zoom để giả kích thước.
- Ca Diệp: caster đứng tại chỗ, windup/contact/recovery; ụ đất bay thẳng, xuyên mọi target trên đường, damage+stun mỗi target một lần/cast. Không nhập thêm cơ chế DOTA. Chữ Phạn: damage lần bước vào đầu mỗi target/cast, đứng yên/ra-vào lại không thêm hit. Field đứng tại chỗ; vùng đốt Kháng Long bám người như tech r2.
- Hồng Liệt A1 có5 projectile thẳng, chung gốc boss và hit group một hit/target/cast; dùng speed600 đang có trong data. Đây là thay đổi từ footprint tức thì cũ sang projectile thật để bind đúng đao bay, được kiểm range/tốc/cleanup. A2 vẫn melee180° trước mặt, không đạn vòng cung.
- Chu giữ body spin/ghost/ring/wind cũ, thêm palm aim một lần khi phóng trong Túy Tiên. Càn Khôn hút toàn arena.15 vòng Âm Dương di chuyển liên tục, bỏ cả large_formation lẫn rotating_waves phủ màn hình. Source cũ được giữ.
- Hoắc Đô giữ nguyên raster nail, scale0.25/pattern/tốc độ; brightness1.6 và bù trục thép từng cel theo review6. Đạt dùng cooldown từng skill và warning ngắn hơn; ward tắt/bật theo owner, không beam chuyển. Kim có wheel tròn nhanh, crescent mới; Truy Hồn7 luân radial bounce20s, Hộ Thể7 ID orbit3s rồi bắn7 hướng.
- Các rework phái, manual A bốn nhịp, Shift8s/charge,10% knockback Võ Đang, vị trí/facing/feet theo checklist. Phất Trần Công không đổi. ID `hoanh_tao_cuoc` và `tam_gioi_quy_thien` giữ tương thích, tên hiển thị lần lượt Ca Diệp Thoái và Sư Tử Hống.

## Tuning thử nghiệm

Tick rate30. Damage dưới đây là base trước rank/stat/defense/crit. Mana và cooldown skill giữ hiện trạng trừ các mục được yêu cầu; số học nằm trong game-data, không lấy từ viewer.

| Mục | Giá trị |
| --- | --- |
| Shift |2 charge,240 tick=8s hồi tuần tự/charge |
| Thiếu Lâm A |4 press, tối thiểu6 tick giữa nhịp; finisher30 tick cooldown; nghỉ60 tick thì bắt đầu30 tick cooldown; crescent38 damage,range300,radius28,speed480 |
| Ca Diệp |42 damage,range420,radius24,speed360; stun36 tick=1.2s; windup9/recovery6 tick |
| Toàn Phong |34 damage,range360,radius28,speed330; xuyên một hit/target |
| Vô Ảnh |17 damage/foot,range260,radius14,speed390; hai volley cách18 tick; mỗi volley3 lane[-18,0,18], lệch3 tick; hướng chụp lúc cast |
| Như Lai |palm120 damage/range210; field36 damage,radius150,90 tick; giữ defensive buff |
| Vi Đà / Tru Tà / Sư Tử |offset63 / range180 / radius210, armor break20 trong180 tick,slow35% trong90 tick |
| Phá Giáp / Vô Cẩu |slam dài240/rộng50; whirl175,final215,duration×1.3 |
| Lý Mạc Sầu |speed115, whisk360 range144, needle864/speed480; rest0.65s;4/6/8 ranged minion (range500/speed300/damage5),tồn tại16s |
| Hồng Liệt |speed130,rest0.35s,A1 range720,A2 range242,warning0.4s,recovery0.2s,CD1.4s |
| Chu |idle speed110,spin X/Y640/400,spin24s giữ nguyên,palm interval33 tick=1.1s |
| Hoắc / Đạt / Kim |movement180/105/145; Kim wheel620,crescent760/radius30/life2s; actor rest0.2s,CD từng skill độc lập |
| Đạt warning/CD |quét0.35/1.5s; đập0.4/4s; ward0.3/4s; boulder0.35/3.2s; tam chấn0.4/5s |

144 mô phỏng đã chạy: `pnpm --filter @volam/game-server exec tsx ../../tools/m3d-feedback-balance.ts`. Báo cáo `artifacts/m3d-feedback-balance-r3.json`; bốn phái, hai A, cấp1/6/15/30,seed42/1337/9001, thêm ba combo Thiếu Lâm.12s/ba target đứng yên/armor5/cùng pressure20. DPS cấp30: Cái Bang683–916, Thiên Sơn761–1193, Võ Đang754–1050, Thiếu Lâm379–988. Các build/đòn có AoE/hit cadence khác nhau; không suy đây là cân bằng chiến dịch, boss clear time, PvP hoặc chơi người thật. Không thay loot/economy để ép các số bằng nhau.

## Asset, selected tags và production binding

- Importer `scripts/prepare-m3d-r3-art.mjs` kiểm approval register và toàn bộ immutable hash trước khi copy: Ca Diệp55 file, Phá Giáp34 file, review6321 file; r2 có guard riêng1004 file. Không sửa raster/atlas/metadata đã khóa.
- Registry `apps/game-client/src/m3d-r3-art.generated.json`:71 component,346 selected tags. Tag/source cũ rút khỏi review được giữ làm lịch sử, không tự chọn lại. Toàn bộ PNG/atlas nguồn và manifest/selected/provenance/handoff trong `assets/m3d-feedback-review-r3/`.
- Phaser đọc action ID/start/until, projectile ID/vị trí/start, area ID/start, status và hit/release/cancel events từ server. Body dùng clock action, projectile không bake path vào atlas. Frame callback không gây damage. R3 painter quản lý layer theo ID, dọn khi cancel/chết/đổi zone/disconnect; stun tách riêng.
- R3 giữ approved feet pivots, left-facing Liệt Phong mirror đúng cutting edge, chuôi trên đầu; smash Vô Cẩu cùng feet-plane,4 chó lửa; Vô Ảnh gốc torso và3 lane; Tru Tà một attached slash; Kim Quang owner giữa trận, sau activation trở về idle/walk.
- Ba concept arena dùng trong menu. Runtime **không** dán concept thành một background giả collision: dùng Tiled ground/collision hiện có, scale1.1, thay17 mapping landmark bằng16 sprite PNG RGBA gốc ở `assets/m3d-r3-arena-production/` (yurt dùng lại cho hai loại lều). Nam/nữ tổ sư, altar, lantern/gate; trại quân đỏ/đen/vàng; pháo đài đá xám với banner Tây Tạng. Nguồn generated một atlas nguyên gốc bằng built-in image_gen85.2s; prompt, SHA, atlas lossless rectangle và provenance được giữ. **Lớp scenery production mới chờ duyệt trong game**, không mượn approval concept để tự duyệt runtime. Các ground tile/phần phụ cũ được giữ, bố cục chưa khớp hoàn toàn concept.

## QA và giới hạn

Final command: `pnpm check:final --config playwright.m3d-r3.config.ts --grep 'r3 |selected r2'`, session **`m3d-r3-final-fixed`**,server2897/client5497/fixture2898, video/trace off: **PASS exit0,619.43s**.522 unit/integration (47 file),18 workflow,15 asset validators, production build,6 browser (485.90s). Timings ở `docs/evidence/sessions/m3d-r3-final-fixed/check-workflow/final-timings.json`. Lượt trước giữ nguyên trong history: fixture dùng access cũ, reset QA thiếu manual-chain deadline và ảnh toàn màn hình trễ pha110ms đã được sửa; không che lỗi hoặc lấy kết quả cũ thay lần chạy cuối.

Sau final chỉ bổ sung tooling chụp bằng chứng: tool typecheck PASS; `node tools/run-playwright.mjs test --config playwright.m3d-r3.config.ts --grep 'r3 still evidence'` session `m3d-r3-stills`: **1 passed/1.1m**. Poll metadata, xuất đúng một canvas PNG khi từng phase cần xem xuất hiện; không chụp luồng frame hoặc đổi clock simulation. Runtime/build/core không đổi; không lặp full suite vì sửa capture-only theo DEVELOPMENT_WORKFLOW.

Đã qua focused core/lifecycle/skill/SDK/art-import tests và live iteration: all revised spells4 facing, boss phase/party/life/camera, hold/blink/burn,6-client invasion combat/rewards. Các fixture chỉ trong QA: build hợp lệ qua changeBuild, vị trí/HP/target, chọn boss phase qua server và kích lịch invasion sớm. Damage/hit/AI/reward vẫn do simulation thật; không tuyên bố đã chạy tự nhiên60 phút hay toàn bộ20 wave.

PNG với HUD/display1280×720 tại normal camera zoom1 và JSON frame/action/phase observations nằm trong `docs/evidence/sessions/m3d-r3-final-fixed/`. 44 cast sửa đổi/4 facing,24 lượt A thuộc6 style trong school report;8 lượt A Võ Đang ở retained-r2 report; manual chain/hold/blink/burn/cleanup và6 client combat/reward. R2 frame report ghi243 clips/845 refs, đúng thứ tự và hai chu kỳ loop. Không suy mọi frame ngắn đều có thể nhìn trong một screenshot.

PNG ngắn đúng frame và3 ảnh landmark bổ sung ở `docs/evidence/sessions/m3d-r3-stills/m3d-r3-gameplay/`. `still-phase-observations.json` ghi: Phá Giáp `impact_left_0` tại984,706,depth690 so với chân1000,700; Liệt Phong `liet_phong_slash_right_0` được mirror để chém trái tại1000,678; Ca Diệp `travel_left_1` tại916,700,origin0.5/0.75. Canvas native640×360, camera zoom1, hiển thị pixel scale2x trong viewport1280×720; PNG canvas giữ nguyên resolution gốc và không chứa HUD DOM. Ảnh page có HUD vẫn được giữ riêng. Target hình khối trong bài trajectory là **dummy QA**, không phải art quái mới. Ảnh landmark dùng vị trí fixture để quan sát kiến trúc/occlusion, không tuyên bố đường đứng fixture luôn là ô đi được.

Đã mở và so PNG thực với preview r3/review6 và reference: vệt Bổng kéo dài trên mặt đất ở bên trái, hilt Thiên Sơn trên đầu trước nhát chém, mound có đầu nổi và di chuyển riêng caster; đủ phase impact/outro trong frame log. Cổ Mộ có hai tượng trắng/altar/đèn ngọc; Hồng Liệt có đại trướng đỏ/đen/vàng; Kim Luân có cổng/tường đá phong hóa và banner. Nhân vật/scenery/VFX giữ góc3/4, các overlay nằm trong viewport. Nền/tỉ lệ crop vẫn khác concept vì giữ tiled ground và camera bình thường; chờ director đánh giá cảm giác nhìn/nhịp đòn trong game, chưa đóng ART-01 hay runtime art approval. Screenshot không thay kiểm chứng motion/authority/multiplayer. Không video/GIF.

Sau khi director duyệt và **merge thật**: cập nhật CONTENT_DATA/COMBAT_SYSTEM/GAME_DESIGN/DECISIONS/BALANCING/ACCEPTANCE_TESTS và bộ nhớ repository từ ledger này. Checklist sau-merge vẫn mở; phiên này không tự merge hoặc tự ghi rằng bước đó đã xong.
