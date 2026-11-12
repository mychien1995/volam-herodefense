"""Repack the retained high-resolution forest drawings at native display density."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
OUT = ROOT / 'assets/exports/m3d-sprite-continuity'
SCRATCH = ROOT / 'artifacts/m3d-sprite-continuity-export'
FOREST = ROOT / 'assets/sprites/creeps/dungeons/forest'
BEACH = ROOT / 'assets/sprites/creeps/dungeons/beach/source'
spec = importlib.util.spec_from_file_location('forest_extractor', BEACH / 'package_beach_v01.py')
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)

inputs = set()
recipes = []


def relative(path):
    return path.relative_to(ROOT).as_posix()


def load(path):
    inputs.add(path)
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def pack_atlas(name, canvas, frames, tags=None):
    width, height = canvas
    images = []
    for frame, image, duration in frames:
        box = image.getchannel('A').getbbox()
        if not box or not (0 < box[0] < box[2] < width and 0 < box[1] < box[3] < height):
            raise ValueError(f'Empty or clipped frame: {name}/{frame} {box}')
        images.append((frame, image.crop(box), box[:2], duration))

    rows = [images[i:i+8] for i in range(0, len(images), 8)]
    atlas_width = max(sum(image.width + 4 for _, image, _, _ in row) for row in rows)
    atlas_height = sum(max(image.height for _, image, _, _ in row) + 4 for row in rows)
    atlas = Image.new('RGBA', (atlas_width, atlas_height))
    entries = {}
    y = 2
    for row in rows:
        x = 2
        for frame, image, offset, duration in row:
            atlas.paste(image, (x, y))
            entries[frame] = {
                'frame': {'x': x, 'y': y, 'w': image.width, 'h': image.height},
                'rotated': False, 'trimmed': True,
                'spriteSourceSize': {'x': offset[0], 'y': offset[1], 'w': image.width, 'h': image.height},
                'sourceSize': {'w': width, 'h': height}, 'duration': duration,
            }
            x += image.width + 4
        y += max(image.height for _, image, _, _ in row) + 4
    atlas.save(OUT / f'{name}.png')
    write(OUT / f'{name}.json', {'frames': entries, 'meta': {
        'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1', 'frameTags': tags or [],
    }})
    print(f'{name}: {len(frames)} native cels, {atlas.width} x {atlas.height}')


def pack(name, canvas, pivot, clips):
    tags = []
    frames = []
    editable = []
    directory = SCRATCH / name
    directory.mkdir(parents=True, exist_ok=True)
    for tag, clip in clips:
        first = len(frames)
        for index, (image, duration) in enumerate(clip):
            frame = f'{tag}_{index}'
            file = directory / f'{frame}.png'
            image.save(file)
            editable.append({'file': relative(file), 'duration': duration})
            frames.append((frame, image, duration))
        tags.append({'name': tag, 'from': first, 'to': len(frames) - 1, 'direction': 'forward'})
    pack_atlas(name, canvas, frames, tags)
    recipes.append({'canvas': canvas, 'pivot': pivot, 'frames': editable, 'tags': tags,
                    'output': relative(SOURCE / f'{name}.aseprite')})


def aseprite(script, **params):
    command = [os.getenv('ASEPRITE', 'C:/Program Files/Aseprite/Aseprite.exe'), '-b',
               '--script-param', f'root={ROOT.as_posix()}']
    for key, value in params.items():
        command.extend(['--script-param', f'{key}={value}'])
    command.extend(['--script', str(script)])
    subprocess.run(command, check=True)


def bong():
    directory = ROOT / 'assets/source/skills/cai-bang/bong-combo-review'
    script = directory / 'export.lua'
    inputs.update(directory / file for file in ('export.lua', 'right.png', 'up.png', 'down.png', 'up-smash.png'))
    path = SCRATCH / 'bong'
    path.mkdir(parents=True, exist_ok=True)
    aseprite(script, pack='native-body')
    sheet = Image.open(path / 'body.png').convert('RGBA')
    atlas = json.loads((path / 'body.json').read_text(encoding='utf-8'))
    frames = []
    for name, entry in sorted(atlas['frames'].items(), key=lambda item: (item[1]['frame']['y'], item[1]['frame']['x'])):
        f = entry['frame']
        cell = sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        durations = [100, 50, 50, 67] if '_overhead_' in name else [67, 67, 67, 66]
        frames.append((name, cell, durations[int(name[-1])]))
    pack_atlas('body', (256, 288), frames)


def actor(key):
    manifest = load(FOREST / key / 'manifest.json')
    by_name = {frame['name']: frame['extraction'] for frame in manifest['frames']}
    canvas, pivot = (320, 256), (160, 224)
    clips = []
    for direction in manifest['directions']:
        extraction = by_name[f'basic_attack_{direction}_0']
        sheet = ROOT / extraction['source']
        inputs.add(sheet)
        cells = pipeline.grid_cells(sheet, 4, 4)
        for state, duration in [('basic_attack', 100), ('death', 170)]:
            tag = f'{state}_{direction}'
            clip = []
            for index in range(4):
                entry = by_name[f'{tag}_{index}']
                cell = cells[entry['sourceCell']]
                if cell['rect'] != entry['sourceRect']:
                    raise ValueError(f'Source cell drift: {key}/{tag}_{index}')
                body = cell['image']
                scale = 2 * entry['fixedSourceScale']
                feet = entry['sourceFootInCrop']
                size = tuple(round(side * scale) for side in body.size)
                x, y = (p - round(f * scale) for p, f in zip(pivot, feet))
                image = Image.new('RGBA', canvas)
                if x < 1 or y < 1 or x + size[0] >= canvas[0] or y + size[1] >= canvas[1]:
                    raise ValueError(f'Pose extends outside its canvas: {key}/{tag}_{index}')
                image.paste(body.resize(size, Image.Resampling.LANCZOS), (x, y))
                clip.append((image, duration))
            clips.append((tag, clip))
    pack(f'forest_{key}', canvas, pivot, clips)


def effects():
    manifest = load(ROOT / 'assets/effects/dungeons/forest/manifest.json')
    by_name = {frame['name']: frame['extraction'] for frame in manifest['frames']}
    sheets = {}
    clips = []
    for sequence in manifest['sequences']:
        name = sequence['name']
        if not name.startswith(('truc_xa_', 'doc_chu_')):
            continue
        clip = []
        for frame in sequence['frames']:
            entry = by_name[frame]
            source = ROOT / entry['source']
            inputs.add(source)
            if source not in sheets:
                sheets[source] = Image.open(source).convert('RGBA')
            cell = sheets[source].crop(tuple(entry['sourceRect']))
            cell.putalpha(cell.getchannel('A').point(lambda a: a if a >= entry['alphaThreshold'] else 0))
            size = tuple(2 * round(n * entry['fixedSourceScale']) for n in cell.size)
            image = Image.new('RGBA', (256, 256))
            image.paste(cell.resize(size, Image.Resampling.LANCZOS), ((256-size[0])//2, (256-size[1])//2))
            clip.append((image, sequence['durationMs']))
        clips.append((name, clip))
    pack('forest_effects', (256, 256), (128, 128), clips)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    bong()
    for key in ['truc_xa', 'doc_chu']:
        actor(key)
    effects()
    recipe = SCRATCH / 'recipe.json'
    write(recipe, recipes)
    aseprite(BEACH / 'assemble_beach_v01.lua', recipe=recipe.as_posix())
    write(OUT / 'provenance.json', {
        'art': 'Retained original AI-assisted project raster, from the Bổng combo and approved forest archives.',
        'processing': 'Original pose cells and anchors, exported at twice the legacy density with retained edge alpha.',
        'inputs': {relative(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(inputs)},
        'outputs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in sorted(OUT.iterdir()) if p.suffix in ('.png', '.json') and 'provenance' not in p.stem},
    })


if __name__ == '__main__':
    main()
