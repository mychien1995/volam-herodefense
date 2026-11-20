# Kiểm chứng đường pure-core nhanh · 2026-11-19

Baseline `milestone/m3d` / `1424fbff`; Node26.0.0, pnpm11.25.0, TypeScript7.0.2, Vitest5.0.5. Tooling-only; người dùng đã yêu cầu commit riêng runner, cache theo hash, test, tài liệu và evidence liên quan vào `milestone/m3d`. [Cách dùng và giới hạn](CORE_TEST_FAST_PATH.md).

## Kết quả đo

Cùng47 test trong `tests/combat.test.ts` và `tests/practice.test.ts`, không sửa nội dung test. Đo wall time của Node CLI, gồm startup, bằng driver riêng; cả hai runner dùng preflight và log gọn. Ba mẫu warm mỗi runner; vòng đầu xen kẽ thứ tự. Sau bổ sung edge case thiếu JSON, đo lại ba mẫu đường nhanh trên source cuối, giữ baseline vì canonical runner/test/input không đổi. OS cache và tải máy không được kiểm soát.

| Mẫu | `check:quick` | `check:core`, artifact HIT/HIT |
| --- | ---: | ---: |
| 1 | 19,010s | 4,794s |
| 2 | 18,942s | 4,844s |
| 3 | 15,238s | 4,934s |
| Trung vị | **18,942s** | **4,844s** |

Giảm **14,098s/lượt, 74,43%**, tương đương khoảng **3,91 lần** trong scenario này. Thời gian thực thi test vẫn khoảng2,4s; lợi ích đến từ tránh preparation/compile lặp khi artifact còn hợp lệ. Console các mẫu đầu376→375byte, về thực tế không thay đổi đáng kể. Không có phép đo billed token hoặc cam kết tăng tốc toàn suite/gameplay.

Một mẫu artifact-cold của source cuối là **18,944s**, MISS cả hai artifact và chạy preparation/force compile thật. Không suy tỷ lệ từ lượt đầu111,61s của baseline: trạng thái disk/OS khác nhau. [JSON số đo/source hashes](evidence/sessions/core-fast-accepted-measurements/benchmark.json), [vòng đo xen kẽ ban đầu](evidence/sessions/core-fast-measurements/benchmark.json), [cold cuối](evidence/sessions/core-fast-accepted-cold/check-core/core-timings.json).

## Bảo đảm cache không che lỗi

- **11 regression cache**: hash byte/file-set, cùng size/mtime, core TS chỉ compile lại, map/skill metadata/recipe/package/lock/toolchain, manifest creep ngoài assets, output thiếu/hỏng/thừa, stamp hỏng, copy cache sang checkout khác, lỗi/race, atomic lock, graph import và thiếu JSON sinh tự động. Không bật parallelism hoặc tắt isolation.
- **Probe CLI thật trên source cuối:** PASS một assertion; đổi cùng size/mtime thành assertion sai vẫn **FAIL với HIT/HIT**. Test không được cache. Sửa một byte trong JS cache khiến compile MISS; build lại rồi47 test PASS, JS trở về hash gốc. Probe chỉ tạo/xóa file test riêng và sửa thư mục cache của task, không sửa gameplay. [Kết quả](evidence/sessions/core-fast-current-probes/verification.json), [FAIL thật](evidence/sessions/core-fast-current-probe-fail/check-core/core-timings.json), [repair](evidence/sessions/core-fast-current-probe-repair/check-core/core-timings.json).
- Cold iteration đầu dừng vì compiler trả0 nhưng glob Windows không tạo entry. Runner không công bố compile stamp; đã sửa glob và thêm regression. [FAIL được giữ](evidence/sessions/core-fast-cold/check-core/core-timings.json). Các report iteration khác cũng được giữ nguyên.

## Final và phạm vi kiểm chứng

`pnpm check:final --config playwright.qa-helpers.config.ts --grep 'QA helper|ranged projectile'`: **PASS360,83s**, 41 stage, gồm preparation thật15,89s, project/tools typecheck, **1.159 unit/integration**, build production, **33 asset validator**, **4 browser case**. Browser kiểm chứng fixed projectile/effect frames, scene/server acknowledgement và movement/projectile giữa hai client. [Timing](evidence/sessions/core-fast-final/check-workflow/final-timings.json).

Workflow stage lúc đó có37 test. Sau bổ sung cache-only regression thiếu JSON, chạy lại **toàn bộ38 workflow test** và typecheck tests/tools: PASS; đồng thời lặp cold/warm/probe trên source cuối như trên. Shared runtime/build/browser inputs không đổi nên không chạy lặp1.159 test hoặc browser chỉ vì sửa helper cache. [Post-fix checks](evidence/sessions/core-fast-postfix/checks.json), [workflow log](evidence/sessions/core-fast-postfix/workflow.log).

Canonical `check-workflow.mjs`, `prepare-assets.mjs` và `vitest.config.ts` giữ nguyên byte so với baseline. Final không import/read cache pure-core; cache hiện hữu không bỏ qua bất kỳ final gate nào. [Source/guard/WIP verification](evidence/sessions/core-fast-final/verification.json).

Validator Thiếu Lâm tự cập nhật số đếm metadata ngoài task; lưu [output mới](evidence/sessions/core-fast-final/thieu-lam-validation-run.json) và trả file đó về baseline. Không thay assertion/provenance/PNG. Cả352 WIP ban đầu giữ nguyên nội dung/trạng thái; không diff gameplay/server/data/protocol hoặc runtime art. Các dịch vụ QA đã đóng, không ghi video. Không thực hiện balance/campaign dài và không xóa lịch sử.
