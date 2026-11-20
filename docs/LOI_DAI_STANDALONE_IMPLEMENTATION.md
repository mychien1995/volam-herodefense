# Lôi Đài độc lập — bản tích hợp

Worktree `wip/m3d/pvp`; phạm vi được người dùng yêu cầu ngày 2026-11-19. [Đặc tả](LOI_DAI_STANDALONE_SPEC.md) giữ các luật đã xác nhận; phần Lôi Đài trong Defense vẫn dùng luồng hiện có.

Cập nhật phản hồi hình ảnh: camera native/theo hero, bounds cả5map, form Practice, cỡ utility HUD, nhát chém giữ tỉ lệ và nhịp Độc Cô +20%. [Nguyên nhân và bằng chứng sửa](PVP_VISUAL_REPAIR.md).

## Luồng đã triển khai

Menu chính → Lôi Đài → tạo phòng/chọn map hoặc vào bằng mã/link `?pvp=<roomId>` → chia phe. Người mới luôn là khán giả; chọn đủ phái/hệ mới ready. Chủ phòng kéo thả hoặc dùng danh sách để chia Chính/Tà, tối đa 4 mỗi bên, tổng phòng tối đa 8, cho phép lệch quân số. Chỉ chủ phòng được sửa map, hiểm họa và bắt đầu.

Đội hình khóa trong ván. Đấu thủ cấp 30 với cả năm kỹ năng của hệ ở bậc tối đa, không trang bị/bình hoặc tiến trình Defense. Countdown 1→2→3 khóa input trên server. Hiệp 180 giây; hết người thua hiệp; cùng bị hạ hoặc hết giờ hòa và đánh lại không tính điểm. Phe đủ 3 thắng kết thúc ván rồi quay về chia phe. Người chết và người vào giữa ván chỉ xem. Đấu thủ mất kết nối/rời phòng khiến cả phe thua ván ngay; chủ phòng rời đóng phòng cho tất cả, không chuyển quyền hoặc reconnect.

Lịch sử giữ 30 lượt hạ gục mới nhất trong bộ nhớ phòng, không lưu assist/kết quả dài hạn. Hazard ghi nguồn Môi trường.

## Mặc định triển khai và thông số thử

Các mục còn mở ở mục 12 của đặc tả dùng mặc định sau để chạy được bản tích hợp; đây không phải xác nhận cân bằng của director:

- Tắt sát thương đồng đội; kỹ năng hỗ trợ dùng cho đồng đội hợp lệ.
- Reset đầy HP/mana, cooldown, trạng thái, triệu hồi và hiểm họa mỗi hiệp.
- Giữ buff/nội tại của bộ kỹ năng; không mang buff từ Defense vào.
- Chỉ đổi map/hiểm họa tại chia phe; giữ đội hình/phái sau ván.
- Chuyển hiệp 2 giây; thông báo kết thúc ván 4 giây. Người rời có thể vào lại bằng phiên mới với vai trò khán giả, không đảo ngược xử thua.
- Camera cố định thấy toàn bộ map; collision, điểm xuất hiện, nhịp và sát thương hazard nằm trong `packages/game-data/src/pvp.ts`.
- Phi tiêu mỗi 2,5 giây, tên lửa mỗi 4 giây, bay thẳng theo hướng chọn một lần. Phi tiêu không báo trước.
- Độc Cô Cầu Bại bất tử, đứng giữa: mỗi cặp hai chiêu được xáo thứ tự bằng RNG server; chém nửa map hoặc gọi sét nhiều điểm. Cả hai có cảnh báo 1,2 giây.
- Địa Ngục thu vùng an toàn trong 150 giây tới 20% bán kính; ngoài vùng nhận sát thương theo thời gian, vẫn được đi/lướt về.
- Không thêm hệ số sát thương PvP riêng. Mẫu mô phỏng 42 trận của 14 nhánh tại [báo cáo](evidence/sessions/pvp-headless/duels.json) giúp phát hiện bất thường, chưa phải kết luận cân bằng.

## Đồng bộ menu sau review · 2026-11-19

Đã chỉnh menu về cùng khung gỗ/nút xanh của Defense; nút riêng mở chung component chọn phái và popup hai hệ, xác nhận có ack server; checkbox sát nhãn, mô tả hiểm họa từng map; sửa font tiếng Việt ở thắng hiệp/ván. [Bản sửa và bằng chứng](PVP_MENU_REWORK.md).

## Server, protocol và giao diện

Protocol 47 thêm namespace room `loi_dai`, payload PvP có schema/sequence; room Defense từ chối lệnh PvP. `StandaloneLoiDaiRoom` tái sử dụng phép chiếu trạng thái/combat của `MatchRoom`, nhưng không chạy invasion, economy, dungeon, boss hay hồi sinh Defense. Mọi input di chuyển, chọn mục tiêu, va chạm, sát thương, RNG, thắng/thua đều do `StandaloneLoiDai` xử lý trong game-core độc lập Phaser/DOM/Colyseus. Các lệnh merchant/dungeon/preview/legacy duel bị chặn trong room mới.

