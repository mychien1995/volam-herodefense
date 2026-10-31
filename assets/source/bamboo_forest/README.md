# Bamboo Forest production sources

Approved direction: assets/concepts/dungeon-environments/bamboo-forest/ (all five sheets approved 2026-10-31; bytes unchanged).
This directory contains original image_gen component rasters, extracted native-resolution PNGs, and 20 editable Aseprite sources (19 sprites plus terrain). These are new component assets guided by the approved sheets, not concept-board crops or a flattened map.

Original production requests and correction history are in generation_prompts.json.
The first vegetation source retained green haze despite real alpha. A second alpha-removal attempt was rejected. The selected image-tool correction uses a flat magenta key, removed on export; every final sprite has binary alpha. Props/portal use threshold245 to remove translucent colored fringe. Tiny isolated extraction specks are removed. All size conversion uses nearest sampling. No commercial pack or third-party license is claimed.

Ordinary artist workflow:
1. Edit sprites/*.aseprite or terrain.aseprite.
2. Run `pnpm assets:export:bamboo` (Aseprite 1.3.18.6 installed here; ASEPRITE_PATH can override).
3. Run `pnpm assets:verify:bamboo`, `pnpm assets:prepare`, and the relevant live playtest.
4. Edit maps/creep_forest.tmj directly in Tiled for placement/collision; this is the existing authoritative shared map format.

The ordinary export reads edited Aseprite sources, writes PNGs and repacks the fixed padded atlas. Existing scenery.json rectangles and pivots remain stable. Maintain canvas sizes when editing. PNG exports are retained; running the game does not require Aseprite.

Initial reconstruction only:
`python scripts/build-bamboo-forest.py` then `node scripts/export-bamboo-forest.mjs --prepare`.
These deliberately reconstruct source PNGs, source Aseprite files (with --prepare) and the map from the retained generated inputs/recipe. Do not use reconstruction after artist edits unless intentionally discarding those edits. They are never invoked by normal builds/preparation.

Terrain uses six authored periodic64px material samples, 32px square tiles and matching marching-square transition families with four phase variants. Edge conditioning and transition assembly operate on authored raster texture; no procedural trees or placeholder scenery is drawn. The logical pixel density was adjusted after the first live screenshot to match prop scale. Leaf scatter retains a smaller scale. Source layers are newly prepared named component layers, not recovered illustration layers.

Portal aura is a static authored sprite. No animation timing is claimed. Bridge deck and south rail are separate frames; ground props render below actors, tall props sort by their shared map foot anchor. Server collision uses the same map's collision rectangles.
