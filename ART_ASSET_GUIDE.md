## Lý Mạc Sầu retained runtime integration — 2026-11-01

The approved v02 preview PNGs/atlases are reused without regeneration for Cổ Mộ. `scripts/prepare-ly-mac-sau.mjs` checks 400 approval hashes and copies boss/summon/FX/purple/environment exports; `scripts/verify-ly-mac-sau.py` checks originals, public copies and shared orthogonal Tiled markers. The flattened arena illustration remains a reference, not the runtime map. Authored actor cels, feet pivots and nearest sampling are retained. Runtime director approval remains pending. See `docs/LY_MAC_SAU_INTEGRATION.md`.

# Pixel Art and Animation Pipeline — v1.3

## Bamboo Forest creep artwork approval — 2026-10-31

Runtime update 2026-11-01: the director has now separately authorized the Forest six-type server roster. Normal private/shared spawns use that roster; approved artwork/locks and unsupported VFX mechanic boundaries remain unchanged. Current natural-gameplay evidence is recorded in `docs/FOREST_CREEP_RUNTIME_INTEGRATION.md`; the approval-time roster-pending sentence below is historical.

The director explicitly approved the selected six-enemy sprite/VFX batch (“I approved the artwork”): 384 character frames / 120 directional clips and 112 VFX frames / 28 sequences. `assets/approved_forest_creeps.lock.json` pins 565 selected concepts, production assets, sources and provenance files. Original delivery metadata remains historical; runtime approval status derives from the lock. No artwork bytes were changed. Forest spawn/type distribution and unsupported VFX gameplay contracts remain pending. See `docs/FOREST_CREEP_ART_APPROVAL.md`.

## M3C3 retained Thiếu Lâm integration — 2026-10-31

The supplied26 character/VFX components and14 skill/passive icon directories are registered through the shared four-school atlas pipeline. No source bytes are regenerated. Independent A uses approved baseline sprites and reuses La Hán/Tru Tà icons because dedicated basic icons were not supplied. Semantic empowered hits,guards,ground impact,aura and healing phases follow authoritative events/statuses. Exact paths,pivots,frames,provenance/waiver and missing/unused phases:`docs/M3C3_SKILL_ASSET_MAP.md`. Skill candidate status remains `prototype_approval_gate_waived`,not final director approval. Existing independent baseline hurt/death remain missing aliases.


## M3C1 retained Thiên Sơn skill integration — 2026-10-31

The ten supplied character/VFX pairs are integrated through the existing `skill-art-registry.ts` and `SkillVfx`; thirteen retained icons cover actives/basics/passive. Preparation validates both Cái Bang and Thiên Sơn atlases and combines41 components/251 tags/998 frame references without exporting or regenerating source art. The school and dungeon-selection avatars reuse the approved idle PNG. Actual file inventory and semantic bindings are in `docs/M3C1_SKILL_ASSET_MAP.md`; gameplay PNGs and live observations are under `docs/evidence/m3c1/`.

Baseline cast/hurt/death aliases are disclosed: the ten actives have separate cast sheets; independent baseline hurt/death frames are still absent. Original source manifests and baseline locks remain intact. Produced/integrated/runtime-verified status does not grant final approval of the supplied skill candidates. Võ Đang and Thiếu Lâm are audited only in this batch.

## Thiếu Lâm approved character v01 — 2026-10-31

The director explicitly approved `assets/concepts/heroes/thieu-lam/thieu-lam-concept-v02.png` for both Quyền/Đao; final runtime art was separately approved on2026-10-31. Two editable Aseprite sources in `assets/source/characters/thieu_lam_v01/` export `hero_thieu_lam` and `hero_thieu_lam_dao` PNG/hash-JSON atlases plus80 individual frames. Both have four facings,2×350ms idle,4×120ms walk and4×75ms basic attacks. Quyền80×80/feet(40,64); Đao112×80/feet(56,64) clears the broad corrected left slash at the same approximately44px body scale. Normalized origin(0.5,0.8), nearest sampling and gameplay camera are unchanged. Source/provenance and exact prompts are retained; rejected/superseded attempts are preserved. `pnpm assets:export:thieu-lam` re-exports edited sources; `python -X utf8 scripts/verify-thieu-lam.py` validates all80 frames and existing approved locks. Actual Phaser results are in `assets/reviews/thieu_lam_v01/README.md`. The debug đao variant is presentation-only; cast/hurt/death reuse, active-skill artwork and school gameplay are outside authored scope. assets/approved_thieu_lam.lock.json protects89 exact reviewed concept/source/export files through source/export/preparation guards.

