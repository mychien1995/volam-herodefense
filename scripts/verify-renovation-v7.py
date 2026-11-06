"""Read-only raster/anchor audit; Aseprite is the raster export tool."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'apps/game-client/src/renovation-coil.generated.json').read_text())
cells=0
for asset in manifest['assets']:
 p=root/asset['url'].replace('/assets/','assets/exports/')
 assert hashlib.sha256(p.read_bytes()).hexdigest()==asset['sha256']
 atlas=json.loads(p.with_suffix('.json').read_text());im=Image.open(p).convert('RGBA')
 expected=16 if asset['id']=='staff_sweep' else asset['grid'][0]*asset['grid'][1]
 assert len(atlas['frames'])==expected
 hashes=[];red=opaque=0
 for name,f in atlas['frames'].items():
  r,t,s=f['frame'],f['spriteSourceSize'],f['sourceSize'];assert [s['w'],s['h']]==asset['canvas']
  assert t['x']>0 and t['y']>0 and t['x']+t['w']<s['w'] and t['y']+t['h']<s['h'],(asset['id'],name,'clipping')
  assert not f['rotated'] and f['duration']>0
  cel=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));alpha=cel.getchannel('A');assert alpha.getbbox() and alpha.getextrema()[1]>=240
  assert not any(0<a<12 for a in alpha.getdata())
  hashes.append(hashlib.sha256(cel.tobytes()).hexdigest());cells+=1
  if asset['id'].startswith('dragon'):
   for rr,g,b,a in cel.getdata():
    if a>=200:
     opaque+=1;red+=int(rr>1.4*g and rr>1.4*b)
  if asset['id']=='staff_sweep' and name.endswith('_2'):
   socket=asset['sockets'][name.split('_')[0]];x,y=200+socket[0]-t['x'],320+socket[1]-t['y']
   # The exported trail must visibly terminate at the measured staff tip.
   near=[cel.getpixel((xx,yy)) for yy in range(max(0,y-3),min(cel.height,y+4)) for xx in range(max(0,x-3),min(cel.width,x+4))]
   assert any(a>=200 and rr>=200 and g>=100 for rr,g,b,a in near),(name,'missing bright tip at body socket')
   assert atlas['origins'][name]==[.5,.8]
 assert len(set(hashes))==expected,'duplicated raster pose'
 if opaque:assert red/opaque>.5,(asset['id'],'not predominantly red fire',red/opaque)
 assert (root/f"assets/source/renovation-v7/editable/{asset['id']}.aseprite").exists()
files={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for d in ['assets/source/renovation-v7','assets/exports/renovation-v7'] for p in (root/d).rglob('*') if p.is_file() and p.name!='provenance.json'}
for name in ['apps/game-client/src/renovation-staff-sockets.json','apps/game-client/src/renovation-coil.generated.json']:
 files[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
provenance={'status':'candidate; director review pending','source':'Original built-in imagegen with V6 identity/style inputs; user attachments are motion concepts only. Scarlet/ruby color edit requested by director.','export':'Aseprite 1.3.18.6; alpha cutoff12, bilinear fitting; measured transparent row/column gaps; no raster editing in Python.','dragon':'Twenty red flight cels; eight sequential body-coiling cels at one fixed endpoint, two rising and two diving cels. No billboard rotation.','staff':'Sixteen directional strokes, foot-origin200/320, measured V6 held-staff contact sockets. Rear-view row reflected vertically during export to preserve screen-up elevation; left mirrored and offset to its own measured weapon tip. Native VFX perspective fitted independently on X/Y; bodies keep existing scale. Ground crack reuses the V6 PNG and shares the staff tip without following hit enemies.','cells':cells,'files':files}
target=root/'assets/source/renovation-v7/provenance.json'
if '--write-manifest' in sys.argv:target.write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8')
else:assert json.loads(target.read_text())['files']==files,'provenance mismatch'
print(f'V7 PASS: {cells} unique cels, red fire palette, alpha/bounds, bright staff contact pixels, phase clocks and provenance')
