"""Deterministic export of approved PvP artwork; no generated/programmatic final art.
Maps have separately editable terrain/backdrop/foreground PNG layers and measured
server floor polygons. NPC/FX cells are authored images with explicit semantics.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import hashlib,json,math
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/pvp-v01'
CONCEPT=ROOT/'assets/concepts/loi-dai-standalone-v01'
OUT=ROOT/'assets/exports/pvp'
OUT.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
def save(im,name):
 p=OUT/name;im.save(p)
 files.append({'file':name,'sha256':sha(p),'width':im.width,'height':im.height,'mode':im.mode})
 return name
maps={}
mapping=[('rung_truc','01-rung-truc.png',1280,720),('dia_nguc','02-dia-nguc.png',1120,630),
 ('tuong_duong','03-tuong-duong.png',1120,630),('kiem_ho','04-kiem-ho.png',1120,630)]
# Artist-defined layer split coordinates, in the approved source image.
for id,name,width,height in mapping:
 p=CONCEPT/name;original=Image.open(p).convert('RGBA')
 crop_top=50 if id=='tuong_duong' else 0
 im=original.crop((0,crop_top,original.width,original.height))
 w,h=im.size
 # Central material, perimeter scenery behind actors, lower foreground above feet.
 floor=Image.new('L',(w,h));d=ImageDraw.Draw(floor)
 if id=='rung_truc':d.polygon([(int(w*.07),int(h*.14)),(int(w*.93),int(h*.14)),(int(w*.98),int(h*.81)),(int(w*.02),int(h*.81))],fill=255)
 elif id=='tuong_duong':d.polygon([(int(w*.09),int(h*.28)),(int(w*.91),int(h*.28)),(int(w*.98),int(h*.86)),(int(w*.02),int(h*.86))],fill=255)
 elif id=='kiem_ho':d.ellipse((int(w*.08),int(h*.16),int(w*.92),int(h*.92)),fill=255)
 else:d.ellipse((int(w*.035),int(h*.035),int(w*.965),int(h*.965)),fill=255)
 foreground=Image.new('L',(w,h));ImageDraw.Draw(foreground).rectangle((0,int(h*.90),w,h),fill=255)
 floor=ImageChops.subtract(floor,foreground)
 backdrop=ImageChops.invert(ImageChops.lighter(floor,foreground))
 layers=[]
 for part,mask,depth in [('terrain',floor,-120),('backdrop',backdrop,-110),('foreground',foreground,height*.96)]:
  layer=im.copy();layer.putalpha(mask)
  file=save(layer,id+'-'+part+'.png')
  layers.append({'id':part,'file':file,'depth':depth})
 rebuilt=Image.new('RGBA',im.size)
 for part in ['terrain','backdrop','foreground']:
  rebuilt=Image.alpha_composite(rebuilt,Image.open(OUT/(id+'-'+part+'.png')).convert('RGBA'))
 assert ImageChops.difference(im.convert('RGB'),rebuilt.convert('RGB')).getbbox() is None
 thumb=im.copy();thumb.thumbnail((512,288),Image.Resampling.LANCZOS)
 save(thumb,id+'-thumb.png')
 # Authored apron material extends the world to wider viewport ratios without bars.
 material=im.crop((0,int(h*.34),96,int(h*.34)+96)) if id=='kiem_ho' else im.crop((int(w*.43),int(h*.47),int(w*.43)+192,int(h*.47)+192))
 save(material,id+'-material.png')
 maps[id]={'source':str(p.relative_to(ROOT)).replace('\\','/'),'sourceSha256':sha(p),
  'sourceCrop':[0,crop_top,original.width,original.height],'sourceWidth':w,'sourceHeight':h,
  'logicalWidth':width,'logicalHeight':height,'layers':layers,'recomposition':'pixel_exact_after_declared_crop'}
 # Lava texture is authored image material, not a procedural colored rectangle.
 if id=='dia_nguc':save(Image.open(SOURCE/'lava-material.png').convert('RGBA').resize((512,512),Image.Resampling.LANCZOS),'lava-material.png')
hong=ROOT/'assets/source/loi-dai/hong-moc.png'
im=Image.open(hong).convert('RGBA');im.thumbnail((512,288),Image.Resampling.LANCZOS)
save(im,'hong_moc-thumb.png')
def cells(p,cols,rows):
 im=Image.open(p).convert('RGBA')
 assert im.getchannel('A').getextrema()[0]==0,'Expected real alpha '+str(p)
 result=[]
 for row in range(rows):
  for col in range(cols):
   box=(round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows))
   c=im.crop(box);alpha=c.getchannel('A').point(lambda a:255 if a>=40 else 0)
   box2=alpha.getbbox();assert box2,('Empty cel',row,col)
   result.append((c,box,box2))
 return result
npc_source=SOURCE/'npc-cels.png'
npc_cells=cells(npc_source,5,2)
scale=64/max(b[3]-b[1] for _,_,b in npc_cells)
npc=[]
for i,(cel,source_box,bbox) in enumerate(npc_cells):
 cropped=cel.crop(bbox);alpha=cropped.getchannel('A')
 # Remove only near-transparent source fringe; never paint new character pixels.
 alpha=alpha.point(lambda a:0 if a<40 else min(255,round(a*255/254)))
 cropped.putalpha(alpha)
 size=(max(1,round(cropped.width*scale)),max(1,round(cropped.height*scale)))
 cropped=cropped.resize(size,Image.Resampling.NEAREST)
 canvas=Image.new('RGBA',(112,96))
 canvas.alpha_composite(cropped,((112-size[0])//2,80-size[1]))
 file=save(canvas,'doc-co-'+str(i)+'.png')
 npc.append({'file':file,'sourceBox':list(source_box),'contentBox':list(bbox),'pivot':[56,80]})
vfx_source=SOURCE/'vfx-cels.png';fxcells=cells(vfx_source,4,3)
vfx=[]
names=['dart','arrow-0','arrow-1','impact','sword-0','sword-1','sword-2','sword-warning','lightning-0','lightning-1','lightning-2','lightning-warning']
for i,(cel,source_box,bbox) in enumerate(fxcells):
 cropped=cel.crop(bbox)
 if i in [4,5,6,7]:target=(512,256)
 elif i in [8,9,10]:target=(128,192)
 elif i==11:target=(128,80)
 else:target=(128,80)
 s=min((target[0]-4)/cropped.width,(target[1]-4)/cropped.height)
 size=(max(1,round(cropped.width*s)),max(1,round(cropped.height*s)))
 cropped=cropped.resize(size,Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',target)
 y=target[1]-size[1]-2 if i in [4,5,6,7,8,9,10] else (target[1]-size[1])//2
 canvas.alpha_composite(cropped,((target[0]-size[0])//2,y))
 file=save(canvas,names[i]+'.png')
 vfx.append({'id':names[i],'file':file,'sourceBox':list(source_box),'contentBox':list(bbox)})
approved=[p for p in CONCEPT.glob('*.png')]
lock={'approvedOn':'2026-11-19','scope':'Eleven V01 review concepts, including V02 lobby/settings',
 'userApproval':'Artwork ổn, tôi duyệt. Hãy triển khai tính năng Lôi Đài theo đặc tả đã lưu, sử dụng bộ artwork này và bám sát game hiện tại.',
 'runtimeApproval':True,'files':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in sorted(approved)}}
lock_path=ROOT/'assets/approved_pvp_concepts.lock.json'
if lock_path.exists():
 assert json.loads(lock_path.read_text(encoding='utf-8'))['files']==lock['files'],'Approved concept changed'
else:lock_path.write_text(json.dumps(lock,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
manifest={'version':1,'source':'approved concepts plus authored production NPC/FX cels',
 'conceptApproval':'approved_pvp_concepts.lock.json','runtimeApproval':True,
 'sources':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in [npc_source,vfx_source,SOURCE/'lava-material.png']},
 'maps':maps,'hongMoc':'reuse assets/exports/loi-dai-v2 unchanged','npc':{'width':112,'height':96,'pivot':[56,80],
 'facing':'down','frames':npc,'clips':{'idle':{'frames':[0,1],'fps':3,'repeat':-1},'sword':{'frames':[2,3,4],'fps':7,'repeat':0},'lightning':{'frames':[5,6,7,8,9],'fps':6,'repeat':0}}},
 'vfx':vfx,'files':files}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'PvP export: {len(files)} PNGs; 4 layered scenes, 10 NPC cels, 12 FX cels; exact scene recomposition.')
