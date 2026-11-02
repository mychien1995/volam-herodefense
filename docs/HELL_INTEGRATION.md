# Hell dungeon integration — 2026-11-01

**2026-11-02 follow-up:** the user explicitly requests integration into `milestone/m3d`. This supersedes the original no-merge restriction for that follow-up only. Current reconciliation, protocol18 and executed checks: `docs/HELL_M3D_INTEGRATION.md`. The worktree-only scope and original evidence below remain historical.

All task work is confined to **C:/Users/ADMIN/.codex/worktrees/hell/volam-hero-defense**, branch **wip/m3d/hell**, created clean from current `milestone/m3d` commit **0aeddd21c7532798100fbe3c092d7156739bb332**. No main-checkout edits, dirty-tree copies, branch switches in another checkout or merge-back are performed.

## Retained source audit

| Resource | Actual path | Status |
| --- | --- | --- |
| Visual benchmark | `assets/references/hell_dungeon_reference.png` | Direction only |
| Environment concept | `assets/concepts/dungeon-environments/hell/dungeon_overview.png` | Retained concept, never used as a background |
| Proposed map | `assets/concepts/dungeon-environments/hell/hell_layout.tmj` and `layout_notes.json` | Retained standalone authoring proposal |
| Terrain | `assets/tilesets/hell/{terrain.png,terrain.tsj,terrain_metadata.json,source_terrain.png}` | 272 retained 32px tiles; runtime approval pending |
| Props | `assets/sprites/environment/hell/{props_atlas.png,props_atlas.json,props_metadata.json}` and individual PNGs | 20 retained authored props; original sizes/feet anchors |
| Creep concepts | `assets/concepts/dungeon-creeps/hell/enemy_bestiary.png` and six `<id>_concept.png` boards | Retained automatic concept approval, not runtime approval |
| Actors | `assets/sprites/creeps/dungeons/hell/<id>/{spritesheet.png,atlas.json,manifest.json,frames/,source/}` | Six sets / 276 actual cels; retained PNG sources, no layered Aseprite source supplied |
| Effects | `assets/effects/dungeons/hell/{spritesheet.png,atlas.json,effects_metadata.json,frames/}` | 16 sequences / 64 actual cels; only supported melee contact cues bound |
| Provenance | `assets/concepts/dungeon-environments/hell/{hell_asset_manifest.json,generation_prompts.json,generation_jobs.json,verification.json}` | Original OpenAI built-in image_gen raster production; no imported commercial pack or exclusive copyright claim |
| Integration manifest | `assets/hell_dungeon.manifest.json` | Prototype; runtime director approval pending |

Canonical retained IDs/names: `hell_xich_quy` / Xích Quỷ; `hell_dia_nguc_khuyen` / Địa Ngục Khuyển; `hell_dung_nham_linh` / Dung Nham Linh; `hell_hac_viem_phap_su` / Hắc Viêm Pháp Sư; `hell_hac_dien_nguu_ma` / Hắc Diện Ngưu Ma; `hell_dung_nham_cu_nhan` / Dung Nham Cự Nhân. These authoritative appearance IDs match the delivered manifests. The colossus remains an ordinary creep.

No species-specific combat definitions were supplied. All six reuse unchanged generic M2A melee AI/stats/cadence/rewards and existing participant/wave scaling. No fireball, curse, poison, summoning, flight, lava damage or boss behavior is inferred from illustrations. Lava is a solid boundary. Retained caster `cast` and `projectile_release` tags are attack-cel subsets; they are available for visual review but do not introduce gameplay releases. Hurt/death each have one genuinely **shared** clip, not four independently authored facings. There are **92 authored tags** including those aliases; directional action playback falls back to the actual shared key when appropriate.

## Implementation and geometry

