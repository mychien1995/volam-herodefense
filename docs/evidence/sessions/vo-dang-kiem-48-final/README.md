# Võ Đang Kiếm · Vạn Kiếm 48 thanh

Hai client Chromium chạy bản Phaser production trên cổng 5587 với phòng thử có bia đứng yên. Cả hai quan sát 48 vụ nổ ở lượt T đầu. Các điểm chạm riêng trải rộng hơn 100 đơn vị theo chiều ngang. Thanh đầu chạm đúng tâm trên bia boss, cùng tick với lần gây sát thương duy nhất. Q hiển thị đủ bảy vệt chém, tương ứng các tick 0, 6, 12, 18, 24, 30 và 36. Lượt T thứ hai tiêu hết lượt bậc 1 và lượt thứ ba bị chặn.

Bản preview dùng cùng bộ trình diễn. Tua qua đủ 48 điểm chạm đã xác nhận mũi kiếm hướng xuống đúng vị trí trước mỗi vụ nổ và một khoảng khuất 500 ms. Dùng lại PNG và atlas Võ Đang Kiếm đã duyệt.

[Kiếm rơi](fall.png) · [Nổ tại các điểm chạm](impact.png)

`pnpm check:final --config playwright.vo-dang-kiem.config.ts` qua TypeScript, 18 kiểm tra workflow, 958 test Vitest trong 97 file, production build và các validator asset. Lượt Chromium đầu lấy mẫu được 45 vụ nổ khi đếm và mã hóa PNG trong cùng lượt T. Sau khi tách việc chụp sang lượt T thứ hai, `node node_modules/typescript/bin/tsc -p tsconfig.tools.json --noEmit` và `node tools/run-playwright.mjs test --config playwright.vo-dang-kiem.config.ts` đều qua. Lượt Chromium chạy lại mất 50,1 giây.
