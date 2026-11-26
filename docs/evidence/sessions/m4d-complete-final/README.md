# Bản IIS M4D — sửa tải asset và cache

## Phiên bản

Gói trước đã được build nhầm từ M3D. Gói thay thế `volam-hero-defense-m4d-windows-iis.zip` được build từ worktree `C:\Users\ADMIN\.codex\worktrees\milestone-m4d\volam-hero-defense`, nhánh `milestone/m4d`, nền commit `98d745ed96c62d2866055e2ddb00ae4efc1a38dd`, cộng các sửa cache trong working tree. Protocol 55; build ID `abf26c2271442dcf`. Không sửa server/game-core, luật chơi hoặc protocol.

ZIP: 526.966.600 bytes (~527 MB). SHA-256: `2bcf3c9404b1fd2a81a35d2396513e4c4dfb552435f8aa1dda14562690b11fa3`.

## Những gì đã sửa

- Ảnh raster được chuyển thành bản phân phối WebP lossless khi nhỏ hơn, kiểm tra RGBA chính xác với nguồn. Giữ nguyên PNG/art nguồn đã duyệt. SVG giữ nguyên bytes.
- URL ảnh chứa hash nội dung; JS/CSS và media do Vite sinh nằm trong thư mục `bundles` có hash. IIS trả `Cache-Control: public, max-age=31536000, immutable` cho các URL này. Nội dung đổi sẽ có URL mới.
- Bao phủ cả ảnh menu, chân dung, icon, SVG và ảnh M4D được preload trước hook của Phaser. Chân dung chọn phái dùng thẻ ảnh ưu tiên cao.
- Gzip được tạo sẵn cho JS/CSS/JSON/TMJ/SVG; thương lượng Accept-Encoding, MIME và Vary đã kiểm tra trên IIS Express. Không cần bật native compression của IIS.
- HTML, build info, manifest và URL cũ tiếp tục revalidate để nhận bản cập nhật. Các URL ảnh cũ vẫn được rewrite đến bản phân phối đúng. Giữ bộ lọc atlas không sử dụng vốn có của M4D.

## Cách upload

1. Dừng tiến trình Node hiện tại. Sao lưu bản đang chạy, rồi cập nhật **cả `client` và `server`** trong ZIP. Protocol của gói cũ là 48, gói này là 55.
2. Đặt nội dung `client` ở thư mục IIS đang trỏ đến; giữ toàn bộ `web.config` trong các thư mục con và toàn bộ `.gz`. Giữ lại các file immutable cũ trong đợt thay phiên bản để client đang mở không bị thiếu file.
3. Khởi động lại server bằng `server/start-server.cmd`. Proxy `/game-api` vẫn trỏ đến `127.0.0.1:2567`. Tham khảo thêm `DEPLOY.txt` trong ZIP.
4. Mở `/volam-build-info.json`: phải có branch `milestone/m4d`, protocolVersion `55`, buildId `abf26c2271442dcf`. Mở `/game-api/health`: phải báo milestone `M4D`, protocolVersion `55`. Tải lại trang để nhận client mới.
5. Kiểm tra DevTools với **Disable cache tắt**: ảnh trong `/assets/immutable/` và JS/CSS trong `/bundles/` có cache một năm; lần tải lại dùng memory/disk cache. HTML revalidate là chủ ý.

Chưa upload hoặc thay đổi server public trong phiên này. Lần tải đầu vẫn cần tải các asset chưa có trong máy; kết quả cache dưới đây là trên máy QA, không phải cam kết độ trễ của đường truyền server public.

## Kiểm tra tải và cache

`tsc -b`, production build và `node tools/run-playwright.mjs test tests/e2e/asset-cache.spec.ts tests/e2e/art-preload.spec.ts`: **4/4 PASS** trên source cuối, với runtime staging `m4d-complete-cache`, server/client cổng 2887/5487 và preflight mới.

