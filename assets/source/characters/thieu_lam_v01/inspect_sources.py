"""Measure connected authored alpha pixels; does not paint or alter source PNGs."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

folder = Path(__file__).resolve().parent
records = {}
for path in sorted((folder / 'generated').glob('*.png')):
    pixels = np.asarray(Image.open(path).convert('RGBA'))
    alpha = pixels[:, :, 3] >= 220
    parents, runs, previous = [], [], []

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    for y, row in enumerate(alpha):
        changes = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current, j = [], 0
        for x0, x1 in zip(changes[::2], changes[1::2]):
            n = len(parents)
            parents.append(n)
            while j < len(previous) and previous[j][1] < x0 - 1:
                j += 1
            k = j
            while k < len(previous) and previous[k][0] <= x1:
                parents[find(n)] = find(previous[k][2])
                k += 1
            current.append((int(x0), int(x1), n))
            runs.append((y, int(x0), int(x1), n))
        previous = current
    groups = {}
    for y, x0, x1, n in runs:
        groups.setdefault(find(n), []).append([y, x0, x1])
    components = [r for r in groups.values() if sum(b-a for _, a, b in r) > 1500]

    def center(r):
        return sum(y*(b-a) for y, a, b in r) / sum(b-a for _, a, b in r)

    rows = [sorted([r for r in components if (center(r) < alpha.shape[0]/2) == upper],
                   key=lambda r: min(v[1] for v in r)) for upper in (True, False)]
    entries = []
    for row in rows:
        for component in row:
            bounds = [min(v[1] for v in component), min(v[0] for v in component),
                      max(v[2] for v in component), max(v[0] for v in component)+1]
            entries.append({'bounds': bounds, 'runs': component})
    records[path.stem] = {'source': path.relative_to(folder).as_posix(),
                          'size': [pixels.shape[1], pixels.shape[0]],
                          'alphaThreshold': 220, 'components': len(entries), 'frames': entries}
    print(path.stem, len(entries), [e['bounds'] for e in entries])
(folder/'source_components_v01.json').write_text(json.dumps(records, separators=(',', ':'))+'\n', encoding='utf-8')
