# Nam Đế hắc hóa — VFX v01

Cập nhật duyệt 2026-11-25: user đã duyệt bản chơi và yêu cầu tích hợp/commit milestone/m4d. VFX runtime v01 hiện APPROVED, giữ nguyên byte theo [approval lock](../../../approved_nam_de_dark_v01.lock.json). Trạng thái CANDIDATE phía dưới là lịch sử trước lần duyệt này.

Built-in imagegen, redraw theo ba concept skill đã được user duyệt ngày2026-11-25. Prompt nguyên văn trong prompts/. Không dùng artwork ngoài repo.

Sheet aura-master được giữ làm lượt loại do glow tràn ô. Thay bằng aura-isolated và shatter-isolated có gutter thật. Ice-master có4viewđao (right/up_right/up/down), parry và frost; left/up_left dùng lật, southern diagonals tái dùng viewdown. Không xoay toàn ảnh đao để giả góc camera. Fist-master cung cấp warning, ghost, fall, impact, burst và crack.18cel raster có atlas riêng; alpha shimmer/translation của aura và đao là trình bày VFX, không phải animation thân boss.

Xuất bằng scripts/prepare-nam-de-dark-vfx.py: giữ coveragealpha, bỏ generator noise<=12 cho sheetice (mức đo cần để mép ô rỗng), <=3cho fist/singleisolates. Tất cả đường biên cel cóalpha0; gutter2px tránh bleedLINEAR. Body/VFX không trộn chung vào sheetportrait.

Native effects.aseprite có18tag. Roundtrip giữ alpha vàRGB ở mọi pixelalpha>0; Aseprite chuẩn hóaRGB tại pixelalpha0, được đếm công khai trong native-validation.json. Không thay artwork để giả PASS. PNG/JSON export vàSHA256 ở assets/exports/effects/nam_de_dark_v01. ConceptAPPROVED, bản runtimeCANDIDATE chờ user nhìn.
