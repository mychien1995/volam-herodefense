# Kiểm tra readiness chiến dịch solo và sáu người — 2026-11-27

**Kết luận trong mô hình:** phương án mới cải thiện rõ so với lịch bắt đầu wave mỗi 120s, nhưng còn hụt EXP tại mốc 12/18/24. Trang bị đạt các mốc 1/2/3/4 món ghép theo chặng trong forecast; đây không phải bằng chứng clear boss thật.

## Phạm vi và giả định

Bắt đầu trên `wip/m4d/diff-level`; checkout dùng chung được chuyển sang `milestone/m4d` trong phiên. Hai ref cùng commit `9a64791a`, và hash core của toàn bộ report khớp mã hiện tại. Không đổi runtime hoặc tuning được duyệt trong lượt phân tích này. Đã chạy 49 scenario: 39 forecast chính, 4 forecast sensitivity và 6 lượt bot tự nhiên; seed 42/1337/9001. Solo candidate bao phủ tám nhánh của Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm (24 lượt). Đội sáu người gồm Cái Bang Chưởng/Bổng, Thiên Sơn Phiến/Đao, Võ Đang Kiếm, Thiếu Lâm Quyền; mỗi nhân vật farm instance riêng. Không đồng nhất composition giữa solo mọi nhánh và party; so sánh chính sách dùng solo Cái Bang Chưởng cố định.

Forecast chạy combat farm, collision, di chuyển về cửa, học kỹ năng, giá đồ, giao dịch, phần dư và phạt EXP bằng core thật. **Giả định** thủ đủ mọi creep và mọi người đều đủ điều kiện nhận pool; wave boss thành công sau 90s + 10s chuẩn bị, dungeon boss thành công sau 90s có pause invasion clock. Các clear và material/Long Châu được quyết toán bằng API core, không được coi là kết quả combat. Hero bất tử trong forecast; không tính mana/máu/bình tiêu trong boss hay chi phí thất bại. Vì vậy income/eligibility là thuận lợi, còn tốc độ farm chỉ phản ánh policy bot, không phải cận trên toán học hoặc người chơi tối ưu.

Budget mặc định: 60s stream + 30s dọn; bắt đầu đi về trước wave 30s; shop dùng tiền kiếm được và có 5s dự trù sau khi về. Giá, trang bị và potion tồn kho đầu trận giữ nguyên; ưu tiên nâng bộ cơ bản rồi ghép giày/giáp/mũ/vũ khí khi đã có material. Mỗi wave dungeon giữ tiến trình và HP scaling thật. Thời gian boss là giả định, chưa được hiệu chuẩn bằng bot thắng boss.

## Solo

Dải dưới đây bao gồm tám nhánh × ba seed. Vàng là **tổng vàng đã kiếm, gồm phần đã chi**, không phải số dư. Mốc mục tiêu chỉ áp dụng cho năm wave boss trong tài liệu campaign; không gán một mốc level mới cho dungeon boss.

| Trước boss | Cấp solo | Vàng solo | Món ghép | Mốc cấp wave boss |
| --- | ---: | ---: | ---: | ---: |
| Đông Tà | 6–7 | 413–554 | 0 | 6 |
| Lý Mạc Sầu | 7–8 | 593–734 | 0 | — |
| Tây Độc | 11–12 | 1.285–1.537 | 1 | 12 |
| Hoàn Nhan Hồng Liệt | 11–13 | 1.535–1.787 | 1 | — |
| Nam Đế | 16–17 | 2.437–2.798 | 2 | 18 |
| Chu Bá Thông | 16–18 | 2.787–3.148 | 2 | — |
| Bắc Cái | 21–23 | 3.939–4.421 | 3 | 24 |
| Kim Luân Pháp Vương | 23–24 | 4.389–4.871 | 3 | — |
| Vương Trùng Dương | 24–26 | 4.789–5.271 | 4 | 26–28 |

