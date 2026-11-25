# M4D runtime arena sources

Selected concepts: DH-B, TD-B, TH-B. Original generation prompts are retained in generation.json and generation-props.json. Shop stall and dungeon portal are excluded from environment art; functional HUD menus remain.

Three ground PNGs are clean underlays. Three native RGBA prop atlases use measured *-crops.json boxes, not blind equal-cell crops. Exports and their hashes are registered in ../../exports/m4d/manifest.json. Sprite scaling is uniform; anchors and Y depth are imported from extraction metadata.

Extraction tool: generate2dmap scripts/extract_prop_pack.py v0.5.0. Current prop-pack.json files retain source paths, hashes, extraction settings, labels, anchors and QA reports. Status v02 uses a 4-column/3-row grid with all detached components retained; transparent gutters prevent clipped icons. Validate current shipped assets with `python scripts/verify-m4d-art.py` from the repository root.

rejected-status-export-v01 is historical failed extraction evidence (cell-edge/dropped-component warnings). It is not shipped. Its old relative paths record the original extraction location; current consumers use status-icons-v02.png and exports/m4d/status-v02.

Concept approval does not constitute final runtime art approval. See ../../../docs/M4D_IMPLEMENTATION.md for live Phaser evidence, layer/shading integration and limits.
