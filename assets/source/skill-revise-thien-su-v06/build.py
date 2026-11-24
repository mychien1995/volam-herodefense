"""Register approved poses plus directional redraws, preserving old artwork bytes."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import figures,locked
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
locked();sources={};tiles={};records=[]
old=ROOT/'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4'
def keep(path):sources[path.relative_to(ROOT).as_posix()]=sha(path)
def atlas_tiles(folder):
 atlas=json.loads((folder/'body.json').read_text())['frames'];sheet=Image.open(folder/'body.png').convert('RGBA')
 keep(folder/'body.png');keep(folder/'body.json')
 def get(name):
  f=atlas[name]['frame'];s=atlas[name]['spriteSourceSize'];size=atlas[name]['sourceSize'];t=Image.new('RGBA',(size['w'],size['h']));t.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']));return t
 return get
neutral=atlas_tiles(old)
for stage,folder in [('slam',ROOT/'assets/reviews/thien-su-reference-motion-2026-11-24'),('sweep',ROOT/'assets/reviews/thien-su-reference-motion-2026-11-24/sweep')]:
 reviewed=atlas_tiles(folder);spec=json.loads((folder/'study.json').read_text());keep(folder/'study.json')
 for i,f in enumerate(spec['frames']):
  # Resampling can retain RGB under alpha=0; atlas reconstruction canonicalizes it.
  tile=Image.new('RGBA',(512,448));tile.alpha_composite(reviewed(f['name']).resize((512,448),Image.Resampling.LANCZOS));tiles[f'{stage}_{i+1}_right']=tile
config=json.loads((SRC/'registration-config.json').read_text());keep(SRC/'registration-config.json')
for d,rule in config.items():
 raw=SRC/'raw'/(d+'.png');keep(raw);cels=figures(raw,2,4)
 for i,(im,box) in enumerate(cels):
  x,y=rule['roots'][i][0]-box[0],rule['roots'][i][1]-box[1];ratio=rule['scale']
  small=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(512,448));tile.alpha_composite(small,(round(256-x*ratio),round(320-y*ratio)))
  stage='slam' if i<4 else 'sweep';name=f'{stage}_{i%4+1}_{d}';tiles[name]=tile
  records.append({'frame':name,'sourceBounds':box,'sourceRoot':[x,y],'scale':ratio})
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 if f'slam_1_{right}' not in tiles:continue
 for stage in ['slam','sweep']:
  for i in range(1,5):tiles[f'{stage}_{i}_{left}']=tiles[f'{stage}_{i}_{right}'].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
directions=sorted({n.split('_',2)[2] for n in tiles})
for d in directions:
 for stage in ['slam','sweep']:
  tiles[f'{stage}_0_{d}']=neutral('idle_0_'+d);tiles[f'{stage}_5_{d}']=neutral('idle_0_'+d)
OUT.mkdir(parents=True,exist_ok=True);sheet=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
for n,t in sorted(tiles.items()):
 box=t.getbbox();assert box and box[0]>2 and box[1]>2 and box[2]<510 and box[3]<446,(n,'canvas clip',box)
 box=(box[0]-1,box[1]-1,box[2]+1,box[3]+1);crop=t.crop(box)
 if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
 assert y+crop.height+4<4096
 sheet.alpha_composite(crop,(x+2,y+2));frames[n]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'trimmed':True,'rotated':False,'spriteSourceSize':{'x':box[0],'y':box[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':512,'h':448}}
 x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
sheet.crop((0,0,maxx,maxy)).save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
timings={'slam':[20,50,55,35,90,35],'sweep':[20,45,65,65,60,30]}
clips=[{'name':stage+'_'+d,'frames':[f'{stage}_{i}_{d}' for i in range(6)],'durations':timings[stage],'fps':1000/(285/6),'loop':False} for stage in ['slam','sweep'] for d in directions]
manifest={'id':'hammer-combo-v6','canvas':[512,448],'pivot':[.5,320/448],'clips':clips,'sources':[{'path':p,'sha256':h} for p,h in sources.items()],'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in sorted(tiles.items())],'status':'DIRECTOR_APPROVED_RIGHT_POSES_DIRECTIONAL_INTEGRATION','notes':['Four reviewed poses per action, with exact retained neutral entry/recovery. No invented in-between animation.','Three left facings derive by horizontal mirror; source art and old body/FX bytes are preserved.','Server owns combat; timings only govern presentation.']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(records,indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'directions':directions,'durationMs':285}))
