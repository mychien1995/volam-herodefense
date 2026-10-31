# Bamboo Forest — tích hợp candidate sprite/VFX vào Phaser 4

Phạm vi: nối bộ artwork đã có vào loader, registry, `ArenaScene`, playback và effect renderer chung. Không tạo/export lại artwork, không thay AI, abilities, damage, status, spawn/wave composition, balance, collision, RNG hay loot. Môi trường Bamboo vẫn **approved**; sáu creep/VFX vẫn **candidate**, chưa được director duyệt.

## Kết quả và giới hạn quan trọng

Client đã có đường render cho sáu `archetypeId` dưới đây. **Chưa có loài mới nào được đưa vào wave Forest thường:** `packages/game-data/src/dungeon.ts` không khai báo `creepDungeon.creepRoster`. Cơ chế `DungeonMatch.assignRoster()` hiện chỉ được cấp roster cho Desert. Batch artwork là dữ liệu trình bày, không phải dữ liệu phân bố spawn được phê duyệt, nên lần tích hợp này không tự thêm roster hoặc suy loài từ wave/entity ID.

Kiểm tra dùng hai lớp, có ghi nhãn riêng:

1. `/forest-creep-review.html?players=2&vfx=1` dùng snapshot review không kết nối room, nhưng **kế thừa chính `ArenaScene`** và dùng loader, registry, `CreepPlayback`, `ArenaCreepEffects` của game. Các điều khiển pose reset playback chỉ trong fixture này. Đủ 384 frame/120 clip và 112 frame/28 chuỗi VFX được quan sát ở mọi hướng.
2. `forest-creep-runtime.spec.ts` join room bằng client thật và vào Forest bằng UI hiện có. Trước fixture, creep vẫn placeholder. Vite test service gán hai archetype rõ ràng vào các entity hiện hữu và gửi event qua room Colyseus, dùng event sequence và `afterNextPatch` của room. Test này chứng minh truyền ID → renderer, VFX event/replay và lifecycle; **không chứng minh natural spawn, damage, rewards hoặc abilities của sáu loài**. Route fixture chỉ nằm trong Playwright global setup, không nằm trong server/protocol/ứng dụng production.

Profile cuối tách hai mục tiêu: review rendering dùng **sáu browser canvas**, còn room/event dùng **hai browser renderer + bốn SDK peer**, tổng sáu người kết nối, theo cách bố trí đã có trong Bamboo regression. Cả bốn SDK peer phải nhận đúng archetype cho mọi loài; cả hai renderer kiểm tra VFX và playback. Không gọi profile network này là sáu browser hoặc natural combat.

## Đường đi asset

`assets/sprites/creeps/dungeons/forest/forest_manifest_v01.json` + sáu manifest/PNG/atlas + `assets/effects/dungeons/forest/manifest.json`

→ `scripts/prepare-forest-creep-review.mjs` (được preparation chung gọi sẵn)

→ `apps/game-client/public/assets/forest_creep_review/`: giữ các bản copy review hiện có; bổ sung `pack.json` và `runtime-manifest.json`, không copy thêm artwork hoặc sửa source.

→ `preloadForestCreepArt()` / `registerForestCreepArt()` trong `forest-art.ts`, được `art.ts` gọi

→ `forestCreepArt()` chọn entry từ **server `archetypeId`** và đúng `forest_shared` / `forest_private_<id>`

→ `ArenaScene` dùng pivot, nearest sampling, Y-depth, HP presentation và `CreepPlayback` hiện có; `ArenaCreepEffects` dùng metadata VFX chung.

Manifest sản xuất gốc giữ nguyên trạng thái lịch sử `runtimeIntegrated=false`; kết quả adapter hiện tại được ghi riêng trong `docs/evidence/forest-creep-runtime-2026-10-31/integration.json`. Loader/renderer integrated và normal spawn integrated là hai trường riêng. Không sửa lịch sử production hoặc tự đổi director approval để phản ánh việc nối code.

