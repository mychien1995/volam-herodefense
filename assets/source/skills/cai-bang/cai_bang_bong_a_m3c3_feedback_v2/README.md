# Cái Bang Bổng combo v2 — source và provenance

**Concept direction approved; PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW.** Production chỉ bộ mẫu bốn nhịp Bổng, chưa bulk các bộ khác.

Review/deliverables: [review index](../../../../reviews/skills/cai-bang-bong-combo-v2/README.md).
Approval evidence: [concept_approval_evidence.json](concept_approval_evidence.json).
File hashes/source selection: [production_manifest.json](production_manifest.json).

## Source chỉnh sửa được

- `cai_bang_bong_combo_v2_character.aseprite`:96 RGBA cels,16 tags,112×100,feet(56,80), một editable layer chứa character+bổng.
- `cai_bang_bong_combo_v2_vfx.aseprite`:96 RGBA cels,16 tags,160×160,anchor(80,80), layer VFX riêng.
- [Prompt đầy đủ](generation_prompts.json), [generator file/source selection](generation_records.json).
- [Source alpha components](source_components.json), [character layout](frame_layout.json), [VFX layout/offsets/transforms](vfx_layout.json), [palette mapping](palette_mapping.json).
- [Protected art snapshot](protected_art_snapshot.json) chỉ đọc, không thay approval lock.

Đây là raster cels chỉnh sửa được. Không có claim source semantic tay/áo/bổng được phục hồi từ các PNG phẳng. Các PNG raw trong `generated/` là **pose/VFX mới được vẽ cho animation production**, không phải crop từ concept sheet. `character_right_v01.png` là nháp; right v02 giữ sweep/rising/overhead; strip thrust v03 sửa đòn chọc; front/back riêng; left mirror right.

Original AI-assisted raster bằng **OpenAI built-in image_gen.imagegen**, true-alpha request. Source được đo connected-alpha runs, loại low-alpha haze, thu bằng scale cố định per strip, căn feet và palette192 màu từ approved baseline trong Aseprite. Không có geometry-generated character/VFX; thao tác flip/quarter-turn được ghi rõ trong layout, không thay frame-by-frame pose bằng bob/rotate một hình đứng.

Reference input là approved baseline atlas và concept đã được director duyệt hướng. Không import third-party sprite pack; không claim human hand-pixelled authorship hay exclusive copyright. Quyền sở hữu của director-supplied reference nguyên thủy chưa được xác minh độc lập; không copy reference pixels vào atlas.

## Export từ source đã sửa

Cần Aseprite1.3.18.6-x64 hiện có; runtime tương lai chỉ cần PNG/JSON committed.

```powershell
python -u -X utf8 assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/tools/export_sample.py
python -u -X utf8 assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/tools/build_reviews.py
python -u -X utf8 assets/source/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2/tools/verify_sample.py
```

Default export đọc **source Aseprite hiện tại**, giữ artist edits; xuất atlas PNG/hashJSON+metadata, rồi PNG frame riêng từ atlas. Không chạy asset preparation hoặc đăng ký runtime.

`--kind character` hoặc `--kind vfx` giới hạn component. `--assemble` chỉ dùng khi cố ý dựng lại source từ generated pixels/layout; nó ghi lại source v2 này và sẽ mất sửa raster bằng tay. Không dùng sau khi source đã được director duyệt/artist chỉnh mà chưa chủ động muốn rebuild.

`tools/inspect_sources.py` ghi lại phép đo/scale/palette; nó không vẽ geometry. Sau khi đo lại, cần review các override chân/selection và layout VFX trước assemble. `source_components.json` giữ measured runs thực; `frame_layout.json` lưu16 handoff duplicate; generated alpha source retained đầy đủ.

## Các sửa được giữ lại

- Sửa row sweep từ các pose giống chọc sang xoay vai/hông, overhead contact sang bổ thẳng.
- Thrust correctionv03giữ rear shaft rõ hơn; không lấy still idle để trượt.
- Up overhead chọn crouched slam contact rồi rebound, bỏ cel raised-shaft mơ hồ.
- Palette pass đầu chọn tần suất RGB sai làm mất đỏ; đã sửa bằng median-cut. PNG review lỗi được giữ với prefix `rejected_palette_`, không phải delivery.
- VFX canvas thêm padding160; fixed per-beat scales giảm che mặt, không đổi character body scale.
- Needle up/down đượcquarter-turn chính xác; ground ellipse dùng bản vẽ riêng nên không đứng dọc.

Không code Phaser/game logic, không global asset mapping, không approved bytes bị thay. Không GIF/video. Cần runtime integration và director final-art review riêng.
