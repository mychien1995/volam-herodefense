# M3C1 retained art inventory and runtime mapping

The actual files were audited by `python -X utf8 scripts/audit-m3c1-assets.py`. Full PNG dimensions, alpha mode, atlas bounds, named frames, animation metadata, source/provenance and approval records for **Thiên Sơn, Võ Đang and Thiếu Lâm** are in `docs/evidence/m3c1/asset-inventory.json`. The static `asset-contact-sheet.png` shows actual atlas crops, not generated artwork. Only Thiên Sơn combat is integrated here.

| School | PNG exports audited, including individual character frames | Skill character/VFX components | Combat in this batch |
| --- | ---: | ---: | --- |
| Thiên Sơn | 118 | 20 | Yes |
| Võ Đang | 753 | 20 | No |
| Thiếu Lâm | 852 | 26 | No |

Character exports live under `assets/exports/characters/`; individual frames under `{school}_v01/`; editable sources and provenance under `assets/source/characters/{school}_v01/`. Skill PNG/hash-JSON/animation JSON and icons live under `assets/exports/skills/{school}/`, with editable sources under `assets/source/skills/{school}/`. Concepts and review screenshots are retained separately and never interpreted as sheets.

## Thiên Sơn character and icons

`hero_thien_son.png/json` and `hero_thien_son_dao.png/json` are **800×320 atlases**, each containing forty authored **80×80** frames: four facings × (two idle, four walk, four melee attack). Feet are **(40,64)** / normalized origin **(0.5,0.8)**. Idle frames last350ms; walk120ms; attack75ms. These baseline character bytes were already director approved and remain protected by `assets/approved_thien_son.lock.json`.

There are no separately authored baseline hurt/death frames: the existing manifest aliases idle frames for those states. Baseline generic cast aliases the basic attack; all ten actives now use their dedicated character sheets instead. These aliases remain explicitly limited art, not newly completed hurt/death animations. The supplied counter/flurry/spin tags are used for their corresponding active phases. No new artwork was generated.

Thirteen existing64×64 icons cover ten actives, two basics and Bắc Minh Thần Công. Individual files follow `{id}/icon.png`; the retained icon strip is `thien_son_icons_v01.png/json`. Active icons appear in the skill menu/hotbar, A uses the selected basic icon, and the passive icon appears beside its description. The approved idle PNG supplies the school-selection avatar, live portrait and dungeon-selection avatar.

## Per-skill mapping

All paths below are relative to `assets/exports/skills/thien-son/{id}/`. Every row uses `{id}_character.png/json` and `{id}_vfx.png/json`; ordered frames, dimensions, fps, pivots, scale1 and direction offsets come directly from `production_manifest_v01.json` and the retained `.animations.json` files. No grid dimensions are guessed.

| Skill ID / Vietnamese name | Character tags | Runtime VFX stages |
| --- | --- | --- |
| `lien_hoa_phien` / Liên Hoa Phiến | `cast_*`, `rapid_*` | owner-following `sweep_*`, hit-triggered caster-front `contact_*` |
| `luc_duong_chuong` / Lục Dương Chưởng | `cast_*`, `spin_*` | `gather`, owner-following `spin`, `expiry` |
| `luu_phong_bo` / Lưu Phong Bộ | `cast_*` | owner-following directional `trail_*`, `settle` |
| `chiet_mai_thu` / Chiết Mai Thủ | `cast_*` | wrist/heel activation, owner-following wrist/heel loops, wrist expiry |
| `bach_phien_phong_bao` / Bách Phiến Phong Bạo | `cast_*`, `whirl_*` | `gather`, owner-following `whirlwind`, `expiry` |
| `phi_anh_tram` / Phi Ảnh Trảm | `cast_*` | owner-following `trail_*`, hit-triggered caster-front `slash_*` |
| `truy_hon_dao` / Truy Hồn Đao | `cast_*` | first/second cut on separate authoritative pulses |
| `phong_anh_hoan_vi` / Phong Ảnh Hoán Vị | `cast_*`, event-triggered `counter_*` | step, owner-following ready indicator, expiry; counter reuses supplied step accent |
| `liet_phong_dao` / Liệt Phong Đao | `cast_*` | directional `strike_*`, hit-triggered caster-front `contact_*` |
| `bach_liet_thien_kich` / Bách Liệt Thiên Kích | `cast_*`, `flurry_*`, `finish_*` | coil, owner-following flurry, event-triggered finisher |

`*` means the four authored cardinal facings. Wind assets use cyan/white raster art and never fall back to shared fire impacts. Both basic attacks reuse their approved four-facing character attacks, with existing wind sweep/strike accents. There is deliberately **no Phiến projectile** and no passive aura.

Caster-front placement is taken from the authored metadata even when triggered by a hit at another world position. Completed hits keep their short impact animation when the target dies; owned channels/buffs and pending casts still cancel on death/travel. Opening character clips finish according to their actual frame count/fps before switching to loop phases. New accepted A events restart an already-active basic-attack clip, preventing a frozen final frame when attack cadence is shorter than the server pose; damage pulses never restart character clips.

## Remaining / unused art

- Baseline hurt/death remain idle aliases; independent authored frames are missing. Gameplay death/respawn still uses the authoritative lifecycle.
- No distinct wind projectile is required by these melee abilities. No new projectile artwork or ranged fan mechanic was invented.
- The counter's character retaliation exists; no separately labelled counter-impact VFX is supplied. The existing step accent is reused and disclosed above.
- The optional heel-expiry tag and some short choreography variants remain available in the art-only gallery; the gameplay buff uses wrist expiry and destroys both loops. The icon strip is retained, while runtime DOM icons load individual PNGs.
- Võ Đang / Thiếu Lâm skill sources, exports, concepts, review-only previews and duplicate individual frames are inventoried and otherwise untouched by M3C1.
- Existing arena/dungeon placeholder and art-approval limitations remain. Thiên Sơn skill artwork was explicitly director approved on2026-10-31 (user: “skill artwork approved”). `assets/approved_thien_son_skills.lock.json` records the approved bytes; current `runtime_integration_m3c1.json` records approval. Historical export-time manifests retain their earlier `prototype_pending_final_art_approval` snapshot.
- The required old `vo_dang_art_direction_reference.png` path is absent; the available `vo_dang_character_reference.png` was inspected. Several legacy reference filenames contain duplicated images, so the actual positive world/menu references and current placeholder anti-reference were inspected as well.

The combined M3A runtime registry has41 components,251 animation tags and998 frame references (464 retained Cái Bang +534 Thiên Sơn). Preparation validates both schools' actual PNG/atlas bounds and duplicate tags, then copies retained bytes. No Aseprite regeneration or recording occurs.
