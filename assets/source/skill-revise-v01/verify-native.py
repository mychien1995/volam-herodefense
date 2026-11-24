"""Verify actual Aseprite export pixels against authored atlas, not implementation mocks."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
result=[]
for folder in sorted((ROOT/'assets/exports/skill-revise-v01').iterdir()):
    if not folder.is_dir():continue
    manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));atlas=json.loads((folder/'body.json').read_text())
    native=ROOT/'assets/source/skill-revise-v01/native'/str(folder.name+'.aseprite')
    header=native.read_bytes();assert struct.unpack_from('<H',header,4)[0]==0xA5E0
    names=[name for clip in manifest['clips'] for name in clip['frames']]
    assert len(names)==len(manifest['frames'])==struct.unpack_from('<H',header,6)[0]
    w,h=manifest['canvas'];im=Image.open(folder/'body.png').convert('RGBA');rt=Image.open(ROOT/'.cache/skill-revise-native'/str(folder.name+'.png')).convert('RGBA')
    proof={f['name']:f['sha256'] for f in manifest['frames']}
    for i,name in enumerate(names):
        f=atlas['frames'][name];b=f['frame'];s=f['spriteSourceSize'];tile=Image.new('RGBA',(w,h));tile.alpha_composite(im.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h'])),(s['x'],s['y']))
        assert hashlib.sha256(tile.tobytes()).hexdigest()==proof[name],(folder.name,name,'atlas proof')
        a=np.array(tile);b=np.array(rt.crop((i%16*w,i//16*h,i%16*w+w,i//16*h+h)))
        assert np.array_equal(a[:,:,3],b[:,:,3]),(folder.name,name,'native alpha')
        v=a[:,:,3]>0;assert np.array_equal(a[:,:,:3][v],b[:,:,:3][v]),(folder.name,name,'native RGB')
    result.append({'id':folder.name,'frames':len(names),'native_sha256':hashlib.sha256(header).hexdigest(),'roundtrip':'exact alpha and visible RGB'})
report={'status':'PASS','scope':'native Aseprite pixel roundtrip, not gameplay','packs':result,'frames':sum(r['frames'] for r in result)}
(ROOT/'assets/source/skill-revise-v01/native-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':'PASS','packs':len(result),'frames':report['frames']}))
