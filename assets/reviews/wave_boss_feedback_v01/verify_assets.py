"""Static provenance/atlas validation for this isolated candidate only."""
from pathlib import Path
from PIL import Image
import hashlib
import json

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
data=json.loads((BASE/'data.json').read_text(encoding='utf-8'))
checked=0
for name,digest in manifest['protected'].items():
    assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest, name
for item in manifest['outputs']:
    assert hashlib.sha256((ROOT/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
for asset in manifest['new']:
    source=asset['source']
    assert hashlib.sha256((ROOT/source['path']).read_bytes()).hexdigest()==source['sha256']
    assert 0<asset['sharedScale']<=1, 'Do not upscale the candidate exports'
for key,b in data['bundles'].items():
    im=Image.open(ROOT/b['image'].lstrip('/')).convert('RGBA')
    for name,f in b['frames'].items():
        r=f['frame'];x,y,w,h=(r[n] for n in ['x','y','w','h'])
        assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height,(key,name)
        assert im.crop((x,y,x+w,y+h)).getchannel('A').getbbox(),(key,name,'empty')
        checked+=1
    for name,c in b['clips'].items():
        assert len(c['frames'])==len(c['durations']) and all(n>0 for n in c['durations'])
        assert all(f in b['frames'] for f in c['frames'])
assert manifest['runtimeIntegrated'] is False and manifest['serverMechanics'] is False
print(json.dumps({'status':'PASS','bundles':len(data['bundles']),'frames':checked,'protectedFiles':len(manifest['protected']),'newAssets':len(manifest['new']),'runtimeIntegrated':False}))
