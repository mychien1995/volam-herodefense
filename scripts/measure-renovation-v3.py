"""Read/measure only. Aseprite performs every raster edit/export."""
import json,statistics
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v3'
jobs=json.loads((src/'generation-jobs.json').read_text('utf8'))['jobs'];actors={a['id']:a for a in json.loads((src/'actors.json').read_text('utf8'))};plan={}
for job in jobs:
    if job['kind']!='body':continue
    path=src/'raw'/(job['id']+'.png')
    if not path.exists():continue
    try:im=Image.open(path).convert('RGBA');im.load()
    except OSError:continue
    w,h=im.size;cels=[];alpha=np.asarray(im.getchannel('A'))
    # Label connected alpha runs. AI sheets can stagger figures across nominal
    # grid lines while leaving each actual figure fully isolated.
    parents=[];runs=[];previous=[]
    def find(i):
        while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
        return i
    for yy,rowmask in enumerate(alpha>=96):
        edges=np.diff(np.r_[False,rowmask,False].astype(np.int8));starts=np.nonzero(edges==1)[0];ends=np.nonzero(edges==-1)[0];current=[];pi=0
        for x0,x1 in zip(starts,ends):
            label=len(parents);parents.append(label)
            while pi<len(previous) and previous[pi][1]<=x0:pi+=1
            k=pi
            while k<len(previous) and previous[k][0]<x1:
                parents[find(label)]=find(previous[k][2]);k+=1
            current.append((int(x0),int(x1),label));runs.append((yy,int(x0),int(x1),label))
        previous=current
    components={}
    for yy,x0,x1,label in runs:
        k=find(label)
        if k not in components:components[k]=[x0,yy,x1,yy+1,0]
        b=components[k];b[0]=min(b[0],x0);b[1]=min(b[1],yy);b[2]=max(b[2],x1);b[3]=max(b[3],yy+1);b[4]+=x1-x0
    figures=sorted(components.values(),key=lambda b:b[4],reverse=True)[:16]
    assert len(figures)==16 and min(b[4] for b in figures)>500,(job['id'],'not sixteen isolated figures')
    figures.sort(key=lambda b:(b[1]+b[3])/2)
    ordered=[]
    for r in range(4):ordered+=sorted(figures[r*4:r*4+4],key=lambda b:(b[0]+b[2])/2)
    centres=[((b[0]+b[2])/2,(b[1]+b[3])/2) for b in ordered]
    for b in components.values():
        if b in figures or b[4]<5:continue
        cx,cy=(b[0]+b[2])/2,(b[1]+b[3])/2
        i=min(range(16),key=lambda n:((cx-centres[n][0])/w)**2+((cy-centres[n][1])/h)**2)
        if abs(cx-centres[i][0])<w/6 and abs(cy-centres[i][1])<h/6:
            t=ordered[i];t[0]=min(t[0],b[0]);t[1]=min(t[1],b[1]);t[2]=max(t[2],b[2]);t[3]=max(t[3],b[3])
    for row,direction in enumerate(['down','left','right','up']):
        boxes=ordered[row*4:row*4+4];baseline=statistics.median(b[3] for b in boxes)
        for col,b in enumerate(boxes):
            assert b[0]>0 and b[1]>0 and b[2]<w and b[3]<h,(job['id'],row,col,'source figure clipped at outer image edge')
            x,y,x1,y1=max(0,b[0]-4),max(0,b[1]-4),min(w,b[2]+4),min(h,b[3]+4)
            lo=max(y,min(y1-1,round(baseline)-18));hi=min(y1,round(baseline)+3);fy,fx=np.nonzero(alpha[lo:hi,x:x1]>=128)
            feetx=x+(float(np.percentile(fx,3))+float(np.percentile(fx,97))+1)/2 if len(fx)>2 else (b[0]+b[2])/2
            cels.append({'direction':direction,'index':col,'cell':[x,y,x1-x,y1-y],'bounds':[b[0]-x,b[1]-y,b[2]-x,b[3]-y],'feet':[feetx-x,baseline-y]})
    heights=[c['feet'][1]-c['bounds'][1] for c in cels]
    plan[job['id']]={'actor':job['actor'],'scale':actors[job['actor']]['height']/statistics.median(heights),'height':actors[job['actor']]['height'],'cels':cels}
(src/'body-layout.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf8');print('V3 measured bodies',len(plan))