Preparation kiểm tra sáu ID duy nhất và timing có trong atlas. Runtime registration kiểm tra frame thật tồn tại trước khi đăng ký. Rectangles lấy từ atlas được load thật, không suy grid. Adapter giữ durations từng frame; `frameRate:1000` là cấu hình đi cùng explicit `duration` theo Phaser 4.2.1, **không phải artwork chạy 1000fps**. Source giữ nguyên timing gốc: idle 350ms, walk 120ms, attack 100ms, hurt 140ms, death 170ms; effect 90ms/cel.

| Server archetypeId | Texture/animation prefix | Canvas | Ground pivot | Trạng thái wave thường |
| --- | --- | --- | --- | --- |
| `truc_xa` | `forest_truc_xa` | 144×128 | 72,106 | chưa có mapping spawn |
| `doc_chu` | `forest_doc_chu` | 144×128 | 72,106 | chưa có mapping spawn |
| `son_vien` | `forest_son_vien` | 144×128 | 72,106 | chưa có mapping spawn |
| `truc_lam_kiem_khach` | `forest_truc_lam_kiem_khach` | 144×128 | 72,106 | chưa có mapping spawn |
| `moc_linh` | `forest_moc_linh` | 144×128 | 72,106 | chưa có mapping spawn |
| `truc_yeu` | `forest_truc_yeu` | 192×128 | 96,106 | chưa có mapping spawn |

Scale 1; normalized origin `[0.5,0.828125]`. Không thay kích thước collision theo canvas. Unknown/missing type vẫn trả về placeholder, kể cả entity có tên hoặc wave trông giống một loài. Arena và Desert không chọn entry Forest. HUD phân biệt `candidate`, `placeholder`, hoặc `candidate + placeholder`; không nhận candidate là approved.

## Binding VFX và authoritative timing

Hiện chỉ hỗ trợ cue melee của `abilityId=creep_strike`. Event ID của room khử replay trong `ArenaScene`; state patch không tự phát lại VFX.

| Loài | Event đã nối | VFX |
| --- | --- | --- |
| Trúc Xà | hit | bite contact tại event x/y |
| Độc Chu | hit | fang contact tại event x/y |
| Sơn Viên | attack; hit | dust cue tại source; slam impact tại event x/y |
| Trúc Lâm Kiếm Khách | hit | sword contact tại event x/y + slash bốn hướng tại source |
| Mộc Linh | hit | wood impact tại event x/y |
| Trúc Yêu | hit | splinter impact tại event x/y + slash bốn hướng tại source |

15 sequence có binding melee; cả 28 sequence đều load/register và chạy trong controlled review. Hướng ưu tiên `event.fx/fy`, nếu thiếu dùng hướng từ snapshot source authoritative đã patch; room hiện gửi combat event `afterNextPatch`. Nếu source/type không còn trong snapshot thì không đoán loài. Ground/contact dùng origin và offset trong effect manifest, depth ground Y−1/contact Y+0.5. Các animation này chỉ biểu diễn kết quả/tín hiệu đã được server quyết định; cue `attack` không thiết lập một hit tick hay gameplay wind-up mới.

13 sequence còn lại chỉ review: venom release/flight/impact; poison impact và web flight/impact; dust burst/pebble scatter; sword leaf burst; root emergence/leaf burst/bark fragments; thorn flight. Không tự gán projectile art chỉ vì owner có archetype tương ứng. Cần contract authoritative riêng cho ability/phase, projectile owner/zone/direction/lifetime và contact event trước khi bind. Web/root/poison artwork không tạo status hay DOT. Hurt/death hiện dùng character clips; không có yêu cầu hoặc binding VFX hurt/death riêng.

