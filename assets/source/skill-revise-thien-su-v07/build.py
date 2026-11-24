"""Normalize existing sweep art around its foot pivot; preserve original rasters."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[3];SRC=Path(__file__).parent;OUT=ROOT/'assets/exports/skill-revise-thien-su-v07/hammer-combo-v7'
sys.path.insert(0,str(ROOT/'tools'))
from hero_unified_assets import locked,figures
locked();old=ROOT/'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6';sheet=Image.open(old/'body.png').convert('RGBA');atlas=json.loads((old/'body.json').read_text())['frames'];prior=json.loads((old/'manifest.json').read_text())
factors={'right':1.35,'left':1.35,'down':1.12,'up':1.12,'down_right':1.22,'down_left':1.22,'up_right':1.12,'up_left':1.12}
source=ROOT/'assets/source/skill-revise-thien-su-v06';rules=json.loads((source/'registration-config.json').read_text())
raw={d:figures(source/'raw'/(d+'.png'),2,4) for d in rules}
review=ROOT/'assets/reviews/thien-su-reference-motion-2026-11-24/sweep';review_sheet=Image.open(review/'body.png').convert('RGBA');review_frames=json.loads((review/'body.json').read_text())['frames'];review_names=json.loads((review/'study.json').read_text())['frames']
tiles={};registration=[]
for name,a in atlas.items():
 f=a['frame'];s=a['spriteSourceSize'];t=Image.new('RGBA',(512,448));t.alpha_composite(sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']))
 stage,index,d=name.split('_',2);factor=factors[d] if stage=='sweep' and 0<int(index)<5 else 1
 if factor!=1 and d=='right':
  original=review_frames[review_names[int(index)-1]['name']];f=original['frame'];s=original['spriteSourceSize'];size=original['sourceSize'];full=Image.new('RGBA',(size['w'],size['h']));full.alpha_composite(review_sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])),(s['x'],s['y']))
  b=full.getbbox();body=full.crop(b);ratio=factor/4;scaled=body.resize((round(body.width*ratio),round(body.height*ratio)),Image.Resampling.LANCZOS);t=Image.new('RGBA',(512,448));t.alpha_composite(scaled,(round(256-(1024-b[0])*ratio),round(320-(1280-b[1])*ratio)))
 elif factor!=1 and d in rules:
  i=int(index)+3;body,b=raw[d][i];x,y=rules[d]['roots'][i][0]-b[0],rules[d]['roots'][i][1]-b[1];ratio=rules[d]['scale']*factor;scaled=body.resize((round(body.width*ratio),round(body.height*ratio)),Image.Resampling.LANCZOS);t=Image.new('RGBA',(512,448));t.alpha_composite(scaled,(round(256-x*ratio),round(320-y*ratio)))
 tiles[name]=t;registration.append({'frame':name,'densityCorrection':factor,'pivot':[256,320],'bounds':t.getbbox()})
for left,right in [('left','right'),('down_left','down_right'),('up_left','up_right')]:
 for i in range(1,5):tiles[f'sweep_{i}_{left}']=tiles[f'sweep_{i}_{right}'].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
OUT.mkdir(parents=True,exist_ok=True);packed=Image.new('RGBA',(4096,4096));frames={};x=y=rowh=maxx=maxy=0
for n,t in sorted(tiles.items()):
 b=t.getbbox();assert b and b[0]>2 and b[1]>2 and b[2]<510 and b[3]<446,(n,b)
 b=(b[0]-1,b[1]-1,b[2]+1,b[3]+1);crop=t.crop(b)
 if x+crop.width+4>4096:x=0;y+=rowh+4;rowh=0
 assert y+crop.height+4<4096;packed.alpha_composite(crop,(x+2,y+2));frames[n]={'frame':{'x':x+2,'y':y+2,'w':crop.width,'h':crop.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':b[0],'y':b[1],'w':crop.width,'h':crop.height},'sourceSize':{'w':512,'h':448}}
 x+=crop.width+4;rowh=max(rowh,crop.height);maxx=max(maxx,x);maxy=max(maxy,y+crop.height+4)
packed.crop((0,0,maxx,maxy)).save(OUT/'body.png');(OUT/'body.json').write_text(json.dumps({'frames':frames,'meta':{'image':'body.png','size':{'w':maxx,'h':maxy}}},indent=2)+'\n')
timings={'slam':[25,65,70,45,120,50],'sweep':[25,60,85,85,80,40]}
clips=[{**c,'durations':timings[c['name'].split('_',1)[0]],'fps':16} for c in prior['clips']]
inputs=[old/n for n in ['body.png','body.json','manifest.json']]+[review/n for n in ['body.png','body.json','study.json']]+[source/'registration-config.json']+[source/'raw'/(d+'.png') for d in rules]
manifest={**prior,'id':'hammer-combo-v7','clips':clips,'sources':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in inputs],'frames':[{'name':n,'sha256':hashlib.sha256(t.tobytes()).hexdigest()} for n,t in sorted(tiles.items())],'status':'REGISTERED_DENSITY_CORRECTION','densityCorrections':factors,'notes':['No new drawing. Sweep action cels re-exported from higher-density sources around fixed anatomical foot pivot; neutral and slam pixels retained.','375ms animation inside the newly approved 400ms server beat. Historical V06 bytes are preserved.']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(SRC/'registration.json').write_text(json.dumps(registration,indent=2)+'\n');locked();print(json.dumps({'frames':len(tiles),'durationMs':375,'densityCorrections':factors}))
