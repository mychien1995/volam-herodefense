"""Offline Bắc Cái raster preparation only; no runtime files, game imports or servers.
Retain generated source drawings; crop, align, nearest-sample and pack actual cels.
"""
from pathlib import Path
import json, math, hashlib, shutil
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[6]
BASE = ROOT / 'assets/sprites/bosses/main/bac-cai'
SOURCE = BASE / 'source'
ASSETS = []
CLIPS = []
EXTRACTION = {}
DIRS = ['down', 'up', 'left', 'right']
STAFF = ['idle', 'walk', 'staff_basic', 'staff_combo', 'staff_spin', 'hurt', 'death']
PALMS = ['palm_stance', 'dragon_charge', 'dragon_release', 'jumping_palm', 'counter_guard', 'ultimate_charge', 'ultimate_palms']
FX = {
 'staff': ('fx_staff', ['staff_slash', 'multi_hit_impact', 'wide_jade_arc', 'staff_whirlwind', 'ground_smash', 'heavy_finisher', 'knockback_wake', 'jade_projectile']),
 'dragon-palms': ('fx_dragon', ['palm_gather', 'dragon_projectile', 'dragon_trail', 'dragon_impact', 'gold_dissipate', 'leap_dragon_trail', 'landing_dragon_burst', 'palm_shockwave']),
 'ultimate': ('fx_ultimate', ['ultimate_aura', 'arm_dragon_spirals', 'dragon_fast', 'dragon_wide', 'dragon_twin', 'sequential_palm', 'final_dragon_burst', 'ultimate_end']),
 'defense': ('fx_defense', ['master_aura', 'strong_hit', 'critical_hit', 'resistance_flash', 'shield_activate', 'counter_shield', 'counter_warning', 'shield_expire']),
 'shared': ('fx_shared', ['frontal_warning', 'circle_warning', 'direction_warning', 'landing_warning', 'ultimate_lane_warning', 'projectile_impact', 'boss_hit', 'boss_death'])
}

def rel(path): return Path(path).relative_to(ROOT).as_posix()
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def dump(path, obj):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def load(path): return Image.open(path).convert('RGBA')
def clean(im):
 a=np.array(im).copy()
 a[:,:,3]=np.where(a[:,:,3]>=128,255,0).astype('uint8')
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def save(path, im, kind, source, origin=None):
 path.parent.mkdir(parents=True,exist_ok=True)
 im.save(path)
 ASSETS.append({'path':rel(path),'id':path.stem,'kind':kind,'size':list(im.size),'sha256':sha(path),'source':source,'origin':origin,'status':'produced_asset_only','runtimeIntegrated':False,'runtimeVerified':False})
def bbox(im):
 b=im.getchannel('A').getbbox()
 if b is None: raise ValueError('Empty drawing')
 return b
def bands(im,n):
 q=(np.array(im.getchannel('A'))>=128).sum(1)
 cuts=[0]
 for i in range(1,n):
  center=i*im.height/n
  lo=max(cuts[-1]+1,round(center-im.height/n*.22)); hi=min(im.height,round(center+im.height/n*.22))
  sub=q[lo:hi]; inds=np.flatnonzero(sub==sub.min())+lo
  cuts.append(int(min(inds,key=lambda x:abs(x-center))))
 return cuts+[im.height]
def components(im):
 mask=np.array(im.getchannel('A'))>=128
 parent=[]; runs=[]; prev=[]
 def find(i):
  while parent[i]!=i:
   parent[i]=parent[parent[i]];i=parent[i]
  return i
 for y,row in enumerate(mask):
  d=np.diff(np.pad(row.astype('int8'),(1,1)))
  cur=[]
  for s,e in zip(np.flatnonzero(d==1),np.flatnonzero(d==-1)):
   i=len(parent);parent.append(i);s=int(s);e=int(e);runs.append((i,s,e,y))
   for ps,pe,pi in prev:
    if pe>=s and ps<=e:
     ra,rb=find(i),find(pi)
     if ra!=rb:parent[ra]=rb
   cur.append((s,e,i))
  prev=cur
 stats={}
 for i,s,e,y in runs:
  k=find(i)
  if k not in stats:stats[k]=[s,y,e,y+1,0]
  b=stats[k];b[0]=min(b[0],s);b[1]=min(b[1],y);b[2]=max(b[2],e);b[3]=max(b[3],y+1);b[4]+=e-s
 return [b for b in stats.values() if b[4]>250]

