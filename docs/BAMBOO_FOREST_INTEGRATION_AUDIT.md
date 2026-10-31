# Bamboo Forest integration audit — 2026-10-31

Runtime adapter update: [Forest candidate integration](FOREST_CREEP_RUNTIME_INTEGRATION.md) now documents the shared loader/registry/renderer and event bindings, including controlled room tests. Normal Forest waves still lack an authoritative roster/type mapping and retain the labelled placeholder. Original audit findings below are historical; neither the art batch nor this adapter grants director approval.

Subsequent production update: the six Forest creep **candidate** packages now exist and have passed isolated Phaser review. See [the art batch report](../assets/reviews/forest_creeps_v01/README.md) for concepts, 384 character cels, 112 VFX cels, provenance and verification. This does not change the original audit findings below or approve/integrate the creatures: normal dungeon gameplay still uses the labelled placeholder pending director approval and authoritative Forest archetype mapping.

Scope: retained Bamboo Forest assets and Phaser 4.2.1 integration only. No artwork generation/export, map edit, new creep, milestone expansion or production simulation/protocol change.

## Approval and missing art

The environment is **APPROVED**, as recorded by `assets/bamboo_forest.manifest.json` and `assets/approved_bamboo_forest.lock.json`: the director's “all approve” covers Phase 2 production environment and the reviewed running map. It explicitly excludes subsequent creep production. This task preserves those source/export/map bytes and approval metadata.

Forest-specific creep production assets were **not found**. Audit covered repository filenames and creep atlas/manifest inventories, including `assets/exports/enemies`, `assets/sprites/creeps/dungeons`, `sprites/creeps`, `assets/concepts/dungeon-creeps`, the global art manifest and public preparation/loader code. Dungeon production folders contain desert, beach and hell; `sprites/creeps` contains arena production. The beach manifest references the Bamboo environment as an environment benchmark, not a forest creep export. Toàn Chân Trúc Lâm boss-environment tiles/props are separate assets and are not substituted here.

The existing `creep_outlaw` remains an explicitly labelled **PLACEHOLDER** in the forest. Its actual metadata calls it an M1 prototype: `assets/source/m1_art.py` → `assets/exports/enemies/creep_outlaw.png` / `.json`, original project pixel primitives, 48×48 frames, foot origin (0.5,1), scale1. It is visibly below the approved environment/hero standard. It is not any of the finished arena or other-dungeon creeps. Existing 6 poses ×4 facings ×4 frames =96 frame references are retained; idle8fps, walk10fps, other poses8fps. No claim of finished forest creep art is made.

`CreepState` currently supplies zone, invasion wave, position, facing and pose, but no forest `typeId`. `arenaCreepArt` correctly rejects non-arena zones. A future forest binding needs retained, provenance-reviewed forest PNG/atlas/animation manifests and authoritative creep type IDs. Neither type IDs nor a guessed art mapping are added by this integration task.

## Verified pipeline and scoped fixes

| Stage | Actual path / behavior |
| --- | --- |
| Retained editable source | `assets/source/bamboo_forest/terrain.aseprite`, `sprites/*.aseprite`, PNG components, metadata and generation provenance |
| Explicit artist export | `scripts/export-bamboo-forest.mjs` / `.lua`; not invoked by this task or normal prepare |
| Retained exports | `assets/exports/bamboo_forest/terrain.png` (512×704,344 32px tiles), scenery PNG (1024×768) + hash JSON (19 frames) |
| Preparation | Existing recursive export copy to `apps/game-client/public/assets/bamboo_forest`; same Tiled bytes copied to public and `game-data/src/creep-forest-map.json` |
| Preload | `art.ts` calls `preloadBambooForestArt` and loads `creep_forest.tmj`; texture keys `bamboo_terrain`, `bamboo_scenery` |
| Scene | `dungeon-presentation.ts`: ground/paving/details,70 scenery instances, feet-sorted tall props, ground deck and separate front rail, physical exit; unchanged |
| Authority | `game-data/dungeon.ts` parses shared Tiled collision/markers; existing server/core own movement,AI,damage,timing,RNG and rewards; unchanged |

Fixed missing preparation protection by adding the approved Bamboo lock to the pre-copy hash guard. Extended its validator to check the complete production lock and exact public/shared-map parity. Existing copy-if-changed behavior remains.

Added a concise placeholder notice to the existing in-viewport dungeon status overlay. No exterior panel, viewport reduction, art replacement or creep nameplate was introduced. Scene inspection now reports placeholder status, actual fallback frame observations/completions and scenery pivots/depth/scale. These are read-only diagnostics; playback selection, hit timing and combat remain unchanged.

## Live verification and evidence

`tests/e2e/bamboo-forest.spec.ts` retains the six-participant map check (2 rendered Chromium clients +4 ordinary SDK peers). It walks into solid bamboo, checks the authoritative position on the other client, passes behind/in front of bamboo, crosses a bridge and physically clicks the exit while the other player remains inside. Added assertions compare all70 scenery origins with approved metadata, enforce native scale and deck/front depth, verify the full1280×720 viewport and placeholder notice, and observe all96 placeholder frame references across24 clips, including completion of one-shots and matching peer poses.

