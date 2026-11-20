# Phòng test — 2026-11-19

Triển khai trên `wip/m3d/pvp` theo yêu cầu nhập tên, chọn hero và thử kỹ năng trong Rừng Trúc.

Cập nhật trình bày sau phản hồi: form nhập tên một hàng khi đủ chỗ; camera native zoom/theo hero như Defense, trong bounds Rừng Trúc; utility giữ đúng cỡ nút Defense. [Bản sửa chung PvP/Practice](PVP_VISUAL_REPAIR.md).

## Luồng và phạm vi

Menu chính → **Phòng test** → nhập biệt danh → lưới 7 phái → popup chọn hệ → **Vào phòng test**. Dùng cùng component chọn phái/nhánh, portrait, icon, font và khung gỗ của Defense/Lôi Đài. Trong lúc tải map, giữ màn chờ tải. Trong room có nút **Đổi phái/hệ phái**, mở lại lưới phái và popup hệ giống Defense; xác nhận **Đổi nhân vật** để thử hero khác ngay tại chỗ. Hủy hoặc Escape không thay đổi hero. Nút Thoát/Escape ngoài menu vẫn rời phòng sau xác nhận.

Mặc định triển khai: mỗi người có một room riêng, tối đa một kết nối, không share room. Room bị hủy khi người chơi rời; không lưu tiến trình hoặc reconnect. Namespace `practice` riêng với Defense và Lôi Đài.

Nhân vật cấp 30, năm slot Q/W/E/R/T ở bậc tối đa của hệ phái; nội tại theo cấp. HP/nội lực luôn đầy; hồi chiêu đòn thường, kỹ năng, charge và hồi lượt lướt được reset trong mô phỏng phòng test. Vẫn giữ windup, nhịp animation, thời gian hiệu ứng, cơ chế dùng lại/thu chiêu và điều kiện vốn có của kỹ năng. F đổi thế Thiếu Lâm Quyền hoạt động bình thường. Không có trang bị, shop hoặc tăng điểm trong room này.

Map dùng Rừng Trúc Lôi Đài đã tích hợp, không có hiểm họa môi trường. Ba Chó Hoang dùng đúng bộ sprite hiện hành. Chúng không tự di chuyển hoặc tấn công, vẫn nhận hit, hiệu ứng trạng thái và dịch chuyển cưỡng bức từ kỹ năng. Sau mỗi hit, HP được phục hồi; không có chết, hồi sinh, EXP, vàng hoặc loot từ chúng. Đây là mục tiêu thử chiêu, không phải thước đo cân bằng PvE/PvP.

## Đổi hero ngay trong phòng — 2026-11-19

Giữ nguyên roomId, sessionId, biệt danh, vị trí, hướng đứng, map và ba mục tiêu khi đổi phái hoặc hệ. Server tạo lại nhân vật cấp30/max5slot, đầy HP/nội lực, không CD; xóa combo, trạng thái, lệnh chờ, đạn/vùng chiêu và triệu hồi của hero cũ. Trạng thái/độc do hero cũ đặt trên mục tiêu cũng được xóa, vị trí mục tiêu không bị reset.

Menu là overlay trong viewport trên nền Rừng Trúc, dùng cùng schoolCards/branchCards và artwork Defense. Mở menu dừng phím di chuyển đang giữ; chặn phím chiến đấu/di chuyển trong lúc chọn. Menu chỉ đóng sau khi snapshot server xác nhận lựa chọn và sequence; lỗi lựa chọn giữ menu để chọn lại. Có nút Hủy và Escape (đóng popup hệ trước, sau đó đóng menu).

Message `practice-select` kiểm tra protocol, sequence dương, schoolId và branchId; kiểm tra nhánh thuộc phái ở core trước mọi mutation. ID nhân vật lấy từ kết nối; không chấp nhận ID/HP/damage từ payload. Chỉ PracticeRoom đăng ký message này. Không thay đổi cấu trúc state/protocol48 và không mở respec cho Defense/Lôi Đài.

Kiểm chứng riêng lần mở rộng: `tests/practice.test.ts`, `tests/practice-room.test.ts` có13 test PASS; kiểm tra đổi đủ14 hệ, build sạch, cast sau đổi, hủy lệnh cũ, dọn triệu hồi thật, cùng room và từ chối sequence cũ/phái-hệ sai. Ca browser mới kiểm tra menu, Hủy/Escape, khóa input, bốn lần đổi, đúng texture/hotbar, W gọi cương thi rồi đổi để dọn, Q sau đổi và F Thiếu Lâm. Pipeline cuối **PASS**: 109 file / **1.151 unit/integration test**, **18 workflow test**, typecheck, build, toàn bộ asset validator và **4 ca browser**. Bốn ca gồm đổi phái tại chỗ, phòng test cũ và hai ca Defense (combat/progression, projectile). Tổng459,45s. [Timing](evidence/sessions/practice-switch-final/check-workflow/final-timings.json), [quan sát đổi hero](evidence/sessions/practice-switch-final/practice/change-observations.json), [biên bản/hash](evidence/sessions/practice-switch-final/acceptance.json).

Lượt browser tập trung đã tái hiện lỗi Escape bị GameUI bắt trước và mở Rời trận; đã sửa ưu tiên menu Phòng test. Assertion texture Bổng được đối chiếu với key đang chạy `renovated-bong-combo-body`; không sửa sprite để qua test. Các lượt FAIL giữ nguyên trong các session ghi ở biên bản. Đã xem PNG menu850×480 và màn chơi sau đổi ở zoom bình thường: một viewport, nền map giữ nguyên, bảy thẻ phái và nút đổi nằm trong game, font tiếng Việt đọc đúng.

