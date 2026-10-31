# Phase 1E — Arena creep concepts, Waves 9–12

Status: **concept proposals awaiting owner approval**. Generated and visually reviewed on 2026-10-30. Five original AI-assisted concept PNGs, each 1536×1024. These are design boards, not animation atlases or runtime sprites.

## Files and designs

| File | Design |
|---|---|
| `arena_creeps_09_12_concept_sheet.png` | Master comparison of all four enemies. |
| `cuong_thi_concept.png` | **Cương Thi:** rigid pale sage-gray undead, indigo/charcoal tattered robe, crimson trim, dark round cap and ochre forehead talisman. Green eyes and pale stiff hands identify it at small scale. |
| `oan_linh_concept.png` | **Oán Linh:** floating blue-violet Chinese robes, navy hair, luminous face, claw hands and curling spectral tails. A dense core and dark outline preserve visibility. |
| `thiet_giap_kho_lau_concept.png` | **Thiết Giáp Khô Lâu:** Wave 7's cracked ivory skull, teal cloth and bronze lineage, upgraded to heavy paired pauldrons and lamellar armor, amber eyes, right-hand straight jian and left-hand cloud-scroll shield. |
| `thach_nhan_concept.png` | **Thạch Nhân:** broad Chinese stone guardian, huge fists, weathered taupe-gray rock, jade chest/eye/rune accents, moss and small vegetation on its anatomical left shoulder. |
| `concept_manifest_v1.json` | Dimensions, hashes, source references, design descriptions, validation and approval concerns. |
| `generation_prompts_v1.json` | Exact built-in generation/edit prompts, image inputs and selected/discarded output filenames. |

Every enemy has full FRONT/BACK/LEFT/RIGHT static views, one attack illustration, representative palette swatches, weapon or identifying-feature detail and an approximate comparison with Cái Bang and Wave 7's skeleton. No attack drawing is an animation or a separate skill-effect asset.

## Reference inspection and visual consistency

The actual approved concept images were opened and inspected:

- `assets/concepts/arena-creeps/waves-01-04/arena_creeps_01_04_master_v1.png`
- `assets/concepts/arena-creeps/waves-05-08/arena_creeps_05_08_concept_sheet.png`
- `assets/concepts/arena-creeps/waves-05-08/hac_y_sat_thu_concept.png`
- `assets/concepts/arena-creeps/waves-05-08/ta_tang_concept.png`
- `assets/concepts/arena-creeps/waves-05-08/kho_lau_kiem_si_concept.png`
- `assets/concepts/arena-creeps/waves-05-08/kho_lau_cung_thu_concept.png`

All eight actual production `spritesheet.png` files under `sprites/creeps/arena/` were inspected, along with the two production review images `review/idle_1280x720.png` and `waves-05-08-production/review/idle_1280x720.png`, and the actual Cái Bang idle PNG. The rejected placeholder screenshot was also inspected as an anti-reference. The manifest lists the exact atlas paths.

The master generator received both approved master sheets, the individual Wave 7 skeleton concept, its actual production atlas and the Waves 5–8 production comparison directly as image references. The individual generators received the corrected new master, approved Waves 5–8 master and actual production comparison directly. Image-reference input was supported and used throughout; these were not text-only generations.

The new concepts preserve the approved concept set's compact chibi proportions, elevated orthographic three-quarter overworld camera, dark stepped outlines, clustered shading, warm upper-left light and muted materials with selective bright accents. The spirit and golem extend the supernatural palette without changing the camera. Wave 11 retains Wave 7's skull, bone joints, teal rags, rust-bronze materials and straight ring-pommel jian, while paired heavy armor, amber eyes and a large shield make it immediately broader and more powerful. The golem's fist span and squat rock mass make it the heaviest regular-enemy proposal so far.

Illustrative height targets against a hero/Wave 7 baseline of 44 logical pixels: Cương Thi 44, Oán Linh 52 including tails plus a small hover gap, armored skeleton 54, golem 66. These are **concept proportions**, not measured output sprites, canvas dimensions, collision sizes or balancing changes. Generated scale vignettes are approximate; some individual boards print these proposal numbers.

## Validation and approval points

All five final saved images were opened and visually compared with the approved references. Every PNG passed Pillow `verify()` and full `load()` decoding. All are 1536×1024 RGB, with an equivalent alpha range of 255–255. **Opaque ivory presentation backgrounds are intentional; transparent cutouts were not requested.** The spirit's translucency is an illustrated appearance, not actual PNG transparency.

All named directional views face the appropriate direction. Major costume, weapon, anatomy and color identities remain consistent. The skeleton keeps sword right/shield left, with a visible blade tip in the otherwise shield-occluded left profile. The golem keeps vegetation on the same anatomical left shoulder, with its chest seal only at the front. Main full-body figures and weapon tips remain inside the page, without visible clipping or corruption. Enlarged identifying-detail panels intentionally show close-ups.

Corrections before final save: turned the skeleton's incorrect left-facing view, restored its rear sword, exposed the left-profile blade tip and moved the golem's rear moss to the correct shoulder. A later visibility edit dropped the rear blade; that intermediate was rejected and the blade restored in the final master. The prompt record preserves this history.

Remaining owner review points:

- Talisman ink strokes, armor rivets/cloud-scroll details, rock cracks and moss leaves vary slightly between master and enlarged views. Major designs match; freeze decorative details after approval.
- The spirit has a deliberately dense core. Confirm the preferred translucency and later test contrast over grass at actual gameplay resolution.
- Approve the proposed size progression, particularly the golem's width. Pixel density, outline width and six-player crowd readability require a separate production-scale render in Phase 1F.
- Six palette swatches summarize materials rather than exhaustively locking colors. Paper and glow accents also appear directly in the drawings; production palette indexing is not performed here.

## Provenance and preservation

Generated with the built-in OpenAI `image_gen.imagegen` tool using project-approved images as references. No external commercial sprite pack was imported; no separate third-party license or exclusive copyright is asserted. Final PNGs were copied unchanged from the generator; source filenames and SHA-256 hashes are recorded.

Before/after SHA-256 comparison confirmed **all 632 files unchanged** across both approved Waves 1–8 concept directories, the entire arena production directory and the eight locked Cái Bang source/export files. No previous approved artwork was overwritten.

Only this directory's five PNGs and three documentation/manifest files were added. No production sprites, animation sequences, Phaser code, gameplay mechanics, balance, other waves, dungeon enemies, bosses, maps or UI were created or modified. No game-code tests or browser integration were run for this concept-only pass.

**STOP: Phase 1E ends here. Phase 1F requires explicit owner approval.**
