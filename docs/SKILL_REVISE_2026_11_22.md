# Skill revise — yêu cầu đã chốt và kế hoạch hình ảnh

**Cập nhật 2026-11-23:** director đã nói “Tạm ổn” với bản sửa thức quạt và yêu cầu tích hợp toàn bộ vào game; đã chọn **bán nguyệt** cho Phong Quyển. Trạng thái production-only/pending dưới đây là lịch sử. Theo dõi [tích hợp Phaser và tuning thử](SKILL_REVISE_INTEGRATION_2026_11_23.md).

**Approval mới:** director duyệt Thiền Sư v03 và xác nhận “Duyệt các artwork còn lại, làm toàn bộ”. Mười concept được chọn đã khóa hash; xem [sản xuất sprite/VFX/animation](SKILL_REVISE_ASSET_PRODUCTION.md). Trạng thái pending trong các đợt bàn giao bên dưới là lịch sử trước lần duyệt này. Animation và gameplay chưa tự được coi là hoàn tất/đã duyệt.

Ngày ghi nhận: 2026-11-22 (Asia/Saigon). Nhánh: `wip/m3d/skill-revise`, tạo từ checkout `milestone/m3d` tại `3454e748`.

Nguồn: yêu cầu và các câu trả lời trực tiếp của director trong chat skill revise. Đây là phạm vi thay đổi được yêu cầu, **không phải báo cáo đã triển khai**. Các yêu cầu bên dưới supersede cơ chế cũ đúng phạm vi được nêu. Không mở rộng sang inventory, economy, Ngũ Độc, thiết kế nhân vật, môi trường hoặc âm thanh.

## Trạng thái và ranh giới đợt hiện tại

- Director yêu cầu ghi nhận toàn bộ yêu cầu và kế hoạch, đồng thời generate artwork mới để duyệt.
- Chỉ tạo concept ảnh tĩnh/key pose/icon candidate. Chưa generate animation, xuất atlas hoặc tích hợp Phaser/game-core/server.
- Concept không phải runtime sprite sheet và không chứng minh motion, hitbox, authority hay balance.
- Artwork mới đang `PENDING_DIRECTOR_REVIEW`. Duyệt ảnh tĩnh không tự động duyệt animation hoặc bản chạy trong game.
- Giữ nguyên asset đã duyệt và các thay đổi không thuộc task đang có trong checkout. Không tự commit, merge hoặc push.

## Quy tắc chung

- Auto-focus: server chọn địch gần nhất trong tầm tại lúc thi triển; không có địch thì bắn trước mặt. Khóa hướng/điểm đích, không homing; địch vẫn có thể di chuyển né. Các lần damage/hit do server quyết định.
- Giữ điều khiển, nhánh/phái, slot QWERT và luật ngoài phạm vi thay đổi. Stable ASCII ID và migration/alias sẽ được rà ở đợt implementation; tên hiển thị tiếng Việt theo quyết định dưới đây.
- Chỉ số chưa được director nêu phải nằm trong bảng tuning đề xuất, không ghi là số đã duyệt. Không mặc định đề xuất 40/47/53/60% của Liên Hoa là đã chốt.
- Artwork bám identity, vũ khí, palette và góc orthographic elevated 3/4 hiện tại. Body/key pose và VFX là lớp riêng; không dùng vệt sáng làm thay động tác thật.

## 1. Cái Bang Chưởng

- Cuồng Long Loạn Vũ, Phi Long Tại Thiên, Hàng Long Hỏa Vũ: auto-focus.
- Kháng Long Hữu Hối: giữ tăng tỉ lệ và sát thương chí mạng; bỏ vòng lửa bậc 4; tăng hồi mana; bỏ đốm sáng phía trước trong animation.
- Rework Hỏa Vân Chưởng thành **Hỏa Long Xuyên Sơn**: player ra chưởng đầu rồng lửa rồi lướt trước mặt; gây damage cho các target bị xuyên qua; nổ tại cuối đường lướt, không dừng ở địch đầu tiên. Để vệt lửa phía sau **chỉ để trình diễn, không gây damage**. Có damage đường đi và damage nổ cuối.

## 2. Cái Bang Bổng

