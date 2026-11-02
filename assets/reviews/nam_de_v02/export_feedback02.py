"""Crop original telegraph pixels so the warned lane starts at the firing hand."""
from pathlib import Path
from PIL import Image
import json,hashlib
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[2];OUT=BASE/'feedback02';OUT.mkdir(exist_ok=True)
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def record(p):return {'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
cels=[]
for i in range(4):
 p=ROOT/f'assets/effects/bosses/main/nam-de/skills/nhat_duong_chi/frames/line_warning_{i}.png'
 image=Image.open(p).convert('RGBA');box=image.getchannel('A').getbbox();assert box
 cels.append((p,box,image.crop(box)))
w=max(c.width for _,_,c in cels)+4;h=max(c.height for _,_,c in cels)+4
sheet=Image.new('RGBA',(w*4,h));frames={};records=[]
for i,(p,box,cel) in enumerate(cels):
 frame=Image.new('RGBA',(w,h));offset=(2,(h-cel.height)//2);frame.alpha_composite(cel,offset)
 target=OUT/f'line_warning_{i}.png';frame.save(target);sheet.alpha_composite(frame,(i*w,0))
 name=f'line_warning_{i}';frames[name]={'frame':{'x':i*w,'y':0,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
 records.append({**record(target),'source':record(p),'sourceRect':box,'offset':offset})
sheet.save(OUT/'telegraph.png')
dump(OUT/'telegraph.json',{'frames':frames,'meta':{'image':'telegraph.png','size':{'w':w*4,'h':h}}})
clips=[{'name':'line_warning','frames':list(frames),'durationMs':120,'repeat':0,'authoritativeHitEvents':[]}]
dump(OUT/'telegraph.animations.json',{'animations':clips})
dump(OUT/'manifest.json',{'date':'2026-11-02','status':'prototype_pending_director_review','provenance':'Crop retained original image_gen telegraph cels only; no new painting, no new actor art. Original bytes remain unchanged.','frames':records,'size':[w,h],'outputs':[record(OUT/n) for n in ['telegraph.png','telegraph.json','telegraph.animations.json']]})
data=json.loads((BASE/'data.json').read_text(encoding='utf-8'))
data['packages']=[p for p in data['packages'] if p['key']!='feedback02']+[{'key':'feedback02','base':'/assets/reviews/nam_de_v02/feedback02/telegraph','clips':clips,'origin':[.5,.5]}];dump(BASE/'data.json',data)
m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'));m['feedback02']={'date':'2026-11-02','manifest':record(OUT/'manifest.json'),'notes':'Slow sequential warned rotation; pressure dialog closes immediately on success/wrong input'}
for r in m['outputs']:
 if r['path'].endswith('/data.json'):r.update(record(BASE/'data.json'))
dump(BASE/'manifest.json',m)
print(json.dumps({'status':'exported','warningCels':4,'canvas':[w,h],'reusedOriginalPixels':True}))
