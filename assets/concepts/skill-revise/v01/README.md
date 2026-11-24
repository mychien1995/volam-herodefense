# Skill revise — artwork v01

Phản hồi mới: bảng 05 (búa) và 07 (trận kiếm) đã được yêu cầu sửa; xem [hai bản v02](../v02/README.md). Bảng 06 còn búa ngắn, chỉ giữ tham khảo hiệu ứng; body/vũ khí cần đồng bộ búa cán dài khi sản xuất. Các ảnh v01 giữ nguyên làm lịch sử; phản hồi này không duyệt các bảng khác.

Ngày: 2026-11-22. Nhánh: `wip/m3d/skill-revise`.

Trạng thái: **PENDING_DIRECTOR_REVIEW**. Bộ concept mới để director chọn hình và key pose trước animation. Không phải sprite sheet, game screenshot, atlas hay bằng chứng chuyển động.

Phạm vi và yêu cầu đã chốt: [đặc tả](../../../../docs/SKILL_REVISE_2026_11_22.md).

Route: built-in `image_gen`, nguồn `host_image`. Không gọi API/CLI trả phí riêng; không tạo video. Model/cost không do tool trả về thì không suy đoán. Ảnh nền xanh xám là bảng review opaque, chưa phải PNG alpha để tích hợp.

Giữ nguyên tất cả approved bytes và runtime. Ảnh gốc giữ ở thư mục generated_images, bản copy nguyên byte vào thư mục này. Prompt chính xác ở [prompts](prompts/), identity refs/hash/PNG metadata trong `manifest.json` khi hoàn tất.

| Mã | Concept | File |
| --- | --- | --- |
| 01 | hoa-long-xuyen-son | [01-hoa-long-xuyen-son.png](01-hoa-long-xuyen-son.png) |
| 02 | phong-quyen-tan-van | [02-phong-quyen-tan-van.png](02-phong-quyen-tan-van.png) |
| 03 | huyen-am-chuong | [03-huyen-am-chuong.png](03-huyen-am-chuong.png) |
| 04 | that-tinh-kiem | [04-that-tinh-kiem.png](04-that-tinh-kiem.png) |
| 05 | thien-su-the-bua | [05-thien-su-the-bua.png](05-thien-su-the-bua.png) |
| 06 | thien-su-phan-set-va-e | [06-thien-su-phan-set-va-e.png](06-thien-su-phan-set-va-e.png) |
| 07 | than-long-cuu-hien | [07-than-long-cuu-hien.png](07-than-long-cuu-hien.png) |
| 08 | co-quan-long-vu-bom-bang | [08-co-quan-long-vu-bom-bang.png](08-co-quan-long-vu-bom-bang.png) |
| 09 | co-quan-laze-luot | [09-co-quan-laze-luot.png](09-co-quan-laze-luot.png) |
| 10 | icon-rework | [10-icon-rework.png](10-icon-rework.png) |

## Kiểm chứng và giới hạn

- Chỉ kiểm tra PNG decode/dimensions/hash, link và metadata cho đợt concept/docs; chưa chạy gameplay build/test hoặc live Phaser.
- Xem tất cả ảnh để kiểm tra nội dung; số kiếm/đạn trong concept cần phân biệt các inset nghiên cứu riêng với vignette chính.
- Không có chỉ số damage, range, timing hay tuning nào được duyệt qua hình.
- Doctor lần đầu lưu `doctor.json` báo FAIL `encoding.stdout`; retry với `PYTHONUTF8=1` ở `doctor-utf8.json` đã sửa encoding. Retry vẫn WARN `python.path` và các MISSING optional API keys, resvg-py, Grok CLI; route host image sẵn dùng. Không tuyên bố toàn bộ môi trường PASS.
- Sau khi director duyệt ảnh tương ứng mới làm animation/VFX và kiểm tra gameplay zoom trong Phaser theo đặc tả.
