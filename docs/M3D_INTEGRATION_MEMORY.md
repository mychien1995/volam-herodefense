## Contact Impact V01 · 2026-11-16

Đã duyệt và tích hợp 35 clip điểm chạm, gồm 105 cel, vào `milestone/m3d`. Protocol 45 mang `hitPhase` trên sự kiện sát thương để Phaser chọn đúng clip cho từng đòn A, nhịp thiêu đốt, phản kích và các pha nhiều hit. [Atlas và nguồn](../assets/exports/contact-impacts-v01/manifest.json).

## Lôi Đài Hồng Mộc · 2026-11-12

`milestone/m3d` dùng protocol 40. Người chơi cấp 6 vào viền gạch để quan chiến hoặc bước lên sàn đấu 1v1. Phaser dùng sân Hồng Mộc v2 và tick Lôi Đài cho hiệu ứng khi đấu trường chính tạm dừng. [Luật, artwork và kiểm chứng](LOI_DAI.md).

## Bổng đỏ và nhịp A cận chiến · 2026-11-12

Bản Bổng đã duyệt dùng chung atlas 84 cel cho đứng, đi và bốn thức A ở bốn hướng. Tầm server là 105 và vệt đòn đi theo tầm này. Võ Đang Quyền, Võ Đang Kiếm và Thiếu Lâm Quyền xử lý A với hồi chiêu 0. [Kết quả trong phòng M3D sáu người](evidence/sessions/m3d-bong-reach-verified/README.md).

## Thiếu Lâm Đao · 2026-11-09

Bộ 1C/2A/3A/4A vào trận thường với nhánh Đao. Tru Tà tăng từ 180 lên 190 đơn vị ở bậc 1, bậc 4 đạt 202. Cung quét lấy bán kính theo sự kiện cast của server. Đao khí A dùng cùng tầm 320, hồi chiêu cơ bản 18 tick và sàn 5 tick theo tốc đánh như Cái Bang Chưởng. [Chi tiết](SHAOLIN_DAO_REWORK.md).

## Thiếu Lâm Quyền đã duyệt — 2026-11-09

Đòn A dùng bốn tư thế cùng mẫu nhân vật với atlas đứng yên và đi bộ. La Hán Quyền đấm xuống đất ba nhịp với tầm cơ bản 140. Đại Lực thường phóng ba khí chưởng bậc thang và ưu tiên mục tiêu đã trúng Q/W để phóng một chưởng lớn. Vô Ảnh thường phóng ba cước kình, khi Phát Động B thì lướt đá 210 đơn vị. Q/W đang hồi chiêu giữ nguyên lệnh E đã đệm. Cả hai Phát Động dựa trên hit thật cùng mục tiêu ở server. [Kiểm chứng](SHAOLIN_QUYEN_REWORK.md).

## Võ Đang đã duyệt — 2026-11-09

Hai nhánh Quyền và Kiếm đi vào trận thường của `milestone/m3d` với protocol 38. Quyền có đấm luân phiên kèm quyền khí, Lưỡng Nghi Thủ dùng lại đạn tay lam đen, Huyền Âm Chưởng có hai sóng và năm ấn nổ mực sau một giây. Bói Toán Thiên Cơ cho phép chốt tay hoặc tự chốt sau năm giây. Cầu nội lực và Thái Cực Trận Âm Dương Bát Quái dùng art đã duyệt. [Kiểm chứng Võ Đang Quyền](evidence/sessions/vo-dang-quyen-final/README.md).

Kiếm dùng năm thế đánh A2 và bảy nhát Q2 cách nhau 0,2 giây. Vạn Kiếm Quy Tông có 2–5 lượt theo bậc, với 48 thanh và một vụ nổ tại mỗi điểm chạm. Sát thương lan tính một lần khi thanh đầu đáp tâm. So với bản 48 thanh đầu tiên, kiếm dài thêm 20% và rộng thêm 10%, diện tích vụ nổ tăng 10%. Tọa Sát Bác Đồ khóa di chuyển, lướt, đánh thường và dùng chiêu đến khi phản đòn hoặc hết thế thủ. Bình máu và mana vẫn dùng theo hồi chiêu chung. [Kiểm chứng Võ Đang Kiếm](evidence/sessions/vo-dang-kiem-guard-final/README.md).

Bản gộp qua 960 test Vitest, build và các validator asset. Playwright kiểm tra Kiếm với hai client. Lượt kiểm tra tích hợp bổ sung vào một phòng có cả Quyền và Kiếm, xác nhận hai client cùng nhận A/Q/W/E/R/T của Quyền, năm vụ nổ W, chốt quẻ E và hiển thị trận T.

