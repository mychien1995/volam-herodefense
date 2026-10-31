# Beach dungeon integration — 2026-11-01

All task edits, dependency installation, generated runtime assets, builds, tests and evidence are confined to **C:/Users/ADMIN/.codex/worktrees/beach-dungeon/volam-hero-defense**, branch **wip/m3d/beach-dungeon**. The worktree was created from `milestone/m3d` commit `de1b3282906cd4c3952c4c821354b86ccf052a77` and was clean before task edits. No main-checkout edits, branch switch, wholesale dirty-tree copy or merge-back is performed.

## Scope and source audit

The retained forest/desert architecture is available in this baseline. Beach uses the existing menu card/localization **Biển** and authoritative destination **sea**, with separate `sea_shared` and `sea_private_<session>` worlds. Shared `DungeonMatch` owns movement, collision, membership, waves, damage, assists/rewards and RNG. This task introduces no new combat abilities, enemy stats, loot, swimming or other dungeon.

| Resource | Actual path | Status |
| --- | --- | --- |
| Main benchmark | `assets/references/sea_dungeon_reference.png` | Direction, not runtime art |
| Composition / layout | `assets/concepts/dungeon-environments/beach/{environment_concept_v01.png,layout_concept_v01.png}` | Retained concepts, never used as a giant map background |
| Creep direction | `assets/concepts/dungeon-creeps/beach/bestiary_concept_v01.png` and six `<id>_concept_v01.png` files | Retained concepts; source manifest records automatic concept approval, not final runtime director approval |
| Tile source/export | `assets/tilesets/beach/{terrain.png,terrain.json,terrain.tsj,source/terrain_v01.aseprite}` | 512 retained 32px tiles, runtime review pending |
| Prop atlas | `assets/sprites/environment/beach/{scenery.png,atlas.json,manifest.json}` | 25 retained authored props, pending runtime review |
| Creep source/export | `assets/sprites/creeps/dungeons/beach/<id>/{spritesheet.png,atlas.json,manifest.json,frames/,source/}` | Six retained sets, pending runtime approval |
| Effects | `assets/effects/dungeons/beach/{spritesheet.png,atlas.json,manifest.json}` | 16 sequences / 64 cels; only supported contact cues bound to gameplay |
| Original provenance | `assets/sprites/creeps/dungeons/beach/beach_manifest_v01.json` and `source/generation_prompts_v01.json` | Original built-in image_gen raster production; no third-party pack or exclusive copyright claim |
| Runtime integration manifest | `assets/beach_dungeon.manifest.json` | Prototype; director runtime approval pending |
| Shared map | `maps/creep_beach.tmj` → game-data/client runtime copies | Original orthogonal layout made from retained tiles and props |

Canonical roster: `cua_khong_lo` / Cua Khổng Lồ; `hai_xa` / Hải Xà; `hai_tac` / Hải Tặc; `hai_tac_hoa_phao` / Hải Tặc Hỏa Pháo; `thuy_quy` / Thủy Quỷ; `hai_vu` / Hải Vu.

No species-specific gameplay profiles were supplied. The six appearances reuse unchanged M2A generic melee stats, AI, cadence, rewards and scaling. The gunner does not fire cannonballs and the shaman does not gain water spells simply because those images exist. Aim/fire/cast/water_attack tags are retained visual phases, not independently invented attacks. Special ranged/poison/artillery/summon behavior remains pending authored definitions. Actor animations never determine damage.

## Narrow artwork correction

The handoff documents one empty `thuy_quy/death_down_2.png`. Its connected-component assignment selected a narrow fragment that vanished under nearest-neighbor reduction. `scripts/fix-beach-water-ghost.py` re-extracts the independently inspected visible dissolve pose from the **same retained original raster**, using its unchanged down-facing scale and feet pivot. It updates that individual frame, its rectangle in the actor sheet, the one actor's editable Aseprite source through the supplied Lua assembly recipe, and corresponding provenance hashes. It creates no new AI drawing and changes no other original actor/prop/terrain pixels. The old asset-only verification report remains historical; correction provenance is explicit in the actor/master manifests.

