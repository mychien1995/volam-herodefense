# Pure-core song song · 2026-11-20

Tiếp nối commit QA `70ebc8ab` trên `milestone/m3d`. Task này chỉ sửa runner/config/test tooling và tài liệu. Không đổi gameplay, nội dung test combat, source runtime hay artwork. [Cách dùng](CORE_TEST_FAST_PATH.md).

## Ranh giới và thực thi

- `check:core` vẫn chỉ nhận file test chỉ định, kiểm tra graph import, hash input/output, khóa cache, chạy test mới và kiểm tra candidate sau test. Mặc định tối đa 2 fork worker; `VOLAM_CORE_WORKERS=1` dùng tuần tự; chỉ nhận 1..4.
- `isolate:true` vẫn bắt buộc. Không bật concurrent trong từng file, không chia cache lock giữa nhiều runner. Helper policy được đưa vào input hash. Report ghi policy worker để phân biệt các lượt đo.
- Rà 110 file tracked bằng guard hiện hữu: **38 file / 685 test** đi đường pure-core; 72 file có phụ thuộc ngoài ranh giới dùng đường hiện hành. Đây là snapshot audit, không phải allowlist cố định; guard chạy lại trên selection thật mỗi lượt.
- `vitest.config.ts` và `scripts/check-workflow.mjs` giữ nguyên byte. Suite Room/server/IO và final vẫn tuần tự, cùng đầy đủ guard. Không tự khởi chạy hai runner preparation/final trong cùng checkout.

Theo [Vitest file parallelism](https://main.vitest.dev/config/fileparallelism) và [worker policy](https://main.vitest.dev/guide/parallelism), giới hạn worker điều khiển concurrency giữa file; tắt file parallelism ép một worker. Đã đối chiếu API với Vitest 5.0.5 cài tại repo và kiểm chứng thực thi thật.

## Kiểm chứng an toàn

- Hai regression mới: giới hạn worker/override; bốn file Vitest thật kiểm tra overlap ở 2 worker, không overlap ở 1, counter module luôn bắt đầu lại ở từng file. Cố ý sửa assertion thành sai vẫn exit 1. Không thay test gameplay để tạo PASS.
- 11 regression cache hiện hữu vẫn PASS; TypeScript tests/tools PASS.
- [Probe CLI](evidence/sessions/core-parallel-probes/guards.json): worker `0` và test Room bị từ chối trước preparation/test, dù cache khác đang được sở hữu. Không mở cổng, dùng lại hay dừng dịch vụ khác.

## Phương pháp đo

Cùng 38 file, cùng source cuối và artifact HIT/HIT. Baseline là policy 1 worker tái hiện thực thi tuần tự; candidate dùng 2 worker. Ba cặp đảo thứ tự 1→2, 2→1, 1→2, đo wall time Node CLI gồm startup/preflight/hash; từng lượt đều chạy mới 685 test. Warm-up MISS được giữ riêng và không tính vào median. Tải máy/OS cache không được kiểm soát; không suy ra mức tiết kiệm billed token hoặc tốc độ gameplay/final.

[Selection và lý do loại](evidence/sessions/core-parallel-measurements/selection.json), [raw paired measurements](evidence/sessions/core-parallel-measurements/benchmark.json). Pilot tám file [FAIL do input thay đổi giữa lượt](evidence/sessions/core-parallel-before/check-core/core-timings.json) được giữ; không dùng làm baseline tốc độ hay gọi là test PASS. Guard đã từ chối candidate có inventory thay đổi.

| Cặp | 1 worker | 2 worker |
| --- | ---: | ---: |
| 1 | 38,519s | 21,006s |
| 2 | 36,267s | 24,073s |
| 3 | 46,002s | 23,863s |
| Median CLI | **38,519s** | **23,863s** |

Giảm **14,656s/lượt, 38,05%** trong workload này. Median stage test riêng: 35,584s → 19,816s. Từng lượt PASS cùng 38 file/685 test; input/output đều HIT/HIT. Không dùng cold warm-up 57,630s để tính gain. Chưa benchmark 4 worker; cho phép override nhưng không cam kết nhanh hơn 2 worker. Nhóm nhỏ hoặc máy bận có thể hưởng lợi ít hơn; dùng 1 worker khi cần.

## Tái hiện

```powershell
$coreFiles = (Get-Content docs/evidence/sessions/core-parallel-measurements/selection.json -Raw | ConvertFrom-Json).eligible
$env:VOLAM_CORE_WORKERS = '1'
pnpm check:core @coreFiles
$env:VOLAM_CORE_WORKERS = '2'
pnpm check:core @coreFiles
node --test scripts/tests/core-test-execution.test.mjs scripts/tests/core-test-cache.test.mjs
```

Luôn giữ selection hợp lệ với source hiện tại; file nào thêm phụ thuộc ngoài core sẽ bị guard từ chối. Đảo thứ tự và lặp ba cặp nếu cần so sánh máy khác; không chạy đồng thời hai runner trong cùng checkout.

## Final và bảo toàn WIP

`pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile' --reporter=line`: **PASS 524,92s**, gồm typecheck, **44 workflow regression, 1.159 unit/integration, production build, 33 validator asset/reference và 4 browser case**. Browser stage 77,26s kiểm tra readiness/server acknowledgement, helper observations và movement/projectile giữa hai client thật. [Timing đầy đủ](evidence/sessions/core-parallel-final/check-workflow/final-timings.json).

Không diễn giải thời gian final thành tốc độ cải thiện: suite chung vẫn tuần tự và tải máy không được kiểm soát. Không bỏ qua guard hoặc lặp suite đã PASS chỉ để cập nhật báo cáo. [Metadata validator mới](evidence/sessions/core-parallel-final/thieu-lam-validation-fresh.json) được lưu riêng, trả counter ngoài scope về baseline.

[Đối chiếu cuối](evidence/sessions/core-parallel-final/verification.json): **352 file WIP gốc nguyên byte và Git status**, cache lock đã nhả, cấu hình suite chung/runner final nguyên byte so với `70ebc8ab`. Chỉ phần QA trước được commit theo yêu cầu; phần tối ưu song song này chưa commit. Không đổi gameplay và không tạo art/video mới.
