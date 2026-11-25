"""Validate only the new M4D environment/status exports and their retained inputs."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/exports/m4d'
manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
for base, entries in [(ROOT, manifest['sourceFiles']), (OUT, manifest['files'])]:
    for name, expected in entries.items():
        path = base / name
        assert sha256(path.read_bytes()).hexdigest() == expected, f'Hash mismatch: {path}'
        if path.suffix == '.png':
            with Image.open(path) as image:
                image.verify()
props = 0
for pack_path in manifest['packs']:
    folder = (OUT / pack_path).parent
    pack = json.loads((OUT / pack_path).read_text(encoding='utf-8'))
    assert pack['qa']['status'] == 'pass' and not pack['warnings'], pack_path
    assert not pack['rejected'], pack_path
    for item in pack['accepted']:
        path = folder / item['image']
        with Image.open(path) as image:
            assert image.mode == 'RGBA', path
            assert list(image.size) == item['output_size'], path
            x, y = item['anchor_px']
            assert 0 <= x < image.width and 0 <= y < image.height, path
            low, high = image.getchannel('A').getextrema()
            assert low == 0 and high > 200, path
            assert not item['edge_touch'], f'Clipped crop: {path}'
        props += 1
for prefix in ['dh', 'td', 'th']:
    with Image.open(OUT / f'{prefix}-ground.png') as image:
        assert abs(image.width / image.height - 1600 / 1152) < 0.01
print(f'PASS M4D: 3 registered grounds, {props} native-alpha props/icons, four clean extraction packs, all source/export hashes.')

r2 = OUT / 'r2'
if (r2 / 'manifest.json').exists():
    revision = json.loads((r2 / 'manifest.json').read_text(encoding='utf-8'))
    for base, entries in [(ROOT, revision['sourceFiles']), (r2, revision['files'])]:
        for name, expected in entries.items():
            path = base / name
            assert sha256(path.read_bytes()).hexdigest() == expected, f'R2 hash mismatch: {path}'
            if path.suffix == '.png':
                with Image.open(path) as picture:
                    picture.verify()
    lotus = json.loads((r2 / 'lotus/prop-pack.json').read_text(encoding='utf-8'))
    assert lotus['qa']['status'] == 'pass' and not lotus['warnings']
    for prop in lotus['accepted']:
        with Image.open(r2 / 'lotus' / prop['image']) as picture:
            assert picture.mode == 'RGBA' and picture.getchannel('A').getextrema() == (0, 255)
            assert list(picture.size) == prop['output_size']
            assert not prop['edge_touch']
            assert 0 <= prop['anchor_px'][0] < picture.width and 0 <= prop['anchor_px'][1] < picture.height
    for prefix in ['dh', 'td', 'th']:
        with Image.open(r2 / f'{prefix}-ground.png') as picture:
            assert abs(picture.width / picture.height - 1600 / 1152) < 0.01
    print('PASS M4D R2: three sharp ground redraws and four isolated native-alpha lotus clusters; hashes, PNGs and anchors.')

r3 = OUT / 'r3'
if (r3 / 'manifest.json').exists():
    revision = json.loads((r3 / 'manifest.json').read_text(encoding='utf-8'))
    for base, entries in [(ROOT, revision['sourceFiles']), (r3, revision['files'])]:
        for name, expected in entries.items():
            path = base / name
            assert sha256(path.read_bytes()).hexdigest() == expected, f'R3 hash mismatch: {path}'
            if path.suffix == '.png':
                with Image.open(path) as picture:
                    picture.verify()
    for floor in revision['plazas']:
        pack = json.loads((r3 / floor['pack']).read_text(encoding='utf-8'))
        assert pack['qa']['status'] == 'pass' and not pack['warnings']
        assert not pack['rejected'] and len(pack['accepted']) == 1
        item = pack['accepted'][0]
        with Image.open(r3 / floor['image']) as picture:
            assert picture.mode == 'RGBA' and picture.getchannel('A').getextrema() == (0, 255)
            assert list(picture.size) == floor['pixels'] == item['output_size']
            assert min(picture.width / floor['world'][0], picture.height / floor['world'][1]) >= 1.75
            assert not item['edge_touch']
            assert 0 <= item['anchor_px'][0] < picture.width and 0 <= item['anchor_px'][1] < picture.height
    print('PASS M4D R3: three native-density isolated floor sprites, material atlas, retained grass source and all source/export hashes.')
