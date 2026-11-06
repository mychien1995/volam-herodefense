"""Read-only PNG/atlas/provenance validation. Raster exports are made in Aseprite."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
src = root / 'assets/source/renovation-v5'
manifest = json.loads((root / 'apps/game-client/src/renovation-revision.generated.json').read_text())
assert len(manifest['assets']) == 11
cells = 0
for asset in manifest['assets']:
    path = root / asset['url'].replace('/assets/', 'assets/exports/')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['sha256'], asset['id']
    image = Image.open(path).convert('RGBA')
    meta = json.loads(path.with_suffix('.json').read_text())
    assert image.size == (meta['meta']['size']['w'], meta['meta']['size']['h'])
    assert len(meta['frames']) == asset['grid'][0] * asset['grid'][1]
    assert (src / 'editable' / (asset['id'] + '.aseprite')).exists()
    for name, frame in meta['frames'].items():
        r, t, size = frame['frame'], frame['spriteSourceSize'], frame['sourceSize']
        assert frame['duration'] == 80 and not frame['rotated']
        assert [size['w'], size['h']] == asset['canvas']
        assert t['x'] > 0 and t['y'] > 0
        assert t['x'] + t['w'] < size['w'] and t['y'] + t['h'] < size['h'], (asset['id'], name, 'clipping')
        assert r['w'] == t['w'] and r['h'] == t['h']
        assert r['x'] >= 4 and r['y'] >= 4
        assert r['x'] + r['w'] <= image.width - 4 and r['y'] + r['h'] <= image.height - 4
        alpha = image.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])).getchannel('A')
        assert alpha.getbbox() and alpha.getextrema()[1] >= 240, (asset['id'], name, 'readable core')
        assert not any(0 < a < 12 for a in alpha.getdata()), (asset['id'], name, 'glow noise')
        if asset['type'] == 'body':
            assert name.split('_')[0] in ['down', 'left', 'right', 'up']
            assert 319 <= t['y'] + t['h'] <= 320, (asset['id'], name, 'feet')
            assert t['h'] <= 88, (asset['id'], name, 'body height')
        cells += 1
for school in ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam']:
    image = Image.open(root / f'assets/exports/renovation-v5/portrait-hero_{school}.png').convert('RGBA')
    assert image.size == (128, 128)
    b = image.getchannel('A').getbbox()
    assert b and b[0] > 0 and b[2] < 128 and b[3] == 112
    assert (src / f'editable/portrait-hero_{school}.aseprite').exists()
files = {
    str(p.relative_to(root)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
    for d in ['assets/source/renovation-v5', 'assets/exports/renovation-v5']
    for p in (root / d).rglob('*') if p.is_file() and p.name != 'provenance.json'
}
provenance = {
    'status': 'prototype; runtime verified separately; director review pending',
    'license': 'Original project artwork generated with built-in imagegen. Four portraits derive from the approved project-owned V1 idle sprites. No third-party game artwork copied.',
    'rasterTool': 'Aseprite 1.3.18.6 Lua: uniform bilinear native resize, RGBA PNG, alpha cutoff 12, fixed body foot pivot 200/320. Python reads rasters only.',
    'rejectedSource': 'raw/tai_chi_dome.png retained for provenance. Export uses tai_chi_dome_clean.png, a reference-guided edit with a transparent interior.',
    'cells': cells,
    'files': files,
}
if '--write-manifest' in sys.argv:
    (src / 'provenance.json').write_text(json.dumps(provenance, indent=2), encoding='utf-8')
else:
    assert json.loads((src / 'provenance.json').read_text())['files'] == files, 'V5 provenance mismatch'
print(f'V5 PASS: 11 atlases / {cells} cels / four portraits / alpha, bounds, clocks, feet, source hashes')
