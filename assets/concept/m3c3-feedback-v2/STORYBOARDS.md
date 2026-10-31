# Storyboards và pha thời gian

**CONCEPT_PENDING_REVIEW**. t0 = anticipation, t1 = release/contact, t2 = recovery. Đây là thứ tự hình ảnh tương đối, không phải mốc ms, cooldown, cast lock hay lịch hit. Khi lặp, hồi thế nối lại anticipation; không kéo dài hit theo độ dài VFX. Động tác nhân vật và VFX được mô tả độc lập để production tách layer/atlas thật.

| Phái / đề xuất | Nhân vật: t0 → t1 → t2 | VFX riêng: release / travel / impact / loop / ending |
|---|---|---|
| cai-bang / **Bổng A bốn nhịp** | Chọc: thu khuỷu → đẩy bổng → rút; quét: xoắn hông → ngang eo → hạ; hất: chùng gối → nâng chéo → giữ cao; bổ: giơ hai tay → đập trước chân → hồi thấp. | Tip streak → sweep mảnh → rising hook → fracture contact → ember ending. |
| cai-bang / **Chưởng A thứ sáu** | Thu tay sau → chưởng trước → hồi guard; năm đòn đầu chỉ là ký hiệu nhịp. | Release ember → small dragon-head travel → ba nhánh impact → tàn lửa. |
| cai-bang / **Hỏa Vân Chưởng** | Tụ hai tay tại eo → mở một chưởng → kéo tay về. | Một origin, ba tia travel phân kỳ thẳng → ba impact riêng → ending. |
| cai-bang / **Hàng Long Hỏa Vũ** | Hạ trọng tâm/song chưởng thu → đẩy song chưởng → hồi guard. | Gather cuộn → một rồng đầu-thân-đuôi travel → head/contact tách → tail/ember ending. |
| cai-bang / **Hoành Tảo Bổng** | Bổng sau hông → quay hông/bổng ngang eo → giảm đà. | Orbit sau chân mờ/trước chân rõ → contact → ending; tâm rỗng. |
| cai-bang / **Phá Giáp Bổng** | Nâng bổng quá đầu → bổ xuống đất trước → bật lại thấp. | Whip release → fracture impact → defense-break energy → dust ending. |
| cai-bang / **Cầm Long Công** | Tay trái giữ bổng/tay phải mở → tay phải móc thu vào → thả guard. | Long trảo extend → talons curl/retract vào caster → ending; không khóa chân/stun. |
| cai-bang / **Truy Phong Bổng** | Chân sau nén → lướt đâm → chân trước hãm. | Trail sau thân → impact đầu bổng → dust ending; vị trí theo actor. |
| cai-bang / **Thiên Hạ Vô Cẩu** | Thu bổng → thân xoay nối pose → bổ kết → hồi guard. | Gather → broken orbit + chó lửa chạy → finisher impact → embers. |
| thien-son / **Quạt A boomerang** | Fan phải mở/tay co → ném và bàn tay trống → tay bắt fan về. | Outbound spin → turn → return ngược chiều → catch; contact đi/về khác file. |
| thien-son / **Liên Hoa Phiến** | Quạt trước ngực → nhiều flourish kéo dài → thu tay. | Gather → petal-cut sustain loop → contact → petals ending. |
| thien-son / **Lục Dương Chưởng** | Chùng xoắn thân → xoay mở tay → chân trụ dừng. | Gather → mantle spin loop → deflection contact → expiry. |
| thien-son / **Lưu Phong Bộ** | Nghiêng/nén → vượt qua silhouette đích → hãm chân. | Directional trail → crossing-contact → exit/settle; không đặt lịch damage. |
| thien-son / **Chiết Mai Thủ** | Chạm cổ tay → mở hai cổ tay → ready guard. | Plum-knot activation → wrist/heel ribbon loop → contact accent → expiry. |
| thien-son / **Bách Phiến Phong Bạo** | Mở hai tay → nối pose xoay → bắt quạt/thu thế. | Gather → hollow storm loop → tám fan travel outward → impact → ending. |
| thien-son / **Đao A** | Cuộn lưỡi sau → chém chéo xa → guard đối diện. | Long thin slash → contact → dissipate. |
| thien-son / **Phi Ảnh Trảm** | Nghiêng nén → lướt đao trước → phanh. | Hai afterimage sau actor + transient phase rim → contact → ending. |
| thien-son / **Truy Hồn Đao** | Chuẩn bị chéo → giải phóng đao khí → follow-through. | Hai luồng travel song song → hai contact → slow wind cue → ending. |
| thien-son / **Phong Ảnh Hoán Vị** | Guard → bước ngang/thân phase → counter-ready. | Displaced footprint → sheer afterimage → reappear/contact → expiry. |
| thien-son / **Bách Liệt Thiên Kích** | Cuộn thấp → nhiều pose flurry → rising cross finish → guard. | Gather → wide flurry loop → terminal X impact → ending. |
| vo-dang / **Quyền A trái/phải** | Vai trái co → quyền trái → thu sang chuẩn bị phải; vai phải co → quyền phải → guard trái. | Palm ripple/contact hướng ra trước → ending; không biến A thành projectile mặc định. |
| vo-dang / **Lưỡng Nghi Thủ** | Hai tay gom âm/dương → song chưởng trước → cân bằng guard. | Black/white release → Yin-Yang travel → opposed crescents impact → ending. |
| vo-dang / **Huyền Âm Chưởng** | Tay trái thu → chưởng rộng → hạ guard. | Dark-core large wave release/travel → impact plume → slow cue → ending. |
| vo-dang / **Dương Khí Kích** | Mở tay phải tại vai → đẩy chưởng → rút tay. | Qi hand release/travel (5 ngón gồm ngón cái) → impact → mana-return accent → ending. |
| vo-dang / **Thái Cực Thần Công** | Hai tay gom → mở ra → tư thế sẵn di chuyển; không giữ cast khi shield loop. | ON → LOOP → ABSORB overlay → OFF hoặc EMPTY_MANA → END; hai ending khác nhau. |
| vo-dang / **Thái Cực Trận** | Quỳ/tụ → ấn đất → đứng hồi. | Activation → formation loop → attempted-exit inward border response/pulse → ending. |
| vo-dang / **Kiếm A nối đòn** | Nâng cuộn → slash chéo → guard thấp; guard thấp → reverse slash → guard đầu. | Hai slash mảnh khác hướng → contact → ending. |
| thieu-lam / **Quyền A trái/phải** | Trái chuẩn bị → trái contact → phải chuẩn bị; phải contact → thu guard. | Hai knuckle contact nhỏ → sparse ending. |
| thieu-lam / **La Hán Quyền** | Khuỷu co gọn → đấm thẳng → rút về guard. | NORMAL fist crest release/impact/end; EMPOWERED double-outline fist + stepped shock-ring release/impact/end. |
| thieu-lam / **Vi Đà Quyền** | Thấp/rộng/tay chéo → vai dẫn quyền hất lên → thu khuỷu. | NORMAL pillar release/impact/end; EMPOWERED guardian forearms + tall shock release/impact/end. |
| thieu-lam / **Đại Lực Kim Cương Chưởng** | Hai chưởng mở thu thấp → đẩy song chưởng → kéo về guard. | NORMAL broad palm release/impact/end; EMPOWERED layered palm + broken ground crown release/impact/end. |
| thieu-lam / **Đao A** | Đao sau vai phải → tay duỗi chém nặng → guard thấp bên kia. | Gold-edged wide slash → contact tooth → chips ending; không kéo dài đao thật. |
| thieu-lam / **Tru Tà** | Hai tay cuộn → quét rộng phía trước → hạ thấp. | Preparation → main crescent/echo → splash impact → fade; footprint trước mặt, không 360. |
| thieu-lam / **Dịch Cân Kinh hồi phục nhẹ** | Reuse idle/breathe; không tạo cast chủ động cho nội tại. | Motes start → ba petal sparks loop từ chân đến eo → clean end; không số hồi máu. |

