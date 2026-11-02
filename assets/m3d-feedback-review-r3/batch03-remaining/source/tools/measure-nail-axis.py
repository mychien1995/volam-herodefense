"""Measure the existing steel needle axis. Does not edit or export raster art."""
from pathlib import Path
import json,hashlib,math,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[5];BASE=ROOT/'assets/m3d-feedback-review-r3/batch03-remaining'
if (BASE/'approved_review6.lock.json').exists():raise SystemExit('Review6 axis metadata is approved and locked; create a new revision instead of overwriting it.')
def read(p):return json.loads(p.read_text('utf-8'))
c=next(c for c in read(BASE/'manifest.json')['components'] if c['id']=='hoac_do_fx')
im=Image.open(ROOT/c['sheet']).convert('RGBA');atlas=read(ROOT/c['atlas'])['frames'];frames={}
for name in ['nail_0','nail_1','nail_2','nail_3']:
    f=atlas[name]['frame'];pix=np.asarray(im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])))
    r,g,b,a=[pix[:,:,i].astype(float) for i in range(4)]
    mask=(a>=220)&(r>=55)&(b>=55)&(g<np.maximum(r,b)*1.65)
    y,x=np.where(mask);xy=np.column_stack([x,y]);assert len(x)>80,name
    vals,vec=np.linalg.eigh(np.cov(xy.T));axis=vec[:,-1]
    # Inspected raster has its sharp tip down/right and its trailing tail up/left.
    if axis[1]<0:axis=-axis
    angle=math.atan2(axis[1],axis[0]);assert vals[-1]/vals[0]>10 and axis[0]>0,name
    frames[name]=dict(pivot=xy.mean(0).tolist(),sourceTipDirection=axis.tolist(),sourceAngleRadians=angle,sourceAngleDegrees=math.degrees(angle),rotationOffsetRadians=-angle,steelPixels=len(x),axisVarianceRatio=float(vals[-1]/vals[0]))
result=dict(revision='review6',sourceSheet=c['sheet'],sourceSha256=hashlib.sha256((ROOT/c['sheet']).read_bytes()).hexdigest(),method='Alpha>=220 steel mask: R/B>=55, G<1.65*max(R,B); PCA long axis, inspected pointed end down-right. Per-frame centre and angle only; no source pixel edits.',frames=frames)
(BASE/'source/review6-nail-axis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf-8')
module='// Measured existing raster, not new art. Reproduce with source/tools/measure-nail-axis.py.\nexport const nailAxis='+json.dumps(frames,separators=(',',':'))+';\n'
(BASE/'nail-axis.js').write_text(module,'utf-8')
print(json.dumps({k:round(v['sourceAngleDegrees'],2) for k,v in frames.items()}))
