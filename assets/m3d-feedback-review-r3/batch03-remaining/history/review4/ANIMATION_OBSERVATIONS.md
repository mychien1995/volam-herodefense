# Quan sát animation · review4

Phạm vi là viewer Canvas độc lập ở640×360 native /1280×720 display, school44px, boss56–60px. Chưa kiểm Phaser/state server/multiplayer r3. Review3 chưa duyệt được giữ trong history; không ghi đè ảnh cũ để giả nó đã đạt yêu cầu mới.

| Mục | Quan sát và sửa |
| --- | --- |
| Liệt Phong | Offset source -44px được áp dụng khi tụ/hold: chuôi ở trên đầu. Chém trái dùng source phải phản chiếu ngang, lưỡi sáng xuống và sống lên; không xoay180 độ. Ground-break r2 vẫn trình ở phía trước feet. PNG hold/chém trái và chém phải đã được xem. |
| Thiên Hạ Vô Cẩu | Đúng4 dog_run runtime đổi facing theo tiếp tuyến orbit, Y-depth qua trước/sau người. Aura mở rộng1.35×, radius demo90→120; loop/total+30% giữ lại. Ground-smash contact tại[128,174] thay tâm canvas128,128, vụ nổ nằm tại mặt đất người đứng. |
| Vô Ảnh Cước | Gốc giữa thân ởfeetY−22; ba làn trên/giữa/dưới, phát lần lượt và bay cùng vector, thành bậc thang. Hướng dọc dùng làn ngang tương ứng để giữ ba đường song song. PNG phải/trái đã xem. |
| Tru Tà | Body rút/chém; vệt slash phóng đại2.4× gắn cố định với nhát chém, không có travel hay crescent projectile. Một clip hữu hạn, fade cuối; PNG phải/trái cho thấy một đường chém. |
| Kim Quang | Giữ opacity/open-center/style. Trục ground ring pixel128,120. Caster và aura dùng chung thời gian/quỹ đạo. Không lặp cast pose lệch sang bên khi buff tồn tại; trở về idle/walk đã duyệt. Atlas đao là112×80 với feet slice56,64, đọc trực tiếp từ metadata, không giả định80×80/pivot40. |
| Lý Mạc Sầu | Needle từ giữa thânfeetY−28, demo350→400, không bắt đầu ở hàng feet. Ring360 scale1.2 theo yêu cầu+20% AOE. Phất Trần Công bị rút hoàn toàn khỏi selected review, không sửa game. |
| Hồng Liệt A1 |5 instance cùng một gốc giữa boss, không5 gốc ở phía trước/khác hàng. Tia giữa theo facing, hai cặp tỏa đối xứng. |
| Hồng Liệt A2 | Arc180° trước mặt, stationary quanh tâm boss; source arc lửa định hướng và clip front-half, không bay khỏi boss. 242 là range contract A Phiến220+10%; PNG phải/trái/dưới đã lưu. |
| Túy Tiên Bộ | Khôi phục boss_review_actions_v02 spin và bóng lưu/ring/wind đang dùng trong game. Body vẫn spin khi chưởng phát về vị trí player đã chụp lúc release; không đổi sang dash/bay/palm body. Tọa độ bounce trong viewer chỉ là fixture. |
| Âm Dương | Khôi phục rotating_ring và rotating_waves runtime,15 tâm ground liên tục di chuyển không lưới. Chỉ loại core large_formation, giữ4 wave layers của runtime. Không coi các vòng wave to còn lại là core đã loại. Source game hiện có gốc ô+jitter được ghi rõ để sửa contract khi tích hợp. |
| Kim Luân | Round wheel và crescent cùng lấy torsofeetY−30 làm gốc; bbox atlas/foot row không còn quyết định hàng phát. Body chém tay mới bốn hướng giữ nguyên. |

Các mục chưa bị phản hồi khác giữ candidate trước, không suy thành đã được director duyệt. Các giá trị preview không tạo damage/cooldown/range/teleport/AI, không sửa production. PNG đã mở kiểm trực tiếp và playback requestAnimationFrame/geometry checks có báo cáo riêng; screenshot không chứng minh motion, damage hoặc mạng.

Một test cũ lúc lặp còn kỳ vọng23 mục đã báo fail đúng vì Phất Trần bị rút, sau đó assertion cập nhật22 mục và thêm guard không chọn lms_purple. Không dùng lượt fail đó làm PASS. Báo cáo final được thêm khi pipeline xong.


## Verification review4

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS exit0, 252.94s**,18 workflow tests,498 unit/integration tests/43 files, build,15 validators và5 browser tests. Batch03 có293 selected tags/915 references được paint từng cel,22 mục active. Guard sửa lỗi có73 assertions và20 cặp PNG native/display; playback normal-speed/lifecycle trong report riêng. Không recording, không Phaser/multiplayer acceptance r3.

Report cuối: `docs/evidence/sessions/m3d-r3-batch03-review4/verification-summary.json` và `check-workflow/final-timings.json`.7 report validator chỉ đổi newline đã chứng minh LF-normalized bằng HEAD và trả lại đúng byte; không khôi phục bất kỳ thay đổi nội dung khác. 5.207 entry trong approval/lock được đối chiếu; r2, Ca Diệp và Phá Giáp nguyên byte.