All 384 frame PNGs are now nonempty. Tags total 136: 120 base four-facing idle/walk/basic_attack/hurt/death tags plus 16 two-cel gunner/shaman phase aliases. Those aliases reuse actual authored attack cels; they are not additional drawings. Atlas rectangles, explicit durations, 144×128 canvases and feet `(72,106)` remain intact.

## Implementation

- `scripts/build-beach-map.py` composes a 1536×1152 orthogonal island with central sand clearing, southwest entry, northwest ruin exit, pirate camp, shipwreck and east dock. Ground/shoreline use retained material/corner-mask phases. Water/shore boundaries and solid prop footprints are authoritative object geometry; the channel bridge and dock are traversable exceptions. Twelve creep slots and six entry seats are validated and reachable.
- `scripts/prepare-beach-assets.mjs` consumes retained PNG/atlas bytes, validates the existing independent provenance hashes, generates the runtime manifest/pack and copies the same map to client and game-data. Normal asset preparation does not run Aseprite or regenerate art.
- `dungeon-registry.ts` maps existing forest/desert and new sea zone IDs to their definitions. Unknown zones/destinations fail explicitly. Protocol 13 validates the optional forest/desert/sea selector; omission preserves forest. The existing server-selected creep archetype field drives texture choice.
- `beach-art.ts` registers actual frames/timings and supported generic-melee contact effects. Unimplemented projectile releases and spells are not emitted. Existing effect ownership, zone filtering and cleanup remain in use.
- Shared atlas dungeon rendering retains native scale and original atlas feet pivots. Ground decals sit below actors, tall palms/masts sort against character feet, and authored water phase samples animate using their supplied metadata. These are phase-shifted authored samples, not newly drawn water cels.
- Menu/HUD stay within the full viewport. The baseline's newer **Space near the physical door** rule is preserved, along with arrows/A/QWER, modal focus and living-arena-only build edits. No exterior panels or map shrinkage are introduced.

## Worktree setup details

Locked dependencies and the required Chromium binary were installed into this worktree's `.cache`/`node_modules`. The offline attempt lacked metadata; the subsequent frozen-lockfile installation succeeded without dependency/version changes. Browser services use dedicated ports **2698/5298**, worktree-local Vite cache and `test-results/beach-dungeon`; they do not borrow or terminate another chat's services.

Some tracked JSON/Lua metadata is checked out with LF while independent approval/provenance records require the original CRLF bytes. Only files whose LF/CRLF candidate **exactly matches an already recorded SHA256** were restored. No approval hash was weakened or recalculated for those pre-existing assets. The task's `.cache/beach-checkout-byte-restoration.json` records that operational restoration; Git's content diff excludes those newline-only changes. Source rules and raster bytes stay protected. The existing generated arena presentation manifest may refresh its runtime metadata hashes through the standard preparer.

## Validation and evidence

- `pnpm check:quick tests/beach-dungeon.test.ts tests/desert-dungeon.test.ts tests/dungeons.test.ts`: PASS, 19 tests across three files.
- `python -X utf8 scripts/verify-beach.py`: PASS, 384 nonempty cels / 136 tags, editable-source headers, 512 tiles, 25 props, 64 VFX cels, retained hashes and source/runtime map parity.
- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS after a test-only Point assertion correction.
- The first staged browser attempt could not launch because this fresh worktree lacked Chromium. `pnpm install:browsers` completed into the isolated cache. Browser capture configuration keeps video and trace recording off.
- That initial command was `pnpm check:browser --config playwright.beach.config.ts tests/e2e/beach.spec.ts --grep "two clients"`; subsequent browser-only retries use the exact direct-runner commands recorded below.
- Two-client frame iteration and final six-player/browser results are recorded below after execution. The six-player pattern uses **two actual browser contexts plus four actual SDK clients**; Phaser renders the complete party, while natural combat uses unchanged server stats/rewards and normal input messages.

### Final pipeline and focused recovery

`pnpm check:final --config playwright.beach.config.ts` was run once after the last runtime implementation change. Asset preparation, both TypeScript stages, **18 workflow checks**, **357 unit/integration tests across 31 files**, production build and **all 13 asset validators passed**. The build retains the existing large-chunk warning. The original stage timings and failed overall status are preserved in `docs/evidence/beach-integration-2026-11-01/final-pipeline-timings.json`.

