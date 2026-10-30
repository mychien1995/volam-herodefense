# Arena and dungeon-selector visual implementation — 2026-10-30

**Current correction (2026-10-30):** The user subsequently removed Dẫn Lộ. The sprite/label/NPC marker are gone and live arena players can enter Rừng Trúc directly from the Phó Bản menu anywhere in the arena. Updated `arena-944.png`/`arena-1920.png` and selector captures reflect the NPC removal. Physical exits and instance rules remain. Near-Guide references/captures below are historical.

Status: produced, integrated and runtime verified. **Director visual approval remains pending.** This is a visual update within M2A; M2B and new dungeon gameplay have not started.

## References and preparation

Inspected both supplied approved concepts and both supplied current screenshots before editing. Directional copies are retained as `assets/concept/arena-v2-approved.png` and `dungeon-selector-approved.png`; neither is used as a runtime background or interface. The required art/UI references, rejected placeholder screenshot and reference contact sheet were also inspected. The known missing `vo_dang_art_direction_reference.png` alias resolves to the existing Võ Đang character reference; the filename/content discrepancies remain documented in `assets/references/README.md`.

The supplied selector screenshot shows the older disabled M1 preview. The current audited repository already implements M2A Rừng Trúc entry near the Guide; this update preserves that supported behavior. Supplied before images are archived as `assets/concept/arena-v2-before.png` and `dungeon-selector-before.png` for comparison.

