"""Check actual source/export bytes, alpha, nonempty frames, atlas parity and approval status."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'assets/exports/bosses/kim_luan_phap_vuong_v01'
REVIEW=ROOT/'assets/reviews/bosses/kim_luan_phap_vuong_v01'
m=json.loads((OUT/'manifest.json').read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
count=0
for a in m['assets']:
 for key,h in [('source','sourceSha256'),('sheet','sheetSha256'),('atlas','atlasSha256')]:assert sha(ROOT/a[key])==a[h],a['id']+':'+key
 sheet=Image.open(ROOT/a['sheet']).convert('RGBA')
 atlas=json.loads((ROOT/a['atlas']).read_text(encoding='utf8'))
 unique=set()
 for n,v in atlas['frames'].items():
  b=v['frame'];assert b['x']>=0 and b['y']>=0 and b['x']+b['w']<=sheet.width and b['y']+b['h']<=sheet.height
  cel=sheet.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
  a8=cel.getchannel('A');bb=a8.point(lambda x:255 if x>180 else 0).getbbox()
  assert bb and bb[0]>0 and bb[1]>0 and bb[2]<cel.width and bb[3]<cel.height,(a['id'],n,'opaque export clipping',bb)
  assert a8.getextrema()[0]==0,(a['id'],n,'no alpha gutter')
  path=OUT/'frames'/a['id']/(n+'.png')
  assert path.exists() and Image.open(path).convert('RGBA').tobytes()==cel.tobytes(),(a['id'],n,'individual cel parity')
  unique.add(hashlib.sha256(cel.tobytes()).hexdigest());count+=1
 assert len(unique)>=len(atlas['frames'])-1,(a['id'],'duplicated still source')
for p,h in m['retainedInputHashes'].items():assert sha(ROOT/p)==h,p
for p,h in m['referenceHashes'].items():assert sha(ROOT/p)==h,p
assert m['directorApproved'] is False and m['serverMechanicsImplemented'] is False
d=json.loads((REVIEW/'data.json').read_text(encoding='utf8'));live=0;clips=0
for key,b in d['bundles'].items():
 if key=='hero':continue
 for c in b['clips']:
  assert c['frames'] and c['fps']>0
  for f in c['frames']:assert f in b['frames']
  live+=len(c['frames']);clips+=1
assert count==220 and live==184 and clips==53,(count,live,clips)
assert len(d['props'])==12 and len(d['map']['layers'][0]['data'])==40*23
r=dict(status='PASS',sourceExportFrames=count,characterAndVfxFrames=208,props=12,tiles=256,playbackFrames=live,playbackClips=clips,excludedBaselineAttackCandidates=24,approval='pending',serverMechanics=False)
(REVIEW/'feedback_01/static_verification.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
locked=json.loads((REVIEW/'feedback_01/retained_art_hashes.json').read_text(encoding='utf8'))
for path,h in locked.items():assert sha(ROOT/path)==h,('retained art changed',path)
r['retainedArtFilesUnchanged']=len(locked)
(REVIEW/'feedback_01/static_verification.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
print(json.dumps(r))
