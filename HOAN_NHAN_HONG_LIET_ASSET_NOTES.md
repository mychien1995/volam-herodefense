# Hoàn Nhan Hồng Liệt — Phase 3B asset handoff

Produced 2026-10-31. **Asset production only; no Phaser integration or game execution.**
Concept approval is automatic under this assignment. Production PNGs are retained as
`prototype` / `produced_unintegrated`, rather than claiming runtime or final visual
approval. No runtime source, loader, AI, balance or shared configuration was edited.

## Package and provenance

- Boss package inventory: `assets/sprites/bosses/hoan-nhan-hong-liet/package_manifest.json`
- Exact generation prompts: `assets/sprites/bosses/hoan-nhan-hong-liet/generation_jobs.json`
- Offline export recipe: `assets/sprites/bosses/hoan-nhan-hong-liet/export_package.py`
- Lightweight file/frame verification: `assets/sprites/bosses/hoan-nhan-hong-liet/verification.json`

Artwork was generated originally using the **built-in image_gen tool**. Retained
PNG drawings in each component's `source/` directory are the editable raster
starting points. No proprietary franchise sprites or externally licensed asset
packs were copied. No hand-layered `.aseprite` source is claimed. PNG extraction,
uniform nearest-neighbor resampling and atlas packing use Pillow/NumPy; terrain
transitions composite the authored texture materials with corner masks. VFX
exports clear alpha values of2/255 or less to remove invisible source noise;
retained original source PNGs are unchanged.

References inspected include the existing approved hero exports and arena creep,
Lý Mạc Sầu's concept/source sheets, and the existing hell environment/prop exports.
`assets/references/vo_dang_art_direction_reference.png` named in older guidance is
absent; the available `assets/references/vo_dang_character_reference.png` supplied
the corresponding style reference. The current placeholder anti-reference was
inspected and was not used as an art style.

## Boss concept, portrait and animation

- Concept: `assets/concepts/bosses/hoan-nhan-hong-liet/master_concept.png`
  — master design, front/back/left/right studies, dao, palette, combat poses and
  hero/boss scale comparison.
- Portrait: `assets/sprites/bosses/hoan-nhan-hong-liet/portrait.png` (256×256 RGBA).
- Sprite sheet: `assets/sprites/bosses/hoan-nhan-hong-liet/spritesheet.png`
- Hash atlas: `assets/sprites/bosses/hoan-nhan-hong-liet/atlas.json`
- Timing, looping, provenance: the adjacent `manifest.json`.
- Individual PNGs: the adjacent `frames/` directory.
- Original directions and molten state: the adjacent `source/` directory.
- Extraction rectangles/offsets: the adjacent `extraction.json`.

Boss frames are **128×128**, fixed foot anchor **(64,104)**, approximately 64px
standing silhouette against the retained roughly 44px hero baseline. These are
canvas dimensions, not combat footprints. All four facings are authored:
`down`, `up`, `left`, `right`. Frame names follow `{state}_{direction}_{index}`.

| Animation identifier | Frames per facing | Art frame duration | Loop |
|---|---:|---:|---|
| `idle_{direction}` | 2 | 350ms | yes |
| `walk_{direction}` | 4 | 150ms | yes |
| `basic_attack_{direction}` | 4 | 110ms | no |
| `ground_slam_{direction}` | 4 | 140ms | no |
| `lava_cast_{direction}` | 4 | 160ms | no |
| `command_{direction}` | 4 | 180ms | no |
| `ultimate_charge_{direction}` | 4 | 220ms | no |
| `hurt_{direction}` | 2 | 120ms | no |
| `death_{direction}` | 4 | 180ms | no; hold final frame |
| `low_hp_idle_{direction}` | 4 | 250ms | yes |

The ten states contain **144 distinct frame entries / 40 animation tags**. Whole
source sheets are normalized to the standing scale; individual poses are never
independently stretched or made by rotating a still. The low-HP state is a full
replacement idle, not an additive copy to draw on top of the normal character.
The facing expresses the character's body view; frontal/back bow or saber poses
can hold their weapon laterally. Align future attack presentation to the actual
server-facing vector during integration, rather than inferring aim from a blade.

## Combat visuals

