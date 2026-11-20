# Production decisions that made the difference

## Diagnose at the normal entry point

Distinguish defects visible in the source from defects introduced during export or display. Check alpha at thin outlines, blade widths, body pixel height, atlas trimming and the relationship between canvas dimensions and its CSS size. Compare still and moving frames at ordinary gameplay zoom. Check [coherence-and-vfx.md](coherence-and-vfx.md) when the defect changes with actor state or skill phase.

A 44-pixel body displayed at 2× has 88 visible pixels of height. Drawing a new 88-pixel body and displaying it at 1× can preserve finer authored features at that same height. Changing only the frame canvas adds padding. Scaling an old drawing adds displayed size. Judge the new drawing and its display path together.

Choose size by role and context. The 88-pixel body was a useful hero experiment. Keep small creeps, large bosses and environmental props proportionate to the scene the user selected.

## Distinguish soft art from resampling

Compare the raw source, a native-size exported cel and the live sprite against a sharper peer at equal body height. Inspect actual alpha, camera zoom, canvas/CSS dimensions, texture sampling and subpixel placement. Do not infer an opacity bug from a low-contrast drawing or assume that a larger canvas contains more character detail.

If the source already has soft hair edges, fine gray noise and weak robe shadows, a different sampler does not restore missing design clarity. Author readable eye/hair contours and larger light/shadow groups while retaining identity and style. Judge the result after export at gameplay size, not only in the large generated sheet. The Thiên Sơn example improved contours and value separation without changing the renderer's filter or scale; this is evidence for that defect, not a universal rendering setting.

## References and generation

Use three distinct inputs when available.

- Identity reference supplies the accepted face, outfit, weapon and palette.
- Quality reference supplies edge treatment, lighting and the level of material detail.
- Runtime reference supplies camera, proportions, ground contact and display size.

Prompt for the requested subject and action, the elevated fixed camera, a complete isolated silhouette, true transparent padding and continuous edge design. Prefer large readable light/shadow groups to micro-decoration. Adapt palette and material choices to that character.

For an animation sheet, request an explicit grid with one complete figure per cell and identical body scale. Inspect every cell after generation. A requested grid size or output resolution is a target, so measure the actual delivered image. Reject joined silhouettes, clipped hair/weapons and painted backdrops even when the prompt requested transparency. Retry the defective take or pose group rather than weakening the completeness/alpha checks.

Walking needs visibly different leg and foot positions with consistent clothes, head, hands and rigid weapon geometry. For attacks, author the necessary anticipation, contact and recovery. A deliberately shared cast pose is acceptable when its reuse fits the requested preview and is disclosed.

## Export without damaging the outline

Keep raw generated PNGs. In the Võ Đang v01 experiment, forcing alpha to 0/255 and downsampling with nearest removed narrow edge coverage. The later export retained partial alpha and used bilinear reduction, followed by native-scale visual inspection.

With the installed Aseprite 1.3.18.6 API, the relevant operation is `Image:resize{width=..., height=..., method="bilinear"}`. Read the installed version/current documentation before adapting APIs. Very low-alpha background noise can be removed when inspection justifies it. The example's source threshold 12 and final threshold 4 are measured local settings, so tune them for the new material.

Select source bounds using visible pixels, with enough padding to retain the contour. Align the ground-contact point to a shared feet pivot. Use a consistent anatomical scale across a coherent source group; the density rules in [coherence-and-vfx.md](coherence-and-vfx.md) explain mixed-resolution replacements. Recompute individual cel placement from the feet point so sword reach and cloth spread do not alter body scale.

Check exported rasters against the editable source. Validate frame names, dimensions, pivots, timings, unclipped edges and actual alpha. Preserve source hashes and record deliberate facing transforms. Left/right mirroring requires checking handedness, costume asymmetry and equipment.

## Rendering and layered scenes

A high-density source needs a display path that retains its detail. The Võ Đang review used a 1366×768 canvas displayed at 1366×768, camera zoom 1 and an approximately 88-pixel source body. Reusing it in the older half-resolution match renderer requires a deliberate density/scale integration.

For a scene renovation, use authored ground and independent transparent props, foot-based depth and foreground layers. Check material contrast and density across the complete viewport. Preserve the camera view and playable area needed by the requested game. A source illustration can guide composition, while runtime scenery and collision markers need coherent separate representations.

## Review and acceptance

First inspect one exported cel on the intended floor. Then observe each direction/action, transition, timing, pivot, weapon and effect lifecycle in Phaser. Keep screenshots at native size. Compare like-sized actors and equivalent camera framing.

In Võ Lâm Hero Defense, `docs/SESSION_EXECUTION_LESSONS.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/ART_ITERATION_WORKFLOW.md` and the art specifications define verification and approval scope. Reuse the installed pixel-art-pipeline and game-playtest skills when performing their corresponding production or match checks.

A scene with six sprites measures visual crowding. A six-client match test also needs real network peers and authoritative combat observations. Report the measured scope accurately. The requested review should be concrete before asking for director approval.


## Version and sample boundaries

When cloning a source profile, review inherited pose overrides, segmentation cuts and tolerances. They describe the old raster and can silently reinsert old art or cut the replacement. Retain only annotations still valid for the reused source.

For a limited prototype, compare reconstructed cel hashes before/after so only the intended facing/states change. Atlas packing coordinates can differ while the logical cel remains identical. Check HUD portraits separately when they must stay unchanged. Byte-locked assets need Git attributes that preserve their approved metadata bytes; verify staged/checkout bytes as well as working-tree files. Do not normalize or re-export approved originals as cleanup.
