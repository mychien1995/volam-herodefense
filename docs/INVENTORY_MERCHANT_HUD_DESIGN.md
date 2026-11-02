# Merchant, Inventory & Auxiliary HUD — concept v01

Ngày: **2026-11-02**. Trạng thái: **CONCEPT APPROVED** — người dùng: “duyệt, bạn có thể integrate vào phaser không”. Xem [tích hợp runtime UI](INVENTORY_HUD_INTEGRATION.md) cho kết quả và giới hạn; concept approval không tự trở thành runtime approval.

Các ghi chú chưa tích hợp/kiểm thử bên dưới là hồ sơ giai đoạn bàn giao concept ban đầu. Trạng thái triển khai và bằng chứng mới được tách trong báo cáo tích hợp trên.

Người dùng yêu cầu bắt đầu thiết kế HUD cho merchant, inventory và skill phụ. Bộ này đề xuất hình thức và tương tác, dựa trên [inventory v2.0](../ITEMS_AND_CRAFTING.md), [quyết định](../DECISIONS.md), [UI/UX](../UI_UX_SPEC.md) và [chuẩn production art](../ART_PRODUCTION_STANDARD.md). Không thay code, gameplay, protocol hoặc luồng loot hiện tại; không khởi động toàn bộ M4/PvP.

## 1. Bộ concept

Năm PNG tạo bằng **built-in imagegen**, lưu trong [thư mục concept](../assets/concept/inventory-merchant-hud-v01/). Đây là ảnh thiết kế tĩnh, **không phải screenshot của Phaser đang chạy**, atlas hay bằng chứng multiplayer. [Prompt đầy đủ](../assets/concept/inventory-merchant-hud-v01/prompts.md) và [provenance/metadata](../assets/concept/inventory-merchant-hud-v01/manifest.json) đi kèm.

| Ảnh | Màn hình | Nội dung cần duyệt |
| --- | --- | --- |
| [01 — HUD Z](../assets/concept/inventory-merchant-hud-v01/01-auxiliary-hud.png) | Gameplay, tooltip Thanh Tâm | Vị trí Z, phân biệt kỹ năng giày với QWER, cụm bình/túi |
| [02 — Merchant trang bị](../assets/concept/inventory-merchant-hud-v01/02-merchant-equipment.png) | Mua/nâng đồ cơ bản | Bốn món, năm nấc cấp, preview nâng và giá |
| [03 — Merchant bình](../assets/concept/inventory-merchant-hud-v01/03-merchant-potions.png) | Mua bình | Chọn máu/mana, cỡ, số lượng, cooldown 5s |
| [04 — Inventory](../assets/concept/inventory-merchant-hud-v01/04-inventory.png) | Trang bị + hành trang + chi tiết | Đúng bốn ô, nhận diện đồ/ nguyên liệu và nguồn Z |
| [05 — Chế tạo](../assets/concept/inventory-merchant-hud-v01/05-merchant-crafting.png) | Chọn một trong ba nhánh | Công thức, chọn nhánh, nút ghép rõ kết quả |

Giá **120/400/800 vàng**, số vàng **2.450**, HP/MP/EXP, cấp nhân vật, trạng thái tượng/wave, số bình **8/6** và vật phẩm trong ảnh chỉ là fixture bố cục. **Không phải giá, stats hay quà đã được duyệt hoặc dữ liệu server.** Ba cỡ bình và lưới 12 ô chỉ là đề xuất trình bày; không chốt cap 20 theo tổng hay từng loại, backpack capacity hoặc stacking.

## 2. Art readout và hướng chung

Đã xem ảnh thật của world, hub/battle, bốn dungeon, menu dungeon/merchant/inventory, Cái Bang/Võ Đang và các anti-reference. World tích cực có kiến trúc/đá/nước/cây chi tiết, nhân vật chibi đầu lớn nhưng áo/động tác rõ; UI tích cực dùng nền tối, viền kim loại cổ và icon có vật liệu. Anti-reference placeholder có nhân vật/hình khối thô, nền lặp; dashboard cũ làm bản đồ nhỏ vì cột thông tin ngoài game.