The pose review uses a loopback-only middleware installed exclusively by `tests/e2e/bamboo-setup.ts`. It holds one existing enemy in each pose/facing using a server-owned test fixture; the other existing enemies stay alive so death review cannot advance the wave. It adds no public gameplay message, production debug setter, enemy type or creature. Controlled pose coverage does not count as natural AI/combat acceptance. The existing shared/private dungeon Playwright scenarios separately exercise ordinary attacks, HP, rewards, pause/resume, instance isolation and physical return.

New evidence is under `docs/evidence/bamboo-integration-2026-10-31/`, preserving previous approved review evidence. Only PNGs and JSON/logs are generated. Screenshots are inspected against `forest_dungeon_reference.png`, world/HUD references and the rejected placeholder screenshot: authored foliage/stone/water/portal remain coherent at normal zoom; the blocky M1 enemies visibly remain placeholders. The requested legacy `vo_dang_art_direction_reference.png` alias is absent; the existing `vo_dang_character_reference.png` was inspected instead. The file named dashboard anti-reference contains a character sheet; the actual placeholder anti-reference was also inspected.

## Executed results

- `python -X utf8 scripts/verify-bamboo-forest.py`: PASS;19 sprites,344 tiles,6 materials,70 placements; all60 production-locked files unchanged; source/export/public/shared-map parity confirmed. Exact hashes/inventory are in `docs/evidence/bamboo-integration-2026-10-31/asset-audit.json`.
- `pnpm check:browser --config playwright.bamboo.config.ts tests/e2e/bamboo-forest.spec.ts`: preparation,compilation and build passed; its initial test setup failed because the test wrapper was created before the service had a URL. Subsequent browser-only iteration corrected middleware registration and removed an incorrect assumption that six late-joining participants would expand the already-spawned three-creep wave. The final focused `node tools/run-playwright.mjs test --config playwright.bamboo.config.ts tests/e2e/bamboo-forest.spec.ts` passed,1 scenario in1.3m. No production spawn/scaling rules were changed. Retained successful iteration output: `iteration-browser.log` in the evidence folder.
- `pnpm check:final --config playwright.bamboo.config.ts`: **PASS in262.09s**. Preparation once (0 written,2349 unchanged),project compilation,tool/test typechecks,8 workflow regressions,**330 unit/integration tests in26 files**,production client build,all**10 asset validators**,then **6 Chromium scenarios passed in3.3m**. Exact output: `docs/evidence/bamboo-integration-2026-10-31/check-final.log`.
- Browser scenarios: six-participant Bamboo map/depth/collision/24 placeholder clips; shared dungeon natural combat/rewards/physical exit; private-instance farming/isolation/pause/resume; follow camera/eight-way movement/foreground; fixed-trajectory projectile; existing PNG animation registry. The configuration explicitly excludes its historical free-skill combat test (`two clients agree on combat`); current shared/private dungeon combat/reward scenarios did run.
- All96 placeholder frame names observed; attack/cast/hurt/death completions recorded for each facing; origin(0.5,1),scale1 and feet Y-depth asserted. Loop frame sets include live observations accumulated since zone entry; JSON timing values are observation-window durations,not measured frame-rate benchmarks. Controlled pose clips do not prove natural hurt-pose duration or final art quality. Read-only observations and all client error checks are in `observations.json` (errors:[]).
- `pnpm exec prettier --check` on the six affected TypeScript/JavaScript files: PASS. `git diff --check`: PASS,with existing repository CRLF normalization notices. No video/trace screenshot stream or artwork generation was used.

PNG evidence: `entry_portal_1280.png`, `six_players_1920.png`, `bamboo_collision.png`, `behind_bamboo.png`, `in_front_of_bamboo.png`, `training_clearing_1920.png`, `bridge_and_stream.png`, and `creep_placeholder_walk_{down,left,right,up}.png`. Actual entry/depth/bridge and left/up placeholder PNGs were opened and inspected. Normal camera zoom1 with2× display pixels is retained; the compact HUD/status remains inside the viewport. Original approved review evidence is unchanged.

Changed source/test files:

- `scripts/prepare-assets.mjs`, `scripts/verify-bamboo-forest.py`: approved-byte protection and deployed-asset parity.
- `apps/game-client/src/art.ts`, `arena-scene.ts`, `ui.ts`: explicit retained placeholder identity/notice and read-only frame/scenery diagnostics.
- `tests/e2e/bamboo-setup.ts`, `bamboo-forest.spec.ts`: isolated server pose fixture,live assertions and new evidence destination.
- This report and the new evidence directory. `dungeon-presentation.ts`,all approved artwork,`maps/creep_forest.tmj`,approval manifests/locks,server/core/protocol and tuning were not edited by this task. Existing unrelated checkout changes were retained.

Remaining: dedicated forest creep artwork/provenance and authoritative forest type identifiers. Environment approval remains intact; the placeholders and passing engineering checks do not grant creep art approval. No new milestone is implemented.
