"""Focused PNG/atlas/provenance checks for this asset-only revision."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def read(path):
    return json.loads(path.read_text(encoding='utf8'))


def verify():
    groups = ['assets/sprites/bosses/ly-mac-sau', 'assets/sprites/summons/co-mo-am-binh', 'assets/effects/bosses/ly-mac-sau', 'assets/effects/bosses/ly-mac-sau/purple_v02']
    count = clips_count = 0
    for group in groups:
        folder = ROOT / group
        sheet = Image.open(folder / 'spritesheet.png').convert('RGBA')
        atlas = read(folder / 'atlas.json')['frames']
        clips = read(folder / 'animations.json')['animations']
        manifest = read(folder / 'manifest.json')
        assert len(atlas) == manifest['frameCount'], group
        for name, entry in atlas.items():
            image = Image.open(folder / 'frames' / (name + '.png')).convert('RGBA')
            image.load()
            f = entry['frame']
            assert image.size == (f['w'], f['h']), name
            assert f['x'] >= 0 and f['y'] >= 0 and f['x'] + f['w'] <= sheet.width and f['y'] + f['h'] <= sheet.height, name
            assert ImageChops.difference(image, sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))).getbbox() is None, name
            bounds = image.getbbox()
            assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < image.width and bounds[3] < image.height, name
            assert image.getchannel('A').getextrema()[0] == 0, name
            pivot = entry['pivot']
            assert 0 <= pivot['x'] <= 1 and 0 <= pivot['y'] <= 1, name
            if group.endswith('purple_v02'):
                pixels = [rgb for rgb in image.getdata() if rgb[3] > 150 and max(rgb[:3]) - min(rgb[:3]) > 45]
                purple = [p for p in pixels if p[2] > p[1] * 1.2 and p[0] > p[1] * 1.2]
                assert pixels and len(purple) / len(pixels) > 0.6, f'Purple palette missing: {name}'
            count += 1
        for name, clip in clips.items():
            assert clip['frames'] and len(clip['frames']) == len(clip['durationsMs']), name
            assert all(f in atlas for f in clip['frames']), name
            assert all(0 < ms <= 1000 for ms in clip['durationsMs']), name
            assert len({hashlib.sha256((folder / 'frames' / (f + '.png')).read_bytes()).hexdigest() for f in clip['frames']}) == len(clip['frames']), name
            clips_count += 1
    manifest = read(HERE / 'preview_manifest.json')
    for entry in manifest['inputs']:
        assert hashlib.sha256((ROOT / entry['path']).read_bytes()).hexdigest() == entry['sha256'], entry['path']
    # Historical v01 metadata was reformatted before this task. Preserve it and
    # distinguish old hash discrepancies from changes made by this revision.
    retained = read(ROOT / 'assets/sprites/bosses/ly-mac-sau/package_manifest_v01.json')
    inventory = retained.get('files', retained.get('assets', []))
    assert inventory, 'Missing retained file inventory'
    historical_metadata_mismatches = []
    for entry in inventory:
        current = (ROOT / entry['path']).read_bytes()
        if hashlib.sha256(current).hexdigest() == entry['sha256']:
            continue
        assert Path(entry['path']).suffix in ['.json', '.tsj'], f'Retained raster/source changed: {entry["path"]}'
        committed = subprocess.run(['git', 'show', f'HEAD:{entry["path"]}'], cwd=ROOT, check=True, capture_output=True).stdout
        assert current == committed, f'Retained metadata changed in this task: {entry["path"]}'
        historical_metadata_mismatches.append(entry['path'])
    arena = Image.open(ROOT / 'assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png')
    arena.verify()
    report = dict(status='PASS', scope='asset_only_png_atlas_provenance', frames=count, clips=clips_count,
                  retainedHistoricalHashesMatched=len(inventory) - len(historical_metadata_mismatches),
                  historicalMetadataHashMismatches=historical_metadata_mismatches,
                  historicalMismatchExplanation='These metadata bytes already exist identically in the base HEAD; the old v01 manifest hashes are stale. No retained files were changed or re-approved.',
                  retainedFilesVerified=len(inventory), hashedPreviewInputs=len(manifest['inputs']), newPurpleFrames=16,
                  phaserVerified=False, directorApproved=False, recordingsCreated=False)
    (HERE / 'asset_verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps(report))


if __name__ == '__main__':
    verify()
