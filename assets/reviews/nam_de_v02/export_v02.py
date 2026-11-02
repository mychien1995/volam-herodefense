"""Extract authored PNG cels, preserve source, write review-only atlas and hashes."""
from pathlib import Path
from PIL import Image
import hashlib,json
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=BASE/'source/vfx_rework_v02.png'
im=Image.open(source).convert('RGBA')
w,h=im.size
assert w>1000 and h>1000,im.size
rows=[('dash_wake',0,315,(192,112)),('pressure_contact',315,632,(128,128)),('dizzy_halo',632,815,(128,80)),('sky_ray',815,1280,(128,256))]
sheet=Image.new('RGBA',(768,1024));frames={};records=[];clips=[]
out=BASE/'frames';out.mkdir(exist_ok=True)
for row,(name,top,bottom,size) in enumerate(rows):
 names=[];cuts=[]
 for col in range(4):
  rect=(round(col*w/4),round(top*h/1280),round((col+1)*w/4),round(bottom*h/1280))
  cel=im.crop(rect)
  px=list(cel.getdata());cel.putdata([(r,g,b,a if a>=32 else 0) for r,g,b,a in px])
  bbox=cel.getchannel('A').getbbox();assert bbox,(name,col)
  cuts.append((rect,cel.crop(bbox)))
 scale=min((size[0]-12)/max(c.width for _,c in cuts),(size[1]-12)/max(c.height for _,c in cuts))
 for col,(rect,cut) in enumerate(cuts):
  cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
  frame=Image.new('RGBA',size)
  frame.alpha_composite(cut,((size[0]-cut.width)//2,(size[1]-cut.height)//2))
  key=f'{name}_{col}';names.append(key)
  target=out/f'{key}.png';frame.save(target)
  x,y=col*192,row*256;sheet.alpha_composite(frame,(x,y))
  frames[key]={'frame':{'x':x,'y':y,'w':size[0],'h':size[1]},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size[0],'h':size[1]},'sourceSize':{'w':size[0],'h':size[1]}}
  records.append({'path':str(target.relative_to(ROOT)).replace('\\','/'),'sha256':sha(target),'sourceRect':rect,'sharedGroupScale':scale,'alphaBounds':frame.getchannel('A').getbbox(),'size':size})
 clips.append({'name':name,'frames':names,'durationMs':100,'repeat':-1 if name=='dizzy_halo' else 0,'origin':[.5,.5],'authoritativeHitEvents':[]})
sheet.save(BASE/'vfx_rework_v02.png')
dump(BASE/'vfx_rework_v02.json',{'frames':frames,'meta':{'image':'vfx_rework_v02.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1'}})
dump(BASE/'vfx_rework_v02.animations.json',{'animations':clips})
# Isolate the authored horizontal shaft from the retained beam cels. The v01
# exports contain a neighboring charge/ground fragment; never stretch that debris.
rays=Image.new('RGBA',(408,20));rayframes={};derivatives=[]
for i in range(4):
 p=ROOT/f'assets/effects/bosses/main/nam-de/ultimate/nhat_duong_quy_tong/frames/ultimate_beam_{i}.png'
 cel=Image.open(p).convert('RGBA')
 scores=[sum(1 for x in range(40,140) if (lambda px:px[0]>230 and px[1]>195 and px[3]>100)(cel.getpixel((x,y)))) for y in range(30,160)]
 center=30+max(range(len(scores)),key=lambda y:scores[y])
 rect=(40,center-9,142,center+11);cut=cel.crop(rect);rays.alpha_composite(cut,(i*102,0))
 key=f'beam_{i}';rayframes[key]={'frame':{'x':i*102,'y':0,'w':102,'h':20},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':102,'h':20},'sourceSize':{'w':102,'h':20}}
 derivatives.append({'source':str(p.relative_to(ROOT)).replace('\\','/'),'sourceSha256':sha(p),'rect':rect})
rays.save(BASE/'rays.png')
dump(BASE/'rays.json',{'frames':rayframes,'meta':{'image':'rays.png','size':{'w':408,'h':20}}})
dump(BASE/'rays.animations.json',{'animations':[{'name':'beam','frames':list(rayframes),'durationMs':100,'repeat':0,'authoritativeHitEvents':[]}]})
dump(BASE/'ray_derivation.json',{'scope':'Crop retained original shaft pixels only; no new paint','cels':derivatives})
actor=ROOT/'assets/sprites/bosses/main/nam-de';fx=ROOT/'assets/effects/bosses/main/nam-de'
packages=[('boss',actor/'boss_nam_de'),('palm',fx/'skills/phat_mon_chuong/vfx_phat_mon_chuong'),('finger',fx/'skills/nhat_duong_chi/vfx_nhat_duong_chi'),('rapid',fx/'skills/lien_hoan_nhat_duong_chi/vfx_lien_hoan_nhat_duong_chi'),('pressure',fx/'skills/dai_ly_phong_huyet/vfx_dai_ly_phong_huyet'),('light',fx/'healing/phat_quang_pho_chieu/vfx_phat_quang_pho_chieu'),('ultimate',fx/'ultimate/nhat_duong_quy_tong/vfx_nhat_duong_quy_tong'),('rework',BASE/'vfx_rework_v02')]
packages.append(('rays',BASE/'rays'))
data=[];retained=[]
for key,p in packages:
 rel='/'+str(p.relative_to(ROOT)).replace('\\','/')
 meta=json.loads(Path(str(p)+'.animations.json').read_text(encoding='utf-8-sig'))
 data.append({'key':key,'base':rel,'clips':meta['animations'],'origin':meta.get('origin',[.5,.5])})
 if key not in ['rework','rays']:
  for suffix in ['.png','.json','.animations.json']:
   file=Path(str(p)+suffix);retained.append({'path':str(file.relative_to(ROOT)).replace('\\','/'),'sha256':sha(file)})
dump(BASE/'data.json',{'packages':data})
for relative in ['assets/concepts/main-bosses/nam-de/master_concept_v01.png','assets/concepts/main-bosses/nam-de/individual_concept_v01.png','assets/sprites/bosses/main/nam-de/package_manifest_v01.json','assets/arena_v2.manifest.json','assets/exports/arena_v2/ground.png','assets/exports/arena_art01/world.png','assets/exports/arena_art01/world.json','assets/exports/arena_art01/ambient.png','assets/exports/arena_art01/ambient.json']+[f'assets/exports/characters/hero_{s}.{ext}' for s in ['cai_bang_chuong','vo_dang','thien_son','thieu_lam'] for ext in ['png','json']]:
 retained.append({'path':relative,'sha256':sha(ROOT/relative)})
dump(BASE/'manifest.json',{'status':'prototype_pending_director_review','date':'2026-11-01','scope':'Isolated Phaser 4 art preview; no encounter/server integration','actorUnchanged':True,'newSource':{'path':str(source.relative_to(ROOT)).replace('\\','/'),'sha256':sha(source),'generator':'built-in image_gen','license':'Original AI-assisted project artwork; no external pack or exclusive copyright claim','sourceKind':'flattened transparent PNG; no layered Aseprite claimed'},'sampling':'nearest','newFrames':records,'retainedAssets':retained,'runtimeIntegrated':False,'runtimeApproved':False,'recording':False})
m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
m['derivedCels']=derivatives
m['outputs']=[{'path':str((BASE/p).relative_to(ROOT)).replace('\\','/'),'sha256':sha(BASE/p)} for p in ['vfx_rework_v02.png','vfx_rework_v02.json','vfx_rework_v02.animations.json','rays.png','rays.json','rays.animations.json','ray_derivation.json','data.json','generation_prompt.json']]
dump(BASE/'manifest.json',m)
print(json.dumps({'exported':len(records),'retainedPackages':len(packages)-1,'status':'prototype'}))