## Võ Đang approved character v01 — 2026-10-30

The user approved `assets/concepts/heroes/vo-dang/vo-dang-concept-v01.png`. The requested four-facing idle/walk/Quyền/Kiếm production set is exported and verified in Phaser; **final runtime character art was explicitly approved on 2026-10-30**; `assets/approved_vo_dang.lock.json` protects89 concept/source/export files. `assets/source/characters/vo_dang_v01/production_manifest_v01.json` records source/provenance and `assets/reviews/vo_dang_v01/README.md` records actual checks and failures/reruns. Quyền uses80×80/pivot(40,64); the straight-sword variant uses96×80/pivot(48,64) to clear the long rightward thrust at the same44px body height. Both retain normalized origin(0.5,0.8),2×350ms idle,4×120ms walk and4×75ms normal attack. Two editable Aseprite sources export80 individual transparent frames and two PNG/hash-JSON atlases under the existing character directories. `pnpm assets:export:vo-dang` preserves editable sources; `pnpm verify:assets` includes the new frame validator. Cast/hurt/death aliases are outside authored art. The debug sword presentation review does not implement school combat or change server authority.

**Confirmed evidence policy (2026-10-30):** Follow `AGENTS.md` visual verification and recording policy. Routine development, asset generation and tests use lightweight PNG screenshots and live Phaser assertions/frame observations. Do not create video/animated-image evidence or run recording, encoding or conversion tools. Recordings require an explicit user request for the current task; preserve all existing recordings. Animation, transition, positioning and gameplay validation remain required.

## Current arena/card revision — 2026-10-30

The current loader supersedes the earlier ART-01 ground with `assets/exports/arena_v2/ground.png`, preserving approved actors and existing statue/prop/ambient exports. Six editable Aseprite sources under `assets/source/arena_v2/` and `assets/source/dungeon_cards/` produce the ground, four 32px paving variants and four separate 512×768 static card illustrations. `pnpm assets:export:visual` re-exports edited sources; `pnpm verify:assets` validates them. `assets/arena_v2.manifest.json` records source hashes, layers, pivots and verification status. Card UI text/control frames remain DOM components. New raster components were originally generated with built-in image_gen and prepared/exported using Aseprite 1.3.18.6; no original layers were recovered from a flattened concept. Runtime director approval remains pending.

## ART-01 arena and HUD production candidate — 2026-10-30

The current candidate has nine editable Aseprite sources in `assets/source/arena_art01/` and committed PNG/JSON exports in `assets/exports/arena_art01/`. `pnpm assets:export:arena` re-exports artist-edited sources without regenerating them; `pnpm verify:assets` validates both the approved actors and this candidate. See `assets/arena_art01.manifest.json` for per-component produced/integrated/runtime-verified status, and `docs/ART01_RUNTIME_REVIEW.md` for actual browser evidence. Runtime director approval remains pending; this does not approve other maps/schools or replace the approved Cái Bang baseline.

## Approved initial character baseline — 2026-10-30

The user approved the current Cái Bang Bổng/Chưởng authored idle/walk/normal attacks as the initial visual quality baseline. Actual conventions supersede earlier proposed character dimensions for this baseline: 80×80 transparent canvases, approximately 44px bodies, feet at (40,64), four directions, `{state}_{direction}_{tagframe}` names and Aseprite hash JSON with frame tags/pivot slice. Idle: 2×350ms; walk: 4×120ms; basic attack: 4×75ms, except Bổng side sweeps 6×50ms. Nearest filtering, camera zoom 1 and usual desktop display scale 2. Larger imported art needs its own canvas/pivot and scale review, not forced resizing. Cast/hurt/death aliases remain outside authored approval.

Preserve approved source/export bytes in `assets/approved_cai_bang.lock.json`. For Gemini batches use `ASSET_INVENTORY.md`, `assets/intake/character_template.json`, `assets/intake/README.md` and `scripts/asset-intake.py`. A painted checkerboard is not alpha. Staging never installs unreviewed assets into runtime; first-batch scene approval remains separate from character approval.

