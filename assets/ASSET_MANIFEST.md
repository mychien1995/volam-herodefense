## Võ Đang Kiếm · A2, Q2 và Thiên Kiếm — 2026-11-09

Hai atlas Phaser trong `exports/vo-dang-kiem-rework/` gồm 24 khung thân có điểm đặt chân cố định và 10 hiệu ứng raster. Bộ thân có năm thế A và một thế chỉ kiếm ở ba hướng vẽ riêng, hướng trái phản chiếu từ hướng phải. Q dùng lại bộ thế kiếm và có bảy vệt riêng. Kiếm lam bạc chuôi vàng dùng chung raster cho pha lên và pha rơi, xoay 180 độ khi rơi. Nguồn và cấu hình xuất ở [provenance.json](source/vo-dang-kiem-rework/provenance.json).

## Võ Đang Quyền · bộ art duyệt ngày 2026-11-09

Phaser dùng atlas PNG/JSON đã duyệt trong `exports/vo-dang-quyen-preview/` cho dáng đấm, thế chưởng, sáu thế Thái Cực Quyền, quẻ và buff, cầu nội lực, ấn mực và trận Bát Quái. Q dùng các frame `huyen_am_travel` từ PNG tay lam đen đã có. A dùng atlas sóng quyền khí M3D. Tất cả giữ tỉ lệ ảnh gốc. Pivot chân và socket tay được ghi trong dữ liệu xuất. Nguồn ImageGen, prompt và hash nằm trong [provenance.json](source/vo-dang-quyen-preview/provenance.json).

## Thiên Sơn · Bạo Vũ Cuồng Phong và Bách Liệt Thiên Kích — 2026-11-09

Bạo Vũ Cuồng Phong **đã duyệt artwork phóng quạt** ngày 2026-11-09. Bốn frame 88×88, tâm (44,44), cùng vòng quạt cho lượt đi và thu về. Exporter kiểm hash của bộ được duyệt.

Bách Liệt Thiên Kích **đã duyệt artwork bản chữ X** ngày 2026-11-09. OpenAI ImageGen tạo 16 pose hướng chéo, frame 80×80 với điểm đặt chân (40,64), và bốn dáng đao khí xanh 80×80 với tâm đặt trên lưỡi. Bốn bóng cách nhau 224 px ngang và 132 px dọc ở tỷ lệ 1×. Bản xem phát 8 đợt, mỗi đợt cách 210 ms và có bốn đao khí bay thẳng hoặc lượn qua tâm. Tầm bay thử là 160 px trong 300 ms. Chromium ghi nhận 32 lần đao khí chạm mục tiêu đứng giữa. Manifest khóa hash của hai atlas và trang xem đã duyệt. [Nguồn PNG và prompt](source/skills/thien-son/skill-review-2026-11-09/) · [Manifest](exports/skills/thien-son/skill-review-2026-11-09/manifest.json) · [Xem chuyển động](exports/skills/thien-son/skill-review-2026-11-09/review.html) · [Ảnh và số đo](../docs/evidence/sessions/thien-son-skill-review-flurry/).

Thiên Sơn Đao có ba **phương án concept** tạo bằng OpenAI ImageGen, gồm Hàn Nguyệt cong tròn, Trường Phong lưỡi dài và Tuyết Nha bản dày mũi vát. Cả ba là PNG alpha 1536×1024. Bảng so sánh đặt chúng cạnh frame đứng hướng phải đang dùng trong game, cùng chiều cao nhân vật 88 px. [Bảng so sánh](reviews/thien-son-dao-weapon-options-2026-11-09/review.html) · [Nguồn, prompt và hash](source/characters/thien-son-dao-weapon-options-2026-11-09/provenance.json).

Director chọn **Hàn Nguyệt** cho Thiên Sơn Đao. Atlas tích hợp gồm 32 cel alpha, canvas 160×144, điểm đặt chân (80,112), hiển thị ở scale 0,5 với camera trận. Các nhịp nâng và hạ đao của Liệt Phong dùng pha server để chọn cel. Bách Liệt dùng nguyên hai atlas được duyệt. Bạo Vũ dùng sprite xoay được duyệt và icon trích từ frame đầu. [Nguồn và hash Hàn Nguyệt](exports/characters/thien-son-han-nguyet/provenance.json).

