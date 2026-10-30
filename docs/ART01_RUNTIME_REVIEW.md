# ART-01 arena and compact HUD runtime review

Candidate date: 2026-10-30. **Director approval: PENDING.** Produced assets, game integration and runtime evidence are separate from the approved concept direction.

## Implemented

The actual Phaser 4.2.1 arena uses reconstructed ground and separate transparent male statue/pedestal/steps, jade and blossom trees, bamboo, lanterns, scarlet banners, rock/flower banks, water gardens and bridges. Canopies and front bridge rails are separate layers. Existing feet-based actor sorting, camera, animation selection and server combat rendering remain intact. Water and lantern windows have exported four-phase 160ms texture-flow/glow cels; banners are static.

The circular paving is centered on the unchanged statue marker at **(800,576)**. The floor was reconstructed unobscured, rather than using a full concept screenshot. A mirrored grass extension was rejected during actual inspection and replaced by continuous authored lawn plus a finer central art-density layer. Shared map/spawn/collision data is unchanged.

The compact DOM HUD uses original produced PNG frame, icon, portrait-frame and bar artwork with live name, level, HP, mana, EXP, gold and cooldown values. The portrait is cropped from approved Cái Bang art. A uses staff or a single projectile; Q depicts the actual three-shot skill; W depicts explosive fire; E/R stay unequipped. No illustrative sample values, potion counts or unsupported ranks are invented.

Utility buttons are Settings, Quit, Phó Bản, Thương Gia, Lôi Đài, in that order. Settings exposes controls, fullscreen and existing loadout/party access. Quit leaves the room. Other buttons open their existing viewport-contained preview menus. Modal input releases held movement, traps focus and returns focus to the canvas on close. There is no exterior dashboard, center page/title block, status column, persistent room chip or minimap.

## Deliverables and real evidence

- [Pre-production component breakdown](ART01_COMPONENT_BREAKDOWN.md).
- [Provenance and component status manifest](../assets/arena_art01.manifest.json).
- [Nine editable Aseprite sources / production README](../assets/source/arena_art01/README.md) and preserved generated inputs / [prompt set](../assets/source/arena_art01/GENERATION.md).
- [Runtime PNGs and six padded JSON atlases](../assets/exports/arena_art01/).
- [Re-export entry point](../scripts/export-arena-art01.mjs). Aseprite 1.3.18.6 was actually executed; re-exporting saved sources reproduced all 59 PNG pixel buffers with **zero differences**.
- [Asset validation JSON](evidence/art01/asset-validation.json).
- Actual gameplay captures: [954×458](evidence/art01/gameplay_954x458.png), [1280×720](evidence/art01/gameplay_1280x720.png), [1920×1080](evidence/art01/gameplay_1920x1080.png).
- Actual overlays: [inventory](evidence/art01/inventory_1280x720.png), [dungeon menu](evidence/art01/dungeons_1280x720.png), [Settings](evidence/art01/settings_1280x720.png), [two-client cooldowns](evidence/art01/combat_cooldowns_two_clients.png).
- [Two-client authoritative state evidence](evidence/art01/multiplayer.json) and per-size JSON captures in the same evidence directory.
- [Concept / actual runtime / rejected-build comparison](evidence/art01/concept-runtime-comparison.png), [statue route capture](evidence/art01/statue_routes.png), [in front of tree](evidence/art01/tree_front.png), [behind tree](evidence/art01/tree_behind.png), and [all ambient frames observed in Chromium](evidence/art01/ambient-runtime-frames.json).
- The existing Cái Bang regression suite also captured all four walk/idle/attack directions, both normal styles, the 24-tag animation gallery/video and six-player gameplay under `assets/reviews/cai_bang_v1_6_v2/`.

## Comparison and honest limits

The approved concepts establish warm radial stone, male martial sculpture, jade bamboo, pink blossom, cyan waterfalls, wooden bridges, red banners, amber lanterns and a small gold/charcoal HUD. These materials/components are now separate real game assets. Generated artwork is not presented as a runtime screenshot; all `gameplay_*.png` links above are actual Chromium matches.

Composition is adapted to the existing map. A jade tree remains within the western court because its real trunk collider cannot be moved only on the client. Camera framing follows the real hero at unchanged zoom/offset rather than permanently centering the statue on screen. The water gardens are separate decorative cascades/pools, not a new connected river navigation system. Fine density, foliage placement and the integrated visual standard still require director judgement at normal gameplay zoom.

M1 currently has a statue **marker**, no statue solid collider/health or invasions, and no water/rock collision system. The statue remains on its authoritative marker; no client-only collider, obstacle relocation, balance or navigation rule was introduced. Water is ornamental/shallow and bridge decks lie over existing walkable ground. A solid statue base would require an authoritative map/gameplay change; that missing feature is disclosed, not reported as verified.

Remaining prototype visuals: Sơn tặc enemy frames, fire projectile/impact, staff swing arc, cast/hurt/death fallback poses, some item-category icons, destination cards/forest study and remote map-edge continuation. Inventory items, consumables, full ranks/loadouts, shop/crafting, dungeon and PvP gameplay remain later milestones. Their existing menus work as menus and show disabled unavailable gameplay. No other school or dungeon asset set was generated.