- Truy Phong Bổng đổi tên **Phá Thạch Bổng**.
- Nội tại riêng: đánh thường trúng một target cộng 1 charge, tối đa 4; đổi target reset charge. Skill không tích charge. Phá Giáp cộng damage theo charge rồi tiêu hết charge dù trúng hay trượt; không tự cộng charge cho chính nó.
- Phá Giáp Bổng: auto-focus, stun 2 giây.
- Thiên Hạ Vô Cẩu: stun 2 giây sau thức đập.

## 3. Thiên Sơn Phiến

- Liên Hoa Phiến: giảm damage nhận 40% ở bậc 1, tăng tới 60% ở bậc 4. Hai bậc giữa chưa chốt con số.
- Chiết Mai Thủ rework thành **Phong Quyển Tàn Vân**, một lần bấm tự thực hiện hai nhịp: (1) player giật lùi giống Phong Ảnh Hoán Vị **đồng thời gom địch**; (2) khi đã lùi, phất quạt phóng projectile gió lớn xuyên qua vùng địch vừa gom.
- Bạo Vũ Cuồng Phong: E lần 1 phóng quạt; E lần 2 khi quạt đang bay cho dừng tại chỗ; E lần 3 thu quạt đang xoay. Không dừng sớm thì quạt tự dừng ở cuối tầm. Giữ damage, slow, hao mana và hồi chiêu hiện hành ngoài thay đổi thao tác này.

## 4. Thiên Sơn Đao

- Tiêu đề Thiên Sơn Phiến lần thứ hai trong prompt gốc là lỗi ghi tên; director xác nhận đây là Đao.
- Bách Liệt Thiên Kích: tàng hình khi tạo bóng và trong lúc bóng chém; giảm damage nhận và không thể được chọn làm target. Các bóng chém không phá tàng hình; player đánh thường hoặc dùng skill khác thì lộ. Không đồng nghĩa miễn sát thương diện rộng.
- Liệt Phong Đao: stun 1 giây rồi slow nhẹ 3 giây.

## 5. Võ Đang Quyền

- Tăng tầm damage A thực tế để khớp animation; mục tiêu cải thiện độ dễ chơi PVE.
- A có xác suất đẩy lùi và hút mana: trừ mana của địch, hồi cho mình; nếu target PVE không có mana thì hồi một lượng nhỏ cho mình.
- Bói Toán Thiên Cơ: tăng vùng damage vụ nổ quẻ Đoài.
- Lưỡng Nghi Thủ và Huyền Âm Chưởng: auto-focus.
- Huyền Âm Chưởng: sóng âm rộng hơn; nổ mực quanh target thay vì quanh player; trúng nổ mực stun 1 giây.
- Skill T Thái Cực: giảm **diện tích** 15%, không phải giảm bán kính 15%. Khi giữ hình dạng và tỉ lệ, hai trục nhân sqrt(0.85); chỉ là chuyển đổi hình học từ yêu cầu diện tích.

## 6. Võ Đang Kiếm

- Xác suất phóng kiếm khí khi A: 15%.
- Bát Quái Kiếm Trận: địch có thể đi trong vùng nhưng không đi/lướt vượt biên; không phải root đứng yên.
- Thất Tinh Kiếm rework thành chiêu xa: gọi bảy kiếm cắm xuống vùng target, rơi lần lượt nhưng sát nhau như mưa, gây nổ damage. **Không có vòng khóa/báo vùng trước trên mặt đất**. Diễn giải đã trình bày với director: khóa vùng quanh vị trí target lúc cast, không đuổi theo target; không bổ sung homing.

## 7. Thiếu Lâm Quyền

- QWE auto-focus ở cả thế Quyền và Cước, gồm hướng lướt Vô Ảnh. Giữ luật combo/Phát Động ngoài thay đổi ngắm hướng.
- Vi Đà Quyền: khoảng cách từ player tới tâm nổ giảm 60%, còn 40% hiện tại.
- Kim Cang Bất Hoạt: bỏ đốm sáng phía sau.
- Như Lai Niết Bàn: tăng damage, thêm slow.
- Toàn Phong Thoái và Ca Diệp Thoái: bỏ đốm sáng.
- Tăng tầm damage A thực tế khớp animation.