## Renovation v8 · long Phá Giáp footprint — 2026-11-06

Three original PNG/JSON atlases /36 cels under`assets/exports/renovation-v8`:16 held long-staff body cels,16 long swing trails and4 forward fissure cels. Native1024×1280 virtual canvas, foot pivot512/819, unchanged88px hero body reference. Built-in imagegen supplies spacious directional source drawings and fissure; the rejected short sheet is preserved. Aseprite fits only the authored outboard shaft along its own axis, retains cap size and asserts protected body pixels unchanged. V7 swing raster is refitted to the restored M3D reach. Left mirrors right; the flat canonical ground fissure follows the actual cap vector. Exact sources, prompts/timings, editable files, shaft audit and hashes are in`assets/source/renovation-v8`. Dragon rasters are unchanged; legacy landing-head drawing is disabled in renovated mode. Candidate, pending director review.

## Renovation v7 · fire dragon / staff contact — 2026-11-06

Original built-in imagegen sources and palette edits: `assets/source/renovation-v7/raw/`; Aseprite editable atlases: `editable/`; exported PNG/JSON: `assets/exports/renovation-v7/`. Three atlases /48 unique cels:20 red multi-view forward-flight cels,12 coil/rise/dive cels,16 directional staff trails. Virtual canvases512px (dragon) and400px (staff); trail foot pivot200/320 matches the retained v6 held-staff body. V6 ground-crack PNG is reused at the same measured staff-tip socket. Source prompts, reference roles, generation durations, export plan/Lua and hashes are retained in the v7 source directory. User reference attachments inform motion only; no third-party art copied. Candidate, pending director review.

## Renovation v2 · sửa layout và thử hành động/VFX hai nhánh — 2026-11-05

**CANDIDATE, chưa có phê duyệt art mới.** Nền arena3200×2304 giữ bố cục tượng + hai đèn;48 keypose hành động mới,16 pose Kiếm đã duyệt được tái sử dụng,44 cel VFX gốc cho Võ Đang Kiếm/Thiên Sơn Phiến.36 atlas density2 thay1.236 tham chiếu frame trong animators cũ. PNG/JSON: `exports/renovation-v2/`; editable Aseprite/raw/prompt/hash: [provenance](source/renovation-v2/provenance.json). [Báo cáo chạy Phaser và giới hạn phạm vi](../docs/evidence/renovation-v2/README.md). Hành động boss và các nhánh còn lại vẫn giữ tranh cũ.

## Võ Đang Kiếm và arena · ứng viên 2026-11-05

Một cảnh duyệt tương tác gồm 24 cel Võ Đang, 24 cel cho năm hiệu ứng Kiếm và chín thành phần môi trường mới. Nguồn ImageGen gốc, Aseprite 1.3.18.6, điểm neo, frame và SHA-256 nằm trong [manifest](source/visual-upgrade-2/manifest.json). [Ảnh chạy thực tế, phạm vi và kết quả kiểm tra](reviews/visual-upgrade-2/README.md) ghi trạng thái chờ director duyệt. Mở client tại `/visual-upgrade-2.html` để đi bốn hướng và xem năm chiêu ở độ phân giải màn hình.

## Kim Luân Pháp Vương — director approval feedback_02

**Approved visual preview for Phaser integration,2026-11-01**, explicit user “duyệt”. [Approval scope/hash record](reviews/bosses/kim_luan_phap_vuong_v01/director_approval.json) and [immutable input lock](approved_kim_luan_phap_vuong.lock.json) pin the selected184frames/53clips, retained source/export/map files and current choreography. Excluded24baseline attack candidates remain excluded. No game-runtime integration, missing-direction artwork or final combat balance is inferred. Prompt: docs/INTEGRATE_KIM_LUAN_PHAP_VUONG_PROMPT.md. Earlier pending statuses below are historical.

