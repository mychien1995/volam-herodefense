Cập nhật runtime 2026-11-27: người dùng duyệt **110/450/750/750 riêng mức Dễ**; Khó giữ baseline. Xem [triển khai mức Dễ](M4D_EASY_WAVE_XP_2026_11_27.md). Các kết quả/đề xuất bên dưới giữ nguyên như bằng chứng lịch sử, không áp dụng bộ mới cho mọi mức khó.

# Thử bù EXP theo chặng M4D — 2026-11-27

**Đề xuất, chưa áp dụng production:** pool EXP mỗi wave solo là **110 / 450 / 750 / 750**, tương ứng wave 1–5 / 6–10 / 11–15 / 16–20. Giữ nguyên EXP boss và phó bản, đường EXP lên cấp, vàng, giá đồ, lịch wave và cơ chế chia pool/first-clear. Trong schema năm phần tử: `invasionXp: [110, 450, 750, 750, 750]`; phần tử thứ năm không tạo thêm wave sau wave 20.

## Bộ thông số

| Chặng | Pool cũ/wave/solo | Đề xuất | Chênh lệch |
| --- | ---: | ---: | ---: |
| Wave 1–5 | 100 | 110 | +10% |
| Wave 6–10 | 300 | 450 | +50% |
| Wave 11–15 | 450 | 750 | +66,7% |
| Wave 16–20 | 650 | 750 | +15,4% |

Ngân sách EXP invasion 20 wave tăng 7.500→10.300. Cộng tám first-clear trước VTD: 12.850→15.650 (+21,8%), chưa kể farm phó bản. Đây là pool solo; phòng đông vẫn dùng scaling và chia theo người đủ điều kiện hiện có. Không nhân nguyên pool cho mỗi người hoặc mỗi creep.

Bù nhiều hơn ở chặng 2–3 vì đây là nơi thiếu mốc mở ultimate 12/18. Wave cuối giữ 750 để hạn chế cấp cuối lên quá 28. Đệm 10 EXP ở năm wave đầu xử lý ca solo farm chậm chỉ có 664 EXP trước Đông Tà khi cần dọn thêm 60s. Không thay cơ chế over-level ×0,25 ở target+2 hoặc cap 30.

## Phương pháp và giới hạn

Cùng kernel bot của [lượt trước](CAMPAIGN_READINESS_2026_11_27.md), cùng roster, seed 42/1337/9001, cùng cách học/mua đồ/đi về. Generator v2 được giữ nguyên; runner thử v3 chỉ áp dụng profile XP lên bản sao campaign rồi validate schema. Đối chứng baseline mới tái lập chính xác cả chín checkpoint của v2.

Đã chạy 108 forecast của năm giả thuyết và đối chứng, cùng sáu lượt bot tự nhiên. Bộ đề xuất được kiểm tra đủ tám nhánh của bốn phái gốc × ba seed (24 solo), ba seed party sáu người, và 10 stress scenario. Party gồm Cái Bang Chưởng/Bổng, Thiên Sơn Phiến/Đao, Võ Đang Kiếm, Thiếu Lâm Quyền; không suy rộng sang các nhánh chưa đo.

**Forecast giả định clear invasion đầy đủ, mọi người đủ điều kiện nhận pool, và hạ boss thành công.** Combat/collision/farm/đi về/chi tiêu phó bản chạy core thật, hero bất tử trong forecast. Boss mặc định 90s + chuẩn bị wave boss 10s; dungeon boss pause invasion clock. Không tính combat boss, HP-potion hoặc thất bại boss. Thời lượng này là giả định, không phải số đo clear boss.

## Solo

Dải tám nhánh × ba seed, budget mặc định stream 60s + dọn 30s, về trước wave 30s. Vàng là tổng kiếm được, gồm phần đã chi. Mốc level chỉ dùng cho năm wave boss.

| Trước boss | Cấp cũ | Cấp đề xuất | Mục tiêu |
| --- | ---: | ---: | ---: |
| Đông Tà | 6–7 | 6–7 | 6 |
| Tây Độc | 11–12 | 12–14 | 12 |
| Nam Đế | 16–17 | 19–20 | 18 |
| Bắc Cái | 21–23 | 24–25 | 24 |
| Vương Trùng Dương | 24–26 | 27–28 | 26–28 |

## Sáu người

Dải từng người, 18 quan sát nhân vật mỗi boss qua ba seed.

| Trước boss | Cấp cũ | Cấp đề xuất | Mục tiêu |
| --- | ---: | ---: | ---: |
| Đông Tà | 6–8 | 6–8 | 6 |
| Tây Độc | 11–13 | 12–14 | 12 |
| Nam Đế | 16–18 | 19–20 | 18 |
| Bắc Cái | 22–24 | 25–26 | 24 |
| Vương Trùng Dương | 25–27 | 27–28 | 26–28 |

Cả 210/210 kiểm tra mốc của 24 nhân vật solo + 18 quan sát nhân vật party đạt tối thiểu mục tiêu; VTD không vượt 28. Mô hình có đệm 0–2 cấp, không ép mọi nhánh vào đúng một level.

## Vàng và trang bị trước đủ chín boss

