# M4D · khoảng nghỉ wave và kinh tế phó bản — 2026-11-27

Người dùng duyệt và yêu cầu triển khai trên `wip/m4d/diff-level`, từ checkout M4D hiện có. Đây là override cho start-to-start 120s, floor 600s và thưởng quái phó bản thường trước đó; không thay inventory-v2 hoặc artwork.

## Hành vi

- Wave đầu sau 120 giây kể từ đầu invasion clock.
- Stream vẫn 60 giây, hai hàng mỗi cổng và population scaling hiện hành. Sau khi stream kết thúc, nghỉ đủ 120 giây mới bắt đầu wave kế. Không chờ giết hết; quái sống tiếp tục tồn tại.
- HUD chỉ hiện “đang ra quái” trong stream, rồi mới hiện countdown wave kế. Wave 20 không báo hết đợt trước khi stream hoàn thành. Warning 60/15 giây tính theo deadline mới.
- Lịch không pause: wave 1 bắt đầu 02:00, wave 2 05:00, wave 5 14:00, wave 20 59:00; stream cuối xong khoảng 60:00. Boss/ballot pause vẫn theo quy tắc cũ, nên đây không phải thời gian kết thúc trận.
- Quái phó bản thường được tăng 25% ngân sách EXP/vàng. Pool solo mỗi wave theo năm chapter: EXP **22.5 / 37.5 / 60 / 82.5 / 105**, vàng **6 / 11.25 / 15 / 18.75 / 22.5**. Phần lẻ vẫn giữ trong character server, chia pool theo người đủ điều kiện; không làm tròn mất thưởng trên từng creep. Phạt EXP vượt cấp và cap 30 giữ nguyên.
- Floor thời gian mỗi 900 giây invasion clock, lấy max với chapter theo boss đã hạ, cap chapter 4. Instance đang có không đổi HP giữa wave; wave mới snapshot floor mới.
- Thưởng invasion/boss lần đầu, giá đồ, nguyên liệu và Long Châu giữ nguyên.

## Cách triển khai và fixture

`InvasionDefinition.restAfterStream` được server bật trong production và development bình thường. Core hẹn deadline sau cuối stream, không nhận thời điểm hay kết quả từ client. Reuse `streamUntilTick`/`nextWaveTick`; không đổi schema/protocol. Các fixture/preview DEV đã chỉ định `VOLAM_INVASION_INTERVAL_SECONDS` hoặc `VOLAM_DEV_CREEP_TEST` giữ cadence start-to-start cũ để không đổi ý nghĩa kiểm thử lịch sử. Không thể dùng biến DEV để thay production.

Cấu hình: [invasion server](../apps/game-server/src/invasion-config.ts), [director](../packages/game-core/src/invasions.ts), [campaign](../packages/game-data/src/campaign.ts), [HUD](../apps/game-client/src/defense-hud.ts).

## Kiểm chứng

Đã tái hiện baseline bằng `pnpm check:quick tests/wave-pacing.test.ts`: hai regression thất bại đúng ở deadline 7200 thay vì 9000 tick và floor 600 thay vì 900 giây.

- `pnpm check:quick tests/wave-pacing.test.ts tests/m4d.test.ts tests/campaign.test.ts tests/invasions.test.ts tests/creep-upgrade.test.ts tests/invasion-room.test.ts tests/dungeons.test.ts`: 176 PASS, ba assertion thưởng cũ cần cập nhật.
- Sau cập nhật: `pnpm exec vitest run tests/dungeons.test.ts tests/wave-pacing.test.ts`: **50/50 PASS**.
- `pnpm --filter @volam/game-server exec tsx ../../tools/wave-pacing-balance.ts`: **192 probe**, không sai lệch hệ số 1,25 khi tính cả phần dư (EXP cap 30 được xét riêng). Solo đầu game: 18→22,5 EXP, 4,8→6 vàng mỗi wave quái phó bản; HP không đổi trong probe cùng floor.
- `pnpm check:final --config playwright.m4d.config.ts tests/e2e/m4d-wave-pacing.spec.ts`: preflight, typecheck, workflow, **141 files / 1.417 unit/integration tests**, production build và toàn bộ asset validators **PASS**. Ca hai peer timer **PASS** (34,4s). Pipeline ban đầu kết thúc **FAIL** ở fixture ca thưởng dùng lựa chọn Riêng đã bỏ khỏi UI; giữ nguyên báo cáo thất bại.
- Đã sửa riêng test/fixture theo menu hiện hành và ID quái có tiền tố instance; lần retry đầu đã vào phó bản nhưng chờ nhầm ID nội bộ. Không sửa runtime để làm test qua. Typecheck `pnpm exec tsc -p tsconfig.tools.json --noEmit` **PASS** sau sửa fixture.
- Fresh preflight `pnpm qa:preflight --mode browser --config playwright.m4d.config.ts`: **PASS**; `node tools/run-playwright.mjs test --config playwright.m4d.config.ts tests/e2e/m4d-wave-pacing.spec.ts --grep 'a real dungeon kill'`: **1/1 PASS** (24,6s). Hai A thật hạ hai quái, server cấp tổng 4 EXP và 1 vàng nguyên từ 4,5 EXP/1,2 vàng; unit kiểm tra phần dư.
- Không lặp các stage đã PASS sau khi chỉ sửa harness. [Báo cáo kiểm chứng](evidence/sessions/m4d-wave-pacing-2026-11-27/verification.json), [pipeline gốc](evidence/sessions/m4d-wave-pacing-2026-11-27/check-workflow/final-timings.json), [browser retry](evidence/sessions/m4d-wave-pacing-2026-11-27/browser-retry-scoped-id.log).

Probe [wave-pacing-balance.ts](../tools/wave-pacing-balance.ts) đo actual damaging kill settlement, bốn phái gốc/cả hai A, level 1/6/15/30, solo/phòng sáu người, ba seed. Sát thương fixture cố định chỉ cô lập kinh tế; không chứng minh DPS, tốc độ farm, sống sót, readiness hay clear chiến dịch. Browser fixture rút stream/rest còn 3s/4s để quan sát live state/HUD; unit kiểm chứng thời lượng production 60s/120s. Không có recording hoặc art mới.

## Đánh giá kinh tế bổ sung — 2026-11-27

[Báo cáo readiness solo/sáu người](CAMPAIGN_READINESS_2026_11_27.md) ghi 43 forecast có điều kiện và sáu lượt bot tự nhiên. Forecast cho thấy còn thiếu EXP trước Nam Đế/Bắc Cái dù đạt mốc số món ghép; không phải kết quả thắng chiến dịch tự nhiên. Không có tuning mới được triển khai từ phân tích này.
