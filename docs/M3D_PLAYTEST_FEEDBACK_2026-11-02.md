# M3D — feedback playtest ngày 2026-11-02 và prompt VFX r3

## Director approval — 2026-11-03

Director xác nhận: “ok tôi duyệt tất cả các thay đổi này”, sau bản bàn giao commit `521f73cd` (bao gồm integration r3, feedback followup và fix Vô Ảnh/tốc creep). Runtime được duyệt trong game. Đây không phải lệnh merge: vẫn giữ riêng `wip/m3d/feedback-integration`, chưa merge `milestone/m3d`. Canonical skill MD/bộ nhớ sau merge vẫn chờ merge thật; không thay byte hoặc tự viết lại các asset lock lịch sử.

## Bổ sung 2026-11-03 — tốc creep và Phát Động B

- Director yêu cầu giảm tiếp10% tốc quái phó bản: 72%×90%=**64,8% actual buffed entry speed**. Supersede con số72% ở phần lịch sử dưới; giữ soft separation.
- Vô Ảnh không phát động: một chân tại giữa thân. Phát Động thành công: ba chân trên/giữa/dưới song song, lặp hai lần (sáu projectile). Thứ tự Toàn Phong Thoái → Ca Diệp Thoái → Vô Ảnh Cước vẫn phải trúng cùng target; không đổi thành chỉ bấm phím là được buff.
- Đã tái hiện bằng actual Q/W/E: E cách W10tick bị bỏ khi action Ca Diệp đang active; E cách W17tick chọn nhánh một chân trước khi ụ đất trúng; E cách W32tick hoạt động. Sửa bằng một input finisher chờ action/hit của projectile step2 thật kết thúc, giữ hướng bấm và kiểm cooldown/mana khi cast thực; không tạo combo giả. Miss/hết projectile → một chân. Duplicate input không xếp nhiều cast; A/skill khác/Shift, stun/silence, chết/đổi vùng/respec dọn lệnh chờ. Thời hạn hữu hạn lấy từ lifetime projectile/action, không dùng timing preview.
- Giữ nguyên asset khóa, damage/mana/cooldown và phase/facing/pivot r3. Canonical MD/bộ nhớ chỉ cập nhật sau merge thật như quyết định trước.

Bàn giao: [M3D_VO_ANH_FIX_2026-11-03.md](M3D_VO_ANH_FIX_2026-11-03.md). Final PASS547 unit/integration,18 workflow,15 validators,2 browser; game review ở5597 với server3097. Không merge milestone.

## Feedback sau integration r3 — đã triển khai, chờ duyệt trong game; supersede tương ứng

1. Creep private: giảm20% tốc hiện tại (90%×80%=72% actual buffed entry speed); sửa pack overlap bằng giãn footprint deterministic trên server, không coi đó là giới hạn bắt buộc của2D.
2. JSON chỉnh tần suất boss, giãn nhịp Lý Mạc Sầu. Solo không popup mời, chết lần2 tự về arena; ledger chỉ reset theo boss vẫn giữ.
3. Hỏa Pháo Thiên La tự chạy, Hồng Liệt tiếp tục A1/A2; chỉnh vị trí I. Chu card dùng nền arena, tiểu đồng phải đánh/giết được và rơi rượu, uống có VFX. Director bổ sung: boss phòng thủ cao, rượu buff sát thương bằng xuyên một phần phòng thủ. Bộ số thử: defense180, Tửu lực12s bỏ qua70% defense Chu, uống lại refresh không stack; không tác dụng target khác, chết/đổi vùng/reset mất buff. Càn Khôn hút×2 và cấm Shift trong reflect.
4. Phá Giáp: hit và ground VFX theo cả hướng chéo; body vẫn dùng facing gần nhất của atlas khóa.
5. Vi Đà offset63→189; Toàn Phong range360→234, Ca Diệp420→273; Vô Ảnh giữ6 feet khi có đúng chuỗi Phát Động trên cùng target phía trước, thiếu chuỗi thì1 foot giữa thân; empowerment damage vẫn xác nhận trên hit đúng target. Buddha Như Lai scale×2.
6. Icon Sư Tử Hống mới, art gốc, giữ ID tam_gioi_quy_thien và toàn bộ asset khóa.

Quyết định rượu mới nhất thay đề xuất hồi25%HP/MP/visual-only: buff xuyên phòng thủ boss kèm effect, không heal/immunity. Canonical MD và bộ nhớ sau merge vẫn theo quy tắc đã chốt; không merge milestone/m3d.

Bàn giao runtime, số tuning và kiểm chứng: [M3D_PLAYTEST_FOLLOWUP_HANDOFF.md](M3D_PLAYTEST_FOLLOWUP_HANDOFF.md). JSON nhịp boss: `packages/game-data/src/boss-cadence.json`, hướng dẫn [M3D_BOSS_CADENCE.md](M3D_BOSS_CADENCE.md). 533 unit/integration,18 workflow,15 validators và4 browser đã PASS qua final pipeline + browser-stage retry sau sửa test acknowledgement; không tự đổi report FAIL lịch sử thành PASS.

## Trạng thái và cách tiếp tục

- Nguồn: feedback trực tiếp của director sau khi chạy bản tích hợp r2 trên branch `wip/m3d/feedback-integration`.
- Đây là nơi tập trung toàn bộ yêu cầu mới, câu hỏi cần chốt, prompt art review và việc cần làm sau merge. Giữ nguyên phần nguyên văn bên dưới; ghi câu trả lời và quyết định bổ sung theo ngày.
- **Visual review6 đã được director duyệt; đã tích hợp gameplay/Phaser, chờ director duyệt trong game.** Approval aggregate tại assets/m3d-feedback-review-r3/director_approval_r3.json; batch03 có lock321 file. Phất Trần Công giữ nguyên. Phạm vi đầy đủ/checklist và bốn câu trả lời đã chốt tại [M3D_FEEDBACK_GAMEPLAY_INTEGRATION_PLAN.md](M3D_FEEDBACK_GAMEPLAY_INTEGRATION_PLAN.md).
- Thứ tự director yêu cầu: hỏi/chốt feedback → sản xuất và duyệt VFX review → tích hợp Phaser/gameplay theo phạm vi đã chốt → kiểm chứng trong game → director duyệt. Không tự merge vào `milestone/m3d`.
- Baseline tích hợp r2: commit `0b79e483`; bàn giao tại [M3D_FEEDBACK_INTEGRATION.md](M3D_FEEDBACK_INTEGRATION.md). Visual handoff tại [m3d-feedback-visual-handoff.md](m3d-feedback-visual-handoff.md), tech tại [m3d-feedback-tech-handoff.md](m3d-feedback-tech-handoff.md).
- File này là bàn giao bền vững trong repository cho các phiên tiếp theo. Chưa sửa các MD quy tắc chính thức để biến yêu cầu còn mở thành luật đã duyệt.

## Feedback nguyên văn