Menu tạo/vào phòng, chia phe, cài đặt, HUD tỷ số/thời gian/người sống, countdown/kết quả, quan chiến, lịch sử và lỗi đóng/đầy phòng được triển khai. Dùng khung, chữ, portrait, icon và hotbar của game hiện tại. Gameplay có một viewport chủ đạo, tất cả overlay nằm trong viewport, không thêm dashboard bên ngoài.

## Artwork và nguồn

11 concept đã được người dùng duyệt; khóa byte tại `assets/approved_pvp_concepts.lock.json`. Hồng Mộc tái sử dụng asset hiện có; bốn map mới tách terrain/backdrop/foreground từ concept đã duyệt, có kiểm tra ghép lớp khớp pixel nguồn. NPC/VFX là các cel thực được tạo tiếp từ concept, không dùng một ảnh review làm atlas chuyển động.

`assets/source/pvp-v01/generation.json` lưu prompt/nguồn; `assets/exports/pvp/manifest.json` lưu hash, layer, pivot và clip. Có 44 PNG, 10 cel NPC/3 clip, 12 cel VFX, material dung nham; exporter `scripts/export-pvp.py`, chuẩn bị/hash guard `scripts/prepare-pvp.mjs`, validator `scripts/verify-pvp.py`. Graphics chỉ dùng clip mask hazard, không vẽ thay final art. Ảnh game và quan sát frame được ghi bằng PNG/JSON; không tạo recording.

Duyệt concept của người dùng không tự biến thành duyệt cuối cho các cel sản xuất hoặc bản render tích hợp; trường runtime approval vẫn để false, có ảnh chạy thật để review.

## Kiểm chứng

Các ca tự động nằm tại `tests/standalone-loi-dai.test.ts`, `tests/standalone-loi-dai-room.test.ts`, `tests/e2e/standalone-pvp.spec.ts`. Chúng kiểm tra giới hạn/quyền/ready/khóa đội hình, chuẩn hóa cả 14 nhánh, combat thật, hòa/đánh lại/best-of-five, xử mất kết nối, môi trường/history và năm map.

Bộ browser dùng hai client Phaser cùng sáu peer SDK cho phòng đủ tám người, quan sát NPC/VFX theo tick, kiểm tra đóng phòng và lỗi console. Fixture điều khiển qua input/ack server; không gán HP/vị trí trong browser để làm bằng chứng combat. Mô phỏng unit có thể đặt trạng thái biên để kiểm tra timeout/cùng chết một cách xác định.

Kết quả ngày 2026-11-19 (giữ cả bằng chứng thất bại, không gọi một pipeline FAIL là PASS):

| Kiểm tra | Kết quả |
| --- | --- |
| `pnpm check:final --config playwright.standalone-pvp.config.ts` | Chuẩn bị asset, TypeScript, typecheck tools/tests và 18 workflow checks PASS; unit/integration 1.131 PASS, 4 FAIL do assertion cố định protocol 46. |
| `pnpm exec vitest run tests/m3d-nam-de-integration.test.ts tests/m3d-bac-cai-integration.test.ts tests/m3d-hell-integration.test.ts tests/m3d-kim-integration.test.ts` | Sau cập nhật fixture lên protocol 47: 4 file / 8 test PASS. Tổng 1.135 test duy nhất đã được xác nhận qua lượt đầy đủ và lượt chạy lại. Cơ chế boss không bị sửa. |
| `pnpm --filter @volam/game-client build` và `pnpm verify:assets` | PASS toàn bộ validator, gồm PvP; build còn cảnh báo chunk lớn hiện có. |
| `pnpm check:browser --config playwright.standalone-pvp.config.ts --grep "entry, link"` | PASS; tái biên dịch/build cuối sau sửa Escape, combat thật hai client, đồng bộ HP, khóa countdown, ready/chia phe/quyền, lịch sử, xử thua cả ván; console hai client đều rỗng. |
| `node tools/run-playwright.mjs test --config playwright.standalone-pvp.config.ts --grep "eight players"` | PASS; 8 thành viên / 4v4 trên cả 5 map, chặn người thứ 9, đổi map, hazard, đóng phòng. Quan sát đủ NPC frame 0–9 và cả 3 cel chém, 3 cel sét thực tế, tách biệt texture cảnh báo. |
| `pnpm exec tsc -p tsconfig.tools.json --noEmit`, `git diff --check` | PASS trong lượt kiểm tra cuối; không có recording. |

