# Kiểm thử pure-core nhanh

`pnpm check:core` dành cho vòng lặp test mô phỏng, không đổi gameplay và không thay `check:final`.

```powershell
$env:VOLAM_QA_SESSION = 'my-core-change'
pnpm check:core tests/combat.test.ts tests/practice.test.ts
# Room, protocol, browser, UI, asset hoặc test cần IO: giữ check:quick/profile hiện hành.
# Sau implementation cuối: check:final với browser scope phù hợp, như trước.
```

Chỉ nhận tên file `.test.ts` hiện hữu dưới `tests/`, không nhận glob, thư mục, tùy chọn Vitest hoặc config thay thế. Runner kiểm tra graph import bằng parser TypeScript của Vite đã cài: chỉ `game-core`, `game-data`, `vitest`, `zod` và helper test trong phạm vi đó. Từ chối room/server/client/protocol, Node IO, browser globals, require/eval và import tính động. Đây là kiểm tra ranh giới module, không phải sandbox cho code không đáng tin.

## Hai loại artifact

| Artifact | Input được hash | Output được kiểm tra |
| --- | --- | --- |
| Dữ liệu mô phỏng đã chuẩn bị | Recipe scripts, maps, bốn skill manifest, manifest creep ở cả `sprites/` và `assets/sprites/`, dữ liệu map Kim Luân/Chu, JSON nguồn của game-data, cấu hình/package/lock/toolchain | 12 JSON được sinh cho game-data |
| Bản biên dịch | Toàn bộ source TS/JSON core + data, cấu hình, package/lock/toolchain, danh tính checkout/Node | Toàn bộ cây `.cache/pure-core/build`, gồm JS, JSON, declaration, map và build info |

Input inventory và danh sách output nằm trong `tools/core-test-cache.mjs`. **Khi recipe thay đổi dependency dữ liệu hoặc thêm output, cập nhật inventory và regression cùng lúc.** Hash bao gồm tên file và SHA-256 byte thực tế, phát hiện thêm/xóa file và thay đổi cùng kích thước/mtime. Không dùng timestamp để quyết định HIT. Cache chỉ có giá trị trong đúng checkout/toolchain; không chuyển cache giữa worktree.

MISS dữ liệu chạy lại `prepare-assets.mjs` hiện hành với các guard của nó; thiếu/hỏng output cũng là MISS. Nếu recipe cập nhật metadata đầu vào, cần một lượt ổn định trước khi công bố stamp. MISS biên dịch dùng `tsc --force` trong thư mục riêng và yêu cầu entry core/data thực sự tồn tại. Không ghi đè `packages/*/dist`. File thừa trong cây build cũng làm mất hiệu lực cache và được dọn trong đúng thư mục cache của runner.

HIT chỉ tái dùng artifact khi **cả input lẫn output** khớp. Sửa logic TS sẽ biên dịch lại mà không cần chuẩn bị lại asset khi dữ liệu nguồn không đổi. Sửa test không yêu cầu build lại; **test luôn chạy mới**, lỗi vẫn trả exit code khác 0. Runner kiểm tra lại graph sau preparation và kiểm tra input/output sau test; thay đổi giữa lượt làm run FAIL thay vì công bố PASS cho candidate khác.

## Phạm vi guard

Cache dữ liệu này không chứng nhận PNG, art approval hoặc nội dung public assets còn hợp lệ. Artwork không phải input giá trị của test mô phỏng và không được kiểm tra lại ở HIT. Dùng đường asset/browser hiện hành khi làm art. `check:final` vẫn không đọc cache này: luôn chạy asset preparation, typechecks, workflow + unit/integration, production build, mọi asset validator và browser scope như trước. Không cache kết quả test PASS hoặc phê duyệt art.

Đường nhanh typecheck core/data khi phải biên dịch; không thay typecheck tests/tools/protocol và các kiểm tra khác của final. Không đổi `fileParallelism` hoặc isolation.

## Isolation và evidence

Mỗi checkout có khóa `.cache/pure-core/lock` với PID/token. Lượt thứ hai từ chối cache đang được sở hữu, không giành khóa hoặc dừng process khác. Nếu bị kill và để lại lock, kiểm tra owner/PID đã kết thúc trước khi dọn; không tự xóa khóa đang hoạt động. Không chạy preparation/final khác đồng thời trong cùng checkout: thay đổi candidate giữa lượt sẽ bị từ chối.

`VOLAM_QA_SESSION` tách report/log: `docs/evidence/sessions/<session>/check-core/`. Không đặt session thì dùng `.cache/check-core/`. Mỗi run có report bất biến riêng và `core-timings.json` trỏ kết quả mới nhất; giữ báo cáo FAIL. Console chỉ in preflight, HIT/MISS, thời gian và phần đuôi lỗi; log đầy đủ lưu riêng. Không tạo ảnh/video.

Regression của cache: `node --test scripts/tests/core-test-cache.test.mjs`. [Đo trước–sau và kiểm chứng task](CORE_TEST_FAST_PATH_REPORT_2026_11_19.md).
