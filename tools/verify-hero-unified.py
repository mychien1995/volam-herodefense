import argparse,json,struct,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
from hero_unified_assets import ROOT,locked,sha
p=argparse.ArgumentParser();p.add_argument('--profile',required=True);p.add_argument('--native',action='store_true');p.add_argument('--partial',action='store_true');args=p.parse_args()
locked();cfg=json.loads(Path(args.profile).read_text());src=ROOT/'assets/source'/cfg['folder'];out=ROOT/'assets/exports'/cfg['folder'];m=json.loads((src/'manifest.json').read_text());atlas=json.loads((out/'body.json').read_text());im=Image.open(out/'body.png').convert('RGBA');poses=cfg['poses'];dirs=m['directions'];w,h=cfg['canvas'];frames=atlas['frames'];count=len(poses)*len(dirs)
assert args.partial or len(dirs)==8
assert len(frames)==count and max(im.size)<=4096 and im.width*im.height*4<=32*1024*1024
for r in m['references']+m['groupsAuthored']:assert sha(ROOT/r['path'])==r['sha256'],r['path']
tiles=[];idleMetrics=[];staffContacts=[]
for g in m['groupsAuthored']:
 for extra in g.get('extraSources',[]):assert sha(ROOT/extra['path'])==extra['sha256']
 for override in g.get('celGroupOverrides',[]):assert sha(src/override['path'])==override['sha256']
 hashes=[];heights=[];alpha=[];physicalIdle=[]
 for e in g['frames']:
  a=frames[e['frame']];f=a['frame'];s=a['spriteSourceSize'];assert a['trimmed'] and a['sourceSize']=={'w':w,'h':h};tile=Image.new('RGBA',(w,h));tile.paste(im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));v=np.array(tile)[:,:,3]
  assert not v[:2].any() and not v[-2:].any() and not v[:,:2].any() and not v[:,-2:].any(),e['frame']
  if e.get('override'):
   override=e['override'];assert sha(src/override['path'])==e['overrideSha256'],override['path']
   if 'sourceTip' in override:
    tip=[(override['sourceTip'][i]-override['sourceRoot'][i])*e['groupRatio']*cfg['scale'] for i in range(2)]
    error=sum((tip[i]-override['expectedTipWorld'][i])**2 for i in range(2))**.5;assert error<=override['tipTolerance'],(e['frame'],'staff contact reach',tip)
    staffContacts.append({'frame':e['frame'],'tipWorld':tip,'retainedVFXTip':override['expectedTipWorld'],'errorWorldPixels':error,'tolerance':override['tipTolerance']})
  digest=hashlib.sha256(tile.tobytes()).hexdigest();assert digest==e['sha256'];hashes.append(digest);tiles.append(tile)
  if e['frame'].startswith('idle_'):
   box=tile.getbbox();heights.append(box[3]-box[1]);alpha.append(float(v[v>=24].mean()));physicalIdle.append((e['sourceRoot'][1]-e['sourceHeadTop']+1)*e['groupRatio'])
 assert len(set(hashes))==len(poses),(g['direction'],'duplicate artwork')
 for start in range(0,len(heights),4):
  hh=heights[start:start+4];aa=alpha[start:start+4];bb=physicalIdle[start:start+4];assert max(bb)-min(bb)<=3,(g['direction'],'idle physical body jump',bb);assert max(hh)-min(hh)<=cfg.get('idleVisibleExtentTolerance',3),(g['direction'],'idle height jump',hh);assert max(aa)-min(aa)<=5,(g['direction'],'idle opacity jump',aa)
 if cfg.get('extraSources'):assert max(physicalIdle)-min(physicalIdle)<=3,(g['direction'],'armed/swordless physical body size jump',physicalIdle)
 idleMetrics.append({'direction':g['direction'],'visibleHeights':heights,'meanAlpha':alpha,'physicalBodyHeights':physicalIdle})
for p in out.iterdir():
 if p.is_file():assert p.read_bytes()==(ROOT/'apps/game-client/public/assets'/cfg['folder']/p.name).read_bytes()
result={'status':'PASS','basic':cfg['basic'],'directions':len(dirs),'cels':count,'authoredCels':len(poses)*len(dirs),'packedSize':list(im.size),'textureMiB':im.width*im.height*4/1048576,'bodyPNG':sha(out/'body.png'),'idleCoherence':idleMetrics,'staffContacts':staffContacts,'approvedChuongLocks':'PASS','scope':'prototype pending director review'}
if args.native:
 native=src/'body.aseprite';b=native.read_bytes();assert struct.unpack_from('<H',b,4)[0]==0xA5E0 and struct.unpack_from('<H',b,6)[0]==count
 tags=[];offset=128;durations=[group['durationMs'] for d in dirs for group in cfg['groups'] for pose in group['poses']]
 for frame in range(count):
  length,magic,chunks=struct.unpack_from('<IHH',b,offset);assert magic==0xF1FA;assert struct.unpack_from('<H',b,offset+8)[0]==durations[frame],('native duration',frame);chunk=offset+16
  for _ in range(chunks):
   size,kind=struct.unpack_from('<IH',b,chunk)
   if kind==0x2018:
    n=struct.unpack_from('<H',b,chunk+6)[0];cursor=chunk+16
    for j in range(n):
     first,last=struct.unpack_from('<HH',b,cursor);lengthName=struct.unpack_from('<H',b,cursor+17)[0];name=b[cursor+19:cursor+19+lengthName].decode();tags.append({'name':name,'first':first,'last':last});cursor+=19+lengthName
   chunk+=size
  offset+=length
 assert len(tags)==len(cfg['groups'])*len(dirs),(len(tags),'native tags')
 expected=[];index=0
 for d in dirs:
  for group in cfg['groups']:
   expected.append({'name':group['name']+'_'+d,'first':index,'last':index+len(group['poses'])-1});index+=len(group['poses'])
 assert tags==expected,('Native tags must have exact group ranges',tags)
 result['nativeTags']=tags
 Image.MAX_IMAGE_PIXELS=16*w*((count+15)//16)*h # known, locally authored native roundtrip dimensions
 roundtrip=Image.open(ROOT/'.cache/hero-native-check'/cfg['folder']/'roundtrip.png').convert('RGBA')
 for i,tile in enumerate(tiles):
  x=i%16*w;y=i//16*h;a=np.array(tile);b=np.array(roundtrip.crop((x,y,x+w,y+h)));assert np.array_equal(a[:,:,3],b[:,:,3]);visible=a[:,:,3]>0;assert np.array_equal(a[:,:,:3][visible],b[:,:,:3][visible])
 result.update({'nativeFrames':count,'nativeSha256':sha(native),'nativeRoundtrip':'exact alpha and visible RGB PASS'})
 (src/'native-validation.json').write_text(json.dumps(result,indent=2)+'\n')
else:
 if not args.partial:
  native=json.loads((src/'native-validation.json').read_text());assert native['bodyPNG']==sha(out/'body.png') and native['nativeSha256']==sha(src/'body.aseprite'),'Stale native proof'
(src/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
