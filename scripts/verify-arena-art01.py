"""Validate committed ART-01 production assets; no image editing or generation."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source/arena_art01'
EXPORT = ROOT / 'assets/exports/arena_art01'


def verify():
    report = {'sources': [], 'atlases': [], 'exports': [], 'approvedCharacterHashes': 'PASS'}
    for file in sorted(SOURCE.glob('*.aseprite')):
        header = file.read_bytes()[:128]
        assert struct.unpack_from('<H', header, 4)[0] == 0xA5E0, file
        frames, width, height = struct.unpack_from('<HHH', header, 6)
        assert frames > 0 and width > 0 and height > 0
        report['sources'].append({'path': file.relative_to(ROOT).as_posix(), 'frames': frames, 'width': width, 'height': height})
    assert len(report['sources']) >= 9
    for file in sorted(EXPORT.glob('*.json')):
        atlas = json.loads(file.read_text(encoding='utf-8'))
        image = Image.open(file.with_suffix('.png'))
        assert image.size == (atlas['meta']['size']['w'], atlas['meta']['size']['h'])
        frames = list(atlas['frames'])
        for name, data in atlas['frames'].items():
            b = data['frame']; x, y, w, h = (b[k] for k in ('x', 'y', 'w', 'h'))
            assert 0 <= x < x+w <= image.width and 0 <= y < y+h <= image.height, (file, name)
            assert image.crop((x, y, x+w, y+h)).getchannel('A').getbbox(), (file, name)
            assert data['duration'] > 0
            # Two-pixel frame padding is present in Aseprite exports.
            assert x >= 2 and y >= 2
        for tag in atlas['meta']['frameTags']:
            assert 0 <= tag['from'] <= tag['to'] < len(frames), (file, tag)
            if file.stem != 'ambient':
                assert tag['from'] == tag['to'], (file, tag)
            else:
                assert tag['to'] - tag['from'] + 1 == 4
                assert all(atlas['frames'][frames[i]]['duration'] == 160 for i in range(tag['from'], tag['to']+1))
                # Flow/glow may repeat a phase, but all four cels must exist and
                # the loop must contain a real pixel change, with stable alpha.
                pixels = []
                alphas = []
                for i in range(tag['from'], tag['to']+1):
                    b = atlas['frames'][frames[i]]['frame']
                    crop = image.crop((b['x'], b['y'], b['x']+b['w'], b['y']+b['h']))
                    pixels.append(crop.tobytes()); alphas.append(crop.getchannel('A').tobytes())
                assert len(set(pixels)) >= 2, tag['name']
                assert len(set(alphas)) == 1, 'Animation silhouette/pivot jumps'
        report['atlases'].append({'path': file.relative_to(ROOT).as_posix(), 'frameCount': len(frames), 'tags': atlas['meta']['frameTags'], 'layers': atlas['meta']['layers']})
    for file in sorted(EXPORT.glob('*.png')):
        image = Image.open(file); image.load()
        assert image.mode == 'RGBA', file
        alpha = image.getchannel('A')
        assert alpha.getbbox(), file
        assert set(alpha.getdata()) <= {0, 255}, f'Alpha halo: {file}'
        report['exports'].append({'path': file.relative_to(ROOT).as_posix(), 'dimensions': list(image.size), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    lock = json.loads((ROOT/'assets/approved_cai_bang.lock.json').read_text())
    for file, expected in lock['files'].items():
        assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest() == expected, file
    target = ROOT/'docs/evidence/art01/asset-validation.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"PASS: {len(report['sources'])} Aseprite sources, {len(report['atlases'])} padded atlases, {len(report['exports'])} RGBA exports; bounds, tags, timing, stable loop alpha and approved Cái Bang hashes")


if __name__ == '__main__':
    verify()
