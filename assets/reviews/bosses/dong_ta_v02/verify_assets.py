"""PNG/atlas/provenance checks for the art demo only."""
from pathlib import Path
from PIL import Image
import json,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
data=read(HERE/'data.json');report={'status':'RUNNING','scope':'asset_demo_only','newFrames':0,'newClips':0,'errors':[],'runtimeIntegrated':False,'serverGameplayVerified':False,'recordings':False}
try:
 for key in ['actions','fx','maifx']:
  b=data['bundles'][key];image=Image.open(ROOT/b['image']).convert('RGBA')
  hashes=[]
  for name,f in b['frames'].items():
   r=f['frame'];assert 0<=r['x'] and r['x']+r['w']<=image.width and r['y']+r['h']<=image.height
   im=image.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
   assert im.tobytes()==Image.open((ROOT/b['image']).parent/'frames'/(name+'.png')).convert('RGBA').tobytes()
   assert set(im.getchannel('A').getdata())=={0,255},(name,'binary alpha')
   box=im.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<im.width and box[3]<im.height,(name,'edge padding')
   report['newFrames']+=1
  for c in b['clips']:
   assert len(c['frames'])==4 and c['fps']>0
   hs=[]
   for f in c['frames']:
    assert f in b['frames']
    im=Image.open((ROOT/b['image']).parent/'frames'/(f+'.png'));hs.append(hashlib.sha256(im.tobytes()).hexdigest())
   assert len(set(hs))==4,(key,c['name'],'distinct authored drawings')
   report['newClips']+=1
 assert report['newFrames']==80 and report['newClips']==20
 for key,b in data['bundles'].items():
  assert (ROOT/b['image']).is_file()
  for c in b['clips']:assert all(f in b['frames'] for f in c['frames'])
 for item in read(HERE/'provenance.json')['retained']:
  assert sha(ROOT/item['path'])==item['sha256'],item['path']
 for item in read(HERE/'provenance.json')['newSources']:
  with Image.open(ROOT/item['path']) as im:im.verify()
  assert sha(ROOT/item['path'])==item['sha256']
 assert data['serverMechanics'] is False and data['runtimeIntegrated'] is False
 report.update(status='PASS',packages=len(data['bundles']),checks=['PNG decode','80 individual cels equal atlas pixels','transparent binary alpha','canvas padding','20 clips have four distinct drawings','all retained atlas/clip references','source and retained hashes','preview-only authority flags'])
except Exception as e:report['errors'].append(str(e));report['status']='FAIL'
(HERE/'static_verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False));raise SystemExit(report['status']!='PASS')

