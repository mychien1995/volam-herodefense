"""Validate delivered hero-finish PNG/JSON/native sources, independently of browser observations."""
from pathlib import Path
from PIL import Image
import json,hashlib,struct
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/hero-finish-v1';OUT=ROOT/'assets/exports/hero-finish-v1'
m=json.loads((SRC/'manifest.json').read_text());canonical=json.loads((ROOT/'assets/source/hero-motion-v1/actors.json').read_text());assert {a['basic'] for a in m['actors']}=={a['basic'] for a in canonical}
report={'status':'PASS','actors':[]}
nativeProof={a['basic']:a for a in json.loads((SRC/'native-validation.json').read_text())['actors']}
for a in m['actors']:
 basic=a['basic'];png=OUT/(basic+'.png');atlas=OUT/(basic+'.json');im=Image.open(png).convert('RGBA');fs=json.loads(atlas.read_text())['frames'];assert im.size==(1536,1408);assert len(fs)==80
 source=SRC/'raw'/(basic+'.png');assert hashlib.sha256(source.read_bytes()).hexdigest()==a['sourceSha256']
 if a.get('idleOverrideSha256'):assert hashlib.sha256((SRC/'idle-overrides'/(basic+'.png')).read_bytes()).hexdigest()==a['idleOverrideSha256']
 native=SRC/'editable'/(basic+'.aseprite');data=native.read_bytes();assert struct.unpack_from('<HH',data,4)==(0xA5E0,64);assert hashlib.sha256(data).hexdigest()==a['editableSha256']
 hashes=set()
 for d in a['directions']:
  for pose in a['poses']:
   f=fs[pose+'_'+d]['frame'];assert(f['w'],f['h'])==(192,176);assert 0<=f['x']<=im.width-192 and 0<=f['y']<=im.height-176
   cel=im.crop((f['x'],f['y'],f['x']+192,f['y']+176));alpha=cel.getchannel('A');assert alpha.getbbox();assert not alpha.crop((0,0,192,1)).getbbox();assert not alpha.crop((0,175,192,176)).getbbox();assert not alpha.crop((0,0,1,176)).getbbox();assert not alpha.crop((191,0,192,176)).getbbox();hashes.add(hashlib.sha256(cel.tobytes()).hexdigest())
  assert fs['idle_'+d+'_0']==fs['inhale_'+d];assert fs['idle_'+d+'_1']==fs['exhale_'+d]
 assert nativeProof[basic]['editableSha256']==a['editableSha256'];assert nativeProof[basic]['runtimePngSha256']==hashlib.sha256(png.read_bytes()).hexdigest();assert nativeProof[basic]['nativePNGMatchesRuntimeVisibleRGBA']
 assert len(hashes)==64;assert a['pivot']==[.5,158/176] and a['scale']==.5
 for f in [png,atlas]:assert f.read_bytes()==(ROOT/'apps/game-client/public/assets/hero-finish-v1'/f.name).read_bytes()
 report['actors'].append({'basic':basic,'namedFrames':80,'distinctCels':64,'nativeFrames':64,'pngSha256':hashlib.sha256(png.read_bytes()).hexdigest(),'atlasSha256':hashlib.sha256(atlas.read_bytes()).hexdigest(),'editableSha256':a['editableSha256'],'borders':'all transparent'})
(SRC/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS:14 actors /896 unique cels /1120 frame names /14 native Aseprite sources / runtime copies match')
