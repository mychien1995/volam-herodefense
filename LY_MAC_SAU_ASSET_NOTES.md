# Lý Mạc Sầu — asset-only handoff

Produced 2026-10-31 with built-in image_gen. Concepts are automatically approved by the explicit task instruction. Production PNGs are staged asset candidates. Nothing is registered, copied into public runtime folders, integrated, or verified in Phaser. No game code, AI, combat logic, tests, or recordings were added.

## Package inventory

| Package | Repository path | Contents |
|---|---|---|
| Boss concepts | `assets/concepts/bosses/ly-mac-sau/` | Master sheet, individual turnaround/pose/palette/scale sheet, Âm binh concept |
| Boss production | `assets/sprites/bosses/ly-mac-sau/` | 128 transparent individual frames, PNG/hash-JSON atlas, animation metadata, static contact sheet, source artwork |
| Summon production | `assets/sprites/summons/co-mo-am-binh/` | 64 transparent individual frames, atlas, animation metadata, static contact sheet, source artwork |
| Skill effects | `assets/effects/bosses/ly-mac-sau/` | 23 four-frame sequences / 92 transparent frames, atlas, animation metadata, static contact sheet, sources |
| Arena concepts/layout | `assets/concepts/arenas/co-mo-phai/` | Overview, layout guide JSON, static assembly of actual exported assets |
| Arena production | `assets/sprites/environment/co-mo-phai/` | 16 transparent props, prop atlas, 16 individual 32px terrain tiles, tileset PNG/JSON/TSJ, source sheets |

Package provenance, file hashes, skill mapping and verification: `assets/sprites/bosses/ly-mac-sau/package_manifest_v01.json`, `skill_asset_map.json`, and `verification_v01.json`. Exact built-in prompts are in `source/generation_prompts_*.json`; portable source inventory is `source/generation_jobs_v01.json`. Export recipe: `source/package_assets.py`; individual source rectangles/scales/anchors: `source/extraction_recipes_v01.json`. Source PNGs are flattened generated raster artwork, not layered Aseprite files. No external sprite pack was used or copied; no exclusive copyright claim is made.

## Boss and summon animation contract

Both characters have `down`, `left`, `right`, `up` facings. Filenames are `{state}_{direction}_{index}.png`; actual atlas rectangles and durations are in `atlas.json` / `animations.json`. All listed frames are authored raster poses, not translated/rotated duplicates. Body art is scaled once per source/action family with nearest sampling; per-pose fit-scaling is not used. Ground pivots are normalized during extraction.

Boss canvas **144×128**, feet **(72,104)**, normalized origin **(0.5,0.8125)**, approximately **56px standing body**, compared with the retained approximately44px hero baseline. Each facing includes:

| State | Frames | Suggested duration per frame |
|---|---:|---:|
| `idle` | 2 | 350ms |
| `walk` | 4 | 110ms |
| `basic_attack` | 4 | 90ms |
| `needle_cast` | 4 | 140ms |
| `palm_channel` | 4 | 220ms |
| `fast_sweep` | 4 | 70ms |
| `summon_cast` | 4 | 180ms |
| `hurt` | 2 | 130ms |
| `death` | 4 | 180ms |

The generic cast/channel need is covered by `palm_channel`; hold frame1 and release frame2 only as a suggested presentation convention. Needle release has its own poses. The low-HP variant uses a separate activation VFX rather than a duplicate recolored body set. Idle/walk loop; other states are one-shots.

Summon canvas **112×112**, feet **(56,88)**, origin **(0.5,0.785714)**, approximately **44px body**. Each facing has `idle`2×350ms, `walk`4×120ms, `basic_attack`4×95ms, `hurt`2×130ms, `death`4×180ms. Death retains visible final spirit fragments; remove the actor after presentation completes. Spawn uses the separate `co_mo_spawn` effect.

## Skill artwork bindings

All effect cels are **160×160**, origin **(80,80)**. Suggested100ms/cel; durations are visual defaults, not gameplay timings. `assets/effects/bosses/ly-mac-sau/frames/{effect}_{0..3}.png` and the effect atlas contain:

