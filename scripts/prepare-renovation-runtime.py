"""Measure approved cels for a lossless trimmed runtime atlas; never edit pixels."""
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
source=root/'assets/source/renovation-v1'
dest=root/'assets/exports/renovation-v1/runtime'
dest.mkdir(parents=True,exist_ok=True)
catalog=json.loads((root/'assets/exports/renovation-v1/catalog.json').read_text('utf8'))
identity={a['id']:a for a in json.loads((source/'catalog.json').read_text('utf8'))['actors']}
plan=[]
for actor in catalog['assets']:
    sheet=actor.get('reuse',{}).get('sheet',f"assets/exports/renovation-v1/{actor['id']}.png")
    atlas=actor.get('reuse',{}).get('atlas',f"assets/exports/renovation-v1/{actor['id']}.json")
    frames=json.loads((root/atlas).read_text('utf8'))['frames']
    image=Image.open(root/sheet).convert('RGBA')
    selected=[]
    for direction in ['down','left','right','up']:
        for state,count in [('idle',1),('walk',4)]:
            for index in range(count):
                name=f'{state}_{direction}_{index}'
                r=frames[name]['frame'];cel=image.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
                box=cel.getchannel('A').getbbox();assert box
                selected.append({'name':name,'source':[r['x']+box[0],r['y']+box[1],box[2]-box[0],box[3]-box[1]],'trim':list(box),'duration':110 if state=='walk' else 350})
    actor={**actor,'legacyRatio':actor['height']/(Image.open(root/identity[actor['id']]['identity']).height/4)}
    plan.append({'actor':actor,'source':sheet,'cell':[max(c['source'][2] for c in selected)+4,max(c['source'][3] for c in selected)+4],'frames':selected})
(source/'runtime-layout.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Measured lossless runtime packing for',len(plan),'approved actors')
