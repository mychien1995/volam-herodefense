"""Adapt the retained Tiled authoring proposal; never generate or repaint artwork."""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text(encoding='utf8'))
m=read('assets/concepts/dungeon-environments/hell/hell_layout.tmj')
props=read('assets/sprites/environment/hell/props_metadata.json')['assets']
ground=m['layers'][0]['data']; W,H=m['width'],m['height']; objects=[]; solids=[]
def obj(name,x,y,w=0,h=0,**extra):return dict(name=name,x=x,y=y,width=w,height=h,type='solid' if w else 'marker',rotation=0,visible=True,**extra)
for y in range(H):
    x=0
    while x<W:
        def free(a):return 0<=ground[y*W+a]-1<48 or 56<=ground[y*W+a]-1<64
        if free(x):x+=1;continue
        start=x
        while x<W and not free(x):x+=1
        solids.append(obj('lava_boundary',start*32,y*32,(x-start)*32,32))
for o in next(l for l in m['layers'] if l['name']=='props')['objects']:
    name=next(p['value'] for p in o['properties'] if p['name']=='assetId')[5:]
    if name=='hell_exit_portal':continue # One portal, rendered from the authoritative marker.
    metadata=next(p for p in props if p['id']=='hell_'+name)
    groundProp=name in ['skeletal_remains','scorch_decal','stone_bridge','fire_pit']
    objects.append(obj(name,o['x'],o['y'],properties=[dict(name='renderLayer',type='string',value='foreground' if name=='hanging_chains' else 'ground' if groundProp else 'feet')]))
    if name in ['hell_entrance','hanging_chains','skeletal_remains','stone_bridge']:continue
    w=metadata['dimensions'][0]*.45
    if name=='temple_gateway':
        for dx in [-w*.7,w*.7]:solids.append(obj(name+'_pillar',o['x']+dx-12,o['y']-16,24,24))
    else:solids.append(obj(name+'_footprint',o['x']-w/2,o['y']-12,w,20))
markers=[obj('hero_spawn',256,640),obj('exit_portal',1664,704)]
# Dress the retained courts with authored perimeter pieces, keeping their routes open.
for i,(x,y) in enumerate([(224,480),(416,480),(608,480),(800,448),(1056,448),(1184,448),(1376,480),(1568,480),(1760,480),
                         (224,992),(416,992),(608,992),(800,1056),(1056,1056),(1184,1056),(1376,992),(1568,992),(1760,992)]):
    name=['volcanic_rocks','obsidian_cliff','fortress_wall_north'][i%3]
    objects.append(obj(name,x,y,properties=[dict(name='renderLayer',type='string',value='feet')]))
    w=next(p for p in props if p['id']=='hell_'+name)['dimensions'][0]*.45
    solids.append(obj(name+'_footprint',x-w/2,y-12,w,20))
for i,(x,y) in enumerate([(352,560),(544,864),(864,576),(1152,896),(1472,560),(1728,864)]):
    objects.append(obj('skeletal_remains' if i%2 else 'charred_decorations',x,y,properties=[dict(name='renderLayer',type='string',value='ground')]))
for x,y in [(352,512),(576,896),(832,512),(1152,928),(1440,512),(1760,896)]:
    objects.append(obj('burning_brazier',x,y,properties=[dict(name='renderLayer',type='string',value='feet')]))
    solids.append(obj('burning_brazier_footprint',x-14,y-12,28,20))
for i,o in enumerate(next(l for l in m['layers'] if l['name']=='enemy_spawn')['objects']):
    markers.append(obj('creep_spawn_'+str(i),o['x'],o['y']))
layers=[m['layers'][0]]
for name,values in [('scenery',objects),('collision',solids),('markers',markers)]:
    for i,o in enumerate(values):o['id']=len(layers)*1000+i
    layers.append(dict(id=len(layers)+1,name=name,type='objectgroup',objects=values,opacity=1,visible=True,x=0,y=0,draworder='topdown'))
m.update(layers=layers,nextlayerid=5,nextobjectid=5000,properties=[])
tiles=read('assets/tilesets/hell/terrain.tsj');tiles.pop('tiles',None);tiles['image']='../assets/tilesets/hell/terrain.png';tiles['firstgid']=1
m['tilesets']=[tiles]
(R/'maps/creep_hell.tmj').write_text(json.dumps(m,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(f'Hell retained layout: {W}x{H}, {len(objects)} props, {len(solids)} reconciled solid footprints.')
