# Inventory, Merchant, Items & Crafting Specification v2.0

Cập nhật **2026-11-02**, từ các quyết định brainstorm inventory/merchant của người dùng. **Checkpoint mới:** người dùng đã duyệt runtime UI và ủy quyền tự gắn giá mua thử. Mua/nâng bốn đồ cơ bản và mua/dùng bình được triển khai theo [ECONOMY_TRIAL.md](docs/ECONOMY_TRIAL.md): 20 bình tổng, cooldown chung5s, hồi tức thì, giá/chỉ số tạm ở game-data. Các câu hỏi ở mục2–3 bên dưới đã có lựa chọn thử nghiệm trong phạm vi này, vẫn có thể revise. Phần đồ ghép/Z, thưởng boss/Long Châu và PvP còn là thiết kế; backend boss/roll/pending claim chưa được chuyển sang v2. Không coi checkpoint này là hoàn tất M4.

Quyết định đã chốt đăng ký tại [DECISIONS.md](DECISIONS.md). Bản này thay thế thiết kế loot ngẫu nhiên một món cho cả đội, roll, bán lại và chuyển đồ trong v1.0; hồ sơ triển khai cũ giữ làm lịch sử. **CONFIRMED** = đã chốt; **PROPOSED/OPEN** = chưa được duyệt hoặc còn thiếu chi tiết.

## 1. Phạm vi và vòng phát triển — CONFIRMED

- Tiến trình chỉ tồn tại trong một trận, không lưu inventory sang trận sau.
- Bốn ô cố định: **Vũ khí, Giáp, Mũ, Giày**. Bỏ Dây Chuyền và ô phụ kiện chung.
- Mọi môn phái dùng được mọi trang bị; kiếm không ép đổi A hay khóa kỹ năng Quyền/Chưởng/Bổng/Phiến/Đao.
- Mua đồ cơ bản bằng vàng; mua lại chính món đó nâng một cấp, tối đa **cấp 5**.
- **Đồ cơ bản cấp 5 + nguyên liệu boss tương ứng + vàng → một trong ba nhánh đồ ghép của ô đó**. Mỗi món ghép tăng chỉ số và có một đặc tính nhánh.
- Không bán lại cho merchant, giao dịch/mua bán giữa người chơi hoặc chuyển vật phẩm bằng thả đồ cho người khác nhặt. Merchant vẫn bán bình và đồ cơ bản cho người chơi.
- Boss dungeon thưởng riêng cho từng người đủ điều kiện; không roll/tranh quyền sở hữu một món duy nhất.
- Creep/boss xâm lăng tượng vẫn chỉ cho vàng/XP, **không cho item hay Long Châu**. Tượng không được hồi/sửa chữa.

Vòng chơi: farm vàng → mua/nâng đồ → hạ boss nhận thưởng cá nhân → dùng Long Châu lần đầu → chọn nhánh chế tạo → chuẩn bị wave sau.

## 2. Bình máu và bình mana

**CONFIRMED:** merchant bán bình máu/mana; được mang vào và dùng trong dungeon, nhưng **không mua bình khi đang trong dungeon**. Giới hạn mang bình **20**. Cỡ bình và giá tăng theo lượng hồi. **Cooldown dùng bình: 5 giây**. Server quyết định số lượng/vàng/lượng hồi/cooldown; không dùng bình hồi tượng.

**PROPOSED/OPEN:** 20 là tổng hai loại hay từng loại; cooldown chung máu/mana hay riêng; số cỡ, lượng hồi và giá; hồi tức thì hay theo thời gian; cộng dồn; dùng khi đầy tài nguyên; phím sử dụng. Đề xuất trước đây là 20 tổng, ba cỡ Nhỏ/Vừa/Lớn hồi lượng cố định, cooldown chung 5s và hồi trong 2–3s; chưa được coi là các chi tiết đã chốt. Cấm bình PvP vẫn là ý định, xem mục 10.

## 3. Chỉ số đồ cơ bản

Vai trò **CONFIRMED**, số liệu **OPEN**:

| Ô | Chỉ số cơ bản | Ghi chú |
| --- | --- | --- |
| Vũ khí (kiếm) | Sát thương | Qua hệ số sát thương hiện có của A/kỹ năng, không giới hạn kiểu đánh |
| Giáp | Phòng thủ, máu tối đa | Ô chịu đòn chính |
| Mũ | Hồi máu, hồi mana | Không tự giữ mana tối đa từ đề xuất mũ cơ bản cũ |
| Giày | Tốc độ di chuyển, một ít tỉ lệ chí mạng | Crit là phần bổ sung nhỏ |

