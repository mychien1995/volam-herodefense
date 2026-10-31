"""Measure isolated authored character cels, not generate artwork. Fixed scale per source."""
from config_api import *
from PIL import Image
import numpy as np,sys
from raster_components import components
def measure(batch,source,rows,cols,height=44):
 p=BASE/batch/'generated'/(source+'.png');a=np.asarray(Image.open(p).convert('RGBA'));H,W=a.shape[:2];frames=[]
 groups=components(a[:,:,3]>=220);large=sorted(groups[:rows*cols],key=lambda c:c['y']);ordered=[]
 assert len(large)==rows*cols and min(c['area'] for c in large)>500,(source,'missing whole character')
 for row in range(rows):ordered+=sorted(large[row*cols:(row+1)*cols],key=lambda c:c['x'])
 # Preserve separate white hair ribbons/fan pieces with their own hero, never a rectangular neighbor fragment.
 if batch!='04_thieu_lam':
  selected={id(c) for c in ordered}
  for c in groups:
   if id(c) in selected or c['area']<3:continue
   target=min(ordered,key=lambda core:((core['x']-c['x'])/(W/cols))**2+((core['y']-c['y'])/(H/rows))**2)
   target['runs'].extend(c['runs'])
  for c in ordered:
   z=c['runs'];c['bounds']=[min(l for y,l,r in z),min(y for y,l,r in z),max(r for y,l,r in z),max(y for y,l,r in z)+1]
 for row in range(rows):
  for col in range(cols):
   core=ordered[row*cols+col];x0,y0,x1,y1=core['bounds']
   sub=a[y0:y1,x0:x1];mask=np.zeros(sub.shape[:2],dtype=bool)
   for yy,l,r in core['runs']:mask[yy-y0,l-x0:r-x0]=True
   ys,xs=np.where(mask);assert len(xs)>100,(source,row,col)
   bx0,bx1=int(xs.min()),int(xs.max()+1);by0,by1=int(ys.min()),int(ys.max()+1)
   # Dark shoe clusters in bottom 14%; their full span anchors both planted feet.
   dark=mask & (sub[:,:,:3].max(axis=2)<150)
   footrows=[]
   for yy in range(max(by0,int(by1-(by1-by0)*.14)),by1):
    xx=np.where(dark[yy])[0]
    if len(xx)>=max(5,(bx1-bx0)*.07):footrows.append((yy,xx))
   if footrows:
    yy,xx=footrows[-1];bottom=yy+1
    q=np.where(dark[max(by0,bottom-10):bottom])[1];fx=(int(q.min())+int(q.max())+1)/2
   else:bottom=by1;fx=(bx0+bx1)/2
   runs=[]
   for yy in range(by0,by1):
    rowmask=mask[yy];edges=np.diff(np.r_[False,rowmask,False].astype(int));starts=np.where(edges==1)[0];ends=np.where(edges==-1)[0]
    runs.extend([[yy+y0,int(l)+x0,int(r)+x0] for l,r in zip(starts,ends)])
   frames.append({'bounds':[bx0+x0,by0+y0,bx1+x0,by1+y0],'foot':[fx+x0,bottom+y0],'runs':runs,'cell':[row,col],'bodyHeight':bottom-by0})
 # One scale for every frame in this sheet, anchored from ready pose. No per-frame fitting.
 scale=height/frames[0]['bodyHeight'];path=BASE/batch/'character_measurements.json';j=load(path) if path.exists() else {}
 if batch in ['02_thien_son','03_vo_dang'] and cols==4:
  for row in range(rows):
   fixed=height/frames[row*cols]['bodyHeight']
   for entry in frames[row*cols:(row+1)*cols]:entry['scale']=fixed
 j[source]={'source':'generated/'+source+'.png','scale':scale,'targetReadyHeight':height,'method':'whole connected character alpha>=220 row runs, no grid cuts; dark shoe baseline; fixed scale per four-frame action strip for TS/VD, per source for SL; never per-frame fitting; native feet pivot','frames':frames}
 path.write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf-8')
 print(source,'scale',round(scale,4),'heights',[round(f['bodyHeight']*scale,1) for f in frames],'foot measured')
if __name__=='__main__':measure(sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),float(sys.argv[5]) if len(sys.argv)>5 else 44)