## Kim Luân feedback01 — tầm xa và voi hai chiều

Retained262raster/atlas inputs unchanged; added4original back-facing elephant run cels and4thin authored shockwave cels and revised visual trajectories only. Current exports:220cels including12props; playback184frames/53clips. [Feedback, tuning and limits](reviews/bosses/kim_luan_phap_vuong_v01/README.md). Dense12/14-lane herds, random rocks per cast, faster and wider fan/wheel/shockwave patterns and slow Dat Nhi Ba walk remain a Phaser art review, not server integration or director approval. Earlier v01 counts below are historical.

## Kim Luân Pháp Vương / Tương Dương — 2026-11-01

**Prototype, pending director review; standalone Phaser art review only.** [Review and exact coverage](reviews/bosses/kim_luan_phap_vuong_v01/README.md), [retained original PNG sources/prompts](source/bosses/kim_luan_phap_vuong_v01/README.md), [source/export/alpha/pivot hashes](exports/bosses/kim_luan_phap_vuong_v01/manifest.json), [skill bindings](reviews/bosses/kim_luan_phap_vuong_v01/asset_map.json). Three characters, 200 character/VFX/elephant/rock cels plus12props; 256terrain tiles and composed Tiled review map. Real Phaser playback selects176frames/50clips;24 baseline attack candidates excluded for facing quality. Four-direction idle/walk; dedicated actions front/down only except Hoac Do spin. Flattened AI-assisted source PNGs, no third-party game pixel sampling or claimed layered Aseprite source. Approved hero bytes retained. No encounter server/combat/multiplayer/loot integration or final visual approval is claimed.

# ART-01 arena/HUD candidate — 2026-10-30


See [component provenance/status JSON](arena_art01.manifest.json), [editable Aseprite production sources](source/arena_art01/README.md), and [actual runtime review](../docs/ART01_RUNTIME_REVIEW.md). This new candidate replaces the arena environment and HUD presentation only. Approved Cái Bang bytes remain locked; enemy/combat VFX and later-milestone art remain prototypes. Runtime director approval is pending.


## Thiên Sơn concept v01 — 2026-10-30

**CONCEPT AND RUNTIME ART APPROVED on 2026-10-30**. [Saved concept PNG](concepts/heroes/thien-son/thien-son-concept-v01.png), [provenance/approval manifest](concepts/heroes/thien-son/concept_manifest_v01.json), and [exact built-in image_gen prompt](concepts/heroes/thien-son/generation_prompt_v01.json). Original AI-assisted artwork using project character references as design/style guidance; no external sprite pack or exclusive copyright claim. Ivory/white robes with light-blue/jade accents, open folding fan, curved đao and Wind fabric/wisps. The exact approved concept is `thien-son-concept-v01.png` (user approval 2026-10-30). [Production provenance](source/characters/thien_son_v01/production_manifest_v01.json) links two 40-cel Aseprite sources, transparent PNG/JSON atlases and 80 individual frames. [Runtime review](reviews/thien_son_v01/README.md) records actual Phaser evidence. School combat abilities remain unchanged. User explicitly approved the final idle/walk/fan/đao result; [approved-byte lock](approved_thien_son.lock.json) protects the exact concept, sources and exports. Cast/hurt/death reuse is outside authored approval.

## Phase 1F arena creeps — Waves 9–12 runtime integration

[Runtime asset manifest](arena_creeps.manifest.json) records exact concept-to-sprite paths and hashes for the approved arena designs, including the existing Waves 1–8. Waves 9–12 use 255 transparent character frames across 80 directional animation tags, plus [16 original contact-effect frames](exports/effects/arena_creep_impacts/manifest.json). Approved character artwork is unchanged. [Integration report and actual arena evidence](../docs/PHASE_1F_INTEGRATION.md) records six-client combat/frame validation. Runtime artwork remains pending director review; the source production manifests retain their historical staged/prototype status.


## Võ Đang character v01 — 2026-10-30