1. Bỏ nút Đồng Đội Kết Nối đi, không cần tính năng nay
2. Sửa hotkey O cho võ công, P cho phó bản, ESC quit. Thêm icon hotkey ngay dưới các nút.
3. Thay ava arena cho Hoàn Nhan Hồng Liệt và Kim Luân Pháp Vương, Lý Mạc Sầu, đổi thứ tự
4. Phó bản quái luôn là phó bản private. Phó bản boss luôn là phó bản shared. Không cần chọn private hay share nữa. Khi người chơi chọn phó bản boss/share, hiện popup hỏi có muốn triệu hồi trợ giúp của đồng đội không. Đồng đội sẽ hiện popup xem có trợ giúp không. Có 30s để trả lời. Nếu tất cả player cùng vào thì pause wave quái bên ngoài để mọi người focus vào phó bản. Chỉ cần 1 người nói không, hoặc quit khỏi phó bản shared thì wave quái vẫn chạy tiếp. Người đó sau khi quit vẫn có thể vào phó bản shared, nhưng lời mời chỉ gửi đến các đồng đội không có trong phó bản shared. Nói chung tôi muốn, nếu tất cả mng đều trong phó bản boss -> pause wave quái
5. Ở mỗi phó bản boss lúc chọn có một icon chữ I cho information, ấn vào ra popup giải thích mechanism boss.
6. Với phó bản quái. Chỉ gen 1 sprite quái cho 1 wave. Wave sau gen sprite khác. Quái phải có tốc chạy kém người chơi lúc vào phó bản chỉ 10%, nếu không tay dài rất dễ vào thả diều
7. Boss dungeon
   - Thu nhỏ arena tất cả các boss lại 20%. Giờ đang hơi rộng quá dễ để thả diều.
   - Boss cần dùng skill đánh thường tầm gần và tầm xa liên tục. Giờ đang hơi lười dùng skill đánh thường
   - Tăng tốc độ chạy tất cả các boss.
   - Lý Mạc Sầu:
     - Cần 1 skill đánh thường phất trần aoe 360 quanh người, phạm vi rộng
     - Cần 1 skill bắn xa, bắn độc châm, xa hơn tầm xa của cái bang chưởng và thiên sơn phiến
     - Cổ Mộ Kiếm Pháp: Triệu hồi random 4, 6, 8 minion. Tất cả minion đều có skill bắn xa
     - Phất Trần Công. Tăng x4 tầm xa và độ rộng
   - Hoàn Nhan Hồng Liệt:
     - Đòn đánh thường A1 chém 3 đường đao, sửa thành 5 đường, tăng tầm xa 20%
     - Đòn đánh thường A2 chém vòng cung, tăng tầm xa = skill bắn xa của thiên sơn phiến + 10%
   - Chu Bá Thông:
     - Giảm thời gian Túy Tiên Bộ. Trong lúc bay túy tiên bộ vẫn có thể bắn chưởng đánh thường
     - Càn Khôn Phản Chấn: Hút toàn bộ map về phía Chu Bá Thông, tầm ảnh hưởng là toàn arena
     - Âm Dương Nghịch Chuyển: Ngoài những vòng âm dương ở dưới chân tôi thấy ok rồi, có 1 hình ảnh âm dương lòe lòe trên arena hơi rối, nên bỏ.
   - Kim Luân Pháp Vương
     - Hoắc Đô
       - Phiến Trung Độc Đinh và Cuồng Phong Vạn Nhận. Ám khí độc cần màu sáng hơn và to hơn
     - Đạt Nhĩ Ba
       - cần spam skill nhiều hơn. Giảm thời gian thông báo skill Đạt Nhĩ Ba
       - Không cần hiệu ứng chuyển Bất Động Kim Cang từ người này sang người khác, chỉ tắt 1 người và bật ở người còn lại
     - Kim Luân:
       - Đánh thường Kim Luân bay nhanh hơn
       - Thêm 1 skill đánh thường, dùng tay chém đao khí hình bán nguyệt bay nhanh về 1 người chơi. Bán nguyệt khá lớn
       - Kim Luân hình tròn, hiện giờ đang hình bầu dục
       - Kim Luân Truy Hồn: Tăng lên 7 kim luân
       - Ngũ Luân Hộ Thể: Tăng lên 7 kim luân
8. Review skill phái
   - Tăng cooldown shift lên 8s 1 charge
   - Cái Bang Bổng : Thiên Hạ Vô Cẩu duration lâu hơn 30%. Hiệu ứng đập cuối cần lan rộng hơn. Phá Giáp Bổng : Rework, xoay gậy, giờ gậy lên, gậy hóa dài ra, rồi ra vụt 1 đường xuông đất khá xa.
   - Thiên Sơn Đao: Liệt Phong Đao. Thanh đao hiện lên trên đầu thỉnh thoảng đang bị ngược, cần xoay thanh đao theo hướng người dùng đang face
   - Võ Đang Quyền: Đánh lùi bằng đánh thường giảm tỉ lệ xuống còn 10%, tương tự với kiếm khí của Võ Đang Kiếm
   - Thiếu Lâm Quyền:
     - Tăng khoảng cách từ người đến vụ nổ của Vi Đà Quyền 50%.
     - Đánh thường: Bỏ Cooldown 4 thức đầu, roundhouse kick cuối bắn cước kình hình bán nguyệt bay ra xa. Ví dụ như tôi bấm A A A A -> đấm đấm đá đá + bắn cước kình -> cooldown. Nếu tôi bấm A, nghỉ trên 2 giây -> cooldown.
     - Vô Ảnh Cước: Tăng tầm xa và thời gian duy trì, cần hiện hình ảnh bàn chân đá ra xa.
     - Toàn Phong Thoái: Rework, nhân vật đá ra lốc xoáy vàng đi vê phía trước 1 đoạn xa
     - Hoàng Tảo Cước: Rework đổi tên thành Ca Diệp Thoái. Đá quét liên tục lướt về phía trước. Lướt chậm hơn shift, gây dmg trên đường lướt
     - Như Lai Niết Bàn: Tượng phật hiện sau lưng, 1 chưởng từ trên trời giáng xuống, gây dmg lan rộng. Đánh xong để lại chữ phạn dưới chân 1 lúc, đi qua gây dmg
   - Thiếu Lâm Đao:
     - Tăng tầm xa và tầm xa animation tru tà
     - Kim Quang Hộ Trận effect đang hơi rối, che cả nhân vật
     - Tam giới Quy Thiền. Rework, đổi thành Sư Tử Hống, hiện hình đầu sử tử hống lên trời, AOE rộng, gây dmg, giảm giáp và slow AOE

> Ghi nhớ tất cả các feedback ở trên vào 1 chỗ nào đó. Sau khi worktree này được merge, skill rework cần được update vào md và bộ nhớ của bạn.
>
> Trước hết tôi cần bạn feedback lại cho tôi xem bạn có câu hỏi gì không. Sau đó tôi cần bạn cho tôi prompt để generate VFX review cho những thay đổi trên. Sẽ có thay đổi phaser nữa, nhưng để sau khi tôi duyệt VFX.

## Diễn giải và phân công phạm vi

| Nhóm | Việc cần thực hiện sau khi được chốt/duyệt |
| --- | --- |
| UI | Bỏ nút/tính năng Đồng Đội Kết Nối riêng; lời mời hỗ trợ boss ở mục 4 vẫn giữ. O võ công, P phó bản, ESC đóng popup trước hoặc mở xác nhận rời trận, nhãn/icon phím dưới nút. Nền arena cần thay cho Lý Mạc Sầu, Hoàn Nhan Hồng Liệt, Kim Luân Pháp Vương; thứ tự trái → phải: Lý Mạc Sầu, Hoàn Nhan Hồng Liệt, Chu Bá Thông, Kim Luân Pháp Vương. Icon I và nội dung cơ chế từng boss. Tất cả menu/popup trong viewport. |
| Dungeon/team | Quái private, boss shared, bỏ selector. Hỏi có mời hỗ trợ; chỉ mời người ngoài instance; lời mời 30s, nhận/từ chối, có thể tái nhập. Điều kiện pause theo vị trí cả đội cần chốt chi tiết. Server authoritative. |
| Quái | Một loại sprite cho cả wave, không phải chỉ spawn một con; wave tiếp đổi loại. Tốc độ = 90% tốc thực tế người chơi lúc vào, gồm buff. Không tự sinh hàng loạt sprite mới khi roster được duyệt đã đủ. |
| Boss | Review5: mỗi chiều arena110% so game hiện tại (diện tích121%), supersede thu nhỏ0.8; tốc chạy/cadence cao hơn; A của Cái Bang Chưởng và Thiên Sơn Phiến là mốc range. Thêm luật một lần hồi sinh, sau lần chết thứ hai chuyển màn xám và camera quan sát bằng mũi tên. Chưa tự gán con số cho các mức tăng không được chỉ định. |
| Skill | Shift 8s/charge; knockback Võ Đang 10%; A Thiếu Lâm Quyền bốn nhịp rồi cooldown 1s, timeout 2s rồi mới bắt đầu cooldown 1s; chữ Phạn gây damage khi bước vào; lốc vàng xuyên mục tiêu, mỗi mục tiêu một hit/cast; Ca Diệp Thoái dậm chân bổ xuống đất, phóng một ụ đất nổi chạy thẳng ra xa, gây damage và stun (thay thế bản đá quét lướt). Các tăng range/duration và rework còn lại theo phần nguyên văn và quyết định mới nhất. Tách visual choreography khỏi lịch damage và authoritative movement. |
| VFX r3 | Review raster mới/clip cần sửa độc lập, có đối chiếu r2. Không sửa loader/registry/renderer hay luật gameplay trong lượt art review. |

Chuẩn hóa tên khi bàn giao: tên đang có trong data là **Hoành Tảo Cước** (feedback viết “Hoàng Tảo Cước”), dự kiến đổi display name thành **Ca Diệp Thoái**; **Tam Giới Quy Thiền** thành **Sư Tử Hống**. Không đổi ID ASCII hoặc phá mapping cũ một cách ngầm định. **Như Lai Niết Bàn** là skill riêng với **Như Lai Thiên Diệp**; không sửa nhầm skill.

## Câu hỏi vòng đầu — giữ làm lịch sử

