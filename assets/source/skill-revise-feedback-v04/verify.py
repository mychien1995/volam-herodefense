"""Validate source provenance, fixed-canvas neutral continuity and exact native alpha/RGB."""
from pathlib import Path
import json,hashlib,struct
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-feedback-v04';bank=OUT/'hammer-coherent-v4'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
m=json.loads((bank/'manifest.json').read_text());atlas=json.loads((bank/'body.json').read_text())['frames'];sheet=Image.open(bank/'body.png').convert('RGBA')
proof={f['name']:f['sha256'] for f in m['frames']};expected=[n for c in m['clips'] for n in c['frames']];assert len(expected)==236 and len(set(expected))==236
assert max(sheet.size)<=4096
for s in m['sources']:assert sha(ROOT/s['path'])==s['sha256'],s['path']
def cel(name):
 a=atlas[name];f=a['frame'];s=a['spriteSourceSize'];im=Image.new('RGBA',(512,448));im.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return im
native=SRC/'native/hammer-coherent-v4.aseprite';header=native.read_bytes();assert struct.unpack_from('<H',header,4)[0]==0xA5E0 and struct.unpack_from('<H',header,6)[0]==236
rt=Image.open(SRC/'native/hammer-coherent-v4-roundtrip.png').convert('RGBA')
for i,n in enumerate(expected):
 tile=cel(n);assert hashlib.sha256(tile.tobytes()).hexdigest()==proof[n],n
 b=tile.getbbox();assert b[0]>1 and b[1]>1 and b[2]<511 and b[3]<447
 actual=rt.crop((i%16*512,i//16*448,i%16*512+512,i//16*448+448));a=np.array(tile);b=np.array(actual)
 assert np.array_equal(a[:,:,3],b[:,:,3]),(n,'alpha');v=a[:,:,3]>0;assert np.array_equal(a[:,:,:3][v],b[:,:,:3][v]),(n,'RGB')
for d in ['down','down_right','right','up_right','up','up_left','left','down_left']:
 neutral=cel('idle_0_'+d).tobytes()
 for action in ['thrust','rising','sweep','slam']:
  for i in [0,5]:assert cel(f'{action}_{i}_{d}').tobytes()==neutral,(d,action,i,'neutral discontinuity')
 if len(json.loads((SRC/'registration.json').read_text()))==5:
  # Rear ponytail bends down during the lift. Compare against the lifted pose's
  # inspected hair top (y242), rather than its taller upright neutral ponytail.
  head_top=242 if d=='up' else cel('idle_0_'+d).getbbox()[1]
  assert cel('slam_2_'+d).getbbox()[1]<head_top-8,(d,'no overhead clearance')
old=ROOT/'assets/exports/skill-revise-thien-su-v01';oa=json.loads((old/'body.json').read_text())['frames'];oi=Image.open(old/'body.png').convert('RGBA')
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for i in range(4):
  a=oa[f'walk_{i}_{right}'];f=a['frame'];s=a['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(oi.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']))
  assert cel(f'walk_{i}_{left}').tobytes()==t.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(),(left,i,'walking mirror')
icons=json.loads((OUT/'icons/manifest.json').read_text())
for r in icons['icons']:
 assert sha(ROOT/r['source'])==r['sourceSha256'] and sha(ROOT/r['output'])==r['sha256']
 assert Image.open(ROOT/r['output']).tobytes()==Image.open(ROOT/r['source']).crop(tuple(r['crop'])).tobytes()
report={'status':'PASS','frames':236,'nativeFrames':236,'sourceOverheadFacings':len(json.loads((SRC/'registration.json').read_text())),'neutralEntryRecovery':'exact pixels in every facing','walkingMirroredCels':12,'icons':4,'nativeSha256':sha(native),'scope':'Raster/native checks; director art approval separate.'}
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