**CONCEPT AND FINAL RUNTIME CHARACTER ART APPROVED on 2026-10-30.** The user separately approved the final result with "approved". [Approved-byte lock](approved_vo_dang.lock.json) protects89 exact concept/source/export files. Exact approved concept: [vo-dang-concept-v01.png](concepts/heroes/vo-dang/vo-dang-concept-v01.png), user message "approved", 2026-10-30. [Concept provenance](concepts/heroes/vo-dang/concept_manifest_v01.json), [production provenance](source/characters/vo_dang_v01/production_manifest_v01.json), [exact sprite generation prompts](source/characters/vo_dang_v01/generation_prompts_v01.json), and [actual runtime review](reviews/vo_dang_v01/README.md).

Original AI-assisted project raster poses derived from the approved concept;14 original generated sources retained, no reference-sheet crops, procedural illustration or third-party sprite pack. Two editable Aseprite sources export80 distinct transparent PNG cels across24 authored tags: four-facing idle2x350ms, walk4x120ms and Quyền/Kiếm normal attacks4x75ms. Quyền canvas80x80/pivot(40,64); straight-sword canvas96x80/pivot(48,64), same approximately44px body and foot baseline. Exports: `exports/characters/hero_vo_dang{,_kiem}.png` + JSON and `exports/characters/vo_dang_v01/{quyen,kiem}/frames/`. All four directions separately authored; cast/hurt/death aliases are outside authored art.

All80 source frames observed live in Phaser, all4 attack frames observed in every facing/style. Actual1280x720/1920x1080 and logical-size PNGs, six-player scale and tree-occlusion checks saved. Typecheck/build,134 unit/integration tests, asset checks and9 unique browser scenarios validated across the original run and focused rerun. Initial interpolation-test failures are preserved and explained. All97 existing approved Cái Bang/Thiên Sơn files remain hash-identical. No recordings generated. Server authority and combat remain unchanged; Kiếm debug review is presentation-only. Final runtime approval is explicit; cast/hurt/death reuse and school combat remain outside authored-art approval.


## Thieu Lam concept v01-v02 - 2026-10-31

**CONCEPT v02 AND FINAL RUNTIME CHARACTER ART APPROVED on2026-10-31.** The user explicitly approved [thieu-lam-concept-v02.png](concepts/heroes/thieu-lam/thieu-lam-concept-v02.png) on 2026-10-31 for both Quyền and Đao. The [v01 exploration](concepts/heroes/thieu-lam/thieu-lam-concept-v01.png), [v01 provenance](concepts/heroes/thieu-lam/concept_manifest_v01.json), [v02 approval/reference audit](concepts/heroes/thieu-lam/concept_manifest_v02.json) and exact [v01](concepts/heroes/thieu-lam/generation_prompt_v01.json)/[v02](concepts/heroes/thieu-lam/generation_prompt_v02.json) concept prompts are preserved. Actual school content is the lower monk in artwork/thieu-lam-thien-son.png; misleading aliases are documented without renaming references.

[Production provenance](source/characters/thieu_lam_v01/production_manifest_v01.json) records12 untouched generated pose sources, [exact sprite prompts](source/characters/thieu_lam_v01/generation_prompts_v01.json),2 editable Aseprite sources and80 distinct transparent frames across24 authored tags. Four-facing idle2×350ms, walk4×120ms and normal attack4×75ms. Quyền80×80/feet(40,64); broad đao112×80/feet(56,64), same approximately44px body scale and normalized origin(0.5,0.8). Exports are `characters/hero_thieu_lam{,_dao}.png` + JSON and `characters/thieu_lam_v01/{quyen,dao}/frames/`. [Actual Phaser review/evidence](reviews/thieu_lam_v01/README.md) distinguishes produced, integrated and verified from director-approved. All186 existing approved character files remain hash-identical. Debug đao presentation never changes server combat; active-skill art/VFX/icons/gameplay remain outside scope. Cast/hurt/death reuse is disclosed. Final approval is explicit; [approved-byte lock](approved_thieu_lam.lock.json) protects89 exact concept/source/export files. Pre-approval review evidence remains preserved.


## Thiên Sơn skill concepts v01 — 2026-10-31

