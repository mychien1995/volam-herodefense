"""Assemble original coherent Cái Bang Chưởng pose groups, never rewrite locked art."""
from pathlib import Path
import argparse,json,hashlib,statistics,shutil
from PIL import Image,ImageDraw
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/cai-bang-chuong-unified-v1'
OUT=ROOT/'assets/exports/cai-bang-chuong-unified-v1'
DIRECTIONS=['down','down_right','right','up_right','up','up_left','left','down_left']
POSES=['idle_0','idle_1','idle_2','idle_3','walk_0','walk_1','walk_2','walk_3','windup','strike','alternate','recover','charge','release','rise','channel','hurt_0','hurt_1','death_0','death_1']
W,H=160,144;FOOT=(80,132)

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def export(only=None):
 OUT.mkdir(parents=True,exist_ok=True)
 dirs=[only] if only else DIRECTIONS
 atlas=Image.new('RGBA',(W*20,H*len(dirs)));frames={};records=[];proof=Image.new('RGBA',(20*90,96*len(dirs)),(40,44,38,255));draw=ImageDraw.Draw(proof)
 for row,direction in enumerate(dirs):
  source=SRC/'raw'/(direction+'.png');sheet=Image.open(source).convert('RGBA');cels=[]
  pixels=np.array(sheet);mask=pixels[:,:,3]>=24
  labels,n=ndimage.label(mask,np.ones((3,3)));areas=np.bincount(labels.ravel());objects=ndimage.find_objects(labels)
  ids=[i for i in range(1,n+1) if areas[i]>1000]
  if len(ids)!=20:raise ValueError(f'Expected20 complete connected bodies, found {len(ids)} in {direction}')
  ids.sort(key=lambda i:(objects[i-1][0].start+objects[i-1][0].stop)/2)
  ids=[i for row in range(5) for i in sorted(ids[row*4:row*4+4],key=lambda i:objects[i-1][1].start)]
  repairs={('down_left',3):0,('left',3):1,('left',7):2,('left',11):3,('left',15):4,('right',0):5}
  repair=SRC/'raw/ribbon-repair.png';repairCels=[]
  if repair.exists():
   rp=np.array(Image.open(repair).convert('RGBA'));rl,rn=ndimage.label(rp[:,:,3]>=24,np.ones((3,3)));ra=np.bincount(rl.ravel());ro=ndimage.find_objects(rl);ri=[k for k in range(1,rn+1) if ra[k]>1000]
   if len(ri)!=6:raise ValueError('Expected six isolated repaired figures')
   ri.sort(key=lambda k:(ro[k-1][0].start+ro[k-1][0].stop)/2);ri=[k for rr in range(2) for k in sorted(ri[rr*3:rr*3+3],key=lambda k:ro[k-1][1].start)]
   for k in ri:
    ry,rx=ro[k-1]
    if rx.start==0 or ry.start==0 or rx.stop==rp.shape[1] or ry.stop==rp.shape[0]:raise ValueError('Repair source clips')
    rb=(max(0,rx.start-3),max(0,ry.start-3),min(rp.shape[1],rx.stop+3),min(rp.shape[0],ry.stop+3));rg=ndimage.binary_dilation(rl==k,structure=np.ones((7,7)));rr=rp[rb[1]:rb[3],rb[0]:rb[2]].copy();rr[:,:,3][(~rg[rb[1]:rb[3],rb[0]:rb[2]])|(rr[:,:,3]<4)]=0
    repairCels.append(Image.fromarray(rr))
  for i,label in enumerate(ids):
   ys,xs=objects[label-1];body=labels==label
   box=(max(0,xs.start-3),max(0,ys.start-3),min(sheet.width,xs.stop+3),min(sheet.height,ys.stop+3))
   clipped=xs.start==0 or ys.start==0 or xs.stop==sheet.width or ys.stop==sheet.height
   patch=repairs.get((direction,i))
   if clipped and (patch is None or not repairCels):raise ValueError(f'Clipped SOURCE {direction}/{i}, repair required')
   guard=ndimage.binary_dilation(body,structure=np.ones((7,7)))
   rgba=pixels[box[1]:box[3],box[0]:box[2]].copy();keep=guard[box[1]:box[3],box[0]:box[2]]
   rgba[:,:,3][(~keep)|(rgba[:,:,3]<4)]=0
   cell=Image.fromarray(rgba);cels.append((cell,(0,0,cell.width,cell.height)))
  # One scale per coherent direction, never one scale per pose or corpse.
  ratio=89/statistics.median(b[3]-b[1] for _,b in cels[:4])
  entries=[]
  for i,(cell,box) in enumerate(cels):
   poseRatio=ratio
   patch=repairs.get((direction,i))
   if patch is not None and repairCels:
    cell=repairCels[patch];box=(0,0,cell.width,cell.height);poseRatio=89/statistics.median(im.height for im in repairCels)
   cropped=cell.crop(box);cropped=cropped.resize((round(cropped.width*poseRatio),round(cropped.height*poseRatio)),Image.Resampling.LANCZOS)
   mask=np.asarray(cell)[:,:,3]>=24;cut=box[3]-max(2,round((box[3]-box[1])*.12));yy,xx=np.nonzero(mask[cut:box[3]])
   anchor=float(np.mean(xx)) if i<19 else (box[0]+box[2])/2
   x=round(FOOT[0]+(box[0]-anchor)*poseRatio);y=FOOT[1]-cropped.height
   if x<4 or y<4 or x+cropped.width>W-4:raise ValueError(f'Output clipping {direction}/{i}')
   tile=Image.new('RGBA',(W,H));tile.alpha_composite(cropped,(x,y));atlas.alpha_composite(tile,(i*W,row*H))
   # Keep direction at end for stable idle silhouette selection in shared shadow cache.
   name=POSES[i]+'_'+direction
   f={'x':i*W,'y':row*H,'w':W,'h':H}
   frames[name]={'frame':f,'trimmed':False,'rotated':False,'spriteSourceSize':{'x':0,'y':0,'w':W,'h':H},'sourceSize':{'w':W,'h':H}}
   entries.append({'frame':name,'sha256':hashlib.sha256(tile.tobytes()).hexdigest(),'visible':list(tile.getbbox()),'sourceBounds':list(box),'repairCel':patch if patch is not None and repairCels else None})
   small=tile.resize((80,72),Image.Resampling.LANCZOS);proof.alpha_composite(small,(i*90,row*96));draw.text((i*90,row*96+74),POSES[i],fill='white')
  records.append({'direction':direction,'path':str(source.relative_to(ROOT)).replace('\\','/'),'sha256':sha(source),'size':list(sheet.size),'ratio':ratio,'frames':entries})
 if 'down' in dirs:
  tile=atlas.crop((0,dirs.index('down')*H,W,(dirs.index('down')+1)*H));figure=tile.crop(tile.getbbox());full=Image.new('RGBA',(256,256));scale=min(224/figure.width,240/figure.height);resized=figure.resize((round(figure.width*scale),round(figure.height*scale)),Image.Resampling.LANCZOS);full.alpha_composite(resized,((256-resized.width)//2,248-resized.height));full.save(OUT/'avatar-body.png')
  face=figure.crop((0,0,figure.width,round(figure.height*.64)));scale=min(150/face.width,170/face.height);face=face.resize((round(face.width*scale),round(face.height*scale)),Image.Resampling.LANCZOS);portrait=Image.new('RGBA',(160,192));portrait.alpha_composite(face,((160-face.width)//2,14));portrait.save(OUT/'avatar.png')
 atlas.save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}},indent=2)+'\n')
 manifest={'status':'prototype, director review pending','basic':'cai_bang_chuong','source':'Built-in imagegen, exact retained sharp neutral/walk and action artwork identity references','references':[{'path':p,'sha256':sha(ROOT/p)} for p in ['assets/source/renovation-v1/raw/hero_cai_bang_chuong.png','assets/source/renovation-v3/raw/hero_cai_bang_chuong_actions.png']], 'canvas':[W,H],'pivot':[.5,FOOT[1]/H],'scale':.5,'bodyHeight':89,'directions':dirs,'poses':POSES,'groups':records,'repairSha256':sha(SRC/'raw/ribbon-repair.png') if (SRC/'raw/ribbon-repair.png').exists() else None,'artPolicy':'One complete coherent pose group per facing; identical render path for all states. VFX and combat unchanged.'}
 (SRC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');proof.save(SRC/'pose-contact.png')
 (OUT/'manifest.json').write_text(json.dumps({k:manifest[k] for k in ['basic','canvas','pivot','scale','bodyHeight','directions','poses']},indent=2)+'\n')
 shutil.copytree(OUT,ROOT/'apps/game-client/public/assets/cai-bang-chuong-unified-v1',dirs_exist_ok=True)
 print(f'Exported {len(dirs)*20} coherent cels; {len(dirs)} directions')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--direction',choices=DIRECTIONS);args=parser.parse_args();export(args.direction)
