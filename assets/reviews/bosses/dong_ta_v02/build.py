"""Standalone art-demo exporter. No gameplay assets are replaced.
Reuses retained Ly Mac Sau packer and foot placement; alpha-gutter grid
generalizes the same extractor for the generator's actual five-column source.
"""
from pathlib import Path
import json, hashlib, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def rel(p): return p.relative_to(ROOT).as_posix()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('retained',ROOT/'assets/sprites/bosses/ly-mac-sau/source/package_assets.py')
X=importlib.util.module_from_spec(spec);spec.loader.exec_module(X)
B=ROOT/'assets/sprites/bosses/main/dong-ta/rework_v02'
F=ROOT/'assets/effects/bosses/main/dong-ta/rework_v02'
M=ROOT/'assets/effects/summons/mai-sieu-phong/rework_v02'
def clean(im):
 a=np.array(im.convert('RGBA')).copy()
 a[:,:,3]=np.where(a[:,:,3]>=128,255,0).astype('uint8')
 rgb=a[:,:,:3]
 matte=(rgb.max(2)>248)&(rgb.min(2)<8)&(((rgb<8).sum(2)+(rgb>248).sum(2))==3)
 a[matte,3]=0
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def cells(path,rows,columns=4):
 im=clean(Image.open(path));mask=np.array(im.getchannel('A'))>0
 h,w=mask.shape
 def cuts(count,n):
  length=len(count);out=[0]
  for i in range(1,n):
   target=length*i/n;lo=round(target-length/n*.18);hi=round(target+length/n*.18)
   score=count[lo:hi]+abs(np.arange(lo,hi)-target)*.03
   out.append(int(np.argmin(score))+lo)
  return out+[length]
 yy=cuts(mask.sum(1),rows);out=[]
 for r in range(rows):
  xx=cuts(mask[yy[r]:yy[r+1]].sum(0),columns);row=[]
  for c in range(columns):
   box=(xx[c],yy[r],xx[c+1],yy[r+1]);cel=im.crop(box);bb=cel.getbbox()
   assert bb, (path,r,c)
   row.append((cel.crop(bb),{'source':rel(path),'sourceCell':[r,c],'sourceRect':[box[0]+bb[0],box[1]+bb[1],bb[2]-bb[0],bb[3]-bb[1]],'sourceSha256':sha(path)}))
  out.append(row)
 return out
extra={'status':'prototype_pending_director_review','conceptApproval':'existing_identity_reused_new_actions_pending','runtimeIntegrated':False,'runtimeVerified':False,'runtimeApproved':False,'source':'Original built-in image_gen PNGs; flattened raster sources; exact prompts in generation_jobs.json. Export reuses retained packer/feet anchoring, shared row scale, nearest resampling and binary alpha.','license':'Generated for this project; no external sprite pack; no exclusive copyright claim.'}
def actors():
 frames=[];clips={}
 for state,file,cols in [('thrust','thrust_source_v02.png',5),('flute','flute_source_v02.png',4)]:
  source=cells(B/'source'/file,4,cols)
  for r,d in enumerate(['down','left','right','up']):
   row=source[r]
   if state=='flute' and d=='left': row=cells(B/'source/flute_left_source_v03.png',1)[0]
   # Five authored thrust poses; use anticipation, contact, second contact, recovery.
   if cols==5: row=[row[i] for i in [0,1,3,4]]
   # Scale by head-to-boots first cel excluding downward protruding sword tip.
   # Source-foot detector isolates the black boots rather than blade/robe hem.
   first=row[0][0];foot=X.foot(first);factor=56/max(1,foot[1])
   names=[]
   for i,item in enumerate(row):
    name=state+'_'+d+'_'+str(i)
    im=clean(X.place_actor(item,factor,(160,112),(80,88),name))
    frames.append((name,im,100 if state=='thrust' else 170));names.append(name)
   clips[state+'_'+d]={'frames':names,'durationsMs':[100 if state=='thrust' else 170]*4,'loop':False}
 X.pack(B,frames,clips,(160,112),(80,88),'dong_ta_actions_v02',extra)
