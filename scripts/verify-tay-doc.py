from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text(encoding='utf8'))
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
approval=read('assets/reviews/tay_doc_v02/director_approval.json')
assert approval['status']=='approved_visual_design_and_feedback03_choreography'
for f in approval['frozenInputsNotBlanketCelApproval']:assert sha(f['path'])==f['sha256'],f['path']
manifest=read('assets/runtime/tay_doc_directions_v01.json')
for f in manifest['files']+manifest['sources']:assert sha(f['path'])==f['sha256'],f['path']
assert manifest['status']=='candidate_runtime_director_review_pending'
atlas=read('assets/exports/bosses/tay_doc_runtime_v01/atlas.json')
clips=read('assets/exports/bosses/tay_doc_runtime_v01/animations.json')
assert len(atlas['frames'])==60 and len(clips['animations'])==15
hashes=set()
for name in atlas['frames']:
 im=Image.open(ROOT/f'assets/exports/bosses/tay_doc_runtime_v01/frames/{name}.png').convert('RGBA')
 assert im.size==(160,144)
 b=im.getbbox();assert b and b[0]>0 and b[1]>0 and b[2]<160 and b[3]<144,(name,b)
 hashes.add(hashlib.sha256(im.tobytes()).hexdigest())
assert len(hashes)==60
packages=read('assets/reviews/tay_doc_v02/packages.json');packages.pop('hero')
packages['directions']={'path':'/assets/exports/bosses/tay_doc_runtime_v01','image':'spritesheet.png','atlas':'atlas.json',**clips}
playback=read('apps/game-client/src/tay-doc-playback.json')
for key,p in packages.items():
 folder=p['path'].lstrip('/')
 for ext,source in [('png',p['image']),('json',p['atlas'])]:assert sha(f'apps/game-client/public/assets/tay_doc/{key}.{ext}')==sha(folder+'/'+source)
 assert playback[key]['origin']==p['origin'] and playback[key]['animations']==p['animations']
 source=read(folder+'/'+p['atlas'])
 for tag,c in p['animations'].items():
  assert len(c['frames'])==len(c['durationsMs'])
  for frame in c['frames']:assert frame in source['frames'] and frame in playback[key]['bounds']
for direction in ['left','up','down']:
 for pose in ['crawl','hop','exhale','staff_sweep','palm_attack']:assert pose+'_'+direction in clips['animations']
print(json.dumps({'status':'PASS','frozenInputs':len(approval['frozenInputsNotBlanketCelApproval']),'candidateCels':60,'candidateClips':15,'copiesAndRegistryExact':True,'runtimeArtApproval':'pending'}))
