## Campaign balance và thử lại boss — 2026-11-06

Giá/stat đồ cơ bản và bình thử hiện tại được giữ. Production reward supply và EXP không còn dùng baseline60 EXP/12 vàng mỗi creep; dùng ngân sách chiến dịch mới. Chế tạo đã có; Long Châu và hoàn bình khi thua đã được phép triển khai trong batch này. [Quy tắc, cấu hình và kiểm chứng](CAMPAIGN_BALANCE_2026_11_06.md).

# Merchant economics thử nghiệm — 2026-11-02

Người dùng duyệt giao diện đang chạy, yêu cầu commit và ủy quyền tự đặt giá để mua thử, sẽ chỉnh sau. UI đã commit tại `60498c09`. Lần này mở mua/nâng bốn đồ cơ bản và mua/dùng bình thật; đây là tuning tạm, chưa hoàn tất M4.

## Giá và chỉ số đang dùng

Nguồn duy nhất: [economy.ts](../packages/game-data/src/economy.ts), có schema kiểm tra khi nạp. Mỗi giá bên dưới là tiền **mua cấp kế tiếp**, không phải giá cộng dồn.

| Món | Cấp 1 | Cấp 2 | Cấp 3 | Cấp 4 | Cấp 5 | Cộng mỗi cấp |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Vũ khí | 30 | 60 | 100 | 160 | 240 | +4 attack power |
| Giáp | 30 | 60 | 100 | 160 | 240 | +30 HP tối đa, +3 phòng thủ |
| Mũ | 20 | 40 | 70 | 110 | 160 | +0,5 HP/s, +1 mana/s |
| Giày | 25 | 50 | 80 | 120 | 180 | +3 tốc chạy, +0,5 điểm % crit |

Bộ cấp 1 tốn **105 vàng**; nâng cả bốn món từ trống lên cấp 5 tốn **2.035 vàng**. Mua tự trang bị đúng ô; không hồi HP/MP miễn phí khi tăng max, đổi build hoặc tính lại stats. Cấp 5 không mua thêm được. Không đổi vàng khởi điểm hoặc tiền/XP rơi hiện có.

| Cỡ bình | Giá mỗi bình | Máu hồi | Mana hồi |
| --- | ---: | ---: | ---: |
| Nhỏ | 4 | 60 | 40 |
| Vừa | 10 | 150 | 100 |
| Lớn | 22 | 330 | 220 |

Chọn thử nghiệm **20 bình tổng cộng**, sáu stack loại/cỡ, hồi tức thì và **cooldown chung 5s**. Bình lớn giữ hiệu suất tài nguyên/vàng, tăng lượng hồi mỗi lần dùng và tiết kiệm chỗ. Đây là lựa chọn tạm cho các câu hỏi còn mở trong thiết kế, không phải số đã chốt vĩnh viễn.

Chỉ mua/nâng khi còn sống tại đấu trường trung tâm. Dùng bình được trong dungeon, không dùng khi chết/choáng; đầy tài nguyên thì không mất bình. Cooldown theo đồng hồ trận nên không reset khi chuyển khu vực/chết. **Phím1 dùng máu, phím2 dùng mana** (cả numpad), dùng cỡ nhỏ nhất đang có như bấm bình trên HUD; chọn stack trong Túi đồ rồi bấm dùng để chọn chính xác cỡ. Menu/nhập liệu giữ quyền bàn phím; giữ phím không tự uống liên tục. Hotkey không thay đổi giá, cooldown hoặc thẩm quyền server.

Phí chế tạo xem trước: vũ khí/giáp **600**, mũ **500**, giày **450** vàng. Chế tạo, Z, Long Châu và chuyển thưởng boss sang v2 vẫn chưa mở. Phí xem trước không trừ vàng hoặc tạo đồ; boss/claim cũ không bị đổi ngầm. PvP chuẩn hóa chưa triển khai.

## Thẩm quyền và kiểm tra

Core thực hiện giao dịch đồng bộ, server lấy nhân vật/khu vực/đồng hồ từ phiên thật. Client chỉ gửi hành động, loại món/số lượng, sequence và revision; không nhận giá, stats, vàng hay owner từ client. Yêu cầu lặp/stale, thiếu vàng, đầy bình và sai khu vực không thay inventory. Protocol **19** chiếu bốn cấp đồ, sáu số lượng bình, revision và thời gian hồi còn lại. Client/server phải cùng bản.

- `tests/economy.test.ts`: bốn ô cấp 1–5, tính lại stats không cộng dồn/hồi miễn phí, atomic rejection, cap20, payload giả, cooldown/stun/full resource, chuyển dungeon/chết và validation dữ liệu.
- `tests/economy-room.test.ts`: hai SDK client, trừ vàng đúng một lần khi replay/stale, chỉ đổi chủ sở hữu, peer nhận trạng thái, dùng bình và chặn mua ngoài arena.
- `tests/e2e/merchant.spec.ts`: Chromium/Phaser farm vàng bằng A/Q thật, mua vũ khí, tăng attack power, mua bình, kiểm tra inventory và uống bình từ HUD. Không cấp vàng/items hoặc sửa stats/position từ client.

Focused run: `pnpm check:quick tests/economy.test.ts tests/economy-room.test.ts` — **7/7 pass**. Browser iteration trên server2794/client5394: `pnpm check:browser tests/e2e/merchant.spec.ts tests/e2e/ui.spec.ts --grep 'farms real gold|fit 1280'` — **2/2 pass**, toàn pipeline53,82s.

Final gate, session `economy-final`, server2794/client5394:

