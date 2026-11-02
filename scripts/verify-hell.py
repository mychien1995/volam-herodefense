"""Independent retained-byte and source/runtime/frame checks; never approve art."""
import hashlib,json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1];P=R/'apps/game-client/public/assets'
read=lambda p:json.loads(p.read_text(encoding='utf8'))
master=read(R/'assets/concepts/dungeon-environments/hell/hell_asset_manifest.json')
manifest=read(R/'assets/hell_dungeon.manifest.json')
assert manifest==read(P/'hell/manifest.json')
for f in master['inventory']:
    assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
def atlas_check(sheet_path,atlas_path,expected):
    sheet=Image.open(sheet_path).convert('RGBA');sheet.load();atlas=read(atlas_path)
    assert len(atlas['frames'])==expected
    # Retain authored partial-alpha shadows/glows; do not threshold/repaint art.
    assert sheet.getchannel('A').getextrema()==(0,255)
    for name,v in atlas['frames'].items():
        r=v['frame'];x,y,w,h=[r[k]for k in ['x','y','w','h']]
        assert 0<=x<x+w<=sheet.width and 0<=y<y+h<=sheet.height,name
        assert sheet.crop((x,y,x+w,y+h)).getbbox(),name
    return sheet,atlas
count=tags=0
for actor in manifest['assets']:
    folder=R/'assets/sprites/creeps/dungeons/hell'/actor['id'][5:]
    meta=read(folder/'manifest.json');sheet,atlas=atlas_check(folder/'spritesheet.png',folder/'atlas.json',46)
    assert actor['footPivot']==[meta['groundAnchorPx'][0]/meta['frameWidth'],meta['groundAnchorPx'][1]/meta['frameHeight']]
    assert actor['sharedStates']==['hurt','death']
    for source in actor['sourceRasters']:assert (R/source).is_file(),source
    for name,v in atlas['frames'].items():
        frame=Image.open(folder/'frames'/f'{name}.png').convert('RGBA');frame.load()
        r=v['frame'];x,y,w,h=[r[k]for k in ['x','y','w','h']]
        assert frame.size==tuple(actor['frameSize']) and frame.tobytes()==sheet.crop((x,y,x+w,y+h)).tobytes(),name
        count+=1
    for tag in actor['animations']:
        assert len(tag['frames'])==len(tag['durations'])
        for f,ms in zip(tag['frames'],tag['durations']):assert f in atlas['frames'] and ms==atlas['frames'][f]['duration'] and ms>0
        if tag['state'] in actor['sharedStates']:assert tag['direction']=='shared'
        tags+=1
    for source,target in [('spritesheet.png',actor['id']+'.png'),('atlas.json',actor['id']+'.json')]:
        assert (folder/source).read_bytes()==(P/'hell'/target).read_bytes()
assert (count,tags)==(276,92),(count,tags)
atlas_check(P/'hell/scenery.png',P/'hell/scenery.json',20)
atlas_check(P/'hell/effects.png',P/'hell/effects.json',64)
for source,target in [('assets/tilesets/hell/terrain.png','terrain.png'),('assets/tilesets/hell/terrain.tsj','terrain.json'),('assets/sprites/environment/hell/props_atlas.png','scenery.png'),('assets/sprites/environment/hell/props_atlas.json','scenery.json'),('assets/effects/dungeons/hell/spritesheet.png','effects.png'),('assets/effects/dungeons/hell/atlas.json','effects.json')]:
    assert (R/source).read_bytes()==(P/'hell'/target).read_bytes()
terrain=Image.open(P/'hell/terrain.png');terrain.load();assert terrain.size==(512,544)
tiles=read(P/'hell/terrain.json');assert tiles['tilecount']==272
for t in tiles['tiles']:
    if 'animation'in t:assert len(t['animation'])==8 and all(0<=f['tileid']<272 and f['duration']==140 for f in t['animation'])
fx=read(R/'assets/effects/dungeons/hell/effects_metadata.json')['effects']
assert len(fx)==16 and all(e['frames']==s['frames'] and e['frameRate']==s['frameRate'] and e['origin']==s['origin'] for e,s in zip(manifest['effects'],fx))
props=read(R/'assets/sprites/environment/hell/props_metadata.json')['assets']
for p,s in zip(manifest['scenery'],props):assert p['size']==s['dimensions'] and p['pivot']==s['groundAnchorPx']
m=read(R/'maps/creep_hell.tmj');assert m['orientation']=='orthogonal'
assert (R/'maps/creep_hell.tmj').read_bytes()==(P/'creep_hell.tmj').read_bytes()==(R/'packages/game-data/src/creep-hell-map.json').read_bytes()
assert all(1<=i<=272 for i in m['layers'][0]['data'])
print('PASS: 276 nonempty Hell cels, 92 authored tags (shared hurt/death), 272 tiles, 20 props, 64 effect cels; bounds, alpha, pivots, timings, exact provenance and runtime parity. Director approval pending.')
