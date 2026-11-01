from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text(encoding='utf8'))
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

approval=read('assets/reviews/ly_mac_sau_v02/art_approval_v02.json')
assert approval['status']=='art_preview_approved'
for f in approval['files']: assert sha(f['path'])==f['sha256'],f['path']
subprocess.run([sys.executable,'-X','utf8','assets/reviews/ly_mac_sau_v02/verify_assets.py'],cwd=ROOT,check=True,stdout=subprocess.PIPE)
assert sha('apps/game-client/public/assets/co_mo/arena_preview.png')==sha('assets/concepts/arenas/co-mo-phai/arena_empty_review_v02.png')
manifest=read('apps/game-client/public/assets/co_mo/manifest.json')
assert sum(len(a['frames']) for p in manifest['assets'] for a in p['animations'])==192
for actor,folder in [('boss_ly_mac_sau','assets/sprites/bosses/ly-mac-sau'),('summon_co_mo_am_binh','assets/sprites/summons/co-mo-am-binh'),('co_mo_fx','assets/effects/bosses/ly-mac-sau'),('co_mo_purple','assets/effects/bosses/ly-mac-sau/purple_v02')]:
 for name,source in [('png','spritesheet.png'),('json','atlas.json')]:assert sha('apps/game-client/public/assets/co_mo/'+actor+'.'+name)==sha(folder+'/'+source)
assert all(e['texture']=='co_mo_purple' for e in manifest['effects'] if e['id'].startswith('co_mo:palm_'))
assert len(manifest['scenery'])==16
map_path='maps/boss_co_mo.tmj'
assert sha(map_path)==sha('packages/game-data/src/boss-co-mo-map.json')==sha('apps/game-client/public/assets/boss_co_mo.tmj')
m=read(map_path)
assert m['orientation']=='orthogonal' and m['tilewidth']==m['tileheight']==32
layers={l['name']:l for l in m['layers']}
for name in ['ground','details']:assert len(layers[name]['data'])==m['width']*m['height']
markers=layers['markers']['objects'];assert len([p for p in markers if p['name'].startswith('emitter_')])==12
assert len([p for p in markers if p['name'].startswith('summon_spawn_')])==4
assert {'hero_spawn','boss_spawn','exit_portal'}<={p['name'] for p in markers}
assert layers['collision']['objects'] and len(layers['scenery']['objects'])>=16
print(json.dumps({'status':'PASS','approvedHashes':len(approval['files']),'actorFrames':192,'retainedRasterBytesUnchanged':True,'purpleBinding':True,'serverClientMapIdentical':True,'projection':'orthogonal','emitters':12}))