## Thiên Sơn đã duyệt — 2026-11-09

Protocol 36 thêm lệnh S và thời gian hiện HUD Tam Liên Trảm do server đồng bộ. Thiên Sơn Đao có ba nhát A, một cửa sổ QTE hai giây khi đủ sáu điểm và hồi 10 giây trước khi tích lại. HUD 200 × 46 px nằm trên thanh kỹ năng. Bạo Vũ Cuồng Phong duy trì một vòng quạt gây sát thương và trừ mana cho đến khi thu, rồi hồi hai giây. Bách Liệt Thiên Kích giữ bốn bóng chữ X và tám đợt đao khí xuyên tâm. Hàn Nguyệt dùng mẫu A, với tỉ lệ lưỡi mới ở các khung đứng và đi. Xem [quyết định duyệt](../DECISIONS.md#thiên-sơn--tam-liên-trảm-và-bạo-vũ-cuồng-phong--bản-duyệt-m3d) và [ảnh trong Phaser](evidence/sessions/thien-son-tam-lien-hud-layout/).

`pnpm check:final --config playwright.skills.config.ts --grep 'Tam Liên Trảm opens above'` đã qua với 946 test Vitest, 18 kiểm tra workflow, build production, các validator asset và một ca Playwright A/S. Lượt kiểm tra bổ sung trong phòng sáu client dùng một trình duyệt Phaser và năm client SDK. Phaser nhận đủ sáu nhân vật, quan sát vòng Bạo Vũ hao mana và bắt đầu hồi khi thu về, và ghi nhận sát thương Bách Liệt đồng bộ tới một client khác. [Ảnh phòng thử](evidence/sessions/thien-son-m3d-approved/).

## Commit toàn bộ M3D — 2026-11-07

Director yêu cầu commit tất cả thay đổi hiện có, bao gồm cân bằng chiến dịch, ba lượt hồi sinh/vote và toàn bộ code/artwork/tài liệu Vương Trùng Dương. Đây là ủy quyền commit trên checkout hiện tại, không tự xác nhận duyệt art runtime hoặc triển khai mạng. [Phạm vi và kiểm chứng](CAMPAIGN_BALANCE_2026_11_06.md).

## Campaign balance và thử lại boss — 2026-11-06

Director-approved campaign update: protocol35; normal rooms use campaign definition, first-clear pearls/rewards and finite-life BossRetries. Existing Vương WIP is retained. This supersedes earlier one-revival/auto-retry/no-wave-pearl/immediate-final notes only; preserve separate PvP scope. [Quy tắc, cấu hình và kiểm chứng](CAMPAIGN_BALANCE_2026_11_06.md).

# Current M3D integration memory

## Latest override: renovation v10 — 2026-11-07

V9 reverted the Cái Bang Chưởng body along with its effects. V10 uses the renovated action atlas for each of the five normal palms and the sixth dragon. The separate M3D aliases supply projectile, release and impact art. `playwright.renovation-v10.config.ts` verifies each accepted A input in four facings, real hits, peer HP and the M3D effect sources. The frame report and PNGs are in `docs/evidence/renovation-v10`.

## Latest override: renovation v9 — 2026-11-07

Restore Cái Bang Chưởng A to original M3D body, normal palm travel, sixth-dragon body/travel, release and impact via isolated original aliases; retain approved renovated idle/walk. Phi Long retains the new dragon head; suppress its legacy wave/impact atlas because its pixels include a hand. Server basics, six-hit cadence, skill damage/range/costs and knockback stay unchanged. Compare against the actual `renovationSkills=old` source paths and verify six real A presses plus Q in all four facings. Evidence and final profile: `docs/evidence/renovation-v9`, `playwright.renovation-v9.config.ts`.

## Latest override: renovation v8 — 2026-11-06

V7 Phá Giáp was rejected for shrinking the old footprint while aligning its short staff. Real M3D r3 cast/atlas comparison establishes about200world px sideways and128vertical reach. New native88px bodies hold a shaft that extends on raise and remains long through strike/recovery. The drawn cap and swing end share the far contact; the fissure starts at feet and runs there. Aseprite resamples only the outboard authored shaft, preserving its cap and protected body/hand/boot pixels. Keep range240, damage/costs and server clocks. Hàng Long keeps the provisionally accepted v7 red flight/coil/rise/dive; skip per-target headed legacy impact/ending because the single server landing pulse already draws a head-free explosion. Two-target/four-facing coverage is mandatory. New sources under`assets/source/renovation-v8`, runtime review under`docs/evidence/renovation-v8`, final profile`playwright.renovation-v8.config.ts`; staff art review pending.

## Latest override: renovation v7 — 2026-11-06

Hàng Long Hỏa Vũ range is70% of its prior value at each rank:308/329/350. It reaches its cast-locked endpoint, coils the body in place through eight authored cels, rises and dives; no entire-sprite orbit or overshoot. All four flight views and coil/rise/dive art are now scarlet/red-orange fire. Keep original phase durations, one landing hit, radius112, damage, costs and cleanup. `orbitTicks` remains the serialized duration field; emitted phase is`dragon_coil`. Phá Giáp uses a bright directional vertical swing PNG aligned to the native body foot anchor; its ground crack shares the measured staff-tip socket, never a hit-enemy position. Existing v6 reversions remain. Sources/provenance under`assets/source/renovation-v7`, runtime review/tests under`docs/evidence/renovation-v7` and`playwright.renovation-v7.config.ts`; art approval pending.

## Renovation v6 visual override — 2026-11-06

Newest director art choices are in `DECISIONS.md` v6 and `docs/evidence/renovation-v6/README.md`. Restore Hỏa Vân VFX, Đông Tà/Bắc Cái/Vương casts/effects; restore Mai's Độc Cốt Bạo only, Tây Độc except Vạn Độc Phi Châm, Nam Đế except both Phật Quang variants. Retain the v5 reversions and approved idle/walk. Shared Dong/Mai, palm, needle and Nam sky sheets use isolated aliases so exceptions remain distinct. Remove the Kháng Long hand and Thái Cực dome drawings; v5 combat geometry is unchanged. Dragon uses five authored camera views/four undulations each to render eight facings without rotating the image plane. New Phá Giáp body holds its staff throughout raise/extension/contact/recovery; separate slash/cracks sample actual cast/strike/hit clocks. Enlarged Bách Liệt is cosmetic only. New native assets live in `assets/{source,exports}/renovation-v6`. `renovationSkills=v5` retains the previous comparison; `old` retains M3D. Normal/skill/boss services remain5546/5547/5548 with separate server2946/2947/2948; restart owned processes after updates. No recordings or new art approval.

## Renovation v5 director feedback — 2026-11-06

Newest override: `DECISIONS.md` v5 and `docs/evidence/renovation-v5/README.md`. Dragon ultimate now locks a cast-time impact point and runs four authoritative flight phases before one AoE hit; Thất Tinh has seven real strokes; Thái Cực confines creeps/bosses including scripted dashes, all allies pass. Requested M3D skill reversions coexist with renovated idle/walk and the new needle exception. Both Cổ Mộ founder statues are restored. Native V5 sources/exports live in `assets/{source,exports}/renovation-v5`, separate from every immutable approved baseline. Shaolin manual attacks use retained semantic phase/progress rather than single-cel animation progress. New avatars derive from approved V1 sprites. `pnpm dev:renovation:bosses` starts the separate development five-boss/max30/zero-CD mode on5548/2948; normal5546/2946 and skill5547/2947 remain separate review services. Verify running ownership/identity before reusing ports. Art is pending director review.

## Renovation v2 correction and two-branch skill pilot — 2026-11-05

This override supersedes v1 camera/prop/collision presentation below. Main arena has exactly the original statue plus two lamps, no invented scenery. Native canvas remains CSS1; desktop camera2 plus new locomotion scale0.5 restores original world FOV/body size. Ground maps exactly to authoritative bounds. Bamboo no longer retains invisible river/fence walls; sparse shared rock footprints apply to four creep dungeons, Cổ Mộ loses obsolete interior plinths, and coast/lava boundaries remain.

Ten skill/action pilots (Võ Đang Kiếm and Thiên Sơn Phiến) use sibling density2 PNG/JSON atlases under `renovation-v2`, with exact old frame names, virtual dimensions and phase timing. Existing renderers retain their origins/paths; Toa gets a separate guard aura so shared Quyền art stays intact. All original raster inputs and approval locks remain unchanged. New drawings are candidates, not approved. Other branches and boss action/VFX drawings remain retained. Read `evidence/renovation-v2/README.md` for actual coverage and limits.

Fresh normal game uses client5536/server2936 (build endpoint2936). Separate `pnpm dev:renovation:skills` uses client5537/server2937 with existing development skill-loadout/practice commands. URL `/?debug=1&skillPreview=1`; append `&renovationSkills=old` for original combat art. These flags belong only to the review process, never the normal-match launcher. Do not assume an older5529 service has this correction.

## Renovation v1 — approved art and normal-match integration, 2026-11-05

In `wip/m3d/visual-upgrade-2`, the director approved the complete renovation preview and requested: **“quá đẹp, hãy integrate vào phaser”**. `assets/approved_renovation_v1.lock.json` pins the approved 74 idle/walk body forms, arena/eight dungeon grounds and props, and exact compact atlas derivatives. The normal `ArenaScene` consumes these assets, including the bespoke wave/chapter boss renderers and minions. This approval supersedes preview-only/candidate restrictions for this selected artwork; it does not approve newly drawn combat/skill frames or unrelated gameplay changes.

Native screen-density rendering, zoom 1 and retained edge alpha replace normal-match canvas enlargement. Hero bodies are about 88 native pixels. Original attack/cast/hurt/death/transition clips and skill VFX remain, with retained bodies scaled to the new silhouette size. Server map dimensions, collision, timing, input, damage and rewards are unchanged. New scene floors are static backgrounds with separately Y-sorted props. See `docs/evidence/renovation-runtime/README.md` for two-client iteration, the production six-client profile, screenshots, pixel-identical packing checks and honest server-fixture coverage. The integrated appearance is available for the director's normal-game review; do not treat test success as a new in-game art approval.

Local normal game: `pnpm dev:renovation`, client5529/server2926, after a build targeting that endpoint. No QA encounter fixtures are enabled by this launcher. Keep the separate renovation preview for reference comparison. Do not change the frozen skill sources while extending idle/walk coverage.

Vương Trùng Dương — 2026-11-05, protocol 30. Use the [final boss design](VUONG_TRUNG_DUONG_FINAL_DESIGN.md) as the canonical source and the [runtime handoff](VUONG_TRUNG_DUONG_RUNTIME.md) for the playtest, tuning and evidence. Director approved the three [concept v01 images](../assets/concepts/main-bosses/vuong-trung-duong/README.md). Runtime sprites and effects are supplied for separate director review. Production reaches the final through four actual defeats. Local DEV can include the final through `VOLAM_DEV_FINAL_BOSS=1` alongside `VOLAM_DEV_WAVE_BOSSES=1`.

## Approved creep integration — 2026-11-06

Director approved the final r5 creep runtime and explicitly requested integration into `milestone/m3d`. The milestone fast-forwarded from `d54382a1` through all six creep commits to the tested runtime `1f5b9e77`; committed protocol 33. The primary checkout's existing uncommitted Vương Trùng Dương work was restored separately, with local WIP protocol 34 and no WIP committed. This supersedes earlier no-merge/candidate statements for the creep composition only. Recovery, exact checks and evidence: [CREEP_M3D_INTEGRATION_2026-11-06.md](CREEP_M3D_INTEGRATION_2026-11-06.md).

## Gameplay integration into milestone/m3d - 2026-11-05

The milestone combines gameplay commit 2ef38869 with approved creep and environment release 5bca353c. The committed runtime uses protocol 31. The combined tree passed all 755 unit/integration tests, TypeScript, production build and asset validators. Three Chromium cases passed across the final run and scoped retries, covering boss farewells/corpses/dungeon chatter, six-player crafting with both new icon sets, and soundtrack playback/loop/leave. The crafting retry uses explicit branch scrolling and server-acknowledged waits. The original failed browser stage remains in its timing report. See [integration verification](evidence/sessions/m3d-gameplay-merge-final/integration-verification.json).

## Gameplay update worktree — 2026-11-04

On `wip/m3d/gameplay-update`, protocol 31 requires a new room and matching server/client. Use the 2026-11-04 overrides in [DECISIONS.md](../DECISIONS.md), [CONTENT_DATA.md](../CONTENT_DATA.md) and [GAME_DESIGN.md](../GAME_DESIGN.md). Fixed school branches use manual Q/W/E/R/T upgrades and the confirmed F stance for Thiếu Lâm Quyền. Reserved stat points await their own feature. The opening story introduces Tượng Võ Thần and Long Hồn Thần Thạch. Existing boss encounters have seeded dialogue and the four live wave bosses have one farewell each. Vương Trùng Dương has authored lines for his future encounter. Crafting uses personal dungeon boss materials and unlocks Z from crafted boots. Cái Bang has new icons and the supplied OST loops during the match. The final crafting run passed 755 unit and integration tests plus the six-player Chromium case. The OST browser case passed on its isolated retry after the first run timed out. The historical protocol notes below describe the base milestone.

Vương Trùng Dương — 2026-11-05, protocol 32. Use the [final boss design](VUONG_TRUNG_DUONG_FINAL_DESIGN.md) as the canonical source and the [runtime handoff](VUONG_TRUNG_DUONG_RUNTIME.md) for the playtest, tuning and evidence. Director approved the three [concept v01 images](../assets/concepts/main-bosses/vuong-trung-duong/README.md). Runtime sprites and effects are supplied for separate director review. Production reaches the final through four actual defeats. Local DEV can include the final through `VOLAM_DEV_FINAL_BOSS=1` alongside `VOLAM_DEV_WAVE_BOSSES=1`.


Last update2026-11-03. Director approved the complete feedback runtime through521f73cd and explicitly requested integration into `milestone/m3d`. Runtime merge e69dc456 is now on milestone/m3d, combining feedbackf1e90462 with milestone3b0c1ebc, preserving Hell, merchant/inventory UI, basic/potion economy and potion1/2. Earlier no-merge statements in retained handoffs describe previous authorization, not the current request. Final merge identity/checks: `M3D_MILESTONE_INTEGRATION_2026-11-03.md`.

Canonical skill names now include **Ca Diệp Thoái** (stable ID hoanh_tao_cuoc) and **Sư Tử Hống** (stable ID tam_gioi_quy_thien). Content/combat/design/decisions/balance/architecture/acceptance documents have the current M3D override. Vô Ảnh: one centered foot on failure, ordered three parallel lanes twice on valid same-target Toàn Phong→Ca Diệp hits; buffer one early finisher while the real predecessor resolves. Do not reintroduce seeded-combo-only test coverage. Latest creep speed64.8% of buffed entry speed, private dungeons including Hell, one identity/wave and soft separation. Bosses shared, per-attempt one revival, solo second death exits, all-in-same-boss pauses exterior arena combat.

Protocol22 additionally integrates the approved Đông Tà wave encounter; it retains the prior protocol21 feedback/inventory fields. O skills/P dungeons/Esc close-or-quit, Shift dash, spectator arrows, Space exit/wine, potion1/2; hotbar has both dash and unavailable Z. Boss cadence JSON is editable after rebuild/restart. Chu wine: defense180,12s70% penetration against Chu only; no heal/immunity. Approved art locks remain byte-exact; production frames follow server state, never authoritative damage from animations.

Retain the newer inventory-v2 design boundary: personal boss materials/Long Châu/crafting/Z/PvP migration remains future scope. Current legacy encounter reward backend stays in place alongside delegated trial merchant transactions. Do not silently implement M4 during a merge.

Visual improvement approval: the normal Phaser client loads the approved atlas selection from `apps/game-client/src/approved-art.generated.json`. Its source baseline is `824c2901`. Thái Cực Trận uses the original formation artwork, including its ground and legacy fallback atlases. Boss approval is scoped to the body sheets and selected effects. The mixed Bắc Cái sheets preserve only the approved Thiên Hạ Vô Cẩu cels. Lý Mạc Sầu's Phất trần keeps its original ring and impact. Như Lai Thiên Diệp follows the caster for 15 seconds and launches a non-homing blade toward each nearby visible enemy once per second, with the existing ally defense granted at cast time.

Process lessons: `SESSION_EXECUTION_LESSONS.md`; exact validation workflow: `DEVELOPMENT_WORKFLOW.md`. No recordings. Preserve other worktrees, their services and untracked files. No push/deployment unless requested.

Đông Tà approved2026-11-03: first wave5 gate, east entry into the main court, all-player recall/revival, temporarily hidden/invulnerable statue and unlimited wipe retries. Its ready/approaching/active lifecycle is an explicit exception to dungeon-only exterior pause; waves still run every180s. Recalled dungeon spectators regain active controls without resetting their old dungeon life ledger, reconnects land inside the court, and Nhân Kiếm cannot blink out. Other boss-dungeon one-revival/pause rules remain unchanged. No boss items are added. Exact reconciliation/validation: `DONG_TA_M3D_MERGE_2026-11-03.md`.

Tây Độc integration2026-11-03: protocol23 preserves protocol22and the full feedback/party/inventory baseline. Actual Đông Tà `cleared` state unlocks Tây Độc’s wave10clear+rest gate; west brick-road entry stays worldY616. Phase2 remains strictly below50%, uses only Cáp Mô attacks and retains released phase1hazards. Existing M3D all-in-boss pause/reconnect/full-heal rules are retained; no new recall, arena, statue immunity or wipe retry is added for Tây Độc. Transient-disconnect transfer settles a selected25%maxHP mark before the canonical reconnect heal. Frozen art inputs stay byte-exact;60directional additions retain candidate status. See `TAY_DOC_M3D_MERGE_2026-11-03.md`; only focused merge checks were requested.

Nam Đế integration2026-11-03: current protocol24 preserves the full protocol23 baseline. Wave15clear/rest waits for actual Tây Độc death, respects the existing arena pause clock, and adds no recall/immunity/retry policy. Existing potion1/2, Shift dash, spectator/menu and reconnect controls remain; physical QTE keys use owner-filtered state and the new onDrop cleanup. Gold/XP only, no M4 migration. Retained Nam Đế PNGs and newline-sensitive metadata are byte-exact; runtime art approval remains separately pending. Only focused merge checks were requested and run. See `NAM_DE_M3D_MERGE_2026-11-03.md`.


Bắc Cái integration2026-11-03: protocol25 preserves protocol24 and the current M3D baseline. Source9452169a and parent32d4866b were reconciled against the tested candidate. Actual Đông Tà clear, Tây Độc death and Nam Đế defeat unlock wave20clear/rest on the arena clock; natural progression no longer depends on absent predecessor adapters. Existing all-in-boss pause/reconnect rules stay unchanged. No added recall/immunity/retry/items or inventory-v2 migration. Approved v03 bytes and disclosed facing fallbacks remain; numeric balance is still trial. Only focused merge checks ran:60 scoped cases after fixture retries, typechecks/build/asset guards and production Phaser two-client case. See BAC_CAI_M3D_MERGE_2026-11-03.md and docs/evidence/bac-cai-m3d-merge/verification.json.


Canonical override2026-11-03 — director approved wave_boss_feedback_v01 VFX and explicitly requested all original gameplay feedback integrated into Phaser/server. Protocol27 now extends the **entire** Đông Tà field/recall/revive/hidden protected statue/unlimited wipe retry policy to Tây Độc, Nam Đế and Bắc Cái. Their historical no-recall/no-immunity/no-retry and exterior-pause statements above are superseded. Dungeon boss life ledgers and inventory-v2 remain unchanged. All boss bars use Tây style. Full skill/tuning/asset/provenance/validation details: `WAVE_BOSS_FEEDBACK_RUNTIME.md`. Preserve approved preview bytes, including Đông Tà’s newly selected dash cels. Preview-approved art still awaits director’s final in-game judgment.


Canonical override2026-11-03 — director explicitly approved latest wave_boss_feedback_v02 and all cumulative feedback for runtime integration. Immutable127review inputs: `assets/approved_wave_boss_feedback_v02.lock.json`. Protocol28 retains protocol27field/retry/control rules. Mai quick tug then exactly24ticks (0.8s) before first Ma Ảnh; Shift lock150ticks. Three inward pillar shots/new raster projectiles; stomp−10%; Nam1–5re-aimed gold pulses,1.5×barrage,96arena-contained sky impacts after center dash, hand-wave/target light without connecting beam. Thiên Hạ replaces all pull/slow/slam with **nine independently wandering spinning damage sources, including original boss**. Special-skill names appear once overhead for wave and dungeon bosses; normal attacks silent. Mục Hạ mutes preference chatter. Nam corpse expires before later boss entry. Full cumulative ledger and actual-run status: `WAVE_BOSS_FEEDBACK_V02_RUNTIME.md`. Older centered/orbiting clones and immediate-follow-up rules are superseded; inventory-v2 remains future scope.

V02 final verification complete:715unique unit/integration cases passed through isolated Chu-port retry,18workflow checks/typechecks/build/20asset validators,3unique production browser cases across scoped retries and768balance exposure probes. Exact16new cels observed;127reviewed inputs remain locked. Protocol28requires restarting matching services/new room. Full measured results, original failures and limitations: `WAVE_BOSS_FEEDBACK_V02_RUNTIME.md` and `evidence/wave-boss-feedback-v02-runtime/verification.json`.


## Latest boss playtest feedback — 2026-11-03 (protocol 29)

This canonical override supersedes V02 random burst counts and the old repeated wrong-clone punishment. Đông Tà, Tây Độc and Nam Đế each have twenty original Vietnamese combat lines, selected server-side from seeded shuffled decks without repetition until the pool is exhausted. First line after 6 seconds of combat, then every 8–10 seconds when an action gap permits; overhead chat lasts 4 seconds in its own lane alongside the retained skill shouts. Bắc Cái keeps his separate preference/dialogue mechanic and stays silent during Mục Hạ Vô Nhân.

Mục Hạ Vô Nhân keeps its approved split and five pair swaps. At reveal, players have exactly 5 seconds to land a valid guess. A clone hit causes one arena-wide explosion and ends the skill in that simulation tick; all simultaneous clone/real hits settle as one failure, regardless of target iteration order. A real-body-only hit ends it without explosion and cancels the deadline, including on the deadline tick. No valid hit by the deadline causes one explosion and immediate cleanup. No extra explosions after cleanup.

Tiểu Nhất Dương Chỉ always releases five straight golden projectiles, spaced 0.16 seconds, re-aiming at the selected player's current position at each release. Each shot flies straight afterward. Its independent server channel can run with all main skills, QTE and movement without replacing their cast or clocks. Trial repeat interval is 90 ticks / 3 seconds, first windup remains 17 ticks; repeated starts cannot duplicate an active burst. Death, no living players, wipe and encounter cleanup cancel pending shots. The main special animation retains priority while concurrent native gold projectiles render normally.

Approved V01/V02 PNGs, JSONs and preview source remain byte-exact. This update changes runtime behavior and text, not the frozen preview. The common arenas, rewards, dungeon life ledgers, controls and separate inventory-v2 scope remain as in V02. Matching protocol 29 services and a new room are required. Current implementation/validation: `WAVE_BOSS_FEEDBACK_V03_RUNTIME.md`.

V03 verification completed with scoped retries: 724 unit/integration tests,18 workflow checks,20 asset validators,4 unique production-browser cases and768 exposure probes passed. Original failures remain recorded; see `WAVE_BOSS_FEEDBACK_V03_RUNTIME.md` and `evidence/wave-boss-feedback-v03-runtime/verification.json`. Matching protocol29 local playtest is running on client5515/server2915 with explicit DEV wave-boss mode; create a new room. All three banter pools have20lines and use separate seeded RNG that never consumes combat RNG.

## Canonical presentation update — skill renovation v3, 2026-11-06

Continue from the accepted visual-upgrade-2 idle/walk, arena layout and v2 pilot. The current request extends its art style to all 43 school skills, eight basics and all wave/dungeon boss cast renderers, including helpers. Fix Chiết Mai's actual pale PNG matte; keep the new Võ Đang meditation body throughout the real Vạn Kiếm channel; register four Thất Tinh slashes to the existing directional hand sockets and actual hit intervals. No server combat/content/tuning edits are part of this update.

`renovation-actions.generated.json` routes native action bodies and 174 replacement VFX atlases. Both file-backed and inline atlas JSON must follow the selected packed PNG. Body rendering keeps the old animator clock, four authored facings and fixed feet; single-frame Phaser progress needs a finite fallback. Preserve `renovationSkills=old` and `=v2` comparisons and all older approved bytes. New sources, hashes, editable Aseprite files, phase/frame contracts and review coverage live under `assets/source/renovation-v3/` and `docs/evidence/renovation-v3/`. Skills share suitable semantic body keyposes; hurt/death are outside this cast scope. Final v3 art approval remains with the director.

## Canonical presentation update — skill review v4, 2026-11-06

The user requests level30/max-rank heroes and zero skill cooldown only in the server-gated skill-review mode. Keep four slots and real cast/action locks; normal rooms retain existing progression/cooldowns. Correct left-facing school/helper rasters by horizontal reflection, preserve pivots/clocks and all older exports. Integrate the eight specific visual corrections in RENOVATION_V4_SKILL_REVIEW.md without changing combat definitions. New files are prototypes awaiting director review; do not treat integration as approval.

## Creep upgrade worktree — 2026-11-06

Director explicitly authorized all 44 regular creep combat suggestions and five support roles, with Phaser integration, creator-selected 2/3/4 invasion gates and 60-second timed streams at configurable rate. Worktree branch `wip/m3d/creep-upgrade`, baseline `d54382a1`, protocol 32; no merge/deploy requested. Actual live room enables the validated profile catalogue; chapter gates include pending spawns. `VOLAM_DEV_CREEP_TEST=1` is development-only and cycles all 20 waves with invulnerability and no chapter bosses. Per-creep XP/gold remain unchanged; density amplifies reward supply. Scope, tests, raster reuse/provenance and measured limitations: [CREEP_UPGRADE.md](CREEP_UPGRADE.md). Source checkout's uncommitted Vương Trùng Dương work remains separate.

## Director creep feedback r2 — 2026-11-06

North/south gates now require a clear footprint-wide corridor toward the statue, not merely an empty spawn point. Forward smash/slash/claw specials start at their caster and damage a forward capsule; heavy smash geometry increases 50%, other spreading skill radius/width and pattern extent double. Archer basic/special shot range is reduced 15%; melee basic reach doubles. Trúc Xà is fully ranged with poison+slow, Độc Chu keeps melee and web has a 25% one-second root, Sơn Viên stomps with 0.8s stun, Trúc Lâm Kiếm Khách gains 25% chance to reflect 50% of actual direct damage (no recursion), Mộc Linh becomes ranged. Sa Xà becomes ranged with slow; Xác Ướp basic cooldown is 36 ticks and has 25% root; Cự Nhân Sa Thạch basic punch stuns in AoE. Hải Xà becomes ranged and Độc thủy slows. Dung bạo radius is 144 (previously 72). Root blocks movement/dash/blink, permits attacks/casting, and respects expiry/control resistance. Numeric proc chances and durations are trial defaults. Prior r1 verification reports describe the old tuning; r2 evidence is stored separately.

Individual creep preview —2026-11-06: protocol33, development-only creator option via `?creepPreview=1`, gated by server `VOLAM_DEV_CREEP_TEST=1`. Host selects one of49 profiles; normal room rules are unaffected. Real server attacks/statuses and existing Phaser scene/raster assets are retained. The new room has no timed waves and no dungeon entry. See `docs/CREEP_PREVIEW.md` for fixture defaults, limitations and837-test/two-client final PASS.

Creep preview feedback r3 —2026-11-06: targeted purple burst/drain/poison/water placements, captured180-degree high-damage Hoanh Tram, torso arrows and requested strip/signature removals supersede prior r2 tuning. Shared protocol33 is retained; restart/reload/new room required. Current code/evidence and original-raster selection rationale: `docs/CREEP_FEEDBACK_R3.md`.

Creep feedback r4 —2026-11-06: no generic purple windup circles/semicircles across all 49 profiles. Thi độc directly schedules its delayed poison field at server-captured target feet, replacing r3 lob delivery. Actual released purple burst/drain effects remain. Protocol 33 retained; current code, evidence and restarted review services: `docs/CREEP_FEEDBACK_R4.md`.

Creep feedback r5 —2026-11-06: Sơn Tặc Đao (`wave_03`) has Chém đao normals only; r3 Hoành trảm is superseded. Remove generic caster contact explosions, including basic melee and self stomp/ring stamps. Actual target fields/projectiles and deliberate self-destruction/death explosions remain. Protocol 33 retained. Current implementation/review/verification: `docs/CREEP_FEEDBACK_R5.md`.

## Va chạm và giữ sprite khi trúng đòn hoặc ra chiêu — 2026-11-12

M3D dùng tia vàng kem 110 ms và viền mảnh theo alpha của sprite khi nhận sát thương. Chí mạng trên mục tiêu chính thêm vòng nứt 210 ms, neo vào tọa độ chạm. Các mục tiêu phụ của đòn cung nhận tia nhỏ hơn. Client nhận thứ tự mục tiêu qua trường hitIndex có sẵn trong sự kiện sát thương. Sát thương, chí mạng, thời gian cast và hiệu ứng riêng của chiêu tiếp tục do các hệ thống hiện hành xử lý.

Thiếu Lâm Đao dùng cùng atlas đao vàng cho phản ứng trúng đòn, Kim Quang Hộ Trận, Bất Động Minh Vương và Sư Tử Hống. Chín boss dùng khung thân renovate bốn hướng theo mẫu duyệt khi trúng đòn và khi ra chiêu. Chính sách giữ thân M3D cũ còn phục vụ các màn đối chiếu phiên bản. Vạn Độc Phi Châm, Phật Quang, Băng Phách Ngân Châm và pose chưởng tay R3 của Kim Luân tiếp tục dùng các pose riêng đã duyệt. [Bản duyệt và provenance](evidence/sessions/m3d-hit-continuity-preview/README.md) · [Kiểm tra trận production](evidence/sessions/m3d-hit-continuity-matrix/m3d-hit-continuity/README.md)

## Ổn định chọn phái trong phòng sáu client — 2026-11-12

Các bản vá roster cập nhật danh sách và số người sẵn sàng mà giữ nút chọn phái của người chơi hiện tại. Phaser tạm dừng vòng render khi sảnh che đấu trường và tiếp tục khi người chơi vào trận. Giữ xác nhận và điều kiện bắt đầu do phòng Colyseus quyết định. [Kiểm tra sảnh và 44 lượt boss trong trận sáu client](evidence/sessions/m3d-six-lobby-verified/m3d-hit-continuity/README.md)
