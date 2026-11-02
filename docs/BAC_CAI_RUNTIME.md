# Bắc Cái — tích hợp gameplay

Nhánh `wip/m3d/bac-cai`. Dùng nguyên PNG/choreography visual v03 đã duyệt; không sửa record/lock lịch sử để biến approval visual thành approval combat. Approval gameplay/balance của bản tích hợp vẫn chờ director xem.

## Phạm vi và tiến trình

`BacCaiEncounter` chạy trong arena world qua `stepWorld`, dùng chung creep actor, targeting, hit, mitigation, status và A/QWER hiện có. Nó không dùng singleton boss dungeon, không clear wave, không tạo zone/portal mới và không đánh tượng. Chó/clone không cho XP, gold hay item. Boss chết chia đúng một pool XP/gold cho người còn sống trong arena có hit trong cửa sổ assist; không rơi item, không respawn.

`MainBossDirector` cung cấp hook server `recordDefeat()` theo thứ tự Đông Tà → Tây Độc → Nam Đế → Bắc Cái → Vương Trùng Dương. Chỉ spawn Bắc Cái khi ba defeat trước đã được adapter tương ứng báo thật, wave20 đã spawn và invasion thuộc wave≤20 đã chết, sau nghỉ10s. Hook chỉ triển khai Bắc Cái; **checkout chưa có ba adapter wave boss trước nên chưa thể đi tới Bắc Cái bằng natural campaign progression**. Không tự điền các defeat còn thiếu. Invasion interval180s/hai phía và catalogue ba recipe hiện tại được giữ nguyên.

Fixture trong `tests/e2e/bac-cai-setup.ts` spawn encounter trực tiếp từ server để test, không mở gate giả. Route fixture chỉ có trong dịch vụ Vite của test, không có trong shipped game server hay protocol input. Không có lệnh client gây damage, teleport, chọn chân thân hoặc quyết định vote.

Điểm vào phía bắc `(1120,340)` nằm dưới mép tường bắc, rồi đi tới tâm chiến đấu `(800,780)`, tránh pedestal tượng. Tám vị trí dùng bán kính265×165. Collision do server. Camera/perspective/full viewport và Arrow/A/QWER không đổi.

## Authority và mạng

- `packages/game-core/src/bac-cai.ts`: RNG seeded, body/cast/recovery, summon, geometry, clone decision, thoại/vote, reward/lifecycle. `bac-cai-types.ts`: contracts/validation; `game-data/src/bac-cai.ts`: trial tuning.
- Protocol18 thêm collection `LobbyState.bacCai`, key`arena`, chứa public snapshot. StateView gửi/xóa entry theo zone. Snapshot có tick, cast ID/start/release/end, vị trí và lifetime effect, HP chó, tám form công khai, thoại/vote; client vào muộn dựng được effect đang sống.
- Creep projection chung bỏ các actor nội bộ Bắc Cái. Khi phân thân: không gửi body coordinate, per-form HP, actor ID chân thân, real index/slot hoặc RNG seed. Form keys là identity dùng theo dõi chuyển động; chân thân có thể được theo dõi bằng chuyển động trong lúc split như brief, không có marker đáp án.
- Snapshot JSON theo patch hiện có, không phải dự đoán combat phía client. Renderer chỉ nội suy tối đa một tick và sample cels; không phát hit từ animation. Tuning gửi kèm là thông tin công khai, không chứa đáp án ẩn. Chưa tối ưu bandwidth cho production.
- `apps/game-client/src/bac-cai-art.ts` dùng9 atlas boss/VFX đã có trong retained registry của preview. `art.ts` preload, `ArenaScene` render/clear/inspect. Không import thuật toán storyboard/HP giả/tọa độ màn hình từ gallery.

## Cơ chế và thứ tự resolve

| ID runtime | Tên | Authority/visual |
|---|---|---|
| `bc_staff` | Đả Cẩu Bổng Pháp | Quét frontal liên tục và dash theo hướng chốt; collision server |
| `bc_palms` | Hàng Long 18 Chưởng | Release đầu rồng bay thẳng, không homing |
| `bc_beam` | Đả Cẩu Bổng Kích | Warning350ms, beam768, active440ms, thân rảnh700ms; strip768×128 native1× |
| `bc_dogs` | Bổng Đả Ác Khuyển | Bốn chó mỗi cast, HP260, cắn/nhận hit/chết thật; nhiều cast không bị cap bốn toàn trận |
| `bc_clones` | Mục Hạ Vô Nhân | Split1500ms; năm lượt, mỗi lượt1400ms move +120ms stagger/cặp +340ms nghỉ; reveal chờ hit |
| `bc_vortex` | Thiên Hạ Vô Cẩu | Tâm sân, hút toàn arena rồi slam + stun; không snap người về chỗ cũ |
| `bc_tether` | Kháng Long Hữu Hối | Hai người random hợp lệ, hút rồi nối giữa hai người; solo không cast |
| `bc_field` | Kiến Long Tại Điền | Jump/impact360ms, body recover780ms; sáu nét chữ田, footprint360×220, ground alpha0.55 dưới actor |
| `bc_spiral` | Phi Long Tại Thiên | Release400ms, thân rảnh650ms, rồng tự bay5600ms quanh origin cố định, ellipse/y-scale0.7 và ba vòng |

