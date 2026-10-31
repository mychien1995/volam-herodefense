"""Asset-only raster export recipe. No map/runtime files, mechanics or loaders."""
from pathlib import Path
from PIL import Image, ImageChops
from collections import deque
import json, math, hashlib
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'assets/source/desert'
ENV=ROOT/'assets/sprites/environment/desert'
TILES=ROOT/'assets/tilesets/desert'
ACTORS=ROOT/'assets/sprites/creeps/dungeons/desert'
FX=ROOT/'assets/effects/dungeons/desert'
def write(p,data):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rgba(p,threshold=245):
 im=Image.open(p).convert('RGBA')
 im.putalpha(im.getchannel('A').point(lambda v:255 if v>=threshold else 0))
 return im
recipe=[]
def extract(im,box,largest=True):
 box=tuple(map(round,box));part=im.crop(box)
 a=part.getchannel('A');bbox=a.getbbox()
 if not bbox:raise ValueError(('empty',box))
 if largest:
  w,h=part.size;pix=a.load();seen=set();components=[]
  for y in range(h):
   for x in range(w):
    if not pix[x,y] or (x,y) in seen:continue
    comp=[(x,y)];seen.add((x,y))
    for cx,cy in comp:
     for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)):
      nx,ny=cx+dx,cy+dy
      if 0<=nx<w and 0<=ny<h and pix[nx,ny] and (nx,ny) not in seen:
       seen.add((nx,ny));comp.append((nx,ny))
    components.append(comp)
  main=max(components,key=len)
  xs=[p[0] for p in main];ys=[p[1] for p in main]
  mainbox=(min(xs),min(ys),max(xs)+1,max(ys)+1)
  keep=Image.new('L',part.size);kp=keep.load()
  for comp in components:
   if comp is main or (len(comp)>=3 and all(mainbox[0]-5<=x<mainbox[2]+5 and mainbox[1]-5<=y<mainbox[3]+5 for x,y in comp)):
    for pos in comp:kp[pos]=255
  part.putalpha(keep);bbox=keep.getbbox()
 return part.crop(bbox),[box[0]+bbox[0],box[1]+bbox[1],box[0]+bbox[2],box[1]+bbox[3]]