Four of five browser cases passed in that invocation: six-player natural Beach combat/readability, Beach private isolation/pause/resume and desert entry/return, and both existing forest shared/private cases. The frame case lost its lobby WebSocket (1006) before Beach entry; the PNG captures the disconnection notice. Its initial failure-capture helper then attempted to inspect a still-blank second page and masked the original assertion. The helper now captures unavailable debug state safely. No production networking rules were altered. The affected frame case subsequently passed with `node tools/run-playwright.mjs test --config playwright.beach.config.ts tests/e2e/beach.spec.ts --grep "two clients"` (one test, 1.1 minutes).

Final QA-only refinements position the Beach pose gallery entirely inside both cameras at the existing integer 2× display scale, assert complete 144×128 canvas visibility, and verify both browser clients remove a disconnected SDK peer. These leave runtime assets, client/server behavior and production test inputs unchanged. Their affected two cases are rerun together rather than repeating already successful full pipeline stages.

`node tools/run-playwright.mjs test --config playwright.beach.config.ts tests/e2e/beach.spec.ts --grep "two clients|six clients"`: the six-player case **passed (57.6s)**, including the new disconnect assertions. The frame case reached `death:right` but its test-owned pose HTTP request failed with `ECONNRESET`. The idempotent replacement-arrangement request now uses Playwright's bounded two-retry option for **ECONNRESET only**, not HTTP failures or gameplay input. Final `pnpm exec tsc -p tsconfig.tools.json --noEmit` passed, followed by `node tools/run-playwright.mjs test --config playwright.beach.config.ts tests/e2e/beach.spec.ts --grep "two clients"`: **passed (1.3 minutes total)**, with explicit full-canvas visibility bounds on both clients. Across retained final stages and focused recovery, all five distinct selected browser cases passed. The initial full pipeline itself remains recorded as failed; no single uninterrupted green pipeline run is claimed.

Expanded `python -X utf8 scripts/verify-beach.py` assertions also passed for terrain/prop/effect runtime byte parity, binary alpha (including intentionally transparent foam tiles), every atlas rectangle/nonempty cel, prop pivots and authored effect timings. `git -c core.safecrlf=false diff --check` passed. Local test transport intermittency was observed; its root cause is not established, and no production connection fix is claimed.

Actual supporting commands included `pnpm install --offline --frozen-lockfile --ignore-scripts` (failed: offline metadata missing), `pnpm install --frozen-lockfile --ignore-scripts` (passed), `pnpm install:browsers` (passed), the focused/typecheck/validator commands above, `python scripts/build-beach-map.py`, `python scripts/fix-beach-water-ghost.py`, and `node scripts/prepare-assets.mjs`. The installed Git does not support `git switch`/`git branch --show-current`; compatible `git checkout -b wip/m3d/beach-dungeon` and `git rev-parse --abbrev-ref HEAD` were used. All commands ran with this worktree as working directory. No video/encoding or trace-playback command was run.

### Observed motion and authority

The live two-browser frame report (`frames.json`) records **136 animation tags, 416 frame references and 384 unique authored cels**, all four directions, exact feet origins/native sprite scale, idle/walk repeats, attack/hurt/death and phase-alias terminal completion, and sampled frame intervals. Water tiles cycle through actual IDs 13–16. The gallery explicitly arranges server poses; it is not natural-combat proof.

The independent six-player encounter (`combat.json`) uses normal basic-attack inputs, unchanged HP/damage/rewards, and only an initial test-owned encounter arrangement. Six deaths grant **360 total XP**, both browsers agree, the dungeon advances to wave 2, supported contact effects play, arrows cannot walk into the channel water, and **Space at the northwest door** returns to the configured arena position. Zone change removes Beach actors, scenery and contact effects. Private worlds remain independently filtered; empty clocks pause and resume on re-entry. Forest and desert acceptance cases also pass. Artwork does not drive any server damage.

### PNG comparison

