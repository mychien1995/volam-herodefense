"""Validate retained Chu rasters/atlas frames and exact director-approved bytes, no exports."""
from pathlib import Path
import json,hashlib
from PIL import Image
root=Path(__file__).resolve().parents[1]
lock=json.loads((root/'assets/approved_chu_ba_thong.lock.json').read_text(encoding='utf8'))
for name,expected in lock['files'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,name
pack=json.loads((root/'apps/game-client/src/chu-art.generated.json').read_text(encoding='utf8'));frames=0;clips=0
for key,b in pack['bundles'].items():
 im=Image.open(root/b['image']).convert('RGBA');assert 0<=b['origin'][0]<=1 and 0<=b['origin'][1]<=1
 for name,f in b['frames'].items():
  r=f['frame'];x,y,w,h=[r[n] for n in ['x','y','w','h']];assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height,(key,name)
  assert im.crop((x,y,x+w,y+h)).getchannel('A').getbbox(),(key,name,'empty')
 for a in b['animations']:
  assert a['frameRate']>0 and a['frames'];assert all(f in b['frames'] for f in a['frames']);frames+=len(a['frames']);clips+=1
source=json.loads((root/'maps/boss_chu_ba_thong.tmj').read_text(encoding='utf8'));assert source==pack['map']
assert source==json.loads((root/'packages/game-data/src/chu-ba-thong-map.json').read_text(encoding='utf8'))
assert {'hero_spawn','boss_spawn','exit_portal'}<=set(o['name'] for l in source['layers'] if l['name']=='markers' for o in l['objects'])
print(json.dumps({'approvedInputs':len(lock['files']),'nonemptyFrameReferences':frames,'clips':clips,'status':'PASS'}))
