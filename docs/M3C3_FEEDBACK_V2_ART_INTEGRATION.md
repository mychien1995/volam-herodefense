# M3C3 feedback v2 — Phaser integration

Trạng thái: **INTEGRATED_PENDING_DIRECTOR_RUNTIME_APPROVAL**. Concept/bộ mẫu đã được duyệt hình ảnh; approval lock và trạng thái lịch sử của source art giữ nguyên. Báo cáo này ghi nhận tích hợp/kiểm tra runtime, không cấp duyệt art cuối.

## Phạm vi bàn giao

Client dùng 43 component được bàn giao cộng hai component character/VFX của mẫu Bổng đã duyệt: **45 component, 571 tag, 2.368 frame references**. Trong đó bốn batch mới có 2.176 frame/539 tag; 192 frame/32 tag còn lại thuộc mẫu Bổng. Count có cel tái sử dụng.

Không regenerate/export lại source `.aseprite`, sửa PNG/JSON gốc, gameplay/server combat hoặc approval lock. Không dùng concept/contact sheet/mockup làm texture. Không tạo GIF/video/trace playback.

| Batch | Frame / tag được chạy trên hai client | PNG thật từ Phaser |
|---|---:|---|
| Cái Bang, gồm mẫu Bổng | 676 / 134 | [Rồng lửa](evidence/m3c3-feedback-v2-runtime/01-cai-bang-dragon.png), [chó lửa](evidence/m3c3-feedback-v2-runtime/01-cai-bang-dogs.png) |
| Thiên Sơn | 742 / 177 | [Guard](evidence/m3c3-feedback-v2-runtime/02-thien-son-guard.png), [bão quạt](evidence/m3c3-feedback-v2-runtime/02-thien-son-storm.png), [đao khí](evidence/m3c3-feedback-v2-runtime/02-thien-son-blades.png) |
| Võ Đang | 488 / 112 | [Dương Khí](evidence/m3c3-feedback-v2-runtime/03-vo-dang-white-hand.png), [trận pháp](evidence/m3c3-feedback-v2-runtime/03-vo-dang-formation.png), [khiên](evidence/m3c3-feedback-v2-runtime/03-vo-dang-mana-guard.png), [cạn mana](evidence/m3c3-feedback-v2-runtime/03-vo-dang-mana-depleted.png) |
| Thiếu Lâm | 462 / 148 | [Empowered](evidence/m3c3-feedback-v2-runtime/04-thieu-lam-empowered.png), [Tru Tà](evidence/m3c3-feedback-v2-runtime/04-thieu-lam-tru-ta.png) |

Các PNG trên chụp match thật ở camera zoom1, viewport1280×720; có dummy server trong fixture thử skill. Các PNG mockup trong thư mục art delivery vẫn chỉ là ảnh ghép lịch sử. Frame gallery là fixture presentation chạy trong Phaser của hai client, tách khỏi bằng chứng hit/damage thật.

## Code và asset runtime

- `scripts/prepare-feedback-v2-art.mjs`: kiểm SHA source/export/metadata bàn giao, giữ thứ tự frame, duration, phase, contact marker, direction, origin và offset; sinh client-only registry JSON. `scripts/prepare-assets.mjs` gọi bước này.
- `scripts/prepare-feedback-v2-atlas.py`: đóng gói lại khoảng alpha của atlas vào bản runtime riêng dưới `apps/game-client/public/assets/feedback_v2_runtime/`. Giữ nguyên mọi pixel RGBA nhìn thấy, sourceSize và spriteSourceSize; không scale hay vẽ lại. Tổng pixel texture giảm từ115.353.004 xuống14.527.744; kiểm so sánh pixel nằm trong packing manifest và focused test.
- `apps/game-client/src/feedback-art.generated.json`, `feedback-art.ts`, `feedback-bindings.ts`: registry, resolver exact-tag trước direction suffix, mapping client-only.
- `apps/game-client/src/feedback-vfx.ts`: character pose, projectile, hit, ground, aura, afterimage, state lifetime và cleanup.
- `apps/game-client/src/skill-art-registry.ts`, `skill-vfx.ts`, `arena-scene.ts`: load PNG/hash-atlas thật, duration từng frame, thay đúng presentation cũ, pose token để restart trên A mới được server chấp nhận.
- `apps/game-client/src/main.ts`: bridge fixture chỉ bật bằng `debug=1&feedbackArtReview=1`; không gửi command hoặc sửa state. `apps/game-client/tsconfig.json` đưa generated JSON vào project.
- `apps/game-client/src/forest-creep-review.ts`: sửa riêng read-only camera inspection cho kiểu Phaser4 hiện cài; tính góc từ hai world points. Không thay artwork/gameplay của chat forest.
- QA: `playwright.feedback-v2.config.ts`, `tests/e2e/feedback-v2-setup.ts`, `tests/e2e/feedback-v2.spec.ts`, `tests/feedback-v2-art.test.ts`. `tests/e2e/m3c3.spec.ts` có đường evidence v2 và chọn skill v2 cho lượt sáu người khi bật env riêng; profile lịch sử giữ lựa chọn cũ.
- Audit: `scripts/report-feedback-v2-runtime.mjs`. [Danh sách file và SHA, mapping/atlas thực](evidence/m3c3-feedback-v2-runtime/integration-audit.json), [bảng skill/stage → component/tag đầy đủ](evidence/m3c3-feedback-v2-runtime/runtime-mapping.md).