Giữ bố cục world từ `assets/concept/clean-arena-concept.png`, dùng menu references để định hướng chất liệu; không đưa reference sheet vào game như atlas. `current_codex_dashboard_anti_reference.png` thực tế là sheet Võ Đang; dashboard đúng nội dung là `wuxia_town_world_reference.png`, theo [reference inventory](../assets/references/README.md). Alias `vo_dang_art_direction_reference.png` không tồn tại; đã xem `vo_dang_character_reference.png` thay thế. `in_game_world_reference.png` hiện tồn tại và đã xem.

- Một viewport toàn màn hình, camera/bản đồ không đổi kích thước khi mở menu.
- Khung sơn tối, viền đồng/vàng cổ; chữ ngà, vàng cho tiền/nút chính, ngọc cho lựa chọn và Z.
- Hoa văn tập trung góc/tiêu đề, vùng đọc dùng nền yên. Giảm độ phát sáng viền khi triển khai để không cạnh tranh với telegraph/VFX.
- Dùng icon thật có silhouette rõ: kiếm, giáp, mũ, giày, bình, nguyên liệu. Không dùng emoji hoặc hình học thay production art.
- Tiếng Việt có dấu đầy đủ. Trong runtime, render chữ/số bằng DOM/font, không bake toàn bộ bảng giá vào PNG.
- Mỗi lần mở một cửa sổ merchant/inventory; pane chi tiết chỉ nằm trong cửa sổ tạm thời. Không có sidebar bên ngoài viewport.

Hero/portrait/world trong ảnh chỉ tạo ngữ cảnh concept, không thay artwork đã giữ hoặc tạo approval mới cho nhân vật/môi trường. Shell/icon mới là concept raster, chưa phải asset riêng có alpha/9-slice/pivot được tích hợp.

## 3. Merchant

Mở từ nút **Thương Gia** hiện có. Đề xuất ba tab **Trang bị / Bình dược / Chế tạo**, dùng cùng shell và vị trí. Vàng ở header, nút X rõ; Escape đóng. Không có tab bán, trade, phụ kiện hoặc roll.

### Trang bị

- Catalogue 2×2 đúng bốn món: Vũ khí, Giáp, Mũ, Giày; mỗi card có icon, cấp hiện tại và năm marker.
- Click chọn card → pane chi tiết trong modal. Hiện cấp hiện tại → cấp sau, chênh lệch chỉ số từ catalogue server và giá.
- Chưa sở hữu: nút **Mua · [giá] vàng**, preview cấp 1. Đang cấp 1–4: **Nâng cấp · [giá] vàng**; giải thích ngắn “Mua lại tăng 1 cấp”.
- Cấp 5: nhãn **Tối đa**, không hiển thị cấp 6; có lối sang tab Chế tạo chọn đúng ô. Đổi nhánh/đồ ghép chưa chốt, không tự cho mua lại để reset nhánh.
- Không dùng rarity màu hoặc yêu cầu môn phái chưa có trong spec. Giá/stat chưa được backend hỗ trợ thì nút không gửi giao dịch, không tự trừ vàng ở client.

### Bình dược

- Hai lựa chọn máu/mana; chọn cỡ, số lượng và xem tổng tiền. Ba cỡ trong ảnh là đề xuất, data có thể đổi.
- Hiện lượng hồi thực từ catalogue khi được chốt, số đang mang và cooldown **5 giây**. Không ghi “dùng chung” hay “riêng” trước khi chốt.
- Stepper tăng/giảm số lượng, không mặc định mua stack 20. Kiểm tra sức chứa theo policy server sau này; chưa vẽ chỉ số `14/20` để tránh tự chốt cap tổng.
- Trong dungeon: giữ menu có thể xem nếu mở được, nút mua bình khóa với lý do **Không mua bình trong phó bản**. Không tự teleport hoặc mở giao dịch ở dungeon.
- Chưa tự gán phím uống bình. Icon trên HUD không khẳng định click-use là hành vi đã duyệt.

### Chế tạo

