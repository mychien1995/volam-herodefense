# Quan sát animation r3 · candidate cả lượt

Phạm vi: playback Canvas độc lập; PNG native640×360/display1280×720; quan sát frame và composite bằng requestAnimationFrame. Chưa có bằng chứng Phaser/state server/multiplayer cho r3. Director chưa duyệt batch03.

| Mục | Candidate và điểm cần xem |
| --- | --- |
| Thiên Hạ Vô Cẩu | Tổng2500→3250ms; loop1600→2080ms, đều+30% trong fixture; body giữ scale, đập cuối VFX rộng1.45× là đề xuất review. |
| Liệt Phong Đao | Body và blade dùng tag facing chụp tại lúc cast; đổi hướng hủy cast/hold cũ. Chưa sửa lỗi registry/facing trong production. |
| A Thiếu Lâm Quyền | Bốn lần A mới ra bốn nhịp; roundhouse phóng một crescent; key repeat bỏ qua. CD1s cuối chuỗi; partial chain nghỉ2s rồi CD1s chỉ là fixture minh họa. |
| Vi Đà Quyền | Tâm ground eruption70→105px; feet caster không dịch theo eruption. |
| Vô Ảnh Cước | Bàn chân/toes vàng đọc được riêng projectile. Ba salvo minh họa và duration dài hơn; số/timing/range chưa là tuning. |
| Toàn Phong Thoái | Lốc vàng travel riêng; caster đá tại chỗ. Ba impact riêng ở mục tiêu trên đường, không dừng ở mục tiêu đầu, không loop impact trên cùng mục tiêu trong fixture. |
| Như Lai Niết Bàn | Phật sau lưng; palm hạ xuống rồi ground impact; field glyph cố định, mục tiêu đi vào có impact riêng. Palm được đưa sau body để giữ silhouette. Không suy entry damage từ số frame hoặc animation loop. |
| Tru Tà | Giữ body, tăng quãng/scale VFX riêng. Cần director chốt độ dài; runtime range chưa thay. |
| Kim Quang Hộ Trận | VFX alpha thấp, sau body và chừa tâm; aura di chuyển bám caster, ending hữu hạn. Open-center là recipe review từ art cũ. |
| Sư Tử Hống | Đầu sư tử ngẩng miệng lên, vòng ground nở rộng; hero thấy rõ giữa vòng. Nhãn giảm giáp/slow chỉ mô tả contract. |
| Lý Mạc Sầu A | Ring ivory/violet 360°, anchor dùng cùng tâm ground đo từ ring đầy đủ, tránh vệt đầu nhảy lên ngang thân. Độc châm đi thẳng, demo350 vượt mốc A320/220; hướng dọc có thể đi khỏi viewport. |
| Cổ Mộ Kiếm Pháp | Các biến thể4/6/8 có đúng từng minion và shot riêng. Không trình mọi minion như một atlas sprite duy nhất. |
| Phất Trần Công | Purple art cũ, cả scale rộng và reach×4; caster giữ nguyên. Hiệu ứng lớn có thể đè UI/ra ngoài khung khi hướng dọc; không giảm zoom để giấu giới hạn này. |
| Hồng Liệt A1/A2 | Source thrust cũ đã bake nhiều vệt: không nhân nó năm lần. A1 mới dùng năm source-instance một đao, quãng demo170→204(+20%). A2 demo242 theo A Phiến220+10%; handoff giữ yêu cầu range tech600→720 của A1 riêng. |
| Túy Tiên Bộ | Bay ngắn hơn, ba đợt palm hiện khi actor còn airborne. Đường actor/offset bay là art fixture, không teleport/gameplay movement. |
| Càn Khôn Phản Chấn | Sáu target từ mép sân bị trình kéo về boss; range contract toàn arena, không coi vòng field art là giới hạn hút. |
| Âm Dương Nghịch Chuyển | Giữ danger/safe ground patterns. large_formation chỉ còn trong baseline, vắng khỏi selected mới. |
| Hoắc Đô | Darts tăng brightness1.6×/scale~1.55× từ source; cường độ và số tia review chưa là hit count gameplay. Hai variant dùng body action cũ hướng dưới. |
| Đạt Nhĩ Ba | Telegraph180ms và ba đợt đập là demo cadence. Bất Động tắt layer tại người cũ đúng lúc bật tại người mới, không beam/chuyển object. |
| Kim Luân A | Wheel mới có silhouette tròn; crescent vàng lớn đi nhanh. Body chém tay mới anticipation/raise/chop/recovery đủ bốn facing, pivot boot đo ổn định. |
| Truy Hồn / Hộ Thể | Mỗi skill có bảy wheel instance; wheel không bị scaleY thành bầu dục. Orbit ground có tỷ lệY0.45; đường bay không chứng minh tracking/AI. |
| Ba nền mới | Cổ Mộ lạnh, doanh trại nâu đỏ, thành Tương Dương xám giúp phân biệt VFX. Bố cục mới giữ sàn giữa trống; nền Chu Bá Thông giữ nguyên. Footprint overlay80% mỗi chiều, không camera shrink. |

