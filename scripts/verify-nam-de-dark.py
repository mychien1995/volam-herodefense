"""Asset-only checks: source hashes, native alpha/visible RGB, pivots and edge safety."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
ROOT=Path(__file__).resolve().parent.parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def extract(folder,name):
 meta=json.loads((folder/'body.json').read_text());sheet=Image.open(folder/'body.png').convert('RGBA');f=meta['frames'][name];r=f['frame'];s=f['spriteSourceSize'];size=f['sourceSize']
 im=Image.new('RGBA',(size['w'],size['h']));im.alpha_composite(sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])),(s['x'],s['y']));return im
def extent(im):
 y,x=np.nonzero(np.array(im)[:,:,3]>=24);return int(y.max()-y.min()+1)
body=ROOT/'assets/source/boss-nam-de-dark-v1'
bm=json.loads((body/'manifest.json').read_text());assert len(bm['directions'])==8 and len(bm['groupsAuthored'])==64
for record in bm['groupsAuthored']:
 tile=Image.open(body/'frames'/(record['frame']+'.png')).convert('RGBA')
 assert hashlib.sha256(tile.tobytes()).hexdigest()==record['sha256'],record['frame']
 a=np.array(tile)[:,:,3];ys,xs=np.nonzero(a>=24)
 assert xs.min()>=3 and xs.max()<637 and ys.min()>=3 and ys.max()<701,record['frame']
 assert abs(int(ys.max())-624)<=1,(record['frame'],'foot drift')
normal=extent(extract(ROOT/'assets/exports/boss-nam-de-unified-v1','idle_0_down'))
dark=extent(extract(ROOT/'assets/exports/boss-nam-de-dark-v1','idle_down'))
ratio=dark/normal;assert abs(ratio-2)<.06,('size ratio',normal,dark,ratio)
fx=ROOT/'assets/source/effects/nam_de_dark_v01';fm=json.loads((fx/'manifest.json').read_text())
assert len(fm['frames'])==18
sheet=Image.open(ROOT/'.cache/nam-de-dark-native/effects-roundtrip.png').convert('RGBA')
invisible=0
for i,frame in enumerate(fm['frames']):
 image=Image.open(fx/'frames'/(frame['name']+'.png')).convert('RGBA');b=np.array(image)
 a=np.array(sheet.crop(((i%6)*512,(i//6)*512,(i%6+1)*512,(i//6+1)*512)))
 assert np.array_equal(a[:,:,3],b[:,:,3]),(frame['name'],'native alpha')
 visible=b[:,:,3]>0;assert np.array_equal(a[:,:,:3][visible],b[:,:,:3][visible]),(frame['name'],'native visible RGB')
 invisible+=int((np.any(a!=b,axis=2)&~visible).sum())
 alpha=b[:,:,3];assert max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max())==0,(frame['name'],'edge matte')
 assert hashlib.sha256(image.tobytes()).hexdigest()==frame['sha256']
for prefix,out in [('assets/source/boss-nam-de-dark-v1','assets/exports/boss-nam-de-dark-v1'),('assets/source/effects/nam_de_dark_v01','assets/exports/effects/nam_de_dark_v01')]:
 m=json.loads((ROOT/out/'manifest.json').read_text())
 for name,expected in m['exports'].items():assert sha(ROOT/out/name)==expected,name
v={'bodyFrames':64,'vfxFrames':18,'bodyNativeExactRGBA':True,'vfxNativeExactAlphaAndVisibleRGB':True,'vfxInvisibleRgbNormalizationPixels':invisible,'bodyIdleHeights':{'normal':normal,'dark':dark,'ratio':ratio},'fixedFeetPivot':[320,624],'transparentFrameGutters':True}
(ROOT/'docs/evidence/nam-de-dark').mkdir(parents=True,exist_ok=True)
(ROOT/'docs/evidence/nam-de-dark/assets.json').write_text(json.dumps(v,indent=2)+'\n')
(fx/'native-validation.json').write_text(json.dumps({'frames':18,'exactAlphaAndVisibleRGB':True,'invisibleRgbNormalizationPixels':invisible,'nativeSha256':sha(fx/'effects.aseprite')},indent=2)+'\n')
print(json.dumps(v))
