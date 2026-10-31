"""Offline PNG/JSON preparation only. No game imports, servers, or runtime writes."""
from pathlib import Path
import json, math, hashlib, shutil
from PIL import Image
import numpy as np
from collections import deque

ROOT = Path(__file__).resolve().parents[5]
BASE = ROOT / 'assets/sprites/bosses/chu-ba-thong'
MANIFEST = {'schemaVersion': 1, 'id': 'chu_ba_thong_art_package_v01', 'date': '2026-10-31',
 'scope': 'Asset production only; no gameplay implementation',
 'conceptApproval': 'Automatically approved by explicit task instruction',
 'productionStatus': 'produced; asset-level verification only; runtime not tested',
 'integrated': False, 'runtimeVerified': False,
 'provenance': {'method': 'Original built-in image_gen artwork; offline Pillow crop, nearest-neighbor export and metadata',
 'license': 'Original AI-assisted project artwork; no external game pack copied; no exclusive copyright asserted',
 'prompts': 'assets/sprites/bosses/chu-ba-thong/source/generation_prompts_*.json'},
 'assets': [], 'animations': [], 'reusedAssets': []}

def rel(p): return Path(p).relative_to(ROOT).as_posix()
def dump(p, obj):
 p.parent.mkdir(parents=True, exist_ok=True)
 p.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def image_at(p): return Image.open(ROOT/p).convert('RGBA')
def bounds(im):
 a=np.asarray(im.getchannel('A'))
 yy,xx=np.where(a>32)
 if not len(xx): raise ValueError('Empty image')
 return (int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))
def actor_bounds(im):
 # Locate the principal drawn cel, excluding detached fragments from adjacent source cells.
 mask=np.asarray(im.getchannel('A'))>128;seen=np.zeros(mask.shape,dtype=bool);components=[]
 h,w=mask.shape
 for sy,sx in zip(*np.where(mask)):
  if seen[sy,sx]:continue
  queue=deque([(int(sx),int(sy))]);seen[sy,sx]=True;points=[]
  while queue:
   x,y=queue.popleft();points.append((x,y))
   for yy in range(max(0,y-1),min(h,y+2)):
    for xx in range(max(0,x-1),min(w,x+2)):
     if mask[yy,xx] and not seen[yy,xx]:seen[yy,xx]=True;queue.append((xx,yy))
  components.append(points)
 main=max(components,key=len);p=np.asarray(main)
 return(max(0,int(p[:,0].min())-1),max(0,int(p[:,1].min())-1),min(w,int(p[:,0].max())+2),min(h,int(p[:,1].max())+2))
def record(p, kind, source, pivot=None, **extra):
 im=Image.open(p)
 e={'id':p.stem, 'kind':kind,'path':rel(p),'size':list(im.size),'sha256':digest(p),'source':source,
 'status':'produced','integrated':False,'runtimeVerified':False,**extra}
 if pivot is not None: e['origin']=pivot
 MANIFEST['assets'].append(e)
 return e
def save_png(im,p,kind,source,pivot=None,**extra):
 # Final pixel-art export uses binary alpha. Retained raw generator PNGs are unchanged.
 if im.mode=='RGBA':
  im=im.copy();im.putalpha(im.getchannel('A').point(lambda a:255 if a>=128 else 0))
  pixels=np.asarray(im).copy();pixels[pixels[:,:,3]==0,:3]=0;im=Image.fromarray(pixels)
 p.parent.mkdir(parents=True, exist_ok=True); im.save(p)
 return record(p,kind,source,pivot,**extra)

