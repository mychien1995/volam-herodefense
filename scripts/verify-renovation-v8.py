"""Read-only native raster audit; Aseprite performs all raster authoring/export."""
from pathlib import Path
import hashlib,json,math,sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'apps/game-client/src/renovation-reach.generated.json').read_text());count=0
for a in m['assets']:
 p=root/a['url'].replace('/assets/','assets/exports/');assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
 atlas=json.loads(p.with_suffix('.json').read_text());im=Image.open(p).convert('RGBA');expected=4 if a['id']=='staff_fissure' else 16;assert len(atlas['frames'])==expected
 hashes=[]
 def pixel(f,x,y):
  r,t=f['frame'],f['spriteSourceSize'];xx=x-t['x'];yy=y-t['y']
  return im.getpixel((r['x']+xx,r['y']+yy)) if 0<=xx<t['w'] and 0<=yy<t['h'] else (0,0,0,0)
 for name,f in atlas['frames'].items():
  r,t,s=f['frame'],f['spriteSourceSize'],f['sourceSize'];assert [s['w'],s['h']]==[1024,1280]
  assert t['x']>0 and t['y']>0 and t['x']+t['w']<s['w'] and t['y']+t['h']<s['h'],(a['id'],name,'clipping')
  assert not f['rotated'] and f['duration']>0
  cel=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));alpha=cel.getchannel('A');assert alpha.getbbox() and alpha.getextrema()[1]>=230
  assert not any(0<v<12 for v in alpha.getdata());hashes.append(hashlib.sha256(cel.tobytes()).hexdigest());count+=1
  if name.endswith('_2'):
   d=name.split('_')[0];contact=m['contacts'][d];x,y=512+round(contact[0]),819+round(contact[1]);near=[pixel(f,xx,yy) for xx in range(x-3,x+4) for yy in range(y-3,y+4)]
   assert any(aa>=200 and rr>=150 and gg>=70 for rr,gg,bb,aa in near),(a['id'],name,'actual cap/trail pixels at long contact')
 assert len(set(hashes))==expected,(a['id'],'duplicate cel')
 if a['id']=='staff_fissure':
  f=atlas['frames']['2']
  for x in range(0,401,40):assert max(pixel(f,512+x,819+y)[3] for y in range(-15,16))>=100,('broken forward fissure',x)
 assert (root/f"assets/source/renovation-v8/editable/{a['id']}.aseprite").exists()
for d,v in m['contacts'].items():assert math.hypot(*v)*.5>=(190 if d in ['left','right'] else 120),'shortened old footprint'
audit=json.loads((root/'assets/source/renovation-v8/shaft-audit.json').read_text());assert all(v['protectedBodyUnchanged'] for v in audit.values())
files={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for d in ['assets/source/renovation-v8','assets/exports/renovation-v8'] for p in (root/d).rglob('*') if p.is_file() and p.name!='provenance.json'}
files['apps/game-client/src/renovation-reach.generated.json']=hashlib.sha256((root/'apps/game-client/src/renovation-reach.generated.json').read_bytes()).hexdigest()
provenance={'status':'candidate; director review pending','source':'Original built-in imagegen; approved V6 Cai Bang identity retained. Rejected compact twelve-cel sheet is preserved. Separate spacious directional sheets supply final body/staff material.','export':'Aseprite1.3.18.6 Lua: feet-aligned native88px body, bilinear RGBA fitting and threshold12. Only shaft beyond hands is resampled along its authored axis; capped tip keeps its original length/width and the protected body/hand/boot ROI is asserted pixel-identical. This extends the weapon without enlarging or detaching the hero. Left is mirrored. V7 authored swing raster refitted to the long contact; new original fissure raster remapped from feet to contact. Python reads rasters only.','footprint':'Old M3D r3 source impact raster extents approximately213/219 world px sideways and133/140 vertically. New actual held cap and swing reach200 sideways,128 vertically; fissure starts at feet and reaches the same far contact. Combat range240, damage/costs/clocks unchanged.','cells':count,'files':files}
path=root/'assets/source/renovation-v8/provenance.json'
if '--write-manifest' in sys.argv:path.write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8')
else:assert json.loads(path.read_text())['files']==files,'V8 provenance mismatch'
print(f'V8 PASS: {count} cels, retained long reach, real cap/trail pixels, continuous full fissure, unchanged body ROI and provenance')
