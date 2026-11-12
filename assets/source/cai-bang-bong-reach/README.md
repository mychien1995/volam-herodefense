# Bổng sơn đỏ khắc rồng vàng · M3D

Atlas chứa 4 tư thế đứng, 16 khung bước đi và 64 khung của bốn thức A. Dùng lại raster gốc M3D và phần khắc rồng từ ảnh nguồn của đòn Chọc. Tư thế đứng và bốn thức hướng phải khớp bản preview đã duyệt. Hướng trái của bốn thức dùng đối xứng của bộ đánh gốc. Hướng lên/xuống dùng các tư thế gốc riêng. Giữ gốc chân ở (192, 235) trên khung ảo 384×320, hiển thị ở tỉ lệ 0,5. Atlas ghi lại vị trí cắt alpha và đệm 2 px.

Tái xuất bằng Aseprite với thư mục làm việc tại gốc repo.

```powershell
& 'C:/Program Files/Aseprite/Aseprite.exe' -b --script-param "root=$((Get-Location).Path.Replace('\', '/'))" --script assets/source/cai-bang-bong-reach/export.lua
```

[Manifest SHA-256](../../exports/cai-bang-bong-reach/provenance.json)
