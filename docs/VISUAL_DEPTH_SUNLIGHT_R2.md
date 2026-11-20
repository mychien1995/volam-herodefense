# Visual depth — sunlight R2

Latest revision: [R3 corrections](VISUAL_DEPTH_R3.md). R2 results below are retained history.

Branch `wip/m3d/25d`. Prototype, pending director review. This revision responds to the feedback that V1 lacked the reference image's clear shadows, sunlight, fire hotspots and coherent ground/grass.

## Changes

- Stronger shared directional shadows from the retained statue/lantern alpha. Player shadows use four original idle silhouettes and correct trimmed-frame foot pivots; the soft contact shadow is separate.
- Lantern hotspots now follow the actual yellow flame pixels instead of a fraction of padded PNG bounds.
- Fire VFX have a small white/yellow emission core located on the bright artwork plus restrained orange ground illumination. Existing A and all five Chưởng skills retain their original art, timing and authority; Kháng Long flame coverage uses its existing rank-4 aura.
- Ground retains the original authored texture at native detail. A narrow irregular grass-edge blend softens the circle/cross path boundary. A material-aware shade mask and warm world-anchored sunlight bands add local contrast while keeping the scene bright. The decorative blend does not change walkable geometry.
- F8 and `visualDepth=off` restore the original visual presentation, including terrain. No HUD, server/core/protocol or tuning changes.

Sources and runtime texture details: [manifest](../assets/source/world-depth-v1/manifest.json), [provenance notes](../assets/source/world-depth-v1/README.md). The mask/lighting layers are render utilities derived from existing artwork, not replacement environment art. No source PNG was regenerated.

## Checks

The request to run only relevant checks remains in effect. Client/project typechecking (`pnpm exec tsc -b apps/game-client`), tools/test typechecking (`pnpm exec tsc -p tsconfig.tools.json --noEmit`) and the production client build passed. Existing large-chunk warning only. No full unit suite or balance run.

The focused production Playwright profile is `node tools/run-playwright.mjs test --config playwright.world-depth.config.ts`, server 2967/client 5567. The two-client iteration passed in 30.6 seconds. The final six-client run uses session `world-depth-sunlight-r2-final`; exact output is in [verification.json](evidence/sessions/world-depth-sunlight-r2-final/world-depth/verification.json).

Assertions cover four walk directions/feet alignment, A and all five max-rank skill animations/visible emission cores, peer movement and damaging-action HP agreement, ON/OFF restoration, actual lantern hotspot locations, all four cached hero-shadow facings, three terrain layers, bounded fire pool and stable twelve-texture count across repeated toggles and dungeon return. Captures pause the scene and simulation tick only during each matched PNG pair. No injected cast or hit result; no recording.

## Actual gameplay PNGs

Each pair uses the same camera, actor cel/position and simulation tick with the existing HUD.

- [Arena OFF](evidence/sessions/world-depth-sunlight-r2-final/world-depth/arena-before.png) / [Arena ON](evidence/sessions/world-depth-sunlight-r2-final/world-depth/arena-after.png)
- [A OFF](evidence/sessions/world-depth-sunlight-r2-final/world-depth/cai_bang_chuong-before.png) / [A ON](evidence/sessions/world-depth-sunlight-r2-final/world-depth/cai_bang_chuong-after.png)
- [Hàng Long OFF](evidence/sessions/world-depth-sunlight-r2-final/world-depth/hang_long_hoa_vu-before.png) / [Hàng Long ON](evidence/sessions/world-depth-sunlight-r2-final/world-depth/hang_long_hoa_vu-after.png)

## Limits

The grass/stone artwork is reused; this is lighting and a decorative edge correction rather than a newly painted tileset. Sunlight masks do not model physical tree occlusion or surface normals. Player cast shadows use four idle silhouettes, not each attack pose. Frame-time sampling is short idle observation, not a large-wave stress benchmark. All other maps/schools and broader artwork remain outside this prototype.

## Final measured result

Corrected final six-client production profile: **PASS, 47.9 seconds**. A and all five max-rank skills, four walk directions, peer state checks, toggles, cache limits and zone cleanup passed. All six projected shadow textures have fully transparent edges; the former clipped statue-shadow tip is fixed by a larger 768x512 cache with an explicit foot origin.

OFF idle sample: median 16.60 ms / p95 18.20 ms. ON: median 16.60 ms / p95 18.30 ms. Each sample contains 90 frames; these measurements do not establish large-wave performance.

Opaque HP/MP bars, gold text and hotbar-key crops are pixel-identical in all three pairs. Whole rectangular HUD crops also contain transparent corners/background and naturally show the changed world behind them. The sampled stone patch retains 96.15% of its original mean luminance; the scene stays bright. [Pixel measurements](evidence/sessions/world-depth-sunlight-r2-final/world-depth/pixel-comparison.json).

Visual inspection of the final actual PNGs confirms clear directional prop shadows without rectangular clipping, lamp cores on the actual flame, defined white/yellow fire hotspots, richer grass contrast and a softer path boundary. Source artwork stays crisp. The result is still a prototype awaiting director review. Earlier iteration PNGs and reports are retained separately.
