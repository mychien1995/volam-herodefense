# ART-01 arena and compact HUD production breakdown

Prepared 2026-10-30 before asset production. Scope: arena presentation only. Runtime director approval is pending.

## Audit and scale

Reviewed AGENTS, DECISIONS, GAME_DESIGN, CONTENT_DATA, COMBAT_SYSTEM, BALANCING, ITEMS_AND_CRAFTING, ART_DIRECTION_REFERENCE, ART_ASSET_GUIDE, ART_PRODUCTION_STANDARD, CODEX_ART_QUALITY_RESCUE_TASK, UI_UX_SPEC, CODEX_UI_REFACTOR_TASK, TECHNICAL_ARCHITECTURE, ROADMAP, ACCEPTANCE_TESTS, OPEN_QUESTIONS and CODEX_START_HERE. The current task supersedes the historical M0-first instruction.

Approved character exports/source remain byte-locked by `assets/approved_cai_bang.lock.json`: 80×80 canvas, approximately 44px body, feet (40,64), scale 1 logical pixel, camera zoom 1, existing integer display scale. No character repaint or animation replacement.

Current world: `arena-scene.ts` loads the map ground/terrain tiles, `presentation/statue_study.png`, `merchant_stall.png`, `dungeon_gate.png`, `lantern.png`, `bamboo.png` and `scenery/tree.png` through `art.ts`. These are rejected procedural raster placeholders. `creep_outlaw` and fire VFX are separate remaining placeholders. HUD uses DOM/CSS frames and `icons.png`; values bind to Colyseus state in `ui.ts`.

Installed tools: Phaser 4.2.1, @colyseus/sdk 0.18.8; Aseprite 1.3.18.6 at the standard Program Files location. CLI --batch, --script, --sheet, --data, --split-layers and --list-tags verified by execution. Image generation will provide original surfaces/props; Aseprite will assemble explicit reconstructed layers, organize animation and export PNG/JSON. Importing a concept cannot recover its original layers.

Map remains 1600×1152. Authoritative statue marker is (800,576), spawn (800,680); west/east lanes remain open. Three trunk collisions are (668,632,24,18), (1108,722,24,18), (828,402,24,18); north wall (480,280,640,24). M1 has no statue body/health or water collision. Presentation must not invent those rules. Water is shallow decorative garden water on otherwise traversable ground; bridge surfaces cannot create a new traversal barrier. Statue will remain centered on its marker, with a narrow plinth and disclosed non-solid M1 status. No client-only obstacle or relocated gameplay entity.

## Art readout and references

Primary requested references: `clean-arena-concept.png`, `arena-concept-1.png` (user corrected filename), `current-build.png`. Positive concepts use warm irregular radial stone, dense jade bamboo, cyan cascading water, rose blossoms, scarlet banners, amber lantern light and a masculine martial-artist stone silhouette. Preserve broad horizontal approaches and vertical stairs. Approved Cái Bang sprite determines prop scale: lantern approximately half hero height, trees 2–3 bodies tall, statue approximately 2 bodies tall. World is elevated orthographic, never a diamond grid.

Mandatory historical world/school/menu references also inspected; see review evidence. `vo_dang_art_direction_reference.png` is absent; existing `vo_dang_character_reference.png` is the available direction sheet. `current_codex_dashboard_anti_reference.png` actually contains a Võ Đang reference sheet; current-build and the 2026-10-29 anti-reference provide actual rejected-runtime evidence.

## Production register

Source root S = `assets/source/arena_art01/`; runtime root R = `assets/exports/arena_art01/`. Every row begins PLANNED, not produced/integrated/verified/approved. Machine-readable final dimensions, paths, frames, hashes and status will be in `assets/arena_art01.manifest.json` after export.

