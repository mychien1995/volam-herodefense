# M3C3 Feedback v2 — concept combat

**CONCEPT_PENDING_REVIEW · 2026-10-31 · Chưa có duyệt concept / production / runtime cho bộ v2.**

Đây là nhánh art độc lập với sửa gameplay. Mọi file của lượt này nằm trong thư mục này. Không thay code, combat data, mapping runtime, tests, tài liệu gameplay, approved source/export hoặc approval lock. Không tạo GIF/video. Không dùng pixel concept làm frame game.

## Duyệt trước: Cái Bang

1. [Bổng A bốn nhịp](01_cai_bang_bong_four_beats.png): chọc → quét → hất → bổ; key pose t0/t1/t2 và nghiên cứu VFX riêng.
2. [Hàng Long Hỏa Vũ](02_cai_bang_hang_long_fire_dragon.png): một rồng lửa lớn tiến về trước, có gather/travel/impact/ending; không dùng sóng nhiều đầu cũ.
3. [Chưởng A thứ sáu + Hỏa Vân Chưởng](03_cai_bang_palm_accents.png): đầu rồng nhỏ và ba tia phân kỳ.
4. [Năm skill Bổng — bản sửa r2](04_cai_bang_staff_skills_r2.png): vòng quét, bổ phá giáp, long trảo kéo vào, lướt bổng, chó lửa.

Tên đúng là **Hàng Long Hỏa Vũ**, ID hiện có `hang_long_hoa_vu`; “Hóa Vũ” trong feedback được hiểu là cùng skill. Không đổi ID/tên trong dữ liệu.

## Bốn bộ concept

| Bộ | Sheet được đưa ra duyệt | Mockup khung review 1280×720 |
|---|---|---|
| Cái Bang | [Bổng bốn nhịp](01_cai_bang_bong_four_beats.png), [rồng lớn](02_cai_bang_hang_long_fire_dragon.png), [Chưởng](03_cai_bang_palm_accents.png), [skill Bổng r2](04_cai_bang_staff_skills_r2.png) | [Rồng — bản r2](11_cai_bang_gameplay_mockup_r2_review_1280.png) |
| Thiên Sơn | [Quạt/gió](05_thien_son_fan.png), [Đao/tàn ảnh](06_thien_son_dao.png) | [Quạt đi–về và bão tám hướng](12_thien_son_gameplay_mockup_review_1280.png) |
| Võ Đang | [Quyền/khí](07_vo_dang_fists_and_qi.png), [mana/trận/kiếm r2](08_vo_dang_mana_formation_sword_r2.png) | [Khiên và biên trận](13_vo_dang_gameplay_mockup_review_1280.png) |
| Thiếu Lâm | [Ba silhouette + empowered](09_thieu_lam_three_silhouettes.png), [A/Đao/Tru Tà/hồi phục](10_thieu_lam_basics_dao_recovery.png) | [Quyền nhỏ/đại chưởng/hồi phục](14_thieu_lam_gameplay_mockup_review_1280.png) |

Mở ảnh review ở **100%**, đối chiếu [PNG gameplay thật được giữ nguyên byte](reference_actual_gameplay_1280.png). Mockup là ảnh minh họa ghép bằng imagegen từ PNG gameplay lịch sử; **không phải screenshot game mới**. Generator đã vẽ lại một phần nền/nhân vật/HUD và có lệch bố cục nhẹ. Bản review thu toàn khung từ 1672×941 xuống 1280×720 bằng Aseprite, không chứng minh pixel sprite, camera hay hitbox chính xác. Không có art mới được nạp vào Phaser ở lượt này.

## Hồ sơ bàn giao

- [Kiểm kê ba nhóm + đọc reference](INVENTORY.md); [87 component, đường dẫn/tags/pivot/hash thực đo](inventory.json).
- [Động tác nhân vật, VFX và pha thời gian theo từng đề xuất](STORYBOARDS.md).
- [Danh sách sprite/atlas sau duyệt](PRODUCTION_PLAN.md); [metadata kế hoạch](production_plan.json). Đây là kế hoạch, không phải mapping runtime hay atlas có thể load.
- [Rà soát hình và giới hạn kiểm chứng](REVIEW.md); [kết quả kiểm tra file](validation.json).
- [Provenance, hash và trạng thái từng PNG](concept_manifest.json); [prompt đầy đủ](generation_prompts.json).
- [Snapshot chỉ đọc của art/lock được bảo vệ](protected_art_snapshot.json). Snapshot này không cấp quyền hay thay thế approval lock.

## Cổng duyệt

Dừng ở **CONCEPT_PENDING_REVIEW**. Cần director duyệt hướng động tác/silhouette/VFX trước production. Giữ nguyên thiết kế nhân vật đã duyệt; duyệt concept này không duyệt gameplay mới.

Sau một lượt duyệt riêng: vẽ lại frame ở mật độ pixel gameplay, source chỉnh sửa được, PNG alpha thật + atlas JSON/metadata đúng pivot và scale hiện tại. Không phóng to/cắt sheet này để giả sprite. Art production chỉ được duyệt cuối sau kiểm tra frame/timing/hướng/pivot/transition, combat readability và gameplay trong Phaser. Không kế thừa waiver cũ của Thiếu Lâm sang bộ v2.

Các bản `04_cai_bang_staff_skills.png`, `08_vo_dang_mana_formation_sword.png` và `11_cai_bang_gameplay_mockup.png` được giữ làm lịch sử nháp; dùng bản **r2** trong bảng trên.
