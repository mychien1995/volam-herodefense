"""Export the director's single-ring revision without touching original actors/VFX."""
from pathlib import Path
from PIL import Image
import json,hashlib
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[2]
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def record(p):return {'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
source=BASE/'source/phat_quang_ring_feedback01.png'
image=Image.open(source).convert('RGBA');cuts=[]
for i in range(4):
 rect=(round(i*image.width/4),0,round((i+1)*image.width/4),image.height)
 cut=image.crop(rect);box=cut.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox();assert box
 cuts.append((rect,box,cut.crop(box)))
scale=min(180/max(c.width for _,_,c in cuts),116/max(c.height for _,_,c in cuts))
sheet=Image.new('RGBA',(768,148));frames={};records=[];derived=[]
folder=BASE/'feedback01';folder.mkdir(exist_ok=True)
for i,(rect,box,cut) in enumerate(cuts):
 cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
 frame=Image.new('RGBA',(192,128));frame.alpha_composite(cut,((192-cut.width)//2,(128-cut.height)//2))
 name=f'plain_ring_{i}';file=folder/f'{name}.png';frame.save(file);sheet.alpha_composite(frame,(i*192,0))
 frames[name]={'frame':{'x':i*192,'y':0,'w':192,'h':128},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':192,'h':128},'sourceSize':{'w':192,'h':128}}
 records.append({**record(file),'sourceCell':rect,'sourceBounds':box,'size':[192,128],'sharedScale':scale})
ringNames=list(frames)
# A short, uniform shaft crop avoids stretching the old projectile's point/root
# across the viewport when several full-circle finger rays fire together.
origins=json.loads((BASE/'ray_derivation.json').read_text(encoding='utf-8'))['cels']
beamNames=[]
for i,r in enumerate(origins):
 p=ROOT/r['source'];cy=r['rect'][1]+9;rect=(70,cy-9,78,cy+11)
 cut=Image.open(p).convert('RGBA').crop(rect);file=folder/f'thin_beam_{i}.png';cut.save(file);sheet.alpha_composite(cut,(i*8,128))
 name=f'thin_beam_{i}';beamNames.append(name)
 frames[name]={'frame':{'x':i*8,'y':128,'w':8,'h':20},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':8,'h':20},'sourceSize':{'w':8,'h':20}}
 derived.append({**record(file),'source':record(p),'rect':rect})
sheet.save(folder/'ring.png')
clips=[{'name':name,'frames':names,'durationMs':100,'repeat':0,'authoritativeHitEvents':[]} for name,names in [('plain_ring',ringNames),('thin_beam',beamNames)]]
dump(folder/'ring.json',{'frames':frames,'meta':{'image':'ring.png','size':{'w':768,'h':148}}})
dump(folder/'ring.animations.json',{'animations':clips})
feedback={'date':'2026-11-02','status':'prototype_pending_director_review','newSource':{**record(source),'generator':'built-in image_gen','license':'Original AI-assisted project artwork; no external pack or exclusive copyright claim'},'prompt':record(BASE/'source/phat_quang_ring_feedback01.prompt.json'),'frames':records,'derivedBeams':derived,'outputs':[record(folder/p) for p in ['ring.png','ring.json','ring.animations.json']],'notes':'Four original authored ring cels, one shared scale, center pivot (96,64), nearest sampling. Four short shaft crops and existing impact/stun-status rasters reused. No production gameplay integration.'}
dump(folder/'manifest.json',feedback)
data=json.loads((BASE/'data.json').read_text(encoding='utf-8'))
data['packages']=[p for p in data['packages'] if p['key']!='feedback01']+[{'key':'feedback01','base':'/assets/reviews/nam_de_v02/feedback01/ring','clips':clips,'origin':[.5,.5]}]
dump(BASE/'data.json',data)
m=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
m['feedback01']={'date':'2026-11-02','manifest':record(folder/'manifest.json'),'notes':'Plain ring, backlash explosion/stun, full-circle barrage, instant small ray'}
for r in m['outputs']:
 if r['path'].endswith('/data.json'):r.update(record(BASE/'data.json'))
dump(BASE/'manifest.json',m)
print(json.dumps({'status':'exported','newFrames':4,'sharedScale':scale,'sourceSize':image.size}))
