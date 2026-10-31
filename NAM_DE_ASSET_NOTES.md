# Nam Đế — Nhất Đăng Đại Sư asset package v01

Produced 2026-10-31. Stable boss asset ID: **boss_nam_de**. Display name: **Nam Đế — Nhất Đăng Đại Sư (Đoàn Trí Hưng)**.

Asset production only. Concepts automatically approved under the explicit task instruction. Production files are staged asset candidates; runtime loading, motion continuity, normal-zoom art approval and six-player readability remain untested by request. No game code, loader, AI, combat, balance, map, other-boss artwork or public runtime assets were changed. No server/client was started.

## Deliverables

| Item | Repository path |
| --- | --- |
| Master concept: four views, costume details, poses, palette, hero scale | assets/concepts/main-bosses/nam-de/master_concept_v01.png |
| Individual transparent full-character concept | assets/concepts/main-bosses/nam-de/individual_concept_v01.png |
| Production actor sheet | assets/sprites/bosses/main/nam-de/boss_nam_de.png |
| Hash atlas and visual animation clips | assets/sprites/bosses/main/nam-de/boss_nam_de.json; boss_nam_de.animations.json |
| 208 individual character cels | assets/sprites/bosses/main/nam-de/frames/ |
| Skill VFX | assets/effects/bosses/main/nam-de/skills/ |
| Shield and passive VFX | assets/effects/bosses/main/nam-de/defense/ |
| Healing VFX | assets/effects/bosses/main/nam-de/healing/ |
| Ultimate VFX | assets/effects/bosses/main/nam-de/ultimate/ |
| Shared particles, hit and defeat | assets/effects/bosses/main/nam-de/shared/shared/ |
| Boss portraits and skill/status icons | assets/icons/bosses/nam-de/ |
| Inventory, source hashes, references and provenance | assets/sprites/bosses/main/nam-de/package_manifest_v01.json |
| Exact generation prompts and source records | assets/sprites/bosses/main/nam-de/source/generation_jobs_v01.json |
| Offline preparation entry point | assets/sprites/bosses/main/nam-de/source/export_assets_v01.py |
| Single final lightweight verification | assets/sprites/bosses/main/nam-de/asset_verification_v01.json |

**Counts:** 2 concepts; 208 character cels / 52 directional clips; 188 VFX cels / 47 effect clips; 9 distinct 64px portrait/skill/passive icons plus a 256px portrait. Ten atlas packages: one actor and nine VFX. Flattened generated sources are retained in the three source/ folders. No layered Aseprite original is claimed.

## Character frame contract

Untrimmed 160×112 transparent RGBA canvases, feet pivot (80,88), normalized origin (0.5,0.7857142857142857), approximately 56px standing body height, nearest sampling. The wider canvas clears palms, fingers, beard and ultimate gestures without increasing body scale. Atlas rectangles, rather than source-sheet grid assumptions, define production frames.

Frame key: {action}_{direction}_{0..3}. Animation key: boss_nam_de_{action}_{direction}. Directions: down/front, up/back, left and right. All 13 actions have four independently drawn source cels in each direction:

| Action | Visual playback proposal per cel | Playback |
| --- | --- | --- |
| idle | 300 ms | loop |
| walk | 140 ms | loop |
| palm_attack | 100 ms | once |
| finger_charge | 100 ms | once |
| finger_release | 100 ms | once |
| rapid_fingers | 100 ms | once |
| pressure_point | 100 ms | once |
| defensive_stance | 100 ms | once / hold final pose when later integrated |
| healing_meditation | 100 ms | once |
| ultimate_charge | 180 ms | once |
| ultimate_release | 100 ms | once |
| hurt | 100 ms | once |
| death | 140 ms | once |

These are presentation timings only. They define no attack startup, hit event, heal amount, defense magnitude, crowd-control rule, cooldown or server duration. Animation metadata explicitly contains no authoritative hit events.

The original up-facing request returned front-facing cels and is retained as a rejected source, never used as back-facing art. The corrected actor_up_a_v02 supplies rear movement/attacks. Refined idle source rows were mapped by actual content: down, up, right, left. A dedicated four-cel right defensive source replaces the original sheet's clipped top row. Unused original idle/defense poses remain in retained sources.

Extraction uses whole connected actor cels, shared scale per source group, crisp alpha cleanup, feet-support alignment and padded output canvases. It does not manufacture walks/attacks by moving or rotating a static idle. Fixed export anchors are not proof of runtime jitter-free motion.

## Skill-to-VFX mapping

Each folder below is relative to assets/effects/bosses/main/nam-de/. Each contains vfx_{skill_id}.png, vfx_{skill_id}.json, vfx_{skill_id}.animations.json and frames/{effect}_{0..3}.png. Animation keys are vfx_{skill_id}_{effect}. Exact paths and all groups are also machine-readable in package_manifest_v01.json -> skillVfx.