**PRIMARY ART REFERENCE:** `ART_DIRECTION_REFERENCE.md` and `assets/references/vo_dang_art_direction_reference.png` now define the required **detailed chibi wuxia pixel-art style**. The original image is a concept sheet, not a usable runtime spritesheet. The style and character silhouettes must be approved in a one-hero prototype before bulk asset creation.

**CONFIRMED art direction:** classic Pokémon-style **2D pixel art with an orthographic, elevated/top-down three-quarter overworld camera**. The player views the character and surrounding map from above at a slightly angled perspective; the character's body/face and the fronts of structures remain visible. This is sometimes informally called "third-person from above"; it is **not** a 3D third-person chase camera, not a directly overhead bird's-eye view showing only heads, not an isometric diamond-grid game, and not a side-view platformer.

This guide separates **creating art** from **integrating art**. Codex can implement the asset pipeline, animation loader and tests, and it can create simple original temporary sprites. It must **not** report that finished character artwork exists until actual files exist and have been visually reviewed.

## Scope and staged delivery

- **M0:** game boots with a procedurally generated shape/placeholder in a static orthographic overhead 2D scene, with a fixed, non-rotating top-down/three-quarter view. Configure pixel-art-friendly rendering. No artist-quality sprites required.
- **M1:** first seek visual approval for the 4-direction Võ Đang sample described in `ART_DIRECTION_REFERENCE.md`; game-core may still use a Cái Bang prototype, but do not claim finished art without approval. Implement and verify a complete minimal animation loop for **one Cái Bang hero and one creep** using original sprites or clearly labeled prototype artwork: idle, move, basic attack, hurt, death; plus one skill effect. Demonstrate player-follow camera and correct Y-sorting/occlusion around at least one tree or building. If sprites are unavailable, use programmatic placeholder frames and mark the art acceptance item OPEN. Do not block networking/combat on art generation.
- **M2–M5:** add required maps, enemy/boss telegraphs, effect timings and portrait/icon placeholders when their features arrive. Content logic must not depend on whether illustrations are complete.
- **M6+:** review original art style, refine sprites, VFX and environment in coherent batches. Avoid bulk-generating unreviewed sprites for all 43 skills.

## Locked view, camera and scene composition (CONFIRMED perspective)

- Use **orthographic 2D tile-based top-down / three-quarter overworld presentation** like a classic Pokémon GBA overworld, reimagined with original wuxia-themed art, weapons, animations, and effects. Show a character's head and front/side body, not only a circular top of the head.
- Gameplay camera follows the local player across a 2D map, with a consistent zoom; **no camera rotation, pseudo-3D tilt, 3D terrain, oblique perspective tricks, side-scrolling, or isometric diamond tiling**. Camera framing may keep the player centered or slightly offset for visibility, but keep projection consistent in arena, dungeons, and PvP.
- Terrain uses square, axis-aligned tiles. Buildings, rocks, trees and scenery can show front/side faces using layered 2D sprite art while collision remains defined on the ground plane.
- Render Y-depth by each character's **feet/ground contact point**, not sprite top-left. Arrange foreground layers so a player passes **behind a tree canopy/roof/wall front** and **in front of its base** where appropriate; the visual overlap must not change server collision.
- Define an explicit sprite origin at bottom-center/feet, plus a smaller gameplay collision footprint. Keep vertical offset for tall bodies, hats, weapons and spell effects; do not use the full sprite rectangular extent as the collision body.
- Movement is eight-directional with arrow keys (including diagonals). **Initial animation proposal:** up/down/left/right walk and idle, mapping diagonal motion to a consistent nearest or most recently pressed facing; later add eight-direction animation if valuable. Basic attacks and skill effects should match visual facing, never change server combat vectors.
- Prefer nearest-neighbor sampling and **integer camera zoom** when possible (e.g. 2x or 3x), plus consistent pixel rounding to avoid shimmering; validate actual Phaser 4 settings with the installed version. Make the full arena readable at the chosen viewport, including enemies approaching from two sides and the statue health/timer UI.
- Keep the camera perspective, tile projection and sprite scale **unchanged across character school, dungeon and PvP scenes**. Separate UI overlays from scrolling map layers.
- Build an M1 visual proof with a ground tile grid, at least one visually layered tree or building, the player's 4-direction sprite, one creep, and camera following movement. Manually inspect walking above/below scenery, diagonals, sprite facing, animation crispness, NPC interaction, and visible combat range.

