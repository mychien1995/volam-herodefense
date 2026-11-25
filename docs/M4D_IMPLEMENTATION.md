Latest VTD follow-up, protocol53: [28 stars, moving light and Thất Tuyệt practice](M4D_VTD_FOLLOW_UP_2026_11_25.md).

Current boss follow-up: [arena registration, skill tuning and phase-two test](M4D_BOSS_FIXES_2026_11_25.md).

Current difficulty/protocol 52 and boss test launch: [M4D_DIFFICULTY.md](M4D_DIFFICULTY.md).

Latest arena/cooldown follow-up: [R3 native ground surfaces and anchored torches](M4D_ARENA_REVIEW_R3.md).

R2 arena feedback: [shared prop collision, create-room modal, registered lanes, sharp ground and ambient motion](M4D_ARENA_REVIEW_R2.md). This follow-up supersedes the initial M4D arena presentation below.

# M4D — triển khai improvement và ba arena

Baseline: `milestone/m4d` từ M3D commit `646657ff717bf6d829c460e78628c45902fade78`. Người dùng chọn DH-B, TD-B, TH-B ngày 2026-11-25, sau khi bỏ quầy shop và cổng phó bản khỏi concept. Đây là override M4D cho các mục bên dưới; không gộp migration inventory-v2.

## Hành vi đã triển khai

| Mục | Kết quả |
| --- | --- |
| Creep xâm lăng | Hai hàng cách nhau 36 world units tại mỗi cổng, gấp đôi số lượng; giữ snapshot scaling, stream 60s và tổng EXP/vàng mỗi wave |
| Nhịp trận | Bắt đầu wave mỗi 120s, giữ báo trước 60s/15s; boss theo mốc wave cũ; floor dungeon tăng mỗi 600s |
| Arena | Đào Hoa Đảo/DH-B mặc định, Tương Dương/TD-B, Tụ Hiền Trang/TH-B; host chọn lúc tạo room, server validate và đồng bộ cho peer/late join |
| Hồ sen | Nước chặn di chuyển; đảo và bốn cầu có đường đi server. Prediction dùng cùng collision. Combat collision tách khỏi mặt nước để đạn thẳng vẫn bay qua |
| Boss wave scenery | Cả tượng và hai đèn cạnh tượng ẩn trong boss wave; shadow/glow theo visibility của nguồn |
| Boss provocation | Chín controller và đệ tử Kim Luân chờ sát thương player đầu tiên, mở giao chiến cả đội; vẫn đi vào sân, trước đó không cast/đánh/triệu hồi/hiểm họa riêng. Retry tạo actor chưa provoked |
| Creep chết | Giữ native renovated source/scale/pivot cho death thay vì fallback về bộ cũ; corpse không nhân alpha lặp gây mờ |
| Hố cát | Gỡ cả chặn Shift theo vị trí lẫn dash_lock do quicksand; vẫn giữ slow và CC/vật cản khác |
| Status | Bỏ chữ CC dưới tên, dùng icon authored trên đầu; stun có ba sao orbit. Tối đa ba loại theo ưu tiên; cleanup theo state/zone/death/expiry. Buff và VFX phái đang có được tái dùng |
| Giày | Bỏ input/handler/HUD Z, đổi nhánh thành Thanh Tâm/cleanse, Tốc hành/haste và Phùng Xuân/spring |

Thanh Tâm tự xóa debuff thông thường đang có (gồm stun và DOT thông thường) khi nhận hiệu ứng xấu đầu tiên lúc sẵn sàng, hồi 30s. Không miễn nhiễm sau đó, không gỡ cơ chế boss riêng. Tốc hành thêm hai charge tối đa và đúng hai slot charge mới khi craft, cộng dồn Đường Môn Ám Khí, giữ nợ hồi hiện tại. Phùng Xuân: 10% cơ hội sau một hit thực mất >5% HP tối đa, hồi 10% HP tối đa, CD 30s chỉ khi kích hoạt thành công, không hồi sinh từ lethal hit. Giá/nguyên liệu/stats giày giữ hợp đồng M3D.

Protocol **49**; cần client/server cùng bản và phòng mới.

## Arena được tách lớp, không dùng nguyên concept làm nền game

Nguồn: [generation/prompts](../assets/source/m4d-arena-v01/generation.json). Xuất: [manifest và hashes](../assets/exports/m4d/manifest.json).

