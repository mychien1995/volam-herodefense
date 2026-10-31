"""Asset-only raster extraction. No game imports or runtime writes.
Retains generator source bytes. Exports true drawn cels, never synthetic pose transforms.
"""
from pathlib import Path
from collections import defaultdict
from PIL import Image, ImageDraw
import numpy as np
import json, math, hashlib

ROOT=Path(__file__).resolve().parents[6]
BASE=ROOT/'assets/sprites/bosses/main/dong-ta'
DIRS=['down','up','left','right']
ASSETS=[]; CLIPS=[]
def rel(p): return Path(p).relative_to(ROOT).as_posix()
def dump(p,o):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return Image.open(p).convert('RGBA')
def clean(im,actor=False):
 a=np.array(im).copy()
 # Export binary alpha for crisp nearest-sampled pixel edges; raw source unchanged.
 a[:,:,3]=np.where(a[:,:,3]>=128,255,0).astype('uint8')
 if actor:
  rgb=a[:,:,:3]; mx=rgb.max(2);mn=rgb.min(2)
  matte=(mx>248)&(mn<8)&((rgb<8).sum(2)+(rgb>248).sum(2)==3)
  a[matte,3]=0
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def bbox(im):
 b=im.getchannel('A').getbbox()
 if b is None: raise ValueError('Empty cel')
 return b
def components(im):
 """Run-length connected components: retain actual whole actor outside nominal grid."""
 mask=np.array(im.getchannel('A'))>=128
 parent=[]; runs=[]; prev=[]
 def find(i):
  while parent[i]!=i:
   parent[i]=parent[parent[i]];i=parent[i]
  return i
 for y,row in enumerate(mask):
  d=np.diff(np.pad(row.astype('int8'),(1,1)))
  ss=np.flatnonzero(d==1);ee=np.flatnonzero(d==-1)
  cur=[]
  for s,e in zip(ss,ee):
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
 return [b for b in stats.values() if b[4]>200]
def bands(im,n):
 q=(np.array(im.getchannel('A'))>=128).sum(1);h=im.height
 cuts=[0]
 for i in range(1,n):
  center=i*h/n;lo=max(cuts[-1]+1,round(center-h/n*.22));hi=min(h,round(center+h/n*.22))
  z=q[lo:hi];m=z.min();inds=np.flatnonzero(z==m)+lo
  cuts.append(int(min(inds,key=lambda x:abs(x-center))))
 return cuts+[h]
def actor_cells(src,states,body,size,pivot,skip=(),columns=4):
 im=load(src);bs=bands(im,len(states)); comps=components(im);cw=im.width/columns
 chosen={}
 for r,state in enumerate(states):
  for c in range(columns):
   nominal=(c*cw,bs[r],(c+1)*cw,bs[r+1]);cx=(c+.5)*cw;cy=(bs[r]+bs[r+1])/2
   candidates=[b for b in comps if abs((b[0]+b[2])/2-cx)<cw*.55 and abs((b[1]+b[3])/2-cy)<(bs[r+1]-bs[r])*.65 and b[4]>500]
   if not candidates:raise ValueError(f'No actor {src} {state} {c}')
   b=min(candidates,key=lambda b:(((b[0]+b[2])/2-cx)/cw)**2+(((b[1]+b[3])/2-cy)/(bs[r+1]-bs[r]))**2)
   rect=(max(0,b[0]-2),max(0,b[1]-2),min(im.width,b[2]+2),min(im.height,b[3]+2))
   chosen[(r,c)]=(rect,b,nominal)
 # One shared scale for this facing, never independent per-frame shrinking.
 heights=[b[3]-b[1] for (r,c),(rect,b,nom) in chosen.items() if r==0]
 scale=body/float(np.median(heights))
 out={}
 for (r,c),(rect,b,nom) in chosen.items():
  if states[r] in skip: continue
  cut=clean(im.crop(rect),True)
  # Place original cell center at common root X, bottom contact at common foot Y.
  # A fixed per-facing scale preserves authored action/weapon proportions.
  nw=max(1,round(cut.width*scale));nh=max(1,round(cut.height*scale))
  cut=cut.resize((nw,nh),Image.Resampling.NEAREST)
  x=round(pivot[0]+(rect[0]-(c+.5)*cw)*scale)
  y=pivot[1]-nh
  if x<2 or y<2 or x+nw>size[0]-2 or y+nh>size[1]-2:
   raise ValueError(f'Canvas overflow {src.name} {states[r]} {c}: {(x,y,nw,nh)}')
  frame=Image.new('RGBA',size);frame.paste(cut,(x,y))
  out[(states[r],c)]=(frame,{'path':rel(src),'rect':list(rect),'sourceCell':list(map(round,nom)),'scale':scale,'method':'whole cel crop, shared facing scale, nearest export, fixed feet canvas'})
 return out,bs
