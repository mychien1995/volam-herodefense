# Thiên Sơn Phiến/Đao — thống nhất sprite, đợt3

`wip/m3d/25d`, 2026-11-19. Director đã duyệt cả Võ Đang trong chat. Khóa thêm12 file Quyền/Kiếm; cùng Chưởng/Bổng có24 byte locks đã kiểm chứng. Không xuất lại artwork approved. Hai nhánh Thiên Sơn là **candidate chờ director review PNG/normal zoom** trước Thiếu Lâm.

## Phạm vi và artwork

Baseline Phaser tái hiện ba nguồn xen nhau cho từng nhánh: `hero-motion`, `hero-finish`, rồi `renovated-action-v2:thien_son_throw` hoặc `tam-lien-poses`. Candidate dùng `hero-unified:thien_son_phien` / `hero-unified:thien_son_dao` cho idle, walk, A, QWERT, hurt/stun/status, chết và hồi sinh; portrait cùng neutral master. Không đổi HUD geometry hoặc F8.

Phiến giữ tóc dài/búi cao/cài ngọc, dải trắng, áo thêu trắng/xanh xám và quạt gấp mây xanh. Đao giữ Hàn Nguyệt bạc cong, chắn tay ngọc, tóc/nơ trắng và áo trắng/đai xanh xám từ artwork nét hiện có. Đã xem nguồn throw, Hàn Nguyệt locomotion/attack, Tam Liên poses và screenshot game thật. File reference bắt buộc `thien_son_thieu_lam_character_reference.png` thực tế là cảnh thị trấn, không phải character sheet; ghi đúng nội dung và dùng nguồn nhân vật hiện hành làm identity master. Anti-reference placeholder cũng đã xem. Các chuẩn arena/HUD không đổi được tái sử dụng theo scoped-reference policy.

224 cel Phiến +256 cel Đao, tám hướng mỗi nhánh; tổng480 cel/80 tag Aseprite đúng range/duration. Canvas320×288, foot160/224, scale0.5. Bốn idle thở/chớp mắt/vải và bốn walk có bước chân thật. Pose library giữ động tác riêng, không dùng một pose cast cho mọi chiêu. Built-in imagegen, exact prompts, UTC intervals, raw gốc, selection/override hashes, provenance và `.aseprite` được giữ; không video.

Giữ26 cel pilot Phiến hợp lệ, thay riêng hai cel chạm mép bằng hai bản vẽ mới. Hai pose hướng lên vốn quay nhầm mặt được vẽ lại ở back view. Đao sửa riêng hai cel dính ở down và idle3-up bị thấp tỷ lệ. Các source separator chỉ phục vụ tách hai phần lỗi đã được override hoàn toàn; không sửa pixel các cel hợp lệ. Root/scale tính theo cơ thể và giày, không theo độ vươn quạt/đao. Nguồn repair độ phân giải khác được register riêng về bodyHeight89. Phiến giữ visible extent tolerance3; dense-head heuristic có tolerance3.5 vì quạt/ribbon làm đổi threshold (đo max3.37, extent thật≤2). Đao sửa physical idle3-up từ85.61 về89; extent cho phép4 do mép đế giày/búi tóc, physical tolerance3 vẫn giữ. Alpha/canvas/trim/hash guards không bỏ.

## Tích hợp và choreography

Renderer Phiến dùng server action clock và native visual duration cho mở–ném–thu quạt. Pilot phát hiện đọc `Sprite.anims` làm lặp cel0 sau khi đổi texture; đã sửa trước khi mở các hướng còn lại. Đao đọc controller native tick-driven để giữ ba thế A do server RNG chọn và ba pass Tam Liên. Liệt Phong giữ hilt giơ trên đầu, contact/recovery theo clock và bốn hướng cardinal giống native VFX; các hướng input chéo dùng cardinal tương ứng. Những hành động khác và locomotion có tám hướng mới.

Bốn bóng chữ X của Bách Liệt dùng chính atlas Đao mới, ready/windup/sweep/follow, chân/depth theo vị trí cũ, scale0.5 gần kích thước body cũ. Giữ offset112/66, fade của bóng và fade có chủ đích của caster, số đợt/crescents, lifetime và cleanup. Không đổi VFX raster, hit geometry, targeting, RNG, movement, cooldown, mana, server/core/protocol hoặc gameplay. Tam Liên vẫn tích6 hit thật rồi bấm **S**; Q vẫn là Phi Ảnh Trảm.

Atlas mới khoảng17.92MiB RGBA tổng, thay21MiB R5/R6 và bỏ atlas shadow body cũ khoảng0.40MiB khi bộ mới đủ tám hướng; giảm khoảng3.48MiB cho nhóm này. Không gọi đây là tổng GPU memory hoặc cam kết FPS. Các atlas native còn phục vụ cue/VFX vẫn giữ.

## Kiểm chứng có phạm vi

