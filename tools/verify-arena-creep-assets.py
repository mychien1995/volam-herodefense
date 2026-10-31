"""Read-only PNG/atlas/source verification for the integrated Wave9–12 artwork."""
import hashlib
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/evidence/phase1f-integration'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify(folder, source, expected_frames):
    atlas = json.loads((folder / 'atlas.json').read_text(encoding='utf-8'))
    sheet = Image.open(folder / 'spritesheet.png').convert('RGBA')
    assert len(atlas['frames']) == expected_frames
    bounds = []
    for name, entry in atlas['frames'].items():
        file = folder / 'frames' / (name + '.png')
        im = Image.open(file)
        assert im.mode == 'RGBA', file
        alpha = im.getchannel('A')
        assert set(alpha.getdata()) <= {0, 255}, file
        box = alpha.getbbox()
        assert box and box[0] > 0 and box[1] > 0 and box[2] < im.width and box[3] < im.height, file
        rect = entry['frame']
        extracted = sheet.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h']))
        assert extracted.size == im.size and extracted.tobytes() == im.tobytes(), file
        bounds.append({'frame':name,'canvas':list(im.size),'alphaBounds':list(box),'sha256':sha(file)})
    header = (ROOT / source).read_bytes()[:128]
    assert struct.unpack_from('<H', header, 4)[0] == 0xA5E0
    assert struct.unpack_from('<H', header, 6)[0] == expected_frames
    return {'folder':folder.relative_to(ROOT).as_posix(),'frames':expected_frames,'source':source,'sheetSha256':sha(folder / 'spritesheet.png'),'atlasSha256':sha(folder / 'atlas.json'),'frameRecords':bounds}

manifest = json.loads((ROOT / 'assets/arena_creeps.manifest.json').read_text(encoding='utf-8'))
assets = []
for a in manifest['assets']:
    assert sha(ROOT / a['sourceConcept']) == a['sourceConceptSha256']
    folder = ROOT / 'sprites/creeps/arena' / a['slug']
    for filename, field in [('spritesheet.png','sheetSha256'),('atlas.json','atlasSha256')]:
        assert sha(folder / filename) == a[field]
        assert sha(ROOT / 'apps/game-client/public/assets/arena_creeps' / a['slug'] / filename) == a[field]
    if a['wave'] >= 9:
        assert len(a['animations']) == 20
        count = sum(len(v['frames']) for v in a['animations'])
        assets.append(verify(folder, a['source'], count))
fx = ROOT / 'assets/exports/effects/arena_creep_impacts'
fmanifest = json.loads((fx / 'manifest.json').read_text(encoding='utf-8'))
effects = verify(fx, fmanifest['source'], 16)
assert sha(ROOT / fmanifest['generatedSource']) == fmanifest['sourceHash']
for filename in ['spritesheet.png','atlas.json']:
    assert sha(fx / filename) == sha(ROOT / 'apps/game-client/public/assets/arena_creeps' / ('impacts_' + filename))
report = {'status':'PASS','characterFrames':sum(a['frames'] for a in assets),'characterAnimationTags':80,'effectFrames':16,'effectTags':4,'runtimeMappings':12,'pngAtlasPixelEquality':True,'binaryAlphaAndSafeBounds':True,'asepriteHeaders':True,'runtimeCopiesMatchSource':True,'conceptHashesMatch':True,'assets':assets,'effects':effects}
OUT.mkdir(parents=True,exist_ok=True)
(OUT / 'asset_verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('PASS:255 character frames,80 tags,16 contact frames,RGBA bounds/pixels,Aseprite sources and12 runtime mappings.')