def write_png(p,im,kind,source,origin=None):
 p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
 ASSETS.append({'path':rel(p),'id':p.stem,'kind':kind,'size':list(im.size),'sha256':sha(p),'source':source,'origin':origin,'status':'produced_staged_candidate','runtimeIntegrated':False,'runtimeVerified':False})
def atlas(folder,aid,cels,clips,size,pivot):
 w,h=size;cols=8;rows=math.ceil(len(cels)/cols);sheet=Image.new('RGBA',(w*cols,h*rows));frames={}
 timing={f:clip['durationMs'] for clip in clips for f in clip['frames']}
 for i,(name,im,src) in enumerate(cels):
  x=i%cols*w;y=i//cols*h;sheet.paste(im,(x,y))
  write_png(folder/'frames'/(name+'.png'),im,'animation_frame',src,[pivot[0]/w,pivot[1]/h])
  frames[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'duration':timing[name],'sourceArt':src}
 write_png(folder/(aid+'.png'),sheet,'spritesheet','authored source PNG cels')
 dump(folder/(aid+'.json'),{'frames':frames,'meta':{'image':aid+'.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1','pivot':list(pivot),'origin':[pivot[0]/w,pivot[1]/h]}})
 for clip in clips:
  clip.update({'key':aid+'_'+clip['name'],'animationTimingOnly':True,'authoritativeHitEvents':[]})
 dump(folder/(aid+'.animations.json'),{'id':aid,'image':aid+'.png','atlas':aid+'.json','frameSize':list(size),'pivot':list(pivot),'origin':[pivot[0]/w,pivot[1]/h],'animations':clips,'note':'Visual playback proposals only. No damage, cooldown, heal magnitude, gameplay duration or spawn logic.'})
 CLIPS.extend({'id':c['key'],'metadata':rel(folder/(aid+'.animations.json')),'frameCount':len(c['frames'])} for c in clips)
 return frames