1. **Avatar/thứ tự:** “ava arena” là thumbnail/ảnh đại diện trong menu chọn boss, hay nền arena? Muốn dùng ảnh nào và thứ tự đầy đủ bốn boss (gồm Chu Bá Thông) ra sao?
2. **Điều kiện pause:** có đúng là tất cả người đang kết nối phải ở **cùng một instance boss shared**, và pause chỉ theo occupancy hiện tại? Đề xuất từ chối/hết 30s không khóa pause vĩnh viễn: nếu sau đó tất cả vẫn vào thì pause. Cần chốt người chết/disconnect có tính vào “tất cả” không.
3. **Pause cái gì và lời mời hoạt động thế nào:** dừng cả lịch đợt xâm lăng, quái đang sống và invasion boss bên ngoài hay chỉ đồng hồ sinh wave? Nhận lời mời có dịch chuyển ngay không; người mời vào luôn hay đợi? Đề xuất 30s tính theo thời gian thực, không theo clock có thể bị pause; hết hạn = từ chối.
4. **Arena và nhịp boss:** giảm 20% từng chiều (diện tích còn 64%) hay giảm 20% diện tích? Các mức tăng tốc boss/đạn, tần suất đánh, giảm telegraph/Túy Tiên Bộ chưa có số: có thể đề xuất bộ thông số test riêng sau duyệt VFX không?
5. **Mốc range và tốc quái:** “tầm xa Cái Bang Chưởng/Thiên Sơn Phiến” là A hay skill chủ động nào? Tốc quái bằng 90% tốc di chuyển thực tế khi vào (kể cả buff/trang bị), hay tốc cơ bản chưa buff?
6. **Chuỗi A Thiếu Lâm Quyền:** đúng bốn lần bấm = đấm → đấm → đá → đá xoay kèm một cước kình, rồi cooldown? Khi ngắt quá 2s, cooldown bắt đầu lúc timeout hay từ đòn cuối? Cooldown bao lâu? Vẫn cần nhịp tối thiểu giữa các đòn để không biến tốc click thành DPS.
7. **Rework gây damage:** chữ Phạn Như Lai Niết Bàn gây damage mỗi lần bước vào hay theo tick khi đứng trong vùng? Lốc Toàn Phong và đường lướt Ca Diệp dự kiến trúng một lần/mục tiêu hay nhiều nhịp? Những duration/range/damage chưa có số sẽ chốt riêng, không lấy từ preview.
8. **ESC và Kim Luân:** đề xuất ESC đóng popup đang mở, khi không có popup thì mở xác nhận rời trận; có đúng ý “ESC quit” không? Với Kim Luân, đề xuất bánh luân nhìn tròn trên màn hình, còn quỹ đạo quay quanh mặt đất vẫn theo góc nhìn 3/4; có đúng ý không?

Các câu hỏi trên là lịch sử, không phải danh sách blocking hiện tại. Dùng câu trả lời và quyết định dưới đây làm căn cứ mới nhất; phần chưa được trả lời tường minh vẫn cần ghi riêng, không tự suy diễn.

## Nhật ký chốt

- 2026-11-02, vòng đầu: ghi nhận đầy đủ feedback và gửi 8 nhóm câu hỏi; chưa có approval r3.
- 2026-11-02, vòng hai: director trả lời như nguyên văn dưới đây. **Đủ thông tin làm VFX review r3; đây chưa phải approval cho art r3 chưa sản xuất.**
- 2026-11-02, bổ sung: director chốt mỗi lượt đánh boss được hồi sinh một lần; ra/vào phó bản hoặc reconnect không làm mới lượt hồi sinh, **chỉ boss reset mới cấp lại**.
- 2026-11-02, thay đổi mới nhất: **Ca Diệp Thoái chuyển sang dậm chân phóng ụ đất chạy thẳng, gây damage và stun**, tham chiếu ý tưởng Earth Spike của Lion trong DOTA. Quyết định này thay thế toàn bộ mô tả Ca Diệp đá quét trái/phải, lướt tiến và so tốc độ lướt với Shift trong feedback/câu trả lời trước. Các đoạn nguyên văn cũ được giữ làm lịch sử, không còn là scope hiện hành của skill này.
- 2026-11-02, bắt đầu art review r3: batch01 Ca Diệp gồm 16 body key-poses/bốn hướng, 20 ground cels/bốn hướng và 4 stun billboard cels, source/atlas/metadata/viewer riêng. Static validator và browser playback33 tag/40 cel PASS; không phải Phaser hoặc multiplayer verification. Đã kiểm lại1004 file lock r2 và89 file lock Thiếu Lâm trước sản xuất. Chờ director duyệt concept/pose trước mở rộng in-between theo bước batch nhỏ đã yêu cầu. Bàn giao/giới hạn tại [r3 README](../assets/m3d-feedback-review-r3/README.md); [inventory toàn scope](../assets/m3d-feedback-review-r3/review-inventory.json). Chưa duyệt r3 và không tự merge.
- 2026-11-02, verification batch01: `check:final` qua21 prerequisite stages (18 workflow tests,498 unit/integration tests/43 files, build,15 asset validators). Browser assertions PASS nhưng lượt runner có server phụ treo teardown, đã dừng và sửa harness; rerun riêng browser scope trên viewer do task sở hữu: **1 passed (18.2s), exit0**. Xem [verification summary](evidence/sessions/m3d-r3-concept-review/verification-summary.json); không coi report snapshot RUNNING của lượt đã dừng là task còn chạy hoặc toàn pipeline exit0. Chưa có approval art r3/Phaser r3.

- 2026-11-02, director duyệt animation Ca Diệp batch01 và chốt xuyên mọi mục tiêu: mỗi mục tiêu trên đường ụ đất đều nhận damage + stun. Approval và hash lock riêng trong package r3; không duyệt thay các mục khác hoặc runtime. Chưa implement gameplay all-target.

- 2026-11-02, tiếp tục VFX r3 sau duyệt Ca Diệp: batch02 Phá Giáp Bổng có20 body key-poses/20 VFX cels,36 tag, source/atlas/viewer độc lập. Đã sửa strike_up sai hướng và feet detector bắt nhầm đầu gậy; không sửa55 file Ca Diệp đã khóa. Focused browser PASS (1 test,14.5s); `check:final` session `m3d-r3-batch02` **PASS exit0 trong184.36s,2 browser tests** cho cả hai batch. Chưa director duyệt Phá Giáp; chưa live Phaser. [Bàn giao batch02](../assets/m3d-feedback-review-r3/batch02-pha-giap-bong/README.md); [timings](evidence/sessions/m3d-r3-batch02/check-workflow/final-timings.json).

- 2026-11-02, Phá Giáp review2: director yêu cầu vệt trái phải nằm dưới đất và gậy xoay thật. Đã đo lại ground seam thay anchor bbox bị bụi kéo lên26.88px; bổ sung source body/staff spin,8 frame/hướng dùng6 pose khác nhau/hướng, giữ nguyên16 pose nâng/đập/hồi. Static68 frame references/36 tag PASS; focused browser19.5s PASS; `check:final` session `m3d-r3-batch02-review2` **PASS exit0 trong160.72s,2 browser tests**. Ca Diệp55 file khóa giữ nguyên. Chưa director duyệt Phá Giáp review2; chưa sửa gameplay/Phaser. PNG/report/exports review1 được giữ trong history.

- 2026-11-02, đổi ý Phá Giáp review3: director yêu cầu bỏ xoay, chỉ nâng rồi đập và vệt đập dài hơn. Yêu cầu này supersede phần xoay ở review1/review2. Selected manifest mới chỉ raise/strike/recovery, không spin/charge/hold elongate riêng; vệt ground preview khoảng1.5 lần review2, không đổi range gameplay. Static24 frame references/20 tag PASS;21 prerequisite stages của check:final PASS. Browser đầu quét nhầm spec lịch sử; đã exclude history và rerun2 spec hiện hành PASS (26.7s), exit0, giữ failure report ban đầu. Giữ lịch sử và source cũ. Chưa duyệt review3. [Verification](evidence/sessions/m3d-r3-batch02-review3/verification-summary.json).

### Trả lời director nguyên văn

1. Ava arena là nền arena. Thứ tự mới trái sang phải: Lý Mạc Sầu, Hoàn Nhan Hồng Liệt, Chu Bá Thông, Kim Luân Pháp Vương
2. Chính xác. Người mất kết nối, lúc kết nối lại back về arena chính, đánh quái wave. Người chết trong phó bản boss có 1 lần hồi sinh duy nhất, chết cả 2 lần thì màn hình xám, có thể di chuyển camera = mũi tên để xem.
3. Dừng cả đồng hồ, lời mời có tác dụng 30s
4. Giảm cả rộng và ngang 20%, tôi sẽ tinh chỉnh thêm
5. Ý tôi la đòn A của 2 phái. Tốc quái = 90% tốc độ cả buff của người chơi.
6. Chính xác. Cooldown 1s. Khi nghỉ quá 2s, cooldown băt đầu từ lúc hết 2s
7. Chữ Phạn gây dmg khi bước vào. Lốc Toàn Phong đánh 1 nhịp trên 1 mục tiêu, nó là lốc màu vàng đi xuyên qua mục tiêu, bạn hiểu nó là 1 dạng chưởng cũng được, nhưng animation là lốc. Ca Diệp Thoái là di chuyển về phía trước bằng cách đá quét chân trái chân phải
8. Đúng

