"""Export original eight-facing body poses; retain R5 locomotion and legacy cardinal actions."""
from pathlib import Path
import json, hashlib, statistics, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/hero-finish-v1'; OUT=ROOT/'assets/exports/hero-finish-v1';OUT.mkdir(parents=True,exist_ok=True)
actors=json.loads((ROOT/'assets/source/hero-motion-v1/actors.json').read_text())
DIRS=['down','down_right','right','up_right','up','up_left','left','down_left']
POSES=['inhale','exhale','windup','strike','alternate','charge','release','recover']
def bands(sheet):
 active=np.count_nonzero(np.asarray(sheet)[:,:,3]>=24,axis=1)>3
 gaps=[];start=None
 for y,v in enumerate(active):
  if not v and start is None:start=y
  if v and start is not None:
   if y-start>=1 and start>0:gaps.append((start,y))
   start=None
 # Ignore tiny gaps within the figure; select the seven longest internal gutters.
 gaps=sorted(sorted(gaps,key=lambda x:x[1]-x[0],reverse=True)[:7])
 bounds=[0]+[round((a+b)/2) for a,b in gaps]+[sheet.height]
 if len(bounds)!=9:raise ValueError('Expected eight complete rows')
 return bounds
records=[];contact=Image.new('RGBA',(8*168,14*155),(38,43,34,255));draw=ImageDraw.Draw(contact)
for actor in actors:
 basic=actor['basic'];raw=SRC/'raw'/(basic+'.png')
 if not raw.exists():continue
 sheet=Image.open(raw).convert('RGBA');sheet.putalpha(sheet.getchannel('A').point(lambda a:0 if a<4 else a));bounds=bands(sheet);cw=sheet.width/8
 cels=[];columnBounds=[]
 for row in range(8):
  band=sheet.crop((0,bounds[row],sheet.width,bounds[row+1]));occupied=(np.asarray(band)[:,:,3]>=24).any(axis=0);xb=[0]
  for col in range(1,8):
   lo=round(cw*(col-.27));hi=round(cw*(col+.27));clear=np.flatnonzero(~occupied[lo:hi])+lo
   if not len(clear):raise ValueError(f'Overlapping source figures {basic}/{row}/{col}')
   xb.append(int(min(clear,key=lambda x:abs(x-cw*col))))
  xb.append(sheet.width);columnBounds.append(xb)
  for col in range(8):
   cel=sheet.crop((xb[col],bounds[row],xb[col+1],bounds[row+1]));alpha=np.asarray(cel)[:,:,3];mask=alpha>=24
   ys,xs=np.nonzero(mask)
   if len(xs)<100:raise ValueError(f'Empty cel {basic}/{row}/{col}')
   box=(max(0,int(xs.min())-2),max(0,int(ys.min())-2),min(cel.width,int(xs.max())+3),min(cel.height,int(ys.max())+3))
   # Preserve every visible source pixel; reject sources which touch a cell border.
   if mask[0].any() or mask[:,0].any() or (row==7 and mask[-1].any()) or (col==7 and mask[:,-1].any()):raise ValueError(f'Source border touches {basic}/{row}/{col}')
   # Remove low-alpha generator haze only outside a three-pixel contour guard.
   guard=Image.fromarray((mask.astype('uint8')*255)).filter(ImageFilter.MaxFilter(7));rgba=np.array(cel);rgba[:,:,3][np.asarray(guard)==0]=0;cel=Image.fromarray(rgba)
   cels.append((cel,box))
 neutral=statistics.median(b[3]-b[1] for i,(_,b) in enumerate(cels) if i%8 in (0,1));ratio=min(actor['bodyPixels'][1],120)/neutral
 width,height=192,176;feet=(96,158);out=Image.new('RGBA',(width*8,height*8));frames={};hashes=[]
 for i,(cel,box) in enumerate(cels):
  row,col=divmod(i,8);crop=cel.crop(box);crop=crop.resize((max(1,round(crop.width*ratio)),max(1,round(crop.height*ratio))),Image.Resampling.LANCZOS)
  if crop.width>width-8 or crop.height>height-12:raise ValueError(f'Output clip {basic}/{row}/{col}')
  tile=Image.new('RGBA',(width,height));x=round(feet[0]+(box[0]+columnBounds[row][col]-(col+.5)*cw)*ratio);y=feet[1]-crop.height
  if x<2 or x+crop.width>width-2:raise ValueError(f'Horizontal clip {basic}/{row}/{col}')
  tile.alpha_composite(crop,(x,y));out.alpha_composite(tile,(col*width,row*height));hashes.append(hashlib.sha256(tile.tobytes()).hexdigest())
  frames[f'{POSES[col]}_{DIRS[row]}']={'frame':{'x':col*width,'y':row*height,'w':width,'h':height},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':width,'h':height},'sourceSize':{'w':width,'h':height}}
  if row==1:
   thumb=tile.copy();thumb.thumbnail((160,136));contact.alpha_composite(thumb,(col*168,len(records)*155));draw.text((col*168+2,len(records)*155+136),basic[:21],fill='white')
 for row in range(8):
  if len(set(hashes[row*8:row*8+8]))<8:raise ValueError('Duplicate pose '+basic)
 override=SRC/'idle-overrides'/(basic+'.png')
 if override.exists():
  extra=Image.open(override).convert('RGBA');extra.putalpha(extra.getchannel('A').point(lambda v:0 if v<4 else v));eb=bands(extra);ecw=extra.width/2;ecels=[]
  for row in range(8):
   for col in range(2):
    cel=extra.crop((round(col*ecw),eb[row],round((col+1)*ecw),eb[row+1]));mask=np.asarray(cel)[:,:,3]>=24;ys,xs=np.nonzero(mask);assert len(xs)>100
    if mask[0].any() or mask[:,0].any() or mask[:,-1].any() or (row==7 and mask[-1].any()):raise ValueError('Override clips '+basic+str((row,col)))
    box=(max(0,int(xs.min())-2),max(0,int(ys.min())-2),min(cel.width,int(xs.max())+3),min(cel.height,int(ys.max())+3));guard=Image.fromarray(mask.astype('uint8')*255).filter(ImageFilter.MaxFilter(7));rgba=np.array(cel);rgba[:,:,3][np.asarray(guard)==0]=0;cel=Image.fromarray(rgba);ecels.append((cel,box))
  eratio=min(actor['bodyPixels'][1],120)/statistics.median(b[3]-b[1] for _,b in ecels)
  originalPath=ROOT/'assets/exports/hero-motion-v1'/basic;old=Image.open(originalPath.with_suffix('.png')).convert('RGBA');oldFrames=json.loads(originalPath.with_suffix('.json').read_text())['frames']
  for i,(cel,box) in enumerate(ecels):
   row,col=divmod(i,2);mask=np.asarray(cel)[:,:,3]>=24;cut=max(0,box[3]-round((box[3]-box[1])*.15));yy,xx=np.nonzero(mask[cut:]);anchor=float(np.mean(xx))
   of=oldFrames['idle_'+DIRS[row]+'_0']['frame'];ot=old.crop((of['x'],of['y'],of['x']+of['w'],of['y']+of['h']));om=np.asarray(ot)[:,:,3]>=24;ob=ot.getbbox();oy,ox=np.nonzero(om[max(0,ob[3]-round((ob[3]-ob[1])*.15)):]);oldOffset=float(np.mean(ox))-64
   crop=cel.crop(box);crop=crop.resize((round(crop.width*eratio),round(crop.height*eratio)),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(width,height));x=round(feet[0]+oldOffset+(box[0]-anchor)*eratio);y=feet[1]-crop.height;assert x>=2 and x+crop.width<=width-2;tile.alpha_composite(crop,(x,y));out.paste(tile,(col*width,row*height));hashes[row*8+col]=hashlib.sha256(tile.tobytes()).hexdigest()
 for direction in DIRS:
  frames['idle_'+direction+'_0']=frames['inhale_'+direction];frames['idle_'+direction+'_1']=frames['exhale_'+direction]
 for col in range(8):
  tile=out.crop((col*width,height,(col+1)*width,2*height));tile.thumbnail((160,136));contact.paste((38,43,34,255),(col*168,len(records)*155,col*168+168,len(records)*155+136));contact.alpha_composite(tile,(col*168,len(records)*155))
 out.save(OUT/(basic+'.png'));(OUT/(basic+'.json')).write_text(json.dumps({'frames':frames,'meta':{'image':basic+'.png','size':{'w':out.width,'h':out.height},'scale':'1'}},indent=2))
 records.append({'basic':basic,'sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'idleOverrideSha256':hashlib.sha256(override.read_bytes()).hexdigest() if override.exists() else None,'alphaCleanup':'alpha<4 removed; preserve partial contour alpha within 3px of visible silhouette, discard isolated haze outside', 'sourceSize':list(sheet.size),'rowBounds':bounds,'columnBounds':columnBounds,'editableSha256':hashlib.sha256((SRC/'editable'/(basic+'.aseprite')).read_bytes()).hexdigest() if (SRC/'editable'/(basic+'.aseprite')).exists() else None,'frames':64,'distinct':len(set(hashes)),'scale':.5,'pivot':[.5,158/176],'poses':POSES,'directions':DIRS})
manifest={'status':'prototype - director review pending','source':'Built-in imagegen; identity from retained R5 original artwork','policy':'Existing VFX and cardinal action choreography retained; new diagonal body poses share action families. Idle uses two additional authored breathing poses. No animation-driven damage.','actors':records}
(SRC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'validation.json').write_text(json.dumps({'status':'PASS','actors':len(records),'frames':sum(r['frames'] for r in records),'visibleSourceBorders':'clear','outputBorders':'clear','uniquePoseHashes':'all distinct per actor'},indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'actors':[{k:a[k] for k in ['basic','pivot','scale']} for a in records]},indent=2)+'\n');contact.crop((0,0,contact.width,max(155,len(records)*155))).save(SRC/'action-contact.png')
shutil.copytree(OUT,ROOT/'apps/game-client/public/assets/hero-finish-v1',dirs_exist_ok=True)
print(f'Exported {len(records)} actors, {len(records)*64} authored cels')
