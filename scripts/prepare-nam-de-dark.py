"""Versioned Nam De phase-two raster registration; generated poses remain original.
Uses the retained connected-alpha extractor; never redraws concept pixels or old assets."""
from pathlib import Path
import hashlib,json,shutil,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'tools'))
from hero_unified_assets import figures
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/boss-nam-de-dark-v1'
OUT=ROOT/'assets/exports/boss-nam-de-dark-v1'
POSES=['idle','walk_a','walk_b','slash_windup','slash_release','summon']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 OUT.mkdir(parents=True,exist_ok=True); (SRC/'frames').mkdir(parents=True,exist_ok=True)
 profile=json.loads((SRC/'profile.json').read_text(encoding='utf-8'))
 tiles=[];records=[]
 for direction,filename in profile['sources'].items():
  path=SRC/'raw'/filename;cels=figures(path,2,3)
  idle=np.asarray(cels[0][0]);ys,xs=np.nonzero(idle[:,:,3]>=24)
  ratio=248/(ys.max()-ys.min()+1)
  for i,((im,bounds),pose) in enumerate(zip(cels,POSES)):
   p=np.array(im);mask=p[:,:,3]>=24
   # Red eyes are the stable head-axis annotation; do not use the extended arm.
   eyes=(p[:,:,0]>110)&(p[:,:,0]>p[:,:,1]*1.8)&(p[:,:,0]>p[:,:,2]*1.8)&mask
   ey,ex=np.nonzero(eyes)
   if len(ex)>5:
    rootx=float(np.median(ex))-8*im.width/400
   else:
    # Rear scalp annotation: use the first dense central head rows, not the raised hand.
    band=mask[:,round(im.width*.32):round(im.width*.68)]
    dense=np.flatnonzero(band.sum(axis=1)>=max(20,im.width*.09))
    assert len(dense),(direction,pose,'missing scalp')
    y0=int(dense[0]);hy,hx=np.nonzero(mask[y0:y0+35])
    rootx=float(np.median(hx))
   yy,xx=np.nonzero(mask);footy=float(yy.max())
   resized=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
   tile=Image.new('RGBA',(640,704))
   x=round(320-rootx*ratio);y=round(624-footy*ratio)
   assert x>3 and y>3 and x+resized.width<637 and y+resized.height<701,(direction,pose,'clipped',x,y,resized.size)
   tile.alpha_composite(resized,(x,y))
   name=pose+'_'+direction
   tile.save(SRC/'frames'/(name+'.png'));tiles.append((name,tile))
   records.append({'frame':name,'source':filename,'sourceBounds':list(bounds),'ratio':ratio,'sourceRoot':[rootx,footy],'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
 # Distinct authored recoil/corpse poses share the standing source density.
 reactions=figures(SRC/'raw/reactions.png',2,3)
 for direction,index in [('down',0),('right',1),('up',2),('up_right',2)]:
  for pose,offset in [('hurt',0),('death',3)]:
   im,box=reactions[index+offset];ratio=248/440
   p=np.array(im);yy,xx=np.nonzero(p[:,:,3]>=24)
   rootx=float(im.width/2);footy=float(yy.max())
   resized=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
   tile=Image.new('RGBA',(640,704));x=round(320-rootx*ratio);y=round(624-footy*ratio)
   assert x>3 and y>3 and x+resized.width<637 and y+resized.height<701
   tile.alpha_composite(resized,(x,y));name=pose+'_'+direction;tiles.append((name,tile));tile.save(SRC/'frames'/(name+'.png'))
   records.append({'frame':name,'source':'reactions.png','sourceBounds':list(box),'ratio':ratio,'sourceRoot':[rootx,footy],'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
 for direction,spec in profile.get('derived',{}).items():
  for pose in POSES+['hurt','death']:
   original=next(t for n,t in tiles if n==pose+'_'+spec['from'])
   tile=original.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if spec['mirror'] else original.copy()
   name=pose+'_'+direction;tiles.append((name,tile));tile.save(SRC/'frames'/(name+'.png'))
   records.append({'frame':name,'derivedFrom':pose+'_'+spec['from'],'mirror':spec['mirror'],'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
 sheet=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=0;mx=my=0
 for name,tile in tiles:
  box=tile.getbbox();assert box
  box=(max(0,box[0]-2),max(0,box[1]-2),min(640,box[2]+2),min(704,box[3]+2))
  cel=tile.crop(box)
  if x+cel.width+4>4096:x=0;y+=rowh+4;rowh=0
  assert y+cel.height+4<=4096
  sheet.alpha_composite(cel,(x+2,y+2))
  frames[name]={'frame':{'x':x+2,'y':y+2,'w':cel.width,'h':cel.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':cel.width,'h':cel.height},'sourceSize':{'w':640,'h':704}}
  x+=cel.width+4;rowh=max(rowh,cel.height);mx=max(mx,x);my=max(my,y+cel.height+4)
 sheet.crop((0,0,mx,my)).save(OUT/'body.png')
 (OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':mx,'h':my},'scale':'1'}},indent=2)+'\n')
 manifest={'texture':'nam-de-dark:body','folder':'boss-nam-de-dark-v1','canvas':[640,704],'foot':[320,624],'pivot':[.5,624/704],'scale':.5,'bodyHeight':124,'sourceBodyHeight':248,'directions':list(profile['sources'])+list(profile.get('derived',{})),'poses':POSES+['hurt','death'],'status':'runtime candidate; concept approved; integration pending review','groupsAuthored':records,'sourceHashes':{k:sha(SRC/'raw'/v) for k,v in profile['sources'].items()}}
 manifest['sourceHashes']['reactions']=sha(SRC/'raw/reactions.png')
 manifest['exports']={name:sha(OUT/name) for name in ['body.png','body.json']}
 (SRC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (OUT/'manifest.json').write_text(json.dumps({k:v for k,v in manifest.items() if k!='groupsAuthored'},indent=2)+'\n')
 shutil.copytree(OUT,ROOT/'apps/game-client/public/assets/boss-nam-de-dark-v1',dirs_exist_ok=True)
 print('Registered',len(tiles),'body cels;',mx,my,'atlas; physical height124, scale0.5, fixed foot320/624')
if __name__=='__main__':main()