def isolate_actor(im):
 """Discard neighboring-cell islands inside a whole-actor bounding rectangle."""
 a=np.array(im).copy();mask=a[:,:,3]>0;seen=np.zeros(mask.shape,dtype=bool);groups=[]
 for y,x in zip(*np.nonzero(mask)):
  if seen[y,x]:continue
  todo=[(int(y),int(x))];seen[y,x]=True;pixels=[]
  while todo:
   yy,xx=todo.pop();pixels.append((yy,xx))
   for dy,dx in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]:
    ny,nx=yy+dy,xx+dx
    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:
     seen[ny,nx]=True;todo.append((ny,nx))
  groups.append(pixels)
 main=max(groups,key=len);keep=np.zeros(mask.shape,dtype=bool)
 for y,x in main:keep[y,x]=True
 a[~keep]=0
 return Image.fromarray(a)

def pack(folder,aid,cels,clips,size,pivot):
 w,h=size;cols=8;sheet=Image.new('RGBA',(w*cols,h*math.ceil(len(cels)/cols)))
 frames={};timing={f:c['durationMs'] for c in clips for f in c['frames']}
 origin=[pivot[0]/w,pivot[1]/h]
 for i,(name,im,source) in enumerate(cels):
  x=i%cols*w;y=i//cols*h;sheet.paste(im,(x,y))
  save(folder/'frames'/(name+'.png'),im,'animation_frame',source,origin)
  frames[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'duration':timing[name],'sourceArt':source}
 tags=[];index={name:i for i,(name,_,_) in enumerate(cels)}
 for c in clips:
  c.update({'key':aid+'_'+c['name'],'animationTimingOnly':True,'authoritativeHitEvents':[]})
  tags.append({'name':c['name'],'from':index[c['frames'][0]],'to':index[c['frames'][-1]],'direction':'forward'})
 save(folder/(aid+'.png'),sheet,'spritesheet','retained generated production cels; nearest-neighbor raster preparation')
 dump(folder/(aid+'.json'),{'frames':frames,'meta':{'app':'Bac Cai offline raster preparation','image':aid+'.png','format':'RGBA8888','size':{'w':sheet.width,'h':sheet.height},'scale':'1','pivot':list(pivot),'origin':origin,'frameTags':tags,'slices':[{'name':'feet' if aid=='boss_bac_cai' else 'effect_origin','keys':[{'frame':0,'bounds':{'x':0,'y':0,'w':w,'h':h},'pivot':{'x':pivot[0],'y':pivot[1]}}]}]}})
 dump(folder/(aid+'.animations.json'),{'id':aid,'image':aid+'.png','atlas':aid+'.json','frameSize':list(size),'pivot':list(pivot),'origin':origin,'animations':clips,'note':'Visual playback only. No gameplay, damage, range, timing, AI or phase definitions.'})
 CLIPS.extend({'id':c['key'],'metadata':rel(folder/(aid+'.animations.json')),'frameCount':len(c['frames'])} for c in clips)

