"""Derive hotbar icons from retained original VFX frames; no new artwork."""
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'assets/exports/skills/cai-bang/production_manifest_v1.json').read_text(encoding='utf-8'))
icons=[]
for asset in manifest['assets']:
    if asset['kind']!='vfx' or asset['skillId']=='shared_fire': continue
    tag=next((t for t in asset['animations'] if t['name'] in ('impact','buff','whirlwind','defense_break')),asset['animations'][0])
    frame=tag['frames'][min(1,len(tag['frames'])-1)]
    atlas=json.loads((ROOT/asset['atlas']).read_text(encoding='utf-8'))
    r=atlas['frames'][frame]['frame']; sheet=Image.open(ROOT/asset['sheet']).convert('RGBA')
    im=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
    box=im.getbbox()
    if not box: raise ValueError(f'Empty icon source {asset["id"]}:{frame}')
    im=im.crop(box);factor=1
    while max(im.size)/factor>56:factor*=2
    if factor>1:im=im.resize((max(1,im.width//factor),max(1,im.height//factor)),Image.Resampling.NEAREST)
    upscale=1
    while max(im.size)*upscale*2<=56:upscale*=2
    if upscale>1:im=im.resize((im.width*upscale,im.height*upscale),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(64,64));out.alpha_composite(im,((64-im.width)//2,(64-im.height)//2))
    path=Path(asset['sheet']).parent/'icon.png';out.save(ROOT/path)
    icons.append({'skillId':asset['skillId'],'source':asset['sheet'],'frame':frame,'export':path.as_posix(),'size':[64,64],'integerReduction':factor,'integerEnlargement':upscale,'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()})
(ROOT/'assets/exports/skills/cai-bang/icon_provenance.json').write_text(json.dumps({'method':'Unmodified supplied VFX frame pixels, transparent crop/center and optional integer nearest reduction; no generated artwork','icons':icons},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(icons)} derivative icons')
