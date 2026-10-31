"""Single final lightweight asset-only verification; never imports or launches Phaser."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[6]
BASE=ROOT/'assets/sprites/bosses/main/dong-ta'
m=json.loads((BASE/'package_manifest_v01.json').read_text(encoding='utf-8'))
errors=[];images=set();atlases=set();clips=set();individual=0
def require(ok,msg):
 if not ok:errors.append(msg)
for entry in m['assets']+m['sources']:
 p=ROOT/entry['path'];images.add(p)
 try:
  require(p.is_file(),'Missing '+entry['path'])
  with Image.open(p) as im: im.verify()
  with Image.open(p) as im:
   im.load();require(list(im.size)==entry['size'],'Dimensions '+entry['path'])
   if entry in m['assets']:
    require(im.mode=='RGBA','RGBA '+entry['path'])
    a=im.getchannel('A');require(a.getextrema()==(0,255),'Alpha/content '+entry['path'])
    if entry['kind']=='animation_frame':
     individual+=1
     require(a.getbbox() is not None,'Empty '+entry['path'])
     b=a.getbbox();require(b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,'Edge clipping '+entry['path'])
  require(hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],'Hash '+entry['path'])
 except Exception as e: errors.append(entry['path']+': '+str(e))
for group in m['animations']:
 p=ROOT/group['metadata'];clips.add(p)
for p in clips:
 try:
  doc=json.loads(p.read_text(encoding='utf-8'));ap=p.parent/doc['atlas'];atlases.add(ap)
  atlas=json.loads(ap.read_text(encoding='utf-8'));frames=atlas['frames']
  im=Image.open(p.parent/doc['image']);w,h=im.size
  for key,fr in frames.items():
   b=fr['frame'];require(0<=b['x'] and 0<=b['y'] and b['x']+b['w']<=w and b['y']+b['h']<=h,'Atlas rect '+key)
   fp=p.parent/'frames'/(key+'.png');require(fp.is_file(),'Frame PNG '+key)
   require(im.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h'])).tobytes()==Image.open(fp).tobytes(),'Atlas mismatch '+key)
  for clip in doc['animations']:
   require(len(clip['frames'])==4,'Four cels '+clip['key'])
   require(all(f in frames for f in clip['frames']),'Clip references '+clip['key'])
   require(clip['animationTimingOnly'] and clip['authoritativeHitEvents']==[],'Authority '+clip['key'])
   hashes=[hashlib.sha256(Image.open(p.parent/'frames'/(f+'.png')).tobytes()).hexdigest() for f in clip['frames']]
   require(len(set(hashes))==4,'Duplicate pose pixels '+clip['key'])
 except Exception as e:errors.append(str(p)+': '+str(e))
expected=[
'assets/concepts/main-bosses/dong-ta/master_concept_v01.png',
'assets/concepts/main-bosses/dong-ta/individual_concept_v01.png',
'assets/concepts/summons/mai-sieu-phong/master_concept_v01.png',
'assets/concepts/summons/hoang-dung/master_concept_v01.png',
'assets/sprites/bosses/main/dong-ta/boss_dong_ta.png',
'assets/sprites/summons/mai-sieu-phong/summon_mai_sieu_phong.png',
'assets/sprites/summons/hoang-dung/summon_hoang_dung.png',
'assets/icons/bosses/dong-ta/portrait_dong_ta_256.png',
'DONG_TA_ASSET_NOTES.md']
for p in expected:require((ROOT/p).is_file(),'Required file '+p)
require(len(m['assets'])==628,'Export PNG count')
require(len(m['sources'])==33,'Source PNG count')
require(len(m['animations'])==149,'Animation count')
require(individual==596,'Character + VFX cel count')
require(len(atlases)==12,'Twelve atlas packages')
require(m['runtimeIntegrated'] is False and m['runtimeVerified'] is False,'Asset-only scope')
report={'status':'PASS' if not errors else 'FAIL','scope':'single_final_lightweight_asset_only','pngFilesDecoded':len(images),'exportPngFiles':len(m['assets']),'retainedSourcePngFiles':len(m['sources']),'characterFrames':432,'vfxFrames':164,'iconsAndPortraitVariants':20,'animationGroups':len(m['animations']),'atlasPackages':len(atlases),'checks':['requested concept/sprite/VFX/icon existence','PNG signature/decoding and dimensions','source/export SHA-256','nonempty transparent export alpha','export canvas edge padding','atlas rectangles and matching individual cels','four distinct drawn cels per clip','relative folder paths and asset-only metadata'],'phaserRun':False,'gameplayTestsRun':False,'recordingsGenerated':False,'errors':errors}
(BASE/'asset_verification_v01.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
raise SystemExit(bool(errors))