**PHASE 1 CONCEPTS — ALL PENDING INDIVIDUAL EXPLICIT APPROVAL.** [Ten active-skill key-pose boards and 13-icon review](concepts/skills/thien-son/review-v01.html), [saved skill overview PNG](concepts/skills/thien-son/thien-son-skill-overview-v01.png), [saved icon-size overview PNG](concepts/skills/thien-son/thien-son-icon-overview-v01.png), [per-entry provenance/approval manifest](concepts/skills/thien-son/concept_manifest_v01.json), [exact built-in image_gen prompts](concepts/skills/thien-son/generation_prompts_v01.json), and [focused validation](concepts/skills/thien-son/validation_v01.json). Original AI-assisted pixel-art concepts reference the existing approved Thiên Sơn concept and fan/đao atlases; no character redesign or locked-asset modification. Opaque key-pose boards and 256px extracted icon concepts are review material, not production cels, final icons or VFX atlases. The basic/passive v01 board is preserved; selected v02 removes invented blade inlay. Both normal attacks reuse their approved clips; Bắc Minh Thần Công is icon-only, with no persistent aura. Wind only; all choreography/feedback remains proposed. All 27 PNGs decoded, 13 unique icons loaded at 64/48/32 CSS px, all 186 approved protected files and 601 prior Cái Bang skill files hash-identical. No Thiên Sơn skill production folders, Phaser skill preview or gameplay changes created. Individual concept/icon approval is required before production; final Phaser art approval remains separate.


## Phase 1H arena creeps — Waves 13–16

Approved Phase 1G concepts are preserved. New production assets: [Ma Khuyển](sprites/creeps/arena/ma-khuyen/manifest.json), [Tiểu Hỏa Quỷ](sprites/creeps/arena/tieu-hoa-quy/manifest.json), [Hỏa Pháp Sư](sprites/creeps/arena/hoa-phap-su/manifest.json), and [Ngưu Ma](sprites/creeps/arena/nguu-ma/manifest.json). Each has 64 distinct transparent cels / 20 directional tags, editable Aseprite and exact concept hash. [Batch provenance](sprites/creeps/arena/waves-13-16-production/production_manifest_v1.json) and [28-frame demon FX manifest](sprites/creeps/arena/waves-13-16-production/effects/manifest.json) retain generated sources and reference inputs. [Runtime mappings](arena_creeps.manifest.json) now cover Waves 1–16. Existing Waves 1–12 folders and approved artwork remain unchanged. [Integration/validation report and actual PNG evidence](../docs/PHASE_1H_INTEGRATION.md) distinguish live combat from controlled poses and the projectile-only server fixture. Normal enemy AI remains melee; no combat rules or balancing changed. Final runtime art was owner-approved on 2026-10-31; see the approval record below. No recordings or Waves 17–20 production.


## Thiên Sơn skill production v01 — 2026-10-31

**ALL TEN ACTIVE CONCEPTS AND ALL THIRTEEN ICON CONCEPTS APPROVED; PRODUCTION ART IS PROTOTYPE PENDING FINAL DIRECTOR APPROVAL.** This supersedes the earlier Phase 1 pending status. [Exact concept approval](concepts/skills/thien-son/concept_approval_v01.json), [20-component production manifest](exports/skills/thien-son/production_manifest_v01.json), [13-entry coverage/reuse](exports/skills/thien-son/coverage_manifest_v01.json), [full provenance and file hashes](exports/skills/thien-son/provenance_manifest_v01.json), [exact prompts](source/skills/thien-son/generation_prompts_v01.json), and [actual Phaser review](reviews/skills/thien-son/README.md). New school assets are separate from the approved character lock.

Actual exports: 146 tags / 534 transparent character and Wind VFX cels, 13 production icons plus their family PNG/hash-JSON atlas, and 34 editable Aseprite sources. Counts include explicit reuse: 159 new character poses, 100 new Wind source drawings, 17 approved character cels, 48 semantic character reuses, 192 cardinal Wind variants and 18 expiry reuses. Both normal attacks reuse approved clips; Bắc Minh Thần Công is icon-only with no aura. Character bodies remain approximately44 logical pixels; additional horizontal canvas space preserves cloth/blade clearance, feetY64 and normalized foot origin(0.5,0.8). Wind effects have separate origins, offsets, stages and provisional art cadence.

