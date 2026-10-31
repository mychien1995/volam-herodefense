"""Export authored raster components and build the existing orthogonal Tiled map.
No image generation: only source extraction, nearest sampling, alpha cleanup,
texture edge conditioning, terrain transitions, atlas packing and map placement.
Re-export artist-edited .aseprite files separately with export-bamboo-forest.mjs.
"""
from pathlib import Path
import json, math, hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/source/bamboo_forest'
OUT=ROOT/'assets/exports/bamboo_forest'
OUT.mkdir(parents=True,exist_ok=True)
(SRC/'sprites').mkdir(exist_ok=True)
def write(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

# Sources are new production component rasters, never crops from approved boards.
veg=Image.open(SRC/'generated_veg_key.png').convert('RGBA')
veg.putalpha(Image.eval(veg.getchannel('R'),lambda v:255))
for y in range(veg.height):
 for x in range(veg.width):
  r,g,b,a=veg.getpixel((x,y))
  if r>g+35 and b>g+35:veg.putpixel((x,y),(0,0,0,0))
props=Image.open(SRC/'generated_props.png').convert('RGBA')
portal=Image.open(SRC/'generated_portal.png').convert('RGBA')
specs=[
 ('bamboo_jade',veg,(0,0,420,610),(152,192)),
 ('bamboo_gold',veg,(420,0,820,610),(152,192)),
 ('bamboo_single',veg,(820,0,1150,610),(96,176)),
 ('bush',veg,(1150,210,1536,610),(96,64)),
 ('grass_tuft',veg,(0,610,375,1024),(48,32)),
 ('moss_root',veg,(375,610,780,1024),(80,40)),
 ('stump',veg,(780,610,1120,1024),(64,56)),
 ('canopy',veg,(1120,585,1536,1024),(128,112)),
 ('stone_lantern',props,(0,0,365,445),(64,96)),
 ('ruin_wall',props,(365,0,835,445),(128,64)),
 ('shrine',props,(835,0,1254,445),(144,144)),
 ('bamboo_fence',props,(0,445,412,825),(112,56)),
 ('bamboo_gate',props,(412,445,835,825),(152,144)),
 ('stone_monument',props,(835,445,1254,825),(96,104)),
 ('training_dummy',props,(0,825,400,1254),(64,80)),
 ('bridge',props,(400,825,835,1254),(144,112)),
 ('moss_rocks',props,(835,825,1254,1254),(96,72)),
 ('exit_portal',portal,(0,0,1254,1254),(128,144)),
]
sprites={}
for name,source,box,size in specs:
 im=source.crop(box)
 # Generator has real alpha, but soft near-transparent mattes. Binary alpha
 # ensures native pixel edges without colored translucent halos.
 a=im.getchannel('A').point(lambda v:255 if v>=245 else 0)
 im.putalpha(a)
 bbox=a.getbbox()
 if not bbox: raise ValueError('Empty component '+name)
 im=im.crop(bbox)
 im.thumbnail((size[0]-8,size[1]-8),Image.Resampling.NEAREST)
 canvas=Image.new('RGBA',size)
 canvas.paste(im,((size[0]-im.width)//2,size[1]-4-im.height))
 # Drop only isolated export specks smaller than six logical pixels.
 visited=set()
 for cy in range(canvas.height):
  for cx in range(canvas.width):
   if (cx,cy) in visited or canvas.getpixel((cx,cy))[3]==0:continue
   component=[(cx,cy)];visited.add((cx,cy))
   for px,py in component:
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
     nx,ny=px+dx,py+dy
     if 0<=nx<canvas.width and 0<=ny<canvas.height and (nx,ny) not in visited and canvas.getpixel((nx,ny))[3]:
      visited.add((nx,ny));component.append((nx,ny))
   if len(component)<6:
    for pos in component:canvas.putpixel(pos,(0,0,0,0))
 canvas.save(SRC/'sprites'/f'{name}.png')
 sprites[name]=canvas
# The bridge deck is below actors; the south rail is independently Y-sorted.
bridge=sprites.pop('bridge')
split=bridge.height-28
deck=bridge.copy(); deck.paste((0,0,0,0),(0,split,bridge.width,bridge.height))
front=bridge.copy();front.paste((0,0,0,0),(0,0,bridge.width,split))
sprites['bridge_deck']=deck;sprites['bridge_front']=front
for name,im in [('bridge_deck',deck),('bridge_front',front)]: im.save(SRC/'sprites'/f'{name}.png')

atlas=Image.new('RGBA',(1024,768));frames={};entries=[]
for i,(name,im) in enumerate(sprites.items()):
 x=2+(i%5)*196;y=2+(i//5)*196
 atlas.paste(im,(x,y))
 frames[name]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,
 'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}}
 entries.append({'id':name,'dimensions':[im.width,im.height],'footPivot':[0.5,(im.height-4)/im.height],'status':'produced_pending_runtime_director_approval'})
atlas.save(OUT/'scenery.png')
write(OUT/'scenery.json',{'frames':frames,'meta':{'image':'scenery.png','size':{'w':1024,'h':768},'scale':'1'}})

# Six source material swatches -> periodic 64px material samples. All exported
# material pixels come from authored image_gen source, no procedural noise art.
raw=Image.open(SRC/'generated_terrain.png').convert('RGB')
materials=[]
for i in range(6):
 x=(i%3)*512;y=(i//3)*512
 im=raw.crop((x,y,x+512,y+512)).resize((64,64) if i==4 else (128,128),Image.Resampling.NEAREST)
 if i!=4:im=im.crop((32,32,96,96))
 # Match opposing edge pixels and taper correction inward. This is deterministic
 # edge conditioning of painted material, not invented pixel texture.
 for axis in (0,1):
  for t in range(64):
   for k in range(4):
    a=(k,t) if axis==0 else (t,k);b=(63-k,t) if axis==0 else (t,63-k)
    ca=im.getpixel(a);cb=im.getpixel(b);weight=(4-k)/8
    im.putpixel(a,tuple(round(ca[c]*(1-weight)+cb[c]*weight) for c in range(3)))
    im.putpixel(b,tuple(round(cb[c]*(1-weight)+ca[c]*weight) for c in range(3)))
   a=(0,t) if axis==0 else (t,0);b=(63,t) if axis==0 else (t,63)
   mean=tuple((im.getpixel(a)[c]+im.getpixel(b)[c])//2 for c in range(3))
   im.putpixel(a,mean);im.putpixel(b,mean)
 im.save(SRC/f'material_{i}.png');materials.append(im)
tiles=[];groups={}
for mat_id,mat in enumerate(materials):
 groups[f'material_{mat_id}']=len(tiles)+1
 for phase in range(4):
  x=(phase%2)*32;y=(phase//2)*32
  tiles.append(mat.crop((x,y,x+32,y+32)).convert('RGBA'))
# Marching-square corner masks, four phase variants per mask. Equal shared
# corner values produce identical mask boundaries on adjacent tiles.
for material in (1,2,3,5):
 groups[f'grass_to_{material}']=len(tiles)+1
 for mask in range(16):
  corners=[1 if mask&(1<<i) else 0 for i in range(4)] # NW NE SE SW
  for phase in range(4):
   im=Image.new('RGBA',(32,32));ox=(phase%2)*32;oy=(phase//2)*32
   for y in range(32):
    for x in range(32):
     u=x/31;v=y/31
     value=(1-u)*(1-v)*corners[0]+u*(1-v)*corners[1]+u*v*corners[2]+(1-u)*v*corners[3]
     # A small interior edge variation vanishes at all cell edges.
     ripple=0.055*math.sin(x*1.7+y*0.9)*math.sin(math.pi*u)*math.sin(math.pi*v)
     pick=material if value+ripple>=0.5 else 0
     im.putpixel((x,y),materials[pick].getpixel((x+ox,y+oy))+(255,))
   tiles.append(im)
cols=16;rows=math.ceil(len(tiles)/cols)
terrain=Image.new('RGBA',(cols*32,rows*32))
for i,im in enumerate(tiles): terrain.paste(im,((i%cols)*32,(i//cols)*32))
terrain.save(OUT/'terrain.png');terrain.save(SRC/'terrain.png')
write(SRC/'terrain_groups.json',{'tileSize':32,'tileCount':len(tiles),'columns':cols,'groups':groups})

# Improve the existing Tiled map, preserving gameplay marker identities/positions.
mp=ROOT/'maps/creep_forest.tmj'
m=json.loads(mp.read_text(encoding='utf-8'))
markers=next(l for l in m['layers'] if l['name']=='markers')
# Existing two solid trunk anchors become matching bamboo clusters.
collision=next(l for l in m['layers'] if l['name']=='collision')
collision['objects']=[o for o in collision['objects'] if o['name'] in ('trunk_west','trunk_east')]
for o in collision['objects']:
 cx=440 if o['name']=='trunk_west' else 840
 o.update(x=cx-32,width=64,height=22,y=218 if cx==440 else 418)
objects=[];oid=100
def obj(name,x,y,layer='sorted',solid=None):
 global oid
 im=sprites[name];oid+=1
 objects.append({'id':oid,'name':name,'type':'scenery','x':x,'y':y,'width':0,'height':0,'rotation':0,'visible':True,
 'properties':[{'name':'renderLayer','type':'string','value':layer}]})
 if solid:
  dx,dy,w,h=solid;oid+=1
  collision['objects'].append({'id':oid,'name':f'{name}_{oid}','type':'solid','x':x+dx,'y':y+dy,'width':w,'height':h,'rotation':0,'visible':True})
# High-density perimeter, with repeated modular silhouettes and shared palette.
for i,x in enumerate(range(24,961,80)):
 obj('bamboo_jade' if i%2 else 'bamboo_gold',x,136+(i%3)*12,solid=(-17,-16,34,16))
for x in (24,936):
 for i,y in enumerate((280,404,536)):
  obj('bamboo_jade' if i%2 else 'bamboo_gold',x,y,solid=(-16,-14,32,14))
obj('bamboo_jade',440,240);obj('bamboo_gold',840,440)
for x,y in [(85,202),(350,184),(565,174),(894,212),(80,482),(362,488),(548,500),(906,500)]:
 obj('bush',x,y)
for x,y in [(320,215),(784,184),(90,440),(528,487),(902,350),(400,510)]:
 obj('grass_tuft',x,y,'ground')
for x,y in [(392,205),(878,475),(74,510)]: obj('moss_root',x,y,'ground')
obj('stump',342,468,solid=(-15,-12,30,12))
obj('ruin_wall',328,168,solid=(-54,-14,108,14))
obj('ruin_wall',624,168,solid=(-54,-14,108,14))
obj('shrine',480,156,solid=(-47,-24,94,24))
obj('stone_monument',775,195,solid=(-22,-15,44,15))
obj('bamboo_fence',330,510,solid=(-43,-12,86,12))
obj('bamboo_fence',520,522,solid=(-43,-12,86,12))
obj('bamboo_gate',760,164)
# Gate posts only, opening stays walkable.
for dx in (-58,45):
 oid+=1;collision['objects'].append({'id':oid,'name':f'gate_post_{oid}','type':'solid','x':760+dx,'y':150,'width':13,'height':14,'rotation':0,'visible':True})
for x,y in [(104,308),(212,300),(392,172),(568,172),(806,500)]:
 obj('stone_lantern',x,y,solid=(-10,-10,20,10))
for x,y in [(398,448),(540,448)]:
 obj('training_dummy',x,y,solid=(-13,-12,26,12))
for x,y in [(84,176),(590,190),(890,270),(74,540),(572,560),(908,560)]:
 obj('moss_rocks',x,y,solid=(-24,-17,48,17))
# Stream along southern edge: two optional broad bridges, no required choke.
for x in (224,800):
 obj('bridge_deck',x,612,'ground');obj('bridge_front',x,612)
 for side in (-65,53):
  oid+=1;collision['objects'].append({'id':oid,'name':f'bridge_rail_{oid}','type':'solid','x':x+side,'y':528,'width':12,'height':76,'rotation':0,'visible':True})
for i,(x,w) in enumerate([(0,160),(288,448),(864,96)]):
 oid+=1;collision['objects'].append({'id':oid,'name':f'stream_{i}','type':'solid','x':x,'y':552,'width':w,'height':56,'rotation':0,'visible':True})
for x in (32,128,400,496,608,928):
 obj('bamboo_single',x,656)
obj('canopy',24,608);obj('canopy',936,608)
def inellipse(x,y,cx,cy,rx,ry):return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1
def material_at(x,y):
 if 552<=y<=600:return 5
 if (inellipse(x,y,220,344,158,130) or inellipse(x,y,690,338,196,146)
  or 160<=x<=820 and 288<=y<=400
  or 432<=x<=528 and 128<=y<=464
  or 160<=x<=288 and 448<=y<=552
  or 736<=x<=864 and 440<=y<=552): return 1
 if y>496:return 2
 return 0
ground=[];paving=[];details=[]
for ty in range(20):
 for tx in range(30):
  x=tx*32;y=ty*32;phase=tx%2+(ty%2)*2
  cs=[material_at(x,y),material_at(x+32,y),material_at(x+32,y+32),material_at(x,y+32)]
  mat=max(cs,key=lambda v:(cs.count(v),v))
  mat=next((v for v in (5,1,2) if v in cs),0)
  if mat:
   mask=sum(1<<i for i,c in enumerate(cs) if c==mat)
   gid=groups[f'grass_to_{mat}']+mask*4+phase
  else:gid=groups['material_0']+phase
  ground.append(gid)
  # Large central cracked training court connected to both dirt clearings.
  corners=[inellipse(px,py,470,340,126,110) for px,py in [(x,y),(x+32,y),(x+32,y+32),(x,y+32)]]
  mask=sum(1<<i for i,c in enumerate(corners) if c)
  # Stone overlays use grass transitions only outside the dirt connection.
  if mask==15:paving.append(groups['material_3']+phase)
  elif mask:
   # Transparent alpha cutout taken from the same transition mask; tile layer.
   paving.append(0)
  else:paving.append(0)
  details.append(groups['material_4']+phase if (tx*13+ty*19)%29==0 and mat==1 and cs.count(1)==4 else 0)
# Add stone-over-dirt edge family for the central court.
groups['dirt_to_stone']=len(tiles)+1
for mask in range(16):
 for phase in range(4):
  original=tiles[groups['grass_to_3']-1+mask*4+phase]
  im=original.copy();ox=(phase%2)*32;oy=(phase//2)*32
  for y in range(32):
   for x in range(32):
    if original.getpixel((x,y))[:3]==materials[0].getpixel((x+ox,y+oy)):
     im.putpixel((x,y),materials[1].getpixel((x+ox,y+oy))+(255,))
  tiles.append(im)
for ty in range(20):
 for tx in range(30):
  x=tx*32;y=ty*32;phase=tx%2+(ty%2)*2
  mask=sum(1<<i for i,(px,py) in enumerate([(x,y),(x+32,y),(x+32,y+32),(x,y+32)]) if inellipse(px,py,470,340,126,110))
  if mask:paving[ty*30+tx]=groups['dirt_to_stone']+mask*4+phase
rows=math.ceil(len(tiles)/cols);terrain=Image.new('RGBA',(512,rows*32))
for i,im in enumerate(tiles):terrain.paste(im,((i%cols)*32,(i//cols)*32))
terrain.save(OUT/'terrain.png');terrain.save(SRC/'terrain.png')
write(SRC/'terrain_groups.json',{'tileSize':32,'tileCount':len(tiles),'columns':cols,'groups':groups})
def tilelayer(id,name,data):return {'id':id,'name':name,'type':'tilelayer','visible':True,'opacity':1,'width':30,'height':20,'x':0,'y':0,'data':data}
m['layers']=[tilelayer(1,'ground',ground),tilelayer(4,'paving',paving),tilelayer(5,'details',details),markers,collision,
 {'id':6,'name':'scenery','type':'objectgroup','visible':True,'opacity':1,'objects':objects}]
m['nextobjectid']=oid+1;m['nextlayerid']=7
m['tilesets']=[{'firstgid':1,'name':'bamboo_terrain','image':'../assets/exports/bamboo_forest/terrain.png','imagewidth':512,'imageheight':rows*32,'tilewidth':32,'tileheight':32,'columns':16,'tilecount':len(tiles),'margin':0,'spacing':0}]
write(mp,m)
write(SRC/'sprite_metadata.json',{'sprites':entries,'alphaThreshold':245,'sampling':'nearest','bridgeSplitY':split})
write(SRC/'terrain_groups.json',{'tileSize':32,'tileCount':len(tiles),'columns':cols,'groups':groups})
print(f'Exported {len(sprites)} sprites and {len(tiles)} tiles; map has {len(objects)} placed reusable scenery objects')
