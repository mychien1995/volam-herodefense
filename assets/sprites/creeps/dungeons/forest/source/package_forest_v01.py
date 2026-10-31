"""Forest-only packaging of retained generated cels; no artwork generation or gameplay.

Reuses the existing Beach connected-alpha extractor, anchor/atlas writer and
Aseprite assembly recipe. Originals are retained; selected frames are sampled
nearest, with one fixed scale per direction, never synthesized from transforms.
"""
from pathlib import Path
import argparse, importlib.util, json, statistics, subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[6]
HERE = Path(__file__).resolve().parent
OUT = HERE.parent
CONCEPT = ROOT / 'assets/concepts/dungeon-creeps/forest'
FX = ROOT / 'assets/effects/dungeons/forest'
REVIEW = ROOT / 'assets/reviews/forest_creeps_v01'
helper_path = ROOT / 'assets/sprites/creeps/dungeons/beach/source/package_beach_v01.py'
spec = importlib.util.spec_from_file_location('existing_raster_pipeline', helper_path)
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)
pipeline.ROOT = ROOT
pipeline.EDITABLE = []
pipeline.SOURCE_ISSUES = []
DIRS = ['down', 'left', 'right', 'up']
STATES = [('idle', 0, 2, 350), ('walk', 2, 4, 120),
          ('basic_attack', 6, 4, 100), ('hurt', 10, 2, 140), ('death', 12, 4, 170)]
ENEMIES = {
 'truc_xa': ('Trúc Xà', 60, 'longest', 'v01'),
 'doc_chu': ('Độc Chu', 56, 'width', 'v01'),
 'son_vien': ('Sơn Viên', 48, 'height', 'v01'),
 'truc_lam_kiem_khach': ('Trúc Lâm Kiếm Khách', 44, 'height', 'v02'),
 'moc_linh': ('Mộc Linh', 50, 'height', 'v01'),
 'truc_yeu': ('Trúc Yêu', 56, 'height', 'v01'),
}
LICENSE = 'Original AI-assisted project raster artwork generated with OpenAI built-in image_gen; no third-party pack or exclusive copyright claim.'

def rel(p): return p.relative_to(ROOT).as_posix()
def write(p, value): pipeline.write(p, value)