One-shot bị hủy bằng animation-complete event. Effect có owner bị dọn khi owner chết/despawn/đổi zone; scene clear, disconnect, shutdown/destroy cũng dọn effect. Không có timer hit/damage trong renderer. Loop projectile chỉ chạy trong review với lifetime fixture 650ms hoặc hold có nhãn; chưa có lifecycle gameplay được gán cho các loop đó. Registry effect/played observations có phạm vi hữu hạn theo catalogue; completion history có giới hạn.

## Kiểm tra thực chạy

Evidence mới: `docs/evidence/forest-creep-runtime-2026-10-31/`. Không ghi đè evidence production batch trước đó. Chỉ PNG, observations và log; video/trace playback tắt.

- `pnpm check:quick tests/forest-creep-art.test.ts`: PASS, bốn test về type/zone/fallback, nhãn, timing/binding và playback độc lập.
- Static source/atlas/alpha/protected-hash checks: PASS. Validator mở rộng kiểm tra adapter, durations, origin/offset/placement và source hashes; ghi report mới trong evidence runtime.
- Hai-client shared-scene review: PASS, toàn bộ 384 character frames/120 clips và 112 effect frames/28 sequences. Nhìn PNG thực tế để so normal zoom, pivot, foreground và scale cạnh Cái Bang.
- Hai-client room/event fixture: PASS, 51.3s test / 53.5s browser invocation. Sáu type, bốn hướng, replay dedup, despawn/quit cleanup; browser errors rỗng. Đây là controlled server fixture, không phải natural combat.
- Các failure được giữ log: fixture snapshot ban đầu thiếu `defense` cho inspector chung; đã sửa tại fixture. Room UI join có lúc vượt timeout 5s trên máy đang tải; config review dùng timeout assertion 20s, không sửa networking hoặc gameplay. Log và PNG failure được giữ lại.
- Sau thay đổi implementation cuối, chạy `FOREST_REVIEW_PLAYERS=6 VOLAM_BAMBOO_EVIDENCE_DIR=docs/evidence/forest-creep-runtime-2026-10-31/bamboo-regression pnpm check:final --config playwright.forest-creeps.config.ts`. Kết quả được bổ sung sau khi command hoàn tất; không suy PASS từ các lần chạy cũ.

### Kết quả cuối

- `pnpm check:final --config playwright.forest-creeps.config.ts`: preparation, project + test/tool typechecks, **8 workflow tests**, **342 unit/integration tests / 29 files**, production build và **12 asset validators** đều PASS. Browser stage có **4 PASS / 1 FAIL**: Bamboo sáu người, hai bài dungeon thường và shared-scene review sáu browser đã qua; room/event test dùng sáu renderer bị timeout ở assertion tìm effect đang active trong cửa sổ 360ms. Log đầy đủ: `final-check.log`. Không gọi command này là một lần chạy xanh trọn vẹn.
- Giữ các stage thành công, sửa fixture quan sát transient trước khi gửi event, làm nóng frame trên tab được review và kiểm tra rời phòng thật sự (pregame hiện lại, actor/effect về 0). Sau khi sáu renderer vẫn khó lấy mẫu effect ngắn ổn định trên cùng máy, profile room/event tái sử dụng hai renderer + bốn SDK peer. Không kéo dài animation, sửa HP/damage hay đổi gameplay để test qua. Failure trước đó giữ ở `final-wire-retry.log` và PNG failure.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS sau sửa fixture cuối (`final-fixture-typecheck.log`).
- `FOREST_REVIEW_PLAYERS=6 node tools/run-playwright.mjs test --config playwright.forest-creeps.config.ts tests/e2e/forest-creep-runtime.spec.ts`: **PASS**, 53.6s test / 56.6s invocation (`final-network-six.log`). Hai renderer và bốn SDK peer nhận đủ sáu type, 24 tổ hợp type/hướng; replay không sinh effect trùng; owner despawn và disconnect khi effect active được cleanup. `wire-6/observations.json` ghi rõ browser/network/SDK count, controlled fixture, natural spawn=false và damage/rewards verified=false.
- Tổng coverage giữ lại: **5 browser scenarios đã PASS** qua final run và affected-stage retry. Không chạy lại 342 test/build/static suites chỉ để đổi báo cáo sang màu xanh; không có runtime implementation thay đổi sau final pipeline.
- `preserved-assets.json`: **634 file artwork Forest gốc và 60 file môi trường Bamboo approved không đổi byte**. Validator cũng giữ nguyên tám file Cái Bang đã duyệt. Không có artwork được tạo/export lại hoặc approval lock mới.

