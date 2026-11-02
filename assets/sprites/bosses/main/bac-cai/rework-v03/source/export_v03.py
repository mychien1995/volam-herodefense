"""Native-width authored beam, using the retained v01 PNG/hash-atlas packer."""
from pathlib import Path
import ast,json
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent
OUT=HERE.parent
ROOT=HERE.parents[6]
LEGACY=HERE.parents[1]/'source/export_assets_v01.py'
tree=ast.parse(LEGACY.read_text(encoding='utf-8'));nodes=[]
for node in tree.body:
    if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call):break
    nodes.append(node)
ns={'__file__':str(LEGACY)}
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(LEGACY),'exec'),ns)
src=HERE/'beam_source.png'
im=ns['clean'](ns['load'](src));cuts=ns['bands'](im,4)
cells=[im.crop((0,cuts[i],im.width,cuts[i+1])) for i in range(4)]
bounds=[c.getbbox() for c in cells]
scale=700/max(b[2]-b[0] for b in bounds)
cels=[];names=[]
for i,(cell,b) in enumerate(zip(cells,bounds)):
    # Keep a shared source scale. Locate the long bright centerline rather than
    # centering each irregular emitter aura vertically, which causes jitter.
    a=np.array(cell);rgb=a[:,:,:3].astype('int16')
    white=(rgb[:,:,0]>170)&(rgb[:,:,1]>190)&(a[:,:,3]>0)
    center=int(np.argmax(white[:,round(im.width*.2):round(im.width*.8)].sum(1)))
    cut=cell.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.NEAREST)
    x=16;y=64-round((center-b[1])*scale)
    assert y>=1 and y+cut.height<127,(i,y,cut.size)
    frame=Image.new('RGBA',(768,128));frame.paste(cut,(x,y))
    name=f'qi_beam_{i}';names.append(name)
    cels.append((name,frame,{'path':ns['rel'](src),'rect':[0,cuts[i],im.width,cuts[i+1]],'bbox':list(b),'scale':scale,'sourceCenterlineY':center,'method':'whole authored long cel, shared uniform nearest sampling; fixed emitter and centerline; no horizontal stretching'}))
ns['pack'](OUT,'bac_cai_beam_v03',cels,[{'name':'qi_beam','frames':names,'durationMs':110,'repeat':0,'direction':'right','placement':'projectile'}],(768,128),(16,64))
ns['dump'](OUT/'manifest.json',{'status':'PROTOTYPE_PENDING_DIRECTOR_REVIEW','tool':'built-in image_gen','source':ns['rel'](src),'sourceSha256':ns['sha'](src),'generatorOutputFile':'exec-f4231420-a4a9-439f-9e3b-00ebe1dcd4ad.png','rights':'Original generated art for this project, subject to applicable OpenAI service terms; no third-party license claimed','assets':ns['ASSETS'],'animations':ns['CLIPS'],'frameCount':4,'frameSize':[768,128],'pivot':[16,64],'runtimeScale':1,'sourceRowCuts':cuts,'sourceUniformScale':scale})
print('Exported 4 native-width beam cels; fixed emitter/centerline; runtime scale 1.')
