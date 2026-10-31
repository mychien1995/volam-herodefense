"""Compose retained Beach tiles and props into shared authoritative map geometry."""
import json
import math
from pathlib import Path
R=Path(__file__).resolve().parents[1]
W,H,T=48,36,32
terrain=json.loads((R/'assets/tilesets/beach/terrain.json').read_text())
groups=terrain['groups']
layers=[]; next_id=1

def land(x,y):
    left=6 if y<12 else 4 if y<23 else 3
    right=40 if y<12 or y>28 else 42
    return 4<=y<=32 and left<=x<=right and not (14<=x<=15 and y>=23)

def deck(x,y):
    return (13<=x<=16 and 26<=y<=27) or (39<=x<=45 and 21<=y<=22)

def is_walkable(x,y):
    return deck(x,y) or all(land(px,py) for px,py in [(x,y),(x+1,y),(x+1,y+1),(x,y+1)])

def tile_layer(name,data):
    layers.append(dict(id=len(layers)+1,name=name,type='tilelayer',width=W,height=H,
        x=0,y=0,opacity=1,visible=True,data=data))

def point(name,x,y,kind='spawn',width=0,height=0,**extra):
    return dict(name=name,type=kind,x=x,y=y,width=width,height=height,**extra)

def object_layer(name,objects):
    global next_id
    for o in objects:o.update(id=next_id,rotation=0,visible=True);next_id+=1
    layers.append(dict(id=len(layers)+1,name=name,type='objectgroup',objects=objects,
        opacity=1,visible=True,x=0,y=0,draworder='topdown'))

ground=[];foam=[]
for y in range(H):
    for x in range(W):
        phase=x%2+2*(y%2)
        corners=[land(x,y),land(x+1,y),land(x+1,y+1),land(x,y+1)]
        mask=sum((not v)<<i for i,v in enumerate(corners))
        shore=any(not land(x+dx,y+dy) for dx,dy in [(2,0),(-2,0),(0,2),(0,-2)])
        if deck(x,y):index=groups['dock_horizontal']['firstTile']+phase
        elif mask==15:index=groups['deep_water' if x<2 or x>45 or y<2 or y>34 else 'shallow_water']['firstTile']+phase
        elif mask:index=groups['wet_to_water']['firstTile']+mask*4+phase
        elif shore:index=groups['wet_sand']['firstTile']+phase
        elif (x<10 and y<13):index=groups['stone_path']['firstTile']+phase
        elif (x>34 and y<17):index=groups['coastal_grass']['firstTile']+phase
        else:index=groups['dry_sand']['firstTile']+phase
        ground.append(index+1)
        foam.append(groups['water_edge_foam']['firstTile']+mask*4+phase+1 if 0<mask<15 else 0)
tile_layer('ground',ground)
tile_layer('shoreline',foam)
props=[];collision=[]
# Water boundaries use the same tile semantics as the visible ground and docks.
for y in range(H):
    x=0
    while x<W:
        if is_walkable(x,y):x+=1;continue
        start=x
        while x<W and not is_walkable(x,y):x+=1
        collision.append(point('water_boundary',start*T,y*T,'water',(x-start)*T,T))

def prop(name,x,y,foot=None,ground=False):
    props.append(point(name,x,y,'scenery',properties=[dict(name='renderLayer',type='string',value='ground' if ground else 'feet')]))
    if foot:
        dx,dy,w,h=foot;collision.append(point(name+'_footprint',x+dx,y+dy,'solid',w,h))

for x,y in [(240,320),(416,352),(224,576),(416,704),(608,896),(1056,896),(1184,576),(1184,288),(864,256)]:
    prop('palm_tall' if x%3 else 'palm_broad',x,y,(-12,-10,24,18))
for x,y in [(224,448),(416,224),(960,288),(1248,448),(1024,960),(352,1008),(1152,800)]:
    prop('coastal_rocks',x,y,(-30,-18,60,26))
prop('coastal_ruins',352,208,(-44,-20,88,28))
prop('dungeon_entrance',256,944)
prop('pirate_tent',1088,416,(-44,-24,88,30))
prop('pirate_camp_supplies',1184,448,(-30,-16,60,22))
prop('shipwreck_bow',1184,960,(-48,-20,96,28))
prop('shipwreck_mast',1280,896,(-10,-14,20,20))
prop('broken_boat',544,1008,(-40,-14,80,20))
prop('wooden_bridge',480,880,ground=True)
for x in [1312,1408]:prop('dock_pillars',x,736)
for x,y in [(960,416),(1056,496),(576,320),(1120,832)]:
    prop('barrel' if x%3 else 'crate',x,y,(-14,-14,28,22))
for x,y in [(416,544),(1104,544),(1056,768)]:prop('pirate_banner',x,y,(-8,-8,16,12))
for x,y in [(384,240),(1008,416),(1216,704)]:prop('weathered_lantern',x,y,(-8,-8,16,12))
for y in range(224,1024,96):
    for x in range(192,1312,112):
        if not is_walkable(x//T,y//T) or (480<x<960 and 480<y<800):continue
        name=['seashells','driftwood','coastal_grass','tropical_bush'][(x//16+y//16)%4]
        prop(name,x,y,ground=name in ['seashells','driftwood','coastal_grass'])
markers=[point('hero_spawn',320,832),point('exit_portal',352,288,'portal'),
         point('bridge_center',480,864,'landmark'),point('dock_end',1408,704,'landmark')]
for i,(x,y) in enumerate([(640,512),(768,512),(896,512),(608,608),(768,608),(928,608),
                        (576,688),(704,688),(832,688),(960,688),(640,752),(896,752)]):
    markers.append(point('creep_spawn_'+str(i),x,y))
object_layer('scenery',props);object_layer('collision',collision);object_layer('markers',markers)
result=dict(type='map',version='1.10',tiledversion='1.11.2',orientation='orthogonal',renderorder='right-down',
    width=W,height=H,tilewidth=T,tileheight=T,infinite=False,nextlayerid=len(layers)+1,nextobjectid=next_id,layers=layers,
    tilesets=[dict(firstgid=1,name='beach_terrain',tilewidth=32,tileheight=32,tilecount=512,columns=16,
        margin=0,spacing=0,image='../assets/tilesets/beach/terrain.png',imagewidth=512,imageheight=1024)])
(R/'maps/creep_beach.tmj').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(f'Beach map: {W}x{H}, {len(props)} props, {len(collision)} water/solid footprints')