def package_actor(key):
    name, target, axis, concept_version = ENEMIES[key]
    folder = OUT/key
    folder.mkdir(parents=True, exist_ok=True)
    frames, tags, animations, scales = [], [], [], {}
    canvas = [192 if key=='truc_yeu' else 144, 128]
    pivot = [canvas[0]//2,106]
    sources = []
    sheet_source = HERE/f'{key}_sprites_source_v01.png'
    sheet_cells = None
    if key != 'truc_xa' and sheet_source.exists() and not all((HERE/f'{key}_{d}_source_v01.png').exists() for d in DIRS):
        sheet_cells = pipeline.grid_cells(sheet_source,8,8,threshold=245)
        sources.append({'path':rel(sheet_source),'sha256':pipeline.digest(sheet_source),'layout':[8,8]})
    for direction in DIRS:
        source = HERE/f'{key}_{direction}_source_v01.png'
        corrected = HERE/f'{key}_{direction}_source_v02.png'
        if corrected.exists(): source = corrected
        if source.exists():
            sources.append({'path':rel(source), 'sha256':pipeline.digest(source),'layout':[4,4]})
            cells = pipeline.grid_cells(source, 4, 4, threshold=245)
        elif sheet_cells is not None:
            index=DIRS.index(direction)*16
            cells=sheet_cells[index:index+16]
        else: raise FileNotFoundError(source)
        idle = [v['image'] for v in cells[:2]]
        def body_measure(im):
            if key=='truc_lam_kiem_khach':
                a=pipeline.np.array(im);yy,xx=pipeline.np.where(a[:,:,3]>0)
                rr=a[yy,xx,0].astype(float);gg=a[yy,xx,1].astype(float);bb=a[yy,xx,2].astype(float)
                boots=(yy>im.height*.65)&(rr>gg*1.08)&(gg>bb*1.05)&(gg>14)&(rr<190)
                if boots.sum()>4:return int(yy[boots].max())+1
            return max(im.size) if axis=='longest' else im.width if axis=='width' else im.height
        size = statistics.median(body_measure(im) for im in idle)
        scale = target/size
        scales[direction] = scale
        for state, first, count, duration in STATES:
            start = len(frames)
            for i in range(count):
                item = cells[first+i]
                anchor_kind='hai_tac' if key=='truc_lam_kiem_khach' else key
                im, extraction = pipeline.anchor(item, scale, canvas, pivot, state, anchor_kind)
                frames.append({'name':f'{state}_{direction}_{i}', 'duration':duration,
                               'image':im, 'extraction':extraction})
            tags.append({'name':f'{state}_{direction}', 'from':start, 'to':len(frames)-1,
                         'direction':'forward'})
            animations.append({'state':state, 'direction':direction,
                               'frames':[f['name'] for f in frames[start:]],
                               'frameRate':1000/duration,
                               'repeat':-1 if state in ['idle','walk'] else 0})
    records = pipeline.atlas(folder, frames, tags, canvas, pivot)
    atlas = json.loads((folder/'atlas.json').read_text('utf8'))
    atlas['meta']['app'] = 'Forest packaging using existing connected-alpha/atlas pipeline'
    write(folder/'atlas.json', atlas)
    manifest = {'schemaVersion':1, 'id':'forest_'+key, 'typeId':key, 'nameVi':name,
      'category':'enemy', 'status':'candidate', 'produced':True,
      'directorApproved':False, 'runtimeIntegrated':False, 'runtimeVerified':False,
      'sourceConcept':rel(CONCEPT/f'{key}_concept_{concept_version}.png'),
      'sheet':rel(folder/'spritesheet.png'), 'atlas':rel(folder/'atlas.json'),
      'source':rel(folder/'source'/f'{key}_v01.aseprite'),
      'frameWidth':canvas[0], 'frameHeight':canvas[1], 'feetPixels':pivot,
      'footPivot':[.5,106/128], 'displayScale':1, 'bodyTargetPixels':target,
      'bodyTargetAxis':axis, 'directions':DIRS, 'animations':animations,
      'anchorMethod':'Existing warm-boot detector excludes pale sword pixels' if key=='truc_lam_kiem_khach' else 'Median lower contact pixels from existing actor anchor helper',
      'frames':records, 'sourceScales':scales, 'generatedSources':sources,
      'provenance':{'method':'Retained original image_gen cels; connected-alpha245 extraction, fixed directional nearest sampling and anchored atlas packing.',
                    'license':LICENSE, 'prompts':rel(HERE/'generation_prompts_v01.json')},
      'reuse':{'mirroredDirections':[], 'syntheticAnimationFrames':0},
      'notes':['All poses use independent generated source cels. No server type registration or gameplay changes.',
               'Editable Aseprite contains extracted raster cels, not reconstructed illustration layers.',
               'Low creatures use the same declared bottom-contact anchor contract; physical collision is not encoded.']}
    write(folder/'manifest.json', manifest)
    preview = Image.new('RGBA',(canvas[0]*8,canvas[1]*8))
    for i,f in enumerate(frames): preview.paste(f['image'],(i%8*canvas[0],i//8*canvas[1]))
    preview.save(REVIEW/f'{key}_contact_sheet.png')
    print('Packaged', key, '64 cels /20 tags; scales',scales,flush=True)

def package_effects():
    groups={
      'truc_xa':['truc_xa_bite_contact','truc_xa_venom_release','truc_xa_venom_projectile_right','truc_xa_venom_impact'],
      'doc_chu':['doc_chu_fang_contact','doc_chu_poison_impact','doc_chu_web_projectile_right','doc_chu_web_impact'],
      'son_vien':['son_vien_windup_dust','son_vien_slam_impact','son_vien_dust_burst','son_vien_pebble_scatter'],
      'truc_lam_kiem_khach':[f'truc_lam_kiem_khach_slash_{d}' for d in DIRS],
      'moc_linh':['moc_linh_root_emerge','moc_linh_leaf_burst','moc_linh_wood_impact','moc_linh_bark_fragments'],
      'truc_yeu':[f'truc_yeu_slash_{d}' for d in DIRS],
      'contacts':['truc_lam_kiem_khach_sword_contact','truc_lam_kiem_khach_leaf_burst','truc_yeu_splinter_impact','truc_yeu_thorn_projectile_right'],
    }
    frames,tags,sequences,sources=[],[],[],[]
    for page,names in groups.items():
        source=FX/'source'/f'{page}_vfx_source_v01.png'
        raw=Image.open(source).convert('RGBA');raw.load()
        sources.append({'path':rel(source),'sha256':pipeline.digest(source),'layout':[4,4]})
        for row,name in enumerate(names):
            start=len(frames)
            for i in range(4):
                box=(round(i*raw.width/4),round(row*raw.height/4),round((i+1)*raw.width/4),round((row+1)*raw.height/4))
                im=raw.crop(box);im.putalpha(im.getchannel('A').point(lambda a:255 if a>=200 else 0))
                # Normalize invisible RGB so preview tools cannot display discarded haze.
                pixels=pipeline.np.array(im);pixels[pixels[:,:,3]==0]=0;im=Image.fromarray(pixels)
                scale=96/max(im.size)
                im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
                canvas=Image.new('RGBA',(128,128));canvas.paste(im,((128-im.width)//2,(128-im.height)//2))
                frames.append({'name':f'{name}_{i}','duration':90,'image':canvas,'extraction':{'source':rel(source),'sourceCell':row*4+i,'sourceRect':list(box),'fixedSourceScale':scale,'alphaThreshold':200}})
            tags.append({'name':name,'from':start,'to':len(frames)-1,'direction':'forward'})
            projectile='projectile' in name
            directional='_slash_' in name
            direction=name.rsplit('_',1)[1] if directional or projectile else 'shared'
            ground=any(s in name for s in ['dust','slam','pebble','root','wood_impact','bark','splinter','web_impact'])
            offsets={'down':[0,-4],'left':[-22,-22],'right':[22,-22],'up':[0,-40]}
            owner=next(key for key in ENEMIES if name.startswith(key+'_'))
            sequences.append({'name':name,'ownerTypeId':owner,'frames':[f'{name}_{i}' for i in range(4)],
                'durationMs':90,'frameRate':1000/90,'repeat':-1 if projectile else 0,'direction':direction,
                'origin':[.5,.5],'offset':offsets.get(direction,[0,0]),'placement':'ground' if ground else 'contact',
                'stage':'flight' if projectile else 'windup' if 'windup' in name else 'release' if 'release' in name else 'contact',
                'rotationAllowed':projectile,'authority':'presentation-only; no damage/status/projectile logic'})
    records=pipeline.atlas(FX,frames,tags,[128,128],[64,64])
    atlas=json.loads((FX/'atlas.json').read_text('utf8'));atlas['meta']['app']='Forest VFX using retained generated cels';write(FX/'atlas.json',atlas)
    write(FX/'manifest.json',{'schemaVersion':1,'id':'forest_creep_vfx_v01','status':'candidate','directorApproved':False,
        'runtimeIntegrated':False,'runtimeVerified':False,'sheet':rel(FX/'spritesheet.png'),'atlas':rel(FX/'atlas.json'),
        'source':rel(FX/'source/forest_v01.aseprite'),'frameSize':[128,128],'displayScale':1,
        'sequences':sequences,'frames':records,'generatedSources':sources,'provenance':{'license':LICENSE,'prompts':rel(HERE/'generation_prompts_v01.json')},
        'reuse':{'directionalSlashFrames':'Independently authored down/left/right/up sources; no rotated/mirrored slash cels',
                 'sharedImpacts':'Nondirectional contact/ground bursts reused across facings','projectiles':'Right-facing flight art; later presentation may rotate once toward authoritative launch vector.'}})
    print('Packaged VFX:112 cels /28 sequences',flush=True)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--enemy', choices=list(ENEMIES))
    parser.add_argument('--effects',action='store_true')
    args=parser.parse_args()
    REVIEW.mkdir(parents=True,exist_ok=True)
    selected=[] if args.effects else [args.enemy] if args.enemy else list(ENEMIES)
    for key in selected: package_actor(key)
    if args.effects:package_effects()
    recipe=HERE/'editable_source_recipe_v01.json'
    write(recipe,pipeline.EDITABLE)
    lua=helper_path.parent/'assemble_beach_v01.lua'
    result=subprocess.run(['C:/Program Files/Aseprite/Aseprite.exe','-b','--script-param',f'root={ROOT.as_posix()}',
        '--script-param',f'recipe={recipe.as_posix()}','--script',str(lua)],capture_output=True,text=True,creationflags=0x08000000)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    print(result.stdout.strip(),flush=True)
    jobs=[]
    original=HERE/'generation_requests_v01.json'
    if original.exists():jobs.extend(json.loads(original.read_text('utf8')))
    jobs.extend(json.loads(p.read_text('utf8')) for p in sorted(HERE.glob('*_request.json')))
    for job in jobs:
        p=ROOT/job['projectPath']
        job['sha256']=pipeline.digest(p)
        job['referenceHashes']={ref:pipeline.digest(ROOT/ref) for ref in job['references']}
        job['license']=LICENSE
    write(HERE/'generation_prompts_v01.json',jobs)
    assets=[json.loads((OUT/key/'manifest.json').read_text('utf8')) for key in ENEMIES if (OUT/key/'manifest.json').exists()]
    all_recipes=[]
    for m in assets+([json.loads((FX/'manifest.json').read_text('utf8'))] if (FX/'manifest.json').exists() else []):
        a=json.loads((ROOT/m['atlas']).read_text('utf8'))
        canvas=[m['frameWidth'],m['frameHeight']] if 'frameWidth' in m else m['frameSize']
        pivot=m.get('feetPixels',[64,64])
        all_recipes.append({'canvas':canvas,'pivot':pivot,'output':m['source'],'tags':a['meta']['frameTags'],
          'frames':[{'file':f['file'],'duration':a['frames'][f['name']]['duration']} for f in m['frames']]})
    write(recipe,all_recipes)
    write(OUT/'forest_manifest_v01.json',{'schemaVersion':1,'id':'bamboo_forest_creeps_v01',
      'status':'candidate','directorApproved':False,'runtimeIntegrated':False,'runtimeVerified':False,
      'scope':'Art production and isolated review only; not authoritative enemy registration.',
      'assets':assets,'sourceWarnings':pipeline.SOURCE_ISSUES,
      'effectsManifest':rel(FX/'manifest.json') if (FX/'manifest.json').exists() else None,
      'provenance':{'license':LICENSE,'prompts':rel(HERE/'generation_prompts_v01.json')},
      'reusedTooling':[rel(helper_path),rel(lua)]})
    write(REVIEW/'packaging_observations.json',{'selected':selected,'sourceWarnings':pipeline.SOURCE_ISSUES})
    print('Warnings',len(pipeline.SOURCE_ISSUES),flush=True)

if __name__=='__main__':main()
