# Thiếu Lâm Quyền rework

[Atlas và frame](../assets/exports/skills/thieu-lam/quyen-rework), [script xuất](../scripts/export-shaolin-quyen-rework.py) và [khóa nguồn](../assets/approved_shaolin_quyen_rework.lock.json) ghi lại La Hán v02, đánh thường v02 và Vô Ảnh v03. Thân đá bay và La Hán tái sử dụng hình ngang, hướng vệt lướt, cước kình và điểm nổ lấy từ hướng server.

La Hán hiện thân, đấm chéo xuống ba lần cách nhau 220 ms, rồi tan biến. Mỗi cú có một đợt nổ đất riêng. Ba nhịp là trình diễn của một hit La Hán, vì vậy combo A vẫn ghi đúng một bước mỗi mục tiêu. Ba kình đầu của A là hình ảnh cự ly gần từ ba hit cận chiến hiện hành. Thức cuối dùng projectile bán nguyệt có sẵn. Bốn nhịp A và hồi chuỗi giữ nguyên.

Vô Ảnh thường phóng ba bàn chân thẳng, lệch −18/0/+18, cách nhau 3 tick. Một địch nhận sát thương tối đa một lần mỗi lượt. Phát Động B thay đạn bằng dash 210 đơn vị, 630 đơn vị/giây, bán kính quét 32. Sát thương gốc 102 là tổng sáu cước cũ trước hệ số Phát Động. Server giữ kiểm tra cùng mục tiêu và vật cản, chặn lướt khi bị trói, giữ hồi chiêu, nội lực và cơ chế đệm E. Hình dash sử dụng vị trí/action server, thêm dư ảnh, vệt gót và gió bụi ở mặt đất.

Ca live dùng phím A/Q/F/W/E trên hai client với bia tĩnh, không seed bước combo.

Lượt audit sau tăng tầm La Hán từ 85 lên 140 và dời ba điểm nổ theo tầm đánh. Đại Lực khóa hướng khi bấm E, ưu tiên mục tiêu đã nhận hai đòn mở combo nếu còn trong tầm, cung trước mặt và đường bắn. Thế Cước giữ E đã đệm khi người chơi bấm lại Q/W đang hồi chiêu. Hồi thế Ca Diệp giảm từ 6 xuống 2 tick. Cả hai combo vẫn kiểm tra trúng cùng mục tiêu ở server.

Vòng production `pnpm check:final --config playwright.diamond-palm.config.ts tests/e2e/shaolin-quyen-rework.spec.ts tests/e2e/diamond-palm.spec.ts --trace off` qua typecheck, 18 workflow checks, 962 unit/integration tests, toàn bộ validator và ba ca Chromium hai client. [Báo cáo](evidence/sessions/shaolin-quyen-followup-final/check-workflow/final-timings.json) · [La Hán](evidence/sessions/shaolin-quyen-followup-final/shaolin-quyen/shaolin_la_han_ground.png) · [Đá lướt](evidence/sessions/shaolin-quyen-followup-final/shaolin-quyen/shaolin_vo_anh_dust.png).

Rà hình tiếp theo phát hiện renderer renovation cũ vẽ cước xanh chồng lên bán nguyệt. Bản chỉnh cuối bỏ đường render xanh của riêng Thiếu Lâm. Chrome live đã xác minh cả tám tư thế tiếp xúc hướng dọc và ảnh bán nguyệt vàng sau chỉnh. [Ảnh hướng xuống](evidence/sessions/shaolin-quyen-vertical-verified/roundhouse-down.png) · [Ảnh hướng lên](evidence/sessions/shaolin-quyen-vertical-verified/roundhouse-up.png).

Sau khi build lại để gỡ cước xanh, ca Phaser tập trung chạy lại qua trên hai client. Ca này chờ server xác nhận input E và quan sát đạn trên cả hai cửa sổ. [Quan sát cuối](evidence/sessions/shaolin-quyen-gold-final/shaolin-quyen/observations.json).

Bản được duyệt dùng bốn tư thế `hero_thieu_lam_actions` trong chế độ Renovation mặc định, cùng mẫu nhân vật và mật độ ảnh với atlas đứng yên và đi bộ. Đồng hồ động tác và lớp quyền kình/cước kình lấy từ trình diễn rework. Đã kiểm tra 16 tổ hợp thức đánh và hướng trong preview, cùng 965 ca unit/integration và ca Chromium hai client. Ca Chromium chạy lại trên cùng build sau khi fixture chờ server xác nhận từng lần bấm A. [Báo cáo build](evidence/sessions/shaolin-basic-identity-final/check-workflow/final-timings.json) · [Quan sát Chromium](evidence/sessions/shaolin-basic-identity-browser/shaolin-quyen/observations.json) · [Ảnh đòn A](evidence/sessions/shaolin-basic-identity-browser/shaolin-quyen/basic-attack.png) · [Quan sát bốn hướng](evidence/sessions/shaolin-basic-identity-browser/shaolin-quyen/basic-four-facings.json).