## 8. Thiếu Lâm Đao

- Như Lai Thiên Diệp: giảm damage mỗi đao bắn ra, tăng tần suất bắn.
- Kim Quang Hộ Trận: bỏ đốm sáng lập lòe trước mặt; tăng phòng thủ và tốc độ hồi HP cho bản thân và đồng đội.
- Bất Động Minh Vương: hồi HP cho bản thân một nhịp trước, sau đó tăng phòng thủ và damage cho bản thân cùng đồng đội.

## 9. Côn Luân Thiền Sư

- Rework hình ảnh các thức đánh thường: **chọc, hất, quạt, đập**. Phản hồi mới nhất sau v02: **cán ngắn hơn v02 một chút, vẫn đủ cầm hai tay để vung nhưng cũng có thể dùng một tay; đầu búa to hơn một chút**. V03 thể hiện chọc/quạt/đập hai tay, hất một tay để xem cả hai cách dùng. Giữ identity Hắc Thiết, costume và đầu búa sắt/copper. Ảnh user gửi là reference tỉ lệ búa/cách cầm, không đổi sang nhân vật/style ảnh thật. Đây là override cho cả cán ngắn một tay v01 lẫn yêu cầu mọi thế đều hai tay của v02. Không tự đổi gameplay/tầm damage theo độ dài hình vẽ.
- **Q Ngũ Lôi Chính Pháp chuyển thành passive**; không thay E bằng passive.
- Có xác suất phản sét khi bị đánh: stun kẻ tấn công 0.5 giây và negate 100% damage của chính lần đánh kích hoạt.
- PVP: chỉ chặn đòn thường của player. PVE: chặn cả đòn thường và skill gây damage trực tiếp. Chỉ xét từng đòn/lần damage trực tiếp; không áp cho độc, cháy, DOT hoặc vùng nguy hiểm không phải đòn trực tiếp.
- E đổi tên **Lôi Đình Chấn Vực** (director đã đồng ý), giữ vai trò vòng sét hiện tại ngoài các yêu cầu khác.
- R auto-focus.
- Ảnh hưởng việc bỏ Q đổi thế lên thế búa/bonus cũ phải trình bày cụ thể khi chốt implementation, không âm thầm giữ nút cast Q cũ.

## 10. Côn Luân Kiếm Tôn

- Ultimate đổi tên **Thần Long Cửu Hiện**.
- Tăng khoảng cách bố trí năm kiếm quanh player; không mặc định tăng bán kính damage riêng của từng kiếm.
- Phản hồi director sau artwork v01: năm kiếm **cắm ở năm đỉnh và nối chéo với nhau thành ngôi sao năm cánh**; không nối thành viền ngũ giác. Concept v02 sửa đúng bố cục này.
- Khi hết trận, mỗi kiếm phát một vụ nổ theo Q; cả năm cùng nổ và **không có stun** từ các vụ nổ cuối này.

## 11. Đường Môn Cơ Quan

- Q/E auto-focus.
- Đang bay bằng W rồi dùng R: coi như xuống cánh, kết thúc trạng thái bay.
- Chỉ khi bay: A phóng ba lông vũ tỏa hình nón thay vì một lông.
- Chỉ khi bay: Q Truy Tâm Tụ Tiễn đổi thành ba bom băng ném random quanh target, nổ gây slow; Q dưới đất giữ dạng cũ.
- Chỉ khi bay: E Lưu Tinh Trục Nguyệt bắn laze xuống mặt đất rồi player thật sự lướt trên không, kéo đường laze theo, damage unit trên đường thẳng; hướng lướt theo auto-focus E. Không biến thành tia bám địch. E dưới đất giữ dạng hiện tại ngoài auto-focus.

## 12. Đường Môn Ám Khí

- Địa Diệm Hỏa có số lượt tích trữ theo bậc **3/4/5/5**; tối đa 5 charge và tối đa 5 bom tồn tại. Không hiểu là đặt nhiều bom mỗi lần.
- W auto-focus.
- Nhiếp Hồn Nguyệt Ảnh: kết thúc lướt rồi phóng ám khí tám hướng.

## Kế hoạch artwork → animation/VFX → Phaser

### A. Artwork — phạm vi đang thực hiện

