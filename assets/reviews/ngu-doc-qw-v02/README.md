# Ngũ Độc · Hiệu ứng Q và W v02

[Mở preview Phaser](http://127.0.0.1:5536/ngu-doc-preview.html) và chọn **Bích Cổ**.

- **Q · Ngũ Độc Chưởng**. Mỗi tay có một ngọn lửa xanh uốn quanh lòng bàn tay. Hai ngọn dùng nhịp lệch nhau và đổi vị trí theo 24 cel đứng, đi, ra chưởng. Tay ở phía khuất đặt lớp lửa sau thân để giữ thứ tự chiều sâu. [PNG trong Phaser](ngu-doc-chuong-1366.png)
- **W · Độc Sa Chưởng**. Một bãi khói độc tròn trên mặt đất, nhìn thành elip theo góc camera. Ba cel dùng chung tâm và giữ cùng biên vùng trong khi các cuộn khói đổi nhịp. [PNG trong Phaser](doc-sa-chuong-1366.png)

[PNG/JSON](../../exports/ngu-doc-qw-v02) và [nguồn Aseprite, ảnh gốc, prompt và SHA-256](../../source/ngu-doc-qw-v02). Sáu cel dùng chung khung 256×184. Q là 105 ms mỗi cel, W là 180 ms mỗi cel. Đã kiểm tra từng cel với atlas bằng Aseprite và kiểm tra trực tiếp ở viewport 1366×768, camera 1×.

Bài kiểm tra Chromium kiểm tra hai ngọn lửa chuyển frame và bám pose, Q tắt đúng, W có một đối tượng khói ở đúng điểm dưới boss hoặc phía trước mặt, giữ vị trí khi hero đi xa và tự dọn hết sau khi kết thúc.

Lượt pnpm check:final --config playwright.ngu-doc-preview.config.ts đạt typecheck, build, bộ kiểm tra tài sản, 1.073 test unit/integration và 3 bài kiểm tra Chromium.
