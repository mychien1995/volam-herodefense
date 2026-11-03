"""Export newly generated RGBA cells; retain approved sources byte-for-byte."""
from pathlib import Path
from PIL import Image
import json, hashlib

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
OUT=BASE/'exports'
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
previous=read('assets/reviews/wave_boss_feedback_v01/data.json')
bundles=previous['bundles'].copy()
protected=read('assets/reviews/wave_boss_feedback_v01/manifest.json')['protected'].copy()
for p,h in read('assets/approved_wave_boss_feedback_v01.lock.json')['files'].items():
    assert digest(ROOT/p)==h,p
    protected[p]=h
new=[]
for name,width in [('snake_bolt',50),('poison_bolt',60),('gold_bolt',64),('spotlight',86)]:
    source=BASE/'source'/f'{name}.png'
    im=Image.open(source).convert('RGBA')
    cells=[im.crop((round(i*im.width/4),0,round((i+1)*im.width/4),im.height)) for i in range(4)]
    boxes=[c.getchannel('A').point(lambda a:255 if a>=80 else 0).getbbox() for c in cells]
    assert all(boxes),name
    box=(max(0,min(b[0] for b in boxes)-8),max(0,min(b[1] for b in boxes)-8),min(min(c.width for c in cells),max(b[2] for b in boxes)+8),min(im.height,max(b[3] for b in boxes)+8))
    scale=width/(box[2]-box[0]); size=(width,round((box[3]-box[1])*scale))
    sheet=Image.new('RGBA',(size[0]*4,size[1]));frames={};bounds={}
    for i,c in enumerate(cells):
        cel=c.crop(box).resize(size,Image.Resampling.NEAREST)
        cel.save(OUT/f'{name}_{i}.png');sheet.alpha_composite(cel,(i*size[0],0))
        frame=f'{name}_{i}';frames[frame]={'frame':{'x':i*size[0],'y':0,'w':size[0],'h':size[1]}}
        bounds[frame]=list(cel.getchannel('A').point(lambda a:255 if a>=80 else 0).getbbox())
    sheet.save(OUT/f'{name}.png');dump(OUT/f'{name}.json',{'frames':frames,'meta':{'image':f'{name}.png'}})
    bundles[name]={'image':'/'+(OUT/f'{name}.png').relative_to(ROOT).as_posix(),'frames':frames,'clips':{'loop':{'frames':list(frames),'durations':[100]*4,'repeat':-1}},'origin':[.5,.94] if name=='spotlight' else [.5,.5],'bounds':bounds}
    new.append({'id':name,'source':source.relative_to(ROOT).as_posix(),'sha256':digest(source),'sourceSize':list(im.size),'sharedCrop':list(box),'sharedScale':scale,'cellSize':list(size),'exportSha256':digest(OUT/f'{name}.png')})

def add(key,image,frames,clips,origin,metadata):
    image=image.lstrip('/');protected[image]=digest(ROOT/image)
    for p in metadata: protected[p]=digest(ROOT/p)
    normalized={}
    for c in clips:
        ns=c['frames'];normalized[c['name']]={'frames':ns,'durations':c.get('durationsMs') or c.get('durations') or [1000/c.get('fps',c.get('frameRate',10))]*len(ns),'repeat':c.get('repeat',-1 if c.get('loop') else 0)}
    bundles[key]={'image':'/'+image,'frames':frames,'clips':normalized,'origin':origin}

# Exact retained dungeon actor cels: this gallery demonstrates the shared shout treatment.
chu=read('apps/game-client/src/chu-art.generated.json')['bundles']
for k in ['base','boss']:
    b=chu[k];clips=b.get('clips') or b['animations']
    if isinstance(clips,dict):clips=[{'name':n,**v} for n,v in clips.items()]
    add('dungeon_chu_'+k,b['image'],b['frames'],clips,b['origin'],['apps/game-client/src/chu-art.generated.json'])
kim=read('assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json')['bundles']
for k in ['kim_luan_base','kim_luan_actions']:
    b=kim[k];add('dungeon_'+k,b['image'],b['frames'],b['clips'],b['origin'],['assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json'])
lm='assets/sprites/bosses/ly-mac-sau/'
meta=read(lm+'animations.json')
add('dungeon_ly',lm+'spritesheet.png',read(lm+'atlas.json')['frames'],[{'name':n,**v} for n,v in meta['animations'].items()],[.5,.8],[lm+'animations.json',lm+'atlas.json'])
hm=read('assets/exports/bosses/hoan_nhan_hong_liet_v01/manifest.json')
for b in hm['assets']:
    if b['id'] not in ['boss_locomotion','boss_casts']:continue
    atlas=read(b['atlas']);meta=read(b['animations']) if isinstance(b.get('animations'),str) else b
    clips=meta.get('animations',meta.get('clips',[]))
    if isinstance(clips,dict):clips=[{'name':n,**v} for n,v in clips.items()]
    if not clips:
        for direction in ['down','left','right','up']:
            for pose in (['idle','walk'] if b['id']=='boss_locomotion' else ['stomp','command']):
                ns=[n for n in atlas['frames'] if n.startswith(direction+'_'+pose+'_')]
                if ns: clips.append({'name':pose+'_'+direction,'frames':ns,'fps':4 if pose=='idle' else 8,'repeat':-1 if pose in ['idle','walk'] else 0})
    add('dungeon_hong_'+b['id'],b['sheet'],atlas['frames'],clips,meta.get('origin',[.5,.8]),[b['atlas']])

td=read('assets/reviews/tay_doc_v02/packages.json')
for key in ['snake8','newfx']:
    b=td[key];atlas=b['path'].lstrip('/')+'/'+b.get('atlas','atlas.json')
    add('td_'+key,b['path']+'/'+b['image'],read(atlas)['frames'],[{'name':n,**v} for n,v in b['animations'].items()],b['origin'],[atlas,'assets/reviews/tay_doc_v02/packages.json'])

dump(BASE/'data.json',{'scope':'VISUAL_PREVIEW_ONLY','bundles':bundles})
runtime={}
for directory in ['packages/game-core/src','packages/game-data/src','packages/game-protocol/src','apps/game-client/src','apps/game-server/src']:
    for p in (ROOT/directory).rglob('*'):
        if p.is_file() and p.suffix in ['.ts','.json','.css']:runtime[p.relative_to(ROOT).as_posix()]=digest(p)
dump(BASE/'manifest.json',{'status':'CANDIDATE_PENDING_DIRECTOR_REVIEW','scope':'Standalone VFX preview; no runtime integration or authoritative mechanics','generator':'built-in image_gen','sourceFormat':'Original generated RGBA PNG strips; common-crop/common-downscale atlas export, no repainted pixels or layered-source claim','license':'Original AI-assisted project assets subject to applicable service terms. Retained art keeps its existing provenance.','new':new,'protected':protected,'productionBaseline':runtime,'recordingsCreated':False,'runtimeIntegrated':False})
print(json.dumps({'bundles':len(bundles),'newAssets':new,'protected':len(protected),'productionBaseline':len(runtime)}))