| Display name / stable skill ID | Character action | Folder and effect groups |
| --- | --- | --- |
| Phật Môn Chưởng / phat_mon_chuong | palm_attack | skills/phat_mon_chuong/: palm_trail, palm_impact, palm_shockwave |
| Nhất Dương Chỉ / nhat_duong_chi | finger_charge, finger_release | skills/nhat_duong_chi/: fingertip_charge, line_warning, concentrated_beam, finger_impact, ground_sparks |
| Liên Hoàn Nhất Dương Chỉ / lien_hoan_nhat_duong_chi | rapid_fingers | skills/lien_hoan_nhat_duong_chi/: rapid_projectile, fingertip_flash, directional_warning, rapid_impact |
| Đại Lý Phong Huyệt / dai_ly_phong_huyet | pressure_point | skills/dai_ly_phong_huyet/: sealing_projectile, pressure_impact, immobilization_symbol, stun_status, slow_status, pressure_warning |
| Kim Cang Hộ Thể / kim_cang_ho_the | defensive_stance | defense/kim_cang_ho_the/: protective_aura, circular_shield, shield_activation, armor_highlights, shield_hit, shield_absorption, shield_expiration, shield_warning |
| Phật Quang Phổ Chiếu / phat_quang_pho_chieu | healing_meditation | healing/phat_quang_pho_chieu/: rising_light, ground_formation, healing_particles, radial_shockwave, meditation_aura, healing_completion, healing_warning |
| Nhất Dương Quy Tông / nhat_duong_quy_tong | ultimate_charge, ultimate_release | ultimate/nhat_duong_quy_tong/: ultimate_gather, ultimate_aura, multiline_warning, ultimate_beam, sequential_impact, expanding_shockwave, ultimate_completion |
| Kim Thân Bất Hoại / kim_than_bat_hoai | separate passive layer | defense/kim_than_bat_hoai/: permanent_body_aura, armor_impact, resistance_indicator, struck_flash |
| Shared | hurt / death and separate energy layers | shared/shared/: gold_energy_particles, boss_hit, boss_defeat |

Examples of exact projectile and warning paths:

- assets/effects/bosses/main/nam-de/skills/nhat_duong_chi/frames/concentrated_beam_0.png
- assets/effects/bosses/main/nam-de/skills/nhat_duong_chi/frames/line_warning_0.png
- assets/effects/bosses/main/nam-de/skills/lien_hoan_nhat_duong_chi/frames/rapid_projectile_0.png
- assets/effects/bosses/main/nam-de/skills/dai_ly_phong_huyet/frames/sealing_projectile_0.png
- assets/effects/bosses/main/nam-de/ultimate/nhat_duong_quy_tong/frames/multiline_warning_0.png
- assets/effects/bosses/main/nam-de/ultimate/nhat_duong_quy_tong/frames/ultimate_beam_0.png

Warnings use the dedicated telegraphs source: dark-edged broken amber lines/rings and visibly open safe gaps. Solid white-gold beam cores belong to active attacks. Active shields use faceted shells; healing uses ivory-gold lotus, upward particles and shallow ground formations. Passive aura is separate from the temporary shield and does not imply invulnerability.

VFX use 160×160 canvases and center pivot (80,80); ultimate uses 192×192 and (96,96). All have four cels, default 100ms per cel; warning clips use 120ms. Protective aura, circular shield, meditation aura, permanent body aura, stun and slow visuals loop. Other clips play once. Preserve source partial alpha for shield/energy translucency; near-invisible matte is removed. Actor/icon edges use crisp binary alpha.

Direction-bearing projectiles, beams and palm trails use canonical screen-right artwork. Future presentation may orient them using an authoritative launch vector. No tracking or targeting behavior is implemented. Multiline warnings are pattern art; safe gaps are visually empty, not authoritative collision data. Later implementation should align warning geometry and beam lanes to server events.

Ground formations/warnings/shockwaves should render beneath actors. Body shields/aura center approximately 28px above feet; overhead status should sit above a victim's head, with slow rings around feet. These are handoff placement proposals, not loader registration or gameplay implementation. Composite sparingly so six-player combat remains legible.

## Portraits and icons

assets/icons/bosses/nam-de/ contains portrait_nam_de.png (64px), portrait_nam_de_256.png, phat_mon_chuong.png, nhat_duong_chi.png, lien_hoan_nhat_duong_chi.png, dai_ly_phong_huyet.png, kim_cang_ho_the.png, phat_quang_pho_chieu.png, nhat_duong_quy_tong.png and kim_than_bat_hoai.png. Phật Quang's lotus icon is the supplied healing status icon. All are original raster art with transparent exterior margins and dark/gold framing.

## Provenance and verification boundary

Built-in image_gen produced the original raster artwork from this task's brief and inspected repository references. Exact prompts, generated filenames, request times, source rectangles, scales and SHA-256 hashes are retained. No third-party sprite pack, proprietary game art, external license or exclusive copyright is claimed.

Read AGENTS.md, ART_ASSET_GUIDE.md, GAME_DESIGN.md, CONTENT_DATA.md, DECISIONS.md, ART_DIRECTION_REFERENCE.md, ART_PRODUCTION_STANDARD.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md, UI_UX_SPEC.md and the art iteration workflow. Inspected actual approved hero exports, arena/dungeon creeps, Chu Bá Thông, Đông Tà, Tây Độc and main arena ground. Reference paths/hashes are in the package manifest. assets/references/README.md identifies vo_dang_character_reference.png as the missing old art-direction alias's replacement. The misleading dashboard anti-reference filename contains a character sheet; actual image contents were used.

Offline preparation reuses the retained Đông Tà export helper definitions without executing its actor/effect export calls or changing any Đông Tà files. It writes only Nam Đế directories. Re-export command: python -X utf8 assets/sprites/bosses/main/nam-de/source/export_assets_v01.py.

One lightweight final check verifies requested-category existence, PNG decoding/alpha/dimensions, hashes, atlas rectangles and matching individual cels, animation references and distinct frame pixels. No Phaser run, gameplay tests, comparison sheets, screenshots or recordings were created.

**Missing requested production asset categories: none.** Live animation/transition/readability validation and integration remain outside this task's scope; production candidates are not falsely labeled runtime-approved.

