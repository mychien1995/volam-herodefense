# Bamboo Forest Phase 2 — production and live integration review

Status: **APPROVED — production assets and integrated in-game environment**.
Date: 2026-10-31 (Asia/Saigon).
Branch: codex/bamboo-forest-concepts; base checkpoint: 90bffac (M2C).
The separate main checkout contains newer work in progress. This phase is implemented and tested in this isolated worktree; that checkout was not overwritten.

## Delivered

- 344 reusable32×32 terrain tiles: six authored materials and five corner-transition families with four phase variants. Terrain export512×704; no flattened dungeon background.
- 19 transparent named scenery frames in one padded1024×768 atlas: two tall bamboo clusters, individual bamboo, bush, grass/flower tuft, root, stump, foreground canopy, lantern, ruined wall, shrine, fence, gate, monument, training dummy, rocks, exit portal, bridge deck and bridge front rail.
- 20 editable Aseprite sources:19 component sprites plus terrain. Individual component PNGs and retained generated originals are under assets/source/bamboo_forest/.
- One improved maps/creep_forest.tmj: existing960×640 orthogonal32px map, three connected combat areas, upper ruins/training dressing, southern stream and two optional broad bridges;70 reusable scenery placements.
- Existing shared map preparation sends the same collision rectangles/markers to server and client. No new mapping pipeline or client-authoritative collision.
- Dungeon-only presentation renders ground/paving/details tile layers, low decorations, feet-sorted tall props and separate bridge front rail. Two lines in art.ts register the new dungeon preload; arena renderer/content are unchanged.
- Seven actual in-game PNGs and read-only state/frame observations.

## Approved concept → production output → use

| Approved concept | Production output | In-game use |
|---|---|---|
| dungeon-overview.png | maps/creep_forest.tmj | Western entry/exit, connected west/central/east clearings, north ruins and southern scenic stream/bridges. |
| terrain-concept.png | assets/exports/bamboo_forest/terrain.png; source material_0..5.png and terrain.aseprite | Orthogonal ground/paving/details tile layers; grass, dirt, moss, stone, leaves, water and transitions. |
| vegetation-concept.png | scenery atlas frames bamboo_jade, bamboo_gold, bamboo_single, bush, grass_tuft, moss_root, stump, canopy | Dense forest perimeter; trunk collision anchors; base/foreground overlap via foot Y-depth. |
| structures-concept.png | stone_lantern, ruin_wall, shrine, bamboo_fence, bamboo_gate, stone_monument, training_dummy, moss_rocks, bridge_deck, bridge_front | Scenic borders and training area; shared map footprint rectangles; walkable bridge deck below actors/front rail sorted above. |
| combat-clearing-and-portal.png | exit_portal frame and open clearing placement | Existing physical return at(160,320), visible blue portal and unchanged server-validated interaction range. |

All five approved concept PNG hashes still match approved_concepts_v1.lock.json.
Main Arena equivalent inspected at assets/concept/arena-v2-approved.png; the requested assets/concepts/arena-environment/ alias directory is absent.
Actual approved character/arena-creep images from the main checkout were inspected as scale/style references only. No actor images were modified or new enemies generated.

## Actual validation commands and results

| Command | Result |
|---|---|
| pnpm install --frozen-lockfile | PASS; locked dependencies installed. Offline attempt lacked registry metadata; online install passed existing supply-chain checks. |
| node scripts/export-bamboo-forest.mjs --prepare | PASS; created editable source files then synchronously exported them. Ordinary exports omit --prepare. |
| pnpm typecheck | PASS; project and test/tool TypeScript. |
| pnpm test | PASS:101 tests in12 files, including3 new map checks and existing room/network/invasion/dungeon tests. |
| pnpm verify:assets | PASS: all4 validators, including19 transparent scenery frames,344 opaque active tiles,6 periodic material samples,70 valid scenery placements and unchanged approved concept/hero hashes. |
| VITE_SERVER_URL=http://127.0.0.1:2587 pnpm --filter @volam/game-client build | PASS; Vite8.3.5 / Phaser4.2.1. Existing large-client-chunk warning remains. |
| node tools/run-playwright.mjs test --config playwright.bamboo.config.ts | PASS: all7 scenarios in3.0minutes; dedicated server2587/client5187. Chromium from an existing local installed browser cache. |
| pnpm exec tsc -p tsconfig.tools.json --noEmit; git diff --check | PASS after final configuration changes. |

Browser video and trace screenshot streams were disabled. No WebM/MP4/GIF evidence was generated.
The worktree checkpoint has no check:final script; the actual commands above retain typecheck, full unit/network tests, build, all asset validators and the relevant browser checks.

Seven browser cases:
1. Six actual participants in the shared forest: two rendered browser clients and four ordinary SDK clients, all confirmed through the normal protocol. Auxiliary participants moved with sequenced input commands; no position injection or special gameplay tuning. Both rendered clients observed all six heroes.
2. Shared wave farming, normal menu entry and physical exit.
3. Separate private instances, rewards, empty pause and resume.
4. Eight-way keyboard movement, follow camera and foreground occlusion.
5. Two-client combat agreement, manual cadence, skills and progression.
6. Non-homing fixed projectile trajectory.
7. Actual loaded PNG animation registry.

