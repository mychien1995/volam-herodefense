from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1] / 'assets' / 'exports' / 'loi-dai'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
with Image.open(root / 'hong-moc.png') as floor:
    assert floor.size == (manifest['width'], manifest['height']) == (836, 470)
for layer in manifest['layers']:
    with Image.open(root / (layer['id'] + '.png')) as image:
        assert image.mode == 'RGBA' and image.getchannel('A').getextrema() == (0, 255)
        assert layer['x'] + image.width <= manifest['width']
        assert layer['y'] + image.height <= manifest['height']
frames = manifest['fireworks']
assert frames == {
    'frameWidth': 132, 'frameHeight': 132, 'frameCount': 16,
    'fps': 14, 'originX': 0.5, 'originY': 1.0,
}
with Image.open(root / 'fireworks.png') as image:
    assert image.mode == 'RGBA' and image.size == (528, 528)
    cells = []
    for i in range(16):
        x, y = i % 4 * 132, i // 4 * 132
        cel = image.crop((x, y, x + 132, y + 132))
        cells.append(cel.tobytes())
        assert cel.getchannel('A').getextrema()[0] == 0
    assert len(set(cells)) == 16
print('Lôi Đài: 836×470 ground, 2 foreground layers, 16 distinct alpha VFX frames.')

# Native court exports retain independent masks and an exact in-position composite.
from hashlib import sha256
from PIL import ImageChops, ImageFilter

version = root.with_name('loi-dai-v2')
source = root.parent.parent / 'source' / 'loi-dai-v2'
data = json.loads((version / 'manifest.json').read_text(encoding='utf-8'))
assert (data['width'], data['height'], data['density']) == (836, 470, 2)
size = (1672, 940)
old = source.parent / 'loi-dai' / 'hong-moc.png'
assert data['provenance']['plate'] == sha256(old.read_bytes()).hexdigest()
assert data['provenance']['paving'] == sha256((source / 'paving.png').read_bytes()).hexdigest()
assert len({layer['id'] for layer in data['layers']}) == len(data['layers'])
assert {'ground', 'deck', 'temple', 'staircase', 'west-drum', 'east-drum', 'west-banner', 'east-banner'} <= {layer['id'] for layer in data['layers']}
composite = Image.new('RGB', size)
for layer in sorted(data['layers'], key=lambda entry: entry['depth']):
    with Image.open(version / (layer['id'] + '.png')) as image:
        assert image.size == (layer['width'], layer['height'])
        if layer['id'].endswith('-overscan'):
            assert image.mode == 'RGB' and image.height == size[1]
            continue
        xy = (round(layer['x'] * 2), round(layer['y'] * 2))
        if layer['id'] == 'ground':
            assert image.size == size and image.mode == 'RGB'
            composite.paste(image, xy)
        else:
            assert image.mode == 'RGBA' and image.getchannel('A').getbbox()
            assert 0 <= xy[0] <= size[0] - image.width
            assert 0 <= xy[1] <= size[1] - image.height
            composite.paste(image, xy, image.getchannel('A'))
with Image.open(old) as old_art:
    expected = old_art.convert('RGB').crop((0, 0, *size))
    expected = expected.filter(ImageFilter.UnsharpMask(radius=.9, percent=85, threshold=3))
assert not ImageChops.difference(expected, composite).getbbox()
print(f'Lôi Đài v2: {len(data["layers"])} native layers/overscan, exact composite, source hashes verified.')