The generated rasters were prepared through actual scripted Aseprite alpha cleanup, pixel-density adaptation, layer reconstruction, pivot alignment and exports. This is not a claim of manual frame-by-frame pixel painting. Water/glow cels are texture/light variations with fixed silhouettes; there are no fabricated character frames or banner animation claims.

## Verification record

Intermediate failures were not counted as passes. They exposed modal delegation (a dialog container accidentally matched menu dispatch), narrow loadout visibility and browser-harness route/sampling issues. Production input and collision rules were preserved while correcting those problems. A concurrent unit/room run timed out; the final isolated run passed all 65 tests.

| Actually executed command/check | Result |
|---|---|
| Aseprite `--version`, `--help` | 1.3.18.6; batch/Lua/export capabilities available |
| Aseprite `--batch --script-param root=… --script scripts/assemble-arena-art01.lua` | Exit 0; nine real editable sources and runtime exports |
| `node scripts/export-arena-art01.mjs` plus decoded-PNG pixel comparison | PASS; all 59 PNG pixel buffers identical to final source exports |
| `pnpm typecheck` | PASS |
| `pnpm test` (final isolated run) | **65 passed / 6 files** |
| `pnpm build` | PASS; existing large-bundle warning from Vite remains |
| `pnpm verify:assets` | PASS; approved character lock and old assets, plus 9 ART-01 sources / 6 atlases / 59 RGBA PNGs |
| `pnpm test:e2e` | **20 passed, 1 failed** on the old navigation helper; other 20 cases included both normal styles, all authored animation tags, six players, combat/progression, room isolation flows and all menu sizes |
| `node tools/run-playwright.mjs test tests/e2e/art01.spec.ts tests/e2e/gameplay.spec.ts -g 'live arena\|fixed follow'` | **4 passed** after bounded-key route correction and final courtyard alignment; final 954×458, 1280×720, 1920×1080 captures |
| Same two specs with `-g '1280x720\|fixed follow'` | **2 passed** after extending checks: every water/glow frame observed and real keyboard routes around statue plus foreground tree occlusion |
| `pnpm exec prettier --check` on changed implementation/test/script files | PASS |

All 21 browser scenarios are therefore covered by passing full-run cases or the corrected targeted reruns; a clean final **21/21 aggregate command was not rerun**. Actual results are recorded above instead of inventing that result. The last two-case run completed in 1.1 minutes; the navigation case completed in 39.5 seconds.

No new JavaScript/asset request errors were observed in the verified browser scenarios. The headless Chromium software renderer emitted GPU ReadPixels performance messages during screenshot-heavy runs; no hardware performance/60-minute match claim is made. No gameplay/server source changes were made by ART-01.

Live HP changed in captured play (for example 133/160 in the final 720p capture); mana/cooldowns were checked against the server state, and existing combat/progression checks verified rewards and leveling. All four frames of `cascade_flow`, `stream_pool_flow` and `lantern_glow` were actually observed. Their alpha silhouettes remain identical across frames in asset validation, preventing bank/prop frame jumps. The banner has no animation and is honestly marked static.

The final marker-aligned three-size captures replace earlier versions. `walk_*.png` and any old video files under the ART-01 evidence folder are intermediate captures; use the final gameplay, route and tree evidence linked here, or the completed Cái Bang regression captures for animation review.

The comparison board contains resized previews for like-width composition comparison. The linked gameplay screenshots remain at their original capture resolutions for normal-zoom art review. Final manifest: 42 recorded components, 35 integrated and runtime-verified, 7 produced-only components (including unsupported consumable/state artwork), and zero director approvals.

## Official API checks

Installed Phaser 4.2.1 and @colyseus/sdk 0.18.8 were inspected before API use. Official docs consulted: [Phaser Image](https://docs.phaser.io/api-documentation/class/gameobjects-image), [AnimationManager](https://docs.phaser.io/api-documentation/class/animations-animationmanager), [Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager), [Colyseus 0.18 TypeScript](https://docs.colyseus.io/getting-started/typescript), [Aseprite CLI](https://www.aseprite.org/docs/cli/), [Sprite](https://www.aseprite.org/api/sprite) and [ExportSpriteSheet](https://www.aseprite.org/api/command/ExportSpriteSheet). No engine/library upgrade was made.

Historical reference filenames contain discrepancies: `vo_dang_art_direction_reference.png` is absent, so the existing `vo_dang_character_reference.png` was inspected; `current_codex_dashboard_anti_reference.png` contains a Võ Đang sheet, and `wuxia_town_world_reference.png` contains an old dashboard screenshot. The corrected requested concepts, actual current-build image and dated rejected screenshot were used as primary evidence. The [reference contact sheet](evidence/art01/reference-contact.png) records the inspected historical images.

The checkout already contained extensive prior changes. Those were preserved; aggregate Git diff output includes earlier work and is not an attribution of every changed file to this task.

## Approval gate

Concept direction: user approved. Produced assets: yes. Integrated into the actual game: yes. Runtime verification: command/evidence results above. **Director-approved runtime art: no.** Review the actual normal-zoom screenshots before expansion to further environments or characters.
