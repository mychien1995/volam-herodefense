# Lôi Đài và Phòng test — duyệt tích hợp M3D

Người dùng duyệt toàn bộ thay đổi và yêu cầu tích hợp vào `milestone/m3d`, commit ngày 2026-11-19. Phạm vi gồm Lôi Đài độc lập, năm map/artwork/NPC/VFX, Phòng test và đổi phái tại chỗ, các sửa Defense/liveness/menu/font/camera/HUD, nhịp Độc Cô +20%, cùng test và bằng chứng đã lưu.

Runtime artwork được duyệt theo bản chơi cuối: `assets/approved_pvp_concepts.lock.json` và manifest PvP ghi runtimeApproval=true, giữ nguyên hash PNG/source.

Kiểm chứng trước tích hợp: 1.152 unit/integration,18 workflow PASS;8 ca browser khác nhau PASS qua các lượt, gồm hai browser/sáu SDK trong phòng8 người qua5map. Báo cáo FAIL lịch sử giữ nguyên, xem [biên bản cuối](evidence/sessions/pvp-eight-native-verified/acceptance.json) và [chi tiết](PVP_VISUAL_REPAIR.md).

Nhánh đích có hai commit QA/reference mới hơn baseline PvP; tích hợp phải giữ cả hai thay đổi đó và giữ nguyên các file chưa commit khác ở checkout đích.
