from pathlib import Path
import json,hashlib,argparse,struct
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/cai-bang-chuong-unified-v1';OUT=ROOT/'assets/exports/cai-bang-chuong-unified-v1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
parser=argparse.ArgumentParser();parser.add_argument('--native',action='store_true');args=parser.parse_args()
m=json.loads((SRC/'manifest.json').read_text());atlas=json.loads((OUT/'body.json').read_text());im=Image.open(OUT/'body.png').convert('RGBA');frames=atlas['frames']
assert len(m['directions'])==8 and len(m['poses'])==20 and len(frames)==160
assert im.size==(3200,1152) and m['pivot']==[.5,132/144] and m['scale']==.5
for r in m['references']+m['groups']:assert sha(ROOT/r['path'])==r['sha256'],r['path']
assert sha(SRC/'raw/ribbon-repair.png')==m['repairSha256']
idleCoherence=[]
for g in m['groups']:
 hashes=[];idleHeights=[];idleAlpha=[]
 for entry in g['frames']:
  f=frames[entry['frame']]['frame'];assert f['w']==160 and f['h']==144
  tile=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));pix=np.array(tile);a=pix[:,:,3]
  assert not a[:2].any() and not a[-2:].any() and not a[:,:2].any() and not a[:,-2:].any(),entry['frame']
  h=hashlib.sha256(tile.tobytes()).hexdigest();assert h==entry['sha256'];hashes.append(h)
  if entry['frame'].startswith('idle_'):
   box=tile.getbbox();idleHeights.append(box[3]-box[1]);idleAlpha.append(float(a[a>=24].mean()))
 assert len(set(hashes))==20,g['direction']
 assert max(idleHeights)-min(idleHeights)<=2,('idle size jump',g['direction'])
 assert max(idleAlpha)-min(idleAlpha)<=4,('idle opacity jump',g['direction'])
 idleCoherence.append({'direction':g['direction'],'visibleHeights':idleHeights,'meanBodyAlpha':[round(v,3) for v in idleAlpha]})
for p in OUT.iterdir():
 if p.is_file():assert p.read_bytes()==(ROOT/'apps/game-client/public/assets/cai-bang-chuong-unified-v1'/p.name).read_bytes(),p
native=SRC/'body.aseprite';b=native.read_bytes();assert struct.unpack_from('<H',b,4)[0]==0xA5E0 and struct.unpack_from('<H',b,6)[0]==160
pos=128;tags=0
for fi in range(160):
 size,magic,chunks=struct.unpack_from('<IHH',b,pos);assert magic==0xF1FA
 count=struct.unpack_from('<I',b,pos+12)[0] if chunks==0xFFFF else chunks
 cp=pos+16
 for ci in range(count):
  length,kind=struct.unpack_from('<IH',b,cp)
  if kind==0x2018:tags+=struct.unpack_from('<H',b,cp+6)[0]
  cp+=length
 pos+=size
assert tags==48,('Native pose tags',tags)
result={'status':'PASS','frames':160,'nativeTags':tags,'directions':8,'posesPerDirection':20,'uniqueAuthoredCels':160,'transparentBorders':'PASS','sourceHashes':'PASS','bodyPNG':sha(OUT/'body.png'),'idleCoherence':idleCoherence,'scope':'One school, same body source for all states; art approval pending'}
if args.native:
 native=SRC/'body.aseprite';b=native.read_bytes();assert struct.unpack_from('<H',b,4)[0]==0xA5E0 and struct.unpack_from('<H',b,6)[0]==160
 roundtrip=np.array(Image.open(ROOT/'.cache/chuong-native-check/body.png').convert('RGBA'));original=np.array(im)
 assert roundtrip.shape==original.shape and np.array_equal(roundtrip[:,:,3],original[:,:,3])
 visible=original[:,:,3]>0;assert np.array_equal(roundtrip[:,:,:3][visible],original[:,:,:3][visible])
 result.update({'nativeFrames':160,'nativeSha256':sha(native),'nativeRoundtrip':'Exact alpha and visible RGB PASS'})
 (SRC/'native-validation.json').write_text(json.dumps(result,indent=2)+'\n')
else:
 prior=json.loads((SRC/'native-validation.json').read_text())
 assert prior['bodyPNG']==sha(OUT/'body.png') and prior['nativeSha256']==sha(SRC/'body.aseprite'),'Stale native proof'
 result['nativeRoundtrip']='matching source hashes PASS'
(SRC/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
