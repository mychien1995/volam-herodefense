"""Export compact-model sweep poses at a measured anatomical density."""
from pathlib import Path
import sys,json,hashlib,statistics
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v08/hammer-sweep-v8'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
locked();cfg=json.loads((SRC/'registration-config.json').read_text());old=ROOT/'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4';oi=Image.open(old/'body.png').convert('RGBA');oa=json.loads((old/'body.json').read_text())['frames'];sources=[old/'body.png',old/'body.json',SRC/'registration-config.json'];tiles={};records=[]
def neutral(d):
 a=oa['idle_0_'+d];f=a['frame'];s=a['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(oi.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
for d,rule in cfg['directions'].items():
 raw=SRC/'raw'/(d+'.png');sources.append(raw);cels=figures(raw,rule['rows'],rule['columns'])
 measured=rule['neutralLandmarks'];target={**cfg['target'],**rule.get('targetOverrides',{})};ratios=[target['headSpan']/measured['headSpan'],target['forearmCuffWidth']/measured['forearmCuffWidth'],target['neutralCrownToSole']/measured['crownToSole'],target['neutralNeckToBelt']/measured['neckToBelt']];ratio=statistics.median(ratios)
 assert max(ratios)/min(ratios)<1.08,(d,'source body proportions do not match the retained model',ratios)
 for index,sourceIndex in enumerate(rule['motionIndices'],1):
  im,b=cels[sourceIndex];x,y=rule['roots'][sourceIndex][0]-b[0],rule['roots'][sourceIndex][1]-b[1];scaled=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(512,448));tile.alpha_composite(scaled,(round(256-x*ratio),round(target['soleY']-y*ratio)));tiles[f'sweep_{index}_{d}']=tile
 records.append({'direction':d,'headSpanKind':rule['headSpanKind'],'targets':target,'scale':ratio,'ratios':ratios,'projectedLandmarks':{key:value*ratio for key,value in measured.items()},'sourceNeutralControlOnly':[0,5],'motionIndices':rule['motionIndices'],'roots':rule['roots']})
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 if f'sweep_1_{right}' in tiles:
  for i in range(1,5):tiles[f'sweep_{i}_{left}']=tiles[f'sweep_{i}_{right}'].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
directions=sorted({name.split('_',2)[2] for name in tiles})
for d in directions:
 for i in [0,5]:tiles[f'sweep_{i}_{d}']=neutral(d)
OUT.mkdir(parents=True,exist_ok=True);packed=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
for n,t in sorted(tiles.items()):
 b=t.getbbox();assert b and b[0]>2 and b[1]>2 and b[2]<510 and b[3]<446,(n,b);b=(b[0]-1,b[1]-1,b[2]+1,b[3]+1);crop=t.crop(b)
 if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
 assert y+crop.height+4<4096;packed.alpha_composite(crop,(x+2,y+2));frames[n]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':b[0],'y':b[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':512,'h':448}};x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
packed.crop((0,0,maxx,maxy)).save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
clips=[{'name':'sweep_'+d,'frames':[f'sweep_{i}_{d}' for i in range(6)],'durations':[25,60,85,85,80,40],'fps':16,'loop':False} for d in directions]
manifest={'id':'hammer-sweep-v8','canvas':[512,448],'pivot':[.5,320/448],'clips':clips,'sources':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources],'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in sorted(tiles.items())],'status':'COMPACT_MODEL_REDRAW_PENDING_GAME_REVIEW','notes':['Six source cels include two calibration idles that are not integrated; entry/recovery reuse exact retained neutral pixels.','Uniform anatomical density per direction from face/cuff/neutral torso landmarks, not weapon/hair extent. Left groups mirror corresponding right.','Timing 375ms, server beat 400ms and all existing lightning FX retained.']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(records,indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'directions':directions,'registration':records}))