| Stable ID / purpose | Reference and provenance | Intended logical dimensions / scale | Motion and source layers / alpha / pivot | Collision and occlusion | Source → runtime; initial status |
|---|---|---|---|---|---|
| arena_ground / grass, natural ground, straight paths, transitions, circular paving, stone details | clean arena, original generated reconstruction with unobscured ground | central composition approximately 960×640; native 1×; map extension uses authored ground patches | static; paving, grass, path-edge layers; opaque; top-left | below all actors; no new collision | S/arena_ground.aseprite → R/arena_ground.png; PLANNED |
| garden_banks / stream banks, shoreline, rocks, flowers, shrubs | clean arena, original generated garden components | approximately 160–240×120–200 each; 1× | static; bank, flowers, rock detail; alpha; bottom-center | decorative shallow water; no new blocking geometry | S/garden.aseprite → R/world.png+json; PLANNED |
| statue_male / clearly male martial artist | clean arena; separately generated sculpture | approximately 96×120; 1× | static; sculpture independent from plinth; transparent; bottom-center | marker (800,576); foot Y-depth; non-solid existing M1 marker disclosed | S/statue.aseprite → R/world.png+json; PLANNED |
| statue_pedestal / plinth and steps | clean arena; separate original reconstruction | approximately 96×32; 1× | static; pedestal, steps; alpha; bottom-center | base at authoritative marker; no client collider | S/statue.aseprite → R/world.png+json; PLANNED |
| lantern / stone lantern and flame | clean arena; original generated prop | approximately 24×48; 1× | static housing; separate flame-loop frames, 120–160ms; alpha; feet | decorative and Y-sorted | S/props.aseprite + S/ambient.aseprite → R/world + R/ambient atlases; PLANNED |
| red_banner / pole and scarlet fabric | clean arena; original generated prop | approximately 32×80; 1× | pole plus cloth layers; only claim motion if frames authored; alpha; foot | decorative, feet sort | S/props.aseprite → R/world atlas; PLANNED |
| bamboo / bamboo grove | clean arena; original generated prop | approximately 72×112; 1× | static; base and separate foreground leaves; alpha; bottom-center | decorative; never an invisible blocker | S/foliage.aseprite → R/world atlas; PLANNED |
| tree_jade, tree_blossom / two foliage silhouettes | clean arena; original generated props | approximately 112×144, 120×128; 1× | trunk/base and canopy layers; alpha; foot | trees at existing three trunk collisions; feet Y-sort; foreground canopy separate if needed | S/foliage.aseprite → R/world atlas; PLANNED |
| bridge / wood bridge, railing, stairs | clean arena; original generated prop | approximately 128×64; 1× | walkable deck below actors; front rail separate alpha layer | existing walkable area; rail visual only; no fake travel | S/garden.aseprite → R/world atlas; PLANNED |
| garden_water / stream, pool, waterfalls, foam | clean arena; original generated surface and separate loop accents | approximately 160×128; 1× | water under bank; foam/ripples animation separate; transparent accents | presentation timing only; shallow decorative water | S/ambient.aseprite → R/ambient.png+json; PLANNED |
| hud_panel, portrait_frame / compact player panel | small HUD reference; original generated frame art | panel responsive ~22% viewport; frame 48–64px logical display | static empty ornament, live DOM name/values; alpha corners; top-left | inside viewport only, input capture | S/hud.aseprite → R/hud atlas + individual PNGs; PLANNED |
| hud_hp, hud_mp, hud_exp / live meter textures | small HUD reference; original generated strips | stretch center horizontally only; readable 10–12px text | static artwork; live authoritative fill clipping; no baked sample values | non-interactive | S/hud.aseprite → R/hud atlas; PLANNED |
| hud_settings, hud_quit, hud_dungeons, hud_merchant, hud_pvp / utility icons and frame | small HUD reference; original generated icons | five 40–56px click targets, group ~20% viewport | static alpha art; DOM labels; hover/focus selection | existing menus; quit really leaves; settings exposes existing controls | S/hud.aseprite → R/hud atlas/PNGs; PLANNED |
| hud_bag, hud_potion_hp, hud_potion_mp, hud_coin / inventory art | small HUD reference; original generated icons | cluster ~16% viewport | static alpha; potion artwork produced but slots disabled/absent because M1 has no quick-item backend | no fake counts or consumption | S/hud.aseprite → R/hud atlas/PNGs; PLANNED |
| hud_staff, hud_palm, hud_fire_burst, hud_fire_explosion / actual A,Q,W icons | CONTENT_DATA and equipped M1 skills; original generated icons | bar ~26% viewport, five consistent slots | static alpha; A switches staff/palm; Q triple fire shot; W explosive fire; E/R empty | keyboard A/QWER preserved; no invented rank values | S/hud.aseprite → R/hud atlas/PNGs; PLANNED |
| hud_slot, hud_key, hud_selected, hud_disabled / slot and state artwork | small HUD reference; original generated frame and overlays | ~48–64px slot; key 16px | static frame art, live DOM cooldown clipping/numbers; alpha | cooldown from server; unavailable based on mana/HP/equipped state | S/hud.aseprite → R/hud atlas/PNGs; PLANNED |

## Remaining visuals outside replacement

`creep_outlaw`, fire projectile/impact, staff swing arc, cast/hurt/death fallback character poses, destination preview cards and non-ART-01 map outskirts remain prototype placeholders. No production status or full-game polish claim applies to those. No additional schools/dungeons/world expansion before runtime director approval.

## Verification plan

Run Aseprite source/export metadata validation; approved-character hashes; typecheck, unit/integration tests, build, asset verification; actual Chromium two-context gameplay with Arrow/A/QWER and menu input suppression. Capture 954×458 (provided current screenshot size), 1280×720, 1920×1080. Inspect normal gameplay, inventory, utility overlays, motion frame strips, tree occlusion, collision and synchronized movement. Record exact results and deficiencies in a separate runtime review. Director approval stays PENDING.
