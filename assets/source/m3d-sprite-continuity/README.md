# Sprite M3D ở mật độ màn hình gốc

Bổng dùng lại ảnh nguồn ImageGen của Bổng combo và 64 tư thế đã căn chân trong exporter gốc. Trúc Xà và Độc Chu dùng lại 32 tư thế mỗi loại từ bộ nguồn Rừng Trúc. Điểm neo và thứ tự cel lấy từ dữ liệu gốc. Phun độc dùng các tư thế hàm mở của Trúc Xà trên nhịp chuẩn bị và nhả độc của server. Hiệu ứng độc và tơ được xuất lại từ các ô ảnh nguồn đã lưu.

Xuất bằng `python -X utf8 assets/source/m3d-sprite-continuity/export.py`. Cần Aseprite, Pillow và NumPy. Biến `ASEPRITE` có thể trỏ đến Aseprite ngoài đường dẫn mặc định của repo. Aseprite giữ các cel RGBA và điểm neo chỉnh sửa được. Bản runtime cắt khoảng trong suốt với gutter 2 px và giữ nguyên kích thước khung ảo. Tỷ lệ trong Phaser là 0,5 ở camera 2×.

Nguồn AI-assisted nguyên bản của dự án và SHA-256 của các đầu vào, đầu ra được ghi trong [manifest](../../exports/m3d-sprite-continuity/provenance.json).