- Ba ground underlay riêng, không chứa tượng, shop hay cổng phó bản; fit đồng nhất hai trục vào world 1600×1152, giữ camera/hero scale M3D.
- Mười hai prop alpha độc lập: đào lớn/nhỏ, đình, vườn đá; cổng thành, tháp canh, trại, chiến kỳ; liễu, chính đường, đình hồ và lan can cầu. Bóc bằng measured crop boxes, không cắt theo grid khi cành/mái vượt ô; giữ mép alpha và foot anchor.
- Tượng, hai đèn và các nguồn sprite nhân vật M3D được tái dùng nguyên byte. Prop mới scale đồng nhất và Y-sort theo chân.
- Giữ WorldDepthEffects/WorldDepthShadows, bổ sung night profile/ambient mask/local emission. Chặn bộ terrain sampler M3D cũ ghi đè nền mới.
- Mười hai icon trạng thái riêng; bộ v01 bị cảnh báo cell edge/dropped components đã được thay bằng v02 có gutter rộng và giữ các thành phần rời. Bốn pack đang dùng đều PASS, zero warnings. Bản lỗi giữ dưới source/rejected-status-export-v01, không phải runtime art.
- Đã đối chiếu reference arena hiện hành và nguồn statue/actor M3D. Lát cắt DH-B hai client được chạy trước khi mở rộng hai bộ prop còn lại.

Concept B đã được người dùng chọn. **Art trong game vẫn chờ director xem duyệt cuối**; integration/test PASS không tự cấp art approval.

## Kiểm chứng tập trung

- TypeScript project build và typecheck tests/tools đã qua trong quá trình tích hợp.
- Bộ focused cuối: **13 files / 96 tests PASS** gồm M4D, chín boss, crafting, invasions, room/economy/protocol, creep presentation, desert, movement và navigation. M4D được chạy lại 21/21 sau khi mở rộng assert đường từ đủ bốn cổng qua nước/tượng.
- `python scripts/verify-m4d-art.py`: PASS — 3 ground, 24 alpha prop/icon, 4 pack sạch, source/export hashes và pivots/bounds.
- `pnpm --filter @volam/game-server exec tsx ../../tools/m4d-balance.ts`: đo lịch spawn và proc thật, ba seed; [kết quả gọn](evidence/m4d/balance.json). Phòng một người/bốn cổng: 120→240 quái/wave; sáu người/bốn cổng: 480→960. Tổng thưởng/wave giữ nguyên. Tần suất xuất hiện theo phút gấp ba. Spring: 95/96/84 proc trên 1.000 hit đủ điều kiện ở seed 17/41/89.
- Navigation grid cache theo geometry/radius giúp giảm tính lại va chạm của nhiều creep; cache bounded 32 entries, kiểm tra thay đổi wall và bounds riêng từng query.
- Production `check:browser --config playwright.m4d.config.ts`: **3/3 PASS**, gồm phòng sáu client TH. Thêm ảnh TH sạch **1/1 PASS** và hai luồng campaign dungeon/wave death → revive → vote → retry đã qua; ca wave được chạy lại riêng sau khi sửa giả định đồng hồ hồi sinh trong test. [Lệnh, kết quả và giới hạn](evidence/m4d/verification.json).
- Ảnh ở gameplay zoom: [DH-B](evidence/m4d/dh-b-slice.png), [TD-B](evidence/m4d/td-b-night.png), [TH-B sạch](evidence/m4d/th-b-clean.png), [TH sáu người](evidence/m4d/th-b-six-player.png). Ảnh campaign M4D nằm ở evidence/m4d-campaign; evidence M3D cũ giữ nguyên bytes.

Theo yêu cầu mới nhất chỉ chạy kiểm tra cần thiết, dùng focused Vitest + typechecks + asset validator M4D + `check:browser --config playwright.m4d.config.ts`; không chạy full school/VFX suite của `check:final`.

## Phạm vi và giới hạn QA

Phòng hai client DH/TD kiểm tra shading, props, movement/arena sync và overhead stars. Phòng sáu client TH kiểm tra bờ/cầu, spawn hai hàng, death source/scale và statue cluster/boss first hit. Fixture chỉ đặt tiền đề hợp lệ; riêng target hình chết đứng yên/1 HP và player được bảo vệ để đòn thật từ keyboard tạo HP0. Tượng trong fixture art được bảo vệ vì sáu peer đứng xem không phòng thủ; không coi đây là phép đo sống sót của tượng. Status fixture kiểm tra renderer riêng; core tests kiểm tra status/cleanse/damage pipeline.

Không có video/GIF/trace stream, không nhận đã chơi hết 20 wave hoặc campaign với người thật. Không tự đổi HP tượng/giá/thưởng để bù áp lực mới. QA thất bại trước đó (fixture middleware, expected one-row counts, thiếu thời gian tải sáu client, tượng bị phá trước đòn kiểm tra) được ghi trong verification, không gộp thành PASS.

PvP1v1 follow-up: [profile chiến đấu riêng, toàn bộ tuning đã được yêu cầu và hồi quy PvE](PVP_1V1_BALANCE.md), triển khai trên `wip/m4d/pvp` từ baseline M4D `82ddf8e0`.
