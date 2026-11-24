"""Versioned sprite registration/crop export; all artwork comes from retained/generated rasters."""
from pathlib import Path
import sys,json,hashlib,statistics
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-feedback-v04'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
dirs=['down','down_right','right','up_right','up','up_left','left','down_left']
sources={};tiles={};registration=[]
def retained(folder,name):
    folder=ROOT/folder;sources[str((folder/'body.png').relative_to(ROOT))]=sha(folder/'body.png');sources[str((folder/'body.json').relative_to(ROOT))]=sha(folder/'body.json')
    a=json.loads((folder/'body.json').read_text())['frames'][name];f=a['frame'];s=a['spriteSourceSize'];im=Image.open(folder/'body.png').convert('RGBA');cel=Image.new('RGBA',(512,448));cel.alpha_composite(im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return cel
def sole(im):
    p=np.array(im);r,g,b=[p[:,:,i].astype(float) for i in range(3)];a=p[:,:,3]>=24
    boots=a&(r<180)&(g<140)&(b<115)&(r>g*1.1)&(r<g*2.55)&(g>b*1.12);boots[:int(im.height*.65)]=False
    count=boots.sum(axis=1);ys=np.flatnonzero(count>=max(4,float(count.max())*.18));assert len(ys)
    foot=int(ys[-1]);yy,xx=np.nonzero(boots[max(0,foot-10):foot+1]);x=(float(xx.min())+float(xx.max()))/2
    dense=a[:,max(0,round(x-im.height*.18)):min(im.width,round(x+im.height*.18))].sum(axis=1);top=int(np.flatnonzero(dense>=max(5,float(dense.max())*.18))[0]);return x,foot,top
locked()
for d in dirs:
    neutral=retained('assets/exports/skill-revise-feedback-v02/thien-su-v2','thrust_0_'+d)
    for i in range(4):tiles[f'idle_{i}_{d}']=neutral.copy()
    for action in ['thrust','rising','sweep','slam']:
        bank='assets/exports/skill-revise-sweep-v03/sweep-v3' if action=='sweep' else 'assets/exports/skill-revise-feedback-v02/thien-su-v2'
        for i in range(6):tiles[f'{action}_{i}_{d}']=neutral.copy() if i in [0,5] else retained(bank,f'{action}_{i}_{d}')
for d in ['right','down','down_right','up','up_right']:
    raw=SRC/'raw'/('slam-'+d+'.png')
    if not raw.exists():continue
    sources[str(raw.relative_to(ROOT))]=sha(raw);cels=figures(raw,2,3);roots=[sole(im) for im,_ in cels]
    ratio=89/statistics.median(roots[i][1]-roots[i][2]+1 for i in [0,5])
    repair=SRC/'raw'/('slam-'+d+'-repair.png');repair_cels=repair_roots=None;repair_ratio=None
    if repair.exists():
        sources[str(repair.relative_to(ROOT))]=sha(repair);repair_cels=figures(repair,2,3);repair_roots=[sole(im) for im,_ in repair_cels];repair_ratio=89/statistics.median(repair_roots[i][1]-repair_roots[i][2]+1 for i in [0,5])
    for i in range(1,5):
        (im,_),(x,y,_) = cels[i],roots[i];factor=ratio
        if repair_cels and i==2:(im,_),(x,y,_),factor=repair_cels[i],repair_roots[i],repair_ratio
        small=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.LANCZOS);cel=Image.new('RGBA',(512,448));cel.alpha_composite(small,(round(256-x*factor),round(320-y*factor)));tiles[f'slam_{i}_{d}']=cel
        mirror={'right':'left','down_right':'down_left','up_right':'up_left'}.get(d)
        if mirror:tiles[f'slam_{i}_{mirror}']=cel.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    registration.append({'direction':d,'uniformScale':ratio,'roots':roots,'repairCel2Scale':repair_ratio,'repairCel2Roots':repair_roots,'mirroredFacing':{'right':'left','down_right':'down_left','up_right':'up_left'}.get(d),'neutralReference':'retained v02 thrust_0; identical idle and every A entry/recovery'})
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
    for i in range(4):tiles[f'walk_{i}_{left}']=retained('assets/exports/skill-revise-thien-su-v01',f'walk_{i}_{right}').transpose(Image.Transpose.FLIP_LEFT_RIGHT)
folder=OUT/'hammer-coherent-v4';folder.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
for name,tile in tiles.items():
    box=tile.getbbox();assert box and box[0]>2 and box[1]>2 and box[2]<510 and box[3]<446,(name,box)
    box=(box[0]-1,box[1]-1,box[2]+1,box[3]+1);crop=tile.crop(box)
    if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
    assert y+crop.height+4<=4096
    sheet.alpha_composite(crop,(x+2,y+2));frames[name]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':512,'h':448}}
    x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
sheet.crop((0,0,maxx,maxy)).save(folder/'body.png');(folder/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
clips=[{'name':action+'_'+d,'frames':[f'{action}_{i}_{d}' for i in range(4 if action=='idle' else 6)],'fps':10,'loop':action=='idle'} for d in dirs for action in ['idle','thrust','rising','sweep','slam']]
clips += [{'name':'walk_'+d,'frames':[f'walk_{i}_{d}' for i in range(4)],'fps':5,'loop':True} for d in ['left','down_left','up_left']]
manifest={'id':'hammer-coherent-v4','canvas':[512,448],'pivot':[.5,320/448],'clips':clips,'sources':[{'path':p.replace('\\','/'),'sha256':h} for p,h in sources.items()],'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in tiles.items()],'status':'CANDIDATE_RUNTIME_FIX_PENDING_DIRECTOR_REVIEW','notes':['Idle and every A first/final cel are the exact retained v02 neutral for that facing. Static idle aliases are intentional, not newly drawn idle animation.','Retained v02 thrust/rising and v03 sweep interior cels. Exported v03 ordering used once.','Five generated overhead takes; horizontal mirrors derive three left-facing interior takes. Original source bytes preserved.']}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
(OUT/'catalogue.json').write_text(json.dumps({'assets':[{'id':manifest['id'],'sourcePng':(folder/'body.png').relative_to(ROOT).as_posix(),'sourceAtlas':(folder/'body.json').relative_to(ROOT).as_posix(),'pivot':manifest['pivot'],'scale':.5,'clips':clips}]},indent=2)+'\n')
icons=OUT/'icons';icons.mkdir(exist_ok=True);iconRecords=[]
for p in (ROOT/'assets/exports/skill-revise-v01/revised-icons/icons').glob('*.png'):
    Image.open(p).crop((44,44,212,212)).save(icons/p.name);iconRecords.append({'source':p.relative_to(ROOT).as_posix(),'sourceSha256':sha(p),'crop':[44,44,212,212],'output':(icons/p.name).relative_to(ROOT).as_posix(),'sha256':sha(icons/p.name)})
(icons/'manifest.json').write_text(json.dumps({'method':'Exact unscaled interior raster crop removes baked gold frame and transparent card gutter; retained original bytes unchanged.','icons':iconRecords},indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'overheadSourceFacings':len(registration),'icons':len(iconRecords)}))