Chỉ số cấp 1–5/đồ ghép, trần tốc chạy/crit và giá phải ở dữ liệu có validation. Không coi số ví dụ trong chat là cân bằng đã duyệt. Không cho thay/nâng đồ tạo vòng hồi tài nguyên miễn phí; chính sách giữ HP/MP khi đổi max cần định nghĩa trước triển khai.

## 4. Thưởng boss và Long Châu — CONFIRMED

- Điều kiện: **đã gây ít nhất một lần sát thương hợp lệ lên boss** và **còn trong cùng khu vực/instance giao chiến lúc boss chết**. “Arena” ở đây là đấu trường của boss, không chỉ đứng ở trung tâm hoặc cùng room.
- Không cần last hit; chưa đánh hoặc đã rời instance không đủ điều kiện.
- Mỗi người đủ điều kiện nhận một nguyên liệu đặc trưng ở mỗi lần hạ boss; không Roll/Pass, Need/Greed hay một người thắng duy nhất.
- XP/vàng giữ quy tắc phân phối hiện có. Item cá nhân không biến fixed XP pool thành toàn bộ XP cho mỗi người.
- Mỗi boss dungeon cho mỗi nhân vật **một Long Châu ở lần thắng đủ điều kiện đầu tiên trong trận**. Dùng để tăng stats cho phần còn lại của trận; chết không mất buff, trận mới bắt đầu lại.
- Cờ nhận/dùng gắn nhân vật + định danh boss trong trận, chung private/shared. Hạ lại, đổi instance hay gửi lại yêu cầu không nhận/dùng Long Châu lần nữa.
- Long Châu cá nhân, không roll/bán/chuyển. Quyền nhận nguyên liệu mỗi lần và nhận Long Châu lần đầu là độc lập.

Ví dụ: ba người cùng đánh và ở lại đến khi boss chết → mỗi người nhận một nguyên liệu. Ai chưa nhận Long Châu của boss đó trong trận còn nhận Long Châu; người đã nhận không nhận thêm.

**OPEN:** Long Châu tăng chỉ số gì/bao nhiêu/cách cộng, thao tác dùng và có chiếm ô túi không. Ví dụ +3% HP/MP và +2% sát thương chỉ là đề xuất chưa duyệt. Cần chốt người chết còn trong instance, disconnect/reconnect, reset encounter và thời hạn ghi nhận tham chiến; không âm thầm thêm yêu cầu còn sống. Túi đầy không được mất thưởng: đề xuất pending claim cá nhân, không thả đồ công cộng; dung lượng/chính sách claim chưa chốt.

## 5. Công thức và ba nhánh chế tạo

| Boss dungeon | Nguyên liệu | Đồ cần dùng |
| --- | --- | --- |
| **Lý Mạc Sầu** | **Ngọc Uyên Ương** | Giày cấp 5 |
| **Hoàn Nhan Hồng Liệt** | **Đại Kim Chiến Giáp** | Giáp cấp 5 |
| **Chu Bá Thông** | **Đại Hồ Lô** | Mũ cấp 5 |
| **Kim Luân Pháp Vương** | **Kim Luân** | Vũ khí cấp 5 |

Nguyên liệu là tên nội dung đã chốt. Tên 12 thành phẩm, ASCII ID và icon chưa chốt. Thanh Tâm là tên hiệu ứng được chấp thuận, không tự đặt tên cuối các món còn lại.

### 5.1. Giày + Ngọc Uyên Ương — CONFIRMED

Mỗi đôi giày ghép cấp một kỹ năng **Z**, độc lập bốn ô QWER:

| Nhánh | Đặc tính |
| --- | --- |
| **Thanh Tâm** | Xóa slow, độc và đốt đang có trên bản thân; thay nhánh hồi 10% máu |
| Blink | Dịch chuyển một đoạn về phía trước theo hướng quay mặt |
| Phi châm | Bắn thẳng theo hướng quay mặt, không auto-target/tracking; gây slow và độc |

Thanh Tâm không tự giải stun, thêm miễn nhiễm hay xóa cơ chế đặc biệt boss. Blink tôn trọng tường/biên, không tự thêm bất tử. Server quyết định debuff có thể xóa, điểm đến và va chạm.

