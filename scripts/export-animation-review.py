"""Export only the new review VFX; retain source alpha and use existing gutter detection.

This is a mechanical PNG/atlas exporter, not a procedural art generator. Never called
by preparation. Run explicitly after selecting new image_gen source sheets.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'assets/source/skills/m3c3_feedback_v2_batches/tools'))
from measure_effects import cuts
from raster_components import components

SOURCE = ROOT / 'assets/source/skills/animation-review-v01'
DEST = ROOT / 'assets/exports/skills/animation-review-v01'


def export():
    DEST.mkdir(parents=True, exist_ok=True)
    records = json.loads((SOURCE / 'generation.json').read_text(encoding='utf-8'))
    assets = []
    for record in records['requests']:
        source = SOURCE / record['file']
        raw = Image.open(source).convert('RGBA')
        mask = np.asarray(raw)[:, :, 3] > 32
        yy = cuts(mask.sum(1), 2)
        size = record['canvas']
        sheet = Image.new('RGBA', (size * 4, size * 2))
        frames = {}
        source_rects = []
        anchors = []
        for row in range(2):
            xx = cuts(mask[yy[row]:yy[row + 1]].sum(0), 4)
            for col in range(4):
                rect = (xx[col], yy[row], xx[col + 1], yy[row + 1])
                # Fixed source cell center and one common scale; no per-cel bbox fitting.
                crop = raw.crop(rect)
                factor = record.get('contentSize', size) / max(raw.width / 4, raw.height / 2)
                anchor = [crop.width / 2, crop.height / 2]
                if record.get('alignLotus'):
                    # Reuse the existing connected-raster detector to align the foot hole,
                    # rather than the whole effect's bounding box. No pixels are repainted.
                    m = np.asarray(crop)[:, :, 3] > 32
                    holes = [c for c in components(~m) if c['area'] > 1000 and c['bounds'][0] > 0 and c['bounds'][1] > 0
                             and c['bounds'][2] < crop.width and c['bounds'][3] < crop.height
                             and abs(c['x'] - crop.width / 2) < crop.width * .15 and c['y'] > crop.height * .45]
                    anchor = [holes[0]['x'], holes[0]['y']] if holes else [crop.width / 2, crop.height * .71]
                anchors.append(anchor)
                crop = crop.resize((round(crop.width * factor), round(crop.height * factor)), Image.Resampling.NEAREST)
                cel = Image.new('RGBA', (size, size))
                cel.paste(crop, (round(size / 2 - anchor[0] * factor), round(size / 2 - anchor[1] * factor)))
                assert cel.getchannel('A').getextrema()[1] > 0
                name = f'{record["tags"][row]}_{col}'
                x, y = col * size, row * size
                sheet.paste(cel, (x, y))
                frames[name] = {'frame': {'x': x, 'y': y, 'w': size, 'h': size}, 'rotated': False, 'trimmed': False,
                                'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size}, 'sourceSize': {'w': size, 'h': size}, 'duration': 100}
                source_rects.append(list(rect))
        cid = record['id']
        sheet.save(DEST / f'{cid}.png')
        (DEST / f'{cid}.json').write_text(json.dumps({'frames': frames, 'meta': {'image': f'{cid}.png', 'size': {'w': sheet.width, 'h': sheet.height}}}, indent=2) + '\n')
        assets.append({'id': cid, 'skillId': 'animation_review', 'kind': 'vfx',
                       'sheet': f'assets/exports/skills/animation-review-v01/{cid}.png', 'atlas': f'assets/exports/skills/animation-review-v01/{cid}.json',
                       'origin': [0.5, 0.5], 'frameDimensions': [size, size],
                       'animations': [{'name': tag, 'frames': [f'{tag}_{i}' for i in range(4)], 'frameRate': 10, 'repeat': 0,
                                       'direction': 'none', 'origin': [0.5, 0.5], 'frameDimensions': [size, size],
                                       'stage': tag, 'placement': 'ground' if cid == 'review_lotus' else 'projectile', 'effectPlacementOffset': [0, 0]} for tag in record['tags']],
                       'source': source.relative_to(ROOT).as_posix(), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                       'sourceDimensions': list(raw.size), 'sourceRects': source_rects, 'sourceAnchors': anchors,
                       'provenance': 'Original OpenAI built-in image_gen PNG; nearest-neighbor export with existing alpha gutter detector; alpha preserved. No human hand-pixelled or exclusive rights claim.',
                       'status': 'REVIEW_ONLY_PENDING_DIRECTOR', 'runtimeGameplayIntegrated': False})
    (DEST / 'manifest.json').write_text(json.dumps({'assets': assets, 'status': 'REVIEW_ONLY_PENDING_DIRECTOR'}, indent=2) + '\n')
    print(f'Exported {len(assets)} review sheets / 24 cels; gameplay manifests untouched.')


if __name__ == '__main__':
    export()