### Bổ sung nguyên văn về lượt hồi sinh

> Mỗi lượt đánh boss được hồi sinh 1 lần. Ra vào phó bản hoặc reconnect không làm mới lượt hồi sinh, chỉ reset khi boss reset.

### Bổ sung nguyên văn mới nhất về Ca Diệp Thoái

> tôi đã đổi ý, ca diệp thoái nên sửa lại giống Earth Spike của Lion trong DOTA. Thiếu Lâm dậm chân xuống đất kiểu đá bổ củi. Một cục đất nổi lên chạy từ phía thiếu lâm đi thẳng 1 đường dài. Gây dmg và stun. Update lại tài liệu và cho tôi prompt mới

### Duyệt animation Ca Diệp và chốt xuyên mục tiêu

> Animation ok, nhưng nên nhớ, tất cả target trên đường ụ đất di chuyển đều nhận dmg và bị stun

- Director đã duyệt animation Ca Diệp Thoái được trình ở batch01, gồm body/ụ đất/stun. Ghi approval riêng và khóa đúng raster/source/export hiện có; không suy thành duyệt các skill/background r3 khác hoặc production Phaser.
- **Ụ đất đánh xuyên suốt đường đi: tất cả mục tiêu hợp lệ trên đường đều nhận damage và stun; không dừng ở mục tiêu đầu tiên.** Khi tích hợp, server kiểm tra từng mục tiêu dọc đường; số frame VFX không tạo thêm damage/stun.
- Đây là yêu cầu gameplay đã chốt, chưa được implement hoặc multiplayer-verify. Preview hiện có một mục tiêu minh họa, không phải bằng chứng all-target gameplay PASS.

### Feedback Phá Giáp Bổng review2 — lịch sử, phần xoay đã bị thay thế

> Phá Giáp Bổng animation trái đang hơi lỗi. Đường bổng đập không hiện dưới đất mà hiện ngang với player. Nếu hiệu ứng xoay có thể làm xoay gậy thì tốt

- Vệt impact/outro phải neo theo đường tiếp đất thực tế phía trước feet, không theo torso hoặc phần trăm bounding box có bụi. Phải kiểm tra trực tiếp hướng trái ở normal zoom.
- Pha xoay cần chuyển động của tay và cây gậy bằng frame raster, không chỉ vòng VFX trên pose đứng yên. Review2 có8 frame refs/hướng từ6 pose khác nhau/hướng; phần lặp/pose mirror được ghi rõ, không claim tất cả frame đều được vẽ riêng.
- Bản sửa đã được kiểm chứng trong viewer độc lập, chưa được director duyệt hoặc tích hợp production. Giữ phạm vi phase/timing là presentation fixture, không đổi gameplay theo animation.

### Phá Giáp Bổng review3 — quyết định mới nhất

> Bỏ hiệu ứng xoay gậy đi, chỉ giơ lên và đập thôi, hiệu ứng quãng bị đập dài hơn

- Bỏ cả body spin và vòng VFX xoay; không chọn pha tụ lực hoặc hold hóa dài riêng. Chỉ nâng gậy rồi đập, hồi thế để kết thúc action.
- Dùng hai pose nâng trong cùng phase raise; gậy dài khi nâng, không tạo thêm bước đứng chờ. Vệt đập tiếp tục neo theo ground seam, kiểm normal zoom bốn hướng, nhất là trái.
- Review3 minh họa vệt dài hơn khoảng50% (phải213px/trước142, trái219/trước146, xuống133/trước89, lên140/trước94). Đây là giá trị presentation để duyệt, chưa chốt hệ số gameplay range.
- Component mới b3 có16 body frame references/12 tag và8 ground cel/8 tag; selected metadata không chứa spin/charge/elongate. Source/spin/export review cũ giữ trong lịch sử; Ca Diệp và visual r2 đã khóa giữ nguyên. Director đã duyệt review3 ở lượt kế tiếp; 34 file art được khóa riêng, chưa sửa production gameplay/Phaser.

### Quyết định đã chốt cho vòng này

- “Ava arena” là **nền arena**, không phải portrait. Thay nền ba boss Lý Mạc Sầu, Hoàn Nhan Hồng Liệt và Kim Luân Pháp Vương. Thứ tự hiển thị bốn boss từ trái sang phải: **Lý Mạc Sầu → Hoàn Nhan Hồng Liệt → Chu Bá Thông → Kim Luân Pháp Vương**.
- Pause dựa trên mọi người đang kết nối thực sự cùng ở một instance boss shared; một lần từ chối không cấm pause nếu sau đó cả đội đã vào đủ. Rời instance thì wave tiếp tục. Người reconnect trở về arena chính; khi họ ở ngoài thì không đủ điều kiện pause.
- Ngoài wave, **đồng hồ cũng dừng** khi pause. Lời mời có hiệu lực **30s**. Không suy diễn câu này thành pause toàn bộ simulation boss, thời hạn lời mời hoặc clock mạng.
- Trong boss dungeon, mỗi người có **một lần hồi sinh cho mỗi lượt đánh boss**. Ra/vào phó bản hoặc reconnect **không làm mới lượt hồi sinh**; **chỉ khi boss reset mới cấp lại một lần hồi sinh**. Chết lần thứ hai thì màn hình xám, dùng mũi tên di chuyển camera quan sát. Không tự đưa người đã hết mạng về arena hoặc cho mũi tên tiếp tục điều khiển nhân vật chết.
- **Arena review5 mới nhất:** tăng chiều rộng và chiều dài10% so bản trong game hiện tại, tức mỗi chiều×1.1 và diện tích×1.21. Supersede đề xuất thu nhỏ0.8 chưa triển khai; không tính1.1 trên bản0.8. Geometry/collision sẽ sửa ở lượt implementation sau, không giả bằng zoom camera.
- Mốc range so sánh là **đòn A** Cái Bang Chưởng/Thiên Sơn Phiến. Tốc quái lấy **90% tốc thực tế, gồm buff, tại lúc người chơi vào**; không tự cập nhật liên tục theo buff phát sinh sau đó.
- A Thiếu Lâm Quyền: **đấm → đấm → đá → đá xoay kèm một cước kình**, bốn lần bấm A, sau finisher cooldown **1s**. Nếu bỏ dở quá **2s**, tại thời điểm hết 2s mới bắt đầu cooldown **1s**. Không đặt cooldown A hiện tại giữa từng nhịp; nhịp input/animation vẫn cần contract hữu hạn, không mặc định thêm damage theo click hoặc số frame.
- Chữ Phạn Như Lai Niết Bàn gây damage **khi bước vào**, không phải DoT đứng yên theo tick. Hành vi re-entry trong cùng một cast chưa chốt.
- Toàn Phong Thoái là projectile hình **lốc vàng**, tiến thẳng và xuyên mục tiêu; **một hit cho mỗi mục tiêu trong một cast**, không loop hit liên tục. Nhân vật không bị kéo theo lốc.
- Ca Diệp Thoái — **quyết định mới nhất, thay thế bản đá quét lướt**: Thiếu Lâm nhấc chân rồi **dậm/bổ chân xuống đất kiểu đá bổ củi**; từ phía chân nhân vật xuất hiện **một ụ đất nổi di chuyển thẳng theo một đường dài**, gây **damage và stun**. Chuyển động tiến thuộc ụ đất, không còn là nhân vật lướt/đá quét tiến cùng skill. Earth Spike của Lion trong DOTA là tham chiếu ý tưởng; thiết kế body pose/đất/impact phải là art gốc đúng phong cách Thiếu Lâm. Không mặc định nhập thông số hay các cơ chế khác từ DOTA.
- Ca Diệp **xuyên tất cả mục tiêu trên đường ụ đất di chuyển; mỗi mục tiêu hợp lệ đều nhận damage và stun**, ụ đất tiếp tục đi sau khi gặp mục tiêu. Animation batch01 hiện có đã được director duyệt; thông số và số lần trúng lại cùng một mục tiêu vẫn tách riêng.
- ESC đóng popup hiện tại trước; nếu không có popup thì mở xác nhận rời trận.

### Chi tiết gameplay còn mở — không chặn sản xuất VFX