## Hướng và vùng art

- Pose study chủ yếu hướng phải với camera elevated orthographic; source production sau duyệt cần down/left/right/up riêng. Không xoay cả thân nhân vật để giả hướng. Ném tám hướng là hướng VFX, không đổi yêu cầu nhân vật bốn facing.
- Tia travel và rồng tiến theo hướng đã chọn; đường cong của thân/VFX không có nghĩa homing. Quạt có pha quay/thu như minh họa feedback; quy tắc hướng về caster và hit hai lượt do nhánh gameplay quyết định.
- Vùng mờ/mũi tên trên sheet biểu thị silhouette/đường chuyển động. Vòng quét Bổng, vòng spin gió và trận pháp không quyết định radius/hitbox. Chỉ pha server xác nhận sau tích hợp mới được phát impact/absorb/status cue.
- Cầm Long: móng mở khi extend; móng thu và dòng kéo hướng vào caster, không stun hoặc khóa chuyển động. R2 thay nháp dùng đầu rồng và mũi tên sai chiều.
- Thái Cực Trận: mục tiêu minh họa là địch ở trong cố đi ra, biên phản ứng vào tâm. R2 thay nháp giống bảo vệ ngăn từ ngoài. Không triển khai barrier/collision trong nhánh này.
- Tàn ảnh trắng/cyan biểu thị cửa sổ phase đề xuất; không khẳng định miễn thương đã tồn tại. Khiên Võ Đang biểu thị mana absorb, không vẽ như invincibility.
- Empowered Thiếu Lâm là biến thể art độc lập theo hit state sau này, không tự tạo hit hoặc chốt cơ chế combo. Motes Dịch Cân Kinh không xác định lượng/tần suất hồi phục.

## Tách lớp khi sản xuất sau duyệt

Character giữ face/hair/cloth/weapon và key poses; VFX riêng chứa trail, projectile, hit, ground, loops, status và ending. Lớp sau chân/đằng trước người của orbit cần tách để Y-depth đúng. Các sheet concept phẳng có vài composite ở contact để thấy ý đồ, không có semantic layer có thể phục hồi; phải vẽ lại frame/layer thật. Không lấy tiêu đề “VFX ONLY” làm bằng chứng file alpha đã tồn tại.