Tạo các bảng concept riêng có số để director duyệt; ảnh trên nền trung tính, đầy đủ silhouettes và khoảng trống, camera/palette bám baseline. Key pose là hình tĩnh để duyệt động tác, không phải các frame animation đã hoàn tất.

| Mã | Artwork mới | Nội dung duyệt |
| --- | --- | --- |
| 01 | Hỏa Long Xuyên Sơn | Đầu rồng lửa, chưởng/lướt, vệt lửa trang trí, nổ cuối đường |
| 02 | Phong Quyển Tàn Vân | Lùi và gom địch ở nhịp 1, phất quạt/gió xuyên ở nhịp 2 |
| 03 | Huyền Âm Chưởng | Sóng âm rộng, nổ mực quanh target, thân player tách hiệu ứng |
| 04 | Thất Tinh Kiếm | Bảy kiếm cắm xuống rơi dồn dập, nổ; không vòng báo trước |
| 05 | Thiền Sư — A | Key pose các thức búa với thân/vũ khí nhất quán, rõ tiếp xúc và hồi thế |
| 06 | Thiền Sư — Q passive/E | Concept phản sét chặn đòn trực tiếp và vòng Lôi Đình Chấn Vực |
| 07 | Thần Long Cửu Hiện | Bố trí năm kiếm rộng hơn và năm vụ nổ cuối, không stun |
| 08 | Cơ Quan — A/Q trên không | Ba lông vũ hình nón, ba bom băng random quanh target |
| 09 | Cơ Quan — E trên không | Key pose bay lướt, laze chiếu xuống đất và kéo thành đường damage |
| 10 | Icon đổi cơ chế | Hỏa Long Xuyên Sơn, Phong Quyển Tàn Vân, Thất Tinh Kiếm, Ngũ Lôi passive; icon candidate tách khỏi runtime |

Những chiêu chỉ đổi tên, con số, hướng bắn, CC, tầm hoặc bỏ đốm sáng ưu tiên tái sử dụng art hiện có. Không generate lại hero/map/HUD. Counter charge Bổng, alpha tàng hình, ba trạng thái quạt, tám hướng ám khí và nhịp buff/hồi máu được dàn dựng ở bước B; chỉ bổ sung artwork nếu audit cho thấy thiếu và trong phạm vi yêu cầu.

### B. Animation/VFX — sau khi artwork tương ứng được duyệt

- Tách body, vũ khí rời thân, projectile, trail, impact và trạng thái. Dùng nguồn sibling version, giữ identity/pivot/density/facing; không thay approved bytes.
- Hỏa Long: chưởng → lướt xuyên → nổ cuối; trail không tự tạo tick damage.
- Phong Quyển: lùi/gom cùng nhịp → phất gió; Bạo Vũ: phóng → dừng → xoay → thu, khôi phục quạt/thân đúng trạng thái.
- Bách Liệt: ẩn chủ, bóng vẫn chém, hiện lại khi chủ A/skill mới; Liệt Phong nối stun rồi slow.
- Huyền Âm: sóng rộng → nổ ở target; Đoài nổ rộng; vòng T đúng diện tích mới; A Quyền khớp tầm.
- Thất Tinh: bảy lần rơi dồn; Bát Quái phân biệt biên trận với root.
- Thiếu Lâm: Vi Đà gần hơn, QWE hai thế đổi hướng; xóa đúng lớp đốm sáng; Thiên Diệp dày nhịp, Minh Vương hồi một nhịp rồi buff.
- Thiền Sư: động tác búa thật, phản sét đúng hit bị negate, R đổi hướng. Kiếm Tôn: năm kiếm nổ đồng thời lúc hết trận, không stun cuối.
- Cơ Quan: ba lông vũ, ba bom/nổ băng, laze kéo theo lướt; R kết thúc cánh. Ám Khí: phát tám hướng sau lướt, đúng cap charge/bom.
- Review bằng preview chạy được, PNG key poses/dải frame và quan sát live. Không tạo WebM/MP4/GIF hoặc recording khi chưa có yêu cầu riêng.

### C. Tích hợp sau review