- Quyền rời/chuyển từ spectator, thời gian và vị trí hồi sinh cần contract trước khi code. Phạm vi cấp lại lượt hồi sinh đã chốt: chỉ boss reset, không phải ra/vào hoặc reconnect.
- Khi pause ngoài arena: đã chốt dừng đồng hồ; cần đặc tả chính xác quái đã sống/invasion boss, projectile và damage/statue AI nào bị freeze. Không chỉ dừng spawn mà để tượng tiếp tục mất HP khi cả đội đã vào boss một cách ngầm định.
- Nhận lời mời có teleport ngay không; người mời vào luôn hay chờ; timeout và xử lý lời mời trùng/khác instance cần chốt trước implementation. 30s dùng thời gian thực là đề xuất kỹ thuật, chưa được xác nhận riêng.
- Ca Diệp Thoái: range/width/tốc ụ đất, damage, thời gian stun, cooldown và số lần trúng lại cùng một mục tiêu chưa được chỉ định. **Xuyên nhiều mục tiêu đã chốt**, không còn pending. Không tự suy diễn các giá trị hoặc thêm hất tung chỉ vì có tham chiếu Earth Spike. Retrigger chữ Phạn khi ra/vào lại, buff/CC-duration và các con số tuning chưa chỉ định khác vẫn pending. Không dùng thời lượng preview làm giá trị gameplay.

## Prompt thực hiện VFX review r3 — đã cập nhật câu trả lời director

Sao chép nội dung khối dưới cho phiên sản xuất art. Đủ thông tin để làm art; các chi tiết gameplay còn mở được ghi riêng, không cần tự quyết để dựng viewer hoặc sản xuất frame.

