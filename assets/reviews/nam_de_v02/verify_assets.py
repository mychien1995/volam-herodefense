from pathlib import Path
from PIL import Image
import hashlib,json
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[2]
m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
assert not m['runtimeIntegrated'] and not m['runtimeApproved']
for record in m['retainedAssets']+m['newFrames']+[m['newSource']]+m['outputs']:
 p=ROOT/record['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==record['sha256'],p
 if p.suffix=='.png':Image.open(p).verify()
atlas=json.loads((BASE/'vfx_rework_v02.json').read_text(encoding='utf-8'))['frames']
sheet=Image.open(BASE/'vfx_rework_v02.png').convert('RGBA')
clips=json.loads((BASE/'vfx_rework_v02.animations.json').read_text())['animations']
for c in clips:
 hashes=[]
 for name in c['frames']:
  f=atlas[name]['frame'];cel=Image.open(BASE/'frames'/f'{name}.png').convert('RGBA')
  assert sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).tobytes()==cel.tobytes()
  box=cel.getchannel('A').getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<cel.width and box[3]<cel.height
  assert cel.getchannel('A').getextrema()[0]==0
  hashes.append(hashlib.sha256(cel.tobytes()).hexdigest())
 assert len(set(hashes))==4,c['name']
 assert c['authoritativeHitEvents']==[]
ray=Image.open(BASE/'rays.png').convert('RGBA')
for i,r in enumerate(m['derivedCels']):
 p=ROOT/r['source'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sourceSha256']
 assert Image.open(p).convert('RGBA').crop(r['rect']).tobytes()==ray.crop((i*102,0,(i+1)*102,20)).tobytes()
print(json.dumps({'status':'PASS','newFrames':16,'derivedBeamCels':4,'retainedFiles':len(m['retainedAssets']),'distinctClips':4,'alphaPadding':True}))
if 'feedback01' in m:
 entry=m['feedback01']['manifest'];p=ROOT/entry['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256']
 feedback=json.loads(p.read_text(encoding='utf-8'));sheet=Image.open(BASE/'feedback01/ring.png').convert('RGBA')
 for record in [feedback['newSource'],feedback['prompt']]+feedback['frames']+feedback['derivedBeams']+feedback['outputs']:
  p=ROOT/record['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==record['sha256'],p
 for i,r in enumerate(feedback['frames']):
  cel=Image.open(ROOT/r['path']).convert('RGBA');assert cel.tobytes()==sheet.crop((i*192,0,(i+1)*192,128)).tobytes()
  box=cel.getchannel('A').getbbox();assert box and 0<box[0]<box[2]<192 and 0<box[1]<box[3]<128
  assert cel.getpixel((96,64))[3]<32,'Ring center must stay hollow'
 assert len({r['sha256'] for r in feedback['frames']})==4
 for i,r in enumerate(feedback['derivedBeams']):
  p=ROOT/r['source']['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['source']['sha256']
  cel=Image.open(ROOT/r['path']).convert('RGBA');assert cel.tobytes()==Image.open(p).convert('RGBA').crop(r['rect']).tobytes()
  assert cel.tobytes()==sheet.crop((i*8,128,(i+1)*8,148)).tobytes()
  assert all(cel.getpixel((x,9))[3]>220 for x in range(8)),'Continuous bright ray core'
 print(json.dumps({'status':'PASS','feedback01RingFrames':4,'hollowCenters':True,'preservedOriginals':True}))
if 'feedback02' in m:
 entry=m['feedback02']['manifest'];p=ROOT/entry['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256']
 feedback=json.loads(p.read_text(encoding='utf-8'));w,h=feedback['size'];sheet=Image.open(BASE/'feedback02/telegraph.png').convert('RGBA')
 for r in feedback['frames']+feedback['outputs']:
  p=ROOT/r['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'],p
 for i,r in enumerate(feedback['frames']):
  p=ROOT/r['source']['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['source']['sha256']
  cel=Image.open(ROOT/r['path']).convert('RGBA');expected=Image.new('RGBA',(w,h));expected.alpha_composite(Image.open(p).convert('RGBA').crop(r['sourceRect']),tuple(r['offset']))
  assert expected.tobytes()==cel.tobytes()==sheet.crop((i*w,0,(i+1)*w,h)).tobytes()
  box=cel.getchannel('A').getbbox();assert box[0]==2 and box[2]<w
 print(json.dumps({'status':'PASS','feedback02WarningCels':4,'warningPaddingRemoved':True,'originalPixelsPreserved':True}))
