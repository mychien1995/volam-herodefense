# Desert / Sa Mạc asset handoff

Created 2026-10-31 (Asia/Saigon). **Asset production only; nothing integrated into Phaser.**

## Environment

- Concept/map preparation board: `assets/concepts/dungeon-environments/desert/desert-environment-concept.png`. Illustrative layout only, not a runtime map or source of extracted tiles.
- Terrain: `assets/tilesets/desert/`. Six authored materials: smooth sand, rough sand, cracked dry earth, rocky ground, sandstone path, dune sand. `desert-terrain.png` contains **344 square 32×32 tiles**: 24 material phase tiles and five sand-to-material transition families, each with 16 corner masks × four phases. Covers sand/stone transitions and dune edge/corner variations. Six periodic 64×64 material PNGs are retained.
- Transition IDs and NW/NE/SE/SW mask bits are in `desert-terrain.json`. IDs are zero-based. Phase follows world tile parity `(x % 2) + 2 * (y % 2)`; do not randomly shuffle phases when seamless continuation is needed.
- Props: `assets/sprites/environment/desert/`, **20 individual transparent PNGs** plus `desert-scenery.png/json`: sandstone rocks, straight cliff, cliff corner, broken pillar, horizontal/vertical ruin walls, ruined gateway, ancient monument, dead tree, dry bush, desert crate, barrel, abandoned temple, guardian lion ruin, pebble scatter, dust decal, dungeon entrance, dungeon exit portal, ruined gate frame, gate steps/base.
- Props range from 56×64 to 192×176; exact canvas sizes, source rectangles, foot pivots and layer suggestions are in the scenery JSON. Gate frame/base are independent variants, not a guaranteed perfectly mating split assembly. Entrance/exit portal artwork is static.

## Enemy concepts and sprites

`assets/concepts/dungeon-creeps/desert/` contains `desert-creeps-master.png` and six individual `*-concept.png` panels. Individual concepts are lossless crops of that master; production frames were generated separately. Creep concepts were automatically accepted as explicitly requested in this task. Environment/runtime approval is not implied.

Production root: `assets/sprites/creeps/dungeons/desert/`. Each enemy has individual transparent `frames/*.png`, `spritesheet.png`, `atlas.json`, and `animations.json`.

| ID / Vietnamese name | Canvas | Frames | Target standing height |
| --- | --- | --- | --- |
| `bo_cap_cat` / Bọ Cạp Cát | 128×112 | 64 | 56 px including raised tail |
| `sa_xa` / Sa Xà | 128×96 | 60 | 36 px |
| `sa_tac` / Sa Tặc | 112×96 | 64 | 44 px |
| `cung_thu_sa_mac` / Cung Thủ Sa Mạc | 112×96 | 64 | 44 px |
| `xac_uop` / Xác Ướp | 112×96 | 64 | 46 px |
| `cu_nhan_sa_thach` / Cự Nhân Sa Thạch | 144×128 | 64 | 72 px |

All six have **idle, walk, attack, hit and death**, each in **down/left/right/up**: 120 animation tags and 380 frames total. Per direction: two idle, four walk, four attack, two hit, four death; viper death has three complete authored poses because its final source pose occupies a double-width slot. No duplicate fourth death frame was invented.

Feet pivot is `(canvasWidth / 2, canvasHeight - 16)`. Exact frame rectangles, durations, source rectangles, scaling and mirrored flags are supplied. Default presentation timing: idle 350 ms/frame; walk 120; hit 90; attack usually 110/80/80/130 (archer 100/110/70/120); death 100/120/150/600 (viper 120/160/600). Loop idle/walk; play attack/hit/death once and hold the terminal death frame as appropriate. These are art timing suggestions, never combat timing rules.

Side attacks for viper, raider, archer, mummy and golem use an authored right-facing sequence mirrored for left. Archer right death mirrors the authored left sequence. Mirroring also flips highlights/handedness; assess that during later runtime review. Every sequence contains distinct drawn poses; no repeated stills were exported as animation. Superseded combined attack attempts remain in source only.

## Combat VFX

`assets/effects/dungeons/desert/` contains eight six-frame effects (**48 frames**): sand dust, slash impact, arrow impact, scorpion pincer, scorpion sting, viper bite, mummy disintegration, golem ground impact. Each has individual frames and PNG/JSON atlas. Small effects use 96×96 canvases; mummy/golem use 128×128. Suggested 80 ms/frame, center pivots. Slash points right; directional transforms are a later presentation concern.

Four separate 48×48 arrow PNGs face down/right/up/left. Metadata: `effects.json`. These are visual resources only; they introduce no attacks, statuses or gameplay rules. Arrow travel must remain straight and server-driven when integrated.

## Source, style and later integration

- Primary benchmark: approved Bamboo Forest concepts and actual production props/materials; inspected approved Võ Đang/Cái Bang/Thiên Sơn/Thiếu Lâm idle exports and arena creep art. Preserve warm dark contours, crisp material clusters, compact chibi proportions and elevated orthographic camera. Desert uses ochre/russet sandstone and faded red fabric; cyan distinguishes the exit. The older `vo_dang_art_direction_reference.png` filename is absent; inspected the actual `vo_dang_character_reference.png` instead. No Bamboo Forest creep artwork was found; its notes describe those enemies as unproduced.
- `assets/source/desert/` retains 16 original generation/correction PNGs, all 18 exact prompts and original generator paths in `generation_prompts.json`, `export_recipe.json`, asset-only `export_assets.py`, and `asset_manifest.json` with provenance, image hashes and verification results. Generated rasters are flattened editable PNGs; no layered/Aseprite source is claimed. Source originals are preserved, including superseded attempts.
- Original AI-assisted art made with OpenAI built-in `image_gen.imagegen`, guided by project references. No commercial art pack was imported; no third-party license or exclusive copyright claim is asserted. Export uses nearest sampling, binary alpha cleanup and zero RGB beneath transparent pixels. Terrain transitions assemble authored texture pixels rather than procedural placeholder art.
- Future integration: nearest filtering, consistent normal zoom, feet-based Y sorting and separate authoritative collision footprints. Ground decals sit below actors. Tall structure/foreground occlusion needs placement/layer review; no collision, spawn, map, loader or runtime configuration was authored. Keep combat damage, targeting, RNG and timing server-authoritative.
- **File production complete; runtime motion, timing, pivots, seams in a composed map, multiplayer readability and director approval remain deferred to the requested later integration task.** Static pose inspection is not a Phaser animation pass. No game build, test suite, Phaser launch, recordings or extra evidence package was generated.

## Final lightweight verification

PASS: all **498 PNGs** decoded with Pillow `verify()` and full `load()`; no corrupt images. Expected concepts, six enemy folders, 380 frame files/120 tags, 344 tiles, 20 props/portals, eight effects and four projectiles exist. Production PNGs have valid dimensions/binary transparency; actor frames have padding, remain inside atlas bounds and match their atlas pixels. Every actor/VFX sequence has distinct image data. JSON metadata parsed. Details and hashes are in `assets/source/desert/asset_manifest.json`.

No asset-file blocker remains. Stop here: no Phaser integration and no other dungeon work.
