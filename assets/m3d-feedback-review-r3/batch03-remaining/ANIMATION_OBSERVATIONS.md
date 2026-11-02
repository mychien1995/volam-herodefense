# Quan sát animation · review6 (kế thừa review4/5)

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


## Sửa mới của review5

- Hoắc Đô quay về nail scale0.25 và source runtime. Hai variant giữ đúng pattern và pose (Vạn Nhận spin), chỉ projectile sáng hơn; không đổi size hoặc saturation. PNG baseline/candidate cùng timestamp để so sánh.
- Truy Hồn:7 nguồn hướng tỏa360° từ boss, bật cả trụcX/Y tại biên suốt20s. Các sample đến16.5s và kiểm cả4 corner xác nhận không còn7 làn song song. Hành vi/mốc là giữ runtime, không phát minh homing hay stat mới.
- Hộ Thể:7 luân quanh boss, hết3s chuyển liên tục sang7 hướng radial; position cuối orbit bằng điểm bắt đầu release của cùng wheel ID. Sole midpoint của channel cels [79.5,133]/[89.5,128]/[94.5,128]/[97,128] thay display pivot một chân để body nằm đúng tâm orbit. Không sửa pixel source.
- Arena overlay mới tăng10% mỗi trục so với game hiện tại, diện tích+21%. Quyết định thu nhỏ0.8 bị thay thế. Footprint không đổi camera hay collision thật trong lượt review này.

Các PNG review5 được mở kiểm trực tiếp gồm dart sáng, Truy Hồn ở7.5s, Hộ Thể đang xoay và vừa tỏa ra. Playback normal-speed và cast Truy Hồn20s (review2×) đã chạy ở focused check. Báo cáo verification mới sẽ được ghi riêng sau pipeline final; phần verification review4 phía trên là lịch sử.


## Verification review5

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS exit0, 245.27s**.18 workflow tests,498 unit/integration tests/43 files,15 asset validators,6 browser tests (115.63s). Batch03 paint294 selected tags/919 frame references. Review5 có31 assertions riêng và11 cặp PNG; Truy Hồn20s chạy hết ở playback2× và cleanup0, Hộ Thể orbit→release continuity được kiểm cho7 ID. Hoắc Đô baseline/candidate giống pattern/shape/scale, chỉ brightness khác.

Báo cáo: `docs/evidence/sessions/m3d-r3-batch03-review5/verification-summary.json`, final-timings và `previews/review5-validation.json`.7 report validator chỉ đổi newline được chứng minh LF-normalized bằng HEAD rồi trả đúng byte.5.207 entry lock đối chiếu qua guards; chưa Phaser/multiplayer r3, không video/GIF và không merge.


## Quan sát review6

- Đã xem atlas Hoắc Đô thật: nail_0..3 có đầu nhọn hướng dưới-phải, trục steel đo61.99°,60.49°,63.48°,62.57°. Trước đó rotation lấy source là0° dẫn đến mũi bay ngang. Góc hiển thị mới = hướng trajectory − góc source cel; tâm xoay là steel centroid. Shape/size/brightness/pattern vẫn giữ. PNG normal scale và kiểm từng cel/hướng xác nhận tip trùng hướng bay.
- rotating_waves mới là4 layer xanh/vàng còn phóng to phủ màn hình ở review5. Đã loại chúng khỏi candidate và selected, cùng core lớn.15 moving rotating_ring ground giữ nguyên từng field của recipe; test so JSON với history/review5 đã PASS. PNG mới không còn cloud âm dương lớn, còn các vòng ground và hero rõ.
- Focused browser review6 PASS: cả4 nail cels và4 facings cho hai skill, kiểm góc render thực tế với trajectory, playback requestAnimationFrame normal speed và cleanup. Pipeline final được ghi sau khi hoàn tất, chưa Phaser/multiplayer r3.


## Verification review6

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS exit0, 262.23s**;18 workflow tests,498 unit/integration tests/43 files,15 validators và7 browser tests (127.37s). Paint293 selected tags/915 refs. Review6 kiểm704 dart render states, cả4 source cels ×4 facings ×2 skill variants: mũi thép sau transform cùng hướng trajectory; sai số góc tối đa1.13e-15rad.15 ground-ring recipe giữ nguyên đúng JSON snapshot review5; large_formation/rotating_waves vắng khỏi selected và candidate.

Có6 cặp PNG native/display và playback normal-speed/cleanup. Report tại `previews/review6-validation.json`, `docs/evidence/sessions/m3d-r3-batch03-review6/verification-summary.json` và final-timings.7 report validator chỉ đổi newline đã chứng minh LF-normalized bằng HEAD rồi trả lại đúng byte.5.207 lock entry được kiểm; không gen raster/recording, không Phaser/multiplayer acceptance r3.
