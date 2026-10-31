"""Validate delivered rasters, atlas/source parity, Tiled references and approved bytes."""
from pathlib import Path
from PIL import Image
import hashlib,json
R=Path(__file__).resolve().parents[1]
S=R/'assets/source/bamboo_forest';E=R/'assets/exports/bamboo_forest'
meta=json.loads((S/'sprite_metadata.json').read_text(encoding='utf-8'))
atlas=json.loads((E/'scenery.json').read_text(encoding='utf-8'))
with Image.open(E/'scenery.png') as im: im.verify()
sheet=Image.open(E/'scenery.png').convert('RGBA');sheet.load()
assert sheet.size==(1024,768)
assert set(sheet.getchannel('A').getdata())=={0,255}
assert len(atlas['frames'])==19
for a in meta['sprites']:
 n=a['id'];f=atlas['frames'][n]['frame'];x,y,w,h=[f[k] for k in ('x','y','w','h')]
 assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height
 im=Image.open(S/'sprites'/f'{n}.png').convert('RGBA');im.load()
 assert im.size==(w,h) and im.tobytes()==sheet.crop((x,y,x+w,y+h)).tobytes(),n
 assert (S/'sprites'/f'{n}.aseprite').is_file(),n
 alpha=im.getchannel('A');assert alpha.getbbox(),n
 assert all(alpha.getpixel(p)==0 for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]),n
 assert [w,h]==a['dimensions'] and a['footPivot'][1]==(h-4)/h,n
groups=json.loads((S/'terrain_groups.json').read_text(encoding='utf-8'))
terrain=Image.open(E/'terrain.png').convert('RGBA');terrain.load()
assert terrain.width==512 and terrain.height%32==0
for i in range(groups['tileCount']):
 x=i%16*32;y=i//16*32
 assert terrain.crop((x,y,x+32,y+32)).getchannel('A').getextrema()==(255,255)
for i in range(6):
 im=Image.open(S/f'material_{i}.png')
 assert [im.getpixel((0,t)) for t in range(64)]==[im.getpixel((63,t)) for t in range(64)]
 assert [im.getpixel((t,0)) for t in range(64)]==[im.getpixel((t,63)) for t in range(64)]
m=json.loads((R/'maps/creep_forest.tmj').read_text(encoding='utf-8'))
assert m['orientation']=='orthogonal' and (m['width'],m['height'],m['tilewidth'],m['tileheight'])==(30,20,32,32)
assert m['tilesets'][0]['tilecount']==groups['tileCount']
for l in m['layers']:
 if l['type']=='tilelayer':
  assert len(l['data'])==600 and all(0<=v<=groups['tileCount'] for v in l['data'])
scenery=next(l for l in m['layers'] if l['name']=='scenery')['objects']
assert len(scenery)==70
assert all(o['name'] in atlas['frames'] for o in scenery)
concept=R/'assets/concepts/dungeon-environments/bamboo-forest'
lock=json.loads((concept/'approved_concepts_v1.lock.json').read_text(encoding='utf-8'))
for f in lock['files']:assert hashlib.sha256((concept/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
old=json.loads((R/'assets/approved_cai_bang.lock.json').read_text(encoding='utf-8'))
for p,h in old['files'].items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==h,p
print(f"PASS: 19 transparent sprites, {groups['tileCount']} opaque 32px tiles, 6 periodic materials, 70 map props; concept and hero locks unchanged")
