from config_api import *
from PIL import Image
import numpy as np,sys
def components(mask):
 parents=[];runs=[];prev=[]
 def find(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 for y,row in enumerate(mask):
  changes=np.flatnonzero(np.diff(np.r_[False,row,False].astype(np.int8)));current=[];j=0
  for x0,x1 in zip(changes[::2],changes[1::2]):
   n=len(parents);parents.append(n)
   while j<len(prev) and prev[j][1]<x0-1:j+=1
   k=j
   while k<len(prev) and prev[k][0]<=x1:parents[find(n)]=find(prev[k][2]);k+=1
   current.append((int(x0),int(x1),n));runs.append((y,int(x0),int(x1),n))
  prev=current
 groups={}
 for y,x0,x1,n in runs:groups.setdefault(find(n),[]).append([y,x0,x1])
 result=[]
 for z in groups.values():
  area=sum(r-l for y,l,r in z)
  result.append({'area':area,'x':sum((l+r)/2*(r-l) for y,l,r in z)/area,'y':sum(y*(r-l) for y,l,r in z)/area,'bounds':[min(l for y,l,r in z),min(y for y,l,r in z),max(r for y,l,r in z),max(y for y,l,r in z)+1],'runs':z})
 return sorted(result,key=lambda c:-c['area'])
if __name__=='__main__':
 p=Path(sys.argv[1]);a=np.asarray(Image.open(p));cs=components(a[:,:,3]>=220)
 for c in cs[:40]:print(c['area'],round(c['x']),round(c['y']),c['bounds'])
