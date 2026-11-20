"""Enforce the user-approved scope: exactly one facing's idle/walk/basic12, with all other raster cels unchanged."""
from pathlib import Path
import json,hashlib
from hero_unified_assets import locked
locked();result={'status':'PASS','newCels':24,'branches':{}}
for old,new in [('thien-son-phien-unified-v1','thien-son-phien-unified-v2'),('thien-son-dao-unified-v2','thien-son-dao-unified-v3')]:
 root=Path('assets/source');a=json.loads((root/old/'manifest.json').read_text());b=json.loads((root/new/'manifest.json').read_text());aa={f['frame']:f['sha256'] for g in a['groupsAuthored'] for f in g['frames']};bb={f['frame']:f['sha256'] for g in b['groupsAuthored'] for f in g['frames']};cfg=json.loads((root/new/'profile.json').read_text());expected={p+'_down_right' for p in cfg['poses'][:12]};changed={k for k in aa if aa[k]!=bb[k]};assert changed==expected,(new,changed);assert a['scale']==b['scale']==.5;assert a['pivot']==b['pivot']
 for avatar in ['avatar.png','avatar-body.png']:assert (Path('assets/exports')/old/avatar).read_bytes()==(Path('assets/exports')/new/avatar).read_bytes(),'HUD portrait remains baseline'
 v=json.loads((root/new/'native-validation.json').read_text());assert v['bodyPNG']==hashlib.sha256((Path('assets/exports')/new/'body.png').read_bytes()).hexdigest();result['branches'][new]={'changed':sorted(changed),'retainedCels':len(aa)-12,'nativeFrames':v['nativeFrames'],'tags':len(v['nativeTags']),'bodyPNG':v['bodyPNG']}
Path('.cache/thien-son-sharp-scope.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS:24 new cels,456 retained; same scale/pivot/HUD portraits and approved locks')
