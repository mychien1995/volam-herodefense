# Võ Đang skill art — Phase 1 review, 2026-10-31

**All10 selected skill concepts and13 selected icon concepts explicitly approved: user “all approved”,2026-10-31. Production artwork and Phaser verification are now complete; final production approval is recorded. See [current production review](../../../reviews/skills/vo-dang/README.md).**

Current review: [ten action boards](vo-dang-skill-overview-v02.png), [thirteen icons at 44px/32px and grayscale](vo-dang-icon-overview-v02.png). Full boards and selected icons are linked below. Earlier versions remain intact. The icon embedded in an action board does not approve its separate icon concept; use the selected icon version below.

This is the Phase1 concept archive. The user approved every selected concept and icon. Subsequent production is documented in the current review above; final runtime art approval was separately granted after Phaser delivery. Existing basic character approval is retained. A concept sheet is not an animation.

## Read and audit

Read AGENTS.md, DECISIONS.md, CONTENT_DATA.md, COMBAT_SYSTEM.md, ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, ART_ASSET_GUIDE.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md, UI_UX_SPEC.md and docs/DEVELOPMENT_WORKFLOW.md. Applied the local pixel-art-pipeline and built-in imagegen skills.

Inspected the approved hero concept, both complete runtime character atlases, source/atlas metadata, approval lock and existing Phaser review PNG. Also inspected the school, arena, world, four dungeon, three menu and both negative-reference families in static PNG contact sheets. Reference notes follow actual contents: vo_dang_art_direction_reference.png is absent; vo_dang_character_reference.png is the intended direction sheet. current_codex_dashboard_anti_reference.png contains character artwork; wuxia_town_world_reference.png contains the actual dashboard negative. in_game_world_reference.png now exists, despite an older README saying otherwise. No reference files were renamed or modified.

Art readout: expressive oversized face, black topknot with white ribbon, layered ivory/charcoal Taoist robes, white sash and yin-yang buckle, silver trim, black boots, slender silver straight sword. Preserve top-lit highlights, crisp dark edges, compact silhouette and elevated orthographic three-quarter overworld perspective. The rejected runtime screenshot is flat and procedural; it is not the target for this set.

Before generation, assets/concepts/skills contained Cái Bang and Thiên Sơn only; assets/source/skills and assets/exports/skills contained Cái Bang only. Searched asset names and client/data registrations for all canonical Võ Đang IDs and sword-energy aliases. No Võ Đang skill concepts, approval records, authored skill clips, school VFX, Kiếm Khí production frames or approved school icons were found. Generic fire/VFX and generic icon_palm are not school-approved substitutes. Existing `cast` tags alias basic attack frames; their authored-art approval is explicitly excluded. Both approved normal attacks remain complete and reusable.

Cái Bang conventions inspected: concept_manifest_v1.json, production_manifest_v1.json, source README, a concept contact sheet and real icon PNG. Follow per-skill character/vfx/frames organization, editable Aseprite source, retained PNG/hash-JSON atlas and .animations.json with ordered frames, cardinal direction, dimensions, duration, origin/pivot, stage, placement, directional offsets and timing-authority notes. Its historical production and runtime-integration records are distinct; old recording evidence does not create a recording requirement.

## Coverage and selected review files

All active-skill concepts and all thirteen icon concepts are **approved**. The selected paths below are the approved directions. The remaining columns retain the historical pre-production audit; use the linked current production review for produced/verified status. `New` below means a new animation is still required after approval, not already produced. `Reuse` means the protected approved normal attack only.

