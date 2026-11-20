# Visual depth R3 — director corrections

Worktree/branch: `wip/m3d/25d`. Prototype; director approval is pending. No map/school expansion, server/core/protocol/tuning or HUD changes.

## Four requested corrections

1. Cast/contact shadows return to V1 tuning: opacity 0.20/0.32, direction x0.62/y0.30 and softer edges. Four-facing hero silhouettes remain, with the earlier long/dark R2 cast reduced.
2. The visible line was traced to the original arena exporter alternating mismatched 512px material panels. The ON presentation now stitches retained authored grass/stone pixels with a minimum-error overlap and narrow feather, then uses the same paving phase for the roads and plaza. There is no reflection, full-screen blur or new generated art. The exact original circle/cross footprint and gameplay geometry stay unchanged. OFF restores the original baked ground.
3. Wild dogs use four cached retained idle-silhouette shadows plus soft contact, anchored at their actual trimmed sprite foot pivot. OFF restores their original ellipse. Shadow tracking is verified during real server AI movement and all four facings.
4. A stronger overhead lighting gobo produces organic warm sun windows and intervening shade, anchored in world coordinates. The ground remains readable and fire/lantern emission cores remain in place. There is no camera vignette or HUD filter.

Provenance and original-file hashes: [manifest](../assets/source/world-depth-v1/manifest.json), [notes](../assets/source/world-depth-v1/README.md). Source PNG/JSON exports are unchanged. Existing stone/grass artwork is recomposed; no asset generation service or new license is involved.

## Focused validation

Only relevant checks were run, per the request. Client/project compilation (`pnpm exec tsc -b apps/game-client`), tools/test typechecking (`pnpm exec tsc -p tsconfig.tools.json --noEmit`) and production client build passed. The initial material import path was corrected and the affected build stage retried. The standard large-chunk build warning remains.

`node tools/run-playwright.mjs test --config playwright.world-depth.config.ts` uses isolated ports 2967/5567. The non-mirrored two-client iteration passed in 34.1 seconds. Final six-client session: `world-depth-r3-final`; [verification](evidence/sessions/world-depth-r3-final/world-depth/verification.json).

Coverage includes original seam reproduction and corrected edge sampling, no mirrored pattern, shared road/plaza coordinates, four dog facings and real AI movement with foot-aligned shadows, four hero walk directions, A and all five max-rank skills/emission cores, peer movement/HP agreement, OFF restoration, texture-edge clipping, stable 17-texture cache/fire-pool bounds and forest entry/arena return. Max-rank loadout, durable target and placement are explicit server-side QA prerequisites; casts/hits use actual keyboard input and authoritative simulation. No video or trace recordings.

## Actual normal-zoom game PNGs

Each OFF/ON pair preserves camera, actor cel/position and frozen simulation tick only while capturing the PNGs.

- [Arena OFF](evidence/sessions/world-depth-r3-final/world-depth/arena-before.png) / [Arena ON](evidence/sessions/world-depth-r3-final/world-depth/arena-after.png)
- [Ground join OFF](evidence/sessions/world-depth-r3-final/world-depth/ground-join-before.png) / [Ground join ON](evidence/sessions/world-depth-r3-final/world-depth/ground-join-after.png)
- [A OFF](evidence/sessions/world-depth-r3-final/world-depth/cai_bang_chuong-before.png) / [A ON](evidence/sessions/world-depth-r3-final/world-depth/cai_bang_chuong-after.png)
- [Hàng Long OFF](evidence/sessions/world-depth-r3-final/world-depth/hang_long_hoa_vu-before.png) / [Hàng Long ON](evidence/sessions/world-depth-r3-final/world-depth/hang_long_hoa_vu-after.png)

F8 toggles the prototype; `visualDepth=off` starts with the original presentation. The earlier mirrored-material iteration is retained and explicitly marked visually rejected; automated PASS did not approve its art.

## Limits

Material textures still repeat and the overlap is a render-time assembly of existing artwork, not a newly painted tileset. The overhead gobo is art-directed illumination, not physical canopy geometry/normal-map occlusion. Hero/dog cast shadows use four idle silhouettes rather than every action cel. Idle frame-time sampling does not establish large-wave performance. The director must review the actual result before expansion.

## Final result

**PASS**, focused six-client production case in **55.4 seconds**. The original material-border mean RGB jump was 18.46; corrected material joins measured 7.03. This measures the removal of a harsh color cut; natural grout/pixel variation remains. All four dog facings, real AI movement, hero/skill/peer checks and resource/zone cleanup passed. Opaque HP/MP, gold and hotbar-key samples are unchanged in all three pairs; [pixel checks](evidence/sessions/world-depth-r3-final/world-depth/pixel-comparison.json).

- OFF idle frame sample: median 16.60 ms / p95 18.30 ms, 90 frames.
- ON idle frame sample: median 16.60 ms / p95 18.20 ms, 90 frames.