- Chọn một trong bốn ô → thấy đúng món cấp 5 + nguyên liệu boss + vàng.
- Hiện ba card nhánh, mỗi card có icon, mô tả ngắn, thay đổi chỉ số khi catalogue có; chỉ một card được chọn, có check và border để không dựa vào màu riêng.
- Nút chính ghi kết quả: **Chế tạo Thanh Tâm** trong ví dụ giày, không chỉ “OK”. Mở tab không tự chọn/tiêu nguyên liệu qua backend.
- Thiếu món cấp 5/nguyên liệu/vàng: đánh dấu đúng điều kiện thiếu và khóa nút; không tự chọn vật phẩm khác làm nguyên liệu.
- Không hiển thị tỉ lệ thành công, hoàn nguyên, đổi nhánh hay nâng đồ ghép khi những chính sách này chưa chốt.
- Khi triển khai cần thể hiện đúng cả bốn recipe và 12 nhánh từ inventory spec, không đổi Xuyên giáp thành stun hoặc Thanh Tâm thành hồi máu.

## 4. Inventory

Mở từ **Túi đồ** hiện có; chưa thêm phím I. Cửa sổ chia trang bị bên trái, hành trang và chi tiết bên phải, tất cả bên trong viewport.

- Nhân vật nhỏ ở giữa bốn ô **Vũ khí/Giáp/Mũ/Giày**; mỗi ô có nhãn, icon và cấp hợp lệ. Không có Dây Chuyền.
- Giày ghép có badge Z, không tạo cấp 6 hay ô kỹ năng QWER mới. Chọn giày hiện đặc tính được cấp: ví dụ **Thanh Tâm · Z**.
- Hành trang hiển thị lượng stack và lựa chọn vật phẩm; lưới 4×3 trong ảnh chỉ kiểm tra mật độ, không chốt dung lượng túi.
- Ngọc Uyên Ương có hình đôi ngọc nhưng là **nguyên liệu**, không phải dây chuyền để mặc. Tooltip phải ghi loại và recipe đúng. Đại Kim Chiến Giáp trong túi là nguyên liệu của recipe giáp.
- Long Châu hiện thông tin boss nguồn/đã nhận/đã dùng khi model dữ liệu có; chưa thêm nút “Dùng” chạy thật trước khi chốt thao tác/công thức stats.
- Chi tiết vật phẩm có nguồn, loại, cấp, mô tả và trạng thái **Đang trang bị** hoặc hành động hợp lệ từ server. Không hiện bán/thả/trao đổi hoặc nút hủy chưa chốt.
- Chỉ số nhân vật lấy từ server; ảnh chỉ đặt label, tránh chốt số. Xem inventory không tự cho phép đổi đồ ở dungeon/PvP.

## 5. HUD skill phụ Z

Giữ A/QWER giữa đáy viewport. Z là ô riêng cùng cỡ hoặc nhỏ hơn một chút, tách một khoảng ngắn về bên phải, nhấn bằng viền ngọc. Đây là **kỹ năng từ giày**, không học bằng điểm võ học và không chiếm bốn ô QWER.

- Thanh Tâm: sen/ngọc và dòng giải slow/độc/đốt; không suy ra giải stun hay miễn nhiễm.
- Blink: bước gió/mũi dịch chuyển; không có vòng target chuột hoặc dấu hiệu xuyên tường.
- Phi châm: motif kim châm bay thẳng, một projectile theo spec; không diễn giải icon nhiều nét thành nhiều phát bắn.
- Tooltip chỉ xuất hiện khi hover/focus, không thường trực che đường đánh. Bản 01 cố ý mở tooltip để duyệt.

| State cần thể hiện khi triển khai | Hiển thị | Tương tác |
| --- | --- | --- |
| Chưa có giày ghép cấp Z | Ô tối, silhouette/nhãn chưa có kỹ năng từ giày | Không cast |
| Sẵn sàng | Icon rõ, keycap Z, tooltip tên/nguồn/mô tả | Gửi ý định Z; server quyết định |
| Đang hồi | Overlay tối theo tiến độ và số giây, giữ keycap | Không giả cooldown dựa trên animation |
| Không thể dùng | Icon giảm sáng, lý do theo trạng thái server | Không gửi lặp khi modal sở hữu input |
| Mất kết nối/đang đồng bộ | Trạng thái chờ rõ, không giả “Sẵn sàng” | Chờ state đáng tin cậy |

