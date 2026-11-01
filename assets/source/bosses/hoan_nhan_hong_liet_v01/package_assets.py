"""Mechanical alpha-gutter extraction; original image_gen drawings remain untouched.
Reuses the repository's existing cuts() detector. No procedural artwork is painted.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'assets/source/skills/m3c3_feedback_v2_batches/tools'))
from measure_effects import cuts
from raster_components import components
BASE=Path(__file__).parent
OUT=ROOT/'assets/exports/bosses/hoan_nhan_hong_liet_v01'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def export():
 OUT.mkdir(parents=True,exist_ok=True)
 cfg=json.loads((BASE/'generation.json').read_text(encoding='utf-8-sig')); assets=[]
 for rec in cfg['requests']:
  src=BASE/'generated'/rec['file']
  if not src.exists():continue
  raw=Image.open(src).convert('RGBA'); a=np.asarray(raw); mask=a[:,:,3]>180
  rows,cols=rec['rows'],rec['cols']; yy=cuts(mask.sum(1),rows); cells=[]
  component_list=[v for v in components(a[:,:,3]>8) if v['area']>=3] if rec.get('wholeComponents') else []
  for r in range(rows):
   xx=cuts(mask[yy[r]:yy[r+1]].sum(0),cols)
   for c in range(cols):
    rect=[xx[c],yy[r],xx[c+1],yy[r+1]];im=raw.crop(rect)
    if rec.get('wholeComponents'):
     # Reuse the repository connected-raster method where a raised blade/flash
     # crosses an inferred row gutter. Keep complete connected shapes.
     selected=[]
     for comp in component_list:
      rr=min(range(rows),key=lambda q:abs(comp['y']-(q+.5)*raw.height/rows))
      cc=min(range(cols),key=lambda q:abs(comp['x']-(q+.5)*raw.width/cols))
      if (rr,cc)==(r,c):selected.extend(comp['runs'])
     assert selected,(rec['id'],r,c,'no assigned components')
     rect=[min(z[1] for z in selected),min(z[0] for z in selected),max(z[2] for z in selected),max(z[0] for z in selected)+1]
     pixels=np.zeros((rect[3]-rect[1],rect[2]-rect[0],4),dtype=np.uint8)
     for sy,sx0,sx1 in selected:pixels[sy-rect[1],sx0-rect[0]:sx1-rect[0]]=a[sy,sx0:sx1]
     im=Image.fromarray(pixels)
    m=np.asarray(im)[:,:,3]>180
    ys,xs=np.where(m)
    assert len(xs),f'Empty {rec["id"]} {r},{c}'
    bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
    # Character anchor = central foot sole; do not let extended weapon move feet.
    if rec['kind']=='character':
     center=(bbox[0]+bbox[2])/2
     central=m[:,max(0,int(center-im.width*.18)):min(im.width,int(center+im.width*.18))]
     foot=np.where(central)[0].max()+1
     footxs=np.where(m[max(0,foot-8):foot])[1]
     anchor=[float((footxs.min()+footxs.max()+1)/2),float(foot)]
    else:anchor=[im.width*rec.get('sourceAnchor',[.5,.65])[0],im.height*rec.get('sourceAnchor',[.5,.65])[1]]
    cells.append((r,c,rect,im,bbox,anchor))
  # ONE scale per source group. No per-frame resizing.
  if rec['kind']=='character':
   factor=rec.get('fixedScale',rec['bodyHeight']/max(e[4][3]-e[4][1] for e in cells))
  else:factor=rec.get('exportScale',1)
  size=rec['canvas']; sheet=Image.new('RGBA',(cols*size,rows*size)); frames={};measured=[]
  for r,c,rect,im,bbox,anchor in cells:
   resized=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.NEAREST)
   target=[size/2,size*.8] if rec['kind']=='character' else [size/2,size*.65]
   px,py=round(target[0]-anchor[0]*factor),round(target[1]-anchor[1]*factor)
   # Fail on actual opaque clipping, never silently discard weapon/flame pixels.
   bb=resized.getchannel('A').point(lambda v:255 if v>180 else 0).getbbox()
   assert bb and px+bb[0]>=0 and py+bb[1]>=0 and px+bb[2]<=size and py+bb[3]<=size,(rec['id'],r,c,'canvas clips',bb,px,py)
   cel=Image.new('RGBA',(size,size));cel.paste(resized,(px,py));sheet.paste(cel,(c*size,r*size))
   tag=rec['groups'][r];name=f'{tag}_{rec["columns"][c]}'
   frames[name]={'frame':{'x':c*size,'y':r*size,'w':size,'h':size},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':size,'h':size},'sourceSize':{'w':size,'h':size},'duration':rec.get('durationMs',100)}
   measured.append({'name':name,'sourceRect':rect,'opaqueBounds':bbox,'sourceAnchor':anchor,'exportOffset':[px,py],'sha256':hashlib.sha256(cel.tobytes()).hexdigest()})
  cid=rec['id']; png=OUT/(cid+'.png');atlas=OUT/(cid+'.json');sheet.save(png)
  atlas.write_text(json.dumps({'frames':frames,'meta':{'image':png.name,'size':{'w':sheet.width,'h':sheet.height}}},indent=2)+'\n',encoding='utf-8',newline='\n')
  assets.append({k:v for k,v in rec.items() if k not in ['prompt','started','finished']}|{'source':src.relative_to(ROOT).as_posix(),'sourceSha256':sha(src),'sourceDimensions':list(raw.size),'sheet':png.relative_to(ROOT).as_posix(),'atlas':atlas.relative_to(ROOT).as_posix(),'sheetSha256':sha(png),'atlasSha256':sha(atlas),'scale':factor,'origin':[.5,.8] if rec['kind']=='character' else [.5,.65],'frames':measured,'status':'prototype_pending_director_review','runtimeIntegrated':False})
  print(cid,len(frames),'frames',raw.size,'=>',sheet.size,'scale',round(factor,4))
 (OUT/'manifest.json').write_text(json.dumps({'status':'prototype_pending_director_review','runtimeIntegrated':False,'assets':assets},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
if __name__=='__main__':export()
