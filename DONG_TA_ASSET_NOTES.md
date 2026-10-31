# Đông Tà — Hoàng Dược Sư asset package v01

Produced 2026-10-31. **Asset production only.** No Phaser launch/integration, gameplay/AI/summon changes, maps, portals, other main bosses, or recordings.

Concepts are automatically approved by the explicit task instruction. Production PNGs are staged candidates, not runtime-approved art. Asset-level verification is recorded in assets/sprites/bosses/main/dong-ta/asset_verification_v01.json.

## Contents and paths

| Deliverable | Path | Contents |
|---|---|---|
| Boss concepts | assets/concepts/main-bosses/dong-ta/ | master_concept_v01.png; individual_concept_v01.png: four views, sword, poses, palette, hero/boss scale |
| Boss sprites | assets/sprites/bosses/main/dong-ta/ | boss_dong_ta.png, hash JSON atlas, animation JSON, frames/, retained source/ |
| Mai Siêu Phong concept | assets/concepts/summons/mai-sieu-phong/master_concept_v01.png | four views, claw detail, attack/cast poses, palette |
| Mai Siêu Phong sprites | assets/sprites/summons/mai-sieu-phong/ | summon_mai_sieu_phong.png, atlas/animation JSON, frames/, source/ |
| Hoàng Dung concept | assets/concepts/summons/hoang-dung/master_concept_v01.png | four views, staff, support/evade poses, palette |
| Hoàng Dung sprites | assets/sprites/summons/hoang-dung/ | summon_hoang_dung.png, atlas/animation JSON, frames/, source/ |
| Boss effects | assets/effects/bosses/main/dong-ta/ | seven named skill folders with individual cels, atlas and animation JSON |
| Summon effects | assets/effects/summons/mai-sieu-phong/; assets/effects/summons/hoang-dung/ | separate combat effect atlases, individual cels and animation JSON |
| Portraits/icons | assets/icons/bosses/dong-ta/; assets/icons/bosses/summons/ | 19 distinct 64px portraits/skill/summon icons, plus a 256px Đông Tà portrait |
| Inventory/provenance | assets/sprites/bosses/main/dong-ta/package_manifest_v01.json | paths, dimensions, pivots, animation groups, SHA-256, provenance/status |
| Exact prompts | assets/sprites/bosses/main/dong-ta/source/generation_jobs_v01.json | all built-in image_gen prompts, source paths and retained correction attempts |
| Offline exporter | assets/sprites/bosses/main/dong-ta/source/export_assets_v01.py | PNG/JSON preparation only; no runtime writes |

432 individual character cels / 108 animation groups, plus 164 VFX cels / 41 effect groups. Every group has four authored cels. No idle transforms or concept crops are used to invent combat/walk poses.

## Character animations

All three characters have down/up/left/right facings. Source sheets are retained; production atlases contain explicit, untrimmed frame rectangles.

- Đông Tà: idle, walk, basic_sword_combo, finger_cast, sword_flurry_cast, force_wave_cast, dash, summon_cast, ultimate_cast, hurt, death. 176 cels / 44 groups.
- Mai Siêu Phong: idle, walk, claw_attack, dash_attack, pull_cast, poison_skull_throw, hurt, death. 128 cels / 32 groups.
- Hoàng Dung: idle, walk, basic_strike, support_cast, healing_cast, evade, hurt, death. 128 cels / 32 groups.

| Character | Frame canvas | Feet pivot (pixels) | Approximate standing height |
|---|---|---|---|
| Đông Tà | 160 × 112 | 80, 88 | 56 px |
| Mai Siêu Phong | 112 × 96 | 56, 72 | 44 px |
| Hoàng Dung | 112 × 96 | 56, 72 | 44 px |

Nearest-neighbor exports, binary alpha, fixed feet canvas and shared scale per source sheet. Wider transparent boss canvas clears extended sword poses without enlarging the body. Dedicated side-combo and circular/ultimate cast source groups replace omitted/overlapping original groups. Circle sheet's last two visual facings were mapped by actual image content. Unused original source poses remain historical sources and are not aliases for missing production animations.

Proposed visual timing: idle 250 ms/cel, walk 120 ms/cel, attacks/casts/hurt 90 ms/cel, death 140 ms/cel. Idle/walk loop; action/death clips play once. VFX default 100 ms/cel; selected aura/field loops are declared in metadata. These timings do not specify combat timing.

## Skill-to-VFX mapping

Boss effects below live under assets/effects/bosses/main/dong-ta/{skill_id}/. Each listed effect is its own four-cel animation in that folder's animation JSON.