### PNG và quan sát trực quan

- `final-6/candidate-scale.png`, `candidate-attacks.png`, `depth-behind.png`, `depth-front.png`: renderer chung ở camera1×/display2×. Sáu hero scale reference và hai instance mỗi loài; pivot/Y-depth ổn định. Attack PNG sau completion thể hiện recovery, không tự chứng minh contact key pose.
- `final-6/aligned-*-held.png` và `candidate-vfx-held-contact.png`: đã mở PNG thực tế của cả sáu nhóm VFX. Đây là **controlled held frame**, tách khỏi các vòng/one-shot chạy tự do đã quan sát bằng event. Bụi/pebble nằm trên ground plane, web mảnh vẫn trong world, slash ngọc-trắng đúng hướng, root/splinter chịu foreground occlusion. Foliage/fence có thể che phần dưới Mộc Linh và Kiếm Khách như actor thường; không nâng depth để vẽ xuyên foreground. Wood/leaf màu gần nền cỏ vẫn là hạng mục readability cần director review, không tự tint hoặc sửa palette đã sản xuất.
- `wire-6/normal-renderer-controlled-types.png`: screenshot màn hình chơi với sáu network participants, candidate được cấp type bởi fixture và placeholder còn lại cùng nhãn trung thực. Không dùng ảnh này để nhận natural spawn/AI/damage của sáu loài đã hoàn tất.
- Browser error lists của các run PASS rỗng. Không ghi video/GIF/trace playback. Measured test duration trên máy chạy nhiều canvas không phải cam kết 60fps hoặc benchmark combat.

## File thuộc thay đổi này

- Mới: `apps/game-client/src/forest-creeps.ts`, `forest-art.ts`; `tests/forest-creep-art.test.ts`; `tests/e2e/forest-creep-runtime.spec.ts`; tài liệu/evidence runtime này.
- Sửa có giới hạn: `scripts/prepare-forest-creep-review.mjs`, `scripts/verify-forest-creeps.py`; `art.ts`, `arena-creeps.ts`, `arena-creep-effects.ts`, `arena-scene.ts`, `ui.ts`; `forest-creep-review.ts`; `tests/e2e/bamboo-setup.ts`, `forest-creep-review.spec.ts`; `playwright.forest-creeps.config.ts`.
- Không sửa code production game-core/game-data/game-protocol/game-server trong nhiệm vụ này. Những diff có sẵn của các phần đó thuộc công việc khác và được giữ nguyên. Không sửa hoặc duyệt lại source/PNG/atlas/manifest/approval lock artwork.

## Còn thiếu để bật trong wave thường

1. Dữ liệu phân bố Forest spawn/roster do người thiết kế xác nhận, cho server phát sáu `archetypeId` tương ứng. Không chọn mapping từ thứ tự nguồn artwork hoặc tự phân wave.
2. Contract event/phase/projectile cho các motif chưa bind; không suy mechanic từ hình.
3. Director approval cho candidate art và kiểm tra natural combat/readability khi roster authoritative thực sự tồn tại. Việc client đã tích hợp loader/renderer và test service cấp ID không thay thế các bước này.

Phiên bản đã kiểm tra: Phaser 4.2.1, Colyseus core 0.18.23 / SDK 0.18.8. Tham khảo API chính thức và đối chiếu implementation được cài: [Phaser AnimationState](https://docs.phaser.io/api-documentation/class/animations-animationstate), [LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin), [Colyseus State Sync](https://docs.colyseus.io/state).