## Art direction and dimensions (initial proposals)

- Aesthetic: **original wuxia-inspired** Pokémon-like pixel-art presentation. Do not reuse Warcraft III, Pokémon or copyrighted custom-map assets.
- Logical terrain tile: **32×32 px**. This is a proposal; changing it later requires changing maps and collision conventions coherently.
- Character frame **48×48 or 64×64 px** as needed for weapons/robes; **not** identical to the collision footprint. Pick one standard per character family before finalizing a sheet.
- Character movement is 8-directional. Initially draw **four facing directions** (up/down/left/right) and map diagonals to a nearby facing; revisit 8-way animations after playtesting.
- Choose consistent foot/pivot origin (e.g., bottom center), scale, silhouette, and palette across a class's animations. Character appearance must not shift between frames.
- Suggested animation states per facing: `idle`, `walk`, `basic_attack`, `cast`, `hurt`; `death` may use a shared direction if artistically acceptable. Example starting ranges: idle 4 frames, walk 6–8, attack 4–6, cast 4–6, hurt 2–3, death 4–6. These are **proposed targets**, not required counts.
- Effects can have other frame sizes, but every sheet must declare frame rectangles, durations/frame rate and events; include attack hit-time metadata separately from sprite artwork.
- Use nearest-neighbor-friendly rendering and integer scaling where appropriate. In Phaser 4 inspect the installed version's actual `pixelArt`/`roundPixels` settings and avoid fuzzy sprite scaling. Consider pixel jitter when camera follows interpolated positions.
- **Never** derive damage or authoritative hit timing from the client animation. Combat events from the server drive effects; animation may be predicted for responsiveness but is reconciled.

## Source files and runtime assets

```text
assets/
  README.md                     # guidance and manifest policy
  manifest.example.json        # asset metadata template
  source/                      # editable sources (.aseprite/.ase, layered originals, map sources)
    characters/
    enemies/
    effects/
    tilesets/
    items/
    ui/
  exports/                     # generated PNG sheets + JSON atlases (may be rebuilt)
    characters/
    enemies/
    effects/
    tilesets/
    items/
    ui/
  audio/                       # appropriately licensed or original music/SFX
maps/                          # editable Tiled sources and exported JSON, per technical architecture
apps/game-client/public/assets/ # copied/bundled client-ready files by build tooling
```

Keep editable sources in Git when size/licence permits; version exports needed to run the game or make them reproducibly generated by a documented build command. No absolute Windows paths in committed metadata. Audio licensing/provenance must be tracked as well.

## IDs, file names and frame metadata

- Filenames and runtime IDs use ASCII snake_case, e.g. `cai_bang_chuong_walk_down.png`; on-screen names remain correctly accented Vietnamese.
- Prefer one Aseprite source file per character/style with **named animation tags**, named layers, frame durations, and a documented export command. One atlas JSON + PNG per manageable asset group is sufficient.
- Use stable IDs such as `hero_cai_bang`, `creep_runner`, `vfx_fireball_impact`. A style skin/sprite cannot silently modify attack range, cleave, facing or collision.
- Store a manifest entry recording asset id, category, source file, exported file paths, attribution/license, animation tags/directions, dimensions, pivot, and status (`placeholder`, `prototype`, `approved`). See `assets/manifest.example.json`.
- Data-driven `animationId -> asset/tag` mappings should live in the client presentation layer, separate from combat skill IDs and status-effect rules.

## Example Aseprite CLI workflow (optional tool)

If Aseprite is installed, Codex may automate exports using its CLI. Example (adapt paths to repo and Windows):

```powershell
aseprite.exe -b assets/source/characters/cai_bang.aseprite --sheet assets/exports/characters/cai_bang.png --data assets/exports/characters/cai_bang.json
```

Do not claim this works if Aseprite is not installed. Aseprite's CLI supports sprite-sheet PNG + JSON exports; verify flags and JSON format against the installed version: https://aseprite.com/docs/cli/

For Tiled maps, keep editable map sources and export JSON plus tile images. Explicitly define `collision`, `spawn_west`, `spawn_east`, `statue`, `npc`, and `portal` object/layer conventions, verified against real maps.

## Quality gates for each asset batch

