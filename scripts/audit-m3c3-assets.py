"""Read retained PNG/JSON exports; never produce or modify artwork."""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/evidence/m3c3'
OUT.mkdir(parents=True, exist_ok=True)
inventory = {'scope': 'M3C3 retained Thieu Lam assets; dimensions, atlas frames, provenance and approved sources', 'schools': {}}
thumbs = []
for school in ['thieu-lam']:
    underscore = school.replace('-', '_')
    files = sorted(set((ROOT/'assets/exports/skills'/school).rglob('*.png')) |
                   set((ROOT/'assets/exports/characters').glob('*'+underscore+'*.png')) |
                   set((ROOT/'assets/exports/characters'/(underscore+'_v01')).rglob('*.png')))
    entries = []
    for path in files:
        im = Image.open(path)
        entry = {'file': path.relative_to(ROOT).as_posix(), 'dimensions': list(im.size), 'mode': im.mode,
                 'transparent': im.mode == 'RGBA' and im.getextrema()[3][0] == 0}
        metadata = path.with_suffix('.json')
        if metadata.exists():
            atlas = json.loads(metadata.read_text(encoding='utf8'))
            frames = atlas.get('frames', {})
            entry['frameCount'] = len(frames)
            entry['frameDimensions'] = sorted({(f['frame']['w'], f['frame']['h']) for f in frames.values()})
            entry['frameNames'] = list(frames)
            for name, frame in frames.items():
                r = frame['frame']
                assert r['x'] >= 0 and r['y'] >= 0 and r['x']+r['w'] <= im.width and r['y']+r['h'] <= im.height, (path, name)
            entry['atlasMeta'] = atlas.get('meta', {})
        animations = path.with_suffix('.animations.json')
        if animations.exists(): entry['animationMetadata'] = json.loads(animations.read_text(encoding='utf8'))
        entries.append(entry)
    manifest = ROOT/'assets/exports/skills'/school/'production_manifest_v01.json'
    data = json.loads(manifest.read_text(encoding='utf8'))
    inventory['schools'][school] = {'files': entries, 'productionManifest': manifest.relative_to(ROOT).as_posix(),
        'assets': data.get('assets', []), 'provenance': data.get('provenance', data.get('status')),
        'characterProduction': json.loads((ROOT/'assets/source/characters'/(underscore+'_v01')/'production_manifest_v01.json').read_text(encoding='utf8')),
        'skillProvenance': json.loads((ROOT/'assets/exports/skills'/school/'provenance_manifest_v01.json').read_text(encoding='utf8')) if (ROOT/'assets/exports/skills'/school/'provenance_manifest_v01.json').exists() else 'See production manifest and per-icon provenance files',
        'runtimeIntegratedThisBatch': school == 'thieu-lam'}
    for path in (ROOT/'assets/exports/characters').glob('*'+underscore+'*.json'):
        atlas=json.loads(path.read_text(encoding='utf8')); name=next(iter(atlas['frames'])); r=atlas['frames'][name]['frame']
        im=Image.open(path.with_suffix('.png')).convert('RGBA').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
        thumbs.append((path.stem, im))
    if school == 'thieu-lam':
        for a in data['assets']:
            if a['kind'] != 'vfx': continue
            atlas=json.loads((ROOT/a['atlas']).read_text(encoding='utf8'))
            tag=a['animations'][0]; name=tag['frames'][min(2,len(tag['frames'])-1)]; r=atlas['frames'][name]['frame']
            im=Image.open(ROOT/a['sheet']).convert('RGBA').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
            thumbs.append((a['skillId'], im))
(OUT/'asset-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
sheet=Image.new('RGB',(1000,((len(thumbs)+3)//4)*190),'#273b35'); draw=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate(thumbs):
    im=ImageOps.contain(im,(235,150),Image.Resampling.NEAREST); x=(i%4)*250+(250-im.width)//2; y=(i//4)*190+25
    sheet.paste(im,(x,y),im); draw.text(((i%4)*250+5,(i//4)*190+5),label,fill='white')
sheet.save(OUT/'asset-contact-sheet.png')
print(json.dumps({k: {'pngs': len(v['files']), 'components':len(v['assets'])} for k,v in inventory['schools'].items()}))