The request lists **seven attack sets** (basic + five skills + ultimate), plus the
passive. All are mapped in:
`assets/effects/bosses/hoan-nhan-hong-liet/ability_asset_map.json`.

All VFX use `assets/effects/bosses/hoan-nhan-hong-liet/`:
`spritesheet.png`, `atlas.json`, `manifest.json`, individual `frames/`, and original
`source/` sheets. There are **28 tags × 4 frames = 112 frame entries**. Canvas 256×256;
centered warning/projectile/armor effects use (128,128); grounded effects use
**(128,208)**. Art timing is90ms per one-shot frame or120ms for looping effects.

| Display name / ASCII ID | Character animation | VFX tags |
|---|---|---|
| Đại Mạc Chiến Đao / `dai_mac_chien_dao` | `basic_attack_*` | `saber_slash`, `weapon_impact_dust_sparks` |
| Dung Nham Liệt Địa / `dung_nham_liet_dia` | `ground_slam_*` | `fissure_warning`, `ground_rumble`, `traveling_fissure`, `lava_eruption`, `burning_impact` |
| Hỏa Sơn Bạo Phát / `hoa_son_bao_phat` | `lava_cast_*` | `eruption_warning`, `ground_rumble`, `lava_eruption`, `molten_splash`, `burning_ground` |
| Liệt Diễm Phong Tỏa / `liet_diem_phong_toa` | `lava_cast_*` | `wall_warning`, `safe_gap_boundaries`, `lava_wall_rise`, `lava_wall_dissipate` |
| Hỏa Tiễn Tề Phát / `hoa_tien_te_phat` | `command_*` | `military_signal`, `volley_warning`, `flaming_arrow`, `arrow_impact`, `burning_ground` |
| Thiết Kỵ Triệu Binh / `thiet_ky_trieu_binh` | `command_*` | `military_signal`, `arrival_dust`, `rally_formation` |
| Vạn Lý Nham Hỏa / `van_ly_nham_hoa` | `ultimate_charge_*` | `ultimate_warning_cross`, `ultimate_warning_sectors`, `ultimate_eruption`, `expanding_shockwave`, `burning_ground`, `ultimate_ending` |
| Hắc Nham Chiến Giáp / `hac_nham_chien_giap` | `low_hp_idle_*` | `armor_glow`, `defense_impact` |

Reuse is deliberate: the two lava casts share character poses; volley and summon
share military command poses. General eruption, splash, ground and dust phases
are reusable effect components. Two rejected character-baked rows remain in the
raw lava source for provenance, **are not exported**, and are replaced by the
standalone `basic_vfx_source.png` drawings.

Warning assets use outlined/hatch patterns, unlike hot white/orange eruptions.
Wall warnings and ultimate patterns retain transparent safe gaps. The circular
warning's transparent center does **not** imply a safe central hole; its perimeter
indicates the prospective disk. Artwork alpha never defines authoritative damage
or collision. Wall sheets are modular low segments; leave the intended gaps open
and depth-sort to preserve player visibility. The `safe_gap_boundaries` tag marks
gap edges, not a promise of invulnerability.

## Summoned soldiers

