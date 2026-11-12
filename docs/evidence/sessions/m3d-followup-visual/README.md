# Rà sprite M3D · 2026-11-12

Hai Chromium vào cùng một trận M3D. Với bảy nhánh, thử phím mũi tên theo bốn hướng, tạo hit qua bộ giải sát thương và bấm từng chiêu với build kiểm thử hợp lệ. Đã nhận 38 lệnh cast và thấy khung của cả 38 chiêu. Mẫu kỹ năng tập trung khoảng 0,72 giây đầu theo hướng phải. Phần đứng và đi của cả bảy nhánh và 11 dạng boss có đủ 360 khung trong atlas renovate. Ảnh dưới dùng khung gốc của atlas. Tên texture lúc chơi nằm trong JSON. [Bảy nhánh](locomotion-heroes.png) · [Chín boss, 11 dạng](locomotion-bosses.png) · [Khung Phaser của bảy nhánh](hero-render-audit.json)

## Bảy nhánh

| Nhánh | Đứng, đi, trúng đòn | Kỹ năng quan sát |
| --- | --- | --- |
| Cái Bang Chưởng | Cùng bộ renovate cho cả ba trạng thái | 5 chiêu dùng bộ động tác renovate V3 |
| Thiên Sơn Phiến | Cùng bộ renovate | 5 chiêu dùng bộ cast quạt V2 |
| Thiên Sơn Đao | Cùng atlas Hàn Nguyệt ở cả bốn hướng | 5 chiêu dùng Hàn Nguyệt |
| Võ Đang Quyền | Cùng bộ renovate | 3 chiêu dùng bộ rework Quyền, Dương Khí Kích và Thái Cực Thần Công dùng bộ động tác renovate V3 |
| Võ Đang Kiếm | Cùng bộ renovate khi đứng, đi và trúng đòn | Thất Tinh Kiếm và Vạn Kiếm Quy Tông dùng bộ rework. Nhân Kiếm Hợp Nhất, Bát Quái Kiếm Trận, Tọa Sát Bác Đồ dùng V2 |
| Thiếu Lâm Quyền | Đứng, đi và hit đọc từ bộ renovate. Một mẫu chuyển nhánh của fixture còn giữ cue Võ Đang Kiếm ở khung đầu | 8 chiêu dùng các bộ Quyền/Vô Ảnh hoặc các thế V3/V5 |
| Thiếu Lâm Đao | Đứng/đi dùng bộ Đao đã duyệt. **Trúng đòn đổi sang atlas renovate đời trước ở cả bốn hướng**. [Ảnh đối chiếu](thieu-lam-dao-hurt.png) | Tru Tà và Như Lai Thiên Diệp giữ bộ Đao. Kim Quang Hộ Trận, Bất Động Minh Vương và Sư Tử Hống đổi qua bộ động tác khác theo pha |

Ở các nhánh dùng chung sprite đứng khi bị hit, nguồn ảnh giữ được mẫu nhân vật, nhưng độ đọc của cú đánh cần hiệu ứng va chạm riêng. Với Thiếu Lâm Đao, trạng thái hurt chặn route bộ Đao trước khi renderer chung chọn khung đứng từ atlas cũ hơn. [Route trong ArenaScene](../../../../apps/game-client/src/arena-scene.ts) · [Renderer Thiếu Lâm Đao](../../../../apps/game-client/src/shaolin-dao-art.ts)

## Chín boss

Cột cast dựa trên các pha encounter được gọi từ fixture trong trận, giữ nguyên xử lý và render của game. Cột đi và trúng đòn dựa trên atlas và nhánh chọn sprite. Một số pha trúng đòn có thể bị cast đang chạy ưu tiên hiển thị. Log có 91 lượt quan sát gồm boss, dạng phụ và hộ vệ. [Ma trận quan sát boss](boss-matrix.json)