1. Verify source exists and license/provenance is recorded; no watermark or unlicensed scraped art.
2. Load actual PNG and animation data in the running Phaser 4 client; no missing texture, missing frame tag, transparent-only sheet or invalid dimensions.
3. Test all present directions and actions, including rapid movement changes, casting and overlapping effects. Animations should not jump, stretch, jitter or face backwards.
4. Confirm hitboxes and projectile trajectories stay controlled by the authoritative simulation; sprite dimensions never change combat reach.
5. Inspect the playable scene live in Phaser and capture lightweight PNG screenshots when tools permit; record animation-frame/timing observations and transition/positioning checks in text or JSON. Report actual inspected assets and mark missing art as placeholders; never invent visuals or claim successful testing without inspecting them.
6. Keep file size and texture count reasonable for six players plus multiple waves; measure performance rather than inventing targets.

## Open art decisions for the game director

The **2D top-down/three-quarter Pokémon-like overworld perspective is confirmed** and not an open decision. Fine palette details, exact sprite footprint (test 64 px before approval), concrete 32px tile assumption, four- versus eight-direction *artwork*, animation frame budget, exact zoom/resolution, final art production workflow, and commercial asset licenses remain **open/proposed**. Codex may propose temporary defaults but must not mark them approved.

## Useful official references

- Phaser 4 pixel-art renderer guidance: https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md
- Aseprite CLI: https://aseprite.com/docs/cli/
- Tiled JSON export: https://docs.mapeditor.org/en/latest/manual/export-generic/

## Art of the game interface — v1.4

School art references: `assets/references/cai_bang_character_reference.png`, `thien_son_thieu_lam_character_reference.png`, `vo_dang_art_direction_reference.png`. World reference: `assets/references/in_game_world_reference.png`. **Bad layout example**: `assets/references/current_codex_dashboard_anti_reference.png` (map boxed into left and HTML dashboard to right). All images are style references, not validated sprite atlases.

Create UI art suitable for a chibi wuxia pixel-art game: hero portraits, compact stat bars, icon hotbar, item icons/grids, readable framed NPC windows. Prefer original/licensed graphical borders and clear pixel-art icons. HUD must live above the world **within the game viewport**, with readable Vietnamese text and closeable in-game windows. No need for all UI to be authored as Phaser sprites; HTML/CSS modal views over the canvas are allowed as long as they stay within the viewport and match the game look. See `UI_UX_SPEC.md`.

## v1.6 Art quality approval rule

The art pipeline's acceptance conditions are now defined in `ART_PRODUCTION_STANDARD.md`. A Phaser scene built from procedural placeholders is sufficient only for engineering smoke tests and **cannot count as production artwork**. Prove final quality first on one illustrated playable arena slice. The current screenshot is archived as `assets/references/current_game_2026_10_29_placeholder_anti_reference.png`. UI/HUD placement alone does not pass art review.

## Implemented skill asset contract — M3A

The supplied Cái Bang sources live under `assets/source/skills/cai-bang/`; retained PNG/JSON atlases and animation metadata live under `assets/exports/skills/cai-bang/`. `pnpm assets:export:skills` runs Aseprite batch exports of the editable sources. Do not use `--assemble` after manual source edits unless intentionally rebuilding the supplied recipe. `python assets/source/skills/cai-bang/validate.py` checks sources, frame/source equality, binary transparency, boundaries, pivots and protected baseline hashes. `pnpm assets:icons:skills` derives ten icons from existing VFX frames with recorded integer scaling, frame provenance and hashes; no new artwork is generated.

Future components need a stable ASCII ID, canonical skill ID, character/VFX kind, PNG and JSON-hash atlas, and ordered named animation tags with frame names/dimensions/count, frame rate/repeat, cardinal direction, normalized origin, stage, placement and per-animation offset. Configurable display scale is an integer. `packages/game-data/src/skill-art.ts` validates the manifest and maps semantic stages to animations; `scripts/prepare-assets.mjs` also checks required files, atlas bounds and duplicate animation keys. An arbitrary sheet grid is not inferred from image size. Add semantic bindings rather than a custom renderer per skill.

The existing production manifest is historical export evidence. `runtime_integration_v1.json` separately records exact integrated export hashes, observed live frame subsets and approval status. Real gameplay screenshots/frame observations live in `docs/evidence/m3a/`. Produced, integrated, runtime verified and director approved are distinct states; the last remains pending for the skill candidates. See `docs/M3A_SKILL_ASSET_MAP.md` for per-skill mapping and `docs/M3A_IMPLEMENTATION.md` for reproduction and limitations.