Combined concept (including both soldiers' front/back/left/right studies):
`assets/concepts/summons/mongolian-soldiers/combined_concept.png`.

| Soldier | Production directory | Frame/body scale | Foot anchor |
|---|---|---|---|
| Mông Cổ Thiết Binh | `assets/sprites/summons/mongolian-footman/` | 96×96 canvas / about48px body | (48,76) |
| Mông Cổ Cung Thủ | `assets/sprites/summons/mongolian-archer/` | 96×96 canvas / about46px body | (48,76) |

Each directory contains `spritesheet.png`, `atlas.json`, `manifest.json`,
`frames/`, and `source/animation_source.png`: **64 frames /28 tags each**.
Both have four-facing2-frame idle,4-frame walk,2-frame hurt,3-frame death,
and one arrival keypose. Footman adds3-frame `basic_attack_*` and a one-frame
`shield_guard_*` pose. Archer adds2-frame `bow_draw_*` (aim/draw) and2-frame
`arrow_release_*` (release/recovery). The manifest owns exact durations.

Footman melee impact reuses `weapon_impact_dust_sparks` from the army VFX atlas.
Archer projectiles use `normal_arrow`, `flaming_arrow` and `arrow_impact` from that
same atlas. Arrow source artwork points right; future renderer orientation must
come from the authoritative launch vector and remain straight/non-tracking.
The human arrival keypose combines with animated `arrival_dust`; it is explicitly
not represented as a separately authored four-frame soldier arrival sequence.
These are living army troops sharing armor, colors and flags, not undead summons.

## Mongolian Army Headquarters

- Complete overview / standalone visual layout reference:
  `assets/concepts/arenas/mongolian-headquarters/arena_overview.png`
- Normalized placement notes:
  `assets/concepts/arenas/mongolian-headquarters/layout_reference.json`
- Terrain package:
  `assets/tilesets/boss-arenas/mongolian-headquarters/terrain.png` + `terrain.json`
- Four reusable128×128 material patches: `dirt_material.png`, `ash_material.png`,
  `courtyard_stone_material.png`, `volcanic_ground_material.png` in that directory.
- Individual32×32 tiles: its `tiles/` directory, **112 tiles** total:64 material
  variants and48 corner-mask transition variants. The16 tiles for each material
  form a coherent4×4 patch; do not scatter them randomly and expect every edge
  to match. Transition masks use TL1/TR2/BR4/BL8 with documented groups.
- Props and structures: `assets/sprites/environment/mongolian-headquarters/`.
  Individual transparent PNGs plus `spritesheet.png`, `atlas.json`,
  `props_metadata.json` and `manifest.json` contain **24 reusable assets**.

Structures: `command_tent`, `watchtower`, `palisade_horizontal`,
`palisade_vertical`, `military_gate`, `yurt`, `soldier_tent`, `return_portal`.
`military_gate` supplies the fortified dungeon entrance; `return_portal` is shared
portal artwork suitable for both entrance and return roles if needed.

Props: `army_banner`, `signal_pennant`, `saber_shield_rack`, `bow_quiver_rack`,
`supply_crate`, `open_supply_crate`, `barrel`, `supply_sacks`, `burning_brazier`,
`military_drum`, `saddle_trestle`, `horse_tack_rack`, `volcanic_rocks`,
`ash_basalt_rock`, `boundary_lava_rock`, `command_horn_carpet`.

Boss placement is near the north command tent; player entrance is south; soldier
entry gates are west/east with separate infantry/archer staging. The open central
training courtyard reserves room for six players and temporary telegraphs.
Permanent lava is confined to boundary dressing. The JSON is an **art layout
proposal**, not a registered Tiled gameplay map or authoritative collision file.

## Future integration and proposed gameplay — not implemented

- Use nearest sampling and feet-based Y-depth. Read each atlas/manifest's actual
  frame rectangles and anchors; source PNG dimensions differ from requested
  generation dimensions. Tall roofs may need later occlusion/layer splits.
- Atlas format is Aseprite-compatible hash JSON; sources are retained raster PNGs,
  not fabricated `.aseprite` documents. Playback loop flags are explicit in each
  manifest; hold the final death frame instead of looping it.
- Future code must obtain aim, positions, collision, attack events, movement,
  summon count, telegraph dimensions and phase timing from the server. Client
  animation frame durations are art playback suggestions, not hit scheduling.
- The requested25%-HP ultimate threshold is a **future mechanic**. The assets
  support it; there is no trigger, AI, damage, cooldown or balance implementation.
- Phaser animation continuity, transitions, source-facing aim corrections,
  six-player visibility, terrain composition seams, wall occlusion and safe-area
  reachability remain future runtime review items. No game was run and no runtime
  screenshots, recordings, comparison sheets or new test suites were generated.

## Lightweight verification scope

The single final offline verification checks retained/required PNG existence,
PNG decoding/alpha, in-bounds atlas rectangles, all referenced frame files,
non-static multi-frame sequences, positive durations, all four facing tags,
both soldier sets, all seven attacks plus passive mappings, terrain IDs and props.
The first pass found1/255 alpha noise at two warning gap centers. Export alpha
cleanup resolved this; only the affected VFX exports were rechecked. Verification
records file hashes and actual counts in `verification.json`. This verifies
the asset package structure; it does not claim Phaser or gameplay acceptance.
