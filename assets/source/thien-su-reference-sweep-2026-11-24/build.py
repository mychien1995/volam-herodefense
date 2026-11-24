"""Export the additional sweep study; retain every reviewed overhead asset byte."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent
OUT=ROOT/'assets/reviews/thien-su-reference-motion-2026-11-24/sweep'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
retained=json.loads((ROOT/'assets/source/thien-su-reference-motion-2026-11-24/validation.json').read_text())['files']
for f in retained:assert sha(ROOT/f['path'])==f['sha256'],f['path']
locked();source=SRC/'raw/four-poses-01.png';cels=figures(source,2,2)
density=4;ratio=.175*density;w,h=512*density,448*density
roots=[(328,553),(994,553),(294,1149),(1026,1149)]
atlas=Image.new('RGBA',(w*2,h*2));frames={};registration=[]
for i,(im,box) in enumerate(cels):
 x,y=roots[i][0]-box[0],roots[i][1]-box[1]
 small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
 tile=Image.new('RGBA',(w,h));tile.alpha_composite(small,(round(256*density-x*ratio),round(320*density-y*ratio)))
 bounds=tile.getbbox();assert bounds[0]>3 and bounds[1]>3 and bounds[2]<w-3 and bounds[3]<h-3
 tile.save(OUT/f'pose-{i+1}.png');tx=(i%2)*w;ty=(i//2)*h;atlas.alpha_composite(tile,(tx,ty))
 name=f'sweep_{i}_right';frames[name]={'frame':{'x':tx,'y':ty,'w':w,'h':h},'trimmed':False,'rotated':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
 registration.append({'frame':name,'sourceBounds':box,'sourceRoot':[x,y],'scale':ratio,'bounds':bounds,'sha256':hashlib.sha256(tile.tobytes()).hexdigest()})
atlas.save(OUT/'body.png')
(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':w*2,'h':h*2}}},indent=2)+'\n')
labels=['Lấy đà thấp bên hông','Kéo búa lên vai — xoay thân','Hai tay quạt qua trước người','Hạ búa theo đà sang bên thân'];durations=[200,250,110,340]
study={'id':'sweep','status':'FOUR_KEY_POSE_STUDY_PENDING_REVIEW','scope':'One facing, four authored sweep key poses; no finished in-betweens or game integration.','canvas':[w,h],'density':density,'pivot':[.5,320/448],'duration':sum(durations),'frames':[{'name':name,'label':labels[i],'duration':durations[i]} for i,name in enumerate(frames)]}
(OUT/'study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
files=[source,SRC/'generation.json',OUT/'body.png',OUT/'body.json',OUT/'study.json',OUT/'reference.png',ROOT/'assets/source/thien-su-reference-motion-2026-11-24/raw/four-poses-04.png']
(SRC/'validation.json').write_text(json.dumps({'status':'PASS','frames':len(frames),'alphaExtrema':Image.open(source).getchannel('A').getextrema(),'registration':registration,'retainedOverheadHashesVerified':retained,'files':[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p)} for p in files]},indent=2)+'\n')
locked();print(json.dumps({'frames':len(frames),'density':density,'scale':ratio,'retainedOverheadUnchanged':True}))
