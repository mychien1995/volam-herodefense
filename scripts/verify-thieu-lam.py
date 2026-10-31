"""Validate approved concept, editable sources and real Thiếu Lâm atlas frames."""
from pathlib import Path
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

concept_dir = root/'assets/concepts/heroes/thieu-lam'
approval = json.loads((concept_dir/'concept_manifest_v02.json').read_text(encoding='utf-8'))
assert approval['approvedConceptFilename'] == 'thieu-lam-concept-v02.png'
assert approval['status'] == 'approved' and approval['approvalEvidence']['text'] == 'approved'
assert digest(concept_dir/approval['approvedConceptFilename']) == approval['output']['sha256']
protected = 0
for name in ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam']:
    path = root/f'assets/approved_{name}.lock.json'
    if not path.exists():
        assert name == 'thieu_lam'
        continue
    lock = json.loads(path.read_text(encoding='utf-8'))
    for file, expected in lock['files'].items():
        assert digest(root/file) == expected, 'Approved baseline changed: '+file
        protected += 1
runtime = json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
report = {'protectedFilesVerified': protected, 'conceptApproved': True, 'assets': []}
for asset_id, style, width in [('hero_thieu_lam', 'quyen', 80), ('hero_thieu_lam_dao', 'dao', 112)]:
    entry = next(a for a in runtime['assets'] if a['id'] == asset_id)
    assert entry['status'] in ['prototype', 'approved'] and entry['footPivot'] == [0.5, 0.8]
    if entry['status'] == 'approved':
        assert (root/'assets/approved_thieu_lam.lock.json').exists()
        assert entry['approvalLock'] == 'assets/approved_thieu_lam.lock.json'
        assert entry['approvalScope'] == ['idle', 'walk', 'basic_attack']
    assert (root/entry['source']).is_file()
    source_bytes = (root/entry['source']).read_bytes()
    assert source_bytes[4:6] == bytes.fromhex('e0a5'), 'Invalid Aseprite source'
    assert int.from_bytes(source_bytes[6:8], 'little') == 40
    png_path, atlas_path = (root/'assets/exports'/entry[k] for k in ['sheet', 'atlas'])
    with Image.open(png_path) as png:
        png.verify()
    image = Image.open(png_path)
    image.load()
    assert image.mode == 'RGBA' and image.size == (width*10, 320)
    assert set(image.getchannel('A').getdata()) == {0, 255}
    atlas = json.loads(atlas_path.read_text())
    assert len(atlas['frames']) == 40 and len(atlas['meta']['frameTags']) == 12
    assert atlas['meta']['slices'][0]['keys'][0]['pivot'] == {'x': width//2, 'y': 64}
    hashes, details = [], []
    for direction in ['down', 'left', 'right', 'up']:
        for state, count, ms in [('idle', 2, 350), ('walk', 4, 120), ('basic_attack', 4, 75)]:
            tag = next(t for t in atlas['meta']['frameTags'] if t['name'] == f'{state}_{direction}')
            names = [f'{state}_{direction}_{i}' for i in range(count)]
            assert list(atlas['frames'])[tag['from']:tag['to']+1] == names
            tag_hashes = []
            for name in names:
                data = atlas['frames'][name]
                x, y, w, h = (data['frame'][k] for k in ['x', 'y', 'w', 'h'])
                assert (w, h) == (width, 80) and data['duration'] == ms
                assert x >= 0 and y >= 0 and x+w <= image.width and y+h <= image.height
                frame = image.crop((x, y, x+w, y+h))
                b = frame.getchannel('A').getbbox()
                assert b and b[0] > 0 and b[1] > 0 and b[2] < width and 63 <= b[3] <= 65, (name, b)
                single = root/f'assets/exports/characters/thieu_lam_v01/{style}/frames/{name}.png'
                with Image.open(single) as cel:
                    assert cel.size == (width, 80) and cel.convert('RGBA').tobytes() == frame.tobytes()
                fingerprint = hashlib.sha256(frame.tobytes()).hexdigest()
                tag_hashes.append(fingerprint)
                hashes.append(fingerprint)
                details.append({'name': name, 'alphaBounds': list(b), 'durationMs': ms, 'sha256': fingerprint})
            assert len(set(tag_hashes)) == count, 'Repeated static pose: '+tag['name']
    assert len(set(hashes)) == 40, 'Duplicate source cels'
    assert len(entry['animations']) == 24
    for anim in entry['animations']:
        if anim['state'] in ['cast', 'hurt', 'death']:
            assert anim['fallbackFor'] == ('basic_attack' if anim['state'] == 'cast' else 'idle')
    report['assets'].append({'id': asset_id, 'frames': 40, 'tags': 12, 'canvas': [width, 80],
                             'footPivotPx': [width//2, 64], 'alpha': [0, 255],
                             'atlasSha256': digest(atlas_path), 'pngSha256': digest(png_path),
                             'sourceSha256': digest(root/entry['source']), 'frameDetails': details})
out = root/'assets/source/characters/thieu_lam_v01/export_validation_v01.json'
out.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print('PASS: approved concept and '+str(protected)+' protected files; 80 distinct transparent PNG cels, 24 authored tags, bounds, pivots, timings, source headers, individual/atlas equality and explicit fallback metadata.')
