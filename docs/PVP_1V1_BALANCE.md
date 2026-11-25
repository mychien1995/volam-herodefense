# Cân bằng Lôi Đài 1v1 — 2026-11-25

Người dùng yêu cầu triển khai toàn bộ đề xuất trên nhánh `wip/m4d/pvp`, gồm cả hai điều chỉnh trước đó dành cho vòng thử tiếp theo. Baseline là M4D commit `82ddf8e0`. Đây là thông số thử đã được phép triển khai, chưa phải tuyên bố các phái đã cân bằng khi người chơi đấu thật.

## Phạm vi và cách ly

Chỉ Lôi Đài độc lập với đội hình ban đầu **một Chính, một Tà** dùng `pvp_1v1`. Khán giả không tính vào đội hình. Server chọn profile khi tạo hiệp, giữ đến khi hiệp kết thúc và tạo lại cấu hình từ baseline cho hiệp/ván sau. Đấu đội, kể cả khi chỉ còn hai người sống, giữ `standard`. Lôi Đài Hồng Mộc trong Defense, PvE, Practice, đồ, Long Châu, thưởng và lịch wave giữ luật hiện có.

`game-data/src/pvp-balance.ts` sở hữu các số. `game-core/src/pvp-balance.ts` tạo bản sao các Ability/rank cần đổi; không ghi đè catalogue hay chỉ số nền PvE. Profile được công bố trong JSON snapshot PvP. HUD đọc đúng bản sao đó cho mana, nhịp A và hồi chiêu; không thêm lựa chọn chế độ hay cơ chế điều khiển mới.

## Thông số chung

| Thông số | Profile 1v1 |
| --- | --- |
| Sát thương lên đấu thủ từ đấu thủ khác, gồm A, chiêu, DOT và triệu hồi do chủ đứng tên | ×0,75 sau giáp/crit/giảm sát thương, trước khi khiên mana hấp thụ |
| Sát thương nhánh Thiếu Lâm Quyền | Thêm ×0,85; tổng hệ số 0,6375 |
| Choáng/định thân do đối thủ áp dụng lên đấu thủ | Thời lượng ×0,65, làm tròn lên tick, trần 1,2s |
| Cấm chiêu/cấm đánh | Thời lượng ×0,65, trần 1,6s |
| Slow/attack slow, kéo/đẩy, trạng thái tự áp dụng | Giữ nguyên |
| Sát thương môi trường và sát thương vào triệu hồi | Giữ nguyên |
| Phản sát thương từ lượng HP đã được tính | Không nhân hệ số lần hai |

Miễn/kháng khống chế hiện có vẫn chạy trước giới hạn thời lượng. Không thêm miễn khống chế nối tiếp hoặc thay đổi luật stun/silence/disarm. Thiếu Lâm vẫn cần các đòn thật trên cùng mục tiêu để Phát Động. Projectile vẫn đi thẳng, không truy đuổi.

## Điều chỉnh nhánh

Các mốc là ở cấp30/bậc4; hệ số mana, chặn đòn và chỉ số buff áp dụng tương ứng trên từng rank. Giới hạn nhịp A, cooldown, tốc độ đạn, bán kính và trần thời lượng dùng giá trị cố định của profile.

| Nhánh/kỹ năng | Thông số 1v1 |
| --- | --- |
| Thiếu Lâm Quyền A | Tối thiểu 0,4s/đòn, kể cả qua đòn cuối chuỗi; giữ bốn thức |
| Kim Cang Bất Hoại | Buff giảm sát thương/chống choáng tối đa3,5s; hồi12s; giữ mức giảm sát thương |
| Thiếu Lâm | Giữ HP/giáp/hồi tự nhiên; không thay đổi Đao ngoài luật chung |
| Ngũ Lôi Chính Pháp nội tại Thiền Sư | Xác suất chặn A ×0,75: 24%→18% ở rank4; phản choáng chịu luật thời lượng chung |
| Chaos | Phần chỉ số cộng từ trạng thái ×0,8, magnitude1,45→1,16; giữ16s ở rank4, không giảm chỉ số nền |
| Cái Bang Bổng | Cầm Long78→48tick cấm chiêu/cấm đánh; choáng60→36tick. Giữ tầm, kéo, charge, phá giáp và slow |
| Võ Đang Quyền/Kiếm A | Tối thiểu0,3s/đòn |
| Nhân Kiếm Hợp Nhất | Tốc độ đạn180→240; giữ đường thẳng và recast dịch chuyển |
| Thất Tinh Kiếm | Bán kính từng điểm trúng42→48; giữ bảy nhịp, damage, scatter, thời gian và điểm chốt |
| Kinh Lôi | Hồi mỗi lượt4→3s; giữ ba lượt và tối đa ba kiếm |
| Thiên Sơn Đao | Mana các chiêu Q/W/E/R/T ×0,9, làm tròn lên; rank4:23/19/21/26/49 |
| Thiên Sơn Phiến, Đường Môn, Ngũ Độc | Giữ thông số riêng; vẫn chịu luật chung khi đánh người |

