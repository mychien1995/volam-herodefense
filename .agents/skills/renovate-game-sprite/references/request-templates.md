# Requests the user can send

A name or file path, desired actions and the worktree are usually sufficient. Infer the existing identity, palette, pivot and matching renderer from the project. The user can add a specific quality reference or defect when those matter.

## Short request for a known sprite

```text
Dùng $renovate-game-sprite để renovate sprite Thiếu Lâm Đao hiện tại theo chất lượng của bản Võ Đang visual-upgrade-2.

Giữ nhận diện, màu môn phái và đao đã duyệt.
Làm idle, đi bốn hướng và đánh thường.
Cho tôi thử trong arena bằng Phaser ở kích thước gameplay, kèm ảnh trước/sau cùng chiều cao hiển thị và PNG/JSON gốc.
Làm tại worktree [tên hoặc đường dẫn worktree].
```

## Request with a precise scope

```text
Dùng $renovate-game-sprite.

Sprite cần sửa — [tên nhân vật hoặc đường dẫn PNG/atlas hiện tại].
Tham chiếu chất lượng — bản Võ Đang visual-upgrade-2 và [ảnh cụ thể nếu có].
Đặc điểm giữ lại — [mặt, tóc, trang phục, vũ khí, bảng màu].
Vấn đề muốn sửa — [viền đứt, áo nhiễu, kiếm khó đọc, bước chân trượt…].
Phạm vi — [idle / đi bốn hướng / đánh thường / danh sách skill].
Kích thước — đề xuất theo vai trò của sprite, đối chiếu với bản cũ ở cùng chiều cao hiển thị.
Kết quả — [bản duyệt tương tác / tích hợp vào trận hiện tại].
Nơi làm — [worktree].

Áp dụng quy trình tạo ảnh mới, giữ viền alpha, căn chân, xuất PNG/JSON và kiểm tra live Phaser ở zoom thường. Ghi rõ các pose dùng lại và phạm vi đã kiểm tra.
```

## Request to continue after a preview

```text
Tôi duyệt hướng hình ảnh của [asset/bản preview].
Dùng $renovate-game-sprite để tích hợp bộ đã duyệt vào trận M3D tại worktree [tên].
Kiểm tra qua client bình thường, chuyển động, VFX theo sự kiện server và đồng bộ nhiều người theo quy trình của repo.
```

## Image-generation prompt scaffold

Use this after inspecting the real references and replacing the subject/actions for this request.

```text
Create an original gameplay sprite of [character].
Reference 1 defines the approved identity, outfit, weapon and palette.
Reference 2 defines the desired render quality, lighting and edge clarity.
Reference 3 defines the actual elevated top-down camera and gameplay proportions.

Draw [exact facing and action/pose sequence].
Target readable detail at approximately [chosen body height] source pixels, displayed at [chosen visible height] in the game.
Use clear light/shadow groups, a continuous dark contour, connected weapon edges and a narrow clean anti-aliased silhouette.
Keep the complete character and weapon within transparent padding.
For animation, keep body scale, head, costume, handedness and ground contact consistent across [frame count] genuinely different poses in [grid layout].
Output a true transparent PNG. Separate VFX from the body.
```

Choose the numeric size and frame count after inspecting the old asset and target view. Preserve the reference's visual style while adapting material and school colors to the requested subject.