BOSS=['idle','walk','basic_sword_combo','finger_cast','sword_flurry_cast','force_wave_cast','dash','summon_cast','ultimate_cast','hurt','death']
MAI=['idle','walk','claw_attack','dash_attack','pull_cast','poison_skull_throw','hurt','death']
HOANG=['idle','walk','basic_strike','support_cast','healing_cast','evade','hurt','death']
def actors(folder,aid,states,body,size,pivot,boss=False):
 cels=[];clips=[];rowlog={}
 for direction in DIRS:
  source_states=states[:]
  if boss and direction=='down':source_states.remove('ultimate_cast')
  if boss and direction in ['left','right']:source_states.remove('force_wave_cast')
  cells,bs=actor_cells(folder/'source'/f'{direction}_source_v01.png',source_states,body,size,pivot,skip=['basic_sword_combo'] if boss and direction in ['left','right'] else []);rowlog[direction]=bs
  if boss:
   for extra,act in [('circle_cast','force_wave_cast')]+([('ultimate_cast','ultimate_cast')] if direction=='down' else []):
    src=folder/'source'/f'{extra}_source_v01.png'
    extra_cells,extra_bs=actor_cells(src,DIRS,body,size,pivot)
    source_direction=({'left':'right','right':'left'}.get(direction,direction) if extra=='circle_cast' else direction)
    for c in range(4):cells[(act,c)]=extra_cells[(source_direction,c)]
  if boss and direction in ['left','right']:
   custom,_=actor_cells(folder/'source'/f'basic_{direction}_source_v02.png',['first','second'],body,size,pivot,columns=2)
   for c in range(4): cells[('basic_sword_combo',c)]=custom[(['first','second'][c//2],c%2)]
  for act in states:
   names=[]
   for c in range(4):
    name=f'{act}_{direction}_{c}';names.append(name);im,source=cells[(act,c)];cels.append((name,im,source))
   clips.append({'name':act+'_'+direction,'direction':direction,'frames':names,'durationMs':250 if act=='idle' else 120 if act=='walk' else 140 if act=='death' else 90,'repeat':-1 if act in ['idle','walk'] else 0,'placement':'actor'})
 atlas(folder,aid,cels,clips,size,pivot)
 dump(folder/'source/extracted_rows_v01.json',rowlog)
actors(BASE,'boss_dong_ta',BOSS,56,(160,112),(80,88),True)
actors(ROOT/'assets/sprites/summons/mai-sieu-phong','summon_mai_sieu_phong',MAI,44,(112,96),(56,72))
actors(ROOT/'assets/sprites/summons/hoang-dung','summon_hoang_dung',HOANG,44,(112,96),(56,72))

FX={
'ta_kiem_lien_kich':['sword_slash','melee_impact','followup_strike'],
'dan_chi_than_cong':['finger_projectile','finger_trail','finger_impact','finger_warning'],
'lac_anh_kiem_phap':['cone_warning','blossom_slash_wave','sword_fan_wave','blossom_impact'],
'ngoc_tieu_hoi_phong':['radial_warning','expanding_force_wave','force_impact','force_cast_gather'],
'dao_anh_di_hinh':['dash_start','afterimage_right','dash_arrival','dash_followup_strike'],
'trieu_hon_dong_hai':['summon_circle','summon_column','mai_spawn','hoang_spawn'],
'dao_hoa_loan_anh_tran':['ultimate_warning','sword_formation','ultimate_projectile_fan','ultimate_impact']}
SUMMONFX={
'mai-sieu-phong':['claw_trail','dash_claw_trail','pull_tendrils','suction_field','poison_skull_projectile','poison_skull_explosion','poison_splash'],
'hoang-dung':['light_strike','heal_aura','support_circle','buff_pulse','movement_trail','protection_shell','blossom_protection_burst']}
def effects(src,folder,aid,families):
 im=load(src);cw=im.width/4;bs=bands(im,len(families));cels=[];clips=[]
 for r,fam in enumerate(families):
  # Fixed full source cell canvas per family preserves original expansion and fade.
  ch=bs[r+1]-bs[r];scale=min(144/cw,144/ch);names=[]
  for c in range(4):
   rect=(round(c*cw),bs[r],round((c+1)*cw),bs[r+1])
   cut=clean(im.crop(rect));cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
   frame=Image.new('RGBA',(160,160));frame.paste(cut,((160-cut.width)//2,(160-cut.height)//2))
   name=f'{fam}_{c}';names.append(name);cels.append((name,frame,{'path':rel(src),'rect':list(rect),'scale':scale,'method':'fixed cell nearest export; binary alpha removes soft matte haze'}))
  warning='warning' in fam
  clips.append({'name':fam,'frames':names,'durationMs':100,'repeat':-1 if fam in ['heal_aura','support_circle','suction_field','protection_shell'] else 0,'placement':'ground' if any(x in fam for x in ['warning','circle','aura','field','formation','wave']) else 'overlay','telegraph':warning,'direction':'right' if any(x in fam for x in ['projectile','trail','slash','strike','afterimage']) else None,'role':'warning' if warning else 'support' if aid.startswith('vfx_hoang') else 'visual_effect'})
 atlas(folder,aid,cels,clips,(160,160),(80,80))
for skill,families in FX.items():
 effects(ROOT/f'assets/effects/bosses/main/dong-ta/source/{skill}_v{2 if skill=="dao_anh_di_hinh" else 1:02d}.png',ROOT/f'assets/effects/bosses/main/dong-ta/{skill}','vfx_'+skill,families)
for who,families in SUMMONFX.items():
 effects(ROOT/f'assets/effects/summons/{who}/source/combat_v{2 if who=="hoang-dung" else 1:02d}.png',ROOT/f'assets/effects/summons/{who}','vfx_'+who.replace('-','_'),families)
bossicons=['portrait_dong_ta','ta_kiem_lien_kich','dan_chi_than_cong','lac_anh_kiem_phap','ngoc_tieu_hoi_phong','dao_anh_di_hinh','trieu_hon_dong_hai','dao_hoa_loan_anh_tran','summon_mai_sieu_phong','summon_hoang_dung']
summonicons=['bach_cot_trao','ma_anh_troc_hon','am_phong_hap_luc','doc_cot_bao','linh_dong_kich','bich_ba_ho_the','linh_xa_bo','thanh_am_ho_tro','dao_hoa_tran_khi']
def icons(src,names,cols,rows):
 im=load(src)
 for i,name in enumerate(names):
  rect=(round(i%cols*im.width/cols),round(i//cols*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows))
  cut=clean(im.crop(rect));b=bbox(cut);cut=cut.crop(b);scale=min(60/cut.width,60/cut.height);cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
  frame=Image.new('RGBA',(64,64));frame.paste(cut,((64-cut.width)//2,(64-cut.height)//2))
  if name=='portrait_dong_ta':
   portrait=clean(im.crop(rect));portrait=portrait.crop(bbox(portrait));ps=min(240/portrait.width,240/portrait.height);portrait=portrait.resize((round(portrait.width*ps),round(portrait.height*ps)),Image.Resampling.NEAREST);pc=Image.new('RGBA',(256,256));pc.paste(portrait,((256-portrait.width)//2,(256-portrait.height)//2));write_png(ROOT/'assets/icons/bosses/dong-ta/portrait_dong_ta_256.png',pc,'portrait',{'path':rel(src),'rect':list(rect)},[.5,.5])
  folder=ROOT/'assets/icons/bosses/summons' if name.startswith('summon_') or name in summonicons else ROOT/'assets/icons/bosses/dong-ta'
  write_png(folder/(name+'.png'),frame,'portrait' if name.startswith('portrait') else 'icon',{'path':rel(src),'rect':list(rect),'contentRect':list(b)},[.5,.5])
icons(ROOT/'assets/icons/bosses/dong-ta/source/boss_icons_v01.png',bossicons,5,2)
icons(ROOT/'assets/icons/bosses/dong-ta/source/summon_icons_v01.png',summonicons,3,3)
manifest={'schemaVersion':1,'id':'dong_ta_complete_art_package_v01','date':'2026-10-31','scope':'asset_production_only','conceptApproval':'automatically approved by explicit user task instruction','productionStatus':'produced_staged_candidate','runtimeIntegrated':False,'runtimeVerified':False,'runtimeApproved':False,'provenance':{'generator':'built-in image_gen','method':'original generated raster art; offline authored-cel crop, nearest-neighbor export and PNG/JSON metadata','license':'Original AI-assisted project artwork; no external sprite pack copied; no exclusive copyright claim','prompts':'assets/sprites/bosses/main/dong-ta/source/generation_jobs_v01.json','editableSource':'retained flattened original PNG sheets; no layered Aseprite source is claimed'},'assets':ASSETS,'animations':CLIPS,'counts':{'characterFrames':432,'characterAnimations':108,'vfxFrames':164,'vfxAnimations':41,'icons':19},'limitations':['No Phaser, gameplay, motion or six-player readability verification requested or run.','Playback timings are visual proposals, never authoritative combat events.','Four-direction character animation; directional effects are authored facing right and may be rotated/mirrored by a future presentation layer.','No layered source reconstruction; retained source PNGs are editable flattened raster sheets.']}
jobs=json.loads((BASE/'source/generation_jobs_v01.json').read_text(encoding='utf-8'))
manifest['sources']=[{'key':j['key'],'path':j['path'],'size':list(Image.open(ROOT/j['path']).size),'sha256':sha(ROOT/j['path']),'promptIndex':i,'status':'retained_source_attempt' if j['key'] in ['fx_dash','fx_hoang'] else 'source'} for i,j in enumerate(jobs)]
manifest['counts']['portraitSizes']=[64,256]
dump(BASE/'package_manifest_v01.json',manifest)
print(json.dumps({'exportedPng':len(ASSETS),'animationGroups':len(CLIPS),'output':rel(BASE/'package_manifest_v01.json')}))