| Mechanic | Boss animation | Effect groups |
|---|---|---|
| Băng Phách Ngân Châm | `needle_cast_{direction}` | `needle_projectile`, `needle_spread`, `needle_aoe_warning`, `needle_poison_impact`, `poison_status`, `hp_drain`, `chilling_slow` |
| Xích Luyện Chưởng | `palm_channel_{direction}` | `palm_charge`, `palm_lane_warning`, `palm_projectile`, `palm_impact` |
| Phất Trần Công | `fast_sweep_{direction}` | `sweep_cone_warning`, `duster_sweep_trail`, `melee_impact` |
| Cổ Mộ Kiếm Pháp | `summon_cast_{direction}` | `co_mo_sigil`, `co_mo_spawn`; summon actor `summon_co_mo_am_binh` |
| Basic phất trần | `basic_attack_{direction}` | `basic_hit` |
| Ngũ Độc Chưởng,25% HP | activation overlay on existing actor | `phase_two_activation`, `edge_warning`, `edge_emission`, `ngu_doc_projectile`, `ngu_doc_impact` |
| Defeat | `death_{direction}` | `defeat_burst` |

Projectile and directional warning art uses canonical **screen-right**. Later presentation can orient it to the authoritative launch vector. Emitters and warning arrows face inward from the selected boundary. Do not infer targets, random selection, slow strength, poison drain, damage, hitboxes, collision, speed, HP threshold logic, or attack release from animation frames. Attach palm charge to the acting hand, sigil/slow warnings to the ground, status/drain to the affected actor, and impact to the authoritative impact position. Warning shapes and bright arrow teeth distinguish danger from decorative magic.

## Cổ Mộ Phái arena

The arena is a cave martial school with cool slate floor, faded crimson cloth, jade lamps and distinct male/female founder statues. Static `layout_asset_assembly_1x.png` is assembled from these exports; it is **not a game screenshot or a playable map**. The overview is illustrative composition; its tiny character figures must not be cropped into sprites or used as weapon model references.

`layout_guide.json` proposes40×30 tiles /1280×960 logical pixels. Keep the28×18-tile central combat area and three-tile perimeter firing/dodge lanes clear. Statues/altar stay on the north decorative band; entrance/exit stays south. Proposed edge cue positions are visual guides only. Final navigable map, tile transitions, collision, occlusion splits, spawn markers and exit behavior are for the separate integration phase.

Sixteen props: `male_founder_statue`, `female_founder_statue`, `tomb_school_arch`, `altar`, `lotus_pillar`, `faded_banner`, `jade_lantern`, `sword_rack`, `cave_wall_horizontal`, `cave_wall_vertical`, `cave_corner`, `stalagmites`, `stone_bench`, `funerary_urn`, `plum_vase`, `cave_rubble`. Props use192×192 canvases/feet(96,168); full statues are approximately110px tall. Ground tiles are32×32: four slab variants, four bedrock variants, damp/moss/fractured/dust variants, lotus engraving and three border motifs. Terrain provides authored candidate tiles; exact seam continuity and automatic transition masks are not certified.

## Asset-only review and remaining limits

Static source and export contact sheets were visually inspected. Wide basic attacks/sweeps use replacement source sheets; inconsistent left windup/recovery poses were replaced with corresponding authored left-facing sweep poses, and up basic recovery uses an authored up idle pose. The two opaque wide-sheet attempts are retained as superseded sources and excluded from all production exports. A few channel/summon cels turn toward the viewer during the gesture; these are visible in the sheets and need a directional motion review during later integration. Some sweep contacts carry a small crimson trail in the character art as well as the separately supplied VFX.

Export canvases have transparent padding and fixed declared feet; this does not establish zero animation jitter or final motion quality. Tile seams, generated costume/shape continuity, hand attachment offsets, four-direction transitions and normal-zoom six-player readability remain for the explicitly separate integration/art review. No live playback, Phaser acceptance, final runtime art approval, or audio package is claimed. These limits do not authorize integration in this task.

The final lightweight asset-only check validates file presence, PNG integrity, nonempty transparent exports, atlas rectangles/frame equality, animation references/distinctness and folder inventory. Its actual result is retained in `verification_v01.json`.