def effects(folder,file,names,widths):
 source=cells(folder/'source'/file,len(names));frames=[];clips={}
 for r,name in enumerate(names):
  row=source[r];factor=min(widths[r]/max(v[0].width for v in row),120/max(v[0].height for v in row))
  ids=[]
  for i,(im,recipe) in enumerate(row):
   im=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.NEAREST)
   frame=Image.new('RGBA',(160,160));xy=((160-im.width)//2,(160-im.height)//2)
   frame.alpha_composite(im,xy);fid=name+'_'+str(i);ids.append(fid);frames.append((fid,frame,100))
   X.RECIPES.append(dict(recipe,frame=fid,scale=factor,destination=xy,canvas=[160,160],pivot=[80,80]))
  clips[name]={'frames':ids,'durationsMs':[100]*4,'loop':name in ['pebble','heal_palm','poison_pool','suction','petal_patch','ranged_claw'],'canonicalDirection':'right' if name in ['thrust_streak','pebble','heal_palm','claw_left','ranged_claw'] else 'left' if name=='claw_right' else None}
 X.pack(folder,frames,clips,(160,160),(80,80),folder.parent.name+'_vfx_v02',extra)
def old(key,folder,stem):
 a=read(folder/(stem+'.animations.json'));return {'image':rel(folder/(stem+'.png')),'frames':read(folder/(stem+'.json'))['frames'],'origin':a['origin'],'clips':[{'name':c['name'],'frames':c['frames'],'fps':1000/c['durationMs'],'repeat':c['repeat']} for c in a['animations']]}
def new(folder):
 a=read(folder/'animations.json');m=read(folder/'manifest.json')
 return {'image':rel(folder/'spritesheet.png'),'frames':read(folder/'atlas.json')['frames'],'origin':m['origin'],'clips':[{'name':k,'frames':c['frames'],'fps':1000/c['durationsMs'][0],'repeat':-1 if c['loop'] else 0} for k,c in a['animations'].items()]}
def main():
 actors()
 effects(F,'dong_ta_vfx_source_v02.png',['thrust_streak','pebble','petal_patch','petal_burst','heal_palm'],[128,58,104,128,76])
 effects(M,'mai_vfx_source_v02.png',['claw_left','claw_right','ranged_claw','suction','poison_pouch','poison_burst','poison_pool'],[104,104,120,120,46,136,128])
 bundles={}
 for k,p,s in [('dong',ROOT/'assets/sprites/bosses/main/dong-ta','boss_dong_ta'),('mai',ROOT/'assets/sprites/summons/mai-sieu-phong','summon_mai_sieu_phong'),('hoang',ROOT/'assets/sprites/summons/hoang-dung','summon_hoang_dung')]:
  bundles[k]=old(k,p,s)
 for k,skill in [('fan','lac_anh_kiem_phap'),('dash','dao_anh_di_hinh'),('summon','trieu_hon_dong_hai')]:
  bundles[k]=old(k,ROOT/'assets/effects/bosses/main/dong-ta'/skill,'vfx_'+skill)
 bundles['hoangfx']=old('hoangfx',ROOT/'assets/effects/summons/hoang-dung','vfx_hoang_dung')
 for k,p in [('actions',B),('fx',F),('maifx',M)]: bundles[k]=new(p)
 # Retained approved players are scale/reach references only, never regenerated.
 hero=ROOT/'assets/exports/characters'
 for key,stem in [('hero','hero_vo_dang'),('cai','hero_cai_bang_chuong'),('thien','hero_thien_son')]:
  ha=read(hero/(stem+'.json'));groups={}
  for fid in ha['frames']:
   name=fid.rsplit('_',1)[0];groups.setdefault(name,[]).append(fid)
  bundles[key]={'image':rel(hero/(stem+'.png')),'frames':ha['frames'],'origin':[.5,.8] if key!='cai' else [.5,.8],'clips':[{'name':k,'frames':v,'fps':4 if k.startswith('idle') else 8,'repeat':-1 if k.startswith(('idle','walk')) else 0} for k,v in groups.items()]}
 save(HERE/'data.json',{'status':'prototype_pending_director_review','bundles':bundles,'ground':'assets/exports/arena_v2/ground.png','worldAtlas':'assets/exports/arena_art01/world.json','worldImage':'assets/exports/arena_art01/world.png','runtimeIntegrated':False,'serverMechanics':False})
 save(HERE/'extraction_recipes.json',X.RECIPES)
 retained=[]
 for b in bundles.values(): retained.append({'path':b['image'],'sha256':sha(ROOT/b['image'])})
 for p in [ROOT/'assets/concepts/main-bosses/dong-ta/master_concept_v01.png',ROOT/'assets/concepts/summons/mai-sieu-phong/master_concept_v01.png',ROOT/'assets/concepts/summons/hoang-dung/master_concept_v01.png']: retained.append({'path':rel(p),'sha256':sha(p)})
 save(HERE/'provenance.json',{'status':'prototype_pending_director_review','newCharacterFrames':32,'newVfxFrames':48,'retained':retained,'newSources':[{'path':rel(p),'sha256':sha(p),'size':list(Image.open(p).size)} for p in [*B.glob('source/*.png'),*F.glob('source/*.png'),*M.glob('source/*.png')]],'tool':'built-in image_gen','flattenedSources':True,'newArena':False,'runtimeIntegrated':False,'runtimeApproval':False,'recordings':False,'notes':['Retained character/concept exports unchanged.','Flute original left row rejected; separately authored left correction used.','Thrust source actually has five columns; use authored 0/1/3/4; source retained intact.','Mai claw_right art canonically points left; renderer mirrors only its VFX for a rightward attack.','New action and VFX PNGs pending director approval.']})
 print('Exported 32 new character cels, 48 new VFX cels. Retained all existing character sprites.')
if __name__=='__main__': main()

