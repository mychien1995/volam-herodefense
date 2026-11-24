"""Validate all directions, reviewed inputs, exact neutral pixels and native roundtrip."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((OUT/'manifest.json').read_text());a=json.loads((OUT/'body.json').read_text())['frames'];sheet=Image.open(OUT/'body.png').convert('RGBA');names=[n for c in m['clips'] for n in c['frames']]
assert len(names)==len(set(names))==96 and len(m['clips'])==16
for f in m['sources']:assert sha(ROOT/f['path'])==f['sha256'],f['path']
for name in ['motion','sweep']:
 prior=ROOT/('assets/source/thien-su-reference-'+name+'-2026-11-24/validation.json')
 for f in json.loads(prior.read_text())['files']:assert sha(ROOT/f['path'])==f['sha256'],f['path']
def tile(n):
 f=a[n]['frame'];s=a[n]['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
old=ROOT/'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json';neutral={f['name']:f['sha256'] for f in json.loads(old.read_text())['frames']};hashes={f['name']:f['sha256'] for f in m['frames']}
for c in m['clips']:
 stage,d=c['name'].split('_',1);assert c['frames']==[f'{stage}_{i}_{d}' for i in range(6)]
 assert len(set(hashes[n] for n in c['frames'][1:5]))==4
 assert hashes[c['frames'][0]]==hashes[c['frames'][5]]==neutral['idle_0_'+d]
 assert sum(c['durations'])==285
for n in names:
 t=tile(n);assert hashlib.sha256(t.tobytes()).hexdigest()==hashes[n];b=t.getbbox();assert b[0]>2 and b[1]>2 and b[2]<510 and b[3]<446,(n,b)
 f=a[n]['frame'];assert not np.array(sheet.crop((f['x']-1,f['y']-1,f['x']+f['w']+1,f['y'])))[:,:,3].any()
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for stage in ['slam','sweep']:
  for i in range(1,5):assert tile(f'{stage}_{i}_{left}').tobytes()==tile(f'{stage}_{i}_{right}').transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
for d in ['down','down_left','down_right','left','right','up','up_left','up_right']:
 assert tile('slam_2_'+d).getbbox()[1]<tile('slam_4_'+d).getbbox()[1]-8,(d,'overhead load/contact silhouette')
native=SRC/'native/hammer-combo-v6.aseprite';data=native.read_bytes();assert struct.unpack_from('<H',data,4)[0]==0xA5E0 and struct.unpack_from('<H',data,6)[0]==96
rt=Image.open(SRC/'native/hammer-combo-v6-roundtrip.png').convert('RGBA');offset=128;durations=[d for c in m['clips'] for d in c['durations']]
for i,n in enumerate(names):
 expected=np.array(tile(n));actual=np.array(rt.crop((i%16*512,i//16*448,i%16*512+512,i//16*448+448)));assert np.array_equal(expected[:,:,3],actual[:,:,3]);visible=expected[:,:,3]>0;assert np.array_equal(expected[:,:,:3][visible],actual[:,:,:3][visible]);assert struct.unpack_from('<H',data,offset+8)[0]==durations[i];offset+=struct.unpack_from('<I',data,offset)[0]
report={'status':'PASS','frames':96,'facings':8,'actions':['sweep','slam'],'neutralEntryRecovery':'exact retained idle pixels','nativeFrames':96,'durationMs':285,'reviewedInputHashes':'unchanged','nativeSha256':sha(native),'limits':'Four authored key poses per action; generated directional expansion does not invent in-between frames or director final-game approval.'}
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
