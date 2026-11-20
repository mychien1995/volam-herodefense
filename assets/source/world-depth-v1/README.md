# World depth V1 pilot provenance

Status: prototype, pending director review at gameplay zoom. Arena only.

- Retained hero bodies and all basic/skill PNG/JSON exports are unchanged.
- Retained prop sources: `assets/exports/visual-upgrade-2/statue.png` and `lantern.png`, loaded by the existing renovation manifest. Existing provenance/approval locks remain authoritative.
- `apps/game-client/src/world-depth-effects.ts` is the editable source for cached runtime illumination textures: a 128x128 soft contact mask, a 128x128 warm light mask, and two 512x512 alpha projections derived from the retained statue/lantern PNGs. These are render utility masks, not replacement hero/environment art. No external artwork, services or new licensing dependency.
- Contact masks are anchored in world coordinates. Prop shadows use the retained feet pivot and a shared sunlight direction. Fire halo uses the current original effect cel and follows its scale, rotation and facing; it never changes the original cel.
- Source artwork pixels, animation timing, server state, collisions and HUD are unchanged. There is no full-screen grading, blur, vignette or darkness pass.
- Pool limit: 16 visible fire-light pairs, culled against the camera. Runtime masks are reused across toggles and zone transfers and released on scene shutdown. No recordings.
- Toggle: F8; optional initial comparison URL `?visualDepth=off`. The debug-only existing `__VOLAM__` surface exposes `reviewWorldDepth(boolean)` for exact-frame comparisons.

The pilot adds approximate ground-projected shadows and additive illumination. It does not reconstruct 3D geometry or surface normal maps.

## Sunlight revision R2

Director feedback: V1 was too subtle relative to the supplied Phaser-upgrade reference. R2 uses a shared upper-left sunlight direction and stronger alpha-projected prop shadows. The player now uses four cached retained idle silhouettes with trim-aware foot pivots, rather than a long gradient ellipse; contact softness remains separate. These are approximate four-facing shadows, not per-frame 3D reconstruction.

Three cached terrain layers reuse the original ground artwork: a full-density grass edge blend within a narrow decorative band of the retained circle/cross path, a low-resolution material/shade mask, and world-anchored warm sunlight bands. Original grass/stone PNGs and navigation geometry remain unchanged. No procedural replacement trees, tiles or props are introduced.

Emission hotspots are located once per retained cel from a 48x48 warm-pixel sample and cached as coordinates, not textures. The same trim/flip/world transform places lantern and fire cores on the actual bright artwork. A fire-light pool entry now consists of ground light, silhouette halo and white/yellow core (16 entries maximum). Twelve runtime textures are reused across toggles and zone transfers and removed on shutdown.

Exact source hashes and runtime sources: [manifest.json](manifest.json). No new externally sourced artwork or licensing dependency. Gameplay/HUD and prior evidence remain unchanged.

R2 shadow masks use a 768x512 canvas with explicit origin (256,256); transparent-edge assertions cover the long statue shadow. This supersedes the V1 512x512 cache dimensions above.

## R3 — reduced cast shadows, continuous materials and dog pilot

The director requested lighter shadows, correction of the visible baked material joins, a wild-dog shadow and more convincing overhead sunlight. Contact/cast opacity and direction return to V1 values (0.32/0.20, x0.62/y0.30). Four retained wild-dog idle silhouettes now share the same trim-aware foot-pivot projection and restore the old ellipse when OFF.

The original 1254x1254 `arena-materials.png` is loaded byte-exact from the retained R2 source pack. A minimum-error overlap stitch uses native material pixels and a four-pixel feather to make a 448px repeating material from each 512px sample, without reflection or full-image blur. The corrected base and grass-edge overlay share one material coordinate system across the road and circular plaza. Shape/coordinates/navigation do not change. A mirrored experiment was visually rejected and is retained only as historical evidence.

An overhead world-anchored gobo creates brighter warm sun windows and organic intervening shade. Seventeen cached textures are retained across toggles/zone return: three illumination masks, two prop shadows, four hero shadows, four dog shadows and four ground/material/light layers. Existing fire-light behavior and source artwork remain unchanged. This remains a prototype pending director review.

## R4 — world expansion

R3 is retained for the arena paving and its approved softer shadow tuning. Expansion covers the other 13 player branches, current creep/summon/boss body renderers, tagged scene props, all eight dungeons and Lôi Đài. World profiles tune sunlight, ambient shade, cast direction/opacity and correct ground depth. Interior Cổ Mộ and Địa Ngục have no artificial sunshine; local jade/lava lights follow retained artwork.

Dynamic actor projections reuse a retained idle facing when available. Cached projections are tightly cropped (maximum384x192), with at most64 visible expanded casts,128 cached textures and24MiB of cached RGBA pixels. Contact shadows remain for the other visible actors. The original Chưởng/dog R3 path remains separate. This is approximate 2D compositing, not frame-accurate 3D shadows or occlusion-aware point lighting.

Only authored VFX components and explicit native FX bundles may emit. Character bodies, warning markers and physical debris are excluded; a small cached pixel sample rejects dark frames. Fire retains R3 tuning; qi/wind/lightning/poison use restrained colored emission. The shared pool remains16 entries, each ground/halo/core. F8 hides all new world layers and restores original actor ellipses. No new art files, source pixels, gameplay, collision, animation timing or HUD changes.

See `docs/VISUAL_DEPTH_EXPANSION.md` for actual-run PNGs, scope and test results. Expansion remains a visual prototype pending director review.
