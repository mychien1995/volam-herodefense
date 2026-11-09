# Võ Đang Kiếm trong Phaser

Bản production chạy nhánh Kiếm cố định với hai client. Bộ thử chỉ cấp EXP để học kỹ năng và đặt hai bia đứng yên. Các lệnh A/Q/T, sát thương và số lượt hồi đều đi qua server bình thường.

- **A2.** Mô phỏng kiểm tra đủ năm kết quả RNG, sát thương đánh thường và Kiếm Khí bay thẳng. Playwright quan sát các thế khác nhau và thân kiếm từ atlas `vdk-body` sau lệnh A đã xác nhận.
- **Q2.** Server phát bảy sự kiện `sweep` theo chỉ số 0–6. Phaser lấy mẫu nhiều vệt bạc và mực trong chuỗi, với sát thương hướng về trước.
- **Vạn Kiếm.** Cả hai client nhận cùng tâm rơi và HP bia. Khung lên có kiếm dựng mũi lên trên sau lưng, khung chờ chỉ còn dấu đất, khung rơi có mũi hướng xuống trên cùng một tâm. Hai lượt bậc 1 được tiêu đúng, lượt thứ ba bị chặn. Mỗi vùng gây sát thương đúng một lần ở tick 36 sau khi bấm.
- Mô phỏng ba seed tại cấp 6, 12, 18 và 24 xác nhận sức chứa 2, 3, 4 và 5 lượt. Các mức sát thương quan sát trên bia không giáp lần lượt là 117–175, 132–198, 147–220 và 162–243.

[Kiếm bay lên](rise.png) · [Nhịp chờ](quiet.png) · [Kiếm từ trời rơi xuống](fall.png)

TypeScript, 18 test workflow, 958 test Vitest trong 97 file, build và các validator asset qua trong lượt `pnpm check:final --config playwright.vo-dang-kiem.config.ts`. Browser lượt đầu bỏ lỡ khung thân A. Sau khi phát lại thế A theo event đã xác nhận, typecheck, build và riêng stage Playwright được chạy lại. Hai client qua trong 47 giây. Dữ liệu server và atlas giữ nguyên giữa hai lượt.
