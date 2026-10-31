# Tây Độc — Âu Dương Phong: asset-only handoff

Stable package ID: `tay-doc`; actor texture IDs: `boss_tay_doc_phase_1`, `boss_tay_doc_phase_2`, `boss_tay_doc_transition`. Vietnamese display names remain separate from ASCII animation names. Produced 2026-10-31 using built-in image_gen and offline raster export. Concepts are automatically approved under the explicit task instruction. Production files are asset-only candidates; no Phaser integration, runtime playback, gameplay acceptance or runtime director approval is claimed.

## Concepts and identity

- `assets/concepts/main-bosses/tay-doc/master-concept.png`: both phases, turnarounds, staff detail, martial poses, palette and illustrated 44px hero/64px boss comparison.
- `assets/concepts/main-bosses/tay-doc/phase-1-concept.png`: Độc Trượng identity and staff poses.
- `assets/concepts/main-bosses/tay-doc/phase-2-concept.png`: Cáp Mô Độc Công identity and human crouching/lunge poses.

Both phases depict the same elderly, sinister, white-haired and long-bearded human master in dark-jade/black tattered robes with purple sash and green eyes. Phase 1 carries a poisonous jade staff; Phase 2 uses bare hands and a low human martial stance. He never becomes a literal toad. Palette: near-black, dark jade, olive, poison lime, sickly yellow-green, gray-white hair and restrained purple. Upper-left light and dark clustered outlines follow the existing elevated orthographic three-quarter wuxia presentation.

Read: AGENTS.md, ART_ASSET_GUIDE.md, ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, GAME_DESIGN.md, CONTENT_DATA.md, DECISIONS.md, TECHNICAL_ARCHITECTURE.md and ROADMAP.md. The legacy `vo_dang_art_direction_reference.png` is absent; `assets/references/README.md` documents the actual replacement `vo_dang_character_reference.png`, which was inspected. Existing approved Võ Đang hero exports, approved arena Ngưu Ma artwork, Hell dungeon creep artwork, existing Chu Bá Thông boss artwork, arena battle reference and rejected placeholder anti-reference were also inspected. Existing dungeon/boss file presence was not taken as proof of director approval. Reference pixels were not copied into new art.

## Character production

Each folder contains `spritesheet.png`, Aseprite-compatible hash `atlas.json` with `meta.frameTags` and pivot slice, explicit `animations.json`, `manifest.json`, individual transparent `frames/{state}_{direction}_{index}.png`, and generated raster `source/{direction}.png`.

| Directory under `assets/sprites/bosses/main/tay-doc/` | States in each of down, left, right, up | Frames |
|---|---|---:|
| `phase-1/` | idle, walk, basic_attack, poison_cast, large_spell_cast, hurt, death | 112 |
| `phase-2/` | idle, walk, palm_attack, lunge_attack, dual_hand_cast, aoe_charge, hurt, death | 128 |
| `transition/` | staff_release, cap_mo_crouch, cap_mo_charge, energy_eruption | 64 |

Each state/direction has four distinct drawn cels. Idle/walk loop; other character actions are one-shots. Phase 1 art is approximately64px tall including staff; Phase 2 uses approximately54px low-stance art, with the same identity and standing-equivalent scale. This is an asset-production scale proposal against the approximately44px hero baseline, not a runtime scale approval. All actor canvases are160×144; feet pivot(80,116), normalized origin(0.5,0.805556). Lunge release has a6px visual lift. Canvas padding is generous to clear hair, weapons and limbs; it never defines a gameplay hitbox.

Presentation defaults: idle350ms/cel; walk120; Phase1 basic/palm90; poison cast140; large spell180; hurt120; death180; lunge85; dual-hand150; AoE charge200; transition release/crouch150, charge160, eruption110. Exact values and ordered frame names are in each `animations.json`. These timings never define damage, phase thresholds or authoritative release events.

Transition sequence: play `staff_release_{direction}` (staff planted beside the master), `cap_mo_crouch_{direction}`, `cap_mo_charge_{direction}`, `energy_eruption_{direction}`, then Phase2 idle. Layer the separate transition warning/charge/shockwave/activation effects as later implementation requires. No staff-equipped Phase2 actor frames are supplied.

## Skill-to-VFX mapping

Effects live under `assets/effects/bosses/main/tay-doc/{phase-1,phase-2,transition}/`, each with PNG/hash-JSON atlas, explicit animations, manifest, four individual cels per clip and generated source sheets. All effect canvases256×256 with center pivot(128,128). Clip artwork occupies different sizes inside that transparent canvas. Warnings have explicit role `warning` and are separate clips/files from damaging effects.

