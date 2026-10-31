"""Inspect source alpha components; never draws or modifies raster artwork."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
folder=Path(__file__).resolve().parent
records={}
for path in sorted((folder/'generated').glob('*.png')):
    if 'rejected' in path.name: continue
    a=np.asarray(Image.open(path).convert('RGBA'))[:,:,3]>=220
    parents=[]; runs=[]; prev=[]
    def find(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]];i=parents[i]
        return i
    for y,row in enumerate(a):
        changes=np.flatnonzero(np.diff(np.r_[False,row,False].astype(np.int8)))
        current=[]
        j=0
        for x0,x1 in zip(changes[::2],changes[1::2]):
            n=len(parents);parents.append(n)
            while j<len(prev) and prev[j][1]<x0-1:j+=1
            k=j
            while k<len(prev) and prev[k][0]<=x1:
                parents[find(n)]=find(prev[k][2]);k+=1
            current.append((int(x0),int(x1),n));runs.append((y,int(x0),int(x1),n))
        prev=current
    groups={}
    for y,x0,x1,n in runs:groups.setdefault(find(n),[]).append([y,x0,x1])
    large=[r for r in groups.values() if sum(b-a for _,a,b in r)>1500]
    large.sort(key=lambda r:(min(v[0] for v in r)//390,min(v[1] for v in r)))
    # Sort by two rows using vertical center; raised weapons may cross the nominal row break.
    large.sort(key=lambda r:sum(v[0]*(v[2]-v[1]) for v in r)/sum(v[2]-v[1] for v in r))
    rows=[sorted(large[:5],key=lambda r:min(v[1] for v in r)),sorted(large[5:],key=lambda r:min(v[1] for v in r))]
    entries=[]
    for rs in rows:
        for r in rs:
            x0=min(v[1] for v in r);x1=max(v[2] for v in r);y0=min(v[0] for v in r);y1=max(v[0] for v in r)+1
            low=[v for v in r if v[0]>=y1-12]
            feet=(min(v[1] for v in low)+max(v[2] for v in low))/2
            entries.append({'bounds':[x0,y0,x1,y1],'foot':[round(feet),y1],'runs':r})
    records[path.stem]={'source':path.relative_to(folder).as_posix(),'size':[a.shape[1],a.shape[0]],'alphaThreshold':220,'components':len(large),'frames':entries}
    print(path.stem,len(large),[(v['bounds'],v['foot']) for v in entries])
(folder/'source_components_v01.json').write_text(json.dumps(records,separators=(',',':'))+'\n',encoding='utf-8')
