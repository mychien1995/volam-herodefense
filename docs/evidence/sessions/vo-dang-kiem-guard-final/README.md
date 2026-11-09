# Võ Đang Kiếm · tỉ lệ Vạn Kiếm và khóa Tọa Sát

Hai client Chromium quan sát 48 điểm chạm, tỉ lệ kiếm mới khi rơi và diện tích nổ lớn hơn 10%. Mũi kiếm và tâm nổ tiếp tục dùng cùng điểm chạm. [Ảnh từ Phaser](impact.png).

Phòng thử có bia đứng yên và cấp sẵn hai loại bình. R chặn phím di chuyển, lướt, A và Q. Phím 1 dùng bình máu trong lượt thủ đầu. Di chuyển và Q hoạt động lại khi hết thủ. Phím 2 dùng bình mana trong lượt thủ tiếp theo, sau hồi chiêu chung. Kiểm thử mô phỏng bao gồm mở khóa khi phản đòn kích hoạt sớm.

`pnpm check:final --config playwright.vo-dang-kiem.config.ts` qua TypeScript, 18 kiểm tra workflow, 960 test Vitest, build và các validator asset. Lượt Chromium đầu chờ bình mana khả dụng trước khi bấm R trong lúc mana đầy. Sau khi sửa điều kiện chờ trong bài test, `node node_modules/typescript/bin/tsc -p tsconfig.tools.json --noEmit` và `node tools/run-playwright.mjs test --config playwright.vo-dang-kiem.config.ts` đều qua với cùng bản build.
