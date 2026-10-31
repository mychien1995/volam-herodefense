# Thiếu Lâm skill artwork — complete batch

**Approval gate waived by user.** New skill art remains a verified prototype; no separate director approval or new approval lock is claimed. Approved base character art and all275 protected files remain byte-identical.

| ID / exact Vietnamese name | Character cels | VFX cels | Cast cadence |
|---|---:|---:|---|
| la_han_quyen — La Hán Quyền | 16 | 40 | 90ms/frame |
| vi_da_quyen — Vi Đà Quyền | 16 | 40 | 90ms/frame |
| dai_luc_kim_cuong_chuong — Đại Lực Kim Cương Chưởng | 16 | 64 | 90ms/frame |
| toan_phong_thoai — Toàn Phong Thoái | 16 | 28 | 90ms/frame |
| hoanh_tao_cuoc — Hoành Tảo Cước | 16 | 64 | 90ms/frame |
| vo_anh_cuoc — Vô Ảnh Cước | 16 | 64 | 90ms/frame |
| kim_cang_bat_hoai — Kim Cang Bất Hoại | 16 | 16 | 110ms/frame |
| nhu_lai_niet_ban — Như Lai Niết Bàn | 16 | 16 | 110ms/frame |
| tru_ta — Tru Tà | 16 | 52 | 90ms/frame |
| kim_quang_ho_tran — Kim Quang Hộ Trận | 16 | 16 | 110ms/frame |
| tam_gioi_quy_thien — Tam Giới Quy Thiền | 16 | 52 | 90ms/frame |
| bat_dong_minh_vuong — Bất Động Minh Vương | 16 | 16 | 110ms/frame |
| nhu_lai_thien_diep — Như Lai Thiên Diệp | 16 | 52 | 110ms/frame |
| dich_can_kinh — Dịch Cân Kinh | — | — | Passive icon only |

Every active has a versioned concept, four-facing action clip, separate VFX, icon, editable sources, transparent individual cels, PNG/hash-JSON atlases and .animations.json. Passive Dịch Cân Kinh has an icon only.

Character:4cels per facing (down,left,right,up), one-shot360ms or440ms. Canvas128x120, feet(64,96), normalized origin(0.5,0.8), approximately44px upright body. Vô Ảnh Cước contact art has intentional2px/1px lift within the fixed world anchor. Larger transparent canvases retain body scale.

VFX:4cels per stage,70ms/cel=280ms one-shot; loop/travel stages100ms/cel=400ms loop. Canvas128x128,192x192 or256x256 with centered sprite origins, stage offsets and drawn ground-plane anchors. Timings, radii and preview lifetimes are presentation proposals for later authoritative integration.

Totals:26 components,182 animation tags,728 exported transparent cels;204 distinct character rasters plus4 explicitly shared support cels;520 VFX rasters including declared cardinal transforms;14 icons64x64;40 editable Aseprite sources. Four left-facing Bất Động Minh Vương support cels share the new Kim Quang Hộ Trận support clip to correct facing; its other12 cels and healing VFX remain separate. No approved normal-attack clips were regenerated.

Complete per-skill paths and parameters: assets/exports/skills/thieu-lam/coverage_manifest_v01.json and production_manifest_v01.json. File hashes and original PNG mapping:provenance_manifest_v01.json. Exact46 generation/correction prompts:assets/source/skills/thieu-lam/generation_prompts_v01.json. Measured placements:frame_placements_v01.json. Waiver:approval_waiver_v01.json.

For each active ID:concept assets/concepts/skills/thieu-lam/<id>/<id>_concept_v01.png; editable sources assets/source/skills/thieu-lam/<id>/{character,vfx}/<id>_{character,vfx}.aseprite and <id>/icon/icon.aseprite. Exports assets/exports/skills/thieu-lam/<id>/<id>_{character,vfx}.{png,json,animations.json}, icon.png and {character,vfx}/frames/. Original PNGs and correction versions remain in source/generated. First prototype exports/editables are preserved under assets/reviews/skills/thieu-lam/pre_correction_v01/.

Actual Phaser verification:all182 tags and every frame advanced; all four facings composed; stable origins/world anchors; recovery to approved idle; effect cleanup; character-only,VFX-only,combined,light/dark,six simultaneous effects; approved normal clips;14 icon pairings at64/44/32px. Normal/empowered finishers were checked separately. Passive produced no world aura. PNGs/frame events/logs only, no recordings.

Evidence:phaser_verification_v01.json, phaser_command_v01.log and playwright_results_v01.json in this folder. Each skill folder contains character,vfx,combined_down/left/right/up,light,dark,six PNGs. icons_hud_1280x720.png shows all14 icons. No screenshot alone is claimed to prove animation.

Commands actually run:

~~~powershell
python assets/source/skills/thieu-lam/prepare.py
node assets/source/skills/thieu-lam/build.mjs --assemble
python -X utf8 scripts/verify-thieu-lam-skills.py
node assets/source/skills/thieu-lam/smoke.mjs
pnpm check:final --config playwright.thieu-lam-skills.config.ts tests/e2e/thieu-lam-skills.spec.ts tests/e2e/gameplay.spec.ts --grep 'complete Thiếu Lâm|two clients agree|ranged projectile'
node tools/run-playwright.mjs test --config playwright.thieu-lam-skills.config.ts tests/e2e/thieu-lam-skills.spec.ts
node assets/source/skills/thieu-lam/verify_basics.mjs
~~~

After the full pipeline, final PNG inspection prompted a presentation-only Như Lai Thiên Diệp release/travel offset and preview-arrival refinement to keep the face clear. The complete13-skill Phaser test passed its focused rerun afterward; full-pipeline results are preserved in final_pipeline_playwright_v01.json and latest focused results in playwright_results_v01.json.
Final results:TypeScript and test/tool typechecks PASS;2 workflow tests PASS;174 unit/integration tests PASS;production build PASS;all asset validators PASS;3 Chromium tests PASS (full skill-art preview, two-client combat/cadence/progression, fixed projectile trajectory). Final pipeline233.66s. Existing large-client-chunk warning remains. Aseprite1.3.18.6 and actual Phaser4.2.1 used.

Corrected iteration failures:Playwright initially initialized before the repository browser-cache setting; dynamic import fixed it. Correcting the drawn ground-plane anchor initially triggered a clipping assertion; larger transparent VFX canvases resolved it. Incorrect left rows and attack-like support casts were replaced with separately preserved original correction drawings. Tiny disconnected alpha debris was removed.

Approved normal-clip playback reads exact per-frame durations directly from the approved atlases. A final focused Phaser check verified every timing boundary, all4facings, both weapon sets, idle recovery and zero new normal-attack VFX. Evidence:approved_basic_timing_v01.json. No approved sprite bytes changed.

Presentation-only scope:no network/simulation imports or live skill integration. Combat mechanics,balance,targeting,damage,healing,collision,RNG,server authority and combo eligibility remain unchanged. Bất Động Minh Vương follows currently documented healing art; possible mitigation redesign remains open. Empowerment is an optional same-target presentation, never an automatic global bonus. Dịch Cân Kinh has no cast/permanent aura. Existing approved idle appears between clips; no new hurt/death states requested.

Preview:run node assets/source/skills/thieu-lam/serve.mjs 8768 then open http://127.0.0.1:8768/assets/source/skills/thieu-lam/review.html. All controls/overlays remain within one dominant game viewport.