```text
Sản xuất sprite/VFX review r3 cho Võ Lâm Hero Defense theo toàn bộ feedback trong
docs/M3D_PLAYTEST_FEEDBACK_2026-11-02.md, bao gồm nhật ký chốt mới nhất.
Đây là tác vụ sản xuất và review art độc lập, gồm VFX/body poses và nền arena
được yêu cầu. Chưa tích hợp production Phaser. Dùng quyết định mới nhất và các
bổ sung sau vòng hai; đặc biệt Ca Diệp Thoái đã thay thiết kế đá quét lướt bằng
dậm chân phóng ụ đất gây damage và stun. Không hỏi lại các điểm đã chốt.

ĐỌC VÀ KIỂM TRA
- Đọc AGENTS.md, ART_DIRECTION_REFERENCE.md, ART_ASSET_GUIDE.md,
  ART_PRODUCTION_STANDARD.md, docs/ART_ITERATION_WORKFLOW.md,
  docs/DEVELOPMENT_WORKFLOW.md, tài liệu feedback trên,
  docs/m3d-feedback-visual-handoff.md và docs/M3D_FEEDBACK_INTEGRATION.md.
- Dùng skill pixel-art-pipeline; xem ảnh reference thật và anti-reference.
  Trước khi làm UI, đọc UI_UX_SPEC.md và xem reference UI theo AGENTS.md.
- Kiểm assets/m3d-feedback-visual/director_approval_r2.json,
  assets/m3d-feedback-visual/approved_visual_r2.lock.json và các lock/manifest
  school/boss liên quan trước khi dùng asset. Xác nhận đường dẫn thực tế.
- Giữ nguyên byte của asset/source/metadata đã khóa. Tái dùng bản được duyệt
  khi phù hợp; xuất phần chỉnh sửa vào package revision mới, không ghi đè r2.

ĐẦU RA VÀ CHẤT LƯỢNG
- Package riêng assets/m3d-feedback-review-r3/ với source raster thật, source
  chỉnh sửa được nếu có, PNG atlas alpha, JSON frames/tags, manifest và provenance.
  Không lấy sheet concept làm atlas hoặc bịa provenance/frame độc lập.
- Detailed chibi wuxia pixel art đúng identity/palette/scale đã duyệt, camera
  orthographic 3/4 cố định, pixel edges sạch, không geometric placeholder.
  Nếu cần art mới, dùng công cụ image generation cho raster nguồn rồi kiểm từng
  pose/frame; không chỉ kéo dài ảnh cũ để giả lập động tác rework mới.
- Bốn facing down/up/left/right cho nhân vật/VFX định hướng; ghi riêng quy tắc
  billboard cho effect đối xứng. Feet pivot ổn định; có effect anchor, offset,
  frame order, alpha bounds và native scale. Body pose và VFX tách layer/component.
  Có intro/anticipation, release, travel, impact, loop/hold và outro khi phù hợp.
  Không gộp toàn choreography thành một clip duy nhất bắt buộc chạy hết.
- Quyết định mới nhất: làm một lượt các sprite/VFX còn lại để director duyệt cùng
  một gallery. Không dừng xin duyệt từng skill. Giữ Ca Diệp batch01 và Phá Giáp
  review3 đã khóa; tái dùng tool/source còn hợp lệ.

INVENTORY PHẢI COVER
1) Cái Bang Bổng:
   Thiên Hạ Vô Cẩu giữ bốn chó lửa chạy quanh như runtime, vòng xoay AOE lớn hơn,
   loop/duration minh họa +30%; đập cuối neo cùng mặt đất tại feet, không lệch xuống.
   Phá Giáp Bổng theo quyết định mới nhất review3: chỉ giơ gậy rồi đập xuống đất;
   bỏ cả body spin, vòng VFX xoay, charge và hold elongate riêng. Hai pose nâng
   có thể nằm trong cùng phase raise. Vệt impact/outro dài hơn (preview khoảng
   +50% review2, chưa phải gameplay range), neo ground seam phía trước feet,
   kiểm tra bốn hướng/normal zoom, nhất là trái. Không dùng bbox bụi làm anchor.
   Source/cel xoay cũ chỉ giữ làm lịch sử, không được chọn trong manifest hiện hành.
   Bản review3 đã được director duyệt; không sinh lại hoặc thay selected art đã khóa.
2) Thiên Sơn Đao Liệt Phong: giữ chuôi xuất phát trên đầu và ground effect runtime.
   Trái phải lưỡi xuống/sống lên, không cho sống chạm đất trước; phản chiếu ngang
   đúng chiều, không xoay180 hoặc lật dọc làm đảo lưỡi.
3) Thiếu Lâm Quyền:
   - Vi Đà: offset eruption +50% so baseline, tách caster/ground effect.
   - A: chính xác bốn nhịp đấm → đấm → đá → đá xoay + một cước kình bán nguyệt
     bay xa. Mỗi lần bấm A trình một nhịp, bỏ key repeat. Viewer có thể hiển thị
     quy tắc đã chốt: hết chuỗi cooldown 1s; dở chuỗi nghỉ quá 2s thì mới bắt đầu
     cooldown 1s. Đây là presentation fixture, không sửa mechanic production.
   - Vô Ảnh Cước: gốc giữa thân; ba chân phát lần lượt trên/giữa/dưới theo ba làn
     thẳng song song thành bậc thang. Range/duration tăng; tuning còn pending.
     Không tạo nhiều hit gameplay từ số frame/bóng chân.
   - Toàn Phong Thoái: động tác đá phóng projectile lốc vàng thẳng về phía trước,
     xuyên mục tiêu; tách birth/travel/hit/outro. Lốc không biến mất ở mục tiêu
     đầu tiên và không giữ chân mục tiêu bằng loop. Một hit/mục tiêu/cast là
     gameplay đã chốt; không làm nhân vật bay cùng lốc hoặc lấy frame loop làm hit.
   - Ca Diệp Thoái — THIẾT KẾ MỚI, thay thế toàn bộ bản đá quét lướt:
     Thiếu Lâm nhấc chân rồi dậm/bổ chân xuống đất như đá bổ củi. Tại điểm tiếp
     đất xuất hiện một ụ đất/đá nổi, chạy thẳng một đường dài từ phía caster ra
     trước. Đọc rõ một đầu ụ đất đang tiến; bụi/nứt đất ngắn phía sau chỉ phụ họa,
     không biến thành bãi gai đứng yên phủ toàn đường ngay từ đầu. Nhân vật thực
     hiện động tác tại chỗ, không lướt theo ụ đất. Skill gây damage và stun.
     Tham chiếu ý tưởng Earth Spike của Lion trong DOTA, nhưng vẽ art gốc theo
     Thiếu Lâm và palette game; không sao chép asset/âm thanh/code DOTA hoặc nhập
     các thông số/cơ chế chưa được director yêu cầu.
     Tách body anticipation → foot slam/contact → recovery; ground birth →
     travel loop → target impact → outro; dấu hiệu stun trên mục tiêu là layer
     riêng, ưu tiên tái dùng effect được duyệt nếu phù hợp. Có bốn facing, feet
     pivot ổn định và effect anchor ở điểm chân chạm đất; tọa độ travel do viewer
     điều khiển riêng, không bake cả đường đi dài vào atlas.
     Viewer demo một cast, một ụ đất tiến thẳng và phản hồi impact/stun có nhãn
     presentation fixture. Đã chốt xuyên mọi mục tiêu trên đường: tất cả đều
     nhận damage và stun, ụ đất không dừng ở mục tiêu đầu. Khi mở rộng fixture,
     dùng nhiều mục tiêu thẳng hàng để thể hiện contract này. Không tự thêm hất tung,
     hit cadence, duration stun, damage/range/cooldown từ clip. Những mục này
     còn pending để chốt trước integration. Nếu đã có source bản đá quét, giữ
     làm lịch sử nhưng không chọn tags đó cho review mới; không ghi đè asset khóa.
   - Như Lai Niết Bàn: tượng Phật sau lưng, chưởng từ trời giáng, impact AoE rộng,
     để lại vùng chữ Phạn hữu hạn. Tách Buddha/sky palm/impact/ground-loop/outro;
     không che hero, không nhầm với Như Lai Thiên Diệp. Vùng đất có anchor riêng,
     không tự cho bám caster. Có minh họa một mục tiêu bước vào vùng chữ Phạn;
     damage kích hoạt khi bước vào, không tick liên tục khi đứng trong vùng.
     Không tự định nghĩa retrigger damage khi đi ra rồi quay lại cùng một cast.
4) Thiếu Lâm Đao:
   Tru Tà rút đao chém một đường tại chỗ; tăng reach bằng phóng đại đường/vệt
   chém, không bắn bán nguyệt/đao khí. Kim Quang Hộ Trận giữ effect đã được khen
   nhưng người đứng giữa trận, cả khi di chuyển; Sư Tử Hống thay Tam Giới Quy Thiền: pose hống, đầu sư tử hướng lên,
   shockwave AoE rộng, dấu hiệu giảm giáp/slow phân biệt rõ và không che mặt.
5) Lý Mạc Sầu:
   normal phất trần360 tăng thêm20% AOE; độc châm xa hơn nữa, gốc giữa thân boss,
   vẫn vượt A Cái Bang Chưởng và A Thiên Sơn Phiến. Cổ Mộ Kiếm Pháp có minh họa
   4/6/8 minion và shot cho tất cả. RÚT thay đổi Phất Trần Công khỏi review,
   giữ hiện trạng trong game. Tách summon/minion/shot/impact.
6) Hoàn Nhan Hồng Liệt:
   A1 năm đường đao chung gốc giữa boss, range minh họa+20%. A2 là một nhát
   vung đao chém180 độ trước mặt, reach=A Thiên Sơn Phiến+10%, KHÔNG bắn cung
   bay đi. Giữ facing, body và vệt chém tách riêng.
7) Chu Bá Thông:
   Túy Tiên Bộ GIỮ animation xoay lướt/bóng/vòng/gió như game hiện tại; hủy
   animation mới của review3. Chỉ thêm chưởng hướng về vị trí player khi phát,
   vẫn xoay lướt khi bắn. Càn Khôn Phản Chấn hút toàn arena. Âm Dương Nghịch
   Chuyển giữ effect runtime, các vòng ground liên tục đổi vị trí trên bản đồ,
   không neo lưới cố định. Review6 bỏ cả large_formation/core lẫn4 rotating_waves
   phủ màn hình lập lòe; GIỮ nguyên15 vòng ground đang ổn theo director.
8) Kim Luân Pháp Vương, Hoắc Đô, Đạt Nhĩ Ba:
   - Hoắc Đô: REVERT hình/scale/pattern của review, dùng đúng runtime hiện tại;
     Tăng sáng và sửa orientation: source nail nghiêng60–63 độ, bù góc từng
     frame để mũi nhọn đâm theo vector bay. Phiến Trung hai fan đối nhau; Vạn Nhận giữ spin,
     whirlwind và các đợt tám tia radial như game. Không tăng kích thước nữa.
   - Đạt Nhĩ Ba có phase telegraph ngắn gọn để hỗ trợ cadence sẽ chốt sau;
     Bất Động Kim Cang chỉ off ở người cũ/on ở người mới, không beam bay chuyển.
   - Kim Luân: wheel nhanh và bán nguyệt đều lấy giữa thân boss làm tâm/gốc phát;
     shot wheel có demo travel nhanh hơn; normal mới vung tay phát
     đao khí bán nguyệt lớn bay nhanh về hướng một mục tiêu; wheel đúng hình tròn
     theo quyết định director. Truy Hồn giữ mô tả gốc bắn luân đập quanh arena
     rất lâu, chỉ5→7: tỏa hướng và bật biên khắp sân, không các đường thẳng song
     song. Hộ Thể giữ xoay quanh boss AOE lớn rồi bắn tỏa nhiều hướng, chỉ5→7.
     Giữ các timing/speed đang có của game, không chế cơ chế mới từ preview.
     Tách từng wheel và từng phase orbit/release; không bake số lượng vào atlas.
9) Nền arena:
   Làm bản art review nền cho Lý Mạc Sầu, Hoàn Nhan Hồng Liệt, Kim Luân Pháp Vương,
   theo identity và reference arena hiện có, giữ camera orthographic 3/4. Trình
   concept bố cục trước khi mở rộng chi tiết tileset; không tự thay nền Chu Bá
   Thông khi chưa được yêu cầu. Mới nhất dựng footprint width/height x1.1 so
   arena trong game hiện tại (diện tích×1.21), thay yêu cầu thu nhỏ cũ,
   không giả thu nhỏ bằng đổi zoom. Đây là mockup art, chưa sửa collision/map thật.
   Thứ tự trái → phải trong review: Lý Mạc Sầu, Hoàn Nhan Hồng Liệt,
   Chu Bá Thông, Kim Luân Pháp Vương. Nền phải giúp đọc telegraph/VFX, feet và
   minion rõ, không dùng procedural Graphics làm art hoàn chỉnh.

PHẠM VI KHÔNG CẦN TỰ SINH ASSET MỚI
- Shift 8s/charge, knockback Võ Đang 10%, AI cadence/speed, collision arena,
  private/shared/invitation/pause, hồi sinh/spectator, hotkeys/ESC/I popup là
  backlog implementation.
  Chỉ sản xuất art phụ trợ khi có nhu cầu và scope rõ, không giả rằng art thực thi
  các luật này. Một sprite quái/wave ưu tiên roster đã duyệt, không gen quái hàng loạt.
- Mất kết nối rồi reconnect phải về arena chính; mỗi lượt đánh boss chỉ một lần
  hồi sinh, không cấp lại khi ra/vào hoặc reconnect, chỉ cấp lại khi boss reset.
  Chết lần hai màn xám và mũi tên điều khiển camera quan sát. Ghi vào handoff để
  tích hợp sau; không triển khai death/reconnect/spectator trong lượt art này.
- Nền arena và thứ tự đã chốt ở mục 9. Không tự làm portrait hoặc menu mới.

REVIEW ĐỘC LẬP
- Dùng viewer art độc lập (có thể kế thừa Canvas2D preview r2), không sửa production
  loader, animation registry, renderer, UI, game-core/server/protocol hoặc gameplay.
  Bố trí một dominant viewport, nhân vật ở normal gameplay zoom đúng scale; có
  so sánh baseline r2/reference, xem từng effect và phối hợp body+VFX.
- A một lần = một lượt trình diễn, bỏ key repeat; riêng chuỗi A hỗ trợ từng nhịp.
  Có chọn facing, pause/scrub, tốc chậm, bật/tắt layer và manual loop cho review.
  Mô phỏng cancel/chết/travel/hold/release có nhãn presentation fixture, cleanup
  rõ. Vùng ground cố định và aura bám chủ thể phải được phân biệt trong manifest.
- Mọi nhịp/tốc/range/đường đi trong viewer chỉ là minh họa art. Không biến chúng
  thành damage, cooldown, knockback, hitbox, range, teleport hoặc pause gameplay.
  Thông số chưa chốt phải ghi pending, không tự điền thành quyết định đã duyệt.
- Không tuyên bố đã live Phaser/multiplayer PASS trong tác vụ viewer độc lập.
  Gate live Phaser với state/events thật diễn ra ở lượt tích hợp sau director duyệt.

BÀN GIAO ĐỂ DUYỆT
- Inventory đối chiếu từng yêu cầu trên; selected tags/frame order/facing/feet pivot/
  effect anchor/phases/loop/cancel contract; provenance/license/source hashes;
  validation PNG/JSON/alpha/bounds và kiểm byte asset r2 không đổi.
- PNG contact sheet/native scale và PNG viewer ở normal gameplay zoom; ghi quan
  sát motion, facing, timing, loop, transitions và occlusion qua playback thật.
  Không video/GIF/WebM/MP4, không trace có screenshot playback stream.
- Báo riêng item hoàn thành, pending clarification, chưa đủ quality, cần director
  duyệt. Không tự đánh dấu approved. Trình URL viewer và đường dẫn evidence.
- Cập nhật feedback ledger và handoff r3; không merge milestone/m3d.
```