def fit_bottom(part,size,scale=None):
 if scale is None:scale=min((size[0]-8)/part.width,(size[1]-8)/part.height)
 dims=(max(1,round(part.width*scale)),max(1,round(part.height*scale)))
 if dims[0]>size[0]-4 or dims[1]>size[1]-4:raise ValueError(('overflow',dims,size))
 part=part.resize(dims,Image.Resampling.NEAREST)
 out=Image.new('RGBA',size);out.paste(part,((size[0]-part.width)//2,size[1]-16-part.height))
 return out
# Props: measured component rectangles, not concept-board crops.
props=rgba(SRC/'generated-props.png')
prop_specs=[
 ('sandstone_rocks',(0,0,320,314),(96,80)),
 ('cliff_straight',(320,0,650,314),(160,112)),
 ('cliff_corner',(650,0,984,314),(144,112)),
 ('broken_pillar',(984,0,1254,320),(64,112)),
 ('ruin_wall_horizontal',(0,317,386,622),(160,88)),
 ('ruin_wall_vertical',(386,317,642,622),(80,128)),
 ('ruined_gateway',(642,313,1000,646),(192,176)),
 ('ancient_monument',(1000,320,1254,642),(80,112)),
 ('dead_tree',(0,615,392,920),(128,144)),
 ('dry_bush',(392,640,658,920),(64,56)),
 ('desert_crate',(658,640,984,920),(64,64)),
 ('desert_barrel',(984,640,1254,920),(56,64)),
 ('abandoned_temple',(0,920,385,1254),(160,160)),
 ('guardian_lion_ruin',(385,920,658,1254),(80,112)),
 ('pebble_scatter',(658,920,984,1254),(64,40)),
 ('dust_decal',(984,920,1254,1254),(96,48))]
env_meta=[]
for id,box,size in prop_specs:
 part,actual=extract(props,box,id not in ['pebble_scatter','dust_decal'])
 # Scenery uses four-pixel ground clearance, unlike actor canvases.
 scale=min((size[0]-8)/part.width,(size[1]-8)/part.height)
 part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.NEAREST)
 out=Image.new('RGBA',size);out.paste(part,((size[0]-part.width)//2,size[1]-4-part.height));out.save(ENV/(id+'.png'))
 env_meta.append({'id':id,'size':list(size),'pivot':[size[0]//2,size[1]-4],'layer':'ground' if id in ['pebble_scatter','dust_decal'] else 'feet_y_sorted','source':'generated-props.png','sourceRect':actual})
portal=rgba(SRC/'generated-portals.png')
for id,box,size in [('dungeon_entrance',(0,0,630,705),(192,176)),('dungeon_exit_portal',(630,0,1254,705),(192,176)),('ruined_gate_frame',(0,710,630,1254),(192,144)),('gate_steps_base',(630,710,1254,1254),(192,104))]:
 part,actual=extract(portal,box);scale=min((size[0]-8)/part.width,(size[1]-8)/part.height)
 part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.NEAREST)
 out=Image.new('RGBA',size);out.paste(part,((size[0]-part.width)//2,size[1]-4-part.height));out.save(ENV/(id+'.png'))
 env_meta.append({'id':id,'size':list(size),'pivot':[size[0]//2,size[1]-4],'layer':'feet_y_sorted','source':'generated-portals.png','sourceRect':actual})
# Padded scenery atlas.
scenery=Image.new('RGBA',(1024,960));env_frames={}
for i,m in enumerate(env_meta):
 x=2+(i%5)*204;y=2+(i//5)*232;im=Image.open(ENV/(m['id']+'.png'));scenery.paste(im,(x,y))
 env_frames[m['id']]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,'sourceSize':{'w':im.width,'h':im.height},'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'pivot':{'x':m['pivot'][0]/im.width,'y':m['pivot'][1]/im.height}}
scenery.save(ENV/'desert-scenery.png');write(ENV/'desert-scenery.json',{'frames':env_frames,'meta':{'image':'desert-scenery.png','size':{'w':1024,'h':960},'scale':'1'},'assets':env_meta})
print('Exported',len(env_meta),'environment sprites',flush=True)
# Six authored materials -> periodic samples, four phase variants and 16-mask transitions.
raw=Image.open(SRC/'generated-terrain.png').convert('RGB');materials=[]
material_names=['smooth_sand','rough_sand','cracked_dry_earth','rocky_ground','sandstone_path','dune_sand']
for i,id in enumerate(material_names):
 x=i%3*512;y=i//3*512
 im=raw.crop((x,y,x+512,y+512)).resize((128,128),Image.Resampling.NEAREST).crop((32,32,96,96))
 for axis in (0,1):
  for t in range(64):
   for k in range(4):
    a=(k,t) if axis==0 else (t,k);b=(63-k,t) if axis==0 else (t,63-k)
    ca=im.getpixel(a);cb=im.getpixel(b);weight=(4-k)/8
    im.putpixel(a,tuple(round(ca[c]*(1-weight)+cb[c]*weight) for c in range(3)))
    im.putpixel(b,tuple(round(cb[c]*(1-weight)+ca[c]*weight) for c in range(3)))
   a=(0,t) if axis==0 else (t,0);b=(63,t) if axis==0 else (t,63)
   mean=tuple((im.getpixel(a)[c]+im.getpixel(b)[c])//2 for c in range(3));im.putpixel(a,mean);im.putpixel(b,mean)
 im.save(TILES/(id+'-material.png'));materials.append(im)
tiles=[];groups={}
for i,(id,mat) in enumerate(zip(material_names,materials)):
 groups[id]={'firstId':len(tiles),'count':4,'type':'material'}
 for phase in range(4):
  x=phase%2*32;y=phase//2*32;tiles.append(mat.crop((x,y,x+32,y+32)).convert('RGBA'))
for mi in range(1,6):
 groups['sand_to_'+material_names[mi]]={'firstId':len(tiles),'count':64,'type':'corner_mask','maskBits':['NW','NE','SE','SW'],'phaseCount':4}
 for mask in range(16):
  c=[1 if mask&(1<<i) else 0 for i in range(4)]
  for phase in range(4):
   tile=Image.new('RGBA',(32,32));ox=phase%2*32;oy=phase//2*32
   for y in range(32):
    for x in range(32):
     u=x/31;v=y/31;val=(1-u)*(1-v)*c[0]+u*(1-v)*c[1]+u*v*c[2]+(1-u)*v*c[3]
     pick=mi if val>=0.5 else 0
     tile.putpixel((x,y),materials[pick].getpixel((x+ox,y+oy))+(255,))
   tiles.append(tile)
cols=16;terrain=Image.new('RGBA',(512,math.ceil(len(tiles)/cols)*32))
for i,tile in enumerate(tiles):terrain.paste(tile,(i%cols*32,i//cols*32))
terrain.save(TILES/'desert-terrain.png')
write(TILES/'desert-terrain.json',{'image':'desert-terrain.png','tileWidth':32,'tileHeight':32,'columns':16,'tileCount':len(tiles),'margin':0,'spacing':0,'tileIdsAreZeroBased':True,'groups':groups,'notes':'Authored raster samples with edge conditioning and deterministic corner masks; not a runtime map. IDs use mask*4+phase.'})
print('Exported',len(tiles),'terrain tiles',flush=True)
# Character extraction. Irregular source rows are measured, not assumed.
configs={
 'bo_cap_cat':('Bọ Cạp Cát',[0,153,315,466,627,773,930,1070,1254],56,(128,112)),
 'sa_xa':('Sa Xà',[0,170,329,478,630,784,938,1076,1254],36,(128,96)),
 'sa_tac':('Sa Tặc',[0,181,345,498,660,814,976,1112,1254],44,(112,96)),
 'cung_thu_sa_mac':('Cung Thủ Sa Mạc',[0,180,340,498,658,818,987,1170],44,(112,96)),
 'xac_uop':('Xác Ướp',[0,167,323,478,631,790,944,1091,1254],46,(112,96)),
 'cu_nhan_sa_thach':('Cự Nhân Sa Thạch',[0,183,337,491,634,787,937,1071,1254],72,(144,128))}
side=rgba(SRC/'side-attack-correction.png');archer=rgba(SRC/'archer-attack-correction.png')
side_rows={'sa_tac':(0,350,235),'xac_uop':(350,658,260),'cu_nhan_sa_thach':(658,953,262),'sa_xa':(953,1254,246)}
actor_meta=[]
for id,(name,rows,bodyheight,size) in configs.items():
 source=rgba(SRC/(id+'-source.png'));outdir=ACTORS/id;(outdir/'frames').mkdir(parents=True,exist_ok=True)
 frames=[];tags=[];extracts=[];mirrors=[]
 def append_group(state,direction,items,scale,durations,mirror=False,source_name=None):
  first=len(frames)
  for index,(part,rect) in enumerate(items):
   canvas=fit_bottom(part,size,scale)
   if mirror:canvas=canvas.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   fname=f'{state}_{direction}_{index}.png';canvas.save(outdir/'frames'/fname)
   frames.append((fname,canvas,durations[index] if isinstance(durations,list) else durations))
   extracts.append({'frame':fname,'source':source_name or id+'-source.png','rect':rect,'scale':scale,'mirrored':mirror})
  tags.append({'name':state+'_'+direction,'from':first,'to':len(frames)-1,'direction':'forward','repeat':0 if state in ['idle','walk'] else 1})
  if mirror:mirrors.append(state+'_'+direction)
 def cells(row,indices,wide_last=False):
  result=[]
  for col in indices:
   x1=col*1254/8;x2=(col+1)*1254/8
   if wide_last and col==6:x2=1254
   # A small horizontal overscan retains weapon tips; component isolation rejects neighbours.
   over=16 if not wide_last else 0
   result.append(extract(source,(max(0,x1-over),rows[row],min(1254,x2+over),rows[row+1])))
  return result
 for di,direction in enumerate(['down','left','right','up']):
  normal_row=(di*2 if id!='cung_thu_sa_mac' else [0,2,4,5][di])
  idle=cells(normal_row,[0,1]);scale=bodyheight/max(p[0].height for p in idle)
  append_group('idle',direction,idle,scale,350)
  append_group('walk',direction,cells(normal_row,[2,3,4,5]),scale,120)
  append_group('hit',direction,cells(normal_row,[6,7]),scale,90)
  if id=='cung_thu_sa_mac':
   ar=(0 if direction=='down' else 2 if direction=='up' else 1)
   ay=[0,325,615,969][ar:ar+2];items=[]
   for col in range(4):items.append(extract(archer,(max(0,col*313.5-14),ay[0],min(1254,(col+1)*313.5+14),ay[1])))
   attackscale=44/[270,250,238][ar]
   append_group('attack',direction,items,attackscale,[100,110,70,120],direction=='left','archer-attack-correction.png')
  elif direction in ['left','right'] and id in side_rows:
   corrected=rgba(SRC/(id+'-attack-v2.png'))
   split_y=620 if id=='sa_xa' else 630 if id=='xac_uop' else 640
   split_x=685 if id=='sa_xa' else 665 if id=='cu_nhan_sa_thach' else 675
   boxes=[(0,0,627,split_y),(627,0,1254,split_y),(0,split_y,split_x,1254),(split_x,split_y,1254,1254)]
   items=[extract(corrected,box) for box in boxes]
   append_group('attack',direction,items,bodyheight/items[3][0].height,[110,80,80,130],direction=='left',id+'-attack-v2.png')
  else:append_group('attack',direction,cells(di*2+1,range(4)),scale,[110,80,80,130])
  if id=='cung_thu_sa_mac':
   deathrow=[1,3,3,6][di]
   append_group('death',direction,cells(deathrow,[4,5,6,7]),scale,[100,120,150,600],direction=='right')
  elif id=='sa_xa':append_group('death',direction,cells(di*2+1,[4,5,6],True),scale,[120,160,600])
  else:append_group('death',direction,cells(di*2+1,[4,5,6,7]),scale,[100,120,150,600])
 cols=8;sheet=Image.new('RGBA',(size[0]*cols,size[1]*math.ceil(len(frames)/cols)));atlas={}
 for i,(fname,canvas,ms) in enumerate(frames):
  x=i%cols*size[0];y=i//cols*size[1];sheet.paste(canvas,(x,y))
  atlas[fname]={'frame':{'x':x,'y':y,'w':size[0],'h':size[1]},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size[0],'h':size[1]},'sourceSize':{'w':size[0],'h':size[1]},'duration':ms}
 sheet.save(outdir/'spritesheet.png')
 write(outdir/'atlas.json',{'frames':atlas,'meta':{'image':'spritesheet.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1','frameTags':tags,'slices':[{'name':'feet','keys':[{'frame':0,'bounds':{'x':size[0]//2,'y':size[1]-16,'w':1,'h':1}}]}]}})
 info={'id':id,'nameVi':name,'frameSize':list(size),'bodyHeightTarget':bodyheight,'pivot':[size[0]//2,size[1]-16],'frameCount':len(frames),'directions':['down','left','right','up'],'states':['idle','walk','attack','hit','death'],'tags':tags,'mirroredSequences':mirrors,'status':'produced_asset_only_pending_runtime_review','conceptApproval':'Automatic concept acceptance explicitly instructed by user for this task; no runtime approval implied','frameOrigins':extracts}
 write(outdir/'animations.json',info);actor_meta.append({k:v for k,v in info.items() if k not in ['frameOrigins','tags']})
 print('Exported',id,len(frames),'frames',flush=True)
# Projectiles (static straight-flight visual; no gameplay behaviour).
projectiles=[]
for i,direction in enumerate(['down','right','up','left']):
 part,rect=extract(archer,(i*313.5,969,(i+1)*313.5,1254));size=(48,48)
 scale=32/max(part.size);part=part.resize((max(1,round(part.width*scale)),max(1,round(part.height*scale))),Image.Resampling.NEAREST)
 im=Image.new('RGBA',size);im.paste(part,((48-part.width)//2,(48-part.height)//2));im.save(FX/('arrow_'+direction+'.png'))
 projectiles.append({'id':'arrow_'+direction,'size':[48,48],'pivot':[24,24],'source':'archer-attack-correction.png','sourceRect':rect})
# Eight six-frame visual-only effects, preserved variation / no duplicated stills.
vfx=rgba(SRC/'vfx-source.png',128)
vfx_names=['sand_dust','slash_impact','arrow_impact','scorpion_pincer','scorpion_sting','viper_bite','mummy_disintegration','golem_ground_impact']
yedges=[0,210,392,566,747,900,1060,1252,1448];xedges=[0,170,353,548,733,920,1086];effects=[]
for row,id in enumerate(vfx_names):
 pieces=[extract(vfx,(xedges[col],yedges[row],xedges[col+1],yedges[row+1]),False) for col in range(6)]
 size=128 if id in ['golem_ground_impact','mummy_disintegration'] else 96
 scale=(size-16)/max(max(part.size) for part,rect in pieces)
 sheet=Image.new('RGBA',(size*6,size));frames={};folder=FX/id;folder.mkdir(exist_ok=True)
 for i,(part,rect) in enumerate(pieces):
  part=part.resize((max(1,round(part.width*scale)),max(1,round(part.height*scale))),Image.Resampling.NEAREST)
  canvas=Image.new('RGBA',(size,size));canvas.paste(part,((size-part.width)//2,(size-part.height)//2));canvas.save(folder/(f'{id}_{i}.png'));sheet.paste(canvas,(size*i,0))
  frames[f'{id}_{i}.png']={'frame':{'x':size*i,'y':0,'w':size,'h':size},'rotated':False,'trimmed':False,'duration':80,'sourceSize':{'w':size,'h':size},'spriteSourceSize':{'x':0,'y':0,'w':size,'h':size}}
 sheet.save(folder/'spritesheet.png');write(folder/'atlas.json',{'frames':frames,'meta':{'image':'spritesheet.png','size':{'w':sheet.width,'h':sheet.height},'frameTags':[{'name':id,'from':0,'to':5,'direction':'forward'}]}})
 effects.append({'id':id,'frameCount':6,'frameSize':[size,size],'pivot':[size//2,size//2],'frameDurationMs':80,'status':'produced_visual_only','facing':'right' if id=='slash_impact' else 'centered'})
write(FX/'effects.json',{'effects':effects,'projectiles':projectiles,'timingIsPresentationOnly':True,'gameplayMechanicsAdded':False})
write(SRC/'export_recipe.json',{'alphaThresholdActorsAndProps':245,'alphaThresholdEffects':128,'resize':'nearest','environment':env_meta,'actors':actor_meta,'terrain':{'materials':material_names,'tileSize':32,'tileCount':len(tiles)},'effects':effects,'notes':['Side attack sequences for raider/mummy/golem/viper/archer are mirrored from authored right sequences. Archer right death mirrors authored left death.','Snake death uses three authored frames per direction because the source final remains occupies a double-width slot; no fabricated fourth pose.','Raster PNG source masters are editable flattened artwork; no Aseprite/layered source is claimed.']})
print('Exported 48 VFX frames and 4 arrow projectiles',flush=True)

# Normalize hidden RGB in transparent export pixels to avoid colored edge bleed.
for folder in [ENV,TILES,ACTORS,FX]:
 for path in folder.rglob('*.png'):
  im=Image.open(path).convert('RGBA')
  im.putdata([(r,g,b,a) if a else (0,0,0,0) for r,g,b,a in im.getdata()])
  im.save(path)
print('Normalized transparent RGB in all production exports',flush=True)
