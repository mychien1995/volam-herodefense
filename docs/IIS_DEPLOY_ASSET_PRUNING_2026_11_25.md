# IIS production asset selection — 2026-11-25

The user requested removing unused old atlases from the IIS ZIP while preserving current graphics/gameplay. Source art and game code are unchanged. Pruning applies only to the deployment staging directory.

## Selection and safety

`tools/audit-deploy-assets.mjs` runs the actual `ArenaScene` eager preload in a dedicated headless Phaser scene. It exercises all current school profiles, the three M4D arena variants, wave bosses, dungeon packs, Loi Dai and PvP, including real pack expansion and production image/atlas replacement handlers. Raster requests are recorded after replacement; a tiny HTTP image is used only inside this audit tool to avoid decoding every dungeon atlas simultaneously. This is reachability evidence, not visual acceptance. The game build never imports the audit scene.

Literal asset URLs in CSS/HTML are also retained. Dynamic DOM avatar/portrait/icon files are protected independently of Phaser, following `hero-portraits.ts` and the `skillIcon` URL builder. Early candidates exposed missing school portraits in build diagnostics and dynamic avatars/icons in the browser smoke; both gaps were corrected before delivery and covered by regressions.

`assets/deploy-runtime-assets.json` contains 1,619 retained URLs and hashes for 3,002 source/manifest/style inputs. `scripts/deploy-asset-selection.mjs` checks the current inputs and fails closed when the audit is stale, incomplete or contains invalid paths. Text line endings are normalized for these dependency hashes; artwork bytes are never rewritten.

Only explicitly audited atlas families are filtered: renovation versions, visual-improvement-approved, unified character/boss versions, hero-finish/motion and skill-revise versions. Other UI/audio/data namespaces preserve previous packaging behavior. Old atlases still requested by the current preload/fallback paths stay in the ZIP. Historical comparison modes are outside this production selection; their source assets remain in the repository.

The existing exact-PNG deduplication remains in place. Both the bundle aliases and the IIS rewrite map are generated from the retained files. The ZIP remains self-contained for the original `hero-defense.stackfolio.cloud/game-api` endpoint.

## Building

After changes to loader inputs, prepare assets and refresh the audit:

```powershell
pnpm assets:prepare
node tools/audit-deploy-assets.mjs
```

The audit requires the installed Playwright Chromium cache; it uses the repository's QA browser environment. Ordinary packaging checks the pinned inputs without rerunning the browser audit:

```powershell
./build-windows-iis.ps1 -ArchiveName volam-hero-defense-windows-iis-m4d-slim.zip
```

`ArchiveName` accepts a ZIP filename inside `artifacts`. The previous full ZIP remains available for comparison. A `.zip.assets.json` sidecar records retained files, aliases, excluded files and size totals. This sidecar is for audit, not required by IIS.

## Artifact verification

The original IIS ZIP was 845,021,477 bytes. The filtered ZIP is 683,240,252 bytes, saving 161,781,225 bytes (19.1%). The staging report lists 732 excluded atlas/metadata files. No textures were resized, re-encoded or repacked internally.

Fresh archive checks validate ZIP CRC, resolve all 1,619 audited URLs through the packaged IIS alias map, and compare their bytes to the prepared originals. They also compare 3,569 retained image/audio/JSON files and all 2,477 server files to the previous full ZIP. All 175 audio files remain. See `artifacts/iis-slim-verification.json` and the ZIP's `.assets.json` sidecar.

Focused regressions cover current versus unrequested atlas selection, unrelated UI/audio retention, CSS portraits outside Phaser, stale/added/removed source inputs, failed audits and invalid paths. These are packaging checks; they do not assert new combat balance or new-art approval.

Four focused regressions passed. The actual extracted final ZIP was then tested with two independent browser contexts and real server connections: lobby/branch selection, synchronized movement, A protocol acknowledgment, current Nam Đế hắc hóa body/aura and HUD, no missing asset responses and no JavaScript errors. HTTP routing, the `/game-api` prefix and IIS asset aliases were emulated locally; no live IIS deployment or full campaign test is claimed. Isolated DEV progression flags were used only to reach the boss for this render check. The peer naturally died while combat continued during screenshot capture, causing the expected grayscale death view. A hit/damage outcome is not claimed by the final packaging smoke.

A separate production-mode startup and real SDK room creation passed with DEV boss progression disabled. The final PNGs, browser harness/results, byte verification and production smoke are retained under `docs/evidence/iis-deploy-prune/`. No gameplay/core/server source or approved artwork was modified. Historical capture/selector/DOM-dependency failures remain in the local `.cache/iis-slim-*` diagnostic logs; they are not counted as passing checks.