Lượt đầy đủ và các stage retry được giữ tại [final timings](evidence/sessions/pvp-final/check-workflow/final-timings.json), [stage retry](evidence/sessions/pvp-final/check-workflow/final-stage-retry.json), [browser sau sửa Escape](evidence/sessions/pvp-escape-final/check-workflow/browser-timings.json). Lượt retry dừng ở Escape trước khi sửa; lượt kiểm tra phía sau xác nhận bản sửa, không ghi đè lịch sử FAIL.

Ảnh chạy thật đã mở và đối chiếu reference ở zoom gameplay:

- [Chia phe](evidence/sessions/pvp-escape-final/standalone-pvp/lobby.png), [combat hai client](evidence/sessions/pvp-escape-final/standalone-pvp/two-client-combat.png), [console/room](evidence/sessions/pvp-escape-final/standalone-pvp/two-client.json).
- [Hồng Mộc](evidence/sessions/pvp-final-observed/standalone-pvp/hong_moc-eight.png), [Rừng Trúc](evidence/sessions/pvp-final-observed/standalone-pvp/rung_truc-eight.png), [Địa Ngục](evidence/sessions/pvp-final-observed/standalone-pvp/dia_nguc-eight.png), [Tương Dương](evidence/sessions/pvp-final-observed/standalone-pvp/tuong_duong-eight.png), [Kiếm Hồ](evidence/sessions/pvp-final-observed/standalone-pvp/kiem_ho-eight.png), [màn rộng](evidence/sessions/pvp-final-observed/standalone-pvp/kiem-ho-wide.png).
- [Quan sát đủ frame, hazard và state 8 người](evidence/sessions/pvp-final-observed/standalone-pvp/eight-player-frame-observations.json).

Hai lỗi được phát hiện và sửa trong runtime mới: đổi API tô màu viền phe sang Phaser 4 `setTintMode`, và cho Escape đóng overlay Lôi Đài trước hộp xác nhận Thoát. Ca NPC được tăng chất lượng: phải thấy đủ 10 cel và VFX phóng ra, không dùng riêng texture warning để tính là đã thấy sét.

**Cập nhật sau sửa ngày 2026-11-19:** Hai lỗi dưới đây đã được tái hiện, xác định nguyên nhân và xử lý trong cùng worktree. Lời dẫn sai hệ tọa độ camera; phòng mất ghế do watchdog WebSocket cắt khách sau khoảng trễ pong 9 giây. Lượt đầy đủ mới có 1.138 unit/integration PASS, các validator PASS; sau sửa fixture/preload đã chạy lại build và **5/5 ca browser PASS**, gồm Defense đầy đủ và phòng 8 người trên cả 5 map. Không có socket terminate hoặc close 1006 ở lượt browser cuối. Xem [nguyên nhân, phạm vi và bằng chứng](PVP_DEFENSE_REGRESSION_REPAIR.md), [nghiệm thu mới](evidence/sessions/pvp-repair-browser-final/acceptance.json). Các đoạn tiếp theo là ghi nhận lịch sử trước bản sửa, không phải lỗi còn tồn tại đã biết.

Một lượt mở rộng từng quan sát phòng 7 người sau chuyển map; chưa có đủ state để xác định thành viên/nguyên nhân rời. Đã thêm diagnostic membership/presentation/lifecycle trên lỗi, giữ lượt thất bại và chạy lại thành công đủ 8 trên cả 5 map. Không che việc rời phòng bằng tự reconnect hoặc đổi luật xử thua. Chưa coi đây là kiểm chứng soak dài hạn.

Smoke Defense `two clients agree on combat, manual cadence, skills and progression` chưa PASS: dừng tại assertion lời dẫn Tượng Võ Thần, trước combat. Đã thử helper lobby có ack và quan sát lời dẫn đồng thời; diagnostic vẫn trả chuỗi rỗng. [State/scene chẩn đoán](evidence/sessions/pvp-defense-observed/opening-diagnostic.json). Đoạn render lời dẫn không đổi trong diff này; chưa chạy baseline riêng để quy nguyên nhân. Các thử nghiệm sửa fixture đã được hoàn nguyên, không sửa Defense để vượt assertion ngoài phạm vi Lôi Đài.

`node tools/run-playwright.mjs test tests/e2e/gameplay.spec.ts --grep "Cai Bang Bong keeps|ranged projectile"`: **2 PASS, 56,6 giây** trên build cuối; combat đồng bộ hai máy khách và projectile bay thẳng dùng frame thật. Đây không thay thế assertion lời dẫn đang thất bại ở smoke khác.

[Tổng hợp nghiệm thu dạng JSON](evidence/sessions/pvp-final/acceptance.json) phân biệt rõ các stage PASS, các lượt FAIL và giới hạn. Không merge/deploy hoặc thay đổi tài liệu tuning thành quyết định cân bằng đã duyệt.