Chỉ trạng thái **Sẵn sàng** được vẽ trong PNG v01; các state khác là yêu cầu thiết kế chưa có screenshot/runtime proof. PvP chưa chốt loại Z/đồ/Long Châu, nên chưa thiết kế trạng thái khóa PvP như một luật đã duyệt. Đổi đồ không được dùng để xóa cooldown; con số cooldown và luật silence/disarm/stun với item Z còn cần định nghĩa.

## 6. Modal, phản hồi và responsive — đề xuất để triển khai

- Trên desktop rộng, merchant/inventory khoảng 62–70% chiều rộng viewport, nằm giữa HUD trên và hotbar dưới. World còn thấy ở mọi phía; không reflow canvas.
- X/ESC đóng, trả focus về nút mở. Tab/Shift+Tab ở trong modal. UI giữ quyền pointer/keyboard, không cho click mua biến thành world click hoặc Arrow/A/QWER/Z cast nhầm. Không chiếm input khi gõ text.
- Match vẫn chạy. Cảnh báo xâm lăng/tượng nguy cấp đặt ở layer trên modal, không bị che bởi shell. Không ghi “đã tạm dừng”.
- Phản hồi mua/nâng/ghép chỉ xác nhận sau server ack/state mới. Pending khóa đúng nút để chống double click; lỗi giữ lựa chọn và hiện lý do ngay cạnh hành động.
- Không hiển thị “Giao dịch thành công” hoặc thay gold/slot bằng dữ liệu demo trong game thật.
- Mục tiêu bố cục: 1920×1080 và 1280×720; tại 944×466 giảm padding/header, cho nội dung modal cuộn, neo nút đóng và giữ cảnh báo. Chế tạo có thể chuyển ba card thành danh sách cuộn. Không chỉ thu nhỏ cả PNG/chữ đến mức khó đọc.
- PNG v01 là canvas rộng cố định; chưa có kiểm chứng layout responsive thật, font, focus trap hoặc live input. Các mục trên phải kiểm tra trong client khi triển khai.

## 7. Rà soát concept và giới hạn

Đã xem trực tiếp năm ảnh tạo ra: modal ở trong world, giữ hotbar/utility, inventory đúng bốn ô và không có bán/roll; merchant đúng catalogue; crafting đúng ba nhánh giày; Thanh Tâm liên kết icon Z với giày. Đã kiểm tra file PNG/metadata/provenance và link tài liệu, không tạo recording.

Các điểm còn cần refinement trước production: shell/viền ngọc hơi sáng; đồng bộ hình dáng/màu icon cơ bản với đồ đã mặc giữa các ảnh; Phi châm trong card dùng motif nhiều kim nhưng gameplay chỉ một kim; thay ảnh nhân vật minh họa bằng sprite/portrait được giữ trong client. Không cắt trực tiếp toàn bộ ảnh thành menu game. Phải xuất frame/icon gốc độc lập, render copy/số qua UI và kiểm tra live Phaser ở gameplay zoom.

Không chạy `pnpm check:final` vì không có thay đổi code/runtime/asset integration. Chưa có browser/gameplay test, motion timing hoặc director runtime art approval cho bộ UI này. Khi triển khai client: dùng [workflow](DEVELOPMENT_WORKFLOW.md) và game-playtest, kiểm tra hai client, keyboard/modal, cập nhật state thật, PNG ở viewport mục tiêu và tương tác VFX/telegraph; báo riêng trạng thái concept/art/runtime approval.

## 8. Bước tiếp theo sau vòng duyệt thiết kế

Refine shell/icon/bố cục theo feedback; sau đó tách asset UI và triển khai frontend có state binding thật. Những chức năng inventory chưa có backend phải có trạng thái chưa khả dụng rõ ràng. Migration phần thưởng boss, bình, trang bị/crafting và PvP là phạm vi triển khai riêng; không phát sinh từ việc duyệt ảnh concept.