- Cả 591 URL ảnh quan sát được trong trận dùng đường dẫn immutable/bundle và header cache dài hạn.
- JS/CSS sau reload: **0 byte mạng cho cả 4 bundle**. Vendor JS: 876.957 byte sau giải nén, khoảng 125.933 byte truyền gồm overhead trong Chromium. Một ảnh mẫu: tải đầu 2.445.574 byte, tải lại 0 byte.
- Cả 7 chân dung và icon nhánh tải/giải mã được. Ảnh bằng chứng: `m4d-school-portraits.png`.
- Hai client render đúng actor của nhau; di chuyển bằng phím được server xác nhận và đồng bộ. Bài preload/retry dungeon PASS. Không thay đổi luật multiplayer.

Log: `m4d-release-m4d-complete-cache-browser.log`.

## Kiểm tra chính ZIP giao cho người dùng

- Toàn bộ 8.264 entry qua kiểm tra CRC và đường dẫn an toàn; 2.127 ảnh immutable đúng SHA-256; 1.247 gzip giải nén khớp nguyên bản; 305 cấu hình IIS hợp lệ và nhỏ hơn giới hạn 250 KB; 2.247 alias trỏ đến file tồn tại.
- Client và server có cùng build info M4D/protocol 55. Client dùng đúng endpoint production `https://hero-defense.stackfolio.cloud/game-api`.
- Server giải nén vào thư mục tạm độc lập, không dựa vào dependencies workspace: **PASS** health M4D/55, 2 SDK client vào cùng phòng, trạng thái 2 người và public room listing. Tiến trình và thư mục tạm đã dọn.
- IIS Express chạy chính client lấy từ ZIP: **PASS** HTML/build info revalidate; JS/CSS/WebP/SVG cache immutable; gzip/identity/gzip;q=0 đúng MIME, Vary và bytes; URL ảnh cũ rewrite đúng. Tiến trình đã dừng.

Chi tiết: `m4d-iis-release-verification.json`, `m4d-iis-release-native.json`. Gói nén text giảm từ 23.114.643 xuống 2.558.929 bytes; ảnh toàn bộ gói không đồng nghĩa toàn bộ được tải lúc vào trận.

## Giới hạn của bộ kiểm tra tổng

Đã chạy `pnpm check:final tests/e2e/asset-cache.spec.ts tests/e2e/art-preload.spec.ts` sau thay đổi runtime cuối, với session `m4d-complete-final`. Preflight, chuẩn bị asset, compile, typecheck test/tool và workflow regression PASS. **1.374 unit/integration test PASS, 7 FAIL**; pipeline dừng tại đây, không được ghi nhận là toàn bộ PASS.

- 4 test M3D vẫn đòi protocol 49 trong khi M4D dùng 55.
- 1 health test vẫn đòi milestone M3B trong khi server M4D trả M4D.
- 2 test hiện có sai kỳ vọng geometry/HP (`invasion-room` và `room`). Source server/game-core không thay đổi trong công việc cache này.

Kiểm tra asset riêng trước sửa URL preload cuối: **34/35 validator PASS**; `verify-skill-revise-thien-su.py` báo hash `hammer-coherent-v4/body.json` không khớp lock hiện có. File này không bị sửa; không thay approved art hoặc lock để che lỗi. Các sửa sau đó chỉ đổi URL phân phối, thêm SVG và đường preload; không đổi ảnh nguồn.

Lượt browser rộng trước đó có 4 PASS/2 FAIL: kỳ vọng tên texture Cái Bang cũ và timeout quan sát projectile. Hai bài này không được tính PASS. Bộ 4 bài tải/cache/multiplayer nêu trên đã được chạy lại trên source cuối và đều PASS.

Báo cáo FAIL được giữ nguyên: `m4d-release-final-timings.json`. Kết quả validator riêng: `m4d-release-m4d-final-asset-validation.json`. Không lặp lại các stage đã PASS chỉ để viết báo cáo.