- Data/tuning riêng với mechanics. Server quyết định targeting/movement/hit/RNG/status/charge và clocks; client không quyết định damage hoặc vị trí thật.
- Dùng helper hiện có, module effect hẹp; deterministic regressions cho state machine mới, charge, CC, phản damage, tàng hình, giam biên, bom và auto-focus.
- Chạy QA preflight trước manual browser; quan sát real Phaser ở gameplay zoom và input có server acknowledgment, bao gồm nhiều client.
- Theo AGENTS: sau thay đổi implementation cuối chạy `pnpm check:final [relevant Playwright arguments]` một lần, retry đúng stage nếu cần. Đợt concept/docs hiện tại chỉ kiểm tra PNG, link, hash và metadata, không chạy gameplay build.

## Chưa chốt

Các giá trị chưa nêu: damage mới, khoảng lướt/range/cỡ vùng, mana hút/hồi, bonus/charge, chance phản sét, giảm damage tàng hình, hai bậc giữa Liên Hoa, slow/regen/defense/buff và cadence. Lập bảng tuning để xem riêng; không tự thêm số được coi là phê duyệt.

Nguồn ảnh, prompt, hash và trạng thái từng concept: [thư mục review](../assets/concepts/skill-revise/v01/README.md).

Hai concept sửa theo phản hồi director: [artwork v02](../assets/concepts/skill-revise/v02/README.md). V01 05/07 superseded; ảnh vẫn giữ nguyên. V01 06 chưa sửa hình búa nên không dùng búa ngắn làm chuẩn mới. Các bản mới vẫn chờ duyệt, chưa animation/integration.

Phản hồi tiếp theo về Thiền Sư: [búa v03](../assets/concepts/skill-revise/v03/README.md) supersede riêng 05 v02; giữ 07 trận ngôi sao v02. Chưa có art approval mới từ phản hồi này.

## Director motion feedback — 2026-11-23

Các quyết định mới nhất sau khi xem end-to-end supersede các assumption/choreography cũ tương ứng:

- Thiền Sư: giữ tỷ lệ người và búa nhất quán giữa idle và A; chọc/hất dùng hai tay, không rút ngắn cán; quạt cần thể hiện rõ vòng vung ngang; đập có nhịp xoay hai bàn tay vào phía lòng trong rồi đập xuống. Quyền dùng một tay trong concept không có nghĩa A chọc/hất hiện tại được duyệt.
- Không rework A Kiếm Tôn. Lôi Đình Chấn Vực chỉ đổi tên, giữ animation hiện tại; bỏ hai mục này khỏi danh sách animation mới cần duyệt.
- Phong Quyển: hút nhanh hơn, vùng hút xa hơn; làm hai option projectile gió hình sóng và bán nguyệt để director chọn. Các con số trong preview là đề xuất art timing, chưa chốt tuning gameplay.
- Huyền Âm Chưởng: nổ **5 bãi mực ở vị trí ngẫu nhiên quanh target**, thay một bãi. Preview có thể dùng seeded staging; RNG/hit/CC thật thuộc server khi tích hợp.
- Cơ Quan A bay: dùng đúng lông vũ hiện tại trong game, nhân ba theo hình nón; không dùng lông vũ mới quá lớn. Q bay: thu nhỏ riêng sprite bom còn 50% kích thước preview trước; blast không được yêu cầu đổi.
- Director nói OK cho Hỏa Long Xuyên Sơn, Thất Tinh Kiếm, E laze lướt, Bạo Vũ và Nhiếp Hồn trong bản preview vừa xem. Các mục không được nêu không tự được duyệt; corrections mới vẫn là candidate.

Nguồn sửa giữ riêng tại `assets/source/skill-revise-feedback-v02/`; không ghi đè source/atlas v01 hay concept đã duyệt. Scope hiện tại vẫn là artwork/motion review, chưa phải tích hợp combat/server.

Director sửa tiếp riêng **thức quạt Thiền Sư**: cả hai tay giữ cán búa, vung một đường quạt ngang **từ phải sang trái**, thay động tác chưa rõ ở v02. [Sweep v03](../assets/source/skill-revise-sweep-v03/README.md) giữ riêng các pose mới; các thức còn lại và skill khác giữ nguyên. Chưa có approval mới cho bản quạt này.