PNG đã được mở kiểm tra trực tiếp gồm lốc, Phật/palm, sư tử, vòng phất trần, tám minion, Hồng Liệt và bảy wheel. Quan sát đã dẫn tới các sửa anchor/layer/single-blade nêu trên. PNG không tự chứng minh damage/stun, collision, đồng bộ hay quyền server.

Source có các fade mềm mà alpha threshold không giữ đủ: bỏ cel palm outro gần trống; Phật chọn loop art fade bằng renderer để tránh bật một phần tượng. Hình gốc và cel lịch sử vẫn giữ; selected-tags mới là danh sách tiêu thụ. Source wheel6 frame có rim marker chuyển qua cung quay, chưa khép kín360° đều; kiểm cảm giác loop ở normal scale trong viewer trước khi duyệt.

Cleanup trong viewer xóa travel/status/aura/ground/minion khi cancel, chết, đổi vùng, đổi facing, đổi mục và hoàn tất. Đây là contract để bind lifecycle thật sau duyệt, chưa là kiểm thử hành vi server. Giữ source/asset Ca Diệp và Phá Giáp đã khóa nguyên byte.


## Kết quả verification cuối

`pnpm check:final --config assets/m3d-feedback-review-r3/source/tools/playwright.config.mjs`: **PASS, exit0**, 220.70s. Có18 workflow tests,498 unit/integration tests/43 files, build,15 asset validators và4 browser tests (75.22s). Hai test của batch03 cùng các regression Ca Diệp/Phá Giáp đều PASS. Không mượn kết quả trước để ghi PASS. Endpoint game preview vẫn là2887.

Batch03:23 item,132 scene/facing/variant/beat,300 selected tags với944 frame references đã paint từng cel bằng requestAnimationFrame; composite normal-speed và chuỗi A thủ công chạy thật trong viewer. Registry support có551 available tags/1768 references, KHÔNG phải tất cả được chọn.112 cel mới qua binary alpha, không chạm biên canvas và khớp atlas/individualPNG; wheel bbox42×41/42 hoặc41×42, sai số raster tối đa1px. 5.207 file trong approval/lock inputs đã kiểm nguyên hash. Native contacts25 component và PNG viewer được lưu tại previews.

Report: `docs/evidence/sessions/m3d-r3-batch03-all-remaining/check-workflow/final-timings.json`; static/protected/bounds/browser/motion reports trong package.7 report validator chỉ đổi newline đã được chứng minh LF-normalized giống HEAD rồi trả lại đúng bytes; không khôi phục hay ghi đè thay đổi nội dung khác. Chưa live Phaser/multiplayer r3; quality và mức độ che hình của VFX×4 vẫn cần director duyệt. Không video/GIF hoặc merge.
