"""Extract/register generated ten-phase slam; prior artwork remains read-only."""
from pathlib import Path
import sys,json,hashlib,statistics
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v05/hammer-slam-v5'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
old=ROOT/'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4';oa=json.loads((old/'body.json').read_text())['frames'];oi=Image.open(old/'body.png').convert('RGBA')
def neutral(d):
 a=oa['idle_0_'+d];f=a['frame'];s=a['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(oi.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
def sole(im):
 p=np.array(im);r,g,b=[p[:,:,i].astype(float) for i in range(3)];a=p[:,:,3]>=24;boots=a&(r<180)&(g<140)&(b<115)&(r>g*1.1)&(r<g*2.55)&(g>b*1.12);boots[:int(im.height*.65)]=False
 count=boots.sum(axis=1);ys=np.flatnonzero(count>=max(4,float(count.max())*.18));assert len(ys);foot=int(ys[-1]);yy,xx=np.nonzero(boots[max(0,foot-10):foot+1]);x=(float(xx.min())+float(xx.max()))/2
 dense=a[:,max(0,round(x-im.height*.18)):min(im.width,round(x+im.height*.18))].sum(axis=1);top=int(np.flatnonzero(dense>=max(5,float(dense.max())*.18))[0]);return x,foot,top
locked();tiles={};records=[];sources=[{'path':(old/n).relative_to(ROOT).as_posix(),'sha256':sha(old/n)} for n in ['body.png','body.json']]
for d in ['right','down','down_right','up','up_right']:
 raw=SRC/'raw'/(d+'.png')
 if not raw.exists():continue
 cels=figures(raw,2,5);roots=[sole(im) for im,_ in cels];ratio=89/statistics.median(roots[i][1]-roots[i][2]+1 for i in [0,9]);mirror={'right':'left','down_right':'down_left','up_right':'up_left'}.get(d)
 for i,((im,_),(x,y,_)) in enumerate(zip(cels,roots)):
  small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(512,448));tile.alpha_composite(small,(round(256-x*ratio),round(320-y*ratio)))
  tiles[f'slam_{i}_{d}']=neutral(d) if i in [0,9] else tile
  if mirror:tiles[f'slam_{i}_{mirror}']=neutral(mirror) if i in [0,9] else tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 records.append({'direction':d,'scale':ratio,'roots':roots,'mirror':mirror});sources.append({'path':raw.relative_to(ROOT).as_posix(),'sha256':sha(raw)})
OUT.mkdir(parents=True,exist_ok=True);sheet=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
for n,t in tiles.items():
 box=t.getbbox();assert box[0]>2 and box[1]>2 and box[2]<510 and box[3]<446,(n,box);box=(box[0]-1,box[1]-1,box[2]+1,box[3]+1);crop=t.crop(box)
 if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
 assert y+crop.height+4<4096;sheet.alpha_composite(crop,(x+2,y+2));frames[n]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'trimmed':True,'rotated':False,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':512,'h':448}};x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
sheet.crop((0,0,maxx,maxy)).save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
directions=sorted(set(n.split('_',2)[2] for n in tiles));durations=[15,20,25,25,35,25,15,45,40,25]
clips=[{'name':'slam_'+d,'frames':[f'slam_{i}_{d}' for i in range(10)],'fps':1000/(sum(durations)/10),'durations':durations,'loop':False} for d in directions]
m={'id':'hammer-slam-v5','canvas':[512,448],'pivot':[.5,320/448],'clips':clips,'sources':sources,'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in tiles.items()],'status':'CANDIDATE_PENDING_DIRECTOR_REVIEW','notes':['Ten authored phases; exact retained neutral at first/final cel. Three left-facing groups derive by horizontal mirror.','Same anatomical scale per source, fixed foot. Only thrust/overhead are active server stages.']};(OUT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(records,indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'directions':directions}))
