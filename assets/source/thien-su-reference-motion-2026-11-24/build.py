"""Register an isolated four-pose motion study; runtime game assets stay untouched."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
SRC=Path(__file__).parent
OUT=ROOT/'assets/reviews/thien-su-reference-motion-2026-11-24'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked

def sole(im):
 p=np.array(im);r,g,b=[p[:,:,j].astype(float) for j in range(3)]
 boots=(p[:,:,3]>=24)&(r<180)&(g<140)&(b<115)&(r>g*1.1)&(r<g*2.55)&(g>b*1.12)
 boots[:int(im.height*.82)]=False
 count=boots.sum(axis=1);ys=np.flatnonzero(count>=max(4,float(count.max())*.18));foot=int(ys[-1])
 yy,xx=np.nonzero(boots[max(0,foot-12):foot+1]);return (float(xx.min())+float(xx.max()))/2,foot

locked()
source=SRC/'raw/four-poses-04.png'
cels=figures(source,2,2)
# A single source density preserves the authored pose proportions. No silhouette fitting.
density=4;ratio=.19*density;w,h=512*density,448*density
atlas=Image.new('RGBA',(w*2,h*2));frames={};registration=[]
# Annotated boot centres in source coordinates; the lower hammer head is not a foot.
boot_roots=[(255,615),(855,616),(253,1239),(855,1239)]
for i,(im,box) in enumerate(cels):
 x,y=boot_roots[i][0]-box[0],boot_roots[i][1]-box[1];small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
 tile=Image.new('RGBA',(w,h));tile.alpha_composite(small,(round(256*density-x*ratio),round(320*density-y*ratio)))
 bounds=tile.getbbox();assert bounds[0]>3 and bounds[1]>3 and bounds[2]<w-3 and bounds[3]<h-3
 tile.save(OUT/f'pose-{i+1}.png')
 tx=(i%2)*w;ty=(i//2)*h;atlas.alpha_composite(tile,(tx,ty))
 name=f'reference_{i}_right';frames[name]={'frame':{'x':tx,'y':ty,'w':w,'h':h},'trimmed':False,'rotated':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
 registration.append({'frame':name,'sourceBounds':box,'sourceRoot':[x,y],'scale':ratio,'bounds':bounds,'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
atlas.save(OUT/'body.png')
(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':w*2,'h':h*2}}},indent=2)+'\n')
labels=['Đưa búa ra sau đầu','Nạp lực ở chân sau','Kéo búa qua phía trước','Gập người — búa chạm đất']
durations=[220,240,90,400]
study={'status':'POSE_MOTION_STUDY_PENDING_REVIEW','scope':'Four authored key poses, one facing; stepped study rather than finished in-between animation. No game integration.','canvas':[w,h],'density':density,'pivot':[.5,320/448],'duration':sum(durations),'frames':[{'name':name,'label':labels[i],'duration':durations[i]} for i,name in enumerate(frames)]}
(OUT/'study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
assets=[source,OUT/'body.png',OUT/'body.json',OUT/'study.json',OUT/'reference.png']
(SRC/'validation.json').write_text(json.dumps({'status':'PASS','frames':len(frames),'sourceAlphaExtrema':Image.open(source).getchannel('A').getextrema(),'registration':registration,'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in assets]},indent=2)+'\n')
locked();print(json.dumps({'frames':len(frames),'scale':ratio,'roots':[r['sourceRoot'] for r in registration]}))