## Kiểm chứng có thể chạy lại

- `pnpm check:quick tests/pvp-balance.test.ts tests/standalone-loi-dai.test.ts`: profile/round lifecycle, catalogue bất biến, nhịp A, self/hostile status, khiên mana, environment/reflection, minion và HUD.
- `node tools/pvp-pve-parity.mjs 82ddf8e0`: biên dịch core của commit baseline vào cache riêng; so sánh toàn bộ state/event PvE mỗi tick ở14nhánh × cấp1/6/15/30 × solo/sáu ×3seed ×240tick. Báo cáo `artifacts/pvp-1v1/pve-parity.json`. Đây không phải một chiến dịch hoàn chỉnh.
- `AUDIT_TACTICAL=1`, `AUDIT_EVADE=1`, `AUDIT_BASELINE=1|0`, `AUDIT_OUTPUT=baseline.json|current.json`, sau đó `pnpm test:balance:pvp`: ma trận14nhánh,3seed,đảo phía, hai tình huống contact/spacing, không đồ và hiểm họa. `AUDIT_BEAT=3|6` kiểm tra độ nhạy nhịp input. Các biến là biến môi trường, không phải tùy chọn client.
- `pnpm check:final --config playwright.standalone-pvp.config.ts --grep "1v1 profile|entry, link"`: pipeline đầy đủ và hai trình duyệt kiểm tra profile, HUD, input thật, sát thương đồng bộ; video/trace tắt theo profile.

Không suy ra PASS từ lịch sử. Lệnh/kết quả cuối cùng được ghi trong báo cáo của session. Tỷ lệ thắng bot chỉ mô tả policy đã chạy; chưa có kiểm chứng ngang trình giữa người chơi, đủ năm map hoặc PvP thi đấu.

## Kết quả lần triển khai

[Báo cáo xác minh](evidence/sessions/m4d-pvp-balance-final/acceptance.json) giữ cả lịch sử lỗi và các bước chạy lại. Đã hoàn thành compile/typecheck, 70 kiểm thử workflow, 1.330 kiểm thử unit/integration, build production, 35 validator tài sản và hai ca trình duyệt. Riêng profile có 13 kiểm thử hồi quy. Lệnh `check:final` ban đầu không kết thúc thành công: các fixture M4D cũ được cập nhật rồi chạy lại riêng các tệp lỗi; các bước build/asset/browser còn lại chạy tiếp có báo cáo riêng. Không đổi runtime PvE để làm các fixture qua.

Đối chiếu toàn bộ state/event với core tại `82ddf8e0`: **336 kịch bản, 80.640 tick giống hệt**, catalogue PvE không bị ghi đè. Ma trận bot gồm **2.184 trận** trước/sau. Trung vị thời gian giao chiến contact tăng 1,43→2,27s, spacing tăng 3,67→4,63s; đây là kết quả của bot và điều kiện nêu trong báo cáo, chưa phải nghiệm thu cân bằng giữa người chơi.

Tám quy tắc checkout CRLF khôi phục đúng hash metadata đầu vào Thiền Sư mà manifest cũ yêu cầu; nội dung JSON, hash được duyệt và toàn bộ raster giữ nguyên. Ca trình duyệt luồng phòng từng timeout ở marker cảnh sẵn sàng trước combat; lần chạy chẩn đoán sau đó qua với cùng điều kiện và timeout 45s. Nguyên nhân của lần chờ cảnh không ổn định này chưa được xác lập; báo cáo giữ giới hạn đó.
