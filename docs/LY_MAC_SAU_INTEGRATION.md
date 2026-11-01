# Lý Mạc Sầu / Cổ Mộ Phái — runtime integration

## Peer dungeon card correction — 2026-11-01

The director requests Lý Mạc Sầu as a peer dungeon room in the same destination grid as Hồng Liệt and Chu Bá Thông. It now has a full equal-sized card titled **Lý Mạc Sầu**, subtitle **Cổ Mộ Phái · Thủ lĩnh**, and the retained approved cave illustration. The old options-row button and its CSS are removed; select the card, choose Riêng/Chung, then use the common **Vào Phó Bản** action. Destination `co_mo`, protocol and encounter mechanics remain unchanged. The illustration is copied byte-for-byte for the menu only; the asset validator checks equality with its approved source.

Executed `$env:LY_MAC_SAU_QA_EVIDENCE_DIR='docs/evidence/ly-mac-sau-dungeon-card'; pnpm check:final --config playwright.ly-mac-sau.config.ts tests/e2e/ly-mac-sau.spec.ts --grep 'M3D selector'`: **PASS in191.57s**, project/tool typechecks,18 workflow checks,445 unit/integration tests, production build,15 asset validators and the relevant live browser selector case. It entered all six supported destinations via normal UI; checked the three boss cards share a row and dimensions, thumbnail loaded, selection/check state, no options-row destination, and in-viewport overlay bounds at960×600,1280×720 and1920×1080. All three PNGs were opened: peer cards and selection are visible; retained title-font accent spacing remains. No boss gameplay/artwork/recording changes or new six-client combat claim.

New [verification](evidence/ly-mac-sau-dungeon-card/verification.json), [pipeline](evidence/ly-mac-sau-dungeon-card/check-final-stages.json), [browser report](evidence/ly-mac-sau-dungeon-card/selector-regression.json), [1280 menu](evidence/ly-mac-sau-dungeon-card/dungeon-selector-1280.png), [960 menu](evidence/ly-mac-sau-dungeon-card/dungeon-selector-960.png), [1920 menu](evidence/ly-mac-sau-dungeon-card/dungeon-selector-1920.png). Previous merge evidence below is historical and preserved.

## Follow-up: merged into milestone/m3d — 2026-11-01

The director explicitly requested committing and merging this integration into `milestone/m3d`, preserving existing features and retesting selection. Source worktree changes are committed as `4af60478`; the merge target is `D:/Projects/volam-hero-defense`, base `ac08a6f0`. Earlier isolated-worktree descriptions and protocol14 details below are historical; the combined schema is **protocol16**.

The merge retains Forest/Desert/Beach, Hoàn Nhan Hồng Liệt and Chu Bá Thông. Their registry entries, loaders/renderers, encounter clocks, Chu roll/pass and pickup/sell/drop requests, owned items and school/progression features remain. Cổ Mộ uses its separate adapter, countdown and pending loot claims. A `CoMoBossCast` type avoids the existing Hồng Liệt export name; existing crowd-control scaling is preserved separately from Cổ Mộ resistance. Approved raster bytes are unchanged; exact approved metadata line endings are pinned for checkout reproducibility.

**Play from the main checkout:** restart any older dev processes, run `start-game.cmd` (or `pnpm dev`) in `D:/Projects/volam-hero-defense`, reload the client, join/start a normal match and open **Phó Bản**. Select the **Lý Mạc Sầu** destination card (subtitle **Cổ Mộ Phái · Thủ lĩnh**) alongside Hồng Liệt and Chu Bá Thông, choose **Riêng/Chung**, then **Vào Phó Bản**. Use Space at the south exit. Both client and server must use the merged protocol.

Final executed command (PowerShell):

```powershell
$env:LY_MAC_SAU_QA_PLAYERS='6'
$env:LY_MAC_SAU_QA_EVIDENCE_DIR='docs/evidence/ly-mac-sau-m3d-merge'
pnpm check:final --config playwright.ly-mac-sau.config.ts
```

