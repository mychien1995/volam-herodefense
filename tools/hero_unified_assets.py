"""Shared coherent-body raster assembly. Retained originals are read-only.
Uses the same connected-alpha extraction / one-group scale / native roundtrip
workflow as the accepted Chưởng pilot; adds trimmed packing and staff-safe roots.
"""
from pathlib import Path
import json,hashlib,statistics,shutil
from PIL import Image,ImageDraw
from scipy import ndimage
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
DIRECTIONS=['down','down_right','right','up_right','up','up_left','left','down_left']
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def locked():
 for p in (ROOT/'assets/approvals/hero-coherence').glob('*.json'):
  for f in json.loads(p.read_text(encoding='utf-8'))['files']:assert sha(ROOT/f['path'])==f['sha256'],f['path']
def figures(path,rows,columns,separators=()):
 pixels=np.array(Image.open(path).convert('RGBA'));mask=pixels[:,:,3]>=24
 for x0,y0,x1,y1 in separators:mask[y0:y1,x0:x1]=False
 labels,n=ndimage.label(mask,np.ones((3,3)));areas=np.bincount(labels.ravel());bounds=ndimage.find_objects(labels)
 ids=[i for i in range(1,n+1) if areas[i]>1000]
 assert len(ids)==rows*columns,(path,'complete bodies',len(ids))
 ids.sort(key=lambda i:(bounds[i-1][0].start+bounds[i-1][0].stop)/2);ids=[i for row in range(rows) for i in sorted(ids[row*columns:row*columns+columns],key=lambda i:bounds[i-1][1].start)]
 result=[]
 for i,label in enumerate(ids):
  yy,xx=bounds[label-1];assert xx.start>0 and yy.start>0 and xx.stop<pixels.shape[1] and yy.stop<pixels.shape[0],(path,'clipped SOURCE cel',i)
  box=(max(0,xx.start-3),max(0,yy.start-3),min(pixels.shape[1],xx.stop+3),min(pixels.shape[0],yy.stop+3));guard=ndimage.binary_dilation(labels==label,structure=np.ones((7,7)));rgba=pixels[box[1]:box[3],box[0]:box[2]].copy();keep=guard[box[1]:box[3],box[0]:box[2]]
  rgba[:,:,3][(~keep)|(rgba[:,:,3]<4)]=0
  result.append((Image.fromarray(rgba),box))
 return result