| Skill / display name | Character action | Effect groups |
|---|---|---|
| ta_kiem_lien_kich — Tà Kiếm Liên Kích | basic_sword_combo | sword_slash, melee_impact, followup_strike |
| dan_chi_than_cong — Đàn Chỉ Thần Công | finger_cast | finger_projectile, finger_trail, finger_impact, finger_warning |
| lac_anh_kiem_phap — Lạc Anh Kiếm Pháp | sword_flurry_cast | cone_warning, blossom_slash_wave, sword_fan_wave, blossom_impact |
| ngoc_tieu_hoi_phong — Ngọc Tiêu Hồi Phong | force_wave_cast | radial_warning, expanding_force_wave, force_impact, force_cast_gather |
| dao_anh_di_hinh — Đảo Ảnh Di Hình | dash | dash_start, afterimage_right, dash_arrival, dash_followup_strike |
| trieu_hon_dong_hai — Triệu Hồn Đông Hải | summon_cast | summon_circle, summon_column, mai_spawn, hoang_spawn |
| dao_hoa_loan_anh_tran — Đào Hoa Loạn Ảnh Trận | ultimate_cast | ultimate_warning, sword_formation, ultimate_projectile_fan, ultimate_impact; reuse afterimage_right and blossom_slash_wave as separate layers |

Summon effects below live in their corresponding assets/effects/summons/{character}/ folder.

| Character / skill | Character action | Effect groups |
|---|---|---|
| Mai Siêu Phong — Bạch Cốt Trảo | claw_attack | claw_trail |
| Mai Siêu Phong — Ma Ảnh Tróc Hồn | dash_attack | dash_claw_trail |
| Mai Siêu Phong — Âm Phong Hấp Lực | pull_cast | pull_tendrils, suction_field |
| Mai Siêu Phong — Độc Cốt Bạo | poison_skull_throw | poison_skull_projectile, poison_skull_explosion, poison_splash |
| Hoàng Dung — Linh Động Kích | basic_strike | light_strike |
| Hoàng Dung — Bích Ba Hộ Thể | healing_cast | heal_aura, protection_shell |
| Hoàng Dung — Linh Xà Bộ | evade | movement_trail |
| Hoàng Dung — Thanh Âm Hộ Trợ | support_cast | support_circle, buff_pulse |
| Hoàng Dung — Đào Hoa Trấn Khí | healing_cast (explicit pose reuse) | blossom_protection_burst, protection_shell |

Warnings are thin amber dashed outlines, distinct from jade/ivory/pink active boss effects. Mai uses violet claws/suction and lime poison; Hoàng uses mint/jade/pink with gold accents. Summon-circle ornament is a cast effect, not a travel portal.

## Later integration notes

- Use supplied atlas rectangles, frame keys and animation metadata rather than slicing concept art or assuming source grid dimensions. Original source row spacing varies.
- Anchor actor Y-depth at the listed feet pivot; alpha padding is not a collision footprint. Use nearest filtering and avoid noninteger visual scaling.
- Effects use 160 × 160 canvases with center pivot (80,80). Right-facing traveling effects declare direction in metadata; the future presentation layer may orient them to a server-provided launch vector. They do not track targets.
- Ground telegraphs/auras belong under actors; impacts/projectiles/afterimages can use appropriate overlay depth. Prefer restrained concurrent layers, especially for the ultimate.
- Apply the afterimage layer separately from the authoritative actor sprite. Reuse summon spawn VFX for the two specific allies only.
- Server events must control movement, hits, damage, push/pull, poison, healing, buffs, spawn timing and results. Animation JSON has no authoritative hit events.
- No loader, registry, public-assets copy, game-data content, AI or skill logic was changed.

## Provenance and verification limits

Original built-in image_gen raster artwork from this task's brief and inspected repository references. No third-party sprite pack or proprietary game pixels were copied. No exclusive copyright claim. Editable originals are flattened source PNGs; layered Aseprite sources are not claimed.

Inspected required guides: AGENTS.md, ART_ASSET_GUIDE.md, GAME_DESIGN.md, CONTENT_DATA.md, DECISIONS.md; also ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md and UI_UX_SPEC.md. Inspected the mandatory quality anti-reference, documented Võ Đang replacement reference, approved Võ Đang concept/native sprite, arena creep and dungeon-creep art, Chu Bá Thông dungeon-boss/native frame and main arena ground. The obsolete vo_dang_art_direction_reference.png alias is absent; assets/references/README.md identifies vo_dang_character_reference.png as its actual replacement. The misleading dashboard anti-reference filename contains a character concept; actual file contents were followed.

Production preparation uses real source cels, whole-actor component crops, shared source scale, nearest resampling, binary alpha and fixed canvases. Near-zero-alpha RGB matte artifacts and soft haze are excluded from exports; original source bytes and earlier cleanup attempts are retained.

No requested asset category is blocked or omitted. Asset-only checks cover file existence, PNG decoding, alpha/content, atlas/clip references and folder organization. Live motion continuity, transitions, six-player readability, normal-gameplay zoom approval and Phaser loading remain deliberately untested, per this task's scope. Fixed export anchors are not a claim of runtime motion approval.