## Thiên Sơn approved character baseline — 2026-10-30

Concept `assets/concepts/heroes/thien-son/thien-son-concept-v01.png` and the final runtime idle/walk/fan/đao artwork are explicitly approved on 2026-10-30. Two editable sources under `assets/source/characters/thien_son_v01/` export `hero_thien_son` (fan) and `hero_thien_son_dao` PNG/JSON plus 80 individual frames. Both use the approved 80×80 / feet (40,64) baseline, four independently authored facings, 2×350ms idle, 4×120ms walk and 4×75ms attack. `assets/approved_thien_son.lock.json` protects the exact approved concept, sources, atlases/previews and 80 frame PNGs. The exporter refuses overwriting approved IDs; use a separately reviewed revision for future changes. `pnpm verify:assets` validates both approved character baselines. The server-selected Thiên Sơn identity uses fan artwork; the local debug đao review changes presentation only, without implementing school combat abilities. Provenance and approval fields: `assets/source/characters/thien_son_v01/production_manifest_v01.json`. Actual normal-zoom PNGs, live animation observations and seven passing scoped browser checks: `assets/reviews/thien_son_v01/README.md`. Both Thiên Sơn runtime entries are `approved`; cast/hurt/death reuse remains outside authored approval.


## Thiên Sơn skill visual prototypes — 2026-10-31

All ten active skill concepts and thirteen icon concepts are approved. The production batch was initially delivered as a prototype and received explicit final director approval on2026-10-31 (user: “skill artwork approved”): `assets/source/skills/thien-son/`, `assets/exports/skills/thien-son/` and `assets/reviews/skills/thien-son/`. It contains20 character/VFX components,146 semantic tags,534 exported cels and13 icons. See the coverage/provenance manifests for new drawings versus approved, semantic, expiry and cardinal reuse. Raw generated versions are retained; editable cels and atlas export use Aseprite1.3.18.6.

Character height remains80px with approximately44px bodies, feetY64 and origin(0.5,0.8); horizontal80/96/112/128px canvas clearance accommodates cloth/curved blades without enlarging the actor or changing gameplay reach. VFX96/128/160px canvases have independent origins, directional offsets and stages. Ground ellipses stay in the fixed overworld perspective. The rendered helix/rings use rear upper and foreground lower halves for character readability.13 individual64px icons and one family atlas derive from the approved icon concepts. No names/hotkeys are baked into them.

`?artPreview=1&thienSonSkills=1` selects the presentation-only Phaser review. It shares `skill-art-registry.ts` with existing gameplay rendering, but uses separate prototype metadata and a clearly labelled visual choreography plan. It opens no game room and changes no ability, passive, cooldown, cost, hitbox, movement rule, loadout or server authority. The13-icon strip is a review palette, not a new combat hotbar. Normal fan/đao clips are reused unchanged; the passive has no aura.

Use `pnpm assets:export:thien-son-skills` to export retained sources and `python -X utf8 scripts/verify-thien-son-skills.py` for pixel/atlas/pivot/reuse checks. `node assets/source/skills/thien-son/serve_review_v01.mjs` serves the frontend-only review on localhost5194. Actual PNG evidence and frame/timing/cleanup observations are recorded in the review folder and M3C1 evidence. Final director approval is recorded in `assets/approved_thien_son_skills.lock.json`; historical export/validation reports retain their export-time approval state.

M3C1 verified runtime integration metadata: `assets/exports/skills/thien-son/runtime_integration_m3c1.json`. It records source/public hashes and observed frame subsets without changing historical art-approval declarations.

## M3C2 retained Võ Đang integration — 2026-10-31

The approved Võ Đang baseline,ten character/VFX pairs and thirteen icons are bound to actual shared gameplay. No source sprite bytes are regenerated. `docs/M3C2_SKILL_ASSET_MAP.md` records exact canonical mappings,dimensions,pivots,fps,phases,provenance and missing/unused art. Areas render from server-scoped state; shield/refund/counter cues come from combat events. `python -X utf8 scripts/verify-vo-dang-skills.py` is included in final asset validation. Historical production manifests retain their art-delivery integration status; M3C2 runtime evidence is recorded separately. Baseline hurt/death aliases remain disclosed.