| Phase / skill | Character clip | Effect clips | Warning clip |
|---|---|---|---|
| 1 — Độc Trượng Kích | basic_attack | poison_bolt, staff_impact | staff_cone_warning |
| 1 — Vạn Độc Phi Châm | poison_cast | poison_needle, needle_fan, needle_impact, poison_status | needle_fan_warning |
| 1 — Độc Vụ Mê Hồn | poison_cast | cloud_expand, cloud_loop, poison_damage_tick | cloud_warning |
| 1 — Độc Long Xuất Hải | large_spell_cast | serpent_charge, serpent_wave, serpent_impact, poison_particles | serpent_lane_warning |
| Transition — Cáp Mô Công | staff_release → cap_mo_crouch → cap_mo_charge → energy_eruption | staff_release_sparks, cap_mo_charge, poison_aura, transition_shockwave, phase_2_activation, body_poison_mist | transition_circle_warning |
| 2 — Độc Chưởng | palm_attack | palm_trail, palm_impact | palm_cone_warning |
| 2 — Cáp Mô Chấn Kích | lunge_attack | lunge_impact, lunge_shockwave | lunge_lane_warning |
| 2 — Ngũ Độc Thần Chưởng | dual_hand_cast | giant_palm_projectile, poison_explosion | multi_palm_warning |
| 2 — Vạn Độc Bạo Phát | aoe_charge | circular_eruption, poison_explosion, toxic_particles | eruption_circle_warning |

Phase1 has17 effect/warning clips (68cels); Phase2 has12 (48cels); transition has7 (28cels). Total36clips /144cels. Transition warning is stored with transition effects even though it was generated alongside Phase2 warnings.

Gold/ivory edges and violet glyphs distinguish warnings from luminous green poison. Cones/fans, straight lanes and rings communicate different patterns. Projectile art is canonical screen-right; later presentation may orient it to an authoritative launch vector. It must not implement homing. Warning footprints are normalized across their pulse frames; they are visual indicators only, not collision masks or finalized attack geometry. Cloud expansion/loop alpha is capped through a0.34 multiplier, body mist0.30 and status/aura0.65, keeping the world visible. Effect animation defaults100ms/cel; warnings140ms/cel. Idle effects/status/cloud/aura/mist and warnings may loop; bursts are one-shots.

## Portraits and icons

`assets/icons/bosses/tay-doc/` contains128×128 `portrait_phase_1.png` and `portrait_phase_2.png`; ten64×64 icons: `doc_truong_kich`, `doc_chuong`, `van_doc_phi_cham`, `doc_vu_me_hon`, `doc_long_xuat_hai`, `cap_mo_cong`, `cap_mo_chan_kich`, `ngu_doc_than_chuong`, `van_doc_bao_phat`, `poison_status`. File names end in `.png`. `manifest.json` records dimensions, source rectangles and hashes. Staff art is a skill icon, never an equipment drop.

## Sources, provenance and conventions

Portable package manifest: `assets/sprites/bosses/main/tay-doc/package_manifest.json`. Exact generation prompts and source inventory: `source/generation_jobs.json`; exported-frame crop/scale/anchor records and hashes: `source/extraction_recipes.json`; offline export recipe: `source/export_assets.py`. These are original AI-assisted raster sources generated for this project, with no external sprite pack used and no exclusive copyright assertion. Flattened PNGs are the editable raster source; layered Aseprite originals are not claimed.

Production sprites are extracted only from purpose-generated animation sheets, never from concept collages. Export uses transparent-gap row extraction, low-alpha cleanup, detached-neighbor fragment removal, one fixed nearest-neighbor actor scale per facing/source sheet, feet anchor alignment, and independent warning footprint normalization. No frame is made by copying/bobbing/rotating a static character image. Zero-alpha pixels may contain unused RGB in source art; export removes low-alpha background residue. Regeneration requires explicit new image_gen calls; the exporter only processes retained source art. Re-export with `python -X utf8 assets/sprites/bosses/main/tay-doc/source/export_assets.py`; it refuses changed existing source bytes. Source image hashes and exact portable paths are retained.

## Scope and remaining review

Requested categories are supplied. No separate map, dedicated arena, portal, minion, equipment drop, boss AI, gameplay change, Phaser/JavaScript edit, loader registration, public asset copy, shared runtime configuration or other boss was produced. Existing boss progression remains Đông Tà → Tây Độc → Nam Đế → Bắc Cái, then Vương Trùng Dương; this main invasion boss grants only EXP/gold under existing rules.

The single final lightweight verification **PASSED** (Python/Pillow inline check, exit0):488 PNG files decoded,448 individual animation frames,112 clips with four distinct cels each,9 warning clips,3 concept sheets and12 portraits/icons. Both phase sets and transition frames exist. Alpha/content, canvas dimensions, atlas bounds, individual-frame/atlas pixel equality, four facings/state coverage, positive durations, portable JSON references and source/export hashes passed with zero reported issues. The result is also in `package_manifest.json` under `staticVerification`. No test suite, screenshot, comparison sheet, recording or runtime server was created.

Asset-level verification cannot establish zero animation jitter, perfect anatomical continuity, final hand-attachment offsets or six-player readability at gameplay zoom. A few wide energy-release poses open toward a three-quarter front view while retaining their principal directional gesture; these need a later motion review. Live Phaser validation is deliberately deferred by the runtime-isolation instruction. No missing requested asset category is concealed by this limit; runtime visual acceptance remains separate.
