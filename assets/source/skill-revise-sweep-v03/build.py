"""Register generated sweep cels on the retained foot canvas; no art is drawn here."""
from pathlib import Path
import sys,json,hashlib,statistics
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-sweep-v03/sweep-v3'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def sole(im):
    p=np.array(im);r,g,b=[p[:,:,i].astype(float) for i in range(3)]
    mask=(p[:,:,3]>=24)&(r<180)&(g<140)&(b<115)&(r>g*1.1)&(r<g*2.55)&(g>b*1.12);mask[:int(im.height*.65)]=False
    count=mask.sum(axis=1);ys=np.flatnonzero(count>=max(4,float(count.max())*.18));assert len(ys)
    foot=int(ys[-1]);yy,xx=np.nonzero(mask[max(0,foot-10):foot+1]);x=(float(xx.min())+float(xx.max()))/2
    dense=(p[:,:,3]>=24)[:,max(0,round(x-im.height*.18)):min(im.width,round(x+im.height*.18))].sum(axis=1)
    top=int(np.flatnonzero(dense>=max(5,float(dense.max())*.18))[0]);return x,foot,top
locked();tiles=[];clips=[];sources=[];registration=[]
jobs=[(SRC/'raw/front.png',2,3,['down'])]
for direction in ['down_right','right','up_right','up','up_left','left','down_left']:
    raw=SRC/'raw/facings'/(direction+'.png')
    if raw.exists():jobs.append((raw,2,3,[direction]))
for raw,rows,cols,dirs in jobs:
    allcels=figures(raw,rows,cols);assert len(allcels)==len(dirs)*6
    sources.append({'path':raw.relative_to(ROOT).as_posix(),'sha256':sha(raw)})
    for j,direction in enumerate(dirs):
        order=[2,1,0,3,4,5] if direction=='down_right' else list(range(6))
        cels=[allcels[j*6+i] for i in order];roots=[sole(im) for im,_ in cels]
        ratio=89/statistics.median(roots[i][1]-roots[i][2]+1 for i in [0,5])
        for i,((im,bounds),(x,y,top)) in enumerate(zip(cels,roots)):
            small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
            tile=Image.new('RGBA',(512,448));tile.alpha_composite(small,(round(256-x*ratio),round(320-y*ratio)));box=tile.getbbox()
            assert box[0]>3 and box[1]>3 and box[2]<509 and box[3]<445,(direction,i,'clipping')
            tiles.append(('sweep_'+str(i)+'_'+direction,tile))
        clips.append({'name':'sweep_'+direction,'frames':['sweep_'+str(i)+'_'+direction for i in range(6)],'fps':10,'loop':False})
        registration.append({'direction':direction,'sourceOrder':order,'roots':roots,'uniformScale':ratio,'neutralBodyHeights':[(roots[i][1]-roots[i][2]+1)*ratio for i in [0,5]]})
OUT.mkdir(parents=True,exist_ok=True);columns=min(8,len(tiles));atlas=Image.new('RGBA',(columns*512,((len(tiles)+columns-1)//columns)*448));frames={}
for i,(name,tile) in enumerate(tiles):
    x=i%columns*512;y=i//columns*448;atlas.alpha_composite(tile,(x,y));frames[name]={'frame':{'x':x,'y':y,'w':512,'h':448},'trimmed':False,'rotated':False,'spriteSourceSize':{'x':0,'y':0,'w':512,'h':448},'sourceSize':{'w':512,'h':448}}
atlas.save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':atlas.width,'h':atlas.height}}},indent=2)+'\n')
manifest={'id':'sweep-v3','canvas':[512,448],'pivot':[.5,320/448],'clips':clips,'sources':sources,'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in tiles],'scope':'Only two-handed horizontal right-to-left sweep; other A cels, skills and v02 bytes retained','status':'CANDIDATE_PENDING_DIRECTOR_REVIEW'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
asset={'id':'sweep-v3','sourcePng':(OUT/'body.png').relative_to(ROOT).as_posix(),'sourceAtlas':(OUT/'body.json').relative_to(ROOT).as_posix(),'pivot':manifest['pivot'],'scale':.5,'clips':clips}
(OUT.parent/'catalogue.json').write_text(json.dumps({'assets':[asset]},indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'directions':len(clips)}))
retained=json.loads((ROOT/'assets/exports/skill-revise-feedback-v02/catalogue.json').read_text(encoding='utf-8'))
(OUT.parent/'review-assets.json').write_text(json.dumps({'assets':retained['assets']+[asset]},indent=2)+'\n')
