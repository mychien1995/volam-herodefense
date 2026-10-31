"""Read-only Phase 1J PNG/atlas/provenance validation; never regenerates artwork."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / 'assets/sprites/creeps/arena/waves-17-20-production'

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify_frames(folder, expected_count):
    atlas = read(folder / 'atlas.json')
    sheet = Image.open(folder / 'spritesheet.png').convert('RGBA')
    assert len(atlas['frames']) == expected_count, folder
    hashes = set()
    for name, record in atlas['frames'].items():
        assert not record['rotated'] and not record['trimmed'], name
        box = record['frame']
        png = Image.open(folder / 'frames' / (name + '.png')).convert('RGBA')
        assert png.size == (box['w'], box['h']), name
        extracted = sheet.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h']))
        assert extracted.tobytes() == png.tobytes(), ('atlas pixel mismatch', name)
        alpha = png.getchannel('A')
        assert set(alpha.getdata()) <= {0, 255}, ('nonbinary alpha', name)
        bounds = alpha.getbbox()
        assert bounds and min(bounds[:2]) > 0 and bounds[2] < png.width and bounds[3] < png.height, ('clipped frame', name)
        hashes.add(hashlib.sha256(png.tobytes()).hexdigest())
    assert len(hashes) == expected_count, ('repeated drawing', folder, len(hashes))
    return atlas

runtime = read(ROOT / 'assets/arena_creeps.manifest.json')
assert len(runtime['assets']) == 20
frame_total = 0
for slug in ['anh-ma', 'ma-tuong-thiet-giap', 'huyet-ma-phap-su', 'ma-vuong-tien-phong']:
    folder = ROOT / 'assets/sprites/creeps/arena' / slug
    manifest = read(folder / 'manifest.json')
    for source_file, expected_hash in manifest['generatedSourceHashes'].items():
        assert digest(ROOT/source_file)==expected_hash, ('changed generated source', source_file)
    atlas = verify_frames(folder, 64)
    assert digest(ROOT / manifest['sourceConcept']) == manifest['sourceConceptSha256'], slug
    assert len(manifest['animations']) == 20
    source = (ROOT / manifest['source']).read_bytes()
    assert struct.unpack_from('<H', source, 4)[0] == 0xA5E0
    assert struct.unpack_from('<H', source, 6)[0] == 64, ('Aseprite frame count', slug)
    used = set()
    for anim in manifest['animations']:
        assert len(anim['frames']) == {'idle': 2, 'walk': 4, 'basic_attack': 4, 'hurt': 2, 'death': 4}[anim['state']]
        assert anim['repeat'] == (-1 if anim['state'] in ['idle', 'walk'] else 0)
        for name in anim['frames']:
            assert name in atlas['frames'] and name not in used
            assert abs(1000 / atlas['frames'][name]['duration'] - anim['frameRate']) < .03
            used.add(name)
    assert len(used) == 64
    binding = next(a for a in runtime['assets'] if a['wave'] == manifest['wave'])
    assert binding['textureKey'] == manifest['id']
    assert binding['animationKeys'] == [manifest['id']+':'+a['state']+':'+a['direction'] for a in manifest['animations']]
    assert binding['id'] == manifest['id'] and binding['sourceConcept'] == manifest['sourceConcept']
    for file in ['spritesheet.png', 'atlas.json']:
        public = ROOT / 'apps/game-client/public/assets/arena_creeps' / slug / file
        assert digest(public) == digest(folder / file), ('stale runtime copy', public)
    frame_total += 64

effects = BATCH / 'effects'
verify_frames(effects, 28)
fx = read(effects / 'manifest.json')
assert len(fx['animations']) == 7
assert digest(ROOT / fx['generatedSource']) == fx['sourceSha256']
for file, destination in [('spritesheet.png', 'final_fx_spritesheet.png'), ('atlas.json', 'final_fx_atlas.json')]:
    assert digest(effects / file) == digest(ROOT / 'apps/game-client/public/assets/arena_creeps' / destination)
records = read(BATCH / 'approved_inputs_lock.json')['records']
for file, expected in records.items():
    assert digest(ROOT / file) == expected, ('approved input modified', file)
print(f'PASS: {frame_total} distinct character frames / 80 animations, 28 distinct FX frames / 7 animations; exact atlas pixels, alpha, bounds, timings, editable sources, public copies and {len(records)} protected inputs.')