| Boss | Đứng và đi | Cast và trúng đòn |
| --- | --- | --- |
| Đông Tà | Bộ renovate 4 hướng | Các cast chính còn dùng bộ M3D gốc, thấy rõ ở Đạn Chỉ Thần Công. Hurt đi qua bộ gốc. [Ảnh cast](boss-dong-ta-dan_chi_than_cong-review.png) |
| Tây Độc | Cả dạng thường và Cáp Mô có bộ renovate 4 hướng | Vạn Độc Phi Châm dùng thân renovate. Các chiêu còn lại quan sát dùng bộ gốc hoặc bộ động tác Cáp Mô riêng. Khi hurt, renderer chọn idle/crawl của bộ gốc. [Ảnh Phi Châm](boss-tay-doc-van_doc_phi_cham-review.png) |
| Nam Đế | Bộ renovate 4 hướng | Phật Quang và tư thế aura dùng bộ renovate. Các chiêu chỉ/phóng chưởng chính còn dùng bộ gốc. Hurt dùng atlas gốc. [Ảnh Phật Quang](boss-nam-de-phat_quang_pho_chieu-review.png) |
| Bắc Cái | Bộ renovate 4 hướng | Chủ yếu giữ cast M3D gốc, có tư thế rework ở một số pha. Phân thân dùng bước đi trong pha đảo vị trí. Tag hurt đi vào route action cũ. |
| Vương Trùng Dương | Hai dạng có bộ renovate 4 hướng | Các pha cast ở hai dạng vẫn hiện thân từ atlas `vtd-body`. Hurt cũng chuyển qua route này. [Ảnh Ngũ Hành](boss-vuong-elements-review.png) |
| Chu Bá Thông | Bộ renovate 4 hướng | Giữ bộ cast riêng cũ. Khi mất HP, renderer phủ màu 150 ms lên tư thế đang vẽ, dùng tư thế đứng hoặc tư thế cast hiện tại. |
| Hoàn Nhan Hồng Liệt | Bộ renovate 4 hướng | Quét A2 và Liệt Điểm Phong Tỏa có bộ gốc. Một số chiêu còn xen khung gốc khi vào hoặc thoát pha. Khi hurt, nhánh hiện tại có thể giữ idle cũ và phủ màu. |
| Kim Luân Pháp Vương | Bộ renovate 4 hướng | Giữ bộ cast riêng cũ, xen pose R3 ở chưởng tay. Khi hurt ngoài cast, nhánh hiện tại dùng idle từ atlas cũ và phủ màu. |
| Lý Mạc Sầu | Bộ renovate 4 hướng | Băng Phách Ngân Châm có route renovate. Các cast còn lại và hurt dùng sprite Cổ Mộ cũ theo chính sách hiện tại. |

Các atlas hurt riêng không nằm trong bộ locomotion renovate của 11 dạng boss. Hàm chọn sprite dùng nhánh hurt chung cho hero và creep thường. Các boss đi qua renderer encounter, nơi có những nhánh giữ lại sprite cast gốc theo quyết định cũ. [Luật chọn sprite](../../../../apps/game-client/src/renovation-art.ts) · [Ngoại lệ giữ bộ gốc](../../../../apps/game-client/src/renovation-policy.ts)

## Hiệu ứng trúng đòn đề xuất

1. Tia va chạm vàng kem ở thân mục tiêu trong khoảng 90–120 ms. Dùng vài hạt nhỏ bay theo hướng đòn tới để đọc hướng va chạm.
2. Viền sáng ấm một nhịp, có thể kèm giật sprite 1–2 px về phía đòn đánh. Hạn chế tần suất theo từng mục tiêu để đòn A nhanh không biến quái thành một mảng sáng.
3. Đòn chí mạng dùng tia rõ hơn và một vòng nứt nhỏ tan nhanh. Hiệu ứng thường vẫn gọn trong các đòn quét trúng nhiều quái.

Ưu tiên thử tia va chạm nhỏ kèm viền rất nhẹ. Cơ sở phát là sự kiện hit có sát thương từ server, đặt hiệu ứng lên sprite hiện tại.


## Kiểm thử gameplay

- 986 test Vitest, typecheck, build production và các validator asset đã qua trong `pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/m3d-review.spec.ts --grep 'two remaining branches|Thiên Hạ Vô Cẩu giảm' --trace off`. Ca Thiên Hạ Vô Cẩu đạt. Ca tổng hợp cũ dừng vì bộ lấy mẫu không bắt được khung A. [Nhật ký pipeline](../m3d-followup-final/check-workflow/final-timings.json)
- Thiên Hạ trong trận hai client nhận 18 sát thương mỗi đòn trước và sau action, 3,6 khi xoay, hồi 10,5 trên 210 HP tối đa ở cú cuối. Peer nhận cùng sự kiện hồi. [Log trận](../m3d-followup-final/review/bong-ultimate.json)
- Ca riêng `node tools/run-playwright.mjs test --config playwright.creep-upgrade.config.ts tests/e2e/m3d-review.spec.ts --grep 'Wave creep và nhịp bẫy' --trace off` đạt sau khi kiểm tra typecheck fixture. Hai client thấy wave đầu có 158 HP trong phòng hai người. Hai cột nước và bốn miệng lửa đi qua state server, renderer Phaser quan sát frame nổ và hero nhận choáng. [Log trận](../m3d-followup-match/review/wave-and-traps.json)
- So sánh headless với ba seed, tám nhánh, các mốc cấp 1/6/15/30, hệ số phòng một và sáu người. Mỗi lượt đo một creep đứng yên. Kết quả tách ảnh hưởng của thay đổi HP khỏi cách gom quái hoặc né đòn. [Dữ liệu so sánh](balance.json)