def atlas(out, asset_id, cels, clips, size, origin, sources):
 """cels are explicitly ordered (frame_name, RGBA, source rectangle)."""
 out.mkdir(parents=True,exist_ok=True)
 w,h=size; cols=8; rows=math.ceil(len(cels)/cols)
 sheet=Image.new('RGBA',(cols*w,rows*h)); frames={}
 durations={name:round(1000/clip.get('fps',10)) for clip in clips for name in clip['frames']}
 for i,(name,im,src) in enumerate(cels):
  if im.size != size: raise ValueError(name+' size')
  x=(i%cols)*w; y=(i//cols)*h; sheet.paste(im,(x,y))
  fp=out/'frames'/(name+'.png'); save_png(im,fp,'animation_frame',src,origin)
  frames[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,
   'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'duration':durations[name],
   'sourceArt':src}
 sp=out/(asset_id+'.png'); save_png(sheet,sp,'spritesheet',sources,origin)
 ap=out/(asset_id+'.json')
 dump(ap,{'frames':frames,'meta':{'app':'offline Pillow asset preparation','image':sp.name,'size':{'w':sheet.width,'h':sheet.height},'scale':'1','origin':origin}})
 tags=[]
 for clip in clips:
  tags.append({'key':asset_id+'_'+clip['name'],'name':clip['name'],'frames':clip['frames'],
   'frameRate':clip.get('fps',10),'repeat':-1 if clip.get('loop',False) else 0,'origin':origin,
   'direction':clip.get('direction'),'stage':clip.get('stage',clip['name']),
   'placement':clip.get('placement','actor'),'animationTimingOnly':True,
   'authoritativeHitEvents':[]})
 dump(out/(asset_id+'.animations.json'),{'schemaVersion':1,'id':asset_id,'image':sp.name,'atlas':ap.name,
  'frameSize':list(size),'origin':origin,'animations':tags,
  'note':'Visual playback proposals only. No damage, stun, buff duration or cooldown is defined.'})
 MANIFEST['animations'].extend({'id':t['key'],'metadata':rel(out/(asset_id+'.animations.json')),'frameCount':len(t['frames'])} for t in tags)
 return tags

# Actual source row rectangles were inspected, rather than inferred from image dimensions.
BOSS_BANDS={
 'down':[0,211,420,617,821,1035,1245,1464,1689,1983],
 'up':[0,194,398,596,787,988,1179,1380,1593,1881],
 'left':[0,225,435,641,845,1057,1268,1480,1677,1881],
 'right':[0,226,439,649,855,1066,1264,1470,1679,1881]}
BOSS_ACTIONS=['idle','walk','drink','basic_palm','dual_hand','dash','counter','hit','defeat']
DISCIPLE_BANDS={
 'down':[0,253,494,750,1007,1232,1480,1659],
 'up':[0,257,500,744,995,1226,1448,1659],
 'left':[0,270,519,771,1016,1242,1476,1659],
 'right':[0,265,509,760,998,1231,1457,1659]}
DISCIPLE_ACTIONS=['idle','walk','carry_walk','basic_defense_attack','hit','drop_wine','death']

def actors(folder,asset_id,body_height,bands,actions,cast=False):
 cels=[];clips=[];size=(112,96) if body_height==56 else (80,80); pivot=(size[0]//2,80 if body_height==56 else 64)
 for direction in ['down','up','left','right']:
  src=f'{folder}/source/{direction}_source_v01.png'; im=image_at(src); cw=im.width/4; ys=bands[direction]
  # A single scale per facing preserves dimensions across action poses and defeat.
  standing=[]
  for r in [0,1]:
   for c in range(4):
    box=(round(c*cw),ys[r],round((c+1)*cw),ys[r+1]);b=bounds(im.crop(box));standing.append(b[3]-b[1])
  scale=body_height/float(np.median(standing))
  for r,act in enumerate(actions):
   names=[]
   for c in range(4):
    box=(round(c*cw),ys[r],round((c+1)*cw),ys[r+1]); cell=im.crop(box);b=actor_bounds(cell)
    cut=cell.crop(b);nw=max(1,round(cut.width*scale));nh=max(1,round(cut.height*scale))
    cut=cut.resize((nw,nh),Image.Resampling.NEAREST)
    x=round(pivot[0]+(b[0]-cell.width/2)*scale); y=pivot[1]-nh
    if x<1 or y<1 or x+nw>=size[0] or y+nh>=size[1]: raise ValueError(f'Actor overflow {asset_id} {direction} {act} {c}')
    frame=Image.new('RGBA',size);frame.paste(cut,(x,y))
    name=f'{act}_{direction}_{c}';names.append(name)
    cels.append((name,frame,{'path':src,'rect':list(box),'contentRect':list(b),'scale':scale,'method':'crop + constant-per-facing nearest-neighbor; feet aligned'}))
   clips.append({'name':act+'_'+direction,'frames':names,'direction':direction,'fps':4 if act=='idle' else 8 if act in ['drink','defeat','death'] else 10,'loop':act in ['idle','walk','carry_walk','counter']})
 if cast:
  src=folder+'/source/cast_ultimate_source_v01.png';im=image_at(src); ys=[0,221,439,662,886,1110,1328,1547,1774];cw=im.width/4
  for r in range(8):
   direction=['down','up','left','right'][r%4];act='yin_yang_cast' if r<4 else 'ultimate_charge'
   names=[]
   # Shared scale for cast rows, same logical elder body family.
   scale=56/198
   for c in range(4):
    box=(round(c*cw),ys[r],round((c+1)*cw),ys[r+1]);cell=im.crop(box);b=actor_bounds(cell);cut=cell.crop(b)
    cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
    x=round(pivot[0]+(b[0]-cell.width/2)*scale);y=pivot[1]-cut.height
    frame=Image.new('RGBA',size);frame.paste(cut,(x,y));name=f'{act}_{direction}_{c}';names.append(name)
    cels.append((name,frame,{'path':src,'rect':list(box),'contentRect':list(b),'scale':scale}))
   clips.append({'name':act+'_'+direction,'frames':names,'direction':direction,'fps':8})
 return atlas(ROOT/folder,asset_id,cels,clips,size,[pivot[0]/size[0],pivot[1]/size[1]],'retained generated source PNGs in source/')

actors('assets/sprites/bosses/chu-ba-thong','boss_chu_ba_thong',56,BOSS_BANDS,BOSS_ACTIONS,True)
actors('assets/sprites/summons/toan-chan-disciples','toan_chan_disciple',44,DISCIPLE_BANDS,DISCIPLE_ACTIONS)

FX={
 'khong_minh_quyen':([0,466,788,1086],['impact','shockwave','palm_wave']),
 'song_thu_ho_bac':([0,283,556,781,1077,1402],['yin_palm','yang_palm','dual_telegraph','yin_impact','yang_impact']),
 'thai_cuc_am_duong_tran':([0,261,492,717,993,1235,1536],['formation','rotating_ring','danger_zones','eruption','stun','cast_gather']),
 'tuy_tien_bo':([0,400,654,990,1254],['afterimage_right','wind_trail','arrival','dash_telegraph']),
 'can_khon_phan_chan':([0,299,560,850,1133,1402],['defensive_field','charge_warning','radial_shockwave','counter_impact','guard_trigger']),
 'am_duong_nghich_chuyen':([0,275,524,742,1002,1227,1536],['large_formation','rotating_waves','palm_waves','danger_pattern','safe_pattern','ultimate_impact']),
 'wine_mechanic':([0,314,526,786,1064,1274,1536],['wine_drop','pickup_glow','consume','player_buff','empowered_hit','buff_expire']),
 'statuses':([0,377,703,1086],['protection_loop','immune_hit','wine_damage_indicator']),
 'disciple_vfx':([0,384,772,1086],['entry_spawn','delivery_indicator','wine_drop_impact'])}

def effect_source(key):
 if key=='wine_mechanic': return 'assets/effects/bosses/chu-ba-thong/wine-mechanic/source_v01.png'
 if key=='statuses': return 'assets/effects/bosses/chu-ba-thong/statuses/source_v01.png'
 if key=='disciple_vfx': return 'assets/effects/bosses/chu-ba-thong/wine-mechanic/disciple_source_v01.png'
 if key=='thai_cuc_am_duong_tran': return 'assets/effects/bosses/chu-ba-thong/skills/thai_cuc_am_duong_tran/source_clean_v02.png'
 return 'assets/effects/bosses/chu-ba-thong/skills/'+key+'/source_v01.png'

for key,(ys,families) in FX.items():
 src=effect_source(key);im=image_at(src);cw=im.width/4;out=(ROOT/src).parent
 cels=[];clips=[]
 for r,fam in enumerate(families):
  # This generated counter sheet places families in columns and time in rows 0..3.
  if key=='can_khon_phan_chan' and r<4:
   boxes=[(round(r*cw),ys[t],round((r+1)*cw),ys[t+1]) for t in range(4)]
  else: boxes=[(round(c*cw),ys[r],round((c+1)*cw),ys[r+1]) for c in range(4)]
  # Fixed shared family scale; growth of a burst stays authored across its cels.
  scale=108/max(max(b[2]-b[0],b[3]-b[1]) for b in boxes)
  names=[]
  for c,box in enumerate(boxes):
   cell=im.crop(box);rw=round(cell.width*scale);rh=round(cell.height*scale)
   cell=cell.resize((rw,rh),Image.Resampling.NEAREST)
   frame=Image.new('RGBA',(128,128));frame.paste(cell,((128-rw)//2,(128-rh)//2))
   name=f'{fam}_{c}';names.append(name);cels.append((name,frame,{'path':src,'rect':list(box),'scale':scale,'method':'fixed family canvas nearest-neighbor; original alpha retained'}))
  placement='ground' if any(s in fam for s in ['formation','ring','zone','pattern','telegraph','shockwave','glow']) else 'above_head' if fam in ['stun','delivery_indicator'] else 'overlay'
  clips.append({'name':fam,'frames':names,'stage':fam,'fps':8 if 'loop' in fam or 'ring' in fam else 12,'loop':fam in ['protection_loop','player_buff','pickup_glow','rotating_ring','rotating_waves','delivery_indicator'],'placement':placement,'direction':'right' if fam in ['palm_wave','yin_palm','palm_waves','afterimage_right','wind_trail','dash_telegraph'] else 'left' if fam=='yang_palm' else None})
 atlas(out,'vfx_'+key,cels,clips,(128,128),[0.5,0.5],src)

# Item + status icon artwork is a purpose-generated production pack, not a concept crop.
src='assets/icons/bosses/chu-ba-thong/source_v01.png';im=image_at(src);cw=im.width/2;ch=im.height/2
for i,name in enumerate(['toan_chan_tien_tuu_world','toan_chan_tien_tuu_icon','wine_buff_icon','protection_icon']):
 box=(round(i%2*cw),round(i//2*ch),round((i%2+1)*cw),round((i//2+1)*ch));cell=im.crop(box);cell=cell.crop(bounds(cell))
 canvas=(40,40) if i==0 else(64,64);extent=(26,30) if i==0 else(58,58);scale=min(extent[0]/cell.width,extent[1]/cell.height)
 cell=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.NEAREST);frame=Image.new('RGBA',canvas)
 frame.paste(cell,((canvas[0]-cell.width)//2,canvas[1]-cell.height-3 if i==0 else (canvas[1]-cell.height)//2))
 save_png(frame,ROOT/'assets/icons/bosses/chu-ba-thong'/(name+'.png'),'world_item' if i==0 else'icon',{'path':src,'rect':list(box)},[0.5,0.925] if i==0 else[0.5,0.5])

ENV=ROOT/'assets/sprites/environment/toan-chan-truc-lam'
src='assets/sprites/environment/toan-chan-truc-lam/source/props_source_v01.png';im=image_at(src);cw=im.width/4
names=['unused_generated_bamboo','moss_rock','training_dummy','broken_practice_poles','stone_lantern','taoist_banner','bamboo_fence_low','bamboo_fence_tall','wine_storage_rack','wine_rest_table','entrance_gate','ancient_steps']
heights=[160,56,64,28,80,96,36,64,88,48,112,32]
for i,name in enumerate(names):
 if i==0: continue # Original generated bamboo touches edge; reuse approved coherent forest sprite.
 row=i//4;ys=[0,400,751,1086];top=718 if i==10 else ys[row]
 box=(round(i%4*cw),top,round((i%4+1)*cw),ys[row+1]);cell=im.crop(box);b=bounds(cell);cell=cell.crop(b)
 scale=heights[i]/cell.height;cell=cell.resize((round(cell.width*scale),heights[i]),Image.Resampling.NEAREST)
 frame=Image.new('RGBA',(cell.width+8,cell.height+8));frame.paste(cell,(4,4))
 save_png(frame,ENV/(name+'.png'),'environment_prop',{'path':src,'rect':list(box),'contentRect':list(b)},[0.5,(frame.height-4)/frame.height])

# Reuse exact approved Bamboo Forest pixels without touching the original.
src='assets/source/bamboo_forest/sprites/bamboo_jade.png';dest=ENV/'bamboo_cluster.png';shutil.copyfile(ROOT/src,dest)
record(dest,'environment_prop',src,[0.5,188/192],reused=True)
MANIFEST['reusedAssets'].append({'path':rel(dest),'source':src,'sha256':digest(dest),'basis':'assets/bamboo_forest.manifest.json approved bamboo_jade'})

src='assets/sprites/environment/toan-chan-truc-lam/source/pavilion_source_v01.png';im=image_at(src);b=bounds(im);cut=im.crop(b);scale=224/cut.width
cut=cut.resize((224,round(cut.height*scale)),Image.Resampling.NEAREST);frame=Image.new('RGBA',(240,224));frame.paste(cut,((240-cut.width)//2,216-cut.height))
save_png(frame,ENV/'taoist_pavilion.png','structure',{'path':src,'contentRect':list(b)},[0.5,216/224])
# A lossless horizontal split supports future foot-based occlusion; no collision inferred.
for name,box in [('taoist_pavilion_roof',(0,0,240,110)),('taoist_pavilion_base',(0,110,240,224))]:
 part=Image.new('RGBA',frame.size);part.paste(frame.crop(box),(box[0],box[1]));save_png(part,ENV/(name+'.png'),'structure_layer','taoist_pavilion.png',[0.5,216/224])

src='assets/sprites/environment/toan-chan-truc-lam/source/portal_source_v01.png';im=image_at(src);cels=[];names=[]
for i in range(4):
 box=(round(i%2*im.width/2),round(i//2*im.height/2),round((i%2+1)*im.width/2),round((i//2+1)*im.height/2));cell=im.crop(box);b=bounds(cell);cut=cell.crop(b)
 # Constant sheet scale; never independently enlarge portal phases.
 scale=92/(im.width/2);cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
 frame=Image.new('RGBA',(112,112));frame.paste(cut,((112-cut.width)//2,104-cut.height));name=f'portal_loop_{i}';names.append(name);cels.append((name,frame,{'path':src,'rect':list(box),'contentRect':list(b),'scale':scale}))
atlas(ENV/'portal','toan_chan_portal',cels,[{'name':'loop','frames':names,'fps':6,'loop':True,'placement':'world'}],(112,112),[0.5,104/112],src)

TILES=ROOT/'assets/tilesets/boss-arenas/toan-chan-truc-lam'
src='assets/tilesets/boss-arenas/toan-chan-truc-lam/source/terrain_materials_v01.png';im=image_at(src);sheet=Image.new('RGBA',(256,256));groups=[]
for i,name in enumerate(['stone_platform','ancient_path','bamboo_ground','mossy_stone']):
 box=(round(i%2*im.width/2),round(i//2*im.height/2),round((i%2+1)*im.width/2),round((i//2+1)*im.height/2));mat=im.crop(box).resize((128,128),Image.Resampling.NEAREST)
 sheet.paste(mat,((i%2)*128,(i//2)*128));save_png(mat,TILES/(name+'_material.png'),'terrain_material',{'path':src,'rect':list(box)})
 groups.append({'id':name,'tileRegion':{'x':(i%2)*4,'y':(i//2)*4,'w':4,'h':4},'note':'Ordered 4x4 metatile material; preserve adjacency. Arbitrary autotiling/seamlessness not claimed.'})
save_png(sheet,TILES/'terrain.png','tileset',src)
for y in range(8):
 for x in range(8):save_png(sheet.crop((x*32,y*32,x*32+32,y*32+32)),TILES/'tiles'/f'terrain_{y*8+x:03}.png','terrain_tile','terrain.png')
dump(TILES/'terrain.json',{'type':'tileset','version':'1.10','name':'toan_chan_truc_lam_terrain','tilewidth':32,'tileheight':32,'tilecount':64,'columns':8,'image':'terrain.png','imagewidth':256,'imageheight':256,'margin':0,'spacing':0,'materialGroups':groups})

src='assets/tilesets/boss-arenas/toan-chan-truc-lam/source/yin_yang_platform_source_v01.png';im=image_at(src);b=bounds(im);cut=im.crop(b)
scale=min(504/cut.width,312/cut.height);cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST);platform=Image.new('RGBA',(512,320));platform.paste(cut,((512-cut.width)//2,(320-cut.height)//2))
save_png(platform,TILES/'yin_yang_platform.png','ground_centerpiece',{'path':src,'contentRect':list(b)},[0.5,0.5])
for y in range(10):
 for x in range(16):save_png(platform.crop((x*32,y*32,x*32+32,y*32+32)),TILES/'platform_tiles'/f'platform_{y*16+x:03}.png','platform_tile','yin_yang_platform.png')
dump(TILES/'yin_yang_platform.json',{'type':'tileset','version':'1.10','name':'toan_chan_yin_yang_platform','tilewidth':32,'tileheight':32,'tilecount':160,'columns':16,'image':'yin_yang_platform.png','imagewidth':512,'imageheight':320,'margin':0,'spacing':0,'use':'Single ordered 16x10 metatile centerpiece; not interchangeable terrain tiles.'})

# Asset layout reference only; no runtime dungeon/map registry is modified.
layout={'schemaVersion':1,'id':'toan_chan_truc_lam_layout_reference','implementationStatus':'specification_only','coordinateUnits':'logical pixels; suggested 32px grid',
 'canvas':{'width':1536,'height':1152},'centralOpenCombat':{'x':320,'y':288,'width':896,'height':640},
 'centerpiece':{'x':768,'y':608,'asset':'assets/tilesets/boss-arenas/toan-chan-truc-lam/yin_yang_platform.png','scale':1},
 'markers':[{'id':'boss_spawn','x':768,'y':384},{'id':'player_entrance','x':768,'y':1024},{'id':'return_portal','x':256,'y':864},
 {'id':'disciple_entry_west','x':128,'y':448},{'id':'disciple_entry_northeast','x':1312,'y':256},{'id':'disciple_entry_east','x':1408,'y':704}],
 'wineDeliveryPaths':[[[128,448],[352,448],[576,544]],[[1312,256],[1184,352],[1024,512]],[[1408,704],[1184,704],[1024,640]]],
 'edgeDressing':[{'id':'pavilion','x':768,'y':256},{'id':'wine_rest','x':352,'y':256},{'id':'wine_storage','x':1184,'y':288},{'id':'training_props','x':224,'y':608}],
 'rules':['Six players; keep central combat unobstructed.','Bamboo, roof, rocks and fences stay at perimeter.','Wine paths are visual planning, not implemented AI/navigation.','No collision geometry or server authority is defined by this art file.','Preserve world viewport and existing camera; no UI layout changes.'],
 'concept':'assets/concepts/arenas/toan-chan-truc-lam/arena_layout_concept_v01.png'}
dump(ROOT/'assets/concepts/arenas/toan-chan-truc-lam/layout_reference_v01.json',layout)
for p in [ROOT/'assets/concepts/bosses/chu-ba-thong/master_concept_v01.png',ROOT/'assets/concepts/summons/toan-chan-disciples/master_concept_v01.png',ROOT/'assets/concepts/arenas/toan-chan-truc-lam/arena_layout_concept_v01.png']:record(p,'concept','original built-in image_gen',approval='automatic by current user task')

MANIFEST['wineMechanicSpecification']={'implemented':False,'normalAttacks':'Zero effective damage without active special wine buff; ordinary stat increases cannot bypass protection.',
 'wineEmpoweredAttacks':'Only the individual attacker with the active wine buff may meaningfully damage the boss. Do not turn off protection globally when one player drinks.',
 'expiration':'Reverts that player to ineffective ordinary attacks. Use buff_expire visual.',
 'drops':'Disciples deliver wine; eligible collection/sharing/drop quantities are intentionally undecided.',
 'damage':None,'cooldowns':None,'deliveryInterval':None,'buffDuration':None,
 'allSchools':'player_buff and empowered_hit are independent overlays; no hero sprites regenerated.'}
MANIFEST['directionalPresentationNotes']={'boss':'Four independently generated facings for all eleven clips.','disciple':'Four independently generated facings for all seven clips.',
 'vfx':'Yin/palm/trails have authored right orientation; Yang authored left. Geometric VFX may be oriented later; never rotate character bodies.',
 'dashAfterimages':'Generic ghost afterimage sheet is right-facing only. Other facings can use the package\'s actual dash_<direction> body frames as opacity overlays later; no renderer implemented.',
 'timing':'Frame rates are visual playback suggestions only; never drive authoritative attack events.'}
MANIFEST['alphaExport']='Binary alpha at 128 threshold; transparent RGB cleared to zero. Original generator sources retained unchanged.'
src='assets/exports/bamboo_forest/terrain.png';dest=TILES/'bamboo_forest_terrain.png';shutil.copyfile(ROOT/src,dest)
record(dest,'reused_terrain_tileset',src,reused=True)
groups=json.loads((ROOT/'assets/source/bamboo_forest/terrain_groups.json').read_text(encoding='utf-8-sig'))
dump(TILES/'bamboo_forest_terrain.json',{'type':'tileset','version':'1.10','name':'approved_bamboo_forest_terrain','tilewidth':32,'tileheight':32,'tilecount':344,'columns':16,'image':dest.name,'imagewidth':512,'imageheight':704,'margin':0,'spacing':0,'approvedSourceGroups':groups})
MANIFEST['reusedAssets'].append({'path':rel(dest),'source':src,'sha256':digest(dest),'basis':'assets/bamboo_forest.manifest.json approved terrain + edge transitions'})
jobs=[]
for p in sorted(BASE.glob('source/generation_prompts_*.json')):
 batch=json.loads(p.read_text(encoding='utf-8-sig'))
 for job in batch:
  if 'source' in job:job['generatedFile']=Path(job.pop('source')).name
  job['tool']='built-in image_gen'
  if not any(j['id']==job['id'] for j in jobs):jobs.append(job)
 dump(p,batch)
dump(BASE/'source/generation_jobs_v01.json',jobs)
MANIFEST['skillMappings']={
 'khong_minh_quyen':{'nameVi':'Không Minh Quyền','bossClip':'basic_palm_{direction}','vfx':['impact','shockwave','palm_wave']},
 'song_thu_ho_bac':{'nameVi':'Song Thủ Hỗ Bác','bossClip':'dual_hand_{direction}','vfx':['yin_palm','yang_palm','dual_telegraph','yin_impact','yang_impact']},
 'thai_cuc_am_duong_tran':{'nameVi':'Thái Cực Âm Dương Trận','bossClip':'yin_yang_cast_{direction}','vfx':['formation','rotating_ring','danger_zones','eruption','stun','cast_gather']},
 'tuy_tien_bo':{'nameVi':'Túy Tiên Bộ','bossClip':'dash_{direction}','vfx':['afterimage_right','wind_trail','arrival','dash_telegraph']},
 'can_khon_phan_chan':{'nameVi':'Càn Khôn Phản Chấn','bossClip':'counter_{direction}','vfx':['defensive_field','charge_warning','radial_shockwave','counter_impact','guard_trigger']},
 'am_duong_nghich_chuyen':{'nameVi':'Âm Dương Nghịch Chuyển','bossClip':'ultimate_charge_{direction}','vfx':['large_formation','rotating_waves','palm_waves','danger_pattern','safe_pattern','ultimate_impact']}}
dump(BASE/'asset_manifest_v01.json',MANIFEST)
print(json.dumps({'exportedPNGEntries':len(MANIFEST['assets']),'animationClips':len(MANIFEST['animations']),'manifest':rel(BASE/'asset_manifest_v01.json')},ensure_ascii=False))
