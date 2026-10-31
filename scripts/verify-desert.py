"""Verify retained desert art, actual frames and runtime-map/provenance parity."""
import json
import hashlib
from pathlib import Path
from PIL import Image

R = Path(__file__).resolve().parents[1]
P = R / 'apps/game-client/public/assets'
manifest = json.loads((P/'desert/manifest.json').read_text(encoding='utf8'))
source = json.loads((R/'assets/source/desert/asset_manifest.json').read_text(encoding='utf8'))
assert manifest['status'] == 'integrated_pending_runtime_director_review'
assert manifest == json.loads((R/'assets/desert_dungeon.manifest.json').read_text(encoding='utf8'))
for path, expected in manifest['files'].items():
    assert hashlib.sha256((R/path).read_bytes()).hexdigest() == expected, path
# Original production hashes remain the independent source of truth.
for item in source['images']:
    assert hashlib.sha256((R/item['file']).read_bytes()).hexdigest() == item['sha256'], item['file']
count = 0
for actor in manifest['assets']:
    slug = actor['archetypeId']
    folder = R/f'assets/sprites/creeps/dungeons/desert/{slug}'
    atlas = json.loads((folder/'atlas.json').read_text())
    sheet = Image.open(folder/'spritesheet.png').convert('RGBA'); sheet.load()
    assert (folder/'spritesheet.png').read_bytes() == (P/f'desert/{slug}.png').read_bytes()
    assert (folder/'atlas.json').read_bytes() == (P/f'desert/{slug}.json').read_bytes()
    assert len(actor['animations']) == 20 and actor['status'] == 'prototype'
    for tag in actor['animations']:
        assert len(tag['frames']) == len(tag['durations'])
        assert tag['repeat'] == (-1 if tag['state'] in ['idle','walk'] else 0)
        assert len(set(tag['frames'])) == len(tag['frames'])
        for name, duration in zip(tag['frames'],tag['durations']):
            frame = atlas['frames'][name]; rect = frame['frame']
            x,y,w,h = [rect[k] for k in ['x','y','w','h']]
            assert 0 <= x < x+w <= sheet.width and 0 <= y < y+h <= sheet.height
            image = Image.open(folder/'frames'/name).convert('RGBA'); image.load()
            assert image.tobytes() == sheet.crop((x,y,x+w,y+h)).tobytes(), name
            assert duration == frame['duration'] and duration > 0
            count += 1
assert count == 380
m = json.loads((R/'maps/creep_desert.tmj').read_text())
assert m['orientation']=='orthogonal'
terrain = Image.open(P/'desert/terrain.png'); terrain.load()
assert (terrain.width,terrain.height) == (m['tilesets'][0]['imagewidth'],m['tilesets'][0]['imageheight'])
scenery = json.loads((P/'desert/scenery.json').read_text())
for layer in m['layers']:
    if layer['type']=='tilelayer':
        assert len(layer['data']) == m['width']*m['height']
        assert all(0 <= v <= m['tilesets'][0]['tilecount'] for v in layer['data'])
    if layer['name']=='scenery':
        assert all(o['name'] in scenery['frames'] for o in layer['objects'])
assert (R/'maps/creep_desert.tmj').read_bytes() == (P/'creep_desert.tmj').read_bytes()
assert (R/'maps/creep_desert.tmj').read_bytes() == (R/'packages/game-data/src/creep-desert-map.json').read_bytes()
print('PASS: 380 frames / 120 tags, original source hashes, atlas pixels/timings, runtime copies and desert map; director approval pending')
