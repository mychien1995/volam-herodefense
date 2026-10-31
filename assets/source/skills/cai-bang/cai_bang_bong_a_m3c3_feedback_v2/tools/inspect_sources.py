"""Inspect new original pose PNGs and measure frame placements; no art pixels are drawn here."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[6]
FOLDER=Path(__file__).resolve().parents[1]
records={}
for key in ['character_right_v02','character_down_v01','character_up_v01','character_right_thrust_fix_v03']:
 p=FOLDER/'generated'/(key+'.png'); pixels=np.asarray(Image.open(p).convert('RGBA')); a=pixels[:,:,3]>=220
 parents=[]; runs=[]; prev=[]
 def find(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 for y,row in enumerate(a):
  changes=np.flatnonzero(np.diff(np.r_[False,row,False].astype(np.int8))); current=[]; j=0
  for x0,x1 in zip(changes[::2],changes[1::2]):
   n=len(parents);parents.append(n)
   while j<len(prev) and prev[j][1]<x0-1:j+=1
   k=j
   while k<len(prev) and prev[k][0]<=x1:parents[find(n)]=find(prev[k][2]);k+=1
   current.append((int(x0),int(x1),n));runs.append((y,int(x0),int(x1),n))
  prev=current
 groups={}
 for y,x0,x1,n in runs:groups.setdefault(find(n),[]).append([y,x0,x1])
 large=[z for z in groups.values() if sum(b-a for _,a,b in z)>1800]
 def centroid(z):return sum(y*(b-a) for y,a,b in z)/sum(b-a for _,a,b in z)
 large.sort(key=centroid)
 expected=6 if 'thrust_fix' in key else 24
 assert len(large)==expected,(key,len(large))
 ordered=[]
 for row in range(expected//6):ordered+=sorted(large[row*6:row*6+6],key=lambda z:min(a for _,a,b in z))
 entries=[]
 for index,z in enumerate(ordered):
  x0=min(a for _,a,b in z);x1=max(b for _,a,b in z);y0=min(y for y,a,b in z);y1=max(y for y,a,b in z)+1
  # Boots require broad combined dark runs; a thin staff tip cannot become the foot anchor.
  red=[]
  for y,a,b in z:
   q=pixels[y,a:b,:3].astype(int); hit=(q[:,0]>70)&(q[:,1]<q[:,0]*0.36)&(q[:,2]<q[:,0]*0.36)
   red.extend((a+np.flatnonzero(hit)).tolist())
  center=float(np.median(red)); low=[]; rowsums={}
  for y,a,b in z:
   if y<y1-(y1-y0)*0.31:continue
   q=pixels[y,a:b,:3]; xs=np.arange(a,b)
   dark=(q.max(axis=1)<125)&(xs>center-105)&(xs<center+105)
   changes=np.flatnonzero(np.diff(np.r_[False,dark,False].astype(np.int8)))
   for c,e in zip(changes[::2],changes[1::2]):
    if e-c>=8:
     low.append([y,a+int(c),a+int(e)]);rowsums[y]=rowsums.get(y,0)+int(e-c)
  broad=[y for y,total in rowsums.items() if total>=27]
  assert broad,(key,index)
  fy=max(broad)+1
  shoe=[(y,a,b) for y,a,b in low if fy-23<=y<fy]
  fx=round((min(a for y,a,b in shoe)+max(b for y,a,b in shoe))/2)
  entries.append({'bounds':[x0,y0,x1,y1],'sourceFoot':[fx,fy],'runs':z})
 # Explicit visual overrides exclude down-facing diagonal staff from shoe anchors.
 if key=='character_down_v01':
  for index,foot in {1:[389,242],4:[1164,242],5:[1424,242],6:[124,475],7:[389,475]}.items():entries[index]['sourceFoot']=foot
 # Guard-height reference uses unraised first/second thrust poses; not weapon bbox.
 refs=[0,1,4,5] if key in ['character_right_v02','character_right_thrust_fix_v03'] else [0]
 height=float(np.mean([entries[i]['sourceFoot'][1]-entries[i]['bounds'][1] for i in refs]))
 scale=44/height
 records[key]={'source':'generated/'+key+'.png','size':[pixels.shape[1],pixels.shape[0]],'alphaThreshold':220,'scale':round(scale,8),'bodyHeightReferenceSourcePx':height,'frames':entries}
 print(key,'scale',round(scale,5),'height',height,'feet',[(e['sourceFoot'],e['bounds']) for e in entries])
(FOLDER/'source_components.json').write_text(json.dumps(records,separators=(',',':')),encoding='utf-8')
# Fixed source scale per facing; never fit each cel to a box.
frames=[]; durations=[40,40,40,50,70,60]; beats=['thrust','sweep','rising','overhead']; phases=['anticipation','anticipation','contact','follow_through','recovery','handoff']
for direction,key,mirror in [('down','character_down_v01',False),('left','character_right_v02',True),('right','character_right_v02',False),('up','character_up_v01',False)]:
 for beat,name in enumerate(beats):
  for frame in range(6):
   # Last cel explicitly matches next attack anticipation, producing a zero-pop handoff.
   component=beat*6+frame if frame<5 else ((beat+1)%4)*6
   if direction=='up' and beat==3 and 2<=frame<=4:component={2:21,3:22,4:23}[frame]
   actual='character_right_thrust_fix_v03' if direction in ['left','right'] and component<6 else key
   e=records[actual]['frames'][component]
   frames.append({'name':f'combo_{name}_{direction}_{frame}','beat':name,'beatIndex':beat,'direction':direction,'frameInBeat':frame,'source':actual,'component':component,'scale':records[actual]['scale'],'sourceFoot':e['sourceFoot'],'mirror':mirror,'durationMs':durations[frame],'phase':phases[frame],'handoffTo':beats[(beat+1)%4] if frame==5 else None})
layout={'characterCanvas':[112,100],'characterPivot':[56,80],'characterOrigin':[0.5,0.8],'bodyHeightLogicalPxApprox':44,'alphaThreshold':220,'frames':frames,'note':'80 selected source poses incl mirrored left; 16 explicit handoff duplicate cels. No concept pixels or procedural character drawing.'}
(FOLDER/'frame_layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
# Baseline palette coordinates; pure source-color recoloring for coherence, no geometry.
baseline=np.asarray(Image.open(ROOT/'assets/exports/characters/hero_cai_bang.png').convert('RGBA'))
foreground=baseline[baseline[:,:,3]>=220,:3]
# Median-cut keeps robe reds and skin hues; selecting the192 most repeated RGBs lost them.
quant=Image.fromarray(foreground.reshape(1,-1,3)).quantize(colors=192,method=Image.Quantize.MEDIANCUT)
palette=np.asarray(quant.getpalette(),dtype=np.int32).reshape(-1,3)[:192]
colors=[]
for key in records:
 arr=np.asarray(Image.open(FOLDER/records[key]['source']).convert('RGBA')); colors.extend(np.unique(arr[arr[:,:,3]>=220,:3],axis=0).tolist())
colors=np.unique(np.asarray(colors,dtype=np.int32),axis=0); mapping={}
for chunk in np.array_split(colors,max(1,len(colors)//300)):
 dist=((chunk[:,None,:]-palette[None,:,:])**2).sum(axis=2); chosen=palette[dist.argmin(axis=1)]
 for old,new in zip(chunk,chosen):mapping[str(int(old[0]+old[1]*256+old[2]*65536))]=new.tolist()
(FOLDER/'palette_mapping.json').write_text(json.dumps({'source':'assets/exports/characters/hero_cai_bang.png','paletteColorCount':len(palette),'mapping':mapping},separators=(',',':')),encoding='utf-8')
print('Planned cels',len(frames),'baseline palette colors',len(palette))
