# M3D r3 layered arena scenery — runtime review

Sixteen original transparent environment sprites in one retained1254×1254 RGBA source. Built-in image_gen,2026-11-02,85.2s. Full prompt: prompt.txt. References: the three approved r3 arena concepts; no third-party game raster or licensed pack was imported. Original generated artwork for this project; runtime director approval is pending.

`scenery.json` is lossless rectangle atlas metadata. `export.py` reproduces metadata/provenance without rewriting raster bytes; `components.py` audits alpha islands. `provenance.json` records the source SHA256 and processing. Hồng Liệt: command yurt/soldier yurt/gate/tower/drum. Cổ Mộ: male/female founder/altar/jade lantern/gateway. Kim Luân: fortress gate/tower/horizontal wall/vertical wall/banner/barracks.

Production importer copies source PNG byte-for-byte. Client replaces17 landmark mappings (two yurt uses) at retained Tiled foot markers/Y-depth; existing tile layers and server collision are scaled1.1. This is layered scenery, not the flattened approved concept used as a fake map. Runtime positions, sizing and normal-zoom PNGs: docs/M3D_R3_GAMEPLAY_HANDOFF.md and docs/evidence/sessions/m3d-r3-stills/.