**PASS in 315.25s**: project and test/tool typechecks,18 workflow checks,445 unit/integration tests across37 files, production build,15 asset validators and4 browser cases. The two existing dungeon cases passed; six real Phaser clients observed192 actor cels/all six actions, moved/fought, killed the boss, received exactly one shared rolled claim, verified private/shared isolation and normal Space exit/cleanup. Browser errors were empty. The added selector regression created normal matches and used only real UI entry into all six supported destinations; Cổ Mộ overlays fit1280×720 and1920×1080. Legal level15 grants/pose arrangements are disclosed fixtures in the six-client case, not production endpoints. Separate old boss-specific browser suites and balance probes were not rerun in this merge task.

New evidence preserves earlier reports: [verification](evidence/ly-mac-sau-m3d-merge/verification.json), [pipeline timings](evidence/ly-mac-sau-m3d-merge/check-final-stages.json), [six clients](evidence/ly-mac-sau-m3d-merge/6-players.json), [selector regression](evidence/ly-mac-sau-m3d-merge/selector-regression.json), [1280 menu](evidence/ly-mac-sau-m3d-merge/dungeon-selector-1280.png), [1920 menu](evidence/ly-mac-sau-m3d-merge/dungeon-selector-1920.png), [combat](evidence/ly-mac-sau-m3d-merge/arena-natural-combat.png). Opened both menus and both actual arena PNGs: the viewport remains dominant, Cổ Mộ is selectable in the lower row, retained character/prop detail is present; repeated floor tiles and dense melee labels/effects remain. The existing large-client-chunk warning persists. No artwork generation or recordings. Runtime director art/tuning approval remains pending; Cổ Mộ claims have no full M4 equipment/selling/drop/crafting support, while existing Chu item transactions remain available.

Worktree `ly-mac-sau`, branch `codex/m3d/ly-mac-sau`, based on `0aeddd21`. The director explicitly authorized this encounter on 2026-11-01 after approving the v02 artwork preview. This is one encounter, not completion of the full M4 inventory/crafting milestone or an authorization for other bosses.

## Play

From this worktree run `pnpm dev`, open the printed client URL, create/join a room and confirm schools normally. In the match open **Phó Bản → Cổ Mộ Phái · Lý Mạc Sầu**, select **Riêng** or **Chung**, then **Vào Phó Bản**. Shared supports up to six room members; private remains one player per owner. Arrow keys move, A attacks, QWER use the equipped skills. Reach the south gate and press Space to exit. Death retains the existing five-second arena respawn and no gold/XP penalty.

The trial encounter has fixed 1800 HP/12 defense for both solo and shared, with no repeated-kill scaling. The boss pursues living players, telegraphs attacks, locks actions through their recovery, and rotates needle → radial palms → summons → edge palms → frontal sweep, with ordinary frontal duster attacks between skills. The sweep waits for a nearby target. Control durations are reduced by 80%; forced movement/confinement cannot displace the boss. None of these numeric values is final balance approval.

| Attack | Authoritative behavior | Presentation |
| --- | --- | --- |
| Đánh thường | Forward 70px arc, delayed contact, reduced secondary cleave | Four-direction phất trần frames and contact raster |
| Băng Phách Ngân Châm | One selected living player in the instance, aim sampled at release; one straight non-homing missile; no splash or additional target | Needle cast, target cue, needle travel/impact |
| Xích Luyện Chưởng | Eight fixed vectors, simultaneous release, 620px configured range; terrain still blocks flight | Approved `purple_v02` charge/lane/projectile/impact; retained red palms excluded |
| Phất Trần Công | Delayed forward 120px cone; never hits behind the captured heading | Frontal warning and duster crescent |
| Cổ Mộ Kiếm Pháp | Four real sword-wielding creep actors at authored markers; cap four, 16-second lifetime, ordinary pursuit/melee AI, zero XP/gold farming | Sigils/spawn, independent idle/walk/attack/hurt/death |
| Ngũ Độc Chưởng | Three inward lanes from each of four shared world-boundary marker groups; no per-viewport missile spawning | Edge warning/emission and poison-colored palm rasters; off-camera warning cues clamp into the viewport, while actual launch positions remain server-owned |

