"""Reuse retained atlas bytes; export only new candidate cels, never approved inputs."""
from pathlib import Path
from PIL import Image
import hashlib
import json

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
OUT = BASE / 'exports'
OUT.mkdir(exist_ok=True)

def read(p):
    return json.loads((ROOT / p).read_text(encoding='utf-8'))

def record(p):
    return {'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}

def dump(p, d):
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

bundles = {}
protected = {}

def add(key, image, frames, clips, origin, metadata):
    image = image.lstrip('/')
    p = ROOT / image
    im = Image.open(p).convert('RGBA')
    normalized = {}
    bounds = {}
    for name, v in frames.items():
        r = v['frame']
        x, y, w, h = (r[k] for k in ['x', 'y', 'w', 'h'])
        assert x >= 0 and y >= 0 and x+w <= im.width and y+h <= im.height, (key, name)
        box = im.crop((x,y,x+w,y+h)).getchannel('A').point(lambda a: 255 if a >= 48 else 0).getbbox()
        assert box, (key, name, 'empty frame')
        bounds[name] = list(box)
    for c in clips:
        durations = c.get('durationsMs') or c.get('durations') or [c.get('durationMs', 1000/c.get('fps', 10))]*len(c['frames'])
        assert all(n in frames for n in c['frames'])
        normalized[c['name']] = {'frames': c['frames'], 'durations': durations, 'repeat': c.get('repeat', 0)}
    bundles[key] = {'image': '/'+image, 'frames': frames, 'clips': normalized, 'origin': origin, 'bounds': bounds}
    for file in [p, *(ROOT / s for s in metadata)]:
        protected[file.relative_to(ROOT).as_posix()] = record(file)['sha256']

dt = read('assets/reviews/bosses/dong_ta_v02/data.json')
for key in ['dong','mai','fan','dash','fx','maifx','hero','cai','thien']:
    b = dt['bundles'][key]
    add('dt_'+key, b['image'], b['frames'], b['clips'], b['origin'], ['assets/reviews/bosses/dong_ta_v02/data.json'])

td_path = 'assets/reviews/tay_doc_v02/packages.json'
td = read(td_path)
for key in ['p1','p2','newactor','fx1','fx2','fxt']:
    b = td[key]
    atlas = b['path']+'/'+b.get('atlas','atlas.json')
    add('td_'+key, b['path']+'/'+b['image'], read(atlas.lstrip('/'))['frames'],
        [{'name': n, **c} for n,c in b['animations'].items()], b['origin'], [atlas.lstrip('/'),td_path])

nd_path = 'assets/reviews/nam_de_v02/data.json'
for b in read(nd_path)['packages']:
    if b['key'] not in ['boss','palm','finger','rapid','rework','feedback01','feedback02']:
        continue
    atlas = b['base'].lstrip('/')+'.json'
    add('nd_'+b['key'], b['base']+'.png', read(atlas)['frames'], b['clips'], b['origin'], [atlas,nd_path])

for key, source in {
    'bc_boss':'assets/sprites/bosses/main/bac-cai/boss_bac_cai',
    'bc_dog':'assets/sprites/bosses/main/bac-cai/rework-v02/dog/bac_cai_black_dog',
    'bc_fx':'assets/sprites/bosses/main/bac-cai/rework-v02/vfx/bac_cai_rework_vfx',
    'bc_staff':'assets/effects/bosses/main/bac-cai/staff/bac_cai_staff',
    'bc_palm':'assets/effects/bosses/main/bac-cai/dragon-palms/bac_cai_dragon_palms',
}.items():
    meta = read(source+'.animations.json')
    add(key, source+'.png', read(source+'.json')['frames'], meta['animations'], meta['origin'], [source+'.json',source+'.animations.json'])

# Export isolated RGBA cells with shared source coordinates and shared downscale.
# No per-cel auto-fit, threshold painting, background removal or source mutation.
new = []
for name, target in [('nam_de_ring', 400), ('tay_doc_cloud_v2', 192)]:
    p = BASE/'source'/f'{name}.png'
    if not p.exists():
        raise FileNotFoundError(p)
    im = Image.open(p).convert('RGBA')
    cw,ch = im.width//2,im.height//2
    cells = [im.crop((i%2*cw,i//2*ch,(i%2+1)*cw,(i//2+1)*ch)) for i in range(4)]
    high = [c.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox() for c in cells]
    assert all(high), name
    max_width = max(b[2]-b[0] for b in high)
    scale = min(1, target/max_width)
    w,h = round(cw*scale),round(ch*scale)
    sheet = Image.new('RGBA',(w*4,h))
    frames = {}
    for i,cel in enumerate(cells):
        cel = cel.resize((w,h),Image.Resampling.NEAREST)
        file = OUT/f'{name}_{i}.png'
        cel.save(file)
        sheet.alpha_composite(cel,(i*w,0))
        n = f'{name}_{i}'
        frames[n] = {'frame':{'x':i*w,'y':0,'w':w,'h':h}}
    sheet.save(OUT/f'{name}.png')
    clip = {'name':'pulse' if name=='nam_de_ring' else 'loop', 'frames':list(frames), 'durationMs':130 if name=='nam_de_ring' else 180, 'repeat':0 if name=='nam_de_ring' else -1}
    atlas = {'frames':frames,'meta':{'image':f'{name}.png','size':{'w':w*4,'h':h}}}
    dump(OUT/f'{name}.json',atlas)
    add(name,'/'+(OUT/f'{name}.png').relative_to(ROOT).as_posix(),frames,[clip],[.5,.5],[])
    new.append({'id':name,'source':record(p),'sourceCell':[cw,ch],'outputCell':[w,h],'sharedScale':scale,'frames':[record(OUT/f'{name}_{i}.png') for i in range(4)]})

impact = BASE/'source/tay_doc_impact_v2.png'
im = Image.open(impact).convert('RGBA')
box = im.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
assert box
scale = min(1, 810/(box[2]-box[0]))
size = (round(im.width*scale),round(im.height*scale))
im.resize(size,Image.Resampling.NEAREST).save(OUT/'tay_doc_impact.png')
add('tay_doc_impact','/'+(OUT/'tay_doc_impact.png').relative_to(ROOT).as_posix(),{'rim':{'frame':{'x':0,'y':0,'w':size[0],'h':size[1]}}},[{'name':'rim','frames':['rim'],'durationMs':100,'repeat':0}],[.5,.5],[])
new.append({'id':'tay_doc_impact','source':record(impact),'outputCell':size,'sharedScale':scale,'note':'One native-sized outer rim layered with retained four-frame center impact and moving native poison fragments; not a new four-cel explosion.'})

dump(BASE/'data.json',{'scope':'VISUAL_PREVIEW_ONLY','bundles':bundles})
dump(BASE/'manifest.json',{'status':'CANDIDATE_PENDING_DIRECTOR_REVIEW','date':'2026-11-03','generator':'built-in image_gen','license':'Original AI-assisted project VFX, subject to OpenAI service terms; no external pack license asserted. Retained sources keep their existing provenance.','sourceFormat':'Flattened RGBA PNG; source prompts retained. No layered Aseprite source.','new':new,'protected':protected,'outputs':[record(p) for p in OUT.glob('*')],'runtimeIntegrated':False,'serverMechanics':False})
print(json.dumps({'bundles':len(bundles),'newAssets':len(new),'protectedFiles':len(protected)}))