Followed AGENTS, the design handoff, UI_UX_SPEC, ART_DIRECTION_REFERENCE, ART_ASSET_GUIDE and ART_PRODUCTION_STANDARD. Used pixel-art-pipeline, game-playtest and imagegen workflows. Installed Phaser 4.2.1, Colyseus SDK 0.18.8/core 0.18.23/schema 5.0.42 retained. Consulted official [Phaser Text](https://docs.phaser.io/phaser/concepts/gameobjects/text), [Tweens](https://docs.phaser.io/phaser/concepts/tweens) and [Aseprite CLI](https://www.aseprite.org/docs/cli/) documentation before using the relevant APIs. Networking APIs and authority were not changed.

## Integrated result

The approximately 440px courtyard becomes a 600×540px paved court centered at (800,616), about 36% wider, with 160px approaches, 60% wider than the previous 100px. The statue/pedestal remains at its authoritative (800,576) marker, giving more clear floor to its south. Camera zoom, display scaling, character dimensions and compact HUD placement remain unchanged. The world still fills the viewport.

Removed `tree_west` at (680,650) and its authoritative `trunk_west` collider, including its separate base/canopy presentation. Moved `tree_north` to (480,330) and `tree_east` to (1220,870), updating their trunk rectangles to the same feet. Tree appearance is keyed by stable name so removal does not accidentally turn the flowering tree green. Repositioned water, bridges, flowers, bamboo, banners and perimeter lanterns outside the expanded court; removed the two lanterns south of the statue. The existing north boundary wall remains. West/east invasion markers at (64,672)/(1536,672), hero/creep spawns, Guide and statue positions remain unchanged. Their horizontal route remains clear in authoritative collision data. Invasions/statue interaction are still future gameplay systems; this task does not invent them.

The Tiled ground layer now records the expanded ellipse/cross and references four real 32px paving variants. The layered ground PNG combines newly generated detailed masonry/grass with those authored slab samples. The new ground component was prepared to world dimensions; the existing arena texture, actors and camera are not stretched. Curved paving, road slabs and meadow remain separate editable layers. Existing props, decorative water/glow animations and their depth behavior are reused.

Damage uses the server event's target ID, world contact coordinates, amount and critical flag. `FloatingDamage` places compact outlined ivory digits or slightly larger gold `✦` digits above the target HP bar, offsets rapid hits and nearby targets, moves them upward and fades after a brief readable hold. Text scrolls through the world camera and does not depend on the target remaining alive/rendered. Zone transitions clear transient effects. The fixed damage `ui.notify` call was removed; other functional feedback remains. Combat timing, damage, RNG and targeting are unchanged.

The existing dungeon overlay now has a dark jade/charcoal panel, gold framing, live Vietnamese titles/descriptions, four separate illustrations, selected/hover/focus/unavailable states, working Riêng/Chung controls, close controls and Escape. Only Rừng Trúc creep entry is supported, as before; it is enabled near the Guide and revalidated by the unchanged server. Other destinations and Boss remain unavailable with player-facing messages. The art-study preview moved to explicitly enabled debug settings (`?debug=1`). Technical milestone/backend notices were removed from the selector. Closing releases modal state and restores canvas focus; menu clicks do not become attacks/movement.

## Assets and provenance

Built-in image_gen produced four separate original illustrations and ground/masonry components. It did not produce a flattened replacement menu. Full prompts and generation context are in `assets/source/arena_v2/GENERATION.json`. Source PNGs are committed under `assets/source/dungeon_cards/` and `assets/source/arena_v2/`.

**Aseprite was actually run**, using `C:/Program Files/Aseprite/Aseprite.exe`, version 1.3.18.6-x64. Verified its CLI help/version, then ran `node scripts/export-arena-v2.mjs --prepare`. Six editable sources were prepared and exported:

| Asset ID | Editable source | Runtime export and metadata |
|---|---|---|
| `arena_ground_v2` | `assets/source/arena_v2/ground.aseprite` | `assets/exports/arena_v2/ground.png`, 1600×1152 |
| `arena_paving_v2` | `assets/source/arena_v2/paving.aseprite` | `paving.png/json`, four 32×32 static variations |
| `dungeon_card_forest` | `assets/source/dungeon_cards/forest.aseprite` | `forest.png`, `forest_atlas.png`, `forest.json` |
| `dungeon_card_desert` | `assets/source/dungeon_cards/desert.aseprite` | `desert.png`, `desert_atlas.png`, `desert.json` |
| `dungeon_card_sea` | `assets/source/dungeon_cards/sea.aseprite` | `sea.png`, `sea_atlas.png`, `sea.json` |
| `dungeon_card_hell` | `assets/source/dungeon_cards/hell.aseprite` | `hell.png`, `hell_atlas.png`, `hell.json` |

Cards share 512×768 opaque full-bleed canvases and consistent pixel density. Aseprite sources separate explicitly reconstructed distant/middle/foreground editing regions; these are not recovered original layers or parallax animations. Titles, frames, controls and selection checks are live DOM UI. Card images use responsive art-directed cropping on short desktop screens. Individual PNGs are loaded by the actual UI; their static atlas/frame metadata is separately validated. No new animation was claimed or authored.

`assets/arena_v2.manifest.json` records actual paths, hashes, dimensions, layers, pivots, collision requirements, provenance and production/integration/runtime/approval states. No proprietary game artwork was imported. Approved Cái Bang source/export hashes remain unchanged. Existing ART-01 props retain their earlier provenance and approval status.

Re-export artist-edited sources with `pnpm assets:export:visual`. The optional `--prepare` rebuilds their initial reconstructed layers from source PNGs and should be used deliberately. Normal builds copy committed PNG/JSON exports and do not require Aseprite. Validate with `pnpm verify:assets`.

## Commands actually run and results

Changed implementation files:

- Rendering/loading: `apps/game-client/src/arena-art01.ts`, `art.ts`, `arena-scene.ts`, `floating-damage.ts`, `main.ts`.
- Selector/lifecycle: `apps/game-client/src/menus.ts`, `ui.ts`, `dungeon-selector.css`.
- Shared map: `maps/arena.tmj`; no combat/network implementation change.
- Production: `scripts/prepare-arena-v2.lua`, `export-arena-v2.lua`, `export-arena-v2.mjs`, `verify-arena-v2.py`, `write-arena-v2-manifest.py`; export/validation commands in `package.json`.
- Tests: `tests/arena-layout.test.ts`, `tests/e2e/arena-visual-v2.spec.ts`; existing dungeon/UI/gameplay browser tests updated for the real selector controls, debug study location and relocated tree.
- Assets and documentation: the two new source/export directories, approved/before reference copies, `assets/arena_v2.manifest.json`, this report, and the focused DECISIONS/architecture/art-guide/acceptance/roadmap entries.

| Command | Result |
|---|---|
| Aseprite `--version`, `--help` | PASS; batch/Lua/export capabilities confirmed |
| `node scripts/export-arena-v2.mjs --prepare` | PASS; six editable sources and runtime exports produced |
| `pnpm typecheck` | PASS, including tests/tools |
| `pnpm test` | PASS — 83 tests in 9 files, including removed-collider/moved-trunk and expanded-paving contracts |
| `pnpm build` | PASS; existing large-bundle warning (>500 kB) remains |
| `pnpm verify:assets` | PASS; previous PNG/frame/alpha checks, all protected character hashes, six new Aseprite sources, opaque ground, four separate cards/atlases, padding and 32px paving verified |
| `node tools/run-playwright.mjs test tests/e2e/arena-visual-v2.spec.ts tests/e2e/dungeons.spec.ts tests/e2e/ui.spec.ts tests/e2e/gameplay.spec.ts` | PASS — 14 tests, 4.9 minutes |
| `node tools/run-playwright.mjs test tests/e2e/arena-visual-v2.spec.ts` after final perimeter placement | PASS — 3 tests, 1.1 minutes |
| Scoped Prettier and `git diff --check` | PASS on implementation/test files |

Browser tests use real keyboard/mouse actions and a read-only evidence bridge. They verify actual movement through the removed collider, the unchanged camera/HUD, four loaded images and their native bounds, party selection, disabled/unavailable actions, close/Escape/focus recovery, real server-owned normal/critical hit identity/amount/coordinates, simultaneous hits on multiple targets, and no fixed damage notification. Existing two-context shared/private dungeon transitions, combat/rewards, pause/resume, manual cadence, projectile trajectory, actor animation registry and modal input checks pass. Menus/HUD fit at 944×466, 900×640, 1280×720 and 1920×1080 across the suites. No application console/page/failed-HTTP errors were recorded in the new visual tests. Existing local development services were used for browser checks; their external terminal stdout was not captured. Server integration tests ran separately without new failures.

Initial test failures were automation selector assumptions: an unavailable card cannot be mouse-activated through Playwright's enabled-element check, and broad `[data-menu]` selectors also matched a retained modal attribute. Corrected the tests to exercise unavailable focus/keyboard behavior, and separated/cleared modal state attributes. Screenshot review also led to readable hold/fade timing, more spaced damage stacks and the final lower-perimeter placement. No combat-rule changes were used to make the tests pass.

## Actual runtime evidence

These are screenshots of the integrated running game, **not generated concepts**:

- `docs/evidence/arena-v2/arena-944.png`, `arena-1920.png` — final expanded court and perimeter at normal gameplay zoom.
- `damage-normal.png`, `damage-critical.png` — actual authoritative damage above targets; amounts/critical flags come from genuine combat, not injected events.
- `damage-events.json` — observed target IDs/anchors/amounts/flags and simultaneous-target verification.
- `selector-944.png`, `selector-1920.png` — final four-image responsive selector.
- `selector-ready-1280.png` — working near-Guide selection with entry available, captured during the two-client regression run before the final decorative-only perimeter adjustment.

Inspected the final arena, selector and damage captures. The expanded floor and approach width are visibly clear; statue/hero scale and HUD position match the previous runtime. More of the world lies outside the small viewport as a natural consequence of the larger court and unchanged camera. The selector follows the approved card/jade/gold composition while showing actual M2A availability rather than illustrative concept functionality.

## Remaining limitations and approval

- `creep_outlaw`, fire/arc effects, reused Guide frame and the M2A dungeon environment remain existing placeholders/prototypes. This is not a claim that the whole game is polished.
- No new Sa Mạc/Biển/Địa Ngục gameplay, Boss entry, invasion system, statue repair/interaction mechanics, abilities, progression, crafting or school art was implemented.
- Numeric tuning, reconnection/persistence limits and other M2A limitations remain as documented in `M2A_IMPLEMENTATION.md`.
- Produced assets and integrated runtime are verified; **director approval is pending at normal gameplay zoom**. Stop here before expanding environments or character art.
