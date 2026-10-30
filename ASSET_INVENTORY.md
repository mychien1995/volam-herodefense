# Asset intake inventory — 2026-10-30

All **6 files** in `assets/inbox/` were visually opened and inspected. Machine measurements/hashes are saved in `assets/intake/audit.json`. Files remain untouched. Source: user-supplied Gemini generations; prompts/model/version and usage provenance were not supplied. No imported file is runtime-ready. Painted checkerboards are **not transparency**: all PNG alpha values equal 255; JPEGs have no alpha channel.

| Filename | Classification | Resolution | Transparency | Intended use / quality assessment | Missing requirements / disposition |
|---|---|---|---|---|---|
| `cai-bang-bong-attack.jpg` | Character animation candidate; needs correction | 1024×572 | RGB JPEG; painted checks | Seven side/front staff poses, recognizable red chibi design; uneven arrangement, variable angles/trails | Lossless original transparent frames, explicit sequence/durations/pivots; JPEG edge damage and baked checks. **Reference only; do not replace approved Cái Bang.** |
| `cai-bang-chuong.png` | Character reference/concept with embedded skill VFX; needs correction | 992×1075 | RGBA but alpha 255 everywhere | Ten presentation poses; taller/less chibi than baseline; tunic changes red→green, inconsistent scale/identity, embedded fire | True alpha, consistent costume/proportions, four directions, separate VFX, recovery/timing metadata. **Quarantined; approved hero retained.** |
| `cai-bang-fire.png` | Skill VFX concept sheet; needs correction | 1376×768 | RGBA but alpha 255 everywhere | Labeled charge/travel/impact/explosion examples mixed with different hero figures; useful color/motion brief | Standalone transparent effects only, constant pixel scale, numbered frames, origin/durations, glow alpha without checks, remove labels/figures and visible star-shaped marks. **No VFX extracted/imported.** |
| `cai-bang-idle.png` | Character animation candidate/concept; needs correction | 1024×1024 | RGBA but alpha 255 everywhere | Four labeled groups of four poses; relative proportions close, but apparent turn/body pose changes, baked shadow and labels | True alpha, stable facing/feet/identity, clean isolated frame files and timing. **Reference only; never overwrite approved idle.** |
| `cai-bang-walk.jpg` | Character animation candidate; needs correction | 1024×572 | RGB JPEG; painted checks | Four labeled walking rows with many samples; left/right bodies and facings drift; crowded presentation and softened edges | Lossless transparent original frames, fixed character identity, direction order, ground pivots/durations. **Reference only; approved walk retained.** |
| `creep-and-terrain.png` | Mixed enemy asset, NPC/environment-object candidates, terrain/tileset concept, character/VFX concept; needs correction | 1024×1024 | RGBA but alpha 255 everywhere | Bandit, merchant, portal, small grass/stone/cliff swatches and palm poses in one labeled composition. “Walk up” shows front-facing bandits; attack only down; hurt only front; death repeatability unverified. Merchant left/right remain similar front-facing views. Terrain is a preview, not a seamless square tile atlas. No tree/building. | Split into separate lossless true-alpha enemy/NPC/object/VFX assets; correct facings, complete idle/walk/attack/hurt/death or explicitly declare absent states; provide seamless native-size terrain/edge/corner variants and tile index. Remove labels/checks/marks. **Quarantined.** |

No standalone usable character animation sheet, standalone usable skill VFX sequence, environment concept map, UI asset, tree or building is present. The mixed sheet's terrain region cannot be assumed seamless merely because it is named a tileset. Opaque terrain is allowed when supplied as a reviewed, seamless tile atlas; alpha is required for isolated sprites/objects/VFX.

## Approved baseline and first-batch status

Cái Bang Bổng/Chưởng is **APPROVED** by the user on 2026-10-30 for authored idle/walk/normal attacks. Sources/exports are SHA-256 locked without pixel changes. Cast/hurt/death fallbacks are not newly approved art. The reusable template records actual 80×80 dimensions, (40,64) feet pivot, four-direction tags, durations and normal rendering scale; larger art must use a larger declared canvas, not distortion.

