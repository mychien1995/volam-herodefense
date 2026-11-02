# Bàn giao feedback sau integration r3

Branch `wip/m3d/feedback-integration`, nền `7c0eab15`. Không merge `milestone/m3d`. Ledger đầy đủ ở `M3D_PLAYTEST_FEEDBACK_2026-11-02.md`; phần sau integration supersede các con số tương ứng của handoff r3 trước.

## Thay đổi để chơi thử

- Creep private có speed bằng **72% tốc thực của người vào** gồm buff (90% cũ giảm tiếp 20%). Giãn footprint bằng spatial hash deterministic trên server, không dùng RNG combat; không vượt giới hạn di chuyển/tick và tôn trọng stun/slow/collision. Đây là soft separation: sprite vẫn có thể che nhau một phần, không hard-block lối đi.
- File `packages/game-data/src/boss-cadence.json` chỉnh nhịp bốn boss/đệ tử, đơn vị giây, validate lúc load. Hướng dẫn `M3D_BOSS_CADENCE.md`. Lý Mạc Sầu nghỉ 1,2s, fallback basic 1,8s, cooldown châm 4s. Các thông số timing khác ban đầu lấy đúng data hiện tại. Damage/range không lấy từ preview.
- Solo không popup gọi người hoặc nút mời. Chết lần đầu tự hồi sau 5s như cũ; lần thứ hai tự về arena chính đầy HP/MP. Ledger vẫn exhausted đến boss reset, không được ra/vào hoặc reconnect để cấp thêm lượt. Multiplayer giữ spectator/camera/lời mời/pause đã duyệt.
- Hỏa Pháo Thiên La chạy bộ lịch riêng sau windup; Hồng Liệt dùng A1/A2 và di chuyển trong khoảng nghỉ. Hết lượt/cancel khi arena trống/boss chết/reset sẽ dọn lịch pháo cùng owned effects.
- Chữ I căn giữa glyph bằng grid/padding0. Card Chu Bá Thông dùng bản arena assembly gốc sạch, không portrait hoặc ảnh review có UI.
- Tiểu đồng đưa rượu là creep combat thật, 40HP/defense0, không thưởng XP/gold/item. Di chuyển về boss, có HP label; giết được bằng A/skill và rơi đúng một bình tại nơi chết. Đứng trong 64px bấm Space để uống, server tiêu thụ nguyên tử; bình tồn tại 30s. Theo quyết định bổ sung của director: Chu phòng thủ cao, rượu giúp xuyên một phần lớp phòng thủ. Bộ số thử: defense180 giảm64,3% damage trước các effect khác; Tửu lực12s bỏ qua70% defense (còn54, giảm35,1%). Đòn100 raw thành36 không rượu/65 có rượu, trước crit/round khác. Không có buff attack toàn cục, không tác dụng lên creep/PvP/boss khác. Refresh không stack; ưu tiên mức xuyên mạnh nhất với skill, không cộng vượt trần. VFX consume rồi aura và nhãn thời lượng; dọn khi chết/đổi vùng/reset. Không heal/immunity hoặc thay loot roll. Thông số nằm trong `chuBaThongTuning`, chờ test cảm giác.
- Càn Khôn Phản Chấn pull60→120px/s. Shift bị từ chối trong phase reflect, không tốn charge.
- Phá Giáp Bổng đã có hit theo vector thật; ground VFX nay quay theo vector chéo. Body tiếp tục bốn facing gần nhất từ atlas khóa; không sửa raster/pivot/selected tags.
- Vi Đà offset63→189px; Toàn Phong range360→234, Ca Diệp420→273. Speed, damage, stun, cooldown giữ nguyên. Ca Diệp vẫn xuyên tất cả mục tiêu một hit+stun/target/cast.
- Vô Ảnh thiếu chuỗi Phát Động B đúng target phía trước chỉ một chân ở tâm thân. Chuỗi còn hạn/target sống/đúng đường phía trước giữ mẫu sáu chân hai volley. Damage empowered vẫn xác nhận trên hit thật; không trao empowerment chỉ vì bấm cast.
- Như Lai Buddha scale×2; anchor/feet và palm/field gameplay giữ nguyên. Sư Tử Hống dùng icon lion mới 64×64; ID tương thích `tam_gioi_quy_thien`.

## Asset và authority

Không sửa asset khóa r2/r3/Chu hoặc tự cấp director approval. Icon mới có source raster gốc, prompt và SHA tại `assets/m3d-playtest-followup/`; status **chờ director duyệt trong game**. Wine VFX/bottle dùng source gốc đã tồn tại, không sửa; không gán approval lock Chu cho các file wine vốn ngoài lock đó. `import-manifest.json` pin toàn bộ input mới được import, được kiểm trước copy. Handoff của asset gốc vẫn giữ nguyên.