Existing registry/selector/MatchRoom now accept destination `hell` (localized **Địa Ngục**) under protocol14. Existing `hell_shared` / `hell_private_<session>` worlds retain authority for eligibility/capacity, movement/collision, targeting, combat, assists/rewards, wave progression, empty pause/resume and arena return. Forest/desert/Beach definitions are preserved.

`scripts/build-hell-map.py` adapts the retained 60×40 Tiled layout into `maps/creep_hell.tmj`: three connected main courts and a northern temple, twelve creep slots, six compatible entry seats from `(256,640)`, and physical exit `(1664,704)`. Conservative lava-edge solids align with visible transition tiles; smaller authored prop footprints are distinct from their full sprite canvases. Native perimeter rocks/walls/braziers/debris dress the courts without shrinking paths. The result contains 53 prop placements and 130 solid footprints. All gameplay markers, six entry seats and the bridge route are reachable. No concept is used as a giant background.

`scripts/prepare-hell-assets.mjs` uses the standard preparation helpers, checks every independently recorded inventory hash and copies actual source atlases plus the shared map. It generates a separate integration manifest and runtime pack under `apps/game-client/public/assets/hell`; original production manifests retain their historical asset-only approval/status fields. `hell-art.ts` loads/registers native dimensions, feet pivots, authored per-frame durations and nearest filtering. Existing atlas-map rendering uses the supplied eight-frame/140ms terrain animation metadata, feet depth and foreground hanging chains. Existing generic one-shot/effect cleanup remains in use.

Controls remain arrows/A/QWER, P for Võ Học and **Space near the physical exit**; living-arena-only build edits and modal input handling are retained. Full viewport, existing integer 2× desktop display scale and camera zoom1 remain; all HUD/menus are in-viewport overlays. No CSS or exterior panel is introduced.

## Checkout bytes and sources

The fresh worktree required exact-byte restoration for pre-existing independently hashed metadata. `.cache/hell-checkout-restoration.json` records 549 LF/CRLF restorations; two Hell source files (`generation_jobs.json`, `package_assets.py`) additionally required their original single mixed CR, found by matching the pre-existing SHA256 exactly. No source hash was recalculated, no guard weakened and no raster pixel changed. Hell-only `.gitattributes` rules preserve its recorded text bytes on later checkout; newline-only Git diffs are intentional. Unrelated metadata restorations have no normalized content diff and are excluded from the task commit.

Source PNG rasters are retained editable inputs; layered Aseprite documents were not supplied for this set. The task does not manufacture or claim such files. Partial-alpha shadows/glows are retained and checked against actual exports rather than thresholded into new artwork. No image generation, Aseprite export, video/GIF creation or recording/encoding command is used.

## Verification