def actors():
 cels=[];clips=[]
 for direction in DIRS:
  for family,states in [('staff',STAFF),('palms',PALMS)]:
   src=SOURCE/f'{direction}_{family}_source_v01.png';im=clean(load(src));bs=bands(im,7);comps=components(im);cw=im.width/4;chosen={}
   for r,state in enumerate(states):
    for c in range(4):
     cx=(c+.5)*cw;cy=(bs[r]+bs[r+1])/2;rh=bs[r+1]-bs[r]
     candidates=[b for b in comps if abs((b[0]+b[2])/2-cx)<cw*.6 and abs((b[1]+b[3])/2-cy)<rh*.65 and b[4]>1000]
     if not candidates:raise ValueError(f'Missing actor {direction} {state} {c}')
     b=min(candidates,key=lambda b:(((b[0]+b[2])/2-cx)/cw)**2+(((b[1]+b[3])/2-cy)/rh)**2)
     chosen[(r,c)]=b
   scale=56/float(np.median([b[3]-b[1] for (r,c),b in chosen.items() if r==0]))
   EXTRACTION[direction+'_'+family]={'rowCuts':bs,'scale':scale,'bodyTarget':56}
   for r,state in enumerate(states):
    names=[]
    for c in range(4):
     b=chosen[(r,c)];rect=(max(0,b[0]-2),max(0,b[1]-2),min(im.width,b[2]+2),min(im.height,b[3]+2));cut=isolate_actor(im.crop(rect))
     nw=round(cut.width*scale);nh=round(cut.height*scale);cut=cut.resize((nw,nh),Image.Resampling.NEAREST)
     # Root is the midpoint of the dark cloth shoes, independent of extended staff/arms.
     a=np.array(im.crop((b[0],b[1],b[2],b[3])));hh=a.shape[0]
     rgb=a[:,:,:3].astype('int16');neutral=(rgb.max(2)-rgb.min(2)<35)&(rgb.max(2)<105)&(a[:,:,3]>0)
     neutral[:round(hh*.84)]=False
     ys,xs=np.nonzero(neutral)
     rootx=b[0]+(float(np.median(xs)) if len(xs)>10 else (c+.5)*cw-b[0])
     lift=[0,14,7,0][c] if state=='jumping_palm' else 0
     x=round(80+(rect[0]-rootx)*scale);y=88-nh-lift
     if x<3 or y<3 or x+nw>157 or y+nh>109:raise ValueError(f'Actor canvas overflow {direction} {state} {c} {(x,y,nw,nh)}')
     frame=Image.new('RGBA',(160,112));frame.paste(cut,(x,y));name=f'{state}_{direction}_{c}';names.append(name)
     cels.append((name,frame,{'path':rel(src),'rect':list(rect),'scale':scale,'feetRootSourceX':rootx,'visualLiftPx':lift,'method':'whole authored cel, fixed sheet scale, shoe-root alignment, nearest sampling; no synthetic poses'}))
    clips.append({'name':state+'_'+direction,'direction':direction,'frames':names,'durationMs':250 if state=='idle' else 120 if state=='walk' else 160 if state=='dragon_charge' else 180 if state=='ultimate_charge' else 140 if state=='death' else 85,'repeat':-1 if state in ['idle','walk','palm_stance'] else 0,'placement':'actor','visualLiftPx':[0,14,7,0] if state=='jumping_palm' else [0,0,0,0]})
 pack(BASE,'boss_bac_cai',cels,clips,(160,112),(80,88))