Phaser dùng state/event thật; wine pickup và cadence đều do server quyết định. Protocol20 thêm action `interact` để Space uống, không có client-submitted vị trí/damage/stat. Source generated wine registry chỉ ánh xạ atlas/tag/pivot. Không tạo video/GIF.

## Kiểm chứng

`pnpm check:final --config playwright.m3d-followup.config.ts --grep 'followup|r3 production multiplayer'`, session `m3d-followup-final-wine`: typecheck projects/tools PASS, 18 workflow PASS, **533 unit/integration /48 file PASS**, production build PASS, **15 asset validators PASS**. Browser qua3/4 (pack, hai client boss/VFX, sáu client natural combat/rewards), dừng ở một lần click xác nhận chọn phái không được server ghi nhận. Tổng lượt đó379,55s, browser196,40s; không ghi đè report FAIL thành PASS.

Chỉ sửa test helper chờ server xác nhận và retry UI khi chưa có acknowledgement; không gửi lobby action qua fixture hoặc bỏ assertion. Tool typecheck PASS. Theo DEVELOPMENT_WORKFLOW, chạy lại browser stage cùng production bundle thay vì lặp full core/build/validators đã qua: `node tools/run-playwright.mjs test --config playwright.m3d-followup.config.ts --grep 'followup|r3 production multiplayer'`, session **`m3d-followup-browser-ack`**, ports2997/5597/2998, **4 passed /3,1m /exit0**, gồm private pack, solo, hai client boss/VFX và sáu client natural combat/rewards. Đây là kết quả kiểm chứng cuối của code hiện tại qua các stage hợp lệ; không tuyên bố có một lượt check:final exit0 sau sửa helper. Các iteration trước được giữ, gồm fixture vị trí Vi Đà/protocol version cũ, click/focus và kill-state acknowledgement; không lấy kết quả cũ thay lần cuối.

Quan sát PNG/animation thực ở zoom1: ground impact Phá Giáp `impact_right_0` quay0,785398rad, placement857/666 từ chân850/650, depth640; canvas640×360 hiển thị pixel scale2×. Đúng một canvas PNG tại pha ngắn, không stream frame. Buddha scale2, ảnh cho thấy tượng lớn sau động tác caster và có che nhân vật trong activation. Menu có chữ I ở giữa nút, card Chu là arena; giữ full viewport và overlay trong viewport, so với positive world reference và baseline r3.

Hai client đều quan sát đủ4 frame của `carry_walk_left/right`, `pickup_glow`, `consume`, `player_buff`; target có HP thật, A giết và drop/pickup nguyên tử. Tửu lực có nhãn12s; ra vùng dọn sprite/label, gameplay buff do server kiểm tra trên hit. Pack6 creep cùng điểm do fixture setup, AI và separation chạy thật4s: khoảng cách chân nhỏ nhất24,000003px; PNG cho thấy nhiều đầu/thân/tail riêng, sprite vẫn che nhau một phần và cây foreground có thể che nhóm. Không tuyên bố hard collision hoặc hết mọi overlap hình vẽ. PNG và JSON observations tại các session `m3d-followup-final-wine`, `m3d-followup-wine-iteration`; final retry có session riêng. Không video/GIF.

Mô phỏng: `VOLAM_BALANCE_OUTPUT=m3d-feedback-balance-followup.json pnpm --filter @volam/game-server exec tsx ../../tools/m3d-feedback-balance.ts`, 144 run, bốn phái/hai A/cấp1,6,15,30/seed42,1337,9001 và ba nhánh combo Thiếu Lâm. Output riêng `artifacts/m3d-feedback-balance-followup.json`. 12s, ba target đứng yên armor5 cùng external pressure20; đây là probe range/combo, không tuyên bố balance chiến dịch/boss/PvP. Vi Đà xa hơn làm build đánh mục tiêu đứng sát bị hụt: đó là phạm vi test, không tự tăng damage để ép DPS bằng nhau.

Sau **merge thật**, cập nhật canonical skill MD/spec và bộ nhớ repository theo ledger. Checklist sau-merge vẫn mở.

## Chơi thử

Client `http://127.0.0.1:5597/`, production server2997, protocol20, runId `m3d-followup-director-review`. Tạo phòng mới sau khi reload; không dùng phòng cũ protocol19. Nút P mở phó bản, I xem mechanism; đánh tiểu đồng rồi đứng gần bình và Space uống. Server chơi thử không có endpoint fixture mutation. Restart từ worktree: PowerShell `$env:PORT='2997'; $env:NODE_ENV='production'; node apps/game-server/dist/index.js`; client `pnpm --filter @volam/game-client exec vite preview --host 127.0.0.1 --port 5597 --strictPort`. Sửa cadence JSON cần build/restart như hướng dẫn, không hot reload phòng đang chạy.