**OPEN:** cooldown dài của Z, khoảng blink, slow/độc/damage, phi châm xuyên hay dừng mục tiêu đầu. Thanh Tâm 30–45s chỉ là đề xuất. Phải chống reset cooldown bằng đổi/ghép giày; điều này không cấp quyền tự mở đổi đồ trong dungeon.

### 5.2. Giáp + Đại Kim Chiến Giáp — CONFIRMED về ba nhánh

| Nhánh | Đặc tính |
| --- | --- |
| Phản đòn | Xác suất nhỏ phản 100% đòn nhận phải; khi kích hoạt chỉ nhận 50% sát thương đòn đó |
| Aura slow | Làm chậm địch quanh người |
| Aura đốt | Gây sát thương đốt quanh người |

**PROPOSED/OPEN:** lấy D là damage sau phòng thủ thông thường, trước phản; nhận 0.5D, đòn phản sức mạnh D trước phòng thủ kẻ đánh. Xác suất/cooldown nội bộ, thứ tự guard/khiên mana chưa chốt. Đề xuất không phản DoT/aura/đòn phản, không phản đệ quy; slow lấy mạnh nhất, aura đốt giới hạn cộng dồn nhiều người. Các chi tiết phải chốt/test trước triển khai.

### 5.3. Mũ + Đại Hồ Lô — CONFIRMED

| Nhánh | Đặc tính |
| --- | --- |
| Hồi phục | Tăng tốc độ hồi máu và mana |
| Bền bỉ | Tăng máu tối đa, mana tối đa và phòng thủ |
| Tấn công | Tăng nhẹ sát thương và tỉ lệ chí mạng |

Đều tăng chỉ số so với mũ cấp 5; mức tăng chưa chốt. Cân bằng mana tối đa/hồi mana cùng khiên mana Võ Đang.

### 5.4. Vũ khí + Kim Luân — CONFIRMED

| Nhánh | Đặc tính |
| --- | --- |
| Đánh lan | A đánh xa bắn ba tia; A đánh gần tăng phạm vi đánh lan |
| Hút máu | Hồi theo sát thương phát ra của một lần A, không tăng theo số creep ảnh hưởng |
| **Xuyên giáp** | A bỏ qua một phần phòng thủ mục tiêu; **thay hoàn toàn nhánh xác suất stun** |

Đánh lan theo **A đang dùng**, không khóa môn phái. Phiến hiện là boomerang đi–về, cần định nghĩa hai chặng riêng, không quay lại mô tả cận chiến cũ. Tỉ lệ tia phụ/chính, góc và tăng tầm chưa chốt; đề xuất không cho ba tia nhân ba sát thương lên cùng một mục tiêu.

Hút máu có một ngân sách mỗi lần A; nhiều creep/cleave/tia phụ không nhân ngân sách. **Đề xuất** phải trúng một địch hợp lệ, tính trên một đòn chính sau tăng damage/crit trước phòng thủ, cả đi–về Phiến chung ngân sách. Tỉ lệ, mốc hồi và multi-hit cần chốt; ví dụ 100 damage → 10 máu không phải tỉ lệ đã duyệt.

Xuyên giáp của A chỉ áp dụng đòn người cầm, không giảm giáp cho cả đội. Tỉ lệ và kết hợp nguồn khác chưa chốt. Trọng kích/Truy kích chỉ là ý tưởng, không thuộc ba nhánh đã chọn.

## 6. Merchant và chế tạo

**CONFIRMED:** bán bình và bốn món cơ bản; mua bản sao nâng đến cấp 5. Ghép đúng món cấp 5 + nguyên liệu boss + vàng, chọn một trong ba nhánh cùng ô. Không có bán lại, trao đổi người chơi hay roll loot. Catalogue server sở hữu giá/cấp/stats/recipe, client không tự quyết các giá trị này.

**PROPOSED/OPEN:** mọi mua/nâng/ghép chỉ ở trung tâm khi sống (cấm mua bình trong dungeon đã chốt); ghép chắc chắn thành công, giữ nền cấp 5 rồi tăng nhẹ; chưa nâng tiếp đồ ghép; một món cơ bản mỗi loại có thể nâng và từ chối nâng vượt 5. Nếu cho nhiều bản sao phải chọn instance đích rõ ràng. Đổi nhánh, hoàn nguyên, hoàn vàng và nâng tiếp thành phẩm chưa chốt.

## 7. Inventory và quản lý vật phẩm