All exported tags/frames played in actual Phaser4.2.1. Every active skill was composed in all four facings with stable world feet, directional cue offsets, depth layering, idle recovery and effect cleanup. Icons were checked at64 CSS pixels and six simultaneous presentation actors were reviewed. The final pipeline passed typechecks,2 workflow tests,174 unit/integration tests, build and all asset validators; four browser scenarios passed there and the existing two-client scenario passed its focused rerun after enabling the existing legacy-loadout test fixture. Full failed-run/rerun history is retained. All213 initial protected/concept files, including the exact approved Thiên Sơn character, remain hash-identical. No recordings generated.

**Visual assets verified in preview; gameplay implementation pending.** The art-only client route uses the existing raster loader/animation registry and does not join a game room, equip skills, apply passive bonuses or send combat/movement commands. Final art approval remains explicit and separate.


## Thiếu Lâm skill artwork batch — 2026-10-31

**Approval gate waived by user; verified production prototypes, no independent director review claimed.** [Production/provenance](exports/skills/thieu-lam/production_manifest_v01.json), [complete14-entry coverage](exports/skills/thieu-lam/coverage_manifest_v01.json), [source/export hashes](exports/skills/thieu-lam/provenance_manifest_v01.json), [46 exact prompts](source/skills/thieu-lam/generation_prompts_v01.json), [waiver record](source/skills/thieu-lam/approval_waiver_v01.json), and [actual Phaser evidence/check results](reviews/skills/thieu-lam/README.md). All13 active skills have four-facing actions, separate Kim/Gold VFX and icons; Dịch Cân Kinh is icon-only. 26 components /182 tags /728 transparent cels /14 icons /40 editable Aseprite sources. Four new support cels are explicitly shared; cardinal VFX transforms declared. All275 protected character files and original approval-lock bytes unchanged. Final pipeline:2 workflow tests,174 unit/integration tests,build/all validators and3 Chromium scenarios passed. Presentation-only preview; no mechanics,balance,targeting or server-authority changes. Bất Động Minh Vương retains documented healing interpretation. PNG/frame-event/log evidence only; no recordings.


### Phase 1H final runtime approval — 2026-10-31

**All Waves 13–16 character sprites, animations, delivered VFX and runtime artwork approved**, explicit owner reply “all approve”. [Approval scope](sprites/creeps/arena/waves-13-16-production/approval_v1.json) and [approved-byte lock](approved_arena_creeps_13_16.lock.json) preserve exact concept/source/export/provenance files. Gameplay and the existing melee recipes remain unchanged; projectile rendering is fixture-tested only. Phase 1I has not started.


## Võ Đang skill artwork — approved 2026-10-31

**FINAL DIRECTOR ART APPROVAL RECORDED.** All10 active character/VFX sets and13 production icons approved after the Phaser review.20 components /636 exported cels /163 tags /33 editable Aseprite sources; explicit approved-character reuse and cardinal transforms are documented. [Production manifest](exports/skills/vo-dang/production_manifest_v01.json), [13-entry delivery and verification](reviews/skills/vo-dang/README.md), [final approval register](reviews/skills/vo-dang/final_approval_register_v01.json), [exact approved-file lock](approved_vo_dang_skills.lock.json). Original89-file Võ Đang character baseline unchanged. Visual assets verified in preview; gameplay implementation pending. No mechanics or passive world effect added.


## Phase1I +1J — Waves17–20 production complete,2026-10-31

Concepts are auto-approved by the current user; all four production sets are integrated and runtime-verified, with no independent final runtime director approval claimed. [Master/approval mapping](concepts/arena-creeps/waves-17-20/concept_manifest_v1.json), [production/provenance](sprites/creeps/arena/waves-17-20-production/production_manifest_v1.json), [runtime textures/animation keys](arena_creeps.manifest.json), [actual PNG comparison and validation](../docs/PHASE_1J_INTEGRATION.md), [exact file inventory](sprites/creeps/arena/waves-17-20-production/delivery_files_v1.json).