No poison, slow, drain or stun is inferred from the image names. The existing mitigation, mana shields, dash guards, damage events and XP/gold split are reused. All damage, target eligibility, RNG, cooldowns, trajectories, collision and summon existence are server-owned.

## Lifecycle and rewards

An empty living-boss instance pauses simulation and starts a separate match-clock 30-second reset deadline. Reentry before expiry cancels that deadline; expiry restores boss HP/position once and removes owned missiles/summons. A defeated boss uses its separate 30-second respawn cooldown, including while the instance is empty, and cannot be resurrected early by the empty-reset path. An occupied boss instance never becomes a regular progressive creep wave.

Boss death settles in the same simulation tick, including a finishing burn/counter. It cancels the cast and owned projectiles and dismisses summons. One fixed XP/gold pool is divided among present players who landed a hit; boss assists do not expire merely because the fight lasted longer than a regular-creep assist window.

Exactly one provisional item is drawn per kill and automatically rolled among present contributors; uniform 1–100, stable ASCII-ID tie-break, solo automatic winner. The per-instance kill serial prevents duplicate claims. The two trial item identities are Cổ Mộ Ngọc Bội / Ngân Châm Nang. These are **match-only pending loot claims**, carried with the winning hero through travel/death, shown in the compact notice and inventory menu. They have no invented equipment stats. Full M4 equip/sell/drop/crafting/backpack-capacity and manual Roll/Pass UI remain unimplemented. This preserves one-item ownership without pretending the complete inventory milestone exists.

## Architecture and assets

- `packages/game-core/src/boss-types.ts`, `boss-encounter.ts`: engine-independent encounter state, attacks, summons and unique reward settlement.
- `simulation.ts`: narrowly extends swept projectiles to hostile hero targets; ordinary hero projectiles retain creep targets. Finishing late-tick damage settles boss death before snapshot projection.
- `dungeons.ts`: optional boss definition, independent empty/reset/respawn deadlines and private/shared lifecycle.
- `packages/game-data/src/ly-mac-sau.ts`: validated tunables, canonical Vietnamese names, map-derived spawn/summon/emitter/collision data. Existing 43 school actives and eight basics are unchanged.
- Protocol 14 adds destination `co_mo`, cast warning metadata, respawn countdown and pending claims. Existing StateViews isolate all spatial actor/projectile state by instance; clients gain no boss-control message.
- `apps/game-client/src/co-mo-art.ts`: approved atlas registration, tile layers/feet-sorted scenery, authored warning/travel/contact effects and observations. Shared actor playback retains the original four facings, 144×128/feet(72,104) boss and 112×112/feet(56,88) summon.
- `maps/boss_co_mo.tmj`: retained orthogonal 40×30 Tiled source; ground/details/scenery/collision/markers. Edit this in Tiled or as JSON. `scripts/compose-ly-mac-sau-map.mjs` is an explicit authoring recipe, not a build-time overwrite. Preparation copies the retained map to the authoritative game-data JSON and public client source byte-for-byte.
- `scripts/prepare-ly-mac-sau.mjs`: checks all 400 explicit approval hashes, copies existing PNG/hash-JSON atlases and adapts animation metadata. No source PNG is painted, regenerated, recolored or overwritten. The flattened arena illustration is not loaded as a fake runtime map.
- `scripts/verify-ly-mac-sau.py`: guards approval hashes, every source/export frame/atlas, runtime copy equality, purple bindings, map/layer integrity and required markers. Included in `verify:assets` and the final pipeline.

Original/AI-generated provenance and exact prompts stay in `assets/reviews/ly_mac_sau_v02/` and the retained v01 source folders. `art_approval_v02.json` is the explicit **art-preview** approval; source manifests and old reports retain their historical states. Runtime director approval remains pending.

### Checkout reproducibility

The fresh worktree converted previously pinned CRLF JSON metadata to LF and failed existing asset guards before compiling. Only conversions whose resulting SHA-256 exactly matched retained recorded hashes were restored. `.gitattributes` records those original line endings, including the old arena atlas sources; no expected hash or pixel artwork was changed and no guard was relaxed. Normalized unrelated Git contents remain unchanged. This fixes preparation for the isolated checkout rather than borrowing another worktree's generated build.

