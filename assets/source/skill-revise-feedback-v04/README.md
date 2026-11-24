# Runtime feedback repair v04 — 2026-11-23

The user requested borderless revised HUD icons, a ground-plane AOE explosion below Hỏa Long's feet, consistent left/right hammer placement and idle/A identity, and a high overhead hammer slam. Branch `wip/m3d/skill-revise`. This is a repair candidate integrated for live review; director art approval remains separate.

V01 idle put the hammer on screen right even when facing left. Runtime alternated V01 idle, V02 attacks and V03 sweep. V04 uses the exact retained V02 `thrust_0` neutral for idle and every A entry/recovery, separately for all eight facings. Four idle names intentionally alias one still, not newly drawn idle animation. V02 thrust/rising and V03 sweep interior rasters remain. V03's exported cel order is consumed once. Rightward/vertical walk, hurt, death and skill bodies retain previous art; the three left-facing walks use explicit mirrored retained gait cels. Chaos neutral/A use this same coherent bank at the existing transformation scale.

Built-in `image_gen.imagegen` authored five six-phase overhead takes from extracted V02 identity references. Raw PNGs, exact prompts and receipts are preserved here. Right/down-right/up-right interior cels are mirrored to derive left/down-left/up-left; these are explicit derivatives. One scale per source group uses neutral anatomy and common foot `(256,320)` on canvas `512×448`. A separate rear repair supplies only anticipation cel2; the first take remains. The rear ponytail bends down in that raised pose: its inspected hair-top landmark is canvas y242, so overhead clearance compares against that head rather than the upright idle ponytail.

Four icons are exact unscaled `(44,44,212,212)` interior crops of the original 256px cards, removing their baked gold frame and gutter. Original cards/atlases remain unchanged. Crop input/output hashes are in `assets/exports/skill-revise-feedback-v04/icons/manifest.json`.

`build.py` reuses connected-alpha extraction from `tools/hero_unified_assets.py`, registers and packs rasters, and draws no artwork. `native-export.ps1` reuses `tools/make-skill-revise-native.lua` for editable Aseprite and an actual roundtrip. `verify.py` checks 236 cels, neutral continuity, overhead clearance, source hashes, clipping, icon crops and exact native alpha/visible RGB.

```powershell
python -X utf8 assets/source/skill-revise-feedback-v04/build.py
node tools/prepare-skill-revise-runtime.mjs
& assets/source/skill-revise-feedback-v04/native-export.ps1
```

The fire burst remains at the authoritative endpoint, depth0 on the floor, centered origin, vertical scale42% of horizontal scale. Server AOE damage/radius are unchanged; real Q damage is checked on both flanks and against a miss outside the radius.

QA reuses `playwright.skill-revise.config.ts` with `VOLAM_QA_SKILL_REVISE_FEEDBACK=verify`: real A/Q inputs, all six cels of four attacks/eight facings, neutral scale/pivot, actual explosion depth/scale/endpoint, HUD icon URL and natural combat. Art uses two active renderers; final combat resumes all six. Baseline, the first pilot's unfinished asset-copy failure, the corrected right pilot and final evidence remain in `docs/evidence/skill-revise-feedback-v04/`. No recording or trace.

Walking follow-up: all twelve left/down-left/up-left walk cels are exact horizontal mirrors of the corresponding retained right-facing V01 gait. Other walk directions remain unchanged. The native verifier checks those actual mirrored pixels, and live arrow inputs must produce all four gait cels plus authoritative displacement in each corrected direction. An initial final run was interrupted when this remaining defect was found; it is not labeled PASS.
