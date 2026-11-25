# M4D — native ground surfaces, anchored torches and Thất Tinh Kiếm

Follow-up to the director's R2 screenshots, 2026-11-25. This supersedes R2's whole-map floor presentation and detached ambient fire placement. Selected arena identities remain DH-B, TD-B and TH-B.

## Ground density

R2 underlays contained about 1480 pixels across a 1600-world-unit arena. At gameplay zoom 2, one source pixel occupied more than two display pixels. Nearest sampling and a sharper whole-map redraw could not recover native detail comparable to the actors.

The replacement uses authored repeatable material fills and three independent native-density plaza sprites, retaining the original shoreline/landscape composition underneath:

| Surface | Native pixels per world unit |
| --- | --- |
| Stone, wood, retained original grass material | 3.5 before composing at 2 pixels/world |
| DH plaza, 1361×1118 across 680×550 world units | 2.001×2.033 |
| TD plaza, 1374×1124 across 680×560 world units | 2.021×2.007 |
| TH plaza, 1335×1117 across 610×512 world units | 2.189×2.182 |

The existing material quilt helper registers repeat fills in world space. Stone/wood/grass masks derive from the retained ground colors and registered floor geometry; TH explicitly excludes pond water and preserves bridge corridors. Static materials are composed once into one native-density texture per arena, with separate plaza art above it. Water stays below those land/plaza surfaces; original landscape details remain protected by masks. Shadows and lighting apply above the floor layers. The entire surrounding illustration is not claimed to be a newly authored tilemap or a native 4K redraw.

Plazas use registered planar floor extents, independent from foot-sorted props. Actor PNGs, actor sampling, body scale, camera zoom, prop feet and authoritative collision are unchanged. The QA comparison checks identical actor textures/scales/filters and camera framing within one world unit. `groundDetail=off` is a comparison-only query, not a player menu setting.

Art route: built-in image generator (`host_image`). [Exact prompts and rejected attempts](../assets/source/m4d-arena-v03/generation.json), [exports, source hashes, dimensions and density](../assets/exports/m4d/r3/manifest.json). Three alpha plaza packs pass extraction with zero warnings. Source PNGs and earlier M4D exports remain intact.

An initial independently redrawn quadrant was sharper but changed tile registration at joins. It was rejected after a live two-client slice. The runtime uses the material/plaza composition instead; neither rejected quadrant is loaded or shipped as a current floor texture.

## Tương Dương fire and water

Remove the eight detached ground-flame instances, their rising embers and the extra flame-atlas loader. Animate only flame pixels already present inside two watchtower braziers and two war-banner braziers. Masks are measured in the retained prop source coordinates; their render positions follow each source's scale, anchor, depth and visibility. No standalone ground-fire locations remain.

Tương Dương's peripheral stream pixels now join the cached UV-flow animation. Color/region masks avoid plaza stones, and fixed land surfaces render above the water animation so old water-source samples cannot soften the new paving. DH streams and TH pond/independent lotus motion remain in use. These are parameterized pixel/frame effects, not a newly painted full-scene video loop, damage source or gameplay hazard.

## Thất Tinh Kiếm

Change base cooldown from 135 to **90 ticks: 4.5→3 seconds**. Existing rank reductions (3 ticks per rank step), school/stat cooldown reduction, mana, damage and seven staggered impacts remain unchanged. The deterministic regression rejects the cast at elapsed tick 89 and accepts it at elapsed tick 90 without progression CDR. Both the catalogue and all rank definitions are checked.

## Verification

[Recorded commands, status and limitations](evidence/m4d-r3/verification.json).

- `vo-dang-skills` and `skill-revise`: **81 tests PASS** after rebuilding shared data; includes the new cooldown boundary case and the existing seven-impact/dodge behavior.
- TypeScript project compilation, tools/tests typecheck, PNG/hash/alpha/pivot/density validator.
- DH representative two-client material/plaza slice before expanding TD/TH. Final production scope: **4/4 PASS**, three two-client comparisons and the six-client TH movement/combat/readability case. The TD-only river-rock matte was then validated by repeating only that arena case (**1/1 PASS**).
- PNGs and live frame/property observations only. Final runtime art approval remains with the director; no FPS or full-campaign result is inferred.

The first complete candidate browser run was interrupted after DH/TD passed to correct water-versus-land draw order and TH water-mask exclusion. Final browser verification uses the rebuilt candidate, fresh preflight and owned services; earlier stages/results are not relabeled as final success.

An identified raised river boulder in TD is protected by a feathered source matte, so native paving does not repaint its original shape. The replacement surface has observed alpha 0 at the registered boulder center.

Floor comparisons (same camera/body scale): [DH before](evidence/m4d-r3/dao_hoa_dao-before.png) / [after](evidence/m4d-r3/dao_hoa_dao-after.png), [TD before](evidence/m4d-r3/tuong_duong-before.png) / [after](evidence/m4d-r3/tuong_duong-after.png), [TH before](evidence/m4d-r3/tu_hien_trang-before.png) / [after](evidence/m4d-r3/tu_hien_trang-after.png). [TD torch/stream close-up](evidence/m4d-r3/tuong-duong-torches-stream.png).