Cả 24/24 lượt solo thiếu cấp 18 trước Nam Đế và thiếu cấp 24 trước Bắc Cái. Trước Tây Độc: 10/24 lượt chưa đủ cấp 12. Trước Vương Trùng Dương: 16/24 lượt chưa đủ cấp 26. Đây là quan sát của policy bot, không phải tỷ lệ thất bại của người thật.

### Theo nhánh solo

| Nhánh | Đông Tà | Tây Độc | Nam Đế | Bắc Cái | Vương Trùng Dương |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cái Bang Bổng | 7 | 12 | 17 | 23 | 26 |
| Cái Bang Chưởng | 6 | 11 | 16 | 21 | 25 |
| Thiên Sơn Phiến | 6 | 11 | 16–17 | 22 | 25 |
| Thiên Sơn Đao | 7 | 12 | 17 | 22 | 25 |
| Võ Đang Quyền | 6 | 11–12 | 16–17 | 22 | 25 |
| Võ Đang Kiếm | 7 | 12 | 17 | 22–23 | 25–26 |
| Thiếu Lâm Quyền | 7 | 12 | 17 | 23 | 26 |
| Thiếu Lâm Đao | 6 | 11 | 16 | 21 | 24 |

## Sáu người

Dải là min–max theo từng người trong ba seed (18 quan sát nhân vật mỗi boss), không lấy trung bình party để che người thiếu cấp.

| Trước boss | Cấp/người | Vàng/người | Món ghép/người |
| --- | ---: | ---: | ---: |
| Đông Tà | 6–8 | 433–620 | 0 |
| Lý Mạc Sầu | 7–8 | 613–800 | 0 |
| Tây Độc | 11–13 | 1.332–1.639 | 1 |
| Hoàn Nhan Hồng Liệt | 12–13 | 1.582–1.889 | 1 |
| Nam Đế | 16–18 | 2.520–2.954 | 2 |
| Chu Bá Thông | 17–19 | 2.870–3.304 | 2 |
| Bắc Cái | 22–24 | 4.063–4.645 | 3 |
| Kim Luân Pháp Vương | 23–25 | 4.513–5.095 | 3 |
| Vương Trùng Dương | 25–27 | 4.913–5.495 | 4 |

Trước Tây Độc có 3/18 quan sát thiếu cấp 12; Nam Đế 12/18 thiếu cấp 18; Bắc Cái 15/18 thiếu cấp 24; Vương Trùng Dương 3/18 thiếu cấp 26. Các mốc 12/18/24 mở bậc ultimate, nên hụt EXP có tác động tới kỹ năng dù đã mua được đồ.

## So với hai lịch trước

Giữ cùng bot solo Cái Bang Chưởng và cùng party sáu người; ba seed. `legacy`: interval 180s, một hàng, floor 900s, thưởng farm cũ; `compressed`: interval 120s từ đầu stream, hai hàng, floor 600s, thưởng cũ; `candidate`: 120s sau stream, hai hàng, floor 900s, farm ×1,25. Tất cả giữ combat tuning hiện tại và cùng budget dọn 30s: đây là so sánh pacing, không replay nguyên phiên bản M3D lịch sử.

| Trước boss | Solo legacy | Solo compressed | Solo candidate | Party compressed | Party candidate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Đông Tà | 6 | 5 | 6 | 5–6 | 6–8 |
| Tây Độc | 11 | 10 | 11 | 10 | 11–13 |
| Nam Đế | 16 | 15 | 16 | 15 | 16–18 |
| Bắc Cái | 21 | 20 | 21 | 20–21 | 22–24 |
| Vương Trùng Dương | 24 | 24 | 25 | 24 | 25–27 |

Lịch mới khôi phục phần lớn thời gian farm bị mất, nhưng mục tiêu cấp cũ cũng chưa được mô hình legacy đáp ứng đều. Không quy toàn bộ thiếu EXP cho thay đổi 3→2 phút. Bù thêm vàng đại trà chưa có cơ sở từ kết quả này; ưu tiên thử EXP theo chặng để không lỡ mốc kỹ năng và kiểm tra lại nhánh farm chậm.

## Độ nhạy thời gian dọn wave

