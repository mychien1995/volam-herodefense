from pathlib import Path
from PIL import Image
import json,hashlib
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=read(BASE/'manifest.json');data=read(BASE/'data.json');refs=0
lock=read(ROOT/'assets/approved_wave_boss_feedback_v02.lock.json')
for p,h in {**m['protected'],**lock['files']}.items():assert hash(ROOT/p)==h,p
for key,b in data['bundles'].items():
    im=Image.open(ROOT/b['image'].lstrip('/')).convert('RGBA')
    for name,c in b['clips'].items():
        assert len(c['frames'])==len(c['durations']) and all(t>0 for t in c['durations']),(key,name)
        for frame in c['frames']:
            refs+=1;r=b['frames'][frame]['frame'];x,y,w,h=[r[k] for k in ['x','y','w','h']]
            assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height,(key,frame)
            assert im.crop((x,y,x+w,y+h)).getchannel('A').getbbox(),(key,frame,'empty')
for a in m['new']:
    assert hash(ROOT/a['source'])==a['sha256']
    im=Image.open(BASE/'exports'/f"{a['id']}.png").convert('RGBA')
    assert hash(BASE/'exports'/f"{a['id']}.png")==a['exportSha256']
    atlas=read(BASE/'exports'/f"{a['id']}.json")
    assert atlas['frames']==data['bundles'][a['id']]['frames']
    assert len({hash(BASE/'exports'/f"{a['id']}_{i}.png") for i in range(4)})==4
    for i in range(4):
        cel=Image.open(BASE/'exports'/f"{a['id']}_{i}.png").convert('RGBA');w,h=a['cellSize']
        crop=im.crop((i*w,0,(i+1)*w,h))
        assert crop.getchannel('A').tobytes()==cel.getchannel('A').tobytes()
        assert all(p==q for p,q in zip(crop.getdata(),cel.getdata()) if p[3]>0)
result={'status':'PASS','scope':'Static assets/preview only; no gameplay or director approval','bundles':len(data['bundles']),'frameReferences':refs,'newCels':16,'lockedReviewInputs':len(lock['files']),'historicalProductionFiles':len(m['productionBaseline']),'recordingsCreated':False}
(BASE/'evidence/asset-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
