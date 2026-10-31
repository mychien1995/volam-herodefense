"""Beach-only raster extraction, periodic terrain preparation and atlas packaging.
Does not import, launch, register or change any game/runtime code.
Reconstruction only: do not rerun after manual source edits without preserving them.
"""
from pathlib import Path
from statistics import median
from collections import deque
import hashlib, json, math, shutil, subprocess
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[6]
HERE = Path(__file__).resolve().parent
ENV = ROOT/'assets/sprites/environment/beach'
TILES = ROOT/'assets/tilesets/beach'
FX = ROOT/'assets/effects/dungeons/beach'
CREEPS = HERE.parent
DIRECTIONS = ['down', 'left', 'right', 'up']
ENEMIES = [('cua_khong_lo','Cua Khổng Lồ'),('hai_xa','Hải Xà'),('hai_tac','Hải Tặc'),
           ('hai_tac_hoa_phao','Hải Tặc Hỏa Pháo'),('thuy_quy','Thủy Quỷ'),('hai_vu','Hải Vu')]
SOURCE_ISSUES = []
EDITABLE = []
CATALOGUE = []

def rel(p): return p.relative_to(ROOT).as_posix()
def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,p):
    p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p)
    return rel(p)

def retain_sources():
    jobs=[]
    for filename in ['generation_requests_v01.json','additional_requests_v01.json','shaman_requests_v01.json']:
        jobs.extend(json.loads((HERE/filename).read_text(encoding='utf8')))
    result={}
    for j in jobs:
        name=j['id']
        if name in ['environment_concept','layout_concept']:
            dest=ROOT/'assets/concepts/dungeon-environments/beach'/f'{name}_v01.png'
        elif name.endswith('_concept'):
            dest=ROOT/'assets/concepts/dungeon-creeps/beach'/f'{name}_v01.png'
        elif name=='terrain_source':dest=TILES/'source'/f'{name}_v01.png'
        elif name in ['natural_props_source','structures_source','portal_source']:
            dest=ENV/'source'/f'{name}_v01.png'
        elif name=='vfx_source':dest=FX/'source'/f'{name}_v01.png'
        else:dest=HERE/f'{name}_v01.png'
        source=Path(j.get('sourcePath',ROOT/j.get('projectPath','')))
        dest.parent.mkdir(parents=True,exist_ok=True)
        if not dest.exists():shutil.copy2(source,dest)
        result[name]=dest
        j['generatedFile']=source.name if 'sourcePath' in j else j.get('generatedFile',source.name)
        j.pop('sourcePath',None);j.pop('hint',None)
        j['projectPath']=rel(dest);j['sha256']=digest(dest)
        j['tool']='OpenAI built-in image_gen.imagegen'
        j['license']='Original AI-assisted project artwork; no external asset pack or exclusive copyright claim.'
    write(HERE/'generation_prompts_v01.json',jobs)
    # Saved requests now reference retained workspace files rather than machine-specific generated-image paths.
    write(HERE/'generation_requests_v01.json',[j for j in jobs if not j['id'].startswith(('crab_','shaman_'))])
    write(HERE/'additional_requests_v01.json',[j for j in jobs if j['id'].startswith('crab_')])
    write(HERE/'shaman_requests_v01.json',[j for j in jobs if j['id'].startswith('shaman_')])
    concept_log=ROOT/'assets/concepts/dungeon-creeps/beach/generation_prompts_v01.json'
    write(concept_log,[j for j in jobs if j['id'].endswith('_concept')])
    return result

