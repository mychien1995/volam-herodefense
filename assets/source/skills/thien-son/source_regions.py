"""Read-only raster-region analysis. No artwork is painted or exported here."""
import numpy as np

def four_regions(mask,left,right):
 data=np.asarray(mask)[:,left:right]>0
 parent=[];runs=[];previous=[]
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def join(a,b):
  a,b=find(a),find(b)
  if a!=b:parent[b]=a
 for y,row in enumerate(data):
  edges=np.flatnonzero(np.diff(np.r_[False,row,False].astype(np.int8)))
  current=[]
  for start,end in zip(edges[::2],edges[1::2]):
   start,end=int(start),int(end);idx=len(runs);parent.append(idx);runs.append((y,start,end));current.append(idx)
   for old in previous:
    _,ps,pe=runs[old]
    if ps<=end and pe>=start:join(idx,old)
  previous=current
 groups={}
 for i,run in enumerate(runs):groups.setdefault(find(i),[]).append(run)
 objects=[]
 for root,items in groups.items():
  n=sum(e-s for _,s,e in items)
  objects.append({'root':root,'runs':items,'n':n,'bbox':(min(s for _,s,_ in items),min(y for y,_,_ in items),max(e for _,_,e in items),max(y for y,_,_ in items)+1),'cy':sum(y*(e-s) for y,s,e in items)/n})
 main=sorted(objects,key=lambda x:x['n'],reverse=True)[:4]
 assert len(main)==4 and min(x['n'] for x in main)>1500,('Need four complete principal cels',[(x['n'],x['bbox']) for x in main])
 assert max(x['n'] for x in main)<min(x['n'] for x in main)*4,('Potential connected/overlapping actors',[(x['n'],x['bbox']) for x in main])
 main.sort(key=lambda x:x['cy'])
 bins=[[] for _ in main]
 ids={x['root']:i for i,x in enumerate(main)}
 for obj in objects:
  if obj['root'] in ids:i=ids[obj['root']]
  else:
   a=obj['bbox']
   def distance(pr):
    b=pr['bbox'];dx=max(b[0]-a[2],a[0]-b[2],0);dy=max(b[1]-a[3],a[1]-b[3],0)
    return dx*dx+dy*dy+abs(obj['cy']-pr['cy'])*.01
   i=min(range(4),key=lambda i:distance(main[i]))
  bins[i]+=obj['runs']
 output=[]
 for items in bins:
  x0=min(s for _,s,_ in items);x1=max(e for _,_,e in items);y0=min(y for y,_,_ in items);y1=max(y for y,_,_ in items)+1
  output.append({'rect':[left+x0,y0,x1-x0,y1-y0],'runs':[[y-y0,s-x0,e-s] for y,s,e in items]})
 return output