def body_root(image,prone=False,mode="brown"):
 p=np.array(image);a=p[:,:,3]>=24;yy,xx=np.nonzero(a);center=float(np.median(xx));height=image.height
 if prone:return (center,float(yy.max()),0)
 # Dark footwear rather than the low red/gold staff tip defines the floor.
 rgb=p[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 boots=(a&(r<170)&(g<125)&(b<100)&(r>g*1.12)&(r<g*2.55)&(g>b*1.1)) if mode=="brown" else (a&(r<165)&(g<165)&(b<180)&(abs(r-g)<48)&(abs(g-b)<55))
 band=(np.arange(image.width)>=center-height*.38)&(np.arange(image.width)<=center+height*.38)
 boots&=band[None,:];boots[:round(height*.52)]=False
 count=boots.sum(axis=1);threshold=max(5,float(count.max())*.28);valid=np.flatnonzero(count>=threshold)
 assert len(valid),(image.size,'no physical feet')
 foot=float(valid[-1]);headCount=a.sum(axis=1);top=np.flatnonzero(headCount>=max(10,float(headCount.max())*.23))[0]
 lower=boots[max(0,round(foot-height*.2)):round(foot)+1];ly,lx=np.nonzero(lower)
 rootx=float(np.mean(lx)) if len(lx) else center
 return rootx,foot,float(top)
def hair_width(image,root,mode="brown"):
 p=np.array(image);rgb=p[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];hair=((p[:,:,3]>=24)&(r>g*1.15)&(r<g*2.3)&(b>g*.35)&(r<190)&(g<145)&(b<125)) if mode=="brown" else ((p[:,:,3]>=24)&(r<155)&(g<155)&(b<175)&(abs(r-g)<48)&(abs(g-b)<55))
 hair[round(root[1]-(root[1]-root[2])*(.30 if mode=='brown' else .50)):]=False
 if mode=='monochrome':hair=ndimage.binary_opening(hair,np.ones((3,3)))
 labels,n=ndimage.label(hair,np.ones((3,3)));counts=np.bincount(labels.ravel());assert n>0,'Missing head silhouette';label=1+int(np.argmax(counts[1:]));yy,xx=np.nonzero(labels==label)
 return float(xx.max()-xx.min()+1)
def avatar(tile,out):
 figure=tile.crop(tile.getbbox());full=Image.new('RGBA',(256,256));scale=min(224/figure.width,240/figure.height);body=figure.resize((round(figure.width*scale),round(figure.height*scale)),Image.Resampling.LANCZOS);full.alpha_composite(body,((256-body.width)//2,248-body.height));full.save(out/'avatar-body.png')
 # Face crop is independent of the long staff above the head; use occupied dense head rows.
 p=np.array(figure);mask=p[:,:,3]>=24;rows=mask.sum(axis=1);ys=np.flatnonzero(rows>=max(10,float(rows.max())*.25));top=int(ys[0]);face=figure.crop((0,max(0,top-2),figure.width,min(figure.height,top+round((figure.height-top)*.66))));scale=min(150/face.width,170/face.height);face=face.resize((round(face.width*scale),round(face.height*scale)),Image.Resampling.LANCZOS);portrait=Image.new('RGBA',(160,192));portrait.alpha_composite(face,((160-face.width)//2,14));portrait.save(out/'avatar.png')
def export_profile(profile_path,direction=None):
 locked();cfg=json.loads(Path(profile_path).read_text());src=ROOT/'assets/source'/cfg['folder'];out=ROOT/'assets/exports'/cfg['folder'];out.mkdir(parents=True,exist_ok=True);mode=cfg.get('rootMode','brown');poses=cfg['poses'];baseCount=cfg['sourceRows']*cfg['sourceColumns'];reactionStart=baseCount-4;dirs=[direction] if direction else DIRECTIONS;w,h=cfg['canvas'];foot=cfg['foot'];tiles=[];records=[];guide=Image.new('RGBA',(len(poses)*256,len(dirs)*224),(34,40,34,255));draw=ImageDraw.Draw(guide)
 for row,d in enumerate(dirs):
  raw=src/'raw'/(d+'.png');cels=figures(raw,cfg['sourceRows'],cfg['sourceColumns'],cfg.get('sourceSegmentationCuts',{}).get(d,[]))
  replacements=[o for o in cfg.get('celGroupOverrides',[]) if o['direction']==d]
  extraRecords=[]
  for extra in cfg.get('extraSources',[]):
   path=src/extra['pattern'].format(direction=d);authored=figures(path,extra['rows'],extra['columns']);start=len(cels);cels.extend(authored);extraRecords.append({'path':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path),'start':start,'count':len(authored)})
  for override in replacements:
   authored=figures(src/override['path'],override['rows'],override['columns']);authored=[authored[j] for j in override['indices']] if 'indices' in override else authored;cels[override['start']:override['start']+len(authored)]=authored
  assert len(cels)==len(poses),(d,'pose/source count mismatch')
  roots=[body_root(im,poses[i]=='death_1',mode) for i,(im,_) in enumerate(cels)]
  ratio=cfg['bodyHeight']/statistics.median(roots[i][1]-roots[i][2]+1 for i in range(4));entries=[]
  hair=[hair_width(im,root,mode) for (im,_),root in zip(cels,roots)];headTarget=ratio*statistics.median(hair[:4]);actionRatio=headTarget/statistics.median(hair[8:reactionStart]);reactionRatio=headTarget/statistics.median(hair[reactionStart:baseCount-1])
  for i,((im,sourceBounds),(rx,ry,headTop)) in enumerate(zip(cels,roots)):
   groupRatio=ratio if i<8 else actionRatio if i<reactionStart else reactionRatio
   for extra in extraRecords:
    if extra['start']<=i<extra['start']+extra['count']:groupRatio=cfg['bodyHeight']/statistics.median(roots[j][1]-roots[j][2]+1 for j in range(extra['start'],extra['start']+4))
   override=next((e for e in cfg.get('poseOverrides',[]) if e['frame']==poses[i]+'_'+d),None)
   if override:
    path=src/override['path'];im,sourceBounds=figures(path,1,1)[0];rx=override['sourceRoot'][0]-sourceBounds[0];ry=override['sourceRoot'][1]-sourceBounds[1];headTop=override['sourceBodyTop']-sourceBounds[1];groupRatio=override.get('bodyHeight',cfg['bodyHeight'])/(ry-headTop+1)
   resized=im.resize((round(im.width*groupRatio),round(im.height*groupRatio)),Image.Resampling.LANCZOS);x=round(foot[0]-rx*groupRatio);y=round(foot[1]-ry*groupRatio)
   assert x>=3 and y>=3 and x+resized.width<=w-3 and y+resized.height<=h-3,(d,poses[i],'canvas clip',x,y,resized.size)
   tile=Image.new('RGBA',(w,h));tile.alpha_composite(resized,(x,y));name=poses[i]+'_'+d;tiles.append((name,tile));box=tile.getbbox();entries.append({'frame':name,'sha256':hashlib.sha256(tile.tobytes()).hexdigest(),'visible':list(box),'sourceBounds':list(sourceBounds),'sourceRoot':[rx,ry],'sourceHeadTop':headTop,'groupRatio':groupRatio,'sourceHairWidth':hair_width(im,(rx,ry,headTop),mode) if override else hair[i],'override':override,'overrideSha256':sha(src/override['path']) if override else None})
   # Native-size body preview; wider pole/canvas retained without scaling differently by pose.
   thumb=tile.resize((w//2,h//2),Image.Resampling.LANCZOS);crop=thumb.crop(thumb.getbbox());px=i*256+(256-crop.width)//2;guide.alpha_composite(crop,(px,row*224+204-crop.height));draw.text((i*256,row*224+208),poses[i],fill='white')
  records.append({'direction':d,'path':str(raw.relative_to(ROOT)).replace('\\','/'),'sha256':sha(raw),'extraSources':extraRecords,'celGroupOverrides':[{**o,'sha256':sha(src/o['path'])} for o in replacements],'ratio':ratio,'actionRatio':actionRatio,'reactionRatio':reactionRatio,'targetHairWidth':headTarget,'frames':entries})
 # Trim transparent whitespace while preserving the exact logical canvas/root in Phaser.
 packed=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=0;maxx=maxy=0
 for name,tile in tiles:
  box=tile.getbbox();box=(max(0,box[0]-2),max(0,box[1]-2),min(w,box[2]+2),min(h,box[3]+2));crop=tile.crop(box)
  if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
  assert y+crop.height+4<=4096,'Atlas exceeded bounded texture size'
  packed.alpha_composite(crop,(x+2,y+2));frames[name]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'trimmed':True,'rotated':False,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':w,'h':h}}
  maxx=max(maxx,x+crop.width+4);maxy=max(maxy,y+crop.height+4);x+=crop.width+4;rowh=max(rowh,crop.height)
 packed=packed.crop((0,0,maxx,maxy));packed.save(out/'body.png');(out/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy},'scale':'1'}},indent=2)+'\n')
 if 'down' in dirs:avatar(next(t for n,t in tiles if n=='idle_0_down'),out)
 manifest={**cfg,'status':'prototype pending director review','directions':dirs,'pivot':[foot[0]/w,foot[1]/h],'source':cfg.get('sourceDescription','Built-in imagegen; sharp retained native art for identity/quality; separate body and VFX'),'groupsAuthored':records,'references':[{'path':p,'sha256':sha(ROOT/p)} for p in cfg['references']],'logicalBytes':w*h*len(tiles)*4,'packedTextureBytes':maxx*maxy*4}
 (src/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(out/'manifest.json').write_text(json.dumps({k:manifest[k] for k in ['basic','texture','folder','canvas','foot','pivot','scale','bodyHeight','bodyWidth','poses','directions']},indent=2)+'\n');guide.save(src/'pose-contact.png');shutil.copytree(out,ROOT/'apps/game-client/public/assets'/cfg['folder'],dirs_exist_ok=True);locked();print('Exported',len(tiles),'cels;',packed.size,'packed pixels;',round(maxx*maxy*4/1048576,2),'MiB texture')
