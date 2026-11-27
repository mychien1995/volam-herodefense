# EXP wave mức Dễ M4D — 2026-11-27

Người dùng đã duyệt áp dụng bộ EXP theo chặng vào runtime **mức Dễ**. Thực hiện trong checkout `milestone/m4d`; lựa chọn độ khó hiện có của host quyết định cấu hình khi tạo phòng.

| Wave | Pool EXP Dễ / người đủ điều kiện | Pool EXP Khó / người đủ điều kiện | Pool vàng / người đủ điều kiện |
| --- | ---: | ---: | ---: |
| 1–5 | 110 | 100 | 70 |
| 6–10 | 450 | 300 | 100 |
| 11–15 | 750 | 450 | 130 |
| 16–20 | 750 | 650 | 160 |

Đây là ngân sách khi clear đủ wave và các thành viên đều đủ điều kiện nhận thưởng. Ngân sách wave được nhân số người rồi chia qua cơ chế tham gia/first-clear hiện tại; không phải EXP mỗi con. Schema vẫn có năm phần tử: Dễ `[110,450,750,750,750]`, Khó `[100,300,450,650,650]`. Phần tử cuối không thêm wave sau wave 20.

`campaignDefinition` giữ baseline Khó. `campaignForDifficulty` clone và validate campaign cho từng phòng; chỉ ghi đè `invasionXp` khi Dễ. `MatchRoom.onCreate` gán cấu hình vào cả base và arena trước trận, giữ các phòng/peer join độc lập. Các dungeon tạo sau dùng base của phòng. Không đổi protocol; cần server đã cập nhật và tạo phòng mới để nhận tuning mới.

Giữ nguyên EXP boss, EXP phó bản thường (đã tăng 25% ở yêu cầu trước), toàn bộ vàng và giá mua/nâng/ghép đồ. Đường EXP lên cấp, first-clear/eligibility, phần dư, phạt vượt cấp, scaling quái, kỹ năng và giới hạn cấp cũng giữ nguyên. Nhịp stream 60s rồi nghỉ 120s và floor 15 phút vẫn như [bản pacing](M4D_WAVE_PACING_2026_11_27.md). Các điều chỉnh Đông Tà Dễ trước đó vẫn giữ.

## Cơ sở thông số

Bộ `wave_target` trong [thử nghiệm EXP](CAMPAIGN_XP_TRIAL_2026_11_27.md) đạt 385/385 mốc cấp đã đo trong forecast có giả định clear, gồm solo/sáu người và stress. Đây là bằng chứng thử nghiệm trước khi tích hợp runtime; không chạy lại toàn bộ forecast trong lần tích hợp này và không coi đó là chiến thắng chiến dịch tự nhiên. Bot tự nhiên trước đó vẫn thua wave 1. Bằng chứng/hashes thử nghiệm được giữ nguyên.

## Kiểm chứng tích hợp

Regression ban đầu `pnpm check:quick tests/difficulty-room.test.ts` thất bại đúng tại pool Dễ: thực nhận cấu hình cũ `[100,300,450,650,650]`, mong đợi `[110,450,750,750,750]`.

Các kiểm tra lần này:

- `tests/easy-campaign-xp.test.ts`: chỉ đổi EXP wave, không mutate baseline/phòng khác; stream đủ ngân sách và hurt/kill qua pipeline thật ở Dễ/Khó × solo/sáu người × wave 1/6/11/16 × seed 17/41/89. Đây là kiểm tra phân phối thưởng, không đo DPS hay tốc độ clear.
- `tests/difficulty-room.test.ts`: host chọn Dễ, peer join xin Khó không ghi đè, phòng Khó mặc định tách biệt; base/arena cùng nhận cấu hình.
- `tests/e2e/m4d-easy-xp.spec.ts`: UI tạo phòng Dễ/Khó, Phaser sẵn sàng, một input A thật giết quái wave; đối chiếu EXP/vàng gồm phần dư trên server. Fixture chỉ tạo tiền đề mục tiêu/HP/vị trí hợp lệ và bảo vệ khỏi thiệt hại ngoài mục tiêu, không cấp thưởng hoặc giả kết quả hit.
- `tests/e2e/m4d-wave-pacing.spec.ts`: giữ regression hai peer stream/countdown và kill phó bản thật nhận thưởng đã tăng trước đó.

`pnpm check:quick tests/easy-campaign-xp.test.ts tests/difficulty-room.test.ts tests/difficulty.test.ts tests/wave-pacing.test.ts tests/campaign-xp-trials.test.ts` đã PASS **64/64** trước khi mở rộng test ngân sách từ một lên ba seed.

`pnpm check:final --config playwright.m4d.config.ts tests/e2e/m4d-easy-xp.spec.ts tests/e2e/m4d-wave-pacing.spec.ts` đã chạy một lần sau thay đổi runtime cuối. Preflight, chuẩn bị assets và compile production PASS; dừng ở typecheck do test truy cập bản ghi boss có thể undefined. Đã sửa khai báo trong test, rồi tiếp tục riêng stage lỗi và các stage chưa chạy qua `node docs/evidence/sessions/m4d-easy-wave-xp-2026-11-27/resume-final.cjs`; không chạy lại các stage đã PASS. Typecheck và **77/77** workflow tests đã PASS.

Kết quả cuối: **PASS 1.481/1.481 unit/integration**, **77/77 workflow**, **35/35 asset validators**, typecheck source/tools/tests và build production.

Browser: test EXP Dễ/Khó và test kill phó bản PASS ngay khi chạy đúng endpoint QA. Test countdown hai peer ban đầu bỏ lỡ trạng thái ngắn khi đọc tuần tự qua hai trang; chỉ sửa fixture/test, không sửa runtime. Fixture hiện stream/nghỉ 10s/10s, gắn quan sát thụ động trong từng trang trước khi khởi động clock và giữ điều kiện server + HUD đồng thời. Cả hai peer đều ghi nhận đúng thứ tự stream → nghỉ → stream mới, deadline đủ khoảng nghỉ và quái cũ còn sống. Core regression vẫn kiểm tra thời gian production 60s/120s thật theo tick.

Retry riêng stage phụ thuộc: `node docs/evidence/sessions/m4d-easy-wave-xp-2026-11-27/resume-browser.cjs` build lại client với `qaWorkflowSession(...).serverUrl` sau lỗi endpoint; sau khi sửa quan sát fixture, `node docs/evidence/sessions/m4d-easy-wave-xp-2026-11-27/resume-pacing.cjs` chạy typecheck/preflight và riêng `m4d-wave-pacing.spec.ts --grep "wave countdown"`. **Cả ba browser case cuối cùng PASS** qua các lượt chạy, không tuyên bố cả command ban đầu đã PASS. Giữ toàn bộ báo cáo FAIL và log retry để đối chiếu.

[Tổng hợp kiểm chứng](evidence/sessions/m4d-easy-wave-xp-2026-11-27/verification-summary.json), [các stage suite/build/assets](evidence/sessions/m4d-easy-wave-xp-2026-11-27/resume-final.json), [browser EXP/phó bản](evidence/sessions/m4d-easy-wave-xp-2026-11-27/browser-retry-3.log), [countdown retry cuối](evidence/sessions/m4d-easy-wave-xp-2026-11-27/pacing-observer.json). Evidence: `docs/evidence/sessions/m4d-easy-wave-xp-2026-11-27/`.