Ảnh Ma,Ma Tướng Thiết Giáp,Huyết Ma Pháp Sư,Ma Vương Tiên Phong each have64 distinct transparent frames and20 four-facing state clips, PNG/JSON atlas and editable Aseprite source. Separate final-creep VFX:28 frames/seven clips. All256 character and28 effect frames played in actual Phaser with six clients, real combat/rewards and unchanged enemy stats/wave definition. Final pipeline passed226 unit/integration tests,2 workflow tests, all configured asset validators, build/typechecks and the complete browser scenario. Earlier approved inputs remain hash-identical.

Stock invasion AI remains melee; the blood projectile is authoritative-state renderer artwork verified using a labeled zero-damage server fixture. No new combat/balance/spawn/HUD/environment behavior. No recording. Arena Creep artwork production track now covers Waves1–20.

## M3C2 Võ Đang retained runtime integration

No new artwork. Approved character PNG/hash atlases: `assets/exports/characters/hero_vo_dang*`; approved ten skill character/VFX pairs and thirteen icons: `assets/exports/skills/vo-dang/`. Exact per-ID phases,dimensions,pivots,fps,source/license/reuse/approval locks and unused/missing assets are in `docs/M3C2_SKILL_ASSET_MAP.md`; actual audit is `docs/evidence/m3c2/asset-inventory.json`. Runtime verification is distinct from the retained director art approval.

## Skill animation review v01 — 2026-11-01

DIRECTOR_APPROVED_PREVIEW_PENDING_GAMEPLAY_INTEGRATION. Three new original built-in image_gen source sheets (lotus, golden palm, silver-blue sword), exact prompts/output IDs, PNG alpha and source hashes retained in [source records](source/skills/animation-review-v01/generation.json) and [export manifest](exports/skills/animation-review-v01/manifest.json).24 cels in three PNG/JSON atlases. Additional authored body/VFX cels are retained reuse. Integrated only into an opt-in art-only Phaser scene, never gameplay skill registries. Existing approval locks unchanged; [director approval and exact hashes](reviews/skills/animation-review-v01/director-approval.json) record approval of this preview only. [Review scope and confirmed future counter rule](../docs/ANIMATION_REVIEW_V01.md). All 13 preview selections approved by the director on 2026-11-01. Gameplay integration is explicitly deferred. No recordings or natural-combat approval claimed.


## Approved animation runtime integration — 2026-11-01

The subsequent director instruction authorizes gameplay integration on `wip/m3d/animation-change`, superseding the historical preview-only deferral above. The same three PNG/JSON VFX components and retained choreography are consumed under exact115-file hash verification. No artwork regenerated. See `docs/ANIMATION_CHANGE_INTEGRATION.md` for server-driven adapters, real multiplayer evidence and provisional tuning.

## Cổ Mộ dungeon card — 2026-11-01

The Lý Mạc Sầu selector card reuses `assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png` byte-for-byte as `/assets/co_mo/arena_preview.png`. This is an original image_gen illustration with retained provenance/prompts and explicit preview approval in `assets/reviews/ly_mac_sau_v02/art_approval_v02.json`; preparation verifies that lock and the validator checks public-copy equality. Usage is a menu thumbnail, not playable-map artwork or a new art generation/approval. Runtime environment still uses the existing Tiled map, tiles and props.
## Creep combat runtime reuse — 2026-11-06

`apps/game-client/src/creep-combat-art.ts` reuses the original arena creep, forest, desert-arrow, beach and Hell PNG/JSON assets; no new bitmap or approved-byte replacement. Source provenance remains in their retained manifests. This adapter adds server-timed warnings, missiles and field composition for the authorized creep abilities. New compositions are runtime review candidates, not new director-approved artwork. Sources and inspected reference-path corrections: [CREEP_UPGRADE.md](../docs/CREEP_UPGRADE.md).

## Vương Trùng Dương