- `pnpm install --frozen-lockfile --ignore-scripts --store-dir .cache/pnpm-store --cache-dir .cache/pnpm-cache`: PASS; locked dependencies, local caches.
- `pnpm install:browsers`: PASS; Chromium installed in worktree cache; no recording enabled.
- `python -X utf8 scripts/build-hell-map.py` and `pnpm assets:prepare`: PASS after exact-byte restoration. Initial preparation stopped at the independently hashed mixed-newline source files; no provenance exception was used.
- `python -X utf8 scripts/verify-hell.py`: PASS, actual PNG bounds/alpha/nonempty cels, per-frame equality/timing, pivots, source raster existence, all exact inventory hashes and runtime/map parity. An initial assertion assumed binary alpha; it was corrected to validate and preserve the supplied partial-alpha artwork.
- `pnpm check:quick tests/hell-dungeon.test.ts tests/beach-dungeon.test.ts tests/desert-dungeon.test.ts tests/dungeons.test.ts tests/dungeon-room.test.ts`: PASS, **33 tests across five files**.
- `pnpm check:quick tests/hell-dungeon.test.ts`: PASS, **4 tests**, after perimeter dressing and authoritative footprints.
- `pnpm exec tsc -b` and `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS during focused iteration, after runtime preparation. The initial compile before successful preparation could not find the generated map; it is resolved.
- `node tools/run-playwright.mjs test --config playwright.hell.config.ts tests/e2e/hell.spec.ts --grep "two clients"`: PASS, **55.0s test / 1.0m invocation**, two browser contexts observed all 92 tags, every authored cel, native feet/scale, all four supported facings, one-shot completions and eight actual lava phases. Shared hurt/death clips are explicitly reused across directions. This uses server pose arrangements and is **not** natural-combat evidence.

Final pipeline/combat/PNG results are appended after execution. Isolated QA services own ports **2700/5300**, with worktree-local Vite/Playwright caches and outputs. Pose/encounter arrangements exist only in the reused test service, not production routes. Six-player verification means **two actual browsers plus four actual SDK clients**, never six browser clients. Video and trace screenshot streams are disabled.

### Final pipeline and focused recovery

`pnpm check:final --config playwright.hell.config.ts` was run **once** after the final runtime implementation change. Preparation, project/test/tool typechecks, **18 workflow checks**, **370 unit/integration tests across 33 files**, production build and **all 14 asset validators passed**. The existing large-bundle warning remains. Three browser cases passed in that invocation: both existing forest shared/private cases, and the Hell two-browser frame case (45.4s on the dressed map). The original overall **FAIL** and all measured stage timings are preserved in `docs/evidence/hell-integration-2026-11-01/final-pipeline-timings.json`; no uninterrupted green full-pipeline run is claimed.

Two QA defects were exposed. The reused combat arrangement placed its first two creeps on Hell's solid lava-transition cells; those two correctly remained unharmed, while the other four died. The Hell encounter now starts in the open central court at x960 and asserts its creep positions against authoritative geometry. The private-return helper attempted a straight walk at y640 along a solid transition edge. Creeps killed the stalled hero, and the helper continued walking in the arena. A temporary increase in the loop bound did not resolve that; diagnostics identified the actual route error. The corrected helper walks through the real bridge centre at y720, keeps the original bounded loop and fails immediately on unexpected death/zone change. No map, collision, combat, balance, network or production runtime code was changed for these fixes.

`pnpm exec tsc -p tsconfig.tools.json --noEmit` passed after those QA corrections. `node tools/run-playwright.mjs test --config playwright.hell.config.ts tests/e2e/hell.spec.ts --grep "six clients|Hell private instances"` passed the corrected **six-player case (56.7s)**; its private case still exposed the incorrect straight-line route before the final waypoint fix. `pnpm exec vitest run tests/hell-dungeon.test.ts` subsequently passed all **4 tests**, including explicit solid-edge/open-bridge assertions. Only the remaining private case is retried after that test-only correction; successful production stages and six-player combat are retained.

An additional deterministic input probe confirmed the geometry diagnosis: walking straight along y640 stopped at x629.33 on the solid transition, while actual movement via y720 reached x1664 with the zone configured at width1920 and physical-range return succeeded. No teleport or collision bypass was used.

Final `node tools/run-playwright.mjs test --config playwright.hell.config.ts tests/e2e/hell.spec.ts --grep "Hell private instances"`: **PASS, 1.0m test / 1.2m invocation**. Both browsers entered isolated private Hell worlds; physical keyboard return, empty pause/resume, re-entry, desert and Beach selection/return all passed with no browser errors. Across the original final run and focused recovery, **all five distinct selected browser cases passed**. `checkout-validation.json` additionally records a fresh Git index checkout matching all **24 independently hashed retained Hell text files**. No further runtime/art changes followed these checks.

### Observed motion and real combat

`frames.json` records two browser clients, **92 observed tag keys / 276 unique actual cels**, four supported cardinal idle/walk/attack facings, shared hurt/death completion, caster phase aliases, exact feet origins/native scale, sampled frame timing and all eight actual lava tile phases. The gallery arranges server poses, so it does not prove natural combat by itself.

The independent successful `combat.json` records **six clients (2 browser + 4 SDK)**, real normal-attack inputs and unchanged server stats. Six deaths grant **360 total XP**, both browsers agree, the wave advances, supported contact effects play, arrows cannot cross lava, Space at the physical door returns to the configured arena marker, zone change removes Hell actors/scenery/effects, and disconnect removes the peer on both browsers. The fixture only arranges the initial encounter; it does not replace damage, rewards or AI. All browser error lists in successful reports are empty.

### Actual PNG comparison

Opened and inspected `hell-six-player-1920.png` (1920×1080) and `hell-combat-1280.png` (1280×720) from the successful combat retry, and `hell-frames-1280.png` from final frame verification. Camera zoom is1 with the existing integer2× display scale. World fills every viewport edge and all HUD remains inside it. The screenshots show the retained dark stone/obsidian palette, animated lava channels, braziers, cliff pieces and court dressing at native scale. The supplied reference has much richer layered fortress depth and less repetitive material patterns. At1280, large Ngưu Ma/Cự Nhân bodies overlap smaller creeps and nearby players; sprite placement follows feet depth rather than artificial always-visible layering. Tile repetition, angular lava edges, source-motion continuity and dense-combat readability remain explicit director-review limitations. Screenshots establish appearance only; frame observations and server outcomes are separate above.

## Changed files

- Authority/data: `packages/game-data/src/{hell.ts,creep-hell-map.json,dungeon-registry.ts,index.ts}`, `packages/game-protocol/src/index.ts`, `apps/game-server/src/rooms/MatchRoom.ts`, `maps/creep_hell.tmj`. No game-core mechanics change.
- Presentation: `apps/game-client/src/{hell-art.ts,art.ts,arena-scene.ts,arena-creep-effects.ts,dungeon-presentation.ts,main.ts,menus.ts,ui.ts}`. Shared-clip fallback changes animation selection only.
- Pipeline: `scripts/{build-hell-map.py,prepare-hell-assets.mjs,verify-hell.py,prepare-assets.mjs}`, `package.json`, `assets/hell_dungeon.manifest.json` and generated runtime copies inside this worktree.
- Exact-byte source preservation: `.gitattributes` and retained Hell `.json/.tmj/.tsj/.py` files whose original independently hashed line endings differ from the normalized Git baseline. `git diff --ignore-space-at-eol` confirms no source text changes in these files. Raster artwork is untouched.
- QA: `tests/hell-dungeon.test.ts`, `tests/desert-dungeon.test.ts`, `tests/e2e/{hell.spec.ts,hell-setup.ts,desert-setup.ts,arena-visual-v2.spec.ts}`, `playwright.hell.config.ts`. Reuses the existing isolated dungeon authority service and normal input/combat path.
- Documentation/evidence: `DECISIONS.md`, `TECHNICAL_ARCHITECTURE.md`, `ROADMAP.md`, `ACCEPTANCE_TESTS.md`, this report and `docs/evidence/hell-integration-2026-11-01/`.

## Reference review and approval

Read required design/content/combat/balance/item, art direction/production/asset, architecture/roadmap/acceptance/open-question/start and development/art-iteration workflows plus UI_UX_SPEC. Inspected the actual Hell benchmark, environment overview, bestiary, mandatory placeholder anti-reference, available Võ Đang character sheet and the required reference/concept contact sheet (`docs/evidence/hell-integration-2026-11-01/references.png`). The old Võ Đang art-direction alias is absent; the existing character reference is used. The file named dashboard anti-reference actually contains a Võ Đang sheet; its documented layout ban remains binding.

Retained art is integrated as a prototype for director review. The live frame PNG shows clear warm lava/dark stone contrast and intentionally varied body heights (36–100px against ~44px heroes). Visible lava pattern repetition, angular tile boundaries, source-frame continuity and large-creep crowd readability require review against the richer reference. No ART-01 or final director approval is granted. PNGs are visual evidence only; motion and server correctness are reported separately.
