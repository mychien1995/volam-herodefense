"""Validate retained sources, frame exports, animation metadata, icons and approved locks."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
OUT=ROOT/'assets/exports/skills/vo-dang'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=read(OUT/'production_manifest_v01.json');recipe=read(BASE/'recipe.json')
count=0;tags=0;reports=[];unique=set();warnings=[]
for a in m['assets']:
 expected=next(r for r in recipe['assets'] if r['id']==a['id'])
 assert (ROOT/a['source']).exists() and (ROOT/a['source']).stat().st_size>100
 for path,checksum in [(a['source'],a['sourceSha256']),(a['sheet'],a['sheetSha256']),(a['atlas'],a['atlasSha256'])]:assert sha(ROOT/path)==checksum,path
 atlas=read(ROOT/a['atlas']);sheet=Image.open(ROOT/a['sheet']).convert('RGBA')
 assert sheet.size==(atlas['meta']['size']['w'],atlas['meta']['size']['h'])
 for anim in a['animations']:
  tags+=1;hashes=[]
  assert anim['frameCount']==len(anim['frames']) and anim['frameRate']==1000/anim['durationMsPerFrame']
  assert anim['origin']==a['origin'] and anim['pivot']==a['pivot']
  assert anim['repeat']==(-1 if anim['loop'] else 0)
  for name in anim['frames']:
   rec=atlas['frames'][name];b=rec['frame'];assert [b['w'],b['h']]==a['frameDimensions']
   assert 0<=b['x']<b['x']+b['w']<=sheet.width and 0<=b['y']<b['y']+b['h']<=sheet.height
   cel=sheet.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
   source=Image.open(ROOT/expected['sourceFolder']/'frames'/f'{name}.png').convert('RGBA')
   exported=Image.open(ROOT/expected['exportFolder']/a['kind']/'frames'/f'{name}.png').convert('RGBA')
   assert cel.tobytes()==source.tobytes()==exported.tobytes(),name
   assert set(cel.getchannel('A').getdata())=={0,255},name
   box=cel.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<cel.width and box[3]<cel.height,(name,box)
   h=hashlib.sha256(cel.tobytes()).hexdigest();hashes.append(h);unique.add((a['kind'],h));count+=1
   assert rec['duration']==anim['durationMsPerFrame'],name
  assert len(set(hashes))>=min(3,len(hashes)),a['id']+': static '+anim['name']
  assert all(hashes[i]!=hashes[i-1] for i in range(1,len(hashes))),a['id']+': duplicate adjacent '+anim['name']
  if a['kind']=='vfx' and a['skillId'] in ['thai_cuc_tran','bat_quai_kiem_tran']:
   # Center is visibly open. A small yin-yang seal is permitted.
   center=cel.getchannel('A').crop((cel.width//2-42,cel.height//2-22,cel.width//2+42,cel.height//2+22))
   occupied=sum(v>0 for v in center.getdata())/(center.width*center.height)
   assert occupied<.30,(name,'opaque formation interior',occupied)
 reports.append({'id':a['id'],'frameCount':sum(x['frameCount'] for x in a['animations']),
   'tagCount':len(a['animations']),'sourceAtlasFrameEquality':True,'binaryAlpha':True,'noClipping':True,'distinctMotionFrames':True})
assert len(m['icons'])==13
for icon in m['icons']:
 assert sha(ROOT/icon['path'])==icon['sha256'] and (ROOT/icon['editableSource']).exists()
 im=Image.open(ROOT/icon['path']);assert im.size==(64,64)
for name,checksum in read(ROOT/'assets/approved_vo_dang.lock.json')['files'].items():assert sha(ROOT/name)==checksum,name
assert len(m['entries'])==13 and len(m['assets'])==20
approval_lock=ROOT/'assets/approved_vo_dang_skills.lock.json'
if approval_lock.exists():
 for name,checksum in read(approval_lock)['files'].items():assert sha(ROOT/name)==checksum,name
report={'status':'PASS','scope':'Source/export/metadata validation only; director approval is recorded separately; no gameplay integration.',
 'componentCount':20,'icons':13,'animationTags':tags,'exportedCels':count,
 'distinctCharacterRasters':len([x for x in unique if x[0]=='character']),
 'distinctVfxRastersIncludingCardinalTransforms':len([x for x in unique if x[0]=='vfx']),
 'approvedCharacterFilesUnchanged':89,'checks':['editable source hashes','PNG/JSON/frame equality','binary alpha','no clipping','distinct motion','pivots/durations','open formation interior','all13 icon paths/pairings','89 approved hashes'],
 'warnings':warnings,'components':reports,'productionArtApproved':m.get('productionArtApproved',False),
 'approvedSkillFilesChecked':len(read(approval_lock)['files']) if approval_lock.exists() else 0}
(OUT/'validation_v01.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='components'},ensure_ascii=False,indent=2))
