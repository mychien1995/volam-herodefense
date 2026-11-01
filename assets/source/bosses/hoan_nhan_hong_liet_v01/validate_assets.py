"""Static art-package verification only; never a Phaser/gameplay acceptance claim."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).parent
OUT=ROOT/'assets/exports/bosses/hoan_nhan_hong_liet_v01'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
report={'scope':'static PNG/atlas/provenance validation; no Phaser or server assertions','runtimeIntegrated':False,'directorApproved':False,'assets':[],'frames':0,'errors':[],'knownIssues':[]}
for asset in manifest['assets']:
 src=ROOT/asset['source'];sheet=ROOT/asset['sheet'];atlas=ROOT/asset['atlas']
 assert sha(src)==asset['sourceSha256']
 assert sha(sheet)==asset['sheetSha256'] and sha(atlas)==asset['atlasSha256']
 im=Image.open(sheet);assert im.mode=='RGBA'
 data=json.loads(atlas.read_text(encoding='utf-8'));assert len(data['frames'])==asset['rows']*asset['cols']
 hashes=set();edge_frames=[];all_transparent=True
 for name,frame in data['frames'].items():
  f=frame['frame'];x,y,w,h=[f[k] for k in ['x','y','w','h']]
  assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height,(asset['id'],name,'atlas bounds')
  cel=im.crop((x,y,x+w,y+h));a=np.asarray(cel)[:,:,3]
  assert np.any(a>180),(asset['id'],name,'empty')
  assert np.any(a==0),(asset['id'],name,'no transparent padding')
  expected=next(m for m in asset['frames'] if m['name']==name)
  assert hashlib.sha256(cel.tobytes()).hexdigest()==expected['sha256'],(asset['id'],name,'frame hash mismatch')
  if np.any(a[0]>180) or np.any(a[-1]>180) or np.any(a[:,0]>180) or np.any(a[:,-1]>180):edge_frames.append(name)
  hashes.add(expected['sha256'])
 assert not edge_frames,(asset['id'],'export edge clipping',edge_frames)
 item={'id':asset['id'],'dimensions':list(im.size),'frames':len(data['frames']),'distinctFrameHashes':len(hashes),'exportEdgeClipping':False,'sourceSha256':asset['sourceSha256']}
 report['assets'].append(item);report['frames']+=len(data['frames'])
 if asset.get('knownIssues'):report['knownIssues'].append({'id':asset['id'],'issue':asset['knownIssues']})
for path in [ROOT/'assets/reviews/bosses/hoan_nhan_hong_liet_v01/index.html',ROOT/'assets/reviews/bosses/hoan_nhan_hong_liet_v01/review.js']:
 assert path.exists()
refs=['assets/concepts/bosses/hoan-nhan-hong-liet/master_concept.png','assets/concepts/summons/mongolian-soldiers/combined_concept.png','assets/concepts/arenas/mongolian-headquarters/arena_overview.png','assets/references/vo_dang_character_reference.png','assets/references/hell_dungeon_reference.png','assets/references/current_game_2026_10_29_placeholder_anti_reference.png']
report['references']=[{'path':r,'sha256':sha(ROOT/r),'dimensions':list(Image.open(ROOT/r).size)}for r in refs]
report['result']='PASS_STATIC_ONLY'
dest=ROOT/'assets/reviews/bosses/hoan_nhan_hong_liet_v01/static_validation.json'
dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"PASS_STATIC_ONLY: {len(report['assets'])} PNG/JSON atlases, {report['frames']} frame rectangles/hashes/alpha/bounds; {len(report['knownIssues'])} disclosed source/candidate issues. No runtime approval.")
