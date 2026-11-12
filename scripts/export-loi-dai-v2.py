"""Export native Hồng Mộc layers using editable silhouette polygons."""
from hashlib import sha256
from pathlib import Path
import json

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

source = Path('assets/source/loi-dai-v2')
output = Path('assets/exports/loi-dai-v2')
output.mkdir(parents=True, exist_ok=True)
layout = json.loads((source / 'layout.json').read_text(encoding='utf-8'))
width, height, density = (layout[name] for name in ('width', 'height', 'density'))
size = (width * density, height * density)
original = source / layout['source']
art = Image.open(original).convert('RGB').crop((0, 0, *size))
art = art.filter(ImageFilter.UnsharpMask(radius=.9, percent=85, threshold=3))
stone = Image.open(source / 'paving.png').convert('RGB')
stone = stone.resize((1024, 682), Image.Resampling.LANCZOS)
stone.save(output / 'paving.png', optimize=True)

def save(image, name):
    image.save(output / (name + '.png'), optimize=True)

def layer(image, name, x, y, depth):
    save(image, name)
    return {'id': name, 'x': x, 'y': y, 'depth': depth,
            'width': image.width, 'height': image.height}

layers = []
remaining = Image.new('L', size, 255)
for name, depth, polygons in layout['pieces']:
    mask = Image.new('L', size)
    for points in polygons:
        ImageDraw.Draw(mask).polygon(
            [(round(x * density), round(y * density)) for x, y in points], fill=255)
    mask = ImageChops.multiply(mask, remaining)
    bounds = mask.getbbox()
    assert bounds, name
    remaining = ImageChops.subtract(remaining, mask)
    piece = art.crop(bounds).convert('RGBA')
    piece.putalpha(mask.crop(bounds))
    layers.append(layer(piece, name, bounds[0] / density, bounds[1] / density, depth))

ground = Image.new('RGB', size)
for y in range(0, size[1], stone.height):
    for x in range(0, size[0], stone.width):
        ground.paste(stone, (x, y))
ground.paste(art, (0, 0), remaining)
layers.append(layer(ground, 'ground', 0, 0, -100))

# Edge continuation occupies camera overscan only. It has no collision.
edge = 136
for name, box, x, flip_first in [
    ('west-overscan', (0, 0, edge, size[1]), -edge, False),
    ('east-overscan', (size[0] - edge, 0, size[0], size[1]), width, True),
]:
    crop = art.crop(box)
    mirrored = ImageOps.mirror(crop)
    piece = Image.new('RGB', (edge * 2, size[1]))
    piece.paste(mirrored if flip_first else crop, (0, 0))
    piece.paste(crop if flip_first else mirrored, (edge, 0))
    layers.append(layer(piece, name, x, 0, -110))

manifest = dict(width=width, height=height, density=density, layers=layers,
                provenance={'plate': sha256(original.read_bytes()).hexdigest(),
                            'paving': sha256((source / 'paving.png').read_bytes()).hexdigest()})
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