Chỉ seed 42, solo Cái Bang Chưởng và cùng party. 0s nghĩa là giả định dọn xong ngay khi kết thúc stream; 60s là cần thêm một phút. Không thay số quái, chỉ thay phần thời gian bị dành cho thủ trong forecast.

| Dọn thêm | Solo: Tây/Nam/Bắc/VTD | Sáu người: Tây/Nam/Bắc/VTD |
| --- | --- | --- |
| 0s | 11 / 16 / 22 / 25 | 11–13 / 16–18 / 22–24 / 25–27 |
| 30s | 11 / 16 / 21 / 25 | 11–13 / 16–18 / 22–24 / 25–27 |
| 60s | 11 / 15 / 21 / 24 | 11–12 / 16–17 / 21–23 / 24–26 |

Ngay giả định dọn xong cuối stream, solo Cái Bang Chưởng vẫn thiếu cấp tại Tây/Nam/Bắc. Con số phụ thuộc policy farm; không chứng minh mọi người chơi sẽ thiếu cùng mức.

## Lượt bot tự nhiên

Không bất tử, không cấp trước level/đồ/tiền, quái xâm lăng thật và tượng 2.000 HP. Sáu lượt đều mất tượng ngay wave 1, trong khoảng 142,77–147,63 giây invasion clock. Bot dùng nearest-target, round-robin kỹ năng, không biết né/điều phối bốn cổng như người chơi. Không có checkpoint boss tự nhiên, không có lượt thắng trọn chiến dịch. Kết quả này chỉ chứng minh bot hiện tại chưa đủ cho full-campaign victory acceptance; không suy ra tỷ lệ thắng hoặc kết luận cần nerf dựa trên riêng bot.

## Kiểm tra và tái lập

- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS sau khi chốt runner.
- `pnpm qa:preflight --mode quick`: PASS; `pnpm exec tsc -b packages/game-core packages/game-data`: PASS.
- `pnpm exec vitest run tests/campaign.test.ts tests/dungeons.test.ts tests/wave-pacing.test.ts tests/invasions.test.ts tests/economy.test.ts`: **101/101 PASS**.
- Audit 43 chuỗi đủ chín checkpoint, từng nhân vật: XP = farm + invasion + boss; tổng vàng = còn giữ + chi đồ + chi bình = tổng các nguồn thu; reward boss đúng một lần; không âm vàng; material chưa mở không được craft. **0 sai lệch**. Tất cả 49 report cùng source hash và sáu core source hash; đối chiếu hash hiện tại PASS.
- Pilot soạn runner không dùng trong kết luận: một conditional siege pilot bị dừng vì tích quái/gate quan sát chưa đúng; các pilot version 1 được giữ trong artifacts nhưng loại khỏi ma trận version 2. Không ghi video hoặc ảnh động.

Ví dụ chạy lại:

```powershell
pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode forecast --variant candidate --players 1 --seed 42 --max-seconds 6000
pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode forecast --variant candidate --players 6 --seed 42 --max-seconds 6000
pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode natural --variant candidate --players 6 --seed 42 --max-seconds 1600 --end-wave 5
python -X utf8 tools/summarize-campaign-readiness.py
```

Chạy các tổ hợp còn lại theo `rawReports` và metadata trong [summary](evidence/sessions/campaign-readiness-2026-11-27/summary.json). [Runner](../tools/campaign-readiness.ts), [auditor/exporter](../tools/summarize-campaign-readiness.py). JSON đầy đủ và `checkpoints.csv` nằm trong `artifacts/campaign-readiness/` (ignored). Mốc chuẩn: [campaign balance](CAMPAIGN_BALANCE_2026_11_06.md); cấu hình mới: [wave pacing](M4D_WAVE_PACING_2026_11_27.md).

## Thử bù EXP tiếp theo — chưa áp dụng

[Thử EXP theo chặng](CAMPAIGN_XP_TRIAL_2026_11_27.md) so sánh các profile XP trong bản sao cấu hình, giữ nguyên vàng/giá. Đề xuất pool wave 110/450/750/750 đã đạt các mốc level trong bộ forecast và stress đã đo; không phải tuning production đã được duyệt.
