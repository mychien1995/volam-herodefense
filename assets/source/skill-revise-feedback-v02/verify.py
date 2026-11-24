"""Check corrected rasters, approved-byte locks and the native roundtrip."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-feedback-v02'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
total=0;records=[]
catalogue=json.loads((OUT/'catalogue.json').read_text(encoding='utf-8'));assert len(catalogue['assets'])==3
for p in catalogue['assets']:
    folder=(ROOT/p['sourceAtlas']).parent;atlas=json.loads((folder/'body.json').read_text());sheet=Image.open(folder/'body.png');manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
    expected=[n for c in p['clips'] for n in c['frames']];assert len(expected)==len(set(expected));assert set(expected)==set(atlas['frames'])
    assert sheet.mode=='RGBA' and max(sheet.size)<=4096
    for source in manifest['sources']:assert sha(ROOT/source['path'])==source['sha256']
    canvas=manifest['canvas'];native=Image.open(SRC/'native'/str(p['id']+'-roundtrip.png')).convert('RGBA');proof={x['name']:x['sha256'] for x in manifest['frames']}
    for i,n in enumerate(expected):
        a=atlas['frames'][n];f=a['frame'];s=a['spriteSourceSize'];tile=Image.new('RGBA',canvas);tile.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']))
        assert hashlib.sha256(tile.tobytes()).hexdigest()==proof[n],n
        actual=native.crop(((i%16)*canvas[0],(i//16)*canvas[1],(i%16+1)*canvas[0],(i//16+1)*canvas[1]));aa=np.array(actual);bb=np.array(tile)
        assert np.array_equal(aa[:,:,3],bb[:,:,3]),(n,'native alpha')
        visible=bb[:,:,3]>0;assert np.array_equal(aa[:,:,:3][visible],bb[:,:,:3][visible]),(n,'native visible RGB')
        assert tile.getbbox()[0]>1 and tile.getbbox()[1]>1 and tile.getbbox()[2]<canvas[0]-1 and tile.getbbox()[3]<canvas[1]-1
    count=len(expected);total+=count;records.append({'id':p['id'],'frames':count,'pngSha256':sha(folder/'body.png'),'atlasSha256':sha(folder/'body.json'),'nativeSha256':sha(SRC/'native'/str(p['id']+'.aseprite'))})
assert total==256,total
registration=json.loads((SRC/'registration.json').read_text());assert len(registration)==8
for r in registration:
    assert len(r['roots'])==24 and .2<r['uniformScale']<.8
    assert max(abs(h/89-1) for h in r['neutralBodyHeights'])<.15,(r['direction'],r['neutralBodyHeights'])
for lock in ['concepts-2026-11-22.json','motion-review-2026-11-23.json']:
    approval=json.loads((ROOT/'assets/approvals/skill-revise'/lock).read_text(encoding='utf-8'))
    for f in approval.get('files',approval.get('retainedAcceptedRasterEvidence',[])):assert sha(ROOT/f['path'])==f['sha256']
report={'status':'PASS','scope':'Corrected PNG/atlas/native source pixels and density registration; no art approval or authority claim','packs':records,'frames':total,'directions':8,'nativeFrames':total,'oldConceptAndAcceptedRasterBytesPreserved':True}
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['status','frames','directions','nativeFrames']}))
