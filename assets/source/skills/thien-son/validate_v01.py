from pathlib import Path
from PIL import Image
import json,hashlib,struct
ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'assets/exports/skills/thien-son'
SOURCE=ROOT/'assets/source/skills/thien-son'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before=read(SOURCE/'inventory_before_v01.json')['protectedAndConceptFiles']
for file,expected in before.items():assert sha(ROOT/file)==expected,('Protected art changed',file)
m=read(BASE/'production_manifest_v01.json');recipe=read(SOURCE/'recipe_v01.json')
approval=read(ROOT/'assets/concepts/skills/thien-son/concept_approval_v01.json')
assert m['complete'] and not m['productionArtApproved'] and not m['runtimeIntegrated']
assert len(m['assets'])==20 and len(m['icons'])==13 and len(m['skills'])==13
assert all(e['iconConceptApproved'] for e in approval['entries'])
assert sum(e['actionConceptApproved'] for e in approval['entries'])==10
assert len({a['id'] for a in m['assets']})==20
keys=set();frames=0;tags=0;reuse_cels=0;observed=[]
for asset in m['assets']:
 source=ROOT/asset['source'];sheet=ROOT/asset['sheet'];atlas=read(ROOT/asset['atlas'])
 assert source.is_file()
 raw=source.read_bytes();assert struct.unpack_from('<H',raw,4)[0]==0xA5E0
 assert [struct.unpack_from('<H',raw,8)[0],struct.unpack_from('<H',raw,10)[0]]==asset['frameDimensions']
 assert len(raw)>100
 im=Image.open(sheet);assert im.mode=='RGBA',(sheet,im.mode)
 assert set(im.getchannel('A').getdata())<={0,255}
 im=im.convert('RGBA')
 assert atlas['meta']['image']==sheet.name
 expected_n=sum(t['frameCount'] for t in asset['animations'])
 assert len(atlas['frames'])==expected_n
 assert struct.unpack_from('<H',raw,6)[0]==expected_n
 original=next(a for a in recipe['assets'] if a['id']==asset['id'])
 source_frames=ROOT/original['sourceFolder']/'frames'
 source_meta=read(BASE/asset['skillId']/(asset['id']+'.animations.json'))
 assert source_meta['animations']==asset['animations']
 for tag in asset['animations']:
  key=asset['id']+':'+tag['name'];assert key not in keys;keys.add(key);tags+=1
  assert tag['frameCount']==len(tag['frames'])>=2
  assert tag['frameRate']>0 and tag['repeat'] in [0,-1]
  assert tag['origin']==asset['origin']
  assert tag['frameDimensions']==asset['frameDimensions']
  unique=[]
  for name in tag['frames']:
   f=atlas['frames'][name];b=f['frame'];assert b['w']==asset['frameDimensions'][0] and b['h']==asset['frameDimensions'][1]
   assert 0<=b['x']<=im.width-b['w'] and 0<=b['y']<=im.height-b['h']
   cel=im.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
   src=Image.open(source_frames/(name+'.png')).convert('RGBA')
   assert src.size==cel.size and src.tobytes()==cel.tobytes(),('Source/atlas mismatch',key,name)
   bbox=cel.getchannel('A').getbbox();assert bbox,('Empty',key,name)
   assert bbox[0]>=1 and bbox[1]>=1 and bbox[2]<=cel.width-1 and bbox[3]<=cel.height-1,('Export clipping risk',key,name,bbox)
   assert abs(f['duration']-1000/tag['frameRate'])<=1,('Timing mismatch',key,name)
   fingerprint=hashlib.sha256(cel.tobytes()).hexdigest()
   assert not unique or fingerprint!=unique[-1],('Adjacent duplicate',key,name)
   unique.append(fingerprint);frames+=1
  assert len(set(unique))>=2,('Static animation',key)
 if asset['kind']=='character':
  assert asset['frameDimensions'][1]==80 and asset['pivot'][1]==64
  assert asset['origin']==[.5,.8]
  assert {a['direction'] for a in asset['animations']}=={'down','left','right','up'}
 for tag in original['animations']:
  for i,frame in enumerate(tag['frames']):
   if 'reusedFrame' not in frame:continue
   reuse_cels+=1
   source_img=Image.open(ROOT/frame['file']).convert('RGBA');r=frame['rect']
   approved=source_img.crop((r[0],r[1],r[0]+r[2],r[1]+r[3]))
   cel=Image.open(source_frames/(tag['name']+'_'+str(i)+'.png')).convert('RGBA')
   dx=asset['pivot'][0]-40;dy=asset['pivot'][1]-64
   assert cel.crop((dx,dy,dx+80,dy+80)).tobytes()==approved.tobytes(),('Approved reuse altered',asset['id'],tag['name'],i)
 observed.append({'id':asset['id'],'tags':len(asset['animations']),'frames':expected_n,'canvas':asset['frameDimensions'],'pivot':asset['pivot'],'source':asset['source']})
icons=read(BASE/'icons_manifest_v01.json');family=read(ROOT/icons['atlas']['data']);family_png=Image.open(ROOT/icons['atlas']['sheet']).convert('RGBA')
assert len(family['frames'])==13
hashes=[]
for icon in m['icons']:
 assert (ROOT/icon['source']).is_file()
 im=Image.open(ROOT/icon['file']).convert('RGBA');assert im.size==(64,64)
 assert im.getchannel('A').getextrema()==(255,255),'Opaque approved ink-teal icon ground is intentional'
 f=family['frames'][icon['id']]['frame']
 assert family_png.crop((f['x'],f['y'],f['x']+64,f['y']+64)).tobytes()==im.tobytes()
 assert icon['hashes']['png']==sha(ROOT/icon['file'])
 hashes.append(sha(ROOT/icon['file']))
assert len(set(hashes))==13
plans=read(BASE/'preview_plan_v01.json');assert len(plans['plans'])==13
assert plans['scope'].startswith('PRESENTATION-ONLY')
assert not next(p for p in plans['plans'] if p['id']=='bac_minh_than_cong')['effects']
assets={a['id']:a for a in m['assets']}
for plan in plans['plans']:
 for cue in plan['actors']+plan['effects']:
  if cue['asset'] in ['hero_thien_son','hero_thien_son_dao']:continue
  assert cue['asset'] in assets
  assert any(t['name']==cue['tag'] or t['name'].startswith(cue['tag']+'_') for t in assets[cue['asset']]['animations'])
result={'status':'PASS','scope':'Actual editable sources, individual cels, PNG/hash-JSON atlases and presentation metadata; Phaser verification recorded separately','components':20,'animationTags':tags,'exportedCels':frames,'icons':13,'iconAtlasFrames':13,'approvedFrameReuseCels':reuse_cels,'protectedAndConceptFilesUnchanged':len(before),'characterBodyHeightTarget':44,'characterHeight':80,'feetY':64,'alpha':'character/VFX binary transparent; approved icon ground intentionally opaque','assets':observed,'productionArtApproved':False}
(BASE/'validation_v01.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['assets']},ensure_ascii=False))

