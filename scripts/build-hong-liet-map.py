"""Compose existing original headquarters tiles/props. No art generation."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];W,H=40,36
layers=[];n=1
def objects(name,items):
 global n
 for o in items:o.update(id=n,rotation=0,visible=True);n+=1
 layers.append(dict(id=len(layers)+1,name=name,type='objectgroup',objects=items,opacity=1,visible=True,x=0,y=0,draworder='topdown'))
def obj(name,x,y,width=0,height=0,kind='marker',**kw):return dict(name=name,type=kind,x=x,y=y,width=width,height=height,**kw)
def material(x,y):
 if x<4 or x>35 or y<5 or y>33:return 48
 if x<6 or x>33 or y<9 or y>31:return 16
 if x in [6,33] or y in [9,31] or 17<=x<=22 and 16<=y<=22:return 32
 return 0
ground=[material(x,y)+(x%4)+(y%4)*4+1 for y in range(H)for x in range(W)]
layers.append(dict(id=1,name='ground',type='tilelayer',width=W,height=H,x=0,y=0,opacity=1,visible=True,data=ground))
props=[obj('command_tent',640,280),obj('watchtower',160,280),obj('watchtower',1120,280),obj('military_gate',640,1100),obj('yurt',96,550),obj('soldier_tent',1184,550),obj('return_portal',1000,960),obj('command_horn_carpet',640,350)]
for x in [328,640,952]:props.extend([obj('army_banner',x,302),obj('burning_brazier',x,330)])
for x in [144,1136]:
 for y in [420,580,740,900]:props.append(obj('palisade_vertical',x,y))
for x in [320,640,960]:props.append(obj('palisade_horizontal',x,1070))
for x in [100,1180]:
 for i,name in enumerate(['saber_shield_rack','bow_quiver_rack','supply_crate','barrel','military_drum']):props.append(obj(name,x,380+i*128))
for x in range(64,1280,128):
 for y in [130,1130]:props.append(obj('boundary_lava_rock',x,y))
for x in [48,1232]:
 for y in range(350,1050,128):props.append(obj('boundary_lava_rock',x,y))
objects('scenery',props)
objects('collision',[obj('north_camp',0,0,1280,288,'solid'),obj('west_palisade',0,288,192,864,'solid'),obj('east_palisade',1088,288,192,864,'solid'),obj('south_palisade',192,1024,896,128,'solid')])
objects('markers',[obj('hero_spawn',640,928),obj('boss_spawn',640,480),obj('exit_portal',1000,960),obj('arena_combat_bounds',208,304,864,704,'bounds'),obj('soldier_entry_west',252,420),obj('soldier_entry_east',1028,420)])
m=dict(type='map',version='1.10',orientation='orthogonal',renderorder='right-down',width=W,height=H,tilewidth=32,tileheight=32,infinite=False,layers=layers,tilesets=[dict(firstgid=1,name='hong_liet_terrain',tilewidth=32,tileheight=32,tilecount=112,columns=16,image='terrain.png',imagewidth=512,imageheight=224,margin=0,spacing=0)])
text=json.dumps(m,ensure_ascii=False,indent=2)+'\n'
(root/'maps/boss_hong_liet.tmj').write_text(text,encoding='utf-8',newline='\n')
(root/'packages/game-data/src/hong-liet-map.json').write_text(text,encoding='utf-8',newline='\n')
print('Composed layered headquarters map with retained art and authoritative collision/markers.')