| Trước boss | Solo: cấp / vàng | Sáu người: cấp / vàng | Món ghép/người |
| --- | ---: | ---: | ---: |
| Đông Tà | 6–7 / 413–555 | 6–8 / 433–620 | 0 |
| Lý Mạc Sầu | 7–8 / 593–735 | 7–8 / 613–800 | 0 |
| Tây Độc | 12–14 / 1286–1544 | 12–14 / 1341–1649 | 1 |
| Hoàn Nhan Hồng Liệt | 13–14 / 1536–1794 | 13–14 / 1591–1899 | 1 |
| Nam Đế | 19–20 / 2441–2813 | 19–20 / 2529–2961 | 2 |
| Chu Bá Thông | 19–20 / 2791–3163 | 20 / 2879–3311 | 2 |
| Bắc Cái | 24–25 / 3945–4445 | 25–26 / 4080–4651 | 3 |
| Kim Luân Pháp Vương | 25–27 / 4395–4895 | 26–27 / 4530–5101 | 3 |
| Vương Trùng Dương | 27–28 / 4795–5295 | 27–28 / 4930–5501 | 4 |

Thưởng vàng và giá không đổi: hash toàn bộ economy và toàn bộ campaign ngoài trường XP giống nhau trong mọi run. Cả bốn món ghép vẫn tốn 4.185 vàng. Tổng vàng thực kiếm trước VTD thay đổi -17 đến 65 vàng/người (trung bình 18.36) do level/skill cao hơn làm thay đổi tốc độ farm; không phải tăng hệ số vàng. Một số nhánh vẫn dưới mục tiêu tổng vàng lịch sử: lượt này chỉ xử lý EXP theo yêu cầu.

## Stress thời gian dọn và boss

Seed 42, solo Thiếu Lâm Đao là nhánh farm chậm đã đo và cùng party sáu người. Kiểm tra dọn thêm 0/60s, boss 45/180s, cùng trường hợp dọn 60s và boss 180s. Cả 175/175 mốc nhân vật trong 10 stress scenario đạt; cộng bộ chuẩn là **385/385 mốc**. Dải toàn bộ stress:
- Đông Tà: cấp 6–8.
- Tây Độc: cấp 12–14.
- Nam Đế: cấp 18–20.
- Bắc Cái: cấp 24–26.
- Vương Trùng Dương: cấp 27–28.

## Các giả thuyết đã so sánh

| Profile | Pool wave theo chặng | EXP boss | Số forecast | Nhận xét |
| --- | --- | --- | ---: | --- |
| baseline | 100/300/450/650 | Giữ | 1 | Đối chứng trùng v2 |
| wave_only | 100/400/650/850 | Giữ | 35 | Đủ ở bộ chuẩn; solo dọn thêm 60s vẫn có cấp 11/17 trước Tây/Nam |
| wave_shift | 100/400/650/850 | Bắc 1000, Kim 1200 | 29 | Đủ ở bộ chuẩn, cần đổi hai thưởng boss |
| boss_shift | Giữ | Dịch EXP về sáu boss sớm | 3 | Chỉ pilot 3 scenario, không chọn làm kết luận chung |
| wave_frontload | 100/450/750/750 | Giữ | 3 | Pilot dọn chậm thiếu 6 EXP trước Đông Tà |
| wave_target | 110/450/750/750 | Giữ | 37 | Bộ được đề xuất; đủ cả chuẩn và stress đã đo |

Không chọn việc giảm thưởng Bắc Cái/Kim Luân vì bộ wave_target đã đạt khoảng cuối 26–28 với thưởng boss hiện hành. Profile boss_shift chỉ được screening ở một seed; không coi đó là xác nhận đầy đủ tám nhánh.

## Bot tự nhiên và giới hạn xác nhận

Sáu lượt natural mới dùng profile wave_target, không bất tử hay cấp trước tiền/đồ. Bot vẫn mất tượng ở wave 1; chưa có natural campaign clear hoặc checkpoint boss tự nhiên. Chỉ tăng EXP theo chặng không chứng minh xử lý được điểm nghẽn thủ đầu trận của bot. Không suy ra tỷ lệ thắng của người chơi từ policy nearest-target/round-robin này. Đề xuất là tuning để playtest, không phải cân bằng đã được nghiệm thu.

## Kiểm chứng và tái lập

- `pnpm qa:preflight --mode quick`: PASS 5 checks.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS.
- `pnpm exec vitest run tests/campaign-xp-trials.test.ts tests/campaign.test.ts tests/dungeons.test.ts tests/wave-pacing.test.ts tests/invasions.test.ts tests/economy.test.ts`: **109/109 PASS**.
- Audit mọi forecast: chín checkpoint đúng thứ tự; XP = các nguồn; vàng = các nguồn = còn giữ + chi đồ + chi bình; boss first-clear một lần, không âm vàng, đúng material trước craft; **0 sai lệch**.
- Tất cả run cùng kernel/core hashes, cùng economy hash và campaign-non-XP hash; các phiên bản file profile được lưu theo SHA-256 trong evidence. Không sửa production campaign. Không ghi video/ảnh động.

```powershell
pnpm --filter @volam/game-server exec tsx ../../tools/campaign-xp-trial.ts --xp-profile wave_target --players 1 --basic thieu_lam_dao --seed 42 --max-seconds 6000
pnpm --filter @volam/game-server exec tsx ../../tools/campaign-xp-trial.ts --xp-profile wave_target --players 6 --seed 42 --max-seconds 6000
python -X utf8 tools/summarize-campaign-xp-trial.py
```

[Thông số đề xuất JSON](evidence/sessions/campaign-xp-trial-2026-11-27/recommended-xp.json), [summary/audit/raw report index](evidence/sessions/campaign-xp-trial-2026-11-27/summary.json), [các profile nghiên cứu](../tools/campaign-xp-profiles.ts), [runner](../tools/campaign-xp-trial.ts). CSV/JSON đầy đủ nằm trong `artifacts/campaign-xp-trial/` (ignored).
