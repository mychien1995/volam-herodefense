"""Reuse the v01 whole-cel preparation/packing functions; never re-export old art."""
from pathlib import Path
import ast, json, hashlib
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[6]
LEGACY = HERE.parents[1] / 'source/export_assets_v01.py'
# v01 is an executable script. Load its definitions without its generation calls.
tree = ast.parse(LEGACY.read_text(encoding='utf-8'))
nodes = []
for node in tree.body:
    if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
        break
    nodes.append(node)
ns = {'__file__': str(LEGACY)}
exec(compile(ast.Module(body=nodes, type_ignores=[]), str(LEGACY), 'exec'), ns)
pack, clean, load, dump, sha, rel = [ns[n] for n in ['pack', 'clean', 'load', 'dump', 'sha', 'rel']]
OUT = HERE.parent
extractions = []

def source_cells(filename, rows):
    path = HERE / filename
    im = clean(load(path))
    cuts = ns['bands'](im, rows)
    cells = []
    for r in range(rows):
        row = []
        for c in range(4):
            rect = [round(c*im.width/4), cuts[r], round((c+1)*im.width/4), cuts[r+1]]
            cell = im.crop(rect)
            row.append((cell, {'path': rel(path), 'rect': rect}))
        cells.append(row)
    return cells

def actors():
    cells = source_cells('poses_source.png', 3)
    standing = [im.getbbox()[3]-im.getbbox()[1] for im, _ in cells[1]]
    scale = 56 / float(np.median(standing))
    cels, clips = [], []
    for r, tag in enumerate(['staff_thrust_right', 'drink_down', 'sleep_down']):
        names = []
        for i, (im, src) in enumerate(cells[r]):
            # Retain the full connected character and weapon, discard backdrop islands.
            im = ns['isolate_actor'](im)
            b = im.getbbox()
            cut = im.crop(b)
            arr = np.array(cut)
            rgb = arr[:, :, :3].astype('int16')
            shoes = (rgb.max(2)<100) & (rgb.max(2)-rgb.min(2)<38) & (arr[:,:,3]>0)
            shoes[:round(cut.height*.82)] = False
            ys, xs = np.nonzero(shoes)
            rootx = float(np.median(xs)) if len(xs)>4 else cut.width/2
            cut = cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
            frame = Image.new('RGBA',(160,112))
            x, y = round(80-rootx*scale), 88-cut.height
            assert x>=1 and y>=1 and x+cut.width<159, (tag,i,x,y,cut.size)
            frame.paste(cut,(x,y))
            name = f'{tag}_{i}'
            src.update({'bbox':list(b),'scale':scale,'method':'whole authored cel, shared scale, shoe-root feet alignment, binary alpha'})
            cels.append((name,frame,src)); names.append(name); extractions.append(src)
        clips.append({'name':tag,'frames':names,'durationMs':100 if r==0 else 220,'repeat':0,'direction':'right' if r==0 else 'down','placement':'actor'})
    pack(OUT/'character','bac_cai_rework_character',cels,clips,(160,112),(80,88))

def dog():
    cells = source_cells('dog_source.png',5)
    scale = 44 / float(np.median([im.getbbox()[2]-im.getbbox()[0] for im,_ in cells[0]]))
    cels, clips = [], []
    for r,tag in enumerate(['idle_right','walk_right','bite_right','hurt_right','death_right']):
        names=[]
        for i,(im,src) in enumerate(cells[r]):
            b=im.getbbox();cut=im.crop(b)
            cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(96,80));frame.paste(cut,(48-cut.width//2,64-cut.height))
            name=f'{tag}_{i}';names.append(name)
            src.update({'bbox':list(b),'scale':scale,'method':'whole authored cel, shared sheet scale, native feet pivot'})
            cels.append((name,frame,src));extractions.append(src)
        clips.append({'name':tag,'frames':names,'durationMs':100 if r else 220,'repeat':-1 if r<2 else 0,'direction':'right','placement':'actor'})
    pack(OUT/'dog','bac_cai_black_dog',cels,clips,(96,80),(48,64))

def effects():
    cells=source_cells('vfx_source.png',5);cels=[];clips=[]
    for r,tag in enumerate(['qi_beam','pair_tether','field_impact','fire_dragon','clone_smoke']):
        names=[]
        # One scale for each coherent effect group; preserve its temporal extent.
        scale=.5
        for i,(im,src) in enumerate(cells[r]):
            cut=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(192,192));frame.paste(cut,((192-cut.width)//2,(192-cut.height)//2))
            name=f'{tag}_{i}';names.append(name)
            src.update({'scale':scale,'method':'authored VFX cell including particles, nearest sampling, binary alpha'})
            cels.append((name,frame,src));extractions.append(src)
        clips.append({'name':tag,'frames':names,'durationMs':100,'repeat':-1 if tag in ['pair_tether','fire_dragon'] else 0,'direction':'right' if r in [0,1,3] else 'ground','placement':'effect'})
    pack(OUT/'vfx','bac_cai_rework_vfx',cels,clips,(192,192),(96,96))

actors();dog();effects()
dump(OUT/'extraction_v02.json',extractions)
protected=[]
for folder in [ROOT/'assets/concepts/main-bosses/bac-cai',ROOT/'assets/sprites/bosses/main/bac-cai',ROOT/'assets/effects/bosses/main/bac-cai']:
    for p in sorted(folder.rglob('*')):
        if p.is_file() and OUT not in p.parents and p.suffix in ['.png','.json','.py']:
            protected.append({'path':rel(p),'sha256':sha(p)})
dump(OUT/'manifest.json',{
    'bossId':'bac_cai','version':'final-brief-preview-v02','status':'PROTOTYPE_PENDING_DIRECTOR_REVIEW',
    'scope':'art-only preview; no authoritative combat integration',
    'provenance':{'tool':'built-in image_gen','creator':'OpenAI image generation prompted by Codex for this project','rights':'Original generated assets subject to applicable OpenAI service terms; no third-party license claimed','editableSource':'retained flattened source PNGs and reproducible extraction, not layered Aseprite'},
    'sourceHashes':[{ 'path':rel(p),'sha256':sha(p)} for p in sorted(HERE.glob('*.png'))],
    'assets':ns['ASSETS'],'animations':ns['CLIPS'],'protectedExistingAssets':protected,
    'limitations':['New staff thrust is authored right-facing only; other facings use old staff-combo fallback, visibly disclosed.','Drinking and sleeping authored down-facing only.','Black dog authored right-facing; left uses horizontal flip; up/down still require production drawings.','Sleep holds the authored reclined cel after the sitting/reclining transition; separate breathing cels remain unauthored. No final art approval.','Preview targets and outcomes are scripted; no server, multiplayer or combat acceptance claimed.']})
print(json.dumps({'newFrames':52,'clips':13,'protectedExistingFiles':len(protected),'status':'PROTOTYPE_PENDING_DIRECTOR_REVIEW'}))
