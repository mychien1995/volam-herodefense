# ART-01 editable production sources

These are original generated raster components prepared in **Aseprite 1.3.18.6**, actually executed via batch Lua. They are runtime candidates, awaiting director approval. The approved Cái Bang source/export files are elsewhere and were not modified.

The nine `.aseprite` files contain meaningful layers: continuous ground/substrate/vegetation/detail; world bases and sculpture/canopies; water/deck, banks and foreground rails; fixed ambient geometry and changing water/glow cels; icon frames/glyphs; HUD frame/surface; state frames; a separate single-projectile basic icon; and the wall-face sample. They are reconstructed production layers, not recovered original layers of the flattened concept.

Re-export edited sources without regenerating them:

```powershell
pnpm assets:export:arena
pnpm verify:assets
pnpm assets:prepare
```

Set `ASEPRITE_PATH` if the executable is elsewhere. Normal builds and gameplay use committed PNG/JSON exports and do not require Aseprite. `scripts/assemble-arena-art01.lua` is the **initial reconstruction recipe**; running it again replaces the editable source files from the preserved generated inputs. Use the export command for subsequent artist edits.

World frames: 192×192 with feet (96,184). Garden/ambient frames: 224×224 with feet (112,216). HUD icons: 64×64; DOM sizes are responsive. Ambient tags `cascade_flow`, `stream_pool_flow`, `lantern_glow` each have four actual 160ms cels. The water loop samples adjacent authored cyan pixels while banks remain fixed; glow changes the painted lantern window. Banners remain static. Alpha is cleaned to 0/255 and atlases have 2px spacing. No damage, collision or animation timing is delegated to artwork.

Production/provenance: built-in `image_gen`, prompted with the user's clean arena and compact HUD direction. No external game art pack. Generated inputs are preserved as `generated_*.png`; source cropping, pixel-density adaptation, alpha cleanup and layer reconstruction are explicit in Lua. See `GENERATION.md`, `assets/arena_art01.manifest.json`, `docs/ART01_COMPONENT_BREAKDOWN.md` and `docs/ART01_RUNTIME_REVIEW.md` for scope and actual evidence.
