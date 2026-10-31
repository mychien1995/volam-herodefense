"""Correct one documented empty cel from its retained original raster, not new art."""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import subprocess
from PIL import Image

R = Path(__file__).resolve().parents[1]
base = R/'assets/sprites/creeps/dungeons/beach'
folder = base/'thuy_quy'
spec = importlib.util.spec_from_file_location('beach_pack',base/'source/package_beach_v01.py')
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)
meta_path = folder/'manifest.json'
meta = json.loads(meta_path.read_text(encoding='utf8'))
source = base/'source/thuy_quy_sprites_source_v01.png'
# The nominal grid/connected component assignment selected only a narrow stray
# fragment. This independently inspected rectangle contains the authored dissolve.
box = (930,230,1100,342)
crop = Image.open(source).convert('RGBA').crop(box)
crop.putalpha(crop.getchannel('A').point(lambda a:255 if a>=245 else 0))
bounds = crop.getbbox()
assert bounds, 'The retained dissolve source must contain real pixels.'
crop = crop.crop(bounds)
item = {'image':crop,'source':source.relative_to(R).as_posix(),'cell':14,
        'rect':[box[0]+bounds[0],box[1]+bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]]}
frame, extraction = pack.anchor(item,meta['sourceScales']['down'],[144,128],[72,106],'death','thuy_quy')
frame = frame.convert('RGBA')
pixels = frame.load()
for y in range(frame.height):
    for x in range(frame.width):
        if pixels[x,y][3] == 0: pixels[x,y]=(0,0,0,0)
assert frame.getbbox(), 'Never export an empty death frame.'
path = folder/'frames/death_down_2.png'
frame.save(path)
atlas = json.loads((folder/'atlas.json').read_text())
rect = atlas['frames']['death_down_2']['frame']
sheet = Image.open(folder/'spritesheet.png').convert('RGBA')
sheet.paste(frame,(rect['x'],rect['y']))
sheet.save(folder/'spritesheet.png')
record = next(f for f in meta['frames'] if f['name']=='death_down_2')
record.update(sha256=pack.digest(path),extraction=extraction)
meta['knownIssues']=[]
meta['status']='prototype_pending_runtime_director_review'
meta['corrections']=[{'date':'2026-11-01','frame':'death_down_2',
    'method':'Re-extracted inspected authored dissolve pixels from original source using unchanged down-facing scale and feet pivot.',
    'sourceSha256':pack.digest(source),'sourceRect':item['rect'],'newFrameSha256':pack.digest(path)}]
pack.write(meta_path,meta)
# Reuse the delivered Aseprite assembly workflow, scoped to this actor only.
recipe = json.loads((base/'source/editable_source_recipe_v01.json').read_text())
recipe = [v for v in recipe if v['output']==meta['source']]
assert len(recipe)==1
recipe_path=R/'.cache/beach-water-ghost-source.json'
pack.write(recipe_path,recipe)
exe=os.environ.get('ASEPRITE_PATH','C:/Program Files/Aseprite/Aseprite.exe')
subprocess.run([exe,'-b','--script-param',f'root={R.as_posix()}',
    '--script-param',f'recipe={recipe_path.as_posix()}',
    '--script',str(base/'source/assemble_beach_v01.lua')],check=True,cwd=R)
master_path=base/'beach_manifest_v01.json'
master=json.loads(master_path.read_text(encoding='utf8'))
changed={str(p.relative_to(R).as_posix()) for p in [path,folder/'spritesheet.png',meta_path,R/meta['source']]}
for f in master['files']:
    if f['path'] in changed:
        p=R/f['path']; f.update(sha256=pack.digest(p),bytes=p.stat().st_size)
master['status']='prototype_pending_runtime_director_review'
master['knownIssues']=[]
master['corrections']=meta['corrections']
for enemy in master['enemies']:
    if enemy['id']=='thuy_quy':enemy['status']=meta['status']
pack.write(master_path,master)
print('Corrected only Thuy Quy death_down_2, actor sheet/editable source and provenance; runtime review pending.')