`pnpm check:final tests/e2e/merchant.spec.ts tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts --grep 'farms real gold|world and in-game menus|menus release|merchant exposes|two clients agree|ranged projectile'`

**PASS**: project/test/tool typechecks,18 workflow tests,483 unit/integration tests trong45 file, production build,17 asset validators và9 Chromium cases. Tổng357,93s; browser230,54s. Browser gồm mua/uống bình, bốn viewport1280×720/1920×1080/900×640/944×466, input/focus menu,12 nhánh xem trước, combat hai client và projectile bay thẳng. [Timings thực tế](evidence/sessions/economy-final/check-workflow/final-timings.json). Một lần gate đầu dừng ở kiểu mảng kết quả của tool probe; đã thêm kiểu rõ ràng trước lượt final pass này. Build còn cảnh báo bundle lớn đã có từ trước.

Đã mở và đối chiếu PNG runtime: [vũ khí cấp1 và bình đã mua](evidence/economy-trial/purchased-inventory.png), [sau khi uống bình](evidence/economy-trial/potion-used.png), cùng merchant ở viewport thấp944×466. Menu giữ trong viewport, map không thu nhỏ; merchant cuộn nội dung khi chiều cao thấp. Ảnh sau uống hiển thị hồi HP lên max, count0 và cooldown5; assertions riêng kiểm chứng state server. Creep tập luyện của QA dùng luồng damage/reward thật, không cấp vàng/items qua browser; hình creep placeholder cũ không thuộc artwork mới. Không video/animation mới hoặc ghi hình. Lần này không lặp sáu-client art gate vì không thay asset/camera/animation; sáu-client UI pass đã lưu trong [báo cáo UI](INVENTORY_HUD_INTEGRATION.md).

## Hotkey follow-up — 2026-11-02

Theo yêu cầu mới: **1 = máu, 2 = mana**, cả hàng số và numpad. Hai phím gọi đúng luồng dùng bình nhỏ nhất của HUD; giữ phím, tổ hợp modifier, menu và nhập liệu không tự tiêu hao bình. HUD thêm badge1/2, tooltip/accessibility và hướng dẫn trong Cài đặt. Không thay giá/chỉ số/cooldown/protocol hay asset.

Iteration: `pnpm check:browser tests/e2e/merchant.spec.ts --grep '1 and 2 consume'` **1/1 pass**,46,33s toàn pipeline. Test farm tiền/mua2 bình máu+1 mana qua UI, xác nhận menu không ăn phím,1 hồi HP,2 hồi mana, giảm đúng stack và chặn uống tiếp trong cooldown. Screenshot chỉ là bằng chứng hiển thị; kết quả tài nguyên kiểm tra bằng snapshot server.

Final attempt: `pnpm check:final tests/e2e/merchant.spec.ts tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts --grep '1 and 2 consume|farms real gold|two clients agree|fit 944'` pass typechecks/18 workflow checks, **481 tests pass,2 skipped** do `vo-dang-room.test.ts` không bind được cổng2638 (`EADDRINUSE`, hook timeout). [Log timing giữ nguyên](evidence/sessions/potion-hotkeys-final/check-workflow/final-timings.json). Không dừng dịch vụ của phiên khác. Sau khi cổng trống, `pnpm check:quick tests/vo-dang-room.test.ts` **2/2 pass** ([timings](evidence/sessions/potion-hotkeys-recovery/check-workflow/quick-timings.json));483 tests đều có kết quả pass trên code hiện tại qua hai lượt. `pnpm verify:assets` **17 validators pass**. Tiếp tục build/browser còn lại thay vì lặp full suite đã pass; đây không phải một lượt `check:final` xanh toàn bộ.

Continuation: `pnpm check:browser tests/e2e/merchant.spec.ts tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts --grep '1 and 2 consume|farms real gold|two clients agree|fit 944'` **4/4 pass**, production build/typecheck pass,148,87s toàn pipeline ([timings](evidence/sessions/potion-hotkeys-browser-final/check-workflow/browser-timings.json)). Đã mở [PNG hotkey trong Phaser](evidence/economy-trial/potion-hotkeys.png): nhãn1/2 hiện trên hai bình, giữ toàn bộ viewport và HUD. Không tạo artwork/animation hay video mới; không thay authoritative combat hoặc economy.

## Probe chỉ số, không phải cân bằng chiến dịch

`pnpm exec tsx tools/economy-trial.ts` tạo `artifacts/economy-trial.json`: **288** probe deterministic, bốn phái, cả hai kiểu A, level1/6/15/30, seed42/1337/9001, gear0/1/5. Mỗi probe12s, build custom trộn bốn skill hợp lệ, ba mục tiêu đứng yên phòng thủ5, áp lực8 raw damage/giây; không dùng bình. Fixture cấp đủ tiền để mua qua chính giao dịch core, rồi đặt tài nguyên đầy trước mỗi phép so sánh. [Tổng hợp số đo và hash raw output](evidence/economy-trial/balance-summary.json).

| Level | DPS bộ cấp 5 / không đồ, min–max |
| --- | --- |
| 1 | 1,534–1,966 |
| 6 | 1,350–1,626 |
| 15 | 1,240–1,426 |
| 30 | 1,172–1,280 |

Đồ có lợi tương đối lớn ở level thấp; phép đo này không chứng minh người chơi kiếm đủ2.035 vàng sớm. Chưa đo vòng farm/vàng mỗi phút, thời gian hoàn tất recipe, boss clear, tượng, sáu người hoặc PvP. Không coi các giá thử là cân bằng cuối. Mô phỏng không thay đổi school/passive/skill hoặc reward cũ.
