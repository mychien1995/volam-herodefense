"""Measure authored poses for Aseprite; no illustration drawing or mirroring."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

folder = Path(__file__).resolve().parent
sources = json.loads((folder/'source_components_v01.json').read_text())
models = {}
for key, source in sources.items():
    pixels = np.asarray(Image.open(folder/source['source']).convert('RGBA'))
    feet, heights = [], []
    for entry in source['frames']:
        x0, y0, x1, y1 = entry['bounds']
        low, skin_rows = [], []
        for y, a, b in entry['runs']:
            rgb = pixels[y, a:b, :3].astype(float)
            skin = ((rgb[:, 0] > 150) & (rgb[:, 1] > 105) & (rgb[:, 2] > 80)
                    & (rgb[:, 0] > rgb[:, 1]*1.08) & (rgb[:, 1] > rgb[:, 2]*1.08))
            skin_rows.append((y, int(skin.sum())))
            if y < y1-(y1-y0)*0.17:
                continue
            dark = rgb.max(axis=1) < 145
            changes = np.flatnonzero(np.diff(np.r_[False, dark, False].astype(np.int8)))
            for c, d in zip(changes[::2], changes[1::2]):
                if d-c >= 12:
                    low.append((y, a+int(c), a+int(d)))
        assert low, key
        bottom = max(v[0] for v in low)+1
        foot_x = round((min(v[1] for v in low)+max(v[2] for v in low))/2)
        # Skin-wide rows locate the bald scalp, excluding raised steel blades.
        counts = {}
        for y, count in skin_rows:
            counts[y] = counts.get(y, 0)+count
        threshold = max(counts.values())*0.23
        top = min(y for y, count in counts.items() if count >= threshold)
        feet.append([foot_x, bottom])
        heights.append(bottom-top+4)
    groups = [list(range(4)), list(range(4, 8))] if key.startswith('walk_') else [list(range(len(feet)))]
    scales = []
    for indexes in groups:
        sample = indexes if key.startswith('walk_') or key.endswith('corrected') else indexes[:2]
        scales.append(round(44/float(np.median([heights[i] for i in sample])), 8))
    models[key] = {'scales': scales, 'sourceFeet': feet, 'bodyHeightMeasurements': heights, 'mirror': False}

frames = []
for style in ['quyen', 'dao']:
    for direction in ['down', 'left', 'right', 'up']:
        base = direction+'_'+style
        for state, indexes, ms in [('idle', [0, 1], 350), ('walk', [2, 3, 4, 5], 120), ('basic_attack', [6, 7, 8, 9], 75)]:
            for frame, index in enumerate(indexes):
                key, scale_index = base, 0
                if state == 'walk' and direction != 'up':
                    key = 'walk_'+direction+'_corrected'
                    scale_index = 0 if style == 'quyen' else 1
                    index = frame+(4 if style == 'dao' else 0)
                if style == 'dao' and direction == 'left' and state == 'basic_attack':
                    key, index = 'left_dao_attack_corrected', frame
                model = models[key]
                frames.append({'style': style, 'direction': direction, 'state': state, 'frame': frame,
                               'name': f'{state}_{direction}_{frame}', 'source': key, 'component': index,
                               'scale': model['scales'][scale_index], 'sourceFoot': model['sourceFeet'][index],
                               'durationMs': ms})
layout = {'canvasByStyle': {'quyen': [80, 80], 'dao': [112, 80]},
          'pivotByStyle': {'quyen': [40, 64], 'dao': [56, 64]},
          'alphaThreshold': 220, 'sourceMeasurements': models, 'frames': frames,
          'method': 'Fixed scale per source row/strip, measured scalp-to-foot height and dark shoe anchor; no per-frame fitting or mirrored art.'}
(folder/'frame_sources_v01.json').write_text(json.dumps(layout, indent=2)+'\n', encoding='utf-8')
for key, model in models.items():
    print(key, 'scales', model['scales'], 'body heights', model['bodyHeightMeasurements'])
print('Measured', len(frames), 'selected original poses')
