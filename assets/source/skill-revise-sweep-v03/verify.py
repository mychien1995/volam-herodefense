"""Check sweep-only native/atlas export and preservation of all previous art."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-sweep-v03/sweep-v3'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
m=json.loads((OUT/'manifest.json').read_text());a=json.loads((OUT/'body.json').read_text());im=Image.open(OUT/'body.png');native=Image.open(SRC/'native/sweep-v3-roundtrip.png').convert('RGBA')
names=[n for c in m['clips'] for n in c['frames']];assert len(names)==48 and len(set(names))==48 and set(names)==set(a['frames']);assert len(m['clips'])==8
assert max(im.size)<=4096 and im.mode=='RGBA'
proof={x['name']:x['sha256'] for x in m['frames']}
for i,n in enumerate(names):
 f=a['frames'][n]['frame'];tile=im.crop((f['x'],f['y'],f['x']+512,f['y']+448));assert hashlib.sha256(tile.tobytes()).hexdigest()==proof[n]
 actual=native.crop((i%16*512,i//16*448,(i%16+1)*512,(i//16+1)*448));aa=np.array(actual);bb=np.array(tile);assert np.array_equal(aa[:,:,3],bb[:,:,3]),n
 visible=bb[:,:,3]>0;assert np.array_equal(aa[:,:,:3][visible],bb[:,:,:3][visible]),n
 box=tile.getbbox();assert box[0]>3 and box[1]>3 and box[2]<509 and box[3]<445
for source in m['sources']:assert sha(ROOT/source['path'])==source['sha256']
for x in json.loads((SRC/'retained-hashes.json').read_text()):assert sha(ROOT/x['path'])==x['sha256'],x['path']
registration=json.loads((SRC/'registration.json').read_text());assert len(registration)==8
for r in registration:assert max(abs(h/89-1) for h in r['neutralBodyHeights'])<.15,(r['direction'],r['neutralBodyHeights'])
report={'status':'PASS','frames':48,'directions':8,'nativeFrames':48,'retainedBytesPreserved':True,'scope':'Sweep-only candidate raster/native validation; no art approval or game authority claim'}
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