The final boss runtime candidate uses two generated raster atlases with 48 character cels and 36 effect cels. [Production sources, exact prompts and hashes](source/bosses/vuong-trung-duong/provenance.json), [atlas origins and animation timing](exports/vuong-trung-duong/animation.json), and [Phaser review evidence](../docs/VUONG_TRUNG_DUONG_RUNTIME.md). The three concept v01 images are approved inputs. Runtime review is pending.

## Renovation v1 — complete roster preview, 2026-11-05

Candidate awaiting director review. [Production recipe and scope](source/renovation-v1/README.md), [exact generation prompts](source/renovation-v1/generation-jobs.json), [provenance](source/renovation-v1/PROVENANCE.json).73 original twenty-cel body sheets plus accepted Võ Đang Kiếm reuse cover74 forms:8 hero styles,20 invasion creeps,24 dungeon creeps,7 forms of5 wave bosses,11 helpers/minions,4 dungeon bosses. Eight new original grounds with48 independent props, plus the accepted central arena. Aseprite editable files and PNG/JSON atlases are versioned under `source/renovation-v1/` and `exports/renovation-v1/`.

The full-viewport interactive `/renovation-preview.html` reviews body idle/walk in four facings at native gameplay scale, equal-height original comparisons and all nine scene choices. This is an art preview; normal multiplayer art registries and all skills remain unchanged. Existing approved originals and locks are retained. New art has no director approval yet. PNG evidence and live frame observations are recorded under `reviews/renovation-v1/`; no routine videos or animated recordings.

## Renovation v3 — all school and boss cast artwork, 2026-11-06

The v2 pilot style was accepted with three requested corrections and explicit authorization for bulk extension. New v3 artwork is integrated for review, without modifying v1/v2 approved sources. [Prompts and production contract](source/renovation-v3/README.md), [source hashes/provenance](source/renovation-v3/provenance.json), [runtime coverage and limits](../docs/RENOVATION_ALL_SKILLS.md). There are 464 new body keyposes, 64 retained pilot body keyposes and 372 new effect source cels, exported through Aseprite. 174 VFX replacement atlases preserve existing frame identities/virtual registrations. These are shared authored poses and effect phases; 4,396 replaced runtime frame references are not 4,396 independent drawings. New final-art approval remains pending.

## Thiên Sơn Đao · Tam Liên Trảm — đã duyệt trong Phaser

Atlas Tam Liên Trảm dùng 16 cel PNG 160×144 với chân tại (80,112), ba đao ảnh, dải gió hoa đào và icon QTE. Phaser chọn cel theo nhịp server, lật riêng đao ảnh trái → phải và hạ đao ảnh phải → trái. Hàn Nguyệt dùng lưỡi bóng với chiều dài ×1,5 và bề rộng ×1,2 trong các cel đứng/đi. Các cel tấn công dùng lưỡi trong bản artwork đã duyệt. HUD phím S có kích thước 200 × 46 px và neo phía trên thanh kỹ năng. [Nguồn và prompt](source/skills/thien-son/tam-lien-tram-2026-11-09/prompts.md) · [Xuất atlas Hàn Nguyệt](exports/characters/thien-son-han-nguyet/provenance.json) · [Kiểm tra trong Phaser](../docs/evidence/sessions/thien-son-tam-lien-hud-layout/).

## Đài Hồng Mộc · Lôi Đài

- `source/loi-dai/hong-moc.png` and `victory-fireworks.png` are original ImageGen rasters derived from the director-selected rectangular concept and approved victory artwork.
- `exports/loi-dai` contains the 836×470 court plate, two masked rail overlays and a 16-frame 132×132 alpha fireworks sheet at 14 FPS. The runtime preview uses the existing authored hero sprites. See [integration details](../docs/LOI_DAI.md).

## Đài Hồng Mộc v2

`source/loi-dai-v2` stores original ImageGen paving art and editable masks for the approved court source. `exports/loi-dai-v2` contains native-density ground and individually placed scenery PNGs with source hashes, depth and sizes in the manifest. Runtime art review is pending. [Integration](../docs/LOI_DAI.md)
