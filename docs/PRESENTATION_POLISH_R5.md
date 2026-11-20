# R5 — chuyển động, avatar và animation người chơi

Worktree `wip/m3d/25d`, ngày2026-11-19. Không đổi game-core/server authority, tốc độ thực, tầm/damage/cooldown, HUD geometry hoặc control. F8 tiếp tục tắt/bật lớp ánh sáng/bóng; motion và avatar mới dùng ở cả hai trạng thái.

## Chẩn đoán và sửa

- Đi ngang arena thực ở viewport1920x900 có FPS quanh60 khi F8 OFF/ON, nhưng vị trí người chơi cũ/camera bị làm tròn, và nhận trực tiếp các bước prediction tái bám patch. Độ dao động vận tốc chân đo được khoảng105–109world-unit/s quanh tốc độ160. Dùng cùng nội suy liên tục45ms của các sprite mới cho mọi người chơi, bỏ làm tròn vị trí/camera local. Giữ nguyên prediction bounded, collision và state server.
- Chân dung HUD Cái Bang lấy PNG idle cũ, trong khi world dùng atlas khác; hai nhánh Thiếu Lâm còn dùng chung hình. Tạo14 portrait và14 full-body thumbnail từ bộ sprite runtime tương ứng; dùng chung mapping cho HUD, paper doll, dungeon avatar và school selection. Không thay skill icons thành ảnh nhân vật. CSS không đổi khung/geometry; ảnh portrait/full-body tách riêng. Portrait lấy figure đã duyệt để giữ nhận diện.
- Audit cả14 nhánh: không có diagonal locomotion;13 nhánh chỉ có1 cel idle/hướng, Côn Luân Thiên Sư có2. Không thể sửa bằng bật một animation bị tắt.
- Built-in imagegen tạo14 bộ pose nguyên bản theo master đang chơi:8 facing/nhánh,32 cel/nhánh (448 cel), gồm4 vị trí stride/neutral và idle mở mắt/chớp mắt-vải thở. Walk dùng neutral mở mắt lặp lại ở giữa để không chớp mắt mỗi bước. Idle có2 cel thật theo chu kỳ2.48s, lệch pha theo nhân vật. Không scale/rotate nguyên ảnh tĩnh để giả idle/đi chéo.
- Nhịp A/kỹ năng/hurt/death và các dạng biến thân/flight/counter giữ renderer cũ. Thiếu Lâm Đao có guard riêng cho idle/walk trong renderer dùng chung body/action. Bóng mới nhận đúng8 facing/pivot của motion; cache có giới hạn.

## Nguồn và xuất

[Manifest](../assets/source/hero-motion-v1/manifest.json), [nguồn art](../assets/source/hero-motion-v1/raw), [prompt](../assets/source/hero-motion-v1/prompts), [14 nguồn Aseprite editable](../assets/source/hero-motion-v1/editable), [PNG/JSON motion](../assets/exports/hero-motion-v1), [portrait PNG](../assets/exports/player-portraits-v1).

`python -X utf8 tools/export-hero-motion.py` xuất PNG/JSON và avatar. Các hàng của ảnh sinh có khoảng cách hơi khác nhau, nên parser tìm khoảng alpha rỗng giữa8 hàng thay vì cắt đều và làm mất vài pixel chân. Giữ alpha viền; bỏ nhiễu alpha<4. Căn chân chung(64,132) trong canvas128x144; giữ chiều cao body theo master cũ, scale0.5. [Kiểm tra output](../assets/source/hero-motion-v1/validation.json) và [mép nguồn](../assets/source/hero-motion-v1/source-edge-report.json) đều PASS. Uniform-grid diagnostic được giữ riêng, không đổi nhãn lỗi cũ.

`Aseprite -b --script-param root=<worktree> --script assets/source/hero-motion-v1/make-editable.lua` dựng nguồn48 frame/16 tag (8 idle +8 walk), từ cel runtime đã kiểm chứng. Hash14 nguồn editable và master gốc đã đối chiếu. Không ghi đè các PNG/JSON/source đã duyệt trước đây. Artwork mới còn là prototype, chưa tự coi là director-approved.

## Kiểm chứng thực chạy

- `pnpm exec tsc -b apps/game-client`: PASS.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS.
- Build production riêng `.cache/polish-dist` với endpoint2968: PASS.
- Baseline browser `polish-motion-before`:2 client, đi450world-unit qua arena bằng phím thật, peer xác nhận, F8 OFF/ON. [Raw samples](evidence/sessions/polish-motion-before/presentation-polish/motion.json).
- Browser cuối `polish-final`:6 client,14 nhánh,112 hướng đi,112 hướng idle (mỗi hướng thấy2 cel thật),14 đòn A có server event/hit và peer cùng HP; F8 OFF/ON, avatar path mới. **PASS**, test2.3 phút/tổng runner2.4 phút. [Report](evidence/sessions/polish-final/presentation-polish/motion.json), [summary](evidence/sessions/polish-final/presentation-polish/summary.json).
- Jitter vận tốc OFF109.16→32.77 (giảm70.0%), ON104.61→34.78 (giảm66.8%); khung đứng khựng trong quãng đo OFF5→0, ON1→0. Median frame16.7ms, p95 khoảng18.2–18.3ms sau sửa. Đây là mẫu đi lại arena trên máy QA, không phải cam kết mọi GPU hay cảnh giao chiến dày.
- Hai lần vào trận ban đầu hết thời gian xác nhận khi art loader còn chạy. Diagnostic thấy907–954 file tải tiến đều,0 lỗi file. Profile này chờ có giới hạn120s cho art readiness; default của profile khác giữ nguyên30s. Không sửa gameplay để test qua. Không chạy lại full balance/unit suite. Không ghi video.

## PNG trong game thật

- [Trước sửa, di chuyển F8 ON](evidence/sessions/polish-motion-before/presentation-polish/moving-on.png).
- [Sau sửa, di chuyển F8 ON](evidence/sessions/polish-final/presentation-polish/moving-on.png).
- [Party đang/ vừa đi chéo](evidence/sessions/polish-final/presentation-polish/party-diagonal.png).
- [14 chân dung mới](../assets/source/hero-motion-v1/portrait-contact.png).

Reference đã xem: screenshot người dùng, master runtime14 nhánh, in_game_world_reference, vo_dang_character_reference và current_game_2026_10_29_placeholder_anti_reference. File current_codex_dashboard_anti_reference hiện chứa sheet Võ Đang, nên không dùng nó làm benchmark dashboard; bản placeholder negative mới được dùng đúng vai trò.

Phiên chơi R5 mở riêng tại `http://127.0.0.1:5571/?debug=1`, server2971: Cái Bang Chưởng cấp30, cả5 kỹ năng rank4, F8 bật/tắt. Cửa sổ cũ và code gameplay được giữ nguyên.

## Tiếp nối

R6 bổ sung pose hành động chéo, idle4 cel và lượt QA tải nặng/map/biến thân. Xem [PRESENTATION_FINISH_R6.md](PRESENTATION_FINISH_R6.md). Các số liệu R5 ở trên là baseline lịch sử, không đổi nhãn hay thay bằng kết quả R6.