Preview thường tại http://127.0.0.1:5596/ dùng bản build cuối; [kiểm tra server/client cùng runId và nút đổi trong phòng](evidence/sessions/practice-switch-final/normal-preview.json).

## Thẩm quyền và cấu trúc

- `PracticeMatch` trong game-core chạy world độc lập, deterministic seed, không chạy Defense director/invasion/boss/dungeon.
- `world.practiceTargets` là tập ID chỉ server tạo. `hurt` vẫn tính sát thương/on-hit/combo/status bình thường; mục tiêu trong tập này không bị xuống 0 HP, sau xử lý hit được nạp lại HP. World thường không có tập này; kiểm tra hồi quy xác nhận quái thường vẫn chết.
- `PracticeRoom` tái sử dụng projection của MatchRoom. Chỉ nhận input chiến đấu/di chuyển, đổi thế, đổi phái/hệ hợp lệ và handshake kết nối; các lệnh shop, dungeon, PvP, loadout thử nghiệm và tăng điểm bị chặn.
- Chọn phái/nhánh được kiểm tra server, không tin HP, mana, damage hoặc cooldown gửi từ client. Client không thể bật quyền phòng test trong Defense/Lôi Đài.
- Protocol **48** thêm `PracticeState` và join schema riêng. Client/server cũ cần tải lại cùng phiên bản. Bốn assertion protocol cũ được cập nhật lên 48; không đổi luật boss của các fixture này.
- UI vẫn là overlay trong một viewport. Chỉ còn Thoát/Cài đặt, HUD nhân vật, hotbar và nhãn Phòng test kèm nút Đổi phái/hệ phái. Tái dùng map, Chó Hoang và VFX hiện có; không tạo hoặc sửa byte artwork.

API đã đối chiếu với [Colyseus 0.18 Rooms](https://docs.colyseus.io/room) và [Phaser Scenes](https://docs.phaser.io/phaser/concepts/scenes), cùng type của bản cài đặt.

## Kiểm chứng

`tests/practice.test.ts` và `tests/practice-room.test.ts`: **10 test PASS** trong lượt tập trung. Gồm đòn chí tử, hit lặp, không thưởng, quái thường vẫn chết, cả 14 nhánh cấp30/max5slot, input thật không chờ mana/CD, không AI, room riêng một ghế, sai phái/nhánh/phiên bản và namespace bị từ chối. Test bất tử đã FAIL trước triển khai: hit chí tử đưa mục tiêu 120HP về 0.

Browser mới dùng hai client Phaser trong hai room khác nhau. Đã kiểm tra đúng map, ba body Chó Hoang hiện hành, idle đứng tại chỗ, kỹ năng lặp trước CD thường, thanh CD0/HP/MP đầy, không chết, không event chéo phòng, di chuyển thật, F đổi thế và thoát. [Quan sát tập trung PASS](evidence/sessions/practice-live/practice/observations.json).

Hai lần đầu cần sửa fixture để khớp art đang chạy: key hiện hành là `renovated-creep_wild_dog`; idle renovation là một cel giữ nguyên, không dùng số frame của pack cũ. Không sửa sprite/animation để làm assertion qua. Các bản FAIL giữ riêng dưới `practice-focus` và `practice-focus-retry`.

Lệnh cuối:

```powershell
$env:VOLAM_QA_SESSION='practice-final'
$env:VOLAM_QA_SERVER_PORT='2796'
$env:VOLAM_QA_CLIENT_PORT='5596'
pnpm check:final --config playwright.practice.config.ts --grep 'private practice:|two clients agree|ranged projectile|statue opening|eight players|entry, link'
```

Pipeline đầy đủ: **109 file / 1.148 unit/integration test PASS**, 18 workflow test PASS; typecheck, build và các asset validator PASS. Browser có 5 PASS/1 FAIL: ca Defense dừng ở xác nhận lobby trước khi scene sẵn sàng. Giữ nguyên [report FAIL gốc](evidence/sessions/practice-final/check-workflow/final-timings.json). Đã sửa helper chờ scene-ready trước xác nhận và bổ sung chẩn đoán; không đổi luật Defense.

Chạy lại stage trên cùng build: **2/2 browser PASS** (Defense và projectile). Sau chỉnh khóa input trong màn tải Phòng test, đã build lại và chạy **3/3 browser PASS** (Defense hai client, projectile, Phòng test). Tổng cộng sáu ca browser liên quan đã có kết quả PASS, gồm thêm tượng mở đầu, Lôi Đài entry/link và tám người/năm map từ lượt đầy đủ. Typecheck tools sau sửa assertion cũng PASS. [Report client cuối](evidence/sessions/practice-client-verified/check-workflow/browser-timings.json).

Quan sát bản cuối: hai room riêng; hai lần Hoa Vân Chưởng ở tick 1581 và 1603; HP392/392, nội lực158/158, năm CD0, cả ba Chó Hoang10000/10000HP; console không lỗi. Đã xem PNG map, hero, ba mục tiêu và bố cục trong viewport, kiểm tra state/frame và thao tác thật. [Quan sát](evidence/sessions/practice-client-verified/practice/observations.json), [biên bản cùng hash](evidence/sessions/practice-client-verified/acceptance.json).

Preview thường đã khởi động tại http://127.0.0.1:5596/; kiểm tra server/client cùng runId, protocol48, đúng endpoint và menu Phòng test có đủ bảy phái. [Kiểm tra preview](evidence/sessions/practice-client-verified/normal-preview.json). Không tạo recording; bằng chứng dùng PNG/JSON, frame/state và log.