Các file gameplay/core/server đang có thay đổi của chat khác không bị reset/revert. File mapping mới chỉ thuộc presentation của client.

## Quy tắc playback và layer

Phaser **4.2.1** được kiểm từ package cài thực tế và source `Animation.getFirstTick/getNextTick`, cùng tài liệu chính thức [animations](https://phaser.io/oss/docs/phaser/concepts/animations) / [loader](https://phaser.io/oss/docs/phaser/concepts/loader). Bản này dùng `AnimationFrame.duration` là độ trễ tuyệt đối; registry chuyển đúng `frameDurationsMs`, không dùng giả định cộng thêm duration của bản Phaser cũ. Playback dùng timeScale từng sprite, không sửa global animation hay server interval.

Character160×120 giữ foot pivot80,96/origin0.5,0.8/scale1. Bổng112×100 giữ pivot56,80. VFX thường256×256, anchor128,128; đọc offset từng tag. Projectile có presentation elevation20px như plane bay hiện tại, cộng offset metadata; không sửa vị trí collision server. Shadow hiện tại là đối tượng riêng, không thêm bóng bake. Character/ground depth theo chân/Y; camera không quay, không đổi ellipse trận pháp theo hướng đánh.

Server event/state tạo và kết thúc hiệu ứng. Confirmed hit phát impact ngay; contact markers chỉ dùng căn hình (ví dụ bắt đầu contact/recovery sau `strike`), không sinh hit hoặc damage. Các opening/loop/ending dùng sprite riêng với lifetime status/action/area/projectile; hết hiệu lực, chết, đổi zone, mất owner, defeat hoặc scene clear đều dọn presentation tương ứng. Hit đã xác nhận được phép hoàn tất one-shot ngắn dù caster vừa chết.

Đánh thường mới restart qua token của event, không khóa input. Bổng fit18ticks/600ms; Thiên Sơn base300ms, floor5ticks, fit lại từ cooldown còn lại nhận được; Võ Đang Quyền300ms/Kiếm400ms; Thiếu Lâm Quyền28ticks và Đao23ticks. A mới được server chấp nhận có thể cắt recovery cũ. Motion của skill khác phái giữ trang phục owner qua motion nền; chỉ hero đúng phái nhận body override mới, VFX vẫn dùng cho skill trộn phái.

## Mapping quan trọng

`{d}` dưới đây là down/left/right/up. Bảng audit liên kết ở trên liệt kê tên tag đã resolve cụ thể, kể cả các pha phụ.

| Skill / event | Asset / tag / điều kiện |
|---|---|
| Cái Bang Bổng A | `cai_bang_bong_combo_v2_{character,vfx}`: thrust→`combo_thrust_{d}`, sweep→`combo_sweep_{d}`, lift→`combo_rising_{d}`, smash→`combo_overhead_{d}`; giữ nguyên source |
| Chưởng A | `cai_bang_chuong_dragon_v2`: `chuong_sixth_cast_{d}`/`dragon_travel_{d}` chỉ stage `dragon`; năm đòn khác giữ body/projectile thường |
| Hỏa Vân / Hàng Long | `hoa_van_cast`/`hoa_van_travel` tạo từng projectile server riêng; `hang_long_hoa_vu_dragon_v2` cast/gather/release/travel/impact/ending |
| Hoành Tảo / Phá Giáp / Cầm Long / Truy Phong | `bong_controls_v2`: radial_sweep, slam, claw_extend→claw_retract theo control, dash_trail + dash_hit; không gắn stun cho Cầm Long |
| Thiên Hạ Vô Cẩu | `thien_ha_vo_cau_dogs_v2`: opening/whirl/ending, bốn dog_run cosmetic theo channel, final_smash theo finisher; không tạo summon |
| Phiến A | `thien_son_fan_v2`: throw, outbound/return theo server leg, outbound_hit/return_hit theo confirmed hits, catch ưu tiên thấp hơn A mới |
| Bách Phiến | cast/whirl + storm opening/loop/ending; mỗi burst dùng tám `storm_fan_*` heading độc lập theo projectile server |
| Liên Hoa / Lục Dương / Lưu Phong / Chiết Mai | `thien_son_wind_actions_v2`: rapid/sustain, spin/guard, dash trail/crossed_hit, plum opening/loop/ending; guard chỉ trong active channel |
| Đao Thiên Sơn | `thien_son_dao_v2`: basic/basic_cut, dash/counter, qi_blade/slow_contact, flurry/finisher; moving_ghost và immunity motion bám **dash_guard** server từng tick, không bám counter |
| Võ Đang A | `vo_dang_hands_v2`: left_palm/right_palm theo stage; sword_cut_1/2 là nhịp hình ảnh luân phiên trên accepted A, không thay proc server |
| Lưỡng Nghi / Huyền Âm / Dương Khí | cast/release/travel/impact/end riêng trong `vo_dang_hands_v2`; mana_refund chỉ theo `refund` thật |
| Thái Cực Thần Công | `vo_dang_shield_formation_v2_aura`: mana_opening, mana_loop, mana_absorb, mana_off, mana_depleted. Mana0 dừng shell dù status toggle còn tồn tại; hồi MP thì theo lại state thật, không biểu diễn bất tử |
| Thái Cực Trận | ground formation_opening/loop/ending; inward_response thay tạm cùng sprite viền, không chồng viền/cage/stun |
| Thiếu Lâm A | `thieu_lam_hands_combo_v2_character`: left_fist/right_fist theo stage; basic_contact riêng |
| La Hán / Vi Đà / Đại Lực | motion `<skill>_{normal,empowered}_{d}` và aura/impact/ending tương ứng; empowered chỉ từ server pulse/hit stage. Đại Lực giữ anticipation tới `strike`; hit không đợi animation |
| Thiếu Lâm Đao / Tru Tà | `thieu_lam_dao_v2`: basic/tru_ta body; release→contact→ending tách khỏi ground hit |
| Dịch Cân Kinh | gentle_regen opening/loop/ending khi HP authoritative tăng và build có hpRegen; không tạo heal hoặc tự cộng HP |

## Kiểm tra và giới hạn bằng chứng

Lượt từng batch đã chạy qua `pnpm check:browser --config playwright.feedback-v2.config.ts --project feedback-v2-preview --grep '<phái>'`. Cái Bang57,6s; Thiên Sơn51,8s; Võ Đang52,8s; Thiếu Lâm48,8s trong browser test. Đây là fixture legacy skills/dev loadout, server vẫn quyết định hit/cooldown/mana. Không trình bày các fixture này như một trận progression tự nhiên.

Các lỗi lặp được giữ lại trong evidence: fixture A ban đầu đọc cooldown cũ trước ack; resolver `storm_fan_down/up` từng chọn suffix chéo; test combo Thiếu Lâm từng bấm E lúc cooldown chưa hết. Đã sửa đúng nguyên nhân; không nới assertion combat. Lượt final đầu dừng ở NodeNext JSON import attribute; import đã sửa trước lượt final tiếp theo.

Kết quả cuối: **8/8 browser gate chính PASS**, cộng **1/1 lifecycle gate PASS**. Typecheck, 8 workflow checks, 338 unit/integration tests, production build và 12 validator asset đều PASS. Audit cuối kiểm **2.716 file art/source/lock không đổi hash**, 45 runtime component lossless và 178 dòng mapping skill/stage.

Không gộp sai exit code: lệnh `check:final` dưới đây kết thúc exit1 do hai lỗi fixture browser; các stage unit/build/asset đã qua. Sau sửa **chỉ fixture**, chạy lại đúng hai bài lỗi và typecheck tools: cả hai PASS; giữ kết quả sáu người và các gate đã qua theo workflow repo. Sau đó bổ sung riêng lifecycle gate. Không thay runtime/art/mechanic sau lượt final này.

| Lệnh thực chạy | Kết quả / evidence |
|---|---|
| `pnpm check:final --config playwright.feedback-v2.config.ts --grep 'feedback v2\|normal four-school\|six-player natural combat\|two clients agree\|ranged projectile'` | Typecheck/workflow338-tests/build/12-validators PASS; browser6PASS/2FAIL fixture. [Log đầy đủ](evidence/m3c3-feedback-v2-runtime/final-check-cadence-and-facing.log), [JSON8case](evidence/m3c3-feedback-v2-runtime/final-cadence-browser-results.json) |
| `node tools/run-playwright.mjs test --config playwright.feedback-v2.config.ts --grep 'Thiên Sơn\|normal four-school'` | 2PASS, 2,9phút. [Log](evidence/m3c3-feedback-v2-runtime/focused-fixture-rerun.log), [JSON](evidence/m3c3-feedback-v2-runtime/focused-fixed-browser-results.json) |
| `pnpm exec tsc -p tsconfig.tools.json --noEmit` | exit0 sau sửa fixture và sau bổ sung lifecycle |
| `node tools/run-playwright.mjs test --config playwright.feedback-v2.config.ts --project feedback-v2-preview --grep lifecycle` | 1PASS, 51,2s trong test: hết buff→ending, sát thương thật giết owner khi buff đang bật, death pose/cleanup, auto respawn, đổi zone bằng menu. [Log](evidence/m3c3-feedback-v2-runtime/lifecycle-check.log), [observations](evidence/m3c3-feedback-v2-runtime/05-lifecycle-observations.json) |
| `pnpm --filter @volam/game-server exec tsx ../../scripts/report-feedback-v2-runtime.mjs` | exit0; lấy binding từ code thực, resolve tag, hash art gốc, pixel-preserving pack và tổng hợp từng case cuối. Dùng tsx đã cài tại server package, không thêm dependency |

Fixture service dùng Vite client và server thật; production build được kiểm riêng trong pipeline. Normal profile bật historical practice creeps, invasion interval30s/statue100.000HP cho test; hero stats/damage/cooldown/XP vẫn từ game server. Preview profile bật legacy skills/dev loadout. Không coi đây là full180s-wave endurance test.

Natural sáu người PASS trong213,1s: XP lần lượt **22/22/82/10/22/82**, cả sáu có thưởng thật; error arrays rỗng, camera zoom1/rotation0, origin0.5/0.8, scale1 và depth theo feet cho đủ sáu actor. Gentle regen opening/loop/ending đã được quan sát trong trận thật. [Combat contact1920](evidence/m3c3-feedback-v2-runtime/six-player-natural-contact-1920.png), [readability1280](evidence/m3c3-feedback-v2-runtime/six-player-combat-1280.png), [readability1920](evidence/m3c3-feedback-v2-runtime/six-player-combat-1920.png), [state/observations](evidence/m3c3-feedback-v2-runtime/six-player-observations.json).

Quan sát PNG: khi đứng giãn cách, sáu body/feet và palette phái phân biệt được. Trong dungeon cố tình đứng sát, các lớp VFX hợp lệ của nhiều owner che một phần mặt/chân; giữ PNG này để director đánh giá, không tuyên bố crowd-readability hoàn hảo hay60FPS. Mỗi batch kết thúc có0 persistent/projectile/transient/pose v2 trên cả caster và observer; lỗi browser/network rỗng.

Các lượt natural đầu không được ghi PASS: nhóm đi vào/tiếp cận lần lượt; snapshot tiếp theo chứng minh Võ Đang/Thiếu Lâm đánh sai facing và không có hit/XP dù hai phái còn lại đã lên cấp. Fixture đã chuyển sang vào cùng lúc, staging an toàn, tiếp cận trong tầm, quay phải bằng phím thật và nhập lệnh đồng thời. Không sửa HP, XP, damage, cooldown hay giảm điều kiện tất cả người chơi nhận thưởng. State thất bại giữ tại `failed-natural/`. VFX của A được fit lại cùng body khi cooldown authoritative mới tới; test tăng tốc lặp buff phải chờ cooldown server thật.

Giới hạn trình bày cần giữ rõ:

- Hit Phiến chưa có projectileId/leg trong event. Chọn hình outbound/return bằng projectile authoritative gần nhất vừa/đang tồn tại; số hit/damage vẫn hoàn toàn theo event server.
- Protocol trận pháp chưa gửi trappedIds/attempted movement. Inward cue suy từ hai vị trí creep authoritative khi chạm biên trong, không quyết định confinement. Tag phản ứng đủ hướng được chạy bằng renderer fixture; không gán fixture thành chứng minh cơ chế server.
- Frame fixture kiểm mọi tag/chu kỳ/native canvas, nhưng không khẳng định mọi biến thể empowered đã xuất hiện trong natural combat; combo thật được kiểm riêng cho Đại Lực.
- Mặt/tóc/áo/tay/vũ khí/chân được đối chiếu với export/contact sheet đã duyệt, quan sát frame và PNG gameplay. Tự động hóa không thay thế nhận xét art cuối ở zoom thường.
- Duyệt runtime cuối vẫn thuộc người dùng/director; không tự cập nhật approval lock.
