"""Read-only native PNG/atlas audit. Aseprite writes all raster exports."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'apps/game-client/src/renovation-followup.generated.json').read_text())
cells=0
for a in manifest['assets']:
 p=root/a['url'].replace('/assets/','assets/exports/');assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
 im=Image.open(p).convert('RGBA');m=json.loads(p.with_suffix('.json').read_text());assert len(m['frames'])==a['grid'][0]*a['grid'][1]
 assert im.size==(m['meta']['size']['w'],m['meta']['size']['h'])
 pixels=[]
 for name,f in m['frames'].items():
  r,t,s=f['frame'],f['spriteSourceSize'],f['sourceSize'];assert [s['w'],s['h']]==a['canvas']
  assert 0<t['x'] and 0<t['y'] and t['x']+t['w']<s['w'] and t['y']+t['h']<s['h'],(a['id'],name,'virtual clipping')
  assert r['x']>=4 and r['y']>=4 and r['x']+r['w']<=im.width-4 and r['y']+r['h']<=im.height-4
  alpha=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])).getchannel('A');assert alpha.getbbox() and alpha.getextrema()[1]>=(220 if a['id']=='staff_crack' and name=='3' else 240),(a['id'],name,'opaque core or authored fade')
  assert not any(0<v<12 for v in alpha.getdata()),(a['id'],name,'alpha noise')
  assert f['duration']==80 and not f['rotated'];pixels.append(hashlib.sha256(alpha.tobytes()).hexdigest());cells+=1
 assert len(set(pixels))==len(pixels),(a['id'],'repeated pose raster')
 assert (root/f"assets/source/renovation-v6/editable/{a['id']}.aseprite").exists()
 if a['id']=='dragon_turns':
  assert set(m['frames'])=={f'{d}_{i}' for d in ['right','down_right','down','up_right','up'] for i in range(4)}
 if a['id']=='staff_action':
  assert set(m['frames'])=={f'{d}_{i}' for d in ['down','left','right','up'] for i in range(4)}
  assert len(a['feet'])==16 and all(len(p)==2 for p in a['feet']),'explicit boot anchors'
 if a['id'] in ['staff_arc','staff_crack']:assert set(m['frames'])=={'0','1','2','3'}
files={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for d in ['assets/source/renovation-v6','assets/exports/renovation-v6'] for p in (root/d).rglob('*') if p.is_file() and p.name!='provenance.json'}
provenance={'status':'candidate; director review pending','license':'Original project raster artwork, built-in imagegen using approved project identity references; no third-party game art copied.','rasterTool':'Aseprite1.3.18.6 Lua, RGBA, uniform bilinear resizing and alpha cutoff12; Python reads rasters only.','sourceLayout':'Measured dragon row cuts215/435/690/920 replace the generator imperfect equal-height grid. Five genuine camera views, four body-undulation poses each; left views mirror horizontally without screen-plane rotation.','rejectedSource':'staff_action.png has cell overlap; retained unchanged for provenance. Export uses staff_action_clean.png, with held staff and isolated cells.','bodyAnchor':'Shared native feet200/320; sixteen measured source boot midpoints exclude the descending staff tip.','cells':cells,'files':files}
if '--write-manifest' in sys.argv:(root/'assets/source/renovation-v6/provenance.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
else:assert json.loads((root/'assets/source/renovation-v6/provenance.json').read_text())['files']==files,'V6 provenance mismatch'
print(f'V6 PASS: {cells} unique cels, five authored dragon views, held-staff poses, alpha/bounds/pivots/clocks/provenance')
