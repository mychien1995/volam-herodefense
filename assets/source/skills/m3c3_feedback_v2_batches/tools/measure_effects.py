"""Find real alpha gutters in new source sheets; never assume the generator obeyed exact grid."""
from config_api import *
from PIL import Image
import numpy as np
from raster_components import components
def cuts(projection,count):
 n=len(projection);unit=n/count;out=[0]
 s=np.convolve(projection.astype(float),np.ones(3)/3,mode='same')
 for i in range(1,count):
  lo=max(out[-1]+int(unit*.40),round((i-.5)*unit));hi=min(n-round((count-i)*unit*.40),round((i+.5)*unit))
  xs=np.arange(lo,hi);score=s[lo:hi]+np.abs(xs-i*unit)*.025
  out.append(int(xs[np.argmin(score)]))
 return out+[n]
def measure(batch,source,rows,cols):
 p=BASE/batch/'generated'/(source+'.png');a=np.asarray(Image.open(p).convert('RGBA'));mask=a[:,:,3]>=220;H,W=mask.shape
 yy=cuts(mask.sum(1),rows);entries=[]
 for row in range(rows):
  y0,y1=yy[row:row+2];xx=cuts(mask[y0:y1].sum(0),cols)
  for col in range(cols):
   x0,x1=xx[col:col+2];sub=mask[y0:y1,x0:x1];ys,xs=np.where(sub)
   bx0,bx1=(int(xs.min()),int(xs.max()+1)) if len(xs) else (0,x1-x0)
   by0,by1=(int(ys.min()),int(ys.max()+1)) if len(ys) else (0,y1-y0)
   entries.append({'row':row,'col':col,'rect':[x0,y0,x1-x0,y1-y0],'bbox':[bx0+x0,by0+y0,bx1+x0,by1+y0],'anchor':[(bx0+bx1)/2,(by0+by1)/2],'gutterOpaquePixels':int(sub[:,0].sum()+sub[:,-1].sum()+sub[0].sum()+sub[-1].sum())})
 # Some strokes overlap in X but remain disjoint in Y. Preserve each complete connected
 # raster stroke rather than slicing it at a rectangular cell boundary.
 assigned=[[] for _ in entries]
 for c in components(mask):
  if c['area']<3:continue
  row=min(range(rows),key=lambda r:abs(c['y']-(yy[r]+yy[r+1])/2))
  candidates=entries[row*cols:(row+1)*cols]
  col=min(range(cols),key=lambda k:abs(c['x']-(candidates[k]['rect'][0]+candidates[k]['anchor'][0])))
  assigned[row*cols+col].extend(c['runs'])
 for e,z in zip(entries,assigned):
  if not z:e['empty']=True;continue
  l=min(x0 for y,x0,x1 in z);r=max(x1 for y,x0,x1 in z);t=min(y for y,x0,x1 in z);bot=max(y for y,x0,x1 in z)+1
  e['rect']=[l,t,r-l,bot-t];e['anchor']=[(r-l)/2,(bot-t)/2];e['runs']=z;e['gutterOpaquePixels']=0
 path=BASE/batch/'effect_measurements.json';j=load(path) if path.exists() else {};j[source]={'method':'adaptive alpha gutters then whole connected-stroke assignment; fixed source scale, no per-cel fitting; isolated noise<3px removed','rows':rows,'cols':cols,'frames':entries}
 path.write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf-8')
 print(source,'row gutters',yy,'edge counts',[e['gutterOpaquePixels'] for e in entries])
