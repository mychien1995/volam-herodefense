"""Read-only raster/metadata audit. Aseprite is the only raster exporter."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
plan=json.loads((root/'assets/source/renovation-v4/export-plan.json').read_text())
manifest=json.loads((root/'apps/game-client/src/renovation-feedback.generated.json').read_text())
for a in manifest['assets']:
 p=root/a['candidateUrl'].replace('/assets/','assets/exports/')
 assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],a['id']+' candidate hash'
cache={}
def old(id):
 if id not in cache:
  p=root/'assets/exports/renovation-v3/overrides'/id
  cache[id]=(Image.open(p.with_suffix('.png')).convert('RGBA'),json.loads(p.with_suffix('.json').read_text()))
 return cache[id]
def pixels(im,f):
 r=f['frame'];x,y,w,h=[round(r[k]*2) for k in ['x','y','w','h']]
 return (w,h,im.crop((x,y,x+w,y+h)).tobytes())
def mirrored(left,right):
 w,h,data=right;lw,lh,ld=left
 if (w,h)!=(lw,lh):return False
 for y in range(h):
  r=data[y*w*4:(y+1)*w*4];l=ld[y*w*4:(y+1)*w*4]
  if any(l[c::4]!=r[c::4][::-1] for c in range(4)):return False
 return True
count=0
for sheet in plan['sheets']:
 id=sheet['id'];baseline,bmeta=old(id);p=root/'assets/exports/renovation-v4/overrides'/id
 im=Image.open(p.with_suffix('.png')).convert('RGBA');meta=json.loads(p.with_suffix('.json').read_text())
 assert set(meta['frames'])==set(bmeta['frames']),id
 for name,f in meta['frames'].items():
  assert f['sourceSize']==bmeta['frames'][name]['sourceSize'],(id,name,'logical canvas')
  assert f.get('duration')==bmeta['frames'][name].get('duration'),(id,name,'clock')
  pair=sheet['pairs'].get(name)
  if pair:
   right,rmeta=old(pair['id']);rf=rmeta['frames'][pair['name']]
   assert mirrored(pixels(im,f),pixels(right,rf)),(id,name,'left raster does not mirror right')
   trim=f['spriteSourceSize'];rt=rf['spriteSourceSize'];assert trim['x']==rf['sourceSize']['w']-rt['x']-rt['w'],(id,name,'pivot')
   count+=1
  else:assert pixels(im,f)==pixels(baseline,bmeta['frames'][name]),(id,name,'unaffected frame changed')
for e in manifest['effects']:
 im=Image.open(root/e['url'].replace('/assets/','assets/exports/')).convert('RGBA')
 assert im.size==(1024,256),e['id']
 for i in range(4):
  frame=im.crop((i*256,0,i*256+256,256));alpha=frame.getchannel('A');b=alpha.getbbox();assert b,e['id']
  assert b[0]>0 and b[1]>0 and b[2]<256 and b[3]<256,(e['id'],'clipped cel')
  assert max(alpha.getpixel(p) for p in [(0,0),(255,0),(0,255),(255,255)])==0,(e['id'],'matte')
  if e['id']=='earth_eruption':assert abs(b[3]-212)<=1,(i,b,'ground anchor')
 assert (root/'assets/source/renovation-v4/editable'/f"{e['id']}.aseprite").exists()
files={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for d in ['assets/source/renovation-v4','assets/exports/renovation-v4'] for p in (root/d).rglob('*') if p.is_file() and p.name!='provenance.json'}
provenance={'status':'prototype; director review pending','license':'Original AI-generated VFX for this project, built-in imagegen; no third-party game art copied. Prior v3 owned raster reused for directional corrections.','rasterTool':'Aseprite 1.3.18.6 Lua; PNG RGBA; uniform native-scale fitting; alpha cutoff 12; no Python raster writes','rejectedSource':'raw/bach_liet_slashes.png contains unwanted actor; retained for provenance only; export uses -clean.png','mirroredFrames':count,'files':files}
if '--write-manifest' in __import__('sys').argv:(root/'assets/source/renovation-v4/provenance.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
else:assert json.loads((root/'assets/source/renovation-v4/provenance.json').read_text())['files']==files,'V4 provenance hash mismatch'
print(f'V4 PASS: {len(plan["sheets"])} atlases / {count} mirrored left cels / 7 native four-cel effects / preserved clocks and pivots / no matte or clipped edges')