| First-batch component | Status |
|---|---|
| Existing Cái Bang | Approved, byte-preserved, already integrated |
| Animated basic enemy | Blocked: mixed sheet opaque; false up direction; incomplete states |
| NPC | Blocked: opaque mixed presentation sheet, no clean isolated source |
| Tree | Missing |
| Building | Missing |
| Detailed arena terrain section | Blocked: swatch preview lacks tile grid, transitions and seamless verification |
| One Cái Bang skill animation | Blocked: opaque presentation sheet; effects mixed with figures/labels |

**Processed into runtime: 0 new Gemini assets.** No placeholder was replaced with a checkerboard crop, no animation was fabricated, and no approved character was regenerated. A staging validation fixture copies existing approved pixels solely to test Aseprite export; it is not a new supplied asset or first-batch completion. Phaser already registers actor animation metadata from the runtime manifest; staged character manifests use that same frame/state/direction schema. Installation remains a deliberate integration step once corrected assets pass review.

## Prioritized Gemini generation requests

1. **Basic bandit enemy:** same detailed chibi density/perspective as approved hero (~44px body as scale reference). Separate transparent PNG sequences for idle, walk, basic attack in down/up/left/right, plus hurt/death as explicitly scoped. Start with 2 idle / 4 walk / 4 attack poses per direction; distinct true back view, consistent weapon/costume, no labels/checks/shadows/VFX baked into body. Declare frame order, duration, canvas and feet pivot. Use larger canvases if required; no resizing to fit.
2. **Merchant NPC:** one clean transparent front-facing standing sprite at matching scale; optional idle breathing frames separately numbered. No stall/label/background merged into the person. Declare foot pivot.
3. **Tree:** one detailed original transparent tree, orthographic elevated overworld view; full canopy/trunk/root contact visible, declared base pivot. Native pixel density consistent with hero, no ground rectangle; identify trunk footprint for review against existing collision.
4. **Building/stall:** one separate transparent wuxia merchant building/stall with coherent frontal/elevated roof view, grounded base pivot. Provide roof/foreground split if occlusion needs it. Do not invent new solid collision in artwork integration.
5. **Arena tiles:** lossless native-scale square atlas (32px tiles are the current map convention), grass variants, stone paving, grass↔stone transitions, outer/inner corners and edge variants. No perspective scene, labels or checkerboard inside tiles. Include tile index/grid and demonstrate edge tiling in a separate preview. Terrain tiles can be opaque.
6. **One existing Cái Bang skill:** choose Hỏa Vân Chưởng projectile/travel/impact first. Separate transparent effect-only frames with crisp red/orange/yellow fire clusters, smooth alpha at glow boundaries, explicit frame order/timing and origin. No hero, text, checkerboard or watermark-shaped marks. No new damage/targeting behavior.

Generate only this correction set before other schools/bosses/UI batches. Attach the approved character as a style reference, not a sprite to redraw. Prefer per-frame PNGs over labeled mixed concept sheets. A visual checkerboard drawn by a generator never substitutes for real alpha.

## Verification scope

Executed intake validation: **9 tests passed**, including pixel-exact Aseprite staging of the existing baseline fixture. Typecheck, **63 unit/integration tests** and asset verification passed. Actual game run: 13 browser cases passed initially; the timing-sensitive staff capture passed its targeted unchanged rerun. Exact results, limitations and screenshot locations are in `assets/intake/VERIFICATION.md`. Approved Cái Bang hashes remain unchanged after every check.

See `assets/intake/README.md` for commands, staging contract and remaining integration gate. The requested improved-arena/fighting-new-enemy/new-skill screenshots cannot be captured honestly until valid first-batch sources exist. Any current-game screenshots are preservation/regression evidence only and still show the old environment/enemy/VFX placeholders.
