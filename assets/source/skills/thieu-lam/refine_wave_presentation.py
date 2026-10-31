from pathlib import Path
import json
base=Path(__file__).resolve().parent;root=base.parents[3];sid='nhu_lai_thien_diep'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
recipe=read(base/'recipe.json')
component=root/f'assets/exports/skills/thieu-lam/{sid}/{sid}_vfx.animations.json'
a=read(component);manifest=root/'assets/exports/skills/thieu-lam/production_manifest_v01.json';m=read(manifest)
for container in [next(x for x in recipe['assets'] if x['id']==sid+'_vfx'),a,next(x for x in m['assets'] if x['id']==sid+'_vfx')]:
 for anim in container['animations']:
  if anim['placement']=='caster_front':
   dx,dy={'right':(1,0),'left':(-1,0),'up':(0,-1),'down':(0,1)}[anim['direction']]
   anim['effectPlacementOffset']=[dx*46,dy*72-22]
write(base/'recipe.json',recipe);write(component,a);write(manifest,m)
p=base/'prepare.py';s=p.read_text(encoding='utf-8-sig')
needle="offset=[dx*(18 if placement=='caster_hand' else 28),dy*12-22]"
s=s.replace(needle,needle+"\n                if sid=='nhu_lai_thien_diep' and placement=='caster_front':offset=[dx*46,dy*72-22]")
p.write_text(s,encoding='utf-8')
p=base/'review.mjs';s=p.read_text(encoding='utf-8')
s=s.replace("'nhan_kiem_hop_nhat',","'nhu_lai_thien_diep',\n            'nhan_kiem_hop_nhat',",1)
s=s.replace("start = 230;","start = skill === 'nhu_lai_thien_diep' ? 540 : 230;")
s=s.replace("const distance = 28 + Math.max(0, t - start) * 0.12;","const initial = skill === 'nhu_lai_thien_diep' ? (dy ? 72 : 46) : 28;\n        const speed = skill === 'nhu_lai_thien_diep' ? (100 - initial) / 300 : 0.12;\n        const distance = initial + Math.max(0, t - start) * speed;")
p.write_text(s,encoding='utf-8')
print('Moved only ultimate visual release/travel ahead of torso; presentation target100px and confirmed preview impact540ms. Combat unchanged.')