- `beach-six-player-1920.png`: 1920×1080, normal camera zoom 1 with the established 2× integer display scale; six party members and the full authored roster are rendered. World reaches every viewport edge; all HUD remains inside it.
- `beach-combat-1280.png`: 1280×720 at the same gameplay scale; live damage/contact cues, shoreline/channel and bridge are visible.
- `beach-frames-1280.png`: additional lightweight final visibility diagnostic for the complete retained roster.

The 1920 and 1280 PNGs were opened and compared directly with `assets/references/sea_dungeon_reference.png`. They share the elevated orthographic coastal perspective, warm sand, palms, wooden structures and cyan surf; feet depth and foreground palm overlap are visible. The delivered retained set has much stronger repeating sand/decoration patterns and angular tile-edge shores than the richer reference composition. Dense combat at 1280 overlaps some actors/names/damage values, and the foreground palm partially occludes one party member. Those are explicit director-review limitations. These screenshots do not establish motion; the separate frame/event observations above do.

### Changed files

- Authority/data: `packages/game-data/src/{beach.ts,creep-beach-map.json,dungeon-registry.ts,index.ts,desert.ts}`, `packages/game-protocol/src/index.ts`, `apps/game-server/src/rooms/MatchRoom.ts`, `maps/creep_beach.tmj`.
- Client: `apps/game-client/src/{beach-art.ts,art.ts,dungeon-presentation.ts,arena-scene.ts,arena-creep-effects.ts,main.ts,menus.ts,ui.ts}`.
- Asset tooling: `scripts/{build-beach-map.py,fix-beach-water-ghost.py,prepare-beach-assets.mjs,verify-beach.py,prepare-assets.mjs}`, `package.json`, `assets/beach_dungeon.manifest.json`.
- Corrected retained source: Beach master manifest and `thuy_quy/{manifest.json,frames/death_down_2.png,spritesheet.png,source/thuy_quy_v01.aseprite}`. Standard validators/preparation also refresh generated `assets/arena_creeps.manifest.json` metadata hashes and `assets/exports/skills/thieu-lam/validation_v01.json` verified-file count; no unrelated artwork changes.
- Checks: `tests/beach-dungeon.test.ts`, `tests/desert-dungeon.test.ts`, `tests/e2e/{beach.spec.ts,beach-setup.ts,desert-setup.ts,desert.spec.ts,arena-visual-v2.spec.ts}`, `playwright.beach.config.ts`.
- Documentation: `ACCEPTANCE_TESTS.md`, `BEACH_ASSET_NOTES.md`, `DECISIONS.md`, `ROADMAP.md`, `TECHNICAL_ARCHITECTURE.md`, this report and its PNG/JSON evidence directory. Generated runtime copies/build/cache remain inside the worktree.

The existing dungeon test service is parameterized for Beach rather than replaced with a second independent authority implementation. Pose/encounter arrangements exist only in that isolated test service, never in the shipped client/server protocol. Frame-only checks are explicitly separated from natural combat/reward acceptance. Successful iteration captures only compact JSON; final screenshots and failure diagnostics are PNG only.

## Reference inspection and remaining art approval

Read AGENTS, confirmed design/content/combat/balance/item documents, art direction/production/asset standards, UI_UX_SPEC, architecture, roadmap, acceptance/open questions and development/art iteration workflows. Inspected the Beach reference/concepts, current placeholder-quality anti-reference, available Võ Đang character sheet and the required world/menu/character reference contact sheet. The old Võ Đang art-direction alias is absent; the documented `vo_dang_character_reference.png` replacement is used. The file named `current_codex_dashboard_anti_reference.png` actually contains a Võ Đang sheet, as documented by the repository; the written ban on exterior dashboard layout remains binding.

Retained art is integrated for runtime review; no ART-01 or final director approval is granted. Static entrance/exit artwork stays static. Final screenshots must be judged at normal gameplay zoom against the coastal reference, including foreground depth, shoreline clarity, actor scale, repetition and six-player readability.

Manual review: run `pnpm dev` from this worktree, start/confirm a match, choose **Phó Bản → Biển → Riêng/Chung**. Walk around the coastline and over the marked bridge/dock. Approach the northwest cyan exit and press **Space** to return. The server continues while menus are open.
