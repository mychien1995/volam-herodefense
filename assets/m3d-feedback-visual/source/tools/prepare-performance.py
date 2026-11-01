"""Copy retained actor poses, byte-for-byte, for the isolated performance viewer only."""
from pathlib import Path
import hashlib, json, shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'assets/m3d-feedback-visual'
OUT = BASE / 'previews/support'
OUT.mkdir(parents=True, exist_ok=True)

def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

components, files = [], []

def retain(path, dest):
    target = OUT / dest
    shutil.copyfile(path, target)
    assert sha(path) == sha(target)
    files.append({'source': path.relative_to(ROOT).as_posix(),
                  'copy': target.relative_to(BASE).as_posix(), 'sha256': sha(path)})
    return target.relative_to(BASE).as_posix()

for hero in ['hero_thieu_lam', 'hero_thieu_lam_dao', 'hero_vo_dang',
             'hero_vo_dang_kiem', 'hero_thien_son_dao', 'hero_cai_bang',
             'hero_cai_bang_chuong']:
    folder = ROOT / 'assets/exports/characters'
    atlas = read(folder / (hero + '.json'))
    names = list(atlas['frames'])
    dim = atlas['frames'][names[0]]['sourceSize']
    clips = []
    for tag in atlas['meta']['frameTags']:
        selected = names[tag['from']:tag['to'] + 1]
        clips.append({'name': tag['name'], 'frames': selected,
                      'frameDurationsMs': [atlas['frames'][n]['duration'] for n in selected],
                      'loop': tag['name'].startswith(('idle_', 'walk_'))})
    components.append({'id': hero, 'sheet': retain(folder / (hero + '.png'), hero + '.png'),
                       'atlas': retain(folder / (hero + '.json'), hero + '.json'),
                       'pivot': [dim['w'] / 2, dim['h'] * .8], 'animations': clips,
                       'use': 'retained idle/walk/basic poses; not newly drawn M3D artwork'})

sources = [
    ('retained_la_han', 'assets/exports/skills/thieu-lam/la_han_quyen/la_han_quyen_character.animations.json'),
    ('retained_vi_da', 'assets/exports/skills/thieu-lam/vi_da_quyen/vi_da_quyen_character.animations.json'),
    ('retained_nhu_lai', 'assets/exports/skills/thieu-lam/nhu_lai_niet_ban/nhu_lai_niet_ban_character.animations.json'),
    ('retained_bach_liet', 'assets/exports/skills/thien-son/bach_liet_thien_kich/bach_liet_thien_kich_character.animations.json'),
    ('retained_khang_long', 'assets/exports/skills/cai-bang/khang_long_huu_hoi/khang_long_huu_hoi_character.animations.json'),
    ('retained_staff', 'assets/exports/skills/m3c3_feedback_v2_batches/01_cai_bang/bong_controls_v2/bong_controls_v2_character.animations.json'),
]
for identity, path in sources:
    original = ROOT / path
    meta = read(original)
    retain(original, identity + '.original.animations.json')
    components.append({'id': identity,
                       'sheet': retain(ROOT / meta['sheet'], identity + '.png'),
                       'atlas': retain(ROOT / meta['atlas'], identity + '.json'),
                       'pivot': meta.get('pivot', [meta['frameDimensions'][0]/2, meta['frameDimensions'][1]*.8]),
                       'animations': meta['animations'],
                       'use': 'retained cast pose with M3D VFX; old approval/waiver is not new approval'})

for c in components:
    atlas = read(BASE / c['atlas'])
    sheet = Image.open(BASE / c['sheet']).convert('RGBA')
    c['bounds'] = {}
    for name, record in atlas['frames'].items():
        r = record['frame']
        c['bounds'][name] = sheet.crop((r['x'], r['y'], r['x']+r['w'], r['y']+r['h'])).getbbox()

data = {'scope': 'Preview-only retained actor support. Not added to the production asset manifest.',
        'license': 'Exact project asset reuse; inherited provenance/rights. No new license or approval asserted.',
        'productionIntegrated': False, 'newArtwork': False, 'components': components, 'files': files}
(OUT / 'manifest.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Retained {len(components)} actor atlases / {len(files)} exact source copies')
