# Renovation v6 — selective M3D reversions and motion corrections

Director requested these changes on2026-11-06 in `wip/m3d/visual-upgrade-2`. This is a visual follow-up. The v5 dragon's fixed cast-time impact point, phases and one landing hit, seven sword strokes and enemy-only confinement remain unchanged. No combat range, damage, resource or boss AI tuning was added.

| Request | Replacement contract |
| --- | --- |
| Hỏa Vân | Original M3D release/projectile/impact aliases; preserve the renovated caster body and unrelated palm skills. |
| Kháng Long | Hide the hand-bearing activation/buff atlas; retain actual owner-following burn art/status and HUD state. |
| Hàng Long | Five genuinely drawn camera views (right/front-diagonal/front/back-diagonal/back), four serpentine body/tail poses each. Eight facings use three horizontal mirrors. Sprite rotation is always0; server position, phase, target and impact timing remain authoritative. |
| Phá Giáp | Sixteen coherent held-staff cels: raise, extend, downward contact, recovery in four facings. No detached V5 staff prop. A separate golden downward trail precedes the actual strike; transparent ground cracks appear on strike and register to the real hit point. |
| Bách Liệt | Longer/larger forward wind-and-petal cuts; same actual hit count/range. |
| Thái Cực | Remove only the dome drawing, keep the formation and hostile creep/boss confinement; allies pass. |
| Đông Tà | M3D action body and all effects. Shared Mai/Hoàng Dung textures remain new through separate original aliases. |
| Mai Siêu Phong | Original Độc Cốt Bạo body/pouch/burst/pool; other new skill art remains. |
| Tây Độc | Original M3D casts/effects except new Vạn Độc Phi Châm body, warning and needles via a dedicated atlas alias. |
| Nam Đế | Original M3D except the Phật Quang family (`nam_de_aura`, `phat_quang_pho_chieu`), including new ring, spotlight and sky effect. |
| Bắc Cái / Vương | Original M3D cast/effect families; approved renovated idle/walk retained. |

The previous v5 reversions, school portraits and Cổ Mộ founder pair remain. Query `renovationSkills=v5` compares the previous iteration; `renovationSkills=old` compares original M3D combat art. Normal/skill/boss review ports remain5546/5547/5548 with servers2946/2947/2948; fresh rooms are needed after owned-service restart.

## Native art and provenance

Four native PNG/JSON atlases contain 44 unique cels. Body foot pivot 200/320 on a 400px canvas; standing-body reference 88 native px; effects use 512px virtual canvases. Sixteen measured source boot midpoints keep the body anchored while the descending staff extends below the soles. The dragon's generated layout is not an exact equal-height grid, so measured transparent row gaps 215/435/690/920 define the cuts. Aseprite performs cropping, uniform bilinear fitting, alpha-noise cutoff 12, packing and editable-source export. The first staff sheet overlaps cells and is retained as rejected provenance; `staff_action_clean.png` is the selected edit. Source prompts, timings, raw images, export plan/Lua and provenance are in `assets/source/renovation-v6`. Python validates rasters read-only. Existing approved sources and locks are preserved.

## Verification scope

`tests/renovation-v6.test.ts` covers view selection, zero image rotation, frame cycles, safe staff clocks, actor restoration policy and exception routing. Live hero coverage uses real keyboard Q, legal server-side max-rank builds/durable targets, per-render frame history, actual cast/phase/hit events and peer HP acknowledgement. Boss coverage selects encounter prerequisites/abilities on the server, then observes their real execution and source files; it is not a claimed natural five-boss victory. The production profile retains six actual Phaser clients and natural replicated combat. No recordings or trace screenshot streams are created. Passing tests does not approve artwork; director review is pending.

`pnpm check:final --config playwright.renovation-v6.config.ts` passed preparation, TypeScript, 18 workflow regressions, all 768 unit/integration tests, the production build and all 28 asset validators. Its browser stage failed: RPC polling missed one short dragon heading, and one screenshot write returned a Windows `UNKNOWN` error. The failed pipeline timing report remains under `docs/evidence/sessions/renovation-v6-final/check-workflow/`.

The renderer now records actual displayed headings per projectile in the existing frame-observation registry, so the assertion reads rendered history instead of depending on RPC polling cadence. Presentation/authority rules are unchanged. The affected client/tools were typechecked, the production client rebuilt for port 2950, and the two browser profiles retried with `node tools/run-playwright.mjs test --config playwright.renovation-v6.config.ts`. The boss profile passed all 50 cases. That retry exposed an early staff-effect observation window; the helper now awaits the actual displayed arc/crack cels. Tools typechecking and the affected hero profile were rerun with the same command plus `--grep 'four-facing'`: PASS, all 24 cases, eight actual dragon headings in each facing, four held-staff poses and at least three displayed arc/crack cels in each facing. Six-client natural combat produced 19 hit events and peer HP agreement.

Boss PNG capture is limited to representative restorations and retained exceptions; frame/source/peer assertions still cover every requested boss skill. Earlier uncurated V6 iteration PNGs are preserved in `.cache/renovation-v6-iteration-pngs`; existing historical evidence was not moved. Useful retained PNGs: `hang_long_hoa_vu.png`, `pha_giap_bong.png`, `pha_giap_bong-crack.png`, `thai_cuc_tran.png`, the six boss `*-review.png` captures and `six-player-combat.png` / `six-player-after.png`. Live screenshots were inspected at normal gameplay scale. Encounter fixtures can retain overlapping prior effects/QTE state; source/frame assertions identify the requested ability and these screenshots are not isolated marketing images or a natural boss-clear claim.

The production client is then rebuilt with only its endpoint changed back to server 2946. Fresh-room smoke checks verify each live service's run identity, endpoint, loaded V6 atlases, expected level/review flags and absence of browser errors. Artwork remains a candidate for director review.
