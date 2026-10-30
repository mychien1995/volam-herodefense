"""Audit inbox metadata and stage reviewed raster frames through Aseprite. Never resizes art."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess, sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / 'assets/approved_cai_bang.lock.json'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def baseline():
    lock = json.loads(LOCK.read_text(encoding='utf-8'))
    for name, expected in lock['files'].items():
        if digest(ROOT/name) != expected:
            raise ValueError(f'Approved baseline changed: {name}')
    return lock

def inside(name):
    path = (ROOT/name).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Asset paths must stay in the repository')
    return path

def audit():
    records = []
    for path in sorted((ROOT/'assets/inbox').rglob('*')):
        if not path.is_file(): continue
        item = {'file': path.relative_to(ROOT).as_posix(), 'sha256': digest(path)}
        try:
            with Image.open(path) as image:
                image.load()
                alpha = image.convert('RGBA').getchannel('A')
                item.update(resolution=list(image.size), format=image.format, mode=image.mode,
                            transparentPixels=alpha.histogram()[0], alphaRange=list(alpha.getextrema()))
        except Exception as error:
            item['error'] = str(error)
        records.append(item)
    target=ROOT/'assets/intake'; target.mkdir(parents=True, exist_ok=True)
    (target/'audit.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
    print(f'Audited {len(records)} files; genuine transparent images: {sum(r.get("transparentPixels",0)>0 for r in records)}')

def validate(recipe):
    if recipe.get('reviewed') is not True:
        raise ValueError('Visual review required; metadata alone does not approve art')
    asset_id=recipe['id']
    if not asset_id or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789_' for c in asset_id):
        raise ValueError('Use a stable ASCII snake_case ID')
    if asset_id.startswith('hero_cai_bang'):
        raise ValueError('Approved Cai Bang IDs are locked')
    w,h=recipe['canvas']; px,py=recipe['pivot']
    if w<=0 or h<=0 or not (0<=px<=w and 0<=py<=h): raise ValueError('Invalid canvas/pivot')
    if not recipe.get('source') or not recipe.get('license'): raise ValueError('Provenance required')
    frames=recipe['frames']
    if not frames: raise ValueError('Missing frames')
    fingerprints=[]
    for frame in frames:
        path=inside(frame['file'])
        with Image.open(path) as image:
            if image.format!='PNG': raise ValueError(f'Lossless PNG required: {path.name}')
            rgba=image.convert('RGBA')
            if recipe['kind']!='terrain' and rgba.getchannel('A').getextrema()[0]==255:
                raise ValueError(f'No real alpha transparency: {path.name}; checkerboard is not alpha')
            x,y,fw,fh=frame['rect']; ox,oy=frame['offset']
            if min(x,y,ox,oy)<0 or fw<=0 or fh<=0 or x+fw>image.width or y+fh>image.height:
                raise ValueError('Source frame bounds invalid')
            if ox+fw>w or oy+fh>h: raise ValueError('Frame would clip; use a larger canvas, never distort')
            crop=rgba.crop((x,y,x+fw,y+fh))
            if not crop.getchannel('A').getbbox(): raise ValueError('Empty frame')
            if frame['durationMs']<=0: raise ValueError('Invalid duration')
            fingerprints.append(hashlib.sha256(crop.tobytes()).hexdigest())
    seen=set()
    covered=set()
    for tag in recipe['tags']:
        if tag['name'] in seen: raise ValueError('Duplicate tag')
        seen.add(tag['name'])
        a,b=tag['from'],tag['to']
        if not (0<=a<=b<len(frames)): raise ValueError('Missing/out-of-range animation frame')
        if covered.intersection(range(a,b+1)): raise ValueError('Overlapping tags need separate source cels')
        covered.update(range(a,b+1))
        frames_duration(recipe,tag)
        if len(set(fingerprints[a:b+1]))!=b-a+1 and not tag.get('allowHeldFrames',False):
            raise ValueError('Duplicate frames; review holds explicitly')
    if recipe['kind']=='character':
        expected={f'{s}_{d}' for s in ['idle','walk','basic_attack'] for d in ['down','left','right','up']}
        if not expected.issubset(seen): raise ValueError('Character missing four-direction idle/walk/attack sequences')
    if covered!=set(range(len(frames))): raise ValueError('Untagged animation frames')
    return recipe

def process(recipe_path):
    baseline()
    recipe=validate(json.loads(inside(recipe_path).read_text(encoding='utf-8')))
    dest=ROOT/'assets/intake/staged'/recipe['id']
    if dest.exists(): raise ValueError('Staged ID already exists; preserve source and choose a new revision ID')
    binary=os.environ.get('ASEPRITE_PATH','C:/Program Files/Aseprite/Aseprite.exe')
    if not Path(binary).is_file(): raise ValueError('Set ASEPRITE_PATH to installed Aseprite')
    dest.mkdir(parents=True)
    # Preserve exact submitted recipe; referenced original PNGs remain untouched.
    (dest/'recipe.json').write_text(json.dumps(recipe,indent=2)+'\n',encoding='utf-8')
    params=['-b','--script-param',f'root={ROOT.as_posix()}','--script-param',f'recipe={inside(recipe_path).as_posix()}',
            '--script-param',f'output={dest.as_posix()}', '--script',str(ROOT/'scripts/asset-intake.lua')]
    subprocess.run([binary,*params],check=True,capture_output=True,text=True)
    subprocess.run([binary,'-b',str(dest/'source.aseprite'),'--list-tags','--list-slices','--sheet-type','rows',
                    '--sheet-columns','8','--filename-format','{tag}_{tagframe}','--format','json-hash',
                    '--sheet',str(dest/'sheet.png'),'--data',str(dest/'atlas.json')],check=True,capture_output=True,text=True)
    atlas=json.loads((dest/'atlas.json').read_text())
    atlas['meta']['image']='sheet.png'
    (dest/'atlas.json').write_text(json.dumps(atlas,indent=2)+'\n')
    if len(atlas['frames'])!=len(recipe['frames']): raise ValueError('Export frame count mismatch')
    animations=[]; names=list(atlas['frames'])
    for tag in recipe['tags']:
        if recipe['kind']=='character':
            state,direction=tag['name'].rsplit('_',1)
            animations.append(dict(state=state,direction=direction,frames=names[tag['from']:tag['to']+1],
                                   frameRate=1000/frames_duration(recipe,tag),repeat=-1 if state in ['idle','walk'] else 0))
    entry=dict(id=recipe['id'],category=recipe['kind'],status='prototype',reviewStatus='STAGED_NOT_INTEGRATED',source=str((dest/'source.aseprite').relative_to(ROOT)).replace('\\','/'),
               sheet='sheet.png',atlas='atlas.json',frameWidth=recipe['canvas'][0],frameHeight=recipe['canvas'][1],
               footPivot=[recipe['pivot'][0]/recipe['canvas'][0],recipe['pivot'][1]/recipe['canvas'][1]],
               license=recipe['license'],attribution=recipe['source'],animations=animations)
    (dest/'manifest.json').write_text(json.dumps(entry,indent=2)+'\n')
    baseline()
    print(f'STAGED ONLY: {recipe["id"]}; {len(names)} frames. Runtime installation requires first-batch visual review.')

def frames_duration(recipe,tag):
    values={f['durationMs'] for f in recipe['frames'][tag['from']:tag['to']+1]}
    if len(values)!=1: raise ValueError('Runtime frameRate requires equal durations per tag; split/review variable timing')
    return next(iter(values))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['audit','baseline','validate','process']);parser.add_argument('recipe',nargs='?')
    args=parser.parse_args()
    try:
        if args.action=='audit': audit()
        elif args.action=='baseline': baseline();print('PASS: approved baseline hashes unchanged')
        elif args.action=='validate': validate(json.loads(inside(args.recipe).read_text()));print('PASS: recipe preflight')
        else: process(args.recipe)
    except (ValueError,KeyError,OSError,subprocess.CalledProcessError) as error:
        print(f'BLOCKED: {error}',file=sys.stderr);sys.exit(1)