`pnpm check:quick tests/thien-son-unified-policy.test.ts tests/vo-dang-unified-policy.test.ts tests/unified-hero-policy.test.ts tests/cai-bang-chuong-body.test.ts`:23 PASS/4 file. Sau sửa sampler spin theo native visual duration, focused Thiên Sơn7 PASS; tổng24 case khác nhau. Typecheck client và tools/tests PASS. Hai native validators PASS480 cel/80 tag, exact alpha/visible RGB roundtrip, bounds/trim/public copies, body/alpha checks và24 approved locks.

Browser: `node tools/run-playwright.mjs test --config playwright.hero-coherence-batch3.config.ts`, production bundle `.cache/hero-coherence-batch3-dist`, ports3002/5602, env `VOLAM_QA_SESSION`, `VOLAM_QA_SERVER_PORT`, `VOLAM_QA_CLIENT_PORT`, `VOLAM_HERO_BRANCH`, `VOLAM_CHUONG_PLAYERS`, stage/directions theo report. Video/trace off. Pilot hai người down-right + contact assertion PASS trước bulk; iteration hai người down-right/up-left hoàn thành các idle/walk/A/QWERT và10 case phản ứng/hồi sinh mỗi nhánh, không suy rộng từ hai hướng.

Phiến iteration PASS gồm bốn beat A và projectile_return thật, spin, E phóng/thu và trở lại idle. Đao iteration hoàn thành hai hướng/action/reactions rồi FAIL trong helper Tam Liên vì dùng nhầm Q. Một retry còn bắt sai giả định6 A phải đủ3 variant RNG. Đổi helper về phímS, chờ client inventory ready, dùng6 hit thật mởS; nếu còn thiếu variant thì quan sát thêm A thật riêng sau Tam Liên, không đổi RNG/gameplay. Extras-S hai người PASS ba pass, E lùi không quay mặt, bốn bóng cùng atlas/đúng hướng/offset/fade/cleanup. Giữ các report FAIL gốc; không relabel PASS. Không rebuild chỉ vì helper/report edits.

Crowd dùng96 server-owned stationary high-HP targets với phím và hit thật; không nhận là kiểm tra AI/rewards hay sửa legacy creep fallback. HP đối chiếu state serialized cùng tick, tolerance0.001, không so với HP live đã hồi thêm. Chỉ kiểm tra liên quan, không chạy full balance/gameplay suite.

[Summary và command scope](evidence/sessions/hero-coherence-batch3-delivery/summary.json). PNG là game thật, crop giữ nguyên pixel không repaint/sharpen; các cột là thời điểm độc lập. Dừng đợt3 để director xem trước đợt4 Thiếu Lâm Quyền/Đao.

Final sáu người PASS cả hai nhánh trong cùng invocation: mỗi nhánh8 idle/8 walk,48 nhóm A/QWERT×6=288 lệnh có ack,40 reaction/natural arena respawn, choreography riêng, F8/portrait và crowd. Phiến102 hit, median16.6ms/p95 19.1ms; Đao132 hit, median16.8ms/p95 19.2ms. Cả sáu body đủ trong viewport. Đây là mẫu chẩn đoán sáu browser context.

PNG [Phiến trước–sau](evidence/sessions/hero-coherence-batch3-delivery/phien-before-after.png), [Đao trước–sau](evidence/sessions/hero-coherence-batch3-delivery/dao-before-after.png), [bốn bóng](evidence/sessions/hero-coherence-batch3-delivery/four-shadows.png), [Tam Liên](evidence/sessions/hero-coherence-batch3-delivery/tam-lien-cross.png).

## Phòng review

[http://127.0.0.1:5603/?debug=1](http://127.0.0.1:5603/?debug=1), room `00bQVpdpO` lúc bàn giao. Thiên Sơn Phiến30, QWERT rank4, F8 ON/OFF đã kiểm tra, không lỗi client. Review server cũng cấp30/rank4 khi chọn Thiên Sơn Đao qua lobby và tạo phòng mới; A/QWERT/S, mana và cooldown vẫn bình thường. Fixture chỉ trong `tools/presentation-hero-play.mjs`, không đổi Room production. Backend3002 dùng đúng production bundle của QA; không đóng/điều khiển các phòng Cái Bang/Võ Đang cũ. [PNG có HUD](evidence/sessions/hero-coherence-batch3-delivery/room-ready.png).

Phòng đầu đã hết trận khi lưu evidence; launcher mở phòng mới qua lobby thật với profile riêng trước bàn giao. Chỉ sửa tool chọn browser profile, không đổi trận production hoặc chạy lại suite chỉ vì ảnh/report.

Director approval 2026-11-19: user đã duyệt Thiên Sơn và cho phép hoàn thiện tất cả hệ phái còn lại mà không chờ duyệt từng đợt. Hai bộ Thiên Sơn được khóa sáu file/bộ trong assets/approvals/hero-coherence; các mốc dừng trong báo cáo trên là lịch sử.
