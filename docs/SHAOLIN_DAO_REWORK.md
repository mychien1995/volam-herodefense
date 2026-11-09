# Thiếu Lâm Đao trong M3D

Trận thường hiển thị trường đao Kim Cang (1C), đao khí lưỡi liềm (2A), La Hán Tru Tà (3A) và đao sen cùng vòng sen Như Lai Thiên Diệp (4A) khi chọn nhánh Đao. Vòng sen theo vùng hiệu lực của Như Lai. Dáng đứng cầm đao sen dùng bốn hướng. Khi đi, nhân vật dùng các khung đi trường đao Kim Cang. Đao khí A là lớp trình diễn của đòn cận chiến. Có thể đối chiếu bằng `?shaolinDaoArt=0`.

Tru Tà tăng 10 đơn vị ở mỗi bậc, thành 190/194/198/202. Server dùng gốc thi triển, góc, đường nhìn và bán kính thân địch để xác định một lần sát thương mỗi mục tiêu. Phaser lấy gốc và bán kính từ sự kiện thi triển rồi chỉnh tỉ lệ vệt quét. Mép sáng của atlas nằm ở x=171,5 trên khung rộng 174 px. La Hán giữ bố cục đã duyệt sau nhân vật.

[Atlas](../assets/exports/shaolin-dao-preview-v01/) · [Nguồn và provenance](../assets/source/skills/thieu-lam/dao-preview-v01/) · [Khóa asset](../assets/approved_shaolin_dao.lock.json)

Kiểm chứng biên tầm và đánh lan dùng ba seed cố định. Ca Chromium dùng hai client Phaser và bốn client SDK trong phòng thường. Bia được đặt ở biên, người chơi học Q và T qua HUD và ra đòn bằng phím.

`pnpm check:final --config playwright.shaolin-dao.config.ts --trace off` qua 969 bài unit/integration, build production, kiểm tra asset và hai ca Playwright. Ca Skill Review hai client bổ sung xác nhận mép quét ở tầm 202 của bậc 4. [Kết quả](evidence/sessions/shaolin-dao-m3d/check-workflow/final-timings.json) · [Khung Tru Tà](evidence/sessions/shaolin-dao-m3d/tru-ta-sweep.png) · [Hit trong phòng sáu người](evidence/sessions/shaolin-dao-m3d/six-player-tru-ta-hit.png) · [Như Lai Thiên Diệp](evidence/sessions/shaolin-dao-m3d/six-player-dao-lotus.png).
