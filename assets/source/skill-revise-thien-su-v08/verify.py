"""Validate compact-model sweep anatomy, retained neutral and native pixels/timing."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v08/hammer-sweep-v8';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((OUT/'manifest.json').read_text());a=json.loads((OUT/'body.json').read_text())['frames'];sheet=Image.open(OUT/'body.png').convert('RGBA');names=[n for c in m['clips'] for n in c['frames']];assert len(names)==len(set(names))==48 and len(m['clips'])==8
for source in m['sources']:assert sha(ROOT/source['path'])==source['sha256'],source['path']
old={f['name']:f['sha256'] for f in json.loads((ROOT/'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json').read_text())['frames']};hashes={f['name']:f['sha256'] for f in m['frames']}
def tile(n):
 f=a[n]['frame'];s=a[n]['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
records=json.loads((SRC/'registration.json').read_text())
for r in records:
 assert max(r['ratios'])/min(r['ratios'])<1.08
 for source,target,tolerance in [('headSpan','headSpan',1),('forearmCuffWidth','forearmCuffWidth',1),('crownToSole','neutralCrownToSole',2),('neckToBelt','neutralNeckToBelt',1)]:assert abs(r['projectedLandmarks'][source]-r['targets'][target])<=tolerance,(r['direction'],source)
native=SRC/'native/hammer-sweep-v8.aseprite';data=native.read_bytes();assert struct.unpack_from('<H',data,4)[0]==0xA5E0 and struct.unpack_from('<H',data,6)[0]==48
rt=Image.open(SRC/'native/hammer-sweep-v8-roundtrip.png').convert('RGBA');offset=128;durations=[d for c in m['clips'] for d in c['durations']]
for i,n in enumerate(names):
 t=tile(n);assert hashlib.sha256(t.tobytes()).hexdigest()==hashes[n];b=t.getbbox();assert b[0]>2 and b[1]>2 and b[2]<510 and b[3]<446
 _,index,d=n.split('_',2)
 if int(index) in [0,5]:assert hashes[n]==old['idle_0_'+d]
 expected=np.array(t);actual=np.array(rt.crop((i%16*512,i//16*448,i%16*512+512,i//16*448+448)));assert np.array_equal(expected[:,:,3],actual[:,:,3]);visible=expected[:,:,3]>0;assert np.array_equal(expected[:,:,:3][visible],actual[:,:,:3][visible]);assert struct.unpack_from('<H',data,offset+8)[0]==durations[i];offset+=struct.unpack_from('<I',data,offset)[0]
for c in m['clips']:assert len(set(hashes[n] for n in c['frames'][1:5]))==4 and sum(c['durations'])==375
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for i in range(1,5):assert tile(f'sweep_{i}_{left}').tobytes()==tile(f'sweep_{i}_{right}').transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
result={'status':'PASS','frames':48,'facings':8,'newAuthoredMotionCels':20,'mirroredMotionCels':12,'retainedNeutralCels':16,'unusedCalibrationCels':10,'anatomicalCalibration':'manual head/cuff/neutral torso landmarks agree within 8% per source group; native projected dimensions within 1-2px of retained reference','durationMs':375,'nativeSha256':sha(native),'approval':'candidate redraw for requested visual fix; final subjective game review remains with director'}
(SRC/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