Đầu tick cập nhật vị trí form/immunity, sau đó combat chung xử lý mọi target. Cuối tick mới resolve snapshot hit phân thân; real hit không xóa target trước khi AoE xét hết. Mỗi hit vào một clone được dedupe theo source/ability/clone trong tick; clone khác hoặc nguồn/ability khác vẫn gây nổ riêng. AoE vừa thật vừa giả **vẫn nổ**, kể cả chân thân chết cùng tick. Damage immunity chỉ có trong đúng cửa sổ shuffle; split/reveal nhận damage theo brief. Trúng thật xóa clone; trúng giả chỉ resolve blast, các hình vẫn tồn tại cho đến khi đánh đúng hoặc outcome sở thích ngắt body, đúng failure choreography v03.

Body và thoại/vote dùng clock riêng. Preference thay đổi mỗi4s trong combat, kể cả đang cast. Mở vote giữ sở thích cuối vừa nói; thoại đổi thành “Chọn điều lão phu vừa nói!” như preview, ba ô gồm đáp án đó và hai lựa chọn khác. Ô dùng raster `landing_warning` và footprint ellipse100×50. Người sống/connected đang trong arena tại deadline được tính theo feet server, tối đa một ô. Late join đã confirm được tính; chết/rời zone/disconnect bị loại; respawn trước deadline được tính lại. Hòa phiếu/không phiếu tính sai ngay tại deadline, không gia hạn.

Outcome có priority cao hơn body: cancel cast chưa release và phân thân đang hoạt động; không xóa chó/rồng/dây đã thả. Đúng ngủ10s và vẫn nhận damage; sai heal10% max HP một lần ngay khi resolve, clamp max HP rồi diễn hoạt uống rượu. Các hazard đã thả vẫn có lifecycle riêng; không tự miễn damage cho người chơi lúc boss ngủ. Sau outcome quay lại AI và lịch preference/vote. Sleep giữ cel nằm, không giả bộ có breathing loop mới.

Dây đứt ngay khi một người rời zone/disconnect qua membership lifecycle; chết hoặc đủ khoảng cách được kiểm tra trước pulse và sau mỗi pulse gây chết. Không drain người còn lại sau đó. Đánh statue không xuất hiện trong target list. Beam/palm/spiral dùng segment sweep, mỗi beam/palm hit một lần mỗi người; spiral dùng cadence500ms. Field là strokes có bề rộng28 cộng radius người; không có damage tròn vô hình ở bốn ô trống. Cleanup boss chết/defeat/dispose xóa owned hazards/dogs/forms và status; dungeon rỗng30s không reset wave boss.

## Trial defaults, chưa duyệt balance

HP18000×`(1+0.65×(players−1))`, defense35, speed125, radius20. Damage staff32 mỗi350ms/1050ms, palm38, beam60, dog18 mỗi1s, slam65/stun1s, tether8 mỗi500ms, field70, spiral32 mỗi500ms, clone blast80 mỗi hit được resolve. Special cadence/cooldown9s, action gap650ms. Chó sống45s/corpse900ms, speed135. Tether đứt ở340 và tự hết12s. Reward pool XP1800/gold1200, assist30s. Tất cả nằm trong data, validated khi room tạo; không phải số đã được director chốt.

Probe dùng hai branch default hợp lệ của bốn phái, level1/6/15/30, solo/2/6, seeds42/1337/9001, tối đa60s. Không equipment/respawn/human dodge; bot nhớ preference công khai và ngừng đánh khi có clone. File `docs/evidence/bac-cai-runtime/balance-probes.json` ghi kết quả thực tế. Các probe đo exposure/DPS/survival, không chứng minh boss cân bằng hoặc solo clear được.

## Giới hạn artwork còn giữ nguyên

Pose chọc bi-a mới có hướng phải; hướng khác dùng staff combo cũ. Drink/sleep mới có hướng xuống. Chó có hướng phải, trái mirror; chưa có native up/down. Không generate thêm artwork trong task này. Một số form/VFX toàn arena có thể ở ngoài camera đang follow người chơi; không thu map để nhét đủ actor vào UI. Cần director review readability/gameplay tích hợp riêng.

## Kiểm chứng

Focused core/SDK regressions: geometry, exact-four mỗi cast, năm crossing swaps, boundary immunity, AoE real+clone theo cả hai thứ tự, solo/pair/death/leave/disconnect, vote correct/wrong/tie/zero, heal/clamp/once, sleep damage, detached effect + body/dialog, cleanup/reward và progression gate. Browser fixture có hai client để quan sát phase, sáu client dùng keyboard combat bình thường sau server-only setup level30/spawn; không đổi boss HP/damage hay tăng clock trong natural pass. Gallery regression vẫn quan sát408 cels/102 clips và ghi evidence mới, không overwrite v03 đã khóa.

Lệnh kiểm tra cuối và kết quả đo được nằm trong `docs/evidence/bac-cai-runtime/final-validation.md` sau khi pipeline chạy xong. Không tạo video/GIF/trace stream. API chính thức đã đối chiếu với installed Phaser4.2.1, Colyseus core0.18.23/SDK0.18.8/schema5.0.42: [Phaser Image](https://docs.phaser.io/phaser/concepts/gameobjects/image), [Colyseus Schema](https://docs.colyseus.io/state/schema), [Rooms](https://docs.colyseus.io/room).
