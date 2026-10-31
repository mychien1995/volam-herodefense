"""Verify retained Beach artwork, the one source correction, and runtime map parity."""
from pathlib import Path
import hashlib,json,struct
from PIL import Image
R=Path(__file__).resolve().parents[1];P=R/'apps/game-client/public/assets'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
master=read(R/'assets/sprites/creeps/dungeons/beach/beach_manifest_v01.json')
manifest=read(R/'assets/beach_dungeon.manifest.json')
assert manifest==read(P/'beach/manifest.json')
for f in master['files']:
    assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
count=tags=0
for actor in manifest['assets']:
    folder=R/'assets/sprites/creeps/dungeons/beach'/actor['archetypeId']
    meta=read(folder/'manifest.json');atlas=read(folder/'atlas.json')
    sheet=Image.open(folder/'spritesheet.png').convert('RGBA');sheet.load()
    assert actor['footPivot']==[.5,106/128] and actor['status']=='prototype'
    assert len(meta['frames'])==64
    header=(R/meta['source']).read_bytes()[:128]
    assert struct.unpack_from('<H',header,4)[0]==0xA5E0
    assert struct.unpack_from('<HHH',header,6)==(64,144,128)
    for f in meta['frames']:
        image=Image.open(R/f['file']).convert('RGBA');image.load()
        assert image.size==(144,128) and image.getbbox(),f['file']
        assert set(image.getchannel('A').getdata())=={0,255},f['file']
        rect=atlas['frames'][f['name']]['frame'];x,y,w,h=[rect[k]for k in ['x','y','w','h']]
        assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height
        assert image.tobytes()==sheet.crop((x,y,x+w,y+h)).tobytes(),f['name']
        assert hashlib.sha256((R/f['file']).read_bytes()).hexdigest()==f['sha256']
        count+=1
    for a in actor['animations']:
        assert len(a['frames'])==len(a['durations']) and all(ms>0 for ms in a['durations'])
        assert len(set(a['frames']))==len(a['frames'])
        for f,ms in zip(a['frames'],a['durations']):assert atlas['frames'][f]['duration']==ms
        tags+=1
    assert (folder/'spritesheet.png').read_bytes()==(P/f"beach/{actor['id']}.png").read_bytes()
    assert (folder/'atlas.json').read_bytes()==(P/f"beach/{actor['id']}.json").read_bytes()
assert (count,tags)==(384,136),(count,tags)
terrain=Image.open(P/'beach/terrain.png').convert('RGBA');terrain.load()
assert terrain.size==(512,1024)
assert set(terrain.getchannel('A').getdata())=={0,255} # Includes transparent foam/transition tiles.
for source,target in [
    ('assets/tilesets/beach/terrain.png','terrain.png'),
    ('assets/tilesets/beach/terrain.json','terrain.json'),
    ('assets/sprites/environment/beach/scenery.png','scenery.png'),
    ('assets/sprites/environment/beach/atlas.json','scenery.json'),
    ('assets/effects/dungeons/beach/spritesheet.png','effects.png'),
    ('assets/effects/dungeons/beach/atlas.json','effects.json'),
]:assert (R/source).read_bytes()==(P/'beach'/target).read_bytes(),target
scenery=read(P/'beach/scenery.json');assert len(scenery['frames'])==25
propsheet=Image.open(P/'beach/scenery.png').convert('RGBA');propsheet.load()
fx=read(P/'beach/effects.json');fxsheet=Image.open(P/'beach/effects.png').convert('RGBA');fxsheet.load()
assert len(fx['frames'])==64 and len(manifest['effects'])==16
for atlas,sheet in [(scenery,propsheet),(fx,fxsheet)]:
    assert set(sheet.getchannel('A').getdata())=={0,255}
    for name,f in atlas['frames'].items():
        r=f['frame'];x,y,w,h=[r[k]for k in ['x','y','w','h']]
        assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height,name
        assert sheet.crop((x,y,x+w,y+h)).getbbox(),name
for p in manifest['scenery']:
    assert p['size']==[208,208] and p['pivot']==[104,196]
    assert p['id']in scenery['frames']
fxmeta=read(R/'assets/effects/dungeons/beach/manifest.json')
for e in manifest['effects']:
    source=next(s for s in fxmeta['sequences'] if e['id']=='beach_fx:'+s['name'])
    assert e['frames']==source['frames'] and source['durationMs']>0
    assert e['frameRate']==1000/source['durationMs'] and e['origin']==fxmeta['origin']
    for f in e['frames']:
        r=fx['frames'][f]['frame'];x,y,w,h=[r[k]for k in ['x','y','w','h']]
        assert fxsheet.crop((x,y,x+w,y+h)).getbbox(),f
m=read(R/'maps/creep_beach.tmj')
assert m['orientation']=='orthogonal' and m['tilewidth']==m['tileheight']==32
for layer in m['layers']:
    if layer['type']=='tilelayer':
        assert len(layer['data'])==m['width']*m['height']
        assert all(0<=i<=512 for i in layer['data'])
    if layer['name']=='scenery':assert all(o['name']in scenery['frames']for o in layer['objects'])
assert (R/'maps/creep_beach.tmj').read_bytes()==(P/'creep_beach.tmj').read_bytes()
assert (R/'maps/creep_beach.tmj').read_bytes()==(R/'packages/game-data/src/creep-beach-map.json').read_bytes()
assert master['corrections'][0]['frame']=='death_down_2'
print('PASS: 384 nonempty actor cels / 136 tags, corrected editable source, 512 tiles, 25 props, 64 VFX cels, provenance and map parity; runtime approval pending')