| Stable ID | Vietnamese name | Selected action concept | Selected icon | Character animation | VFX | Export / Phaser | Gameplay / final approval |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `luong_nghi_thu` | Lưỡng Nghi Thủ | [v01](luong_nghi_thu-concept-v01.png), approved | [v01](luong_nghi_thu-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `huyen_am_chuong` | Huyền Âm Chưởng | [v01](huyen_am_chuong-concept-v01.png), approved | [v01](huyen_am_chuong-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `duong_khi_kich` | Dương Khí Kích | [v01](duong_khi_kich-concept-v01.png), approved | [v02](duong_khi_kich-icon-concept-v02.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `thai_cuc_than_cong` | Thái Cực Thần Công | [v01](thai_cuc_than_cong-concept-v01.png), approved | [v01](thai_cuc_than_cong-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `thai_cuc_tran` | Thái Cực Trận | [v02](thai_cuc_tran-concept-v02.png), approved | [v01](thai_cuc_tran-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `that_tinh_kiem` | Thất Tinh Kiếm | [v01](that_tinh_kiem-concept-v01.png), approved | [v01](that_tinh_kiem-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `nhan_kiem_hop_nhat` | Nhân Kiếm Hợp Nhất | [v01](nhan_kiem_hop_nhat-concept-v01.png), approved | [v01](nhan_kiem_hop_nhat-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `bat_quai_kiem_tran` | Bát Quái Kiếm Trận | [v01](bat_quai_kiem_tran-concept-v01.png), approved | [v01](bat_quai_kiem_tran-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `toa_sat_bac_do` | Tọa Sát Bác Đồ | [v01](toa_sat_bac_do-concept-v01.png), approved | [v02](toa_sat_bac_do-icon-concept-v02.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `van_kiem_quy_tong` | Vạn Kiếm Quy Tông | [v01](van_kiem_quy_tong-concept-v01.png), approved | [v01](van_kiem_quy_tong-icon-concept-v01.png), approved | New, missing | Stages in concept; frames missing | Not started | Pending / pending |
| `vo_dang_quyen` | Võ Đang Quyền | [Approved character](../../heroes/vo-dang/vo-dang-concept-v01.png); no new action requested | [v01](vo_dang_quyen-icon-concept-v01.png), approved | Reuse approved basic; unchanged | N/A; none added | Existing character verified historically; new icon not exported | School mechanic pending / basic approved; icon pending |
| `vo_dang_kiem` | Võ Đang Kiếm | [Approved character](../../heroes/vo-dang/vo-dang-concept-v01.png); no new action requested | [v02](vo_dang_kiem-icon-concept-v02.png), approved | Reuse approved basic; unchanged | Kiếm Khí missing; not yet approved | Existing character verified historically; new icon not exported | School mechanic pending / basic approved; icon pending |
| `thai_cuc_tam_phap` | Thái Cực Tâm Pháp | N/A, icon only | [v02](thai_cuc_tam_phap-icon-concept-v02.png), approved | N/A | N/A; none added | Not started | School mechanic pending / pending |

## Visual distinctions and production notes

- Lưỡng Nghi Thủ: precise forward palm, paired light/dark pressure mark and weakening chevron. Huyền Âm Chưởng: short Yin crescent and separate movement/attack-cadence slow feedback. Dương Khí Kích: palm snap, diamond contact and success-only mana-return trail; miss has no return.
- Thái Cực Thần Công: thin personal shield contour, activation, sustained state, contact absorption and ending. Thái Cực Trận: circular flowing ground boundary, open interior, sustained loop, periodic pulse and ending. Its v02 removes incidental sword props and upright streaks from v01.
- Thất Tinh Kiếm: compact rising and crossing melee cuts. Nhân Kiếm Hợp Nhất: planted release, straight qi travel, piercing contact/exit and dissipation. Bát Quái Kiếm Trận: open octagonal sword formation with sustained state, inward damage pulse and ending.
- Tọa Sát Bác Đồ: readiness, attack received, triggered retaliation, recovery and neutral/untriggered ending are separate presentation states; no shield or invulnerability. Vạn Kiếm Quy Tông: preparation, release sweep, separated frontal waves, straight divergent headings, impacts and fade.
- v02 icons simplify Dương Khí Kích (palm/diamond/return), counter (guard blade/returning hook), basic sword (physical sword/follow arc) and passive (yin-yang/two resource drops). Original v01 portraits/ornament were too busy or similar at HUD scale. Both versions are retained, but v02 is the selected review candidate. Embedded board icons are earlier concepts for those skills.
- Actual-size inspection of the saved icon sheet used 44px, compact32px and grayscale44px, matching current skill-menu CSS sizing. Major palm, crescent, shield, field, crossed slash, lance, octagon, hook, fan and droplet silhouettes remain distinguishable. Fine ornament, small debuff chevrons and sword-hilt detail lose detail at32px; final icons need pixel-level cleanup and one shared frame/padding template after approval. No claim of final HUD/Phaser verification is made.

## Preserved baseline and later production contract

All89 protected concept/source/export files match assets/approved_vo_dang.lock.json. Quyền remains80×80/feet(40,64), Kiếm96×80/feet(48,64), both about44 logical pixels tall with origin(0.5,0.8). Idle2×350ms, walk4×120ms, normal attack4×75ms. Skill-specific poses must be separate assets outside that lock, with this body scale and foot baseline preserved; bigger VFX canvases may have their own origins. Do not infer production frame timing from these boards.

After explicit concept approval, produce only the approved scope under assets/source/skills/vo-dang/<id>/character, vfx and icon and matching exports/reviews. Character/VFX remain separate, with documented cardinal variants, offsets and event-stage relationships. Approved basic animations are reused unchanged. No new passive world effect is approved or requested.

## Unresolved mechanics and illustration limits

CONTENT_DATA labels effects as proposed; the user's current brief defines the visual identities being reviewed, not final tuning. Thái Cực Thần Công toggle versus timed duration remains unresolved. No drawing decides shield duration, exact hit/wave count, field placement/radius, pulse cadence, counter window/eligibility or basic Kiếm Khí proc chance/range. Those depend on future authoritative data/events. Yin–Yang is visual identity, not added elemental damage.

The board titles/stages use ASCII/English for legibility; this table and manifests retain exact Vietnamese names. Diagram arrows and repeated poses describe presentation, not movement or tracking. In particular Nhân Kiếm's horizontally arranged lower pose row is not a dash. Stars/spectral swords are ornament, not hit counts. Formation-adjacent targets illustrate feedback only; actual eligibility must use authoritative inside-zone state. Side-view projectile labels describe isolated VFX profiles, not a camera change. All boundaries/footprints are schematic. At production, retain small effects, open zone interiors and clear release heading rather than copying illustrated scale literally.

No new Phaser or gameplay claim: existing approved character verification is historical. New skill preview/export checks start only after concept approval. Where mechanics do not exist, later report: “Visual assets verified in preview; gameplay implementation pending.” That sentence is not yet a claim for this concept-only phase.

## Provenance, approval and checks

Original AI-assisted concepts generated with OpenAI built-in image_gen.imagegen; no external sprite pack, no exclusive copyright or hand-pixelled authorship claim. Director references are direction-only and their third-party licenses were not independently established. Ten initial icon concepts are exact crops from these newly generated action boards, not from reference sheets; normals/passive and four v02 revisions are standalone generated concepts. Opaque concept boards/icons are deliberate; transparent production assets have not been made.

- [Current concept manifest](concept_manifest_v02.json): paths, dimensions, SHA-256, reference hashes, pre-generation audit, mechanics dependencies and per-entry status.
- [Independent approval register](approval_register_v02.json): ten active concepts and thirteen icons approved separately, with exact hashes and no fabricated approval evidence.
- [Initial prompts](generation_prompts_v01.json), [icon revision prompts](generation_prompts_v02.json), [briefs](briefs_v01.json): actual prompts, reference paths and original generated output filenames.
- [Validation report](validation_v02.json): actual command results and file checks.

Actually run:

```text
python -X utf8 assets/concepts/skills/vo-dang/build_review_v01.py
PASS: 13 entries; 10 selected action boards; 13 selected icon concepts;32 PNGs including preserved versions/overviews;89 approved files unchanged.
python -X utf8 scripts/verify-vo-dang.py
PASS: approved character lock/concept hash;80 distinct authored PNG cels;24 tags; binary alpha; bounds/clipping; feet; durations; frame/atlas equality and source paths.
```

Saved overviews and every generated concept output were visually inspected; the icon review includes actual44/32px and grayscale previews. No typecheck, gameplay/unit suite, build, new Phaser run or pnpm check:final was run for this concept-only change: no runtime inputs, loaders or gameplay code changed. No video/GIF/recordings were generated. Full relevant final production/Phaser validation remains required after approved production assets exist.

Approval recorded: user “all approved”,2026-10-31. Scope: all10 selected active skill concepts and all13 selected icon concepts. Production/final approval is tracked separately in the current production review.