The forest case verified collision at the existing western bamboo anchor, matched the authoritative position on the second client, observed multiple actual walk frames, walked north/behind and south/in front of bamboo, crossed a bridge, and used the physical exit while the other player remained in the dungeon.
The map checks verify all six entry seats, all12 enemy slots, exit connectivity, all three clearings and both bridge centers with the real hero radius. Server-owned movement blocks bamboo/stream solids while allowing the bridge lane.
Observed live data is in observations.json; it is not fabricated from expected values.

## Actual in-game PNG evidence

- six_players_1920.png — six visible participant designs at normal gameplay zoom.
- entry_portal_1280.png — portal and actor readability at1280×720.
- bamboo_collision.png — actual stopped movement at the shared solid footprint.
- behind_bamboo.png / in_front_of_bamboo.png — real north/south foot-depth ordering.
- training_clearing_1920.png — central paving and open fighting floor.
- bridge_and_stream.png — hero standing on the walkable deck, with water/bank scenery and front rail.

Visual comparison: the rendered forest preserves approved emerald/jade/yellow-green bamboo, warm brown dirt/wood, gray mossy Chinese ruins, amber lanterns and a blue exit. Tall repeated bamboo surrounds open low-detail paths; visible frontal structure faces and square terrain preserve the arena's elevated orthographic camera. Native terrain density was enlarged after the first live check to align stone/ground detail with props and44px hero bodies.
Exports have real binary transparency and no green matte/checkerboard. Active tile cells fully cover the ground; no missing textures, black gaps, invalid frames or layer errors were seen in the inspected PNGs. Both browser clients reported no console/page/HTTP errors.

## Remaining art review points and scope

- Northern shrine is partly obscured by foreground bamboo. This is valid depth sorting but its composition may merit director adjustment.
- Materials use periodic64px samples; repeated motifs can be visible on large empty areas. Additional artist-painted variants can follow approval if desired.
- Portal glow and foliage are static authored art. No water/foliage/portal animation is claimed.
- The round training court is approximated with32px transition tiles; it is not a pixel-for-pixel copy of the illustration.
- Existing M2C enemy placeholders remain visible. This phase did not generate or replace Bamboo Forest creeps or modify arena actors.
- This implementation targets the isolated M2C worktree. Integrating with newer concurrent main-checkout changes requires normal review/merge; no other session's code was copied or reset.
- The director explicitly approved the production assets and reviewed normal-zoom in-game result on 2026-10-31. Earlier concept approval remains preserved.

No enemy balance, wave mechanics, scaling, rewards, progression, map dimensions, spawn identities, entry/exit coordinates or core UI rules changed. Only environment collision footprints and presentation were authored. No other dungeon or art category was started.

## Files changed

Complete Phase2 inventory: FILES_CHANGED.txt.
Runtime: apps/game-client/src/dungeon-presentation.ts, two loader lines in art.ts, maps/creep_forest.tmj.
Tooling: package.json scripts; build-bamboo-forest.py, export-bamboo-forest.lua/.mjs, verify-bamboo-forest.py.
Art: assets/source/bamboo_forest/, assets/exports/bamboo_forest/, assets/bamboo_forest.manifest.json.
Validation: tests/bamboo-map.test.ts, tests/e2e/bamboo-forest.spec.ts, tests/e2e/bamboo-setup.ts, playwright.bamboo.config.ts and this review folder.
Approved concept files are unchanged.

## Re-export / reproduce

See assets/source/bamboo_forest/README.md. Ordinary `pnpm assets:export:bamboo` consumes artist-edited Aseprite sources; normal game builds consume retained PNG/JSON exports and do not require Aseprite.
For the dedicated browser suite, build the client with VITE_SERVER_URL=http://127.0.0.1:2587 and set PLAYWRIGHT_BROWSERS_PATH to an installed Chromium cache if the default cache is absent.
Official API checked against installed Phaser4.2.1: https://phaser.io/oss/docs/api-documentation/4.0.0/class/tilemaps-tilemap (addTilesetImage/createLayer); current local type declarations/typecheck and actual rendering verified the calls.

**STOP: Bamboo Forest Phase 2 is approved. Subsequent phases require a separate task.**

## Director approval — 2026-10-31

The user explicitly approved the full Phase 2 delivery: “all approve”. Approval covers the production environment assets, one implemented dungeon map and reviewed in-game result. The review points above remain useful follow-up notes, not an outstanding approval gate. No next-phase work or Bamboo Forest creeps are authorized by this approval.

All reviewed source/export/map hashes were verified before this metadata update; raster, Aseprite and map bytes are unchanged. assets/approved_bamboo_forest.lock.json records the approved snapshot. This approval update does not install a new runtime guard.