## Checklist sau khi duyệt VFX và tích hợp

- [x] Ghi trả lời 8 nhóm câu hỏi, chuẩn hóa quyết định và cập nhật prompt art.
- [x] Chốt một lần hồi sinh/người/lượt đánh boss; chỉ boss reset cấp lại, ra/vào và reconnect không cấp lại.
- [x] Cập nhật Ca Diệp Thoái sang dậm chân phóng ụ đất đi thẳng, damage + stun; đánh dấu bản đá quét lướt đã bị thay thế và sửa prompt review.
- [x] Ghi director duyệt animation Ca Diệp batch01 và chốt damage + stun cho tất cả mục tiêu trên đường ụ đất; không suy approval toàn r3/runtime.
- [ ] Regression Ca Diệp với nhiều mục tiêu thẳng hàng: tất cả nhận damage + stun, ụ đất đi tiếp sau mục tiêu đầu, đồng bộ multiplayer và cleanup đúng lifecycle.
- [ ] Chốt chi tiết hồi sinh/pause/invitation và các con số tuning còn mở trước khi code phần liên quan.
- [ ] Director duyệt concept/pose mới rồi animation r3; ghi approval có phạm vi, tạo lock revision mới; bảo toàn r2.
- [ ] Tích hợp loader/registry/Phaser theo selected tags/facing/pivots/anchors/phases và state/events server thật; không lấy choreography preview làm gameplay.
- [ ] Implement UI/dungeon/team/pause/AI/combat đã được chốt; giữ server authority và game-core độc lập.
- [ ] Regression riêng cho chuỗi A bốn nhịp/cooldown 1s/timeout 2s, cancel/death, projectile/loop/hold, lốc xuyên một hit/mục tiêu, Ca Diệp Thoái ụ đất thẳng/damage/stun theo state và hit contract sẽ chốt, vùng chữ Phạn entry-trigger, re-entry, lời mời 30s, occupancy/disconnect/reconnect về arena chính, một lần hồi sinh rồi spectator màn xám/camera mũi tên, ra/vào hoặc reconnect không cấp lại hồi sinh nhưng boss reset có cấp lại, và pause/resume đồng bộ multiplayer.
- [ ] Live Phaser normal zoom so reference/r2, quan sát chuyển động và PNG; chạy scope phù hợp theo DEVELOPMENT_WORKFLOW.md rồi check:final sau thay đổi implementation cuối.
- [ ] Bàn giao bản chạy để director duyệt; không tự merge milestone/m3d.

## Sau khi worktree được merge

Chỉ thực hiện khi merge thực sự xảy ra và dùng behavior cuối đã duyệt/triển khai:

- [ ] Đối chiếu toàn bộ feedback/decision với code merged; ghi commit merge và các mục deferred.
- [ ] Cập nhật CONTENT_DATA.md, COMBAT_SYSTEM.md và data/skill handoff cho tên Ca Diệp Thoái, Sư Tử Hống, chuỗi A, Như Lai Niết Bàn và các rework thực tế; giữ ASCII IDs tương thích hoặc ghi migration rõ.
- [ ] Cập nhật GAME_DESIGN.md/DECISIONS.md cho private/shared, lời mời, pause, reconnect về arena chính, một lần hồi sinh boss và spectator theo quyết định cuối; BALANCING.md cho thông số tuning, ACCEPTANCE_TESTS.md cho acceptance thực tế.
- [ ] Cập nhật tài liệu UI/architecture liên quan chỉ khi behavior thực tế thay đổi.
- [ ] Cập nhật file này và handoff tích hợp làm ngữ cảnh repository cho những phiên tiếp theo, tách requested/approved/implemented/verified/deferred. Không coi lưu file là bảo đảm bộ nhớ ngoài repository.


## Nhật ký duyệt Phá Giáp và batch phần còn lại — 2026-11-02

Director: “duyệt, còn sprite hay VFX nào cần sửa, hãy làm 1 loạt để tôi duyệt”. Approval áp dụng Phá Giáp Bổng review3 vừa trình: chỉ giơ rồi đập, không xoay/tụ lực/hold hóa dài, ground stroke dài hơn. Ghi `assets/m3d-feedback-review-r3/batch02-pha-giap-bong/director_approval_pha_giap_review3.json`; lock34 file art tại `approved_pha_giap_review3.lock.json`. Không suy thành duyệt gameplay hay tất cả r3.

Chỉ thị mới nhất supersede bước duyệt từng batch nhỏ trong prompt cũ: sản xuất cả23 mục art còn lại trong `assets/m3d-feedback-review-r3/batch03-remaining/`, một gallery chung. Batch03 là candidate chờ duyệt, không tự khóa như approved. Có source gốc12 yêu cầu image_gen, Aseprite/PNG/JSON, selected tags/phases/facings/pivots, provenance, PNG và báo cáo quan sát. Ca Diệp và Phá Giáp giữ nguyên. Ba nền mới là concept, chưa phải map/collision/Tiled sản xuất.

Đối chiếu range nguồn để bàn giao, chưa đổi game data: A Cái Bang Chưởng320 (`m1.ts`), A Thiên Sơn Phiến220 (`thien-son.ts`). Độc châm phải vượt cả hai; demo350 chỉ là đề xuất review. Hồng Liệt A2 theo yêu cầu220×1.1=242; A1 hiện tech600 (`hong-liet.ts`) thì yêu cầu+20% tương ứng720 khi triển khai. A1 trong viewer dùng quãng minh họa170→204 để so tỷ lệ, không biến thành range gameplay. Không nhân năm lần atlas thrust cũ đã có nhiều vệt; source một đao riêng tạo đúng năm instance.

Body chém tay mới của Kim Luân có bốn facing; action cũ Kim Luân/Hoắc Đô/Đạt Nhĩ Ba vẫn giữ giới hạn hướng dưới của asset đã duyệt. Không mô tả chúng như sprite attack bốn hướng mới. Mọi stat chưa chốt, AI cadence, dungeon/team/revive/pause và UI vẫn implementation-deferred theo yêu cầu trước. Chưa merge milestone/m3d; cập nhật canonical skill MD sau merge thật vẫn là checklist còn mở.

Batch03 verification cuối: `check:final` PASS exit0 trong220.70s (18 workflow,498 unit/integration,15 validators,4 browser); viewer phát300 selected tags/944 refs, PNG native/display và motion reports trong package. 5.207 protected input files kiểm hash; chưa Phaser/multiplayer r3. Toàn bộ23 candidate đang chờ director duyệt chung tại http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/?review=3 .


## Review4 — feedback director cho batch03 (mới nhất)

1. Liệt Phong Đao: khi chém trái, lưỡi phải ở dưới và chạm trước, sống ở trên; giữ chuôi bắt đầu trên đầu và ground effect như trong game.
2. Thiên Hạ Vô Cẩu: khôi phục chó lửa runtime, tăng AOE vòng xoay; dậm nổ cùng mặt phẳng đứng, không lệch xuống dưới.
3. Vô Ảnh Cước: gốc giữa thân; ba bàn chân lần lượt trên/giữa/dưới, các đường song song thành bậc thang.
4. Tru Tà: rút đao một nhát chém tại chỗ; phóng đại đường/vệt chém để xa hơn, không bắn bán nguyệt.
5. Kim Quang Hộ Trận: director chấp nhận style VFX, chưa duyệt vị trí; người phải đứng giữa trận. Không suy thành approval cả skill/batch.
6. Lý Mạc Sầu: độc châm xa hơn và phát từ giữa thân; phất trần360 thêm20% AOE. Hủy thay đổi animation Phất Trần Công, giữ hiện trạng trong lần review.
7. Hồng Liệt: A1 năm đường chung tâm boss; A2 chém180 độ trước mặt, không projectile vòng cung.
8. Túy Tiên Bộ: hủy animation bay/dash mới, giữ animation trong game; chỉ bổ sung vừa xoay lướt vừa bắn chưởng hướng player. Chỉ thị này supersede rút ngắn/bay/đổi body trong preview trước.
9. Âm Dương Nghịch Chuyển: không duyệt recipe lưới pattern mới; giữ ground art runtime, các vòng liên tục thay đổi vị trí không neo lưới. Chỉ bỏ vòng to mờ lòe lòe. Code runtime xác định layer ultimate:core/large_formation; rotating_ring và rotating_waves giữ lại. Tech chuFields hiện có gốc ô+jitter: yêu cầu không-lưới phải được đối chiếu ở implementation sau, không sao chép tọa độ/timing preview thành gameplay.
10. Kim Luân: wheel tròn nhanh và bán nguyệt đều phát từ giữa thân boss.