## Verification

- Locked dependencies installed independently in this worktree; Phaser 4.2.1, Colyseus core 0.18.23 / SDK 0.18.8 / schema 5.0.42. Consulted current [Phaser animation API](https://docs.phaser.io/api-documentation/class/animations-animationmanager), [Colyseus Room](https://docs.colyseus.io/room) and [StateView](https://docs.colyseus.io/state/view) docs and installed animation duration semantics.
- `pnpm check:quick tests/ly-mac-sau.test.ts tests/dungeons.test.ts tests/beach-dungeon.test.ts tests/desert-dungeon.test.ts`: 33 passed, including ten new deterministic encounter cases.
- Project and test/tool TypeScript checks passed during iteration.
- `python -X utf8 scripts/verify-ly-mac-sau.py`: PASS; all 400 reviewed hashes and 192 actor frames, plus all retained/new effect frames, are checked. Public raster/atlas copies match source bytes; server/client maps are identical.
- `LY_MAC_SAU_QA_PLAYERS=2 node tools/run-playwright.mjs test --config playwright.ly-mac-sau.config.ts tests/e2e/ly-mac-sau.spec.ts`: PASS, 51.6-second test. Two real clients loaded 192 actor cels via actual Phaser animation events, all six actions/VFX, shared movement, real attack damage, wall collision, foot depth, normal Space exit, private/shared isolation and effect cleanup. No browser errors. This reduced iteration profile does **not** claim boss-kill/loot or final six-player acceptance; see `docs/evidence/ly-mac-sau-runtime/2-players.json`.
- Balance probes use 192 fixed-seed scenarios: four schools, both basics, levels 1/6/15/30, one/six players, three seeds. Legal Default builds, no equipment, approach/hold bots and rotating QWER; no projectile-dodge tactics. Exact results are in `balance.json`; they are measurements, not final balance approval.
- Final command: `LY_MAC_SAU_QA_PLAYERS=6 pnpm check:final --config playwright.ly-mac-sau.config.ts`. **PASS in 234.78s**: 376 unit/integration tests across 33 files, 18 workflow checks, 14 asset validators, production build and 3 browser cases. The two existing dungeon cases passed; the six-client encounter passed in 80.6s (1.4m test). All 192 actor cels, six live actions, normal movement/collision/depth, actual boss kill, exactly one unique six-player roll, private/shared visibility and Space-exit cleanup passed; browser error list empty. See `6-players.json` and `assets/reviews/ly_mac_sau_v02/runtime_integration_2026_11_01.json`.

The browser fixture is confined to tests and owns ports 2709/5309. Frame pose arrangements and legal level-15 XP grants are declared test fixtures. Natural combat restores shipped boss tuning and drives actual movement/A input; no HP/damage override, invulnerability, production debug travel endpoint or recording is used. Dedicated final PNGs show normal camera zoom and actual combat. Failed iteration reports are retained separately from success acceptance.

## Remaining review

The tiled ground is more repetitive and the separable environment less richly detailed than the approved illustration. Source directional cast gestures sometimes turn toward the viewer; the retained drawings are unchanged. Runtime integration/automated correctness do not grant final visual approval. Boss numbers, loot trial identities/auto-roll presentation and human combat feel need director review; broader M4 inventory and other bosses remain outside this task.

Final PNGs were opened and visually inspected: `arena-design-scale.png` and `arena-natural-combat.png` at 1280×720. `reference-comparison.png` compares the approved overview, actual Phaser combat and placeholder anti-reference. Detail/pivots/purple bindings are retained; terrain repetition and dense melee name/effect overlap remain visible. Final balance rerun: 192 probes in 3.54s, 153 clears, one-item invariant true for every scenario. Per level, solo clears were 0/15/18/24 of 24 for levels 1/6/15/30; six-player clears 24/24 at each level. This is a trial profile, not final difficulty approval.
