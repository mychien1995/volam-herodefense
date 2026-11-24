"""Exact authored PNG/native roundtrip, neutral continuity, mirrored facings and timing."""
from pathlib import Path
import json,hashlib,struct
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v05/hammer-slam-v5'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
m=json.loads((OUT/'manifest.json').read_text());a=json.loads((OUT/'body.json').read_text())['frames'];im=Image.open(OUT/'body.png').convert('RGBA');names=[n for c in m['clips'] for n in c['frames']];assert len(names)==len(set(names))==80
for source in m['sources']:assert sha(ROOT/source['path'])==source['sha256']
def tile(n):
 f=a[n]['frame'];s=a[n]['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
native=SRC/'native/hammer-slam-v5.aseprite';data=native.read_bytes();assert struct.unpack_from('<H',data,4)[0]==0xA5E0 and struct.unpack_from('<H',data,6)[0]==80
rt=Image.open(SRC/'native/hammer-slam-v5-roundtrip.png').convert('RGBA');proof={f['name']:f['sha256'] for f in m['frames']};offset=128
durations=[d for c in m['clips'] for d in c['durations']]
for i,n in enumerate(names):
 t=tile(n);assert hashlib.sha256(t.tobytes()).hexdigest()==proof[n];b=t.getbbox();assert b[0]>2 and b[1]>2 and b[2]<510 and b[3]<446
 actual=rt.crop((i%16*512,i//16*448,i%16*512+512,i//16*448+448));aa=np.array(t);bb=np.array(actual);assert np.array_equal(aa[:,:,3],bb[:,:,3]);v=aa[:,:,3]>0;assert np.array_equal(aa[:,:,:3][v],bb[:,:,:3][v])
 assert struct.unpack_from('<H',data,offset+8)[0]==durations[i];offset+=struct.unpack_from('<I',data,offset)[0]
for c in m['clips']:
 d=c['name'][5:];assert tile('slam_0_'+d).tobytes()==tile('slam_9_'+d).tobytes();assert len(set(proof[n] for n in c['frames']))>=8;assert sum(c['durations'])==270
 assert tile('slam_5_'+d).getbbox()[1]<tile('slam_7_'+d).getbbox()[1]-10,(d,'overhead vs grounded silhouette')
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for i in range(1,9):assert tile(f'slam_{i}_{left}').tobytes()==tile(f'slam_{i}_{right}').transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
r={'status':'PASS','frames':80,'facings':8,'nativeFrames':80,'durationPerTakeMs':270,'gripReview':'Authored two-hand inward grip inspected visually; timing/alpha/hash tests do not grant director art approval.','nativeSha256':sha(native)};(SRC/'validation.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
