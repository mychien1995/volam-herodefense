"""Check normalized sweep, retained pixels, native durations and original art hashes."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v07/hammer-combo-v7'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((OUT/'manifest.json').read_text());a=json.loads((OUT/'body.json').read_text())['frames'];im=Image.open(OUT/'body.png').convert('RGBA')
for source in m['sources']:assert sha(ROOT/source['path'])==source['sha256']
old={f['name']:f['sha256'] for f in json.loads((ROOT/'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6/manifest.json').read_text())['frames']}
hashes={f['name']:f['sha256'] for f in m['frames']};names=[n for c in m['clips'] for n in c['frames']];assert len(names)==len(set(names))==96
def tile(n):
 f=a[n]['frame'];s=a[n]['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
native=SRC/'native/hammer-combo-v7.aseprite';data=native.read_bytes();assert struct.unpack_from('<H',data,4)[0]==0xA5E0 and struct.unpack_from('<H',data,6)[0]==96
roundtrip=Image.open(SRC/'native/hammer-combo-v7-roundtrip.png').convert('RGBA');offset=128;durations=[d for c in m['clips'] for d in c['durations']]
for i,n in enumerate(names):
 t=tile(n);assert hashlib.sha256(t.tobytes()).hexdigest()==hashes[n];bounds=t.getbbox();assert bounds[0]>2 and bounds[1]>2 and bounds[2]<510 and bounds[3]<446
 stage,index,d=n.split('_',2)
 if stage=='slam' or int(index) in [0,5]:assert hashes[n]==old[n]
 else:assert hashes[n]!=old[n] and m['densityCorrections'][d]>1
 expected=np.array(t);actual=np.array(roundtrip.crop((i%16*512,i//16*448,i%16*512+512,i//16*448+448)));assert np.array_equal(expected[:,:,3],actual[:,:,3]);mask=expected[:,:,3]>0;assert np.array_equal(expected[:,:,:3][mask],actual[:,:,:3][mask]);assert struct.unpack_from('<H',data,offset+8)[0]==durations[i];offset+=struct.unpack_from('<I',data,offset)[0]
for clip in m['clips']:assert sum(clip['durations'])==375
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for i in range(1,5):assert tile(f'sweep_{i}_{left}').tobytes()==tile(f'sweep_{i}_{right}').transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
report={'status':'PASS','frames':96,'facings':8,'durationMs':375,'serverBeatMs':400,'unchangedNeutralAndSlamPixels':True,'correctedSweepCels':32,'densityCorrections':m['densityCorrections'],'nativeSha256':sha(native)}
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
