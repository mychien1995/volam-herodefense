
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / 'assets/concepts/skills/thieu-lam/m3d-rework-v05'
output = root / 'assets/exports/skills/thieu-lam/dai_luc_kim_cuong_chuong_v05'
component = root / 'apps/game-client/src/diamond-palm-v05.json'
asset_id = 'diamond_palm_v05'
art = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
for item in art['assets']:
    assert sha256((source / item['file']).read_bytes()).hexdigest() == item['sha256']

projectiles = Image.open(source / 'dai_luc_kim_cuong_chuong_v05.png')
impact = Image.open(source / 'dai_luc_kim_cuong_chuong_impact_v05.png')
atlas = Image.new('RGBA', (384, 192))
frames = {}
tags = []

def export(name, cels, size, origin, delays, repeat=0):
    names = []
    for index, (image, box) in enumerate(cels):
        frame = image.crop(box).resize(size, Image.Resampling.LANCZOS)
        key = f'{name}_{index}'
        slot = len(frames)
        x, y = (slot % 4) * 96, (slot // 4) * 96
        atlas.paste(frame, (x, y))
        frames[key] = {
            'frame': dict(x=x, y=y, w=size[0], h=size[1]),
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': dict(x=0, y=0, w=size[0], h=size[1]),
            'sourceSize': dict(w=size[0], h=size[1]),
        }
        assert frame.getchannel('A').getextrema()[0] == 0
        names.append(key)
    tags.append({
        'name': name, 'frames': names, 'frameRate': 10, 'repeat': repeat,
        'direction': 'right', 'origin': origin, 'frameDimensions': size,
        'stage': name, 'placement': 'world', 'effectPlacementOffset': [0, 0],
        'frameDurationsMs': delays,
    })

export('travel', [(projectiles, (1295, 23, 1530, 210))], (48, 38), [0.66, 0.5], [100], -1)
export('empowered_travel', [(projectiles, (945, 400, 1460, 831))], (90, 75), [0.66, 0.5], [100], -1)
for row, (name, size, delays) in enumerate([
    ('impact', (50, 50), [48, 97, 105]),
    ('empowered_impact', (86, 86), [68, 132, 160]),
]):
    # The three source cels share a y anchor. Align their first contact flash
    # with the center of the following burst and the last wisps.
    centers = (309, 768, 1278) if row == 0 else (325, 749, 1251)
    top = 0 if row == 0 else 512
    cels = [(impact, (x - 228, top, x + 228, top + 456)) for x in centers]
    export(name, cels, size, [0.5, 0.57 if row == 0 else 0.42], delays)

output.mkdir(parents=True, exist_ok=True)
def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')

atlas.save(output / 'diamond-palm.png')
write_json(output / 'diamond-palm.json', {'frames': frames, 'meta': {'image': 'diamond-palm.png', 'size': {'w': 384, 'h': 192}, 'scale': '1'}})
base = output.relative_to(root).as_posix()
write_json(component, {
    'id': asset_id, 'skillId': 'dai_luc_kim_cuong_chuong', 'kind': 'vfx',
    'sheet': base + '/diamond-palm.png', 'atlas': base + '/diamond-palm.json',
    'origin': [0.5, 0.5], 'frameDimensions': [96, 96], 'animations': tags,
})
print(f'{len(frames)} RGBA cels -> {base}')
