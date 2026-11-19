"""Export retained portraits and authored 8-facing motion; never alters locked sources."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, shutil, statistics
import numpy as np
root=Path(__file__).resolve().parent.parent
source=root/'assets/source/hero-motion-v1'
actors=json.loads((source/'actors.json').read_text())
portraits=root/'assets/exports/player-portraits-v1';portraits.mkdir(parents=True,exist_ok=True)
motion=root/'assets/exports/hero-motion-v1';motion.mkdir(parents=True,exist_ok=True)
directions=['down','down_right','right','up_right','up','up_left','left','down_left']
manifest={'status':'prototype - director review pending','artSource':'host_image + retained authored runtime sources','actors':[]}
contact=Image.new('RGBA',(1400,420),(31,37,32,255));draw=ImageDraw.Draw(contact)
for index,a in enumerate(actors):
 stem=root/a['path'];png=stem.with_suffix('.png');atlas=json.loads(stem.with_suffix('.json').read_text(encoding='utf-8-sig'));frames=atlas['frames'];frames={f['filename']:f for f in frames} if isinstance(frames,list) else frames
 f=frames[a['frame']]['frame'];original=Image.open(png).convert('RGBA');body=original.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));body=body.crop(body.getbbox())
 portraitBody=body.copy()
 record={**a,'retainedSha256':hashlib.sha256(png.read_bytes()).hexdigest(),'directions':[]}
 raw=source/'raw'/(a['basic']+'.png')
 if raw.exists():
  sheet=Image.open(raw).convert('RGBA');sheet.putalpha(sheet.getchannel('A').point(lambda x:0 if x<4 else x));cw=sheet.width/4;ch=sheet.height/8
  active=np.count_nonzero(np.asarray(sheet)[:,:,3]>=24,axis=1)>3;gaps=[];start=None
  for y,value in enumerate(active):
   if not value and start is None:start=y
   if value and start is not None:
    if y-start>=5:gaps.append((start,y))
    start=None
  if start is not None:gaps.append((start,len(active)))
  boundaries=[0]+[round((lo+hi)/2) for lo,hi in gaps if lo>0 and hi<len(active)]+[sheet.height]
  if len(boundaries)!=9:raise ValueError('Expected eight authored rows '+a['basic']+str(boundaries))
  cels=[]
  for row in range(8):
   for col in range(4):
    cel=sheet.crop((round(col*cw),boundaries[row],round((col+1)*cw),boundaries[row+1]));alpha=cel.getchannel('A');threshold=alpha.point(lambda x:255 if x>=24 else 0);bbox=threshold.getbbox()
    if not bbox:raise ValueError('Empty generated cel '+a['basic']+str((row,col)))
    bbox=(max(0,bbox[0]-2),max(0,bbox[1]-2),min(cel.width,bbox[2]+2),min(cel.height,bbox[3]+2));cels.append((cel,bbox))
  neutralHeight=statistics.median(b[3]-b[1] for i,(_,b) in enumerate(cels) if i%4==0)
  scale=min(a['bodyPixels'][1],120)/neutralHeight
  w,h=128,144;feet=(64,132);out=Image.new('RGBA',(w*4,h*8));fs={};widths=[];hashes=[]
  for i,(cel,bbox) in enumerate(cels):
   row,col=divmod(i,4);crop=cel.crop(bbox);crop=crop.resize((max(1,round(crop.width*scale)),max(1,round(crop.height*scale))),Image.Resampling.LANCZOS)
   if crop.width>w-6 or crop.height>h-8:raise ValueError('Generated weapon/body would clip '+a['basic']+str((row,col)))
   tile=Image.new('RGBA',(w,h));x=round(feet[0]+(bbox[0]-cw/2)*scale);y=feet[1]-crop.height
   if x<1 or x+crop.width>w-1:x=(w-crop.width)//2
   tile.alpha_composite(crop,(x,y));out.alpha_composite(tile,(col*w,row*h));hashes.append(hashlib.sha256(tile.tobytes()).hexdigest());widths.append(crop.width)
   frame={'frame':{'x':col*w,'y':row*h,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
   fs['walk_'+directions[row]+'_'+str(col)]=frame
   if col in (0,2):fs['idle_'+directions[row]+'_'+str(col//2)]=frame
  for row in range(8):
   fs['walk_'+directions[row]+'_2']=fs['walk_'+directions[row]+'_0']
   if hashes[row*4]==hashes[row*4+2]:raise ValueError('Identical idle cels '+a['basic']+directions[row])
   if hashes[row*4+1]==hashes[row*4+3]:raise ValueError('Identical walk strides '+a['basic']+directions[row])
  out.save(motion/(a['basic']+'.png'));(motion/(a['basic']+'.json')).write_text(json.dumps({'frames':fs,'meta':{'image':a['basic']+'.png','size':{'w':out.width,'h':out.height},'scale':'1'}},indent=2))
  record.update({'sourceRowBounds':boundaries,'alphaCleanup':'Drop alpha<4 in raw; retain partial contour alpha','walkNeutralReusesOpenEyes':True,'directions':directions,'pivot':[.5,132/144],'scale':.5,'bodyWidth':round(statistics.median(widths)),'sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'uniqueCels':len(set(hashes)),'frames':32})
  f=fs['idle_down_0']['frame'];body=out.crop((f['x'],f['y'],f['x']+w,f['y']+h));body=body.crop(body.getbbox())
 # Full-body avatars and face portraits share the same current authored figure.
 full=Image.new('RGBA',(256,256));figure=body.copy();ratio=min(224/figure.width,240/figure.height);figure=figure.resize((round(figure.width*ratio),round(figure.height*ratio)),Image.Resampling.LANCZOS);full.alpha_composite(figure,((256-figure.width)//2,248-figure.height));full.save(portraits/(a['basic']+'-body.png'))
 body=portraitBody
 boxes={'cai_bang_bong':(.24,.09,1,.64),'thien_son_phien':(.24,0,1,.65),'thien_son_dao':(.12,0,.74,.64),'vo_dang_kiem':(.18,0,1,.64),'thieu_lam_dao':(0,0,.68,.64),'con_luan_thien_su':(.14,0,1,.65)}
 b=boxes.get(a['basic'],(0,0,1,.64));portrait=body.crop((round(b[0]*body.width),round(b[1]*body.height),round(b[2]*body.width),max(1,round(b[3]*body.height))));ratio=min(150/portrait.width,170/portrait.height);portrait=portrait.resize((round(portrait.width*ratio),round(portrait.height*ratio)),Image.Resampling.LANCZOS);face=Image.new('RGBA',(160,192));face.alpha_composite(portrait,((160-portrait.width)//2,14));face.save(portraits/(a['basic']+'.png'))
 preview=face.copy();preview.thumbnail((100,120));x=index%7*200;y=index//7*210;contact.alpha_composite(preview,(x+42,y+10));draw.text((x+3,y+155),a['basic'],fill='white');manifest['actors'].append(record)
(source/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
contact.save(source/'portrait-contact.png')
(motion/'manifest.json').write_text(json.dumps({'actors':[{k:a[k] for k in ['basic','directions','pivot','scale','bodyWidth']} for a in manifest['actors'] if a['directions']]},indent=2))
for folder in [motion,portraits]:
 dest=root/'apps/game-client/public/assets'/folder.name;shutil.copytree(folder,dest,dirs_exist_ok=True)
print('Exported',len(actors),'current avatars;',sum(bool(a['directions']) for a in manifest['actors']),'8-facing motion sets')
