# Thiên Sơn Đao và tỷ lệ Côn Luân — 2026-11-20

Trên `wip/m3d/25d`, sửa đúng hai phản hồi của user. Ba bộ mới là candidate v2; v1 và36 approved byte locks được giữ nguyên. Gameplay/core/server/protocol/HUD geometry/F8 không đổi.

Thiên Sơn Đao v1 dùng nét viền dày/flat shading ngay trong source, khác Phiến. V2 re-author toàn bộ32poses×8facing=256cel theo Phiến về độ chi tiết tóc/mặt/chất liệu, vẫn giữ Hàn Nguyệt dao cong, tóc búi nửa, nơ trắng, áo ngà và dải xanh xám. Không đổi choreography, attack variants, Tam Liên ba pass hoặc bốn shadow bodies. Ba raw takes bị loại do nền alpha/figures chạm nhau; giữ trong raw/rejected-v2, generation-timing-v2 giữ receipts/prompts. Gỡ các pose overrides/segmentation annotations của v1 để không vô tình kéo art thô cũ vào atlas mới.

Côn Luân: exporter cũ lấy hair silhouette width để chỉnh mật độ action group, khiến nguồn action còn0.729–0.943× (Thiền Sư),0.831–0.972× (Kiếm Tôn). V2 giữ mật độ sheet nguồn gốc cho action/reaction, không dùng tóc/áo/vũ khí đang mở rộng làm mốc. Nếu idle được thay bằng tấm high-resolution riêng (Thiền Sư right/up), action phải tham chiếu idle nguồn gốc cùng sheet, không lấy tỷ lệ pixel của replacement. Hai bước này đều đã được kiểm tra trên contact sheets đủ8 hướng, A và Chaos. Không thay nhân vật/weapon/VFX của Côn Luân. Renderer vẫn scale0.5; crouch có thể thấp hơn đứng nhưng đầu/thân cùng mật độ. Chaos giữ1.34 native density có chủ ý.

`tools/verify-con-luan-density.py --version v1` tái hiện FAIL; `--version v2` PASS với densityRatio1.0 cho mọi A cel được kiểm tra ở8hướng. Native PNG/JSON/Aseprite/source/alpha/visibleRGB/pivot/bounds/public copies:848frames/128tags PASS, gồm112 Chaos derivative cels đã khai báo.16 focused policy cases/3files PASS; client/tools typechecks PASS. Không full suite/balance/video.

Six-client Thiền Sư full profile PASS. Kiếm Tôn full run qua8idle/8walk và48action groups trước khi FAIL ở assertion status tint: probe so tint sau expiry với sample đầu đã chịu burn. Sửa mốc về idle sample trước apply statuses; không sửa runtime/status gameplay. Giữ FAIL gốc; scoped six-client reactions40cases/natural respawn/party/F8/portrait và extras S→Q/dash/sword PASS. Thiên Sơn pilot đã hiển thị source mới trong Phaser; partial-direction choreography FAIL khi pass quay sang hướng chưa có atlas, không gọi là complete. Chỉ final đủ8 hướng mới được dùng làm completion gate.

PNG/report bàn giao tại [summary](evidence/sessions/sprite-corrections-2026-11-20/summary.json), [ba nhánh trước–sau](evidence/sessions/sprite-corrections-2026-11-20/three-branches-before-after.png). Crop source pixels, thời điểm độc lập, cùng gameplay zoom; giữ full originals. Hướng idle/A có thể khác nhau theo capture, không dùng bounding-box height thay cho anatomical density.

Final Thiên Sơn Đao: `dao2-final`, ports3017/5617, sáu client: PASS,8idle/8walk/48action groups×6 acknowledgments/40reaction cases + native choreography, shadow cleanup, party96controlled targets/F8/portrait/authority. Không balance/AI/reward coverage.

Review mở mới ở `http://127.0.0.1:5618/?debug=1`, Thiên Sơn Đao cấp30,5slot rank4, F8 off/on verified, không pageerror. Server/browser được mở bằng process riêng để giữ phiên chơi. Cả14 nhánh đều có thể chọn lại trong phòng mới.