Review4 là22 mục active và Phất Trần Công withdrawn; lịch sử23 mục review3 được giữ trong `assets/m3d-feedback-review-r3/batch03-remaining/history/review3/`. Không sinh raster mới: tái dùng nguồn runtime/approved và sửa transforms/anchor/recipe. Asset r2, Ca Diệp và Phá Giáp đã khóa không thay byte. Chưa sửa production Phaser, server, game-core hoặc protocol, chưa merge milestone/m3d.

Review4 đã hoàn tất candidate:22 mục active, Phất Trần withdrawn. `check:final` PASS exit0/252.94s,498 unit/integration,18 workflow,15 validators,5 browser; 293 selected tags/915 refs, 73 correction assertions và20 cặp PNG. Bàn giao source/review4-render-corrections.json, selected-tags/manifest/handoff và báo cáo quan sát trong batch03. Chưa Phaser/server/multiplayer integration.


## Review5 — khôi phục pattern runtime và đổi kích thước arena

- Hoắc Đô: Phiến Trung Độc Đinh / Cuồng Phong Vạn Nhận trở về hình và pattern đang dùng trong game, **chỉ làm sáng projectile**. Hủy tăng size/đổi pattern ở review trước. Runtime renderer nail scale0.25, source hoac_do_fx/nail; Vạn Nhận spin+whirlwind0.9 giữ nguyên. Phiến Trung là hai fan5 đối nhau; Vạn Nhận8 tia mỗi0.3s trong3s. Các số này là mốc runtime, không tuning được suy từ clip.
- Kim Luân Truy Hồn, mô tả gốc director nhắc: “Bắn ra năm kim luân đập quanh arena rất lâu.” **Chỉ thay năm bằng bảy**. Giữ phát tỏa360°, bật biên arena, tồn tại lâu, không biến thành7 làn song song hoặc thêm homing. Runtime hiện speed260/life20s/bounce biên.
- Ngũ Luân Hộ Thể, mô tả gốc: “luân xoay quanh người, aoe lớn, khi xoay xong 1 thời gian 5 luân bắn ra năm hướng khác nhau”. **Chỉ thay5 bằng7**. Lấy boss làm tâm, giữ orbit rồi bắn tỏa7 hướng; không chỉ xoay rồi biến mất. Runtime radius145/angularSpeed6/orbit3s/releaseSpeed680 và release2s giữ nguyên. Seven ID đi liên tục qua orbit→release, không teleport giữa phase.
- Arena boss: director đổi ý, **rộng và dài đều tăng10%**. Dùng nền so sánh là bản trong game hiện tại trước đề xuất thu nhỏ chưa triển khai: mỗi chiều1.1, diện tích1.21. Đây là quyết định thay thế0.8/0.64, không lấy0.8×1.1. Mọi boss cùng áp dụng yêu cầu này ở lượt geometry/collision sau; viewer chỉ có overlay footprint.

Nguồn đối chiếu: packages/game-core/src/kim-luan.ts (fan/release/orbit/bounce), packages/game-data/src/kim-luan.ts (profile hiện có), apps/game-client/src/kim-luan-art.ts (scale/shape/phases hiện có). Không sửa những file production này trong lượt art. Review4 được giữ ở batch03/history/review4; source PNG khóa giữ nguyên. Bàn giao hiện hành là review5, còn22 mục active, Phất Trần Công tiếp tục withdrawn.

Review5 verification: check:final PASS exit0/245.27s;18 workflow,498 unit/integration,15 validators,6 browser. 294 selected tags/919 refs, 31 assertions riêng và11 cặp PNG. Truy Hồn20s đã trình hết, Hộ Thể7 ID liên tục orbit→release, Hoắc Đô brightness-only. Source/handoff/feedback đã cập nhật; chưa production Phaser/server/multiplayer hoặc merge.


## Review6 — mũi ám khí và bỏ toàn bộ lớp âm dương phủ màn hình

Director: (1) Ám khí Hoắc Đô đang bay ngang, cần bay thẳng theo chiều đâm/mũi nhọn. (2) Bỏ hiệu ứng âm dương lập lòe khắp màn hình; các vòng dưới đất đang ok.

- Hoắc Đô giữ PNG, size0.25, brightness1.6, emission patterns/speed/timing của review5. Source nail có trục thép nghiêng khoảng60–63 độ từ trục phải. Review6 bù góc source theo từng cel và đặt tâm xoay tại giữa trục thép để mũi nhọn trùng hướng bay, không đổi trajectory hay damage. Đo alpha/steel-mask+PCA, kiểm đầu nhọn ở phía dưới-phải của source thực tế; ghi số đo trong `source/review6-nail-axis.json`, renderer nhận `frameRotations`/`framePivots`. Không sửa pixel đã khóa.
- Âm Dương Nghịch Chuyển bỏ **cả4 rotating_waves** phóng to lập lòe phủ màn hình, ngoài core large_formation đã bỏ. Đây là chỉ thị supersede phần review4/5 giữ waves. Giữ nguyên source/alpha/scale/path/timing của15 rotating_ring ground mà director chấp nhận; test so recipe với snapshot review5, không đổi chúng khi xóa overlay. Baseline có thể hiện bản cũ để so, selected mới loại cả hai tag lớn.
- Các quyết định review5 về Truy Hồn7 luân bật biên20s, Hộ Thể7 luân xoay rồi bắn ra7 hướng, arena mỗi chiều1.1 vẫn giữ. Phất Trần tiếp tục withdrawn.

Không gen raster mới, không video/GIF; review5 giữ trong history/review5. Chưa sửa production Phaser/server/protocol/game-core hay merge milestone/m3d.

Review6 final PASS exit0/262.23s:18 workflow,498 unit/integration,15 validators,7 browser. 704 dart renders kiểm tip theo vector,4 cels/4 facing/2 variants,15 ground rings recipe giữ nguyên. 293 selected tags/915 refs,6 PNG pairs. Đã lưu nguồn đo trục, manifest/selected/handoff/provenance; chưa production Phaser/multiplayer hoặc merge.


## Chốt trước integration gameplay/Phaser —2026-11-02

Director: “Rất tốt, tôi duyệt visual lần này.” và yêu cầu tổng hợp toàn bộ feedback, tích hợp gameplay/Phaser. Đã ghi approval review6/lock321 file; art approval không tự duyệt stats từ viewer.

Bốn câu trả lời xác nhận: (1) Dùng pause toàn bộ chiến sự ngoài arena chính khi đủ đội trong cùng boss; boss dungeon vẫn chạy; mời30s realtime, inviter vào ngay và accept vào ngay. (2) Tự hồi lần đầu sau5s tại cửa trong boss với đầy HP/MP; lần hai spectator, có thể rời arena nhưng quay boss vẫn spectator đến boss reset; ra/vào/reconnect không cấp lại lượt. (3) Ca Diệp và chữ Phạn đều mỗi mục tiêu một lần/cast, re-entry không thêm hit. (4) Agent chọn bộ tuning thử nghiệm dựa trên tech/mô phỏng; giữ damage/mana/cooldown hiện tại khi có thể, không dùng thông số viewer làm gameplay.

Checklist hợp nhất: docs/M3D_FEEDBACK_GAMEPLAY_INTEGRATION_PLAN.md. Tiếp tục trên worktree/branch hiện tại, không merge milestone/m3d. Sau integration phải live Phaser, multiplayer và final checks; canonical skill MD/memory repository cập nhật sau merge thật như chỉ thị ban đầu.

## Integration gameplay/Phaser r3 — bàn giao

Toàn bộ checklist đã triển khai trên branch wip/m3d/feedback-integration. Final production pipeline PASS619.43s:522 unit/integration,18 workflow,15 validators,6 browser; core/SDK death/reconnect/pause, four-facing casts, eight A styles, retained hold/blink/burn, six-client natural invasion/rewards. Tuning, nguồn asset, giới hạn, PNG/motion evidence và cách chạy tại [M3D_R3_GAMEPLAY_HANDOFF.md](M3D_R3_GAMEPLAY_HANDOFF.md). Chỉ mới duyệt visual; gameplay/runtime vẫn cần director test. Không merge milestone/m3d; canonical skill MD/memory sau merge thật vẫn chưa thực hiện.
