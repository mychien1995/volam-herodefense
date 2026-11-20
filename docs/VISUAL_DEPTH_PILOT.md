# Visual depth V1 — arena prototype

Latest revision: [Sunlight R2](VISUAL_DEPTH_SUNLIGHT_R2.md). The V1 measurements below are retained history.

Worktree branch: `wip/m3d/25d`, based on `a8400676`. Prototype awaiting director review; no expansion to other environments or schools.

## Scope

- Existing Cái Bang Chưởng character: soft contact + short directional ground shadow, with the original ellipse restored when OFF.
- Existing central statue and two lanterns: cached alpha-projected directional shadows and contact masks. Lanterns add restrained warm illumination and 2.5% cosmetic flicker.
- Existing A, Hỏa Vân Chưởng, Cuồng Long Loạn Vũ, Phi Long Tại Thiên, Kháng Long Hữu Hối and Hàng Long Hỏa Vũ: selective warm ground illumination and a low-opacity additive silhouette halo following actual visible VFX cels. Shared A/Hỏa Vân textures resolve the provider's semantic ability name first.
- Kháng Long's existing flame aura is rank-4 content; lower ranks keep their existing buff presentation. No new flame artwork or gameplay effect is invented for them.
- No full-screen darkening, vignette, bloom, texture resampling or HUD modifications. No server/core/protocol/tuning changes.

## Controls and configuration

F8 toggles locally in-game. Start OFF with `?visualDepth=off` (or append `&visualDepth=off` to an existing query).

`worldDepthConfig` in `apps/game-client/src/world-depth-effects.ts` controls contact/cast opacity, sunlight direction, light intensities and the 16-pair fire-light cap. Fire candidates are camera-culled. Masks are cached, pools are reused, zone transfers clear objects, and scene shutdown removes textures/listeners.

The existing debug-only `__VOLAM__` evidence surface exposes `reviewWorldDepth(boolean)` and `presentation().worldDepth`. It cannot mutate authoritative game state.

Source/provenance: [runtime mask manifest](../assets/source/world-depth-v1/README.md). Existing approved artwork/animation exports remain unchanged.

## Verification

The user requested only relevant checks. No full test suite, balance simulation or unrelated asset regeneration was run.

- `node scripts/prepare-assets.mjs`: successful initial worktree preparation and retained-art guards; sources unchanged.
- `pnpm exec tsc -b apps/game-client`: client and referenced TypeScript compilation.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: tools/test typechecking.
- `VITE_SERVER_URL=http://127.0.0.1:2967 pnpm --filter @volam/game-client build`: production client; existing large-chunk warning.
- Focused Playwright profile: `node tools/run-playwright.mjs test --config playwright.world-depth.config.ts`, with `VOLAM_QA_SESSION=world-depth-final`, server 2967/client 5567 and `VOLAM_DEPTH_PLAYERS=6`.

Final result: **PASS**, one focused production browser case in **48.4 seconds**, with six connected clients. A plus all five max-rank skills each produced at least two real cels from one VFX texture. Four walk directions kept shadow feet aligned; movement and damaging actions agreed with the peer. OFF restored the old ellipse. Repeated toggles retained four cached textures, the observed pool peaked at eight light pairs (cap 16), and dungeon entry/return cleaned and rebuilt the arena pilot.

Idle frame-time sample, 90 frames per mode with six clients open: OFF median 16.60 ms / p95 20.70 ms; ON median 16.60 ms / p95 19.10 ms. This short sample is consistent with approximately 60 FPS while idle; it is not evidence of a speedup or large-wave performance.

Visual inspection: the arena stays bright and the hero/prop artwork stays crisp. Changes are localized to contact/cast shadows, lantern warmth and subtle fire illumination; the result is intentionally restrained. The arena pair retains 96.34% identical pixels. Portrait, bag and hotbar crops are pixel-identical across all three pairs; see [pixel comparison](evidence/sessions/world-depth-final/world-depth/pixel-comparison.json). Compared to the supplied upgrade image, this avoids its heavy vignette/dark terrain. It remains much sparser than the approved central-hub concept; world composition is outside this pilot.

Final outcome and exact metrics are recorded in [verification.json](evidence/sessions/world-depth-final/world-depth/verification.json). Real keyboard movement/casts/hits run in the normal M3D room; server-only fixtures arrange a level-30/max-rank loadout, positions and a durable target. Exact comparisons pause the client render and simulation tick only while capturing PNGs, then restore them. No cast/hit result is injected. Six connections are not a many-enemy stress benchmark.

Earlier failed iteration reports remain under `docs/evidence/sessions/world-depth-*`. The old development fixture omitted the raster alias constant, so verification switched to the actual production build. Fixture retries corrected snapshot field naming, rank-4 aura prerequisites and the ultimate cooldown slot; the visible A/Hỏa Vân shared-texture identity was corrected in the client. No unrelated production behavior was changed to satisfy a fixture.

## Review images

All are actual normal-zoom Phaser gameplay with the existing DOM HUD. Each BEFORE/OFF and AFTER/ON pair has the same actor position/cel, camera zoom and frozen server tick.

- [Arena OFF](evidence/sessions/world-depth-final/world-depth/arena-before.png) / [Arena ON](evidence/sessions/world-depth-final/world-depth/arena-after.png)
- [A OFF](evidence/sessions/world-depth-final/world-depth/cai_bang_chuong-before.png) / [A ON](evidence/sessions/world-depth-final/world-depth/cai_bang_chuong-after.png)
- [Hàng Long OFF](evidence/sessions/world-depth-final/world-depth/hang_long_hoa_vu-before.png) / [Hàng Long ON](evidence/sessions/world-depth-final/world-depth/hang_long_hoa_vu-after.png)

## Limits

Ground-projected alpha shadows and additive illumination approximate depth; they do not reconstruct 3D geometry, physical light occlusion or surface normals. Terrain/grass transitions and all dungeon/world expansion remain outside this prototype. A short idle frame-time sample includes browser/GPU scheduling and cannot establish a 60-FPS guarantee under large waves. Director approval of this actual in-game result is still pending.