def grid_cells(path, cols, rows, threshold=245):
    """Assign alpha-connected raster pieces to logical cells, retaining detached weapons.
    Component bounds rather than nominal cell crops prevent cutting pose extremities.
    """
    raw=np.array(Image.open(path).convert('RGBA'))
    h,w=raw.shape[:2]
    data=bytearray((raw[:,:,3]>=threshold).tobytes())
    groups=[[] for _ in range(cols*rows)]
    for i in range(w*h):
        if not data[i]:continue
        todo=[i];data[i]=0;pixels=[]
        while todo:
            k=todo.pop();pixels.append(k);x=k%w;y=k//w
            for z in ([k-1] if x else [])+([k+1] if x<w-1 else [])+([k-w] if y else [])+([k+w] if y<h-1 else []):
                if data[z]:data[z]=0;todo.append(z)
        if len(pixels)<8:continue
        xs=[k%w for k in pixels];ys=[k//w for k in pixels]
        cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2
        c=min(cols-1,int(cx/w*cols));r=min(rows-1,int(cy/h*rows))
        groups[r*cols+c].extend(pixels)
    cells=[]
    for index,pixels in enumerate(groups):
        if not pixels:raise ValueError(f'No original source pixels: {path.name}, cell {index}')
        xs=np.array(pixels,dtype=np.int64)%w;ys=np.array(pixels,dtype=np.int64)//w
        x0=int(xs.min());x1=int(xs.max())+1;y0=int(ys.min());y1=int(ys.max())+1
        arr=np.zeros((y1-y0,x1-x0,4),dtype=np.uint8)
        arr[ys-y0,xs-x0,:3]=raw[ys,xs,:3]
        arr[ys-y0,xs-x0,3]=255
        if x0==0 or y0==0 or x1==w or y1==h:
            SOURCE_ISSUES.append({'source':rel(path),'cell':index,'issue':'opaque silhouette reaches source boundary; inspect possible clipping'})
        if x1-x0>w/cols*1.6 or y1-y0>h/rows*1.65:
            SOURCE_ISSUES.append({'source':rel(path),'cell':index,'issue':'source component spans more than one nominal cell; continuity cleanup required'})
        cells.append({'image':Image.fromarray(arr),'rect':[x0,y0,x1-x0,y1-y0],
                      'source':rel(path),'cell':index})
    return cells

def anchor(item,scale,canvas,pivot,state,kind):
    im=item['image'];a=np.array(im)
    yy,xx=np.where(a[:,:,3]>0)
    bottom=int(yy.max())+1
    low=yy>=bottom-max(4,round(im.height*.15))
    # Warm boots exclude pale blades and blue casting effects from humanoid feet.
    if kind in ['hai_tac','hai_tac_hoa_phao','hai_vu'] and state!='death':
        rr=a[yy,xx,0].astype(float);gg=a[yy,xx,1].astype(float);bb=a[yy,xx,2].astype(float)
        warm=(yy>im.height*.65)&(rr>gg*1.08)&(gg>bb*1.05)&(gg>14)&(rr<190)
        if warm.sum()>4:
            bottom=int(yy[warm].max())+1
            low=warm&(yy>=bottom-5)
    footx=float(np.median(xx[low])) if low.any() else im.width/2
    nw=max(1,round(im.width*scale));nh=max(1,round(im.height*scale))
    out=Image.new('RGBA',canvas)
    x=pivot[0]-round(footx*scale);y=pivot[1]-round(bottom*scale)
    if x<2 or y<2 or x+nw>canvas[0]-2 or y+nh>canvas[1]-2:
        raise ValueError(f'Canvas would clip original pose: {kind}/{state}/{item["cell"]}')
    out.paste(im.resize((nw,nh),Image.Resampling.NEAREST),(x,y))
    return out,{'source':item['source'],'sourceCell':item['cell'],'sourceRect':item['rect'],
                'fixedSourceScale':scale,'sourceFootInCrop':[footx,bottom],'placement':[x,y]}

def atlas(folder, frames, tags, canvas, pivot, filename='spritesheet.png'):
    w,h=canvas;columns=10 if len(frames)>16 else min(4,len(frames))
    sheet=Image.new('RGBA',(w*columns,h*math.ceil(len(frames)/columns)))
    entries={};sourceframes=[]
    for i,f in enumerate(frames):
        im=f['image'];name=f['name'];x=i%columns*w;y=i//columns*h
        sheet.paste(im,(x,y))
        path=folder/'frames'/f'{name}.png';save(im,path)
        entries[name]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':False,
                       'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h},'duration':f['duration']}
        sourceframes.append({'file':rel(path),'duration':f['duration']})
        f['file']=rel(path);f['sha256']=digest(path)
    save(sheet,folder/filename)
    write(folder/'atlas.json',{'frames':entries,'meta':{'app':'Beach asset-only packaging',
          'version':'1','image':filename,'format':'RGBA8888','size':{'w':sheet.width,'h':sheet.height},
          'scale':'1','frameTags':tags,'slices':[{'name':'feet','keys':[{'frame':0,
          'bounds':{'x':0,'y':0,'w':w,'h':h},'pivot':{'x':pivot[0],'y':pivot[1]}}]}]}})
    output=folder/'source'/f'{folder.name}_v01.aseprite';output.parent.mkdir(exist_ok=True)
    EDITABLE.append({'canvas':canvas,'pivot':pivot,'frames':sourceframes,'tags':tags,'output':rel(output)})
    return [{'name':f['name'],'file':f['file'],'sha256':f['sha256'],
             'extraction':f.get('extraction',{})} for f in frames]

def actors(sources):
    result=[]
    for key,namevi in ENEMIES:
        folder=CREEPS/key;folder.mkdir(exist_ok=True)
        frames=[];tags=[];animations=[]
        groups={}
        if key in ['cua_khong_lo','hai_vu']:
            prefix='crab' if key=='cua_khong_lo' else 'shaman'
            for d in DIRECTIONS:groups[d]=grid_cells(sources[f'{prefix}_{d}_source'],4,4)
        else:
            cells=grid_cells(sources[key+'_sprites_source'],8,8)
            groups={d:cells[i*16:(i+1)*16] for i,d in enumerate(DIRECTIONS)}
        death=grid_cells(sources['gunner_death_alpha_source'],4,4) if key=='hai_tac_hoa_phao' else None
        up_walk=grid_cells(sources['shaman_up_walk_corrected_source'],2,2) if key=='hai_vu' else None
        canvas=[144,128];pivot=[72,106];source_scales={}
        for di,d in enumerate(DIRECTIONS):
            seq=groups[d]
            size=median([im['image'].width if key=='cua_khong_lo' else im['image'].height for im in seq[:2]])
            scale=(64 if key=='cua_khong_lo' else 48)/size
            source_scales[d]=scale
            for state,first,count,duration in [('idle',0,2,350),('walk',2,4,120),('basic_attack',6,4,100),('hurt',10,2,140),('death',12,4,170)]:
                start=len(frames)
                for i in range(count):
                    item=seq[first+i];s=scale
                    if up_walk and d=='up' and state=='walk':
                        item=up_walk[i]
                        s=48/median(v['image'].height for v in up_walk)
                    if death and state=='death':
                        item=death[di*4+i]
                        # Corrected kneeling source is drawn at a different resolution.
                        # One scale per directional four-pose group; never fit individual poses.
                        s=40/death[di*4]['image'].height
                    im,extract=anchor(item,s,canvas,pivot,state,key)
                    frames.append({'name':f'{state}_{d}_{i}','duration':duration,'image':im,'extraction':extract})
                tags.append({'name':f'{state}_{d}','from':start,'to':len(frames)-1,'direction':'forward'})
                animations.append({'state':state,'direction':d,'frames':[f['name'] for f in frames[start:]],
                                   'frameRate':1000/duration,'repeat':-1 if state in ['idle','walk'] else 0})
        records=atlas(folder,frames,tags,canvas,pivot)
        for d in DIRECTIONS:
            if key in ['hai_tac_hoa_phao','hai_vu']:
                extra=['aim','fire'] if key=='hai_tac_hoa_phao' else ['cast','water_attack']
                for ix,state in enumerate(extra):
                    animations.append({'state':state,'direction':d,
                      'frames':[f'basic_attack_{d}_{ix*2}',f'basic_attack_{d}_{ix*2+1}'],
                      'frameRate':10,'repeat':0,'relationship':'authored phase of basic_attack; same cels, no invented frames'})
        info={'id':'beach_'+key,'nameVi':namevi,'category':'enemy','status':'produced_asset_only',
              'conceptApproval':'Automatically approved by Phase 2C user instruction, 2026-10-31',
              'sourceConcept':f'assets/concepts/dungeon-creeps/beach/{key}_concept_v01.png',
              'sheet':rel(folder/'spritesheet.png'),'atlas':rel(folder/'atlas.json'),
              'source':rel(folder/'source'/f'{key}_v01.aseprite'),'frameWidth':144,'frameHeight':128,
              'bodyScaleReference':{'humanoidHeight':48,'crabWidth':64,'approvedHeroBodyHeight':44},
              'footPivot':[.5,106/128],'feetPixels':pivot,'directions':DIRECTIONS,'animations':animations,
              'frames':records,'sourceScales':source_scales,'runtimeIntegrated':False,'runtimeVerified':False,
              'notes':['Original generated cels; fixed nearest-neighbor scale per source direction; binary alpha245 cleanup.',
                       'Visual animation only. No damage, hit timing, status effect, spawn or collision rules.']}
        write(folder/'manifest.json',info);result.append({'id':key,'nameVi':namevi,'manifest':rel(folder/'manifest.json'),'frames':64})
        print('Packaged actor',key,flush=True)
    return result

def cut_prop(source,box,size):
    im=Image.open(source).convert('RGBA').crop(box)
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=245 else 0))
    bbox=im.getbbox()
    if not bbox:raise ValueError('Empty prop '+str(source))
    im=im.crop(bbox);im.thumbnail((size[0]-12,size[1]-12),Image.Resampling.NEAREST)
    out=Image.new('RGBA',size);out.paste(im,((size[0]-im.width)//2,size[1]-6-im.height))
    return out

def props(sources):
    a=sources['natural_props_source'];b=sources['structures_source']
    specs=[
      ('palm_tall',a,(0,0,362,450),(152,192)),('palm_broad',a,(362,0,724,420),(144,168)),
      ('tropical_bush',a,(724,0,1086,420),(96,72)),('coastal_grass',a,(1086,0,1448,420),(64,56)),
      ('coastal_rocks',a,(0,450,362,800),(96,80)),('cliff_formation',a,(362,420,724,800),(128,144)),
      ('coral',a,(724,420,1086,760),(64,64)),('seashells',a,(1086,420,1448,750),(48,40)),
      ('driftwood',a,(0,800,362,1086),(104,56)),('broken_boat',a,(362,800,724,1086),(144,96)),
      ('shipwreck_bow',a,(724,760,1120,1086),(176,144)),('shipwreck_mast',a,(1120,735,1448,1086),(128,160)),
      ('barrel',b,(0,0,362,360),(48,64)),('crate',b,(362,0,710,360),(56,56)),
      ('fishing_net',b,(710,0,1088,360),(96,96)),('rope_coil',b,(1088,0,1448,360),(64,56)),
      ('pirate_tent',b,(0,360,380,680),(160,144)),('pirate_camp_supplies',b,(380,360,710,680),(112,96)),
      ('wooden_bridge',b,(710,360,1120,660),(192,112)),('dock_pillars',b,(1120,360,1448,680),(80,104)),
      ('coastal_ruins',b,(0,680,452,1086),(176,144)),('weathered_lantern',b,(452,660,705,1086),(64,112)),
      ('pirate_banner',b,(705,650,1000,1086),(96,144)),('dungeon_entrance',b,(1000,670,1448,1086),(192,160)),
      ('dungeon_exit_portal',sources['portal_source'],(0,540,724,1086),(144,160))]
    records=[];atlasframes=[]
    # Fixed padded192px cells keep a conventional untrimmed scenery hash atlas.
    for name,source,box,size in specs:
        im=cut_prop(source,box,size);p=ENV/f'{name}.png';save(im,p)
        pivot=[size[0]//2,size[1]-6]
        records.append({'id':name,'file':rel(p),'dimensions':size,'feetPixels':pivot,
                        'footPivot':[.5,(size[1]-6)/size[1]],'source':rel(source),'sourceRect':list(box),
                        'status':'produced_asset_only'})
        canvas=Image.new('RGBA',(208,208));canvas.paste(im,((208-size[0])//2,202-size[1]))
        atlasframes.append({'name':name,'duration':1000,'image':canvas})
        out=ENV/'source'/f'{name}.aseprite'
        EDITABLE.append({'canvas':list(size),'pivot':pivot,'frames':[{'file':rel(p),'duration':1000}],
                         'tags':[],'output':rel(out)})
    atlas(ENV,atlasframes,[],[208,208],[104,196],'scenery.png')
    write(ENV/'manifest.json',{'status':'produced_asset_only','assets':records,
          'portalNote':'Static portal export selects the complete lower-left phase. No portal animation continuity claimed.',
          'sheet':rel(ENV/'scenery.png'),'atlas':rel(ENV/'atlas.json'),'runtimeIntegrated':False})
    return records

def terrain(sources):
    im=Image.open(sources['terrain_source']).convert('RGB');materials=[]
    names=['dry_sand','wet_sand','shallow_water','deep_water','rocky_coast','stone_path','coastal_grass','dock_horizontal',
           'seafoam','coral_sand','shell_sand','cliff_top','tidal_sand','shallow_water_b','deep_water_b','dock_vertical']
    for i,name in enumerate(names):
        x=i%4*im.width/4;y=i//4*im.height/4
        patch=im.crop((round(x+8),round(y+8),round(x+im.width/4-8),round(y+im.height/4-8)))
        patch=patch.resize((64,64),Image.Resampling.NEAREST)
        arr=np.array(patch)
        # Opposite four-pixel texture borders agree exactly; authored interiors stay intact.
        for k in range(4):
            edge=((arr[:,k].astype(np.uint16)+arr[:,63-k])/2).astype(np.uint8)
            arr[:,k]=edge;arr[:,63-k]=edge
        for k in range(4):
            edge=((arr[k].astype(np.uint16)+arr[63-k])/2).astype(np.uint8)
            arr[k]=edge;arr[63-k]=edge
        patch=Image.fromarray(arr).convert('RGBA');materials.append(patch)
        save(patch,TILES/'materials'/f'{name}.png')
    tiles=[];groups={}
    for i,name in enumerate(names):
        groups[name]={'firstTile':len(tiles),'count':4}
        canonical=np.array(materials[i])[:32,:32].copy()
        for k in range(2):
            edge=((canonical[:,k].astype(np.uint16)+canonical[:,31-k])/2).astype(np.uint8)
            canonical[:,k]=edge;canonical[:,31-k]=edge
        for k in range(2):
            edge=((canonical[k].astype(np.uint16)+canonical[31-k])/2).astype(np.uint8)
            canonical[k]=edge;canonical[31-k]=edge
        for phase in range(4):
            # Shared periodic32px boundary bands make every material variant tileable.
            arr=np.roll(np.array(materials[i]),(-phase*8,-phase*8),(0,1))
            arr=arr[:32,:32].copy()
            arr[:2]=canonical[:2];arr[-2:]=canonical[-2:]
            arr[:,:2]=canonical[:,:2];arr[:,-2:]=canonical[:,-2:]
            tile=Image.fromarray(arr);tiles.append(tile)
    families=[('sand_to_wet',0,1),('wet_to_water',1,2),('shallow_to_deep',2,3),
              ('sand_to_rock',0,4),('sand_to_stone',0,5),('sand_to_grass',0,6)]
    for name,a,b in families:
        groups[name]={'firstTile':len(tiles),'count':64,'masks':16,'phases':4,'cornerBitOrder':['NW','NE','SE','SW']}
        for mask in range(16):
            nw,ne,se,sw=[(mask>>k)&1 for k in range(4)]
            for phase in range(4):
                base=np.array(tiles[a*4+phase]).copy()
                upper=np.array(tiles[b*4+phase])
                yy,xx=np.mgrid[0:32,0:32]/31
                field=nw*(1-xx)*(1-yy)+ne*xx*(1-yy)+se*xx*yy+sw*(1-xx)*yy
                base[field>=.5]=upper[field>=.5]
                tiles.append(Image.fromarray(base))
    groups['water_edge_foam']={'firstTile':len(tiles),'count':64,'masks':16,'phases':4,'transparentOverlay':True}
    foam=np.array(materials[8])
    for mask in range(16):
        nw,ne,se,sw=[(mask>>k)&1 for k in range(4)]
        for phase in range(4):
            yy,xx=np.mgrid[0:32,0:32]/31
            field=nw*(1-xx)*(1-yy)+ne*xx*(1-yy)+se*xx*yy+sw*(1-xx)*yy
            v=foam[phase*8:phase*8+32,phase*8:phase*8+32].copy()
            white=(v[:,:,0]>150)&(v[:,:,1]>180)&(v[:,:,2]>170)
            v[:,:,3]=np.where((np.abs(field-.5)<.12)&white,255,0)
            tiles.append(Image.fromarray(v))
    cols=16;sheet=Image.new('RGBA',(cols*32,math.ceil(len(tiles)/cols)*32))
    for i,tile in enumerate(tiles):
        sheet.paste(tile,(i%cols*32,i//cols*32));save(tile,TILES/'tiles'/f'tile_{i:03d}.png')
    save(sheet,TILES/'terrain.png')
    animations=[]
    for name in ['shallow_water','deep_water','seafoam','shallow_water_b','deep_water_b']:
        first=groups[name]['firstTile']
        animations.append({'name':name,'tileid':first,'animation':[{'tileid':first+j,'duration':180} for j in range(4)],
                           'sourceMotion':'phase-shifted authored texture, not four independently redrawn water cels'})
    tiled={'name':'beach_terrain_v01','type':'tileset','version':'1.10','tilewidth':32,'tileheight':32,
           'tilecount':len(tiles),'columns':cols,'margin':0,'spacing':0,'image':'terrain.png',
           'imagewidth':sheet.width,'imageheight':sheet.height,'tiles':[{'id':v['tileid'],'animation':v['animation']} for v in animations]}
    write(TILES/'terrain.tsj',tiled)
    write(TILES/'terrain.json',{'tileSize':[32,32],'tileCount':len(tiles),'zeroBasedIds':True,'groups':groups,
          'animations':animations,'source':rel(sources['terrain_source']),
          'notes':['Material sources are authored rasters; edge conditioning and binary marching-square masks assemble reusable transitions.',
                   'Terrain is not a playable map. Semantic collision and navigability require later authoritative map authoring.',
                   'Foam mask0 and mask15 are intentionally empty: no shoreline crosses a uniform tile.']})
    EDITABLE.append({'canvas':[sheet.width,sheet.height],'pivot':[0,0],
      'frames':[{'file':rel(TILES/'terrain.png'),'duration':1000}], 'tags':[], 'output':rel(TILES/'source/terrain_v01.aseprite')})
    return {'sheet':rel(TILES/'terrain.png'),'metadata':rel(TILES/'terrain.json'),'tiledTileset':rel(TILES/'terrain.tsj'),
            'tileSize':[32,32],'tileCount':len(tiles)}

def effects(sources):
    names=['pincer_impact','sand_particles','serpent_bite','water_splash','pirate_slash','weapon_impact',
           'cannon_projectile','muzzle_flash','powder_smoke','cannon_impact','water_droplets','spectral_mist',
           'spectral_impact','water_projectile','magic_splash','aquatic_formation']
    # Tiny dispersed effects need their complete cell pixels, including detached particles.
    raw=Image.open(sources['vfx_source']).convert('RGBA');frames=[];tags=[]
    for gi,name in enumerate(names):
        start=len(frames)
        for j in range(4):
            index=gi*4+j;x=index%8;y=index//8
            box=(round(x*raw.width/8),round(y*raw.height/8),round((x+1)*raw.width/8),round((y+1)*raw.height/8))
            im=raw.crop(box);im.putalpha(im.getchannel('A').point(lambda a:255 if a>=200 else 0))
            im=im.resize((64,64),Image.Resampling.NEAREST)
            canvas=Image.new('RGBA',(80,80));canvas.paste(im,(8,8))
            frames.append({'name':f'{name}_{j}','duration':90,'image':canvas,
                           'extraction':{'source':rel(sources['vfx_source']),'sourceCell':index,'sourceRect':list(box)}})
        tags.append({'name':name,'from':start,'to':len(frames)-1,'direction':'forward'})
    records=atlas(FX,frames,tags,[80,80],[40,40])
    write(FX/'manifest.json',{'status':'produced_asset_only','sheet':rel(FX/'spritesheet.png'),'atlas':rel(FX/'atlas.json'),
      'frameSize':[80,80],'origin':[.5,.5],'sequences':[{'name':n,'frames':[f'{n}_{j}' for j in range(4)],
       'durationMs':90,'repeat':-1 if n in ['cannon_projectile','water_projectile'] else 0} for n in names],
       'frames':records,'runtimeIntegrated':False,
       'notes':['Projectile art points screen-right; later presentation may rotate toward authoritative launch vector without homing.',
                'No mechanics or status-effect behavior is encoded by this visual package.']})
    return {'sheet':rel(FX/'spritesheet.png'),'manifest':rel(FX/'manifest.json'),'sequences':len(names),'frames':64}

def main():
    for p in [ENV,TILES,FX]:p.mkdir(parents=True,exist_ok=True)
    sources=retain_sources()
    enemy_records=actors(sources)
    prop_records=props(sources)
    terrain_record=terrain(sources)
    effects_record=effects(sources)
    write(HERE/'editable_source_recipe_v01.json',EDITABLE)
    exe=Path('C:/Program Files/Aseprite/Aseprite.exe')
    run=subprocess.run([str(exe),'-b','--script-param',f'root={ROOT.as_posix()}',
       '--script-param',f'recipe={(HERE/"editable_source_recipe_v01.json").as_posix()}',
       '--script',str(HERE/'assemble_beach_v01.lua')],capture_output=True,text=True,creationflags=0x08000000)
    if run.returncode:raise RuntimeError(run.stdout+run.stderr)
    print(run.stdout.strip(),flush=True)
    manifest={'schemaVersion':1,'id':'beach_dungeon_phase2c_v01','date':'2026-10-31',
      'status':'produced_asset_only_pending_one_final_check','conceptApproval':'Automatically approved by the current user request.',
      'scope':'Beach asset production only; no map/runtime registration or gameplay changes.',
      'provenance':{'method':'Original OpenAI built-in image_gen raster artwork; connected-alpha extraction, nearest sampling, binary alpha cleanup, anchored atlas packing, Aseprite editable sources.',
        'license':'Original AI-assisted project artwork; no third-party pack or exclusive copyright claim.',
        'prompts':rel(HERE/'generation_prompts_v01.json')},
      'referencesInspected':['assets/references/vo_dang_character_reference.png','assets/references/sea_dungeon_reference.png',
        'assets/references/current_game_2026_10_29_placeholder_anti_reference.png',
        'assets/concepts/dungeon-environments/bamboo-forest/dungeon-overview.png','assets/exports/bamboo_forest/terrain.png',
        'assets/exports/characters/hero_cai_bang_idle.png','assets/sprites/creeps/arena/hoa-phap-su/spritesheet.png'],
      'missingReferences':['assets/references/vo_dang_art_direction_reference.png (available replacement: vo_dang_character_reference.png)',
        'Bamboo Forest enemy concepts/sprites absent in checkout','Desert approved artwork absent in checkout'],
      'environmentConcept':'assets/concepts/dungeon-environments/beach/environment_concept_v01.png',
      'mapLayoutReference':'assets/concepts/dungeon-environments/beach/layout_concept_v01.png',
      'bestiary':'assets/concepts/dungeon-creeps/beach/bestiary_concept_v01.png',
      'terrain':terrain_record,'props':prop_records,'enemies':enemy_records,'vfx':effects_record,
      'sourceWarnings':SOURCE_ISSUES,'runtimeIntegrated':False,'runtimeVerified':False,
      'sourceSelectionNotes':['Dense initial crab sheet superseded by four separate16-cel directional sources.',
        'Dense initial shaman sheet superseded by four separate16-cel directional sources without baked water waves.',
        'Shaman back walk uses corrected four-cel source with consistent viewer-right staff placement.',
        'Gunner blue-water death cels superseded by normal human-collapse alpha source.',
        'Static exit portal selects complete lower-left source phase; other phases remain retained sources.',
        'Only art references/data and asset-local Python/Lua packaging scripts are added.']}
    folders=[ROOT/'assets/concepts/dungeon-environments/beach',ROOT/'assets/concepts/dungeon-creeps/beach',TILES,ENV,CREEPS,FX]
    manifest['files']=[{'path':rel(p),'sha256':digest(p),'bytes':p.stat().st_size} for folder in folders
                       for p in sorted(folder.rglob('*')) if p.is_file() and p.name not in ['beach_manifest_v01.json','verification_v01.json']]
    write(CREEPS/'beach_manifest_v01.json',manifest)
    print('Packaged Beach:',len(enemy_records),'enemies;',len(prop_records),'props;',terrain_record['tileCount'],'tiles;64 VFX cels.',flush=True)
    print('Source warnings:',len(SOURCE_ISSUES),'(retained in manifest; final verification has not run).',flush=True)

if __name__=='__main__':main()