def effects():
 for folder,(sid,names) in FX.items():
  src=SOURCE/(sid+'_source_v01.png');im=clean(load(src));bs=bands(im,8);cw=im.width/4;cels=[];clips=[]
  # One scale for the complete source sheet; preserves relative anticipation/impact sizes.
  scale=.57
  for r,name in enumerate(names):
   frames=[]
   for c in range(4):
    rect=(round(c*cw),bs[r],round((c+1)*cw),bs[r+1]);cut=im.crop(rect)
    # Keep all disconnected particles in the original cell coordinate system.
    cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(160,160));frame.paste(cut,((160-cut.width)//2,(160-cut.height)//2));fname=f'{name}_{c}';frames.append(fname)
    cels.append((fname,frame,{'path':rel(src),'rect':list(rect),'scale':scale,'method':'authored VFX cell including particles, shared sheet scale, nearest sampling, padded canvas'}))
   loop=name in ['master_aura','counter_shield','ultimate_aura','arm_dragon_spirals','dragon_projectile','dragon_fast','dragon_wide','dragon_twin','dragon_trail','staff_whirlwind']
   direction='right' if name in ['dragon_projectile','dragon_fast','dragon_wide','dragon_twin','sequential_palm','direction_warning','ultimate_lane_warning','frontal_warning','knockback_wake','jade_projectile'] else 'radial' if 'warning' in name or 'shockwave' in name else 'none'
   ground=name in ['circle_warning','landing_warning','palm_shockwave','ground_smash','staff_whirlwind']
   clips.append({'name':name,'direction':direction,'frames':frames,'durationMs':120 if 'warning' in name else 100,'repeat':-1 if loop else 0,'placement':'ground' if ground else 'projectile' if direction=='right' and 'warning' not in name else 'overlay','rotationPolicy':'presentation only; orient right-authored paths to server aim; do not rotate ground ellipses','suggestedAlpha':.35 if name=='master_aura' else .65 if name in ['ultimate_aura','counter_shield'] else 1.0})
  pack(ROOT/'assets/effects/bosses/main/bac-cai'/folder,'bac_cai_'+folder.replace('-','_'),cels,clips,(160,160),(80,80))

def concepts_and_icons():
 dest=ROOT/'assets/concepts/main-bosses/bac-cai';dest.mkdir(parents=True,exist_ok=True)
 for sid,name in [('master_concept','master_concept_v01.png'),('individual','individual_concept_v01.png')]:
  p=dest/name;shutil.copy2(SOURCE/(sid+'_source_v01.png'),p)
  ASSETS.append({'path':rel(p),'id':sid,'kind':'concept','size':list(Image.open(p).size),'sha256':sha(p),'source':'built-in image_gen original generation','status':'concept_auto_approved_by_explicit_task_instruction'})
 im=load(SOURCE/'icons_source_v01.png');folder=ROOT/'assets/icons/bosses/bac-cai'
 names=['portrait','da_cau_bong_kich','bong_da_ac_khuyen','thien_ha_vo_cau','khang_long_huu_hoi','phi_long_tai_thien','kien_long_tai_dien','hang_long_thap_bat_chuong','cai_bang_tong_su']
 cels=[]
 for i,name in enumerate(names):
  r,c=divmod(i,3);rect=[round(c*im.width/3),round(r*im.height/3),round((c+1)*im.width/3),round((r+1)*im.height/3)]
  tile=im.crop(rect);source={'path':rel(SOURCE/'icons_source_v01.png'),'rect':rect,'method':'dedicated icon cell; nearest export'}
  icon=tile.resize((64,64),Image.Resampling.NEAREST);save(folder/(name+'.png'),icon,'icon',source)
  cels.append((name,icon,source))
  if name=='portrait':save(folder/'portrait_256.png',tile.resize((256,256),Image.Resampling.NEAREST),'portrait',source)
 pack(folder,'bac_cai_icons',cels,[{'name':n,'frames':[n],'durationMs':1000,'repeat':0,'placement':'ui'} for n in names],(64,64),(32,32))

actors()
effects()
concepts_and_icons()
dump(SOURCE/'extraction_v01.json',EXTRACTION)
jobs=json.loads((SOURCE/'generation_jobs_v01.json').read_text(encoding='utf-8-sig'))
for j in jobs:
 if 'sourcePath' in j:j['generatorOutputFile']=Path(j.pop('sourcePath')).name
 j['retainedSource']=rel(SOURCE/(j['id']+'_source_v01.png'))
 j['tool']='built-in image_gen';j['sourceSha256']=sha(ROOT/j['retainedSource'])
dump(SOURCE/'generation_jobs_v01.json',jobs)
manifest={'bossId':'bac_cai','textureKey':'boss_bac_cai','nameVi':'Bắc Cái — Hồng Thất Công','createdOn':'2026-10-31','scope':'asset_production_only','conceptApproval':'automatic per explicit user task instruction','productionStatus':'produced; offline asset verification pending; no runtime approval claimed','runtimeIntegrated':False,'runtimeVerified':False,'provenance':{'creator':'OpenAI built-in image_gen, prompted and prepared by Codex for this task','sourceType':'original AI-generated raster artwork','rights':'Generated for this project under applicable OpenAI service terms; no third-party art copied. No separate third-party asset license asserted.','editableSource':'Retained flattened source PNG cels and reproducible extraction recipe; not layered Aseprite sources.'},'actorFrameSize':[160,112],'actorFeetPivot':[80,88],'standingHeightPx':56,'characterAnimationGroups':56,'characterCels':224,'effectGroups':40,'effectCels':160,'iconCount':9,'assets':ASSETS,'animations':CLIPS,'missingAssets':[],'limitations':['No Phaser launch, playback, six-player arena readability or runtime verification, by explicit task instruction.','Generated concept scale illustrations are directional comparisons, not approved hero sprite exports.','Flat source PNGs only; no original layered drawing files.']}
dump(BASE/'package_manifest_v01.json',manifest)
print(json.dumps({'pngExports':len(ASSETS),'animationGroups':len(CLIPS),'characterCels':224,'effectCels':160,'icons':9},indent=2))
