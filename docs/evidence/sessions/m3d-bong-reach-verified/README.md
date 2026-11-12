# Bổng tầm 105 trong trận M3D · 2026-11-12

Ảnh và báo cáo được chụp từ bản client build production kết nối MatchRoom chạy local ở chế độ production. Hai người chơi vào bằng Chromium, bốn người dùng SDK. Fixture chỉ đặt nhóm và hai quái thử đứng yên ở 100 và 126 đơn vị. Phím mũi tên, A, sát thương, HP và đồng bộ chạy qua đường chơi thật.

Playwright quan sát đủ 4 tư thế đứng, 16 cel đi và 16 tổ hợp thức đánh–hướng. Cả 16 tổ hợp trúng ở 100 và trượt ở 126. Hai trình duyệt thấy cùng HP. Bốn nhánh cận chiến đã chốt đều nhận A và công bố hồi chiêu 0. Báo cáo ghi số cel vẽ thực tế trên trình duyệt; atlas được kiểm tra riêng đủ 84 cel. [Ảnh đứng](review/bong-idle.png), [bốn hướng Vụt](review/bong-bon-huong.png), [khung đã quan sát và sát thương](review/bong-in-match.json).

`pnpm check:final --config playwright.creep-upgrade.config.ts tests/e2e/m3d-review.spec.ts --grep 'Bổng tầm 105'` qua typecheck, 18 workflow checks, 982 test Vitest, build và toàn bộ validator. Lượt trình duyệt của lệnh này chạm ngưỡng lấy mẫu nhiều cel trong một thức 8 tick. Sau khi chỉnh riêng fixture, `pnpm exec tsc -p tsconfig.tools.json --noEmit` và `node tools/run-playwright.mjs test --config playwright.creep-upgrade.config.ts tests/e2e/m3d-review.spec.ts --grep 'Bổng tầm 105' --trace off` đều đạt. Lượt Playwright ghi ảnh cuối mất 59,4 giây trong ca kiểm thử.
