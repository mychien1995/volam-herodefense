"""Versioned review corrections. Crops/registers generated rasters; draws no artwork."""
from pathlib import Path
import sys,json,hashlib,statistics
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked,DIRECTIONS
SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-feedback-v02'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
packs=[]
def pack(id,tiles,canvas,pivot,clips,source,notes):
    folder=OUT/id;folder.mkdir(parents=True,exist_ok=True)
    atlas=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
    for name,tile in tiles:
        box=tile.getbbox();assert box
        assert box[0]>1 and box[1]>1 and box[2]<canvas[0]-1 and box[3]<canvas[1]-1,(name,'clip',box)
        box=(box[0]-1,box[1]-1,box[2]+1,box[3]+1);crop=tile.crop(box)
        if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
        assert y+crop.height+4<=4096
        atlas.alpha_composite(crop,(x+2,y+2));frames[name]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':canvas[0],'h':canvas[1]}}
        x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
    atlas.crop((0,0,maxx,maxy)).save(folder/'body.png');(folder/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
    manifest={'id':id,'canvas':canvas,'pivot':pivot,'clips':clips,'sources':source,'notes':notes,'status':'CANDIDATE_PENDING_DIRECTOR_REVIEW','frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in tiles]}
    (folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    packs.append({'id':id,'sourcePng':str((folder/'body.png').relative_to(ROOT)).replace('\\','/'),'sourceAtlas':str((folder/'body.json').relative_to(ROOT)).replace('\\','/'),'pivot':pivot,'scale':.5,'clips':clips})
    contact=Image.new('RGBA',(6*256,((len(tiles)+5)//6)*224),(43,48,47,255));draw=ImageDraw.Draw(contact)
    for i,(n,t) in enumerate(tiles):
        thumb=t.resize((canvas[0]//2,canvas[1]//2),Image.Resampling.LANCZOS);contact.alpha_composite(thumb,(i%6*256,i//6*224));draw.text((i%6*256+4,i//6*224+208),n,fill='white')
    contact.save(folder/'contact.png')
def roots(im):
    p=np.array(im);r,g,b=[p[:,:,i].astype(float) for i in range(3)];a=p[:,:,3]>=24
    boots=a&(r<180)&(g<140)&(b<115)&(r>g*1.10)&(r<g*2.55)&(g>b*1.12)
    boots[:int(im.height*.65)]=False
    counts=boots.sum(axis=1);ys=np.flatnonzero(counts>=max(4,float(counts.max())*.18));assert len(ys)
    foot=int(ys[-1]);yy,xx=np.nonzero(boots[max(0,foot-10):foot+1]);rootx=(float(xx.min())+float(xx.max()))/2
    # Weapon-free neutral cells alone set common anatomical density below.
    head=a[:,max(0,round(rootx-im.height*.18)):min(im.width,round(rootx+im.height*.18))].sum(axis=1)
    top=int(np.flatnonzero(head>=max(5,float(head.max())*.18))[0])
    return rootx,foot,top
locked();body=[];clips=[];sources=[];registration=[]
for direction in DIRECTIONS:
    raw=SRC/'raw/hammer'/(direction+'.png')
    repair=SRC/'raw/hammer/repairs'/(direction+'.png')
    if repair.exists():raw=repair
    if not raw.exists():continue
    cels=figures(raw,4,6);r=[roots(im) for im,_ in cels]
    neutral=[i for i in range(24) if i%6 in [0,5]]
    ratio=89/statistics.median(r[i][1]-r[i][2]+1 for i in neutral)
    for i,((im,bounds),(rx,ry,top)) in enumerate(zip(cels,r)):
        name=['thrust','rising','sweep','slam'][i//6]+'_'+str(i%6)+'_'+direction
        small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS)
        tile=Image.new('RGBA',(512,448));tile.alpha_composite(small,(round(256-rx*ratio),round(320-ry*ratio)));body.append((name,tile))
    for action in ['thrust','rising','sweep','slam']:clips.append({'name':action+'_'+direction,'frames':[action+'_'+str(i)+'_'+direction for i in range(6)],'fps':10,'loop':False})
    sources.append({'path':str(raw.relative_to(ROOT)).replace('\\','/'),'sha256':sha(raw)})
    registration.append({'direction':direction,'uniformScale':ratio,'neutralBodyHeights':[(r[i][1]-r[i][2]+1)*ratio for i in neutral],'roots':r,'method':'brown leather soles; wide boot footprint excludes purple iron head; common neutral-body density for every action, no runtime/per-pose rescale'})
if body:pack('thien-su-v2',body,[512,448],[.5,320/448],clips,sources,['Six authored frames per strike; all four attacks use both hands. Shared neutral anatomical density per source direction. Retained v01 idle remains separate and unchanged.'])
for kind in ['wave','crescent']:
    raw=SRC/'raw'/('wind-'+kind+'.png')
    if not raw.exists():continue
    im=Image.open(raw).convert('RGBA');tiles=[]
    # FX cells have equal drawing canvases by generation contract; no body segmentation.
    for row,d in enumerate(DIRECTIONS):
        for col in range(4):
            cell=im.crop((round(col*im.width/4),round(row*im.height/8),round((col+1)*im.width/4),round((row+1)*im.height/8)))
            box=cell.getbbox();assert box,(kind,row,col)
            scale=min(220/cell.width,220/cell.height);small=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(256,256));tile.alpha_composite(small,((256-small.width)//2,(256-small.height)//2));tiles.append(('travel'+str(col)+'_'+d,tile))
    fxclips=[{'name':d,'frames':['travel'+str(i)+'_'+d for i in range(4)],'fps':12.5,'loop':True} for d in DIRECTIONS]
    pack('wind-'+kind+'-v2',tiles,[256,256],[.5,.5],fxclips,[{'path':str(raw.relative_to(ROOT)).replace('\\','/'),'sha256':sha(raw)}],['Original generated '+kind+' wind silhouette; candidate alternative, director selection pending.'])
(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
(OUT/'catalogue.json').write_text(json.dumps({'assets':packs},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');locked();print(json.dumps({'packs':len(packs),'hammerDirections':len(registration),'frames':sum(len(c['frames']) for p in packs for c in p['clips'])}))
