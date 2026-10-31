# Kế hoạch sprite/atlas sau duyệt

**CONCEPT_PENDING_REVIEW. Production chưa được cấp phép ở lượt này.**

[production_plan.json](production_plan.json) có **34 đề xuất**: Cái Bang 9, Thiên Sơn 11, Võ Đang 7, Thiếu Lâm 7. Mỗi đề xuất tách character/VFX, kê phase, facing, pivot/origin/scale, loop hoặc one-shot, metadata cũ có thể tham chiếu và tên source/export revision dự kiến. Không phải manifest cho runtime loader.

| Nhóm | Sprite/atlas cần sản xuất sau duyệt |
|---|---|
| Cái Bang A | Character4 nhịp ×4 facing; bốn contact/trail; A6 character accent và small dragon release/travel/impact/end. |
| Cái Bang Chưởng | Hỏa Vân character +3 tia/impact; Hàng Long song chưởng +gather/body travel/head impact/tail ending. |
| Cái Bang Bổng skill | Sweep/ground slam/pull/dash/spin-finish character; orbit trước/sau, fracture/armor-break, long trảo extend/retract, trail/impact, fire-dog gallop/orbit/finisher/end. |
| Thiên Sơn Quạt | Throw/empty-hand/return/catch; fan outbound/turn/return/hai contacts; Liên Hoa rapid loop; protective spin/deflection; dash crossing contact; Chiết Mai activation/wrist/heel loop; storm loop +8 hướng fan travel/impact/end. |
| Thiên Sơn Đao | A chém xa nối pose; dash và lateral dodge/phase/afterimage; twin-stream travel/impact/slow; wide flurry loop/terminal finisher/end. |
| Võ Đang Quyền | Left/right character; Yin-Yang orb; dark-core Huyền Âm wave; white qi palm; release/travel/impact/end riêng. |
| Võ Đang phòng thủ | Mana guard ON/LOOP/ABSORB/OFF/EMPTY_MANA/END; formation activation/ground loop/inward border response/pulse/ending. Không vẽ freeze pose cho caster khi shield đang loop. |
| Võ Đang Kiếm | SlashA/SlashB liên kết, bốn facing; hai ribbon/contact/end. |
| Thiếu Lâm Quyền | Left/right character; La Hán fist, Vi Đà pillar, Đại Lực palm: mỗi skill normal +empowered release/impact/ending riêng. |
| Thiếu Lâm Đao/nội tại | A dao heavy cut, Tru Tà main/echo/splash/end; recovery-mote loop riêng, reuse idle không tạo active cast. |

## Pivot và hướng

- Baseline down/left/right/up giữ origin(0.5,0.8), scale1 và body khoảng44 logical px:80×80feet(40,64); Kiếm Võ Đang96×80feet(48,64); Đao Thiếu Lâm112×80feet(56,64).
- Skill character Thiếu Lâm retained128×120feet(64,96). Giữ anchor/scale này nếu sửa từ source đó; không lấy canvas size làm body size.
- VFX retained phải đọc đúng origin/pivot/offset **từng tag** từ metadata ghi ở inventory. Pivot cấp component trong plan là điểm khởi đầu, không ghi đè per-tag origin/placement. Ground formation neo tâm world cố định; owner aura theo feet; travel neo projectile; impact neo contact được xác nhận.
- Phase mới dùng canvas có padding đủ rộng nhưng giữ density/body scale. Nếu80px không đủ staff/sword, tạo sibling canvas rộng và pivot tương ứng; không shrink hero cho vừa ô.
- Fan tám hướng cần tám hướng VFX riêng; character vẫn bốn facing. Chó lửa cần chân/dáng chạy thật và layer orbit trước/sau, không quay một hình đứng yên quanh caster. Tàn ảnh dùng pose đã vẽ đúng direction; không xoay nhân vật để giả facing.
- Các pose trên concept chủ yếu hướng phải. **Chưa có frame bốn hướng mới**; danh sách này là scope production, không phải chứng nhận đã hoàn thành.

## Source và xuất bản sau duyệt

Mỗi nhóm cần source raster chỉnh sửa được với layer character/weapon/trails/contact/ground riêng khi phù hợp; PNG alpha thật, atlas JSON-hash và animation metadata có ordered frames, direction, pivot, duration và loop. Đường dẫn revision dự kiến trong JSON không tồn tại ở lượt concept này.

Không dùng flattened concept làm source animation hoặc upscale portrait thành sprite. Khi chưa có layer gốc thì phải nói rõ: PNG của lượt này là concept phẳng, không phải Aseprite source có semantic layers.

Sau tích hợp, kiểm tra thật tất cả frame/hướng/timing/chuyển động/weapon continuity, foot pivot/feet depth, cancel/ending và normal-zoom multiplayer readability. Server event/state quyết định contact, absorb, status và cleanup; cadence art không gây damage hoặc quyết định cooldown. Final art approval chỉ sau kiểm tra Phaser và director duyệt riêng. Không tạo GIF/video.