- Bốn ô đúng loại; ô túi riêng, dung lượng chưa chốt. Đề xuất 12 ô cũ không phải yêu cầu đã duyệt.
- Nguyên liệu dư không tự chuyển vàng hoặc sang người khác. Đề xuất xếp chồng và cho hủy; stack cap/hủy chưa chốt.
- Quyền mặc/tháo/đổi đồ trong dungeon/PvP chưa chốt; xem inventory không đồng nghĩa được sửa.
- Giữ instance/cấp/nhánh/chủ sở hữu/cooldown; không cộng lại stats nhiều lần khi mặc/tháo hay tính lại build.
- Trình bày theo [UI_UX_SPEC.md](UI_UX_SPEC.md): inventory/merchant/crafting trong viewport. Tài liệu này không thiết kế layout hay tạo artwork.

## 8. Server authority và giao dịch cho lần triển khai tới

- Client gửi ý định mua/nâng/ghép/dùng bình/dùng Long Châu/dùng Z; server xác minh phase/zone/nhân vật/ownership/tài nguyên/cooldown/catalogue.
- Trừ vàng/nguyên liệu và cấp kết quả nguyên tử; retry/concurrent request không nhân item, cấp hoặc buff.
- Reward ledger phân biệt kill event với first-clear key `(match, character, bossDefinition)`; lưu quyền nhận/dùng Long Châu riêng nếu dùng thủ công. Boss death callback lặp không thưởng thêm.
- Chốt eligibility lúc chết; claim muộn không tính lại vị trí hay cấp Long Châu lần nữa. Hoàn tất reconnect/claim policy trước migration.
- Không tin client tự gửi damage/stats/giá/kết quả loot/first-clear/vị trí blink/kết quả cleanse.
- `game-core` độc lập Phaser/Colyseus/DOM; tuning/catalogue trong `game-data`; API/snapshot version trong `game-protocol`; server quyết định.
- Khi triển khai phải migrate/reconcile backend pending claim/roll/material cũ, tránh đường cũ và mới cùng thưởng một kill. Đây chưa phải mô tả protocol đã triển khai.

## 9. Acceptance và cân bằng cần thực hiện

Case thiết kế tại [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md), kế hoạch đo tại [BALANCING.md](BALANCING.md). **Chưa có kết quả test cho v2.0.**

- Nâng đúng một món tới 5, bốn slot đúng loại, không dây chuyền; recipe consume/award một lần.
- Bình cooldown 5s, cấm mua trong dungeon, cap 20 theo chính sách cần chốt; chống spam/retry.
- 1/2/6 người đủ điều kiện đều nhận nguyên liệu; người chưa từng nhận được Long Châu, không roll/last-hit.
- Chưa đánh/ngoài instance không nhận; hạ lại/đổi private–shared không nhân Long Châu.
- Z/phản/aura/hồi phục/xuyên giáp do server xử lý; hút máu không tăng theo số mục tiêu.
- Đo recipe pacing solo/2/6, sustain bình 5s, aura stacking, mana shield, Phiến hai chặng, boss damage và Long Châu; không dùng mô hình một roll thắng cho cả đội.

## 10. PvP — PROPOSED, chưa chốt

Người dùng cân nhắc **PvP không tính đồ, chỉ tính skill**, trước đó nêu ý định **không cho mang bình vào PvP**. Chưa coi là chính sách cuối hoặc tự triển khai chuẩn hóa PvP.

Cần chốt phạm vi loại stats/đặc tính đồ, **Z từ giày**, Long Châu; có chuẩn hóa level/rank/passive/surplus/base stats không; xử lý HP/MP/cooldown vào–ra. Không mặc định giữ Z hay buff Long Châu để bù.

## 11. Tham chiếu

- [HUD concept v01](docs/INVENTORY_MERCHANT_HUD_DESIGN.md): merchant, inventory và Z; hình thức/tương tác đề xuất, chưa triển khai hoặc duyệt production.
- [DECISIONS.md](DECISIONS.md): quyết định và thay thế quy tắc cũ.
- [GAME_DESIGN.md](GAME_DESIGN.md): vòng chơi/boss/XP/PvP.
- [COMBAT_SYSTEM.md](COMBAT_SYSTEM.md): A/QWER/Z và damage pipeline.
- [BALANCING.md](BALANCING.md): tuning/economy/sustain.
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md): authority/migration.
- [ROADMAP.md](ROADMAP.md): phạm vi M4, chưa khởi động triển khai.
- [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md): các chi tiết cần chốt.
