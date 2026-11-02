"""Validate actual raster exports and immutable reused inputs; no runtime approval."""
from pathlib import Path
from PIL import Image
import hashlib,json
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
packages=read(HERE/'packages.json'); inputs=[]; total=0; clips=0
for key,p in packages.items():
 folder=ROOT/p['path'].lstrip('/')
 atlas=read(folder/p['atlas']); sheet=Image.open(folder/p['image']).convert('RGBA')
 for tag,a in p['animations'].items():
  assert len(a['frames'])==len(a['durationsMs']) and min(a['durationsMs'])>0
  hashes=[]
  for name in a['frames']:
   f=atlas['frames'][name]['frame']; box=(f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])
   assert box[0]>=0 and box[1]>=0 and box[2]<=sheet.width and box[3]<=sheet.height
   cel=sheet.crop(box); assert cel.getbbox(),name
   hashes.append(hashlib.sha256(cel.tobytes()).hexdigest())
   if key!='hero':total+=1
  if key!='hero':assert len(set(hashes))==len(hashes),(key,tag,'duplicated cels');clips+=1
 for name in [p['image'],p['atlas']]:
  file=folder/name;inputs.append(dict(path=file.relative_to(ROOT).as_posix(),sha256=sha(file)))
for rec in read(HERE/'extraction_recipes.json')+read(HERE/'feedback01/extraction_recipes.json'):
 frame=next(HERE.glob('**/frames/'+rec['frame']+'.png'))
 assert sha(frame)==rec['sha256']
 assert (ROOT/rec['source']).is_file()
for folder in ['cap_mo_v02','effects_v02','actions_v02','feedback01/snakes_8','feedback01/staff_180']:
 m=read(HERE/folder/'manifest.json')
 assert sha(ROOT/m['source'])==m['sourceSha256'],folder
assert total==508,total
snake_frames=[Image.open(HERE/'feedback01/snakes_8/frames'/('snake_facing_8_'+str(i)+'.png')).convert('RGBA') for i in range(8)]
assert len({im.crop((0,148,256,179)).tobytes() for im in snake_frames})==1,'snake bases drift'
for p in (HERE/'feedback01/staff_180/frames').glob('*.png'):
 im=Image.open(p).convert('RGBA');a=im.getchannel('A')
 assert not a.crop((0,0,256,512)).getbbox(),'staff extends behind caster'
 for y in range(512):
  for x in range(256,512):
   if a.getpixel((x,y)):assert (x-256)**2+(y-256)**2<=(160+1)**2,'staff outside radius'
for file in [HERE/'review.js',HERE/'feedback03/tuning.json']:
 inputs.append(dict(path=file.relative_to(ROOT).as_posix(),sha256=sha(file)))
# All pre-existing Tay Doc source/export/concept bytes remain unchanged against Git.
import subprocess
old=subprocess.run(['git','diff','--name-only','--','assets/sprites/bosses/main/tay-doc','assets/effects/bosses/main/tay-doc','assets/concepts/main-bosses/tay-doc'],cwd=ROOT,capture_output=True,text=True,check=True)
assert not old.stdout.strip(),old.stdout
save(HERE/'preview_manifest.json',dict(status='prototype_pending_director_review',date='2026-11-01',revision='feedback03',scope='Standalone Phaser 4.2.1 art timeline. No production loader, encounter, server, damage or multiplayer integration.',newActorCels=20,newVfxSummonCels=40,retainedBossVfxCels=448,validatedCels=total,clips=clips,characterNewFacings=['right'],baselineFacings=['down','left','right','up'],snakeFacings=8,source='Retained v01 image_gen assets plus five focused built-in image_gen source sheets; flattened PNG raster, no layered source claimed.',provenance='generation_prompts.json + extraction_recipes.json + feedback01/ equivalents + per-component manifest.json',license='Original AI-assisted raster artwork generated for this project; no external sprite pack and no exclusive copyright claim.',runtimeIntegrated=False,multiplayerVerified=False,directorApproved=False,inputs=inputs))
report=dict(status='PASS',bossVfxCels=total,clips=clips,newFrames=60,snakeFacings=8,snakeBasesIdentical=True,staffFrontSemicircleDegrees=180,retainedOriginalsUnchanged=True,alphaAndBounds=True,distinctCels=True,recordingsCreated=False)
save(HERE/'asset_verification.json',report);print(json.dumps(report))

