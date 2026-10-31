"""Asset-only raster extraction. Requires Pillow and numpy; never imports the game."""
from pathlib import Path
import json
import hashlib
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[5]
BOSS = ROOT / 'assets/sprites/bosses/ly-mac-sau'
MINION = ROOT / 'assets/sprites/summons/co-mo-am-binh'
FX = ROOT / 'assets/effects/bosses/ly-mac-sau'
ENV = ROOT / 'assets/sprites/environment/co-mo-phai'
CONCEPT = ROOT / 'assets/concepts/arenas/co-mo-phai'
RECIPES = []

def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

def relative(path):
    return Path(path).relative_to(ROOT).as_posix()

def clean(image, threshold=80):
    a = np.array(image.convert('RGBA'))
    a[a[:, :, 3] < threshold] = 0
    return Image.fromarray(a)

def cells(path, rows, cuts=None):
    """Use source alpha gutters; no illustration or procedural replacement frames."""
    im = Image.open(path).convert('RGBA')
    a = np.array(im.getchannel('A')) > 100
    h, w = a.shape
    if cuts is None:
        cuts = [0]
        for r in range(1, rows):
            target = h * r / rows
            lo, hi = max(cuts[-1]+1, round(target-h/rows*.15)), min(h-1, round(target+h/rows*.15))
            counts = a[lo:hi].sum(axis=1)
            score = counts + np.abs(np.arange(lo,hi)-target)*.03
            cuts.append(int(np.argmin(score))+lo)
        cuts.append(h)
    result = []
    for row in range(rows):
        y0, y1 = cuts[row:row+2]
        xx = [0]
        counts = a[y0:y1].sum(axis=0)
        for col in range(1,4):
            target = w*col/4
            lo, hi = round(target-w/4*.16), round(target+w/4*.16)
            score = counts[lo:hi] + np.abs(np.arange(lo,hi)-target)*.04
            xx.append(int(np.argmin(score))+lo)
        xx.append(w)
        row_result = []
        for col in range(4):
            box = (xx[col], y0, xx[col+1], y1)
            cell = clean(im.crop(box))
            bbox = cell.getbbox()
            if bbox is None:
                raise ValueError(f'Empty source cell: {path}, {row}, {col}')
            row_result.append((cell.crop(bbox), {'source':relative(path), 'sourceCell':[row,col], 'sourceRect':[box[0]+bbox[0],box[1]+bbox[1],bbox[2]-bbox[0],bbox[3]-bbox[1]]}))
        result.append(row_result)
    return result

def foot(image):
    a = np.array(image)
    h,w = a.shape[:2]
    dark = (a[:,:,3]>100)&(a[:,:,:3].max(axis=2)<105)
    dark[:round(h*.72)] = False
    dark[:,:round(w*.22)] = False
    dark[:,round(w*.78):] = False
    yy,xx = np.where(dark)
    if len(yy)<4:
        return w/2,h-1
    y = int(np.quantile(yy,.98))
    xs = xx[yy>=y-4]
    return float(np.median(xs)), y

def place_actor(item, scale, canvas, pivot, frame_id):
    image, recipe = item
    fx,fy = foot(image)
    size=(max(1,round(image.width*scale)),max(1,round(image.height*scale)))
    resized=image.resize(size,Image.Resampling.NEAREST)
    x,y=round(pivot[0]-fx*scale),round(pivot[1]-fy*scale)
    if x<2 or y<2 or x+size[0]>canvas[0]-2 or y+size[1]>canvas[1]-2:
        raise ValueError(f'Export canvas clips {frame_id}: {(x,y,size)}')
    out=Image.new('RGBA',canvas)
    out.alpha_composite(resized,(x,y))
    RECIPES.append(dict(recipe,frame=frame_id,scale=scale,sourceFoot=[fx,fy],destination=[x,y],canvas=canvas,pivot=pivot))
    return out

def pack(directory, frames, animations, canvas, pivot, asset_id, extra=None):
    directory.mkdir(parents=True,exist_ok=True)
    (directory/'frames').mkdir(exist_ok=True)
    columns=8
    sheet=Image.new('RGBA',(columns*canvas[0], math.ceil(len(frames)/columns)*canvas[1]))
    atlas={}
    for index,(name,image,duration) in enumerate(frames):
        x,y=index%columns*canvas[0],index//columns*canvas[1]
        sheet.alpha_composite(image,(x,y))
        image.save(directory/'frames'/f'{name}.png')
        atlas[name]={'frame':{'x':x,'y':y,'w':canvas[0],'h':canvas[1]},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':canvas[0],'h':canvas[1]},'sourceSize':{'w':canvas[0],'h':canvas[1]},'duration':duration,'pivot':{'x':pivot[0]/canvas[0],'y':pivot[1]/canvas[1]}}
    sheet.save(directory/'spritesheet.png')
    save_json(directory/'atlas.json',{'frames':atlas,'meta':{'image':'spritesheet.png','size':{'w':sheet.width,'h':sheet.height},'scale':'1','format':'RGBA8888'}})
    save_json(directory/'animations.json',{'assetId':asset_id,'animations':animations,'timingAuthority':'Presentation suggestions only; server controls all combat.'})
    manifest={'id':asset_id,'status':'produced_asset_only_candidate','conceptApproval':'automatic_by_explicit_user_request_2026-10-31','runtimeIntegrated':False,'runtimeVerified':False,'runtimeApproved':False,'source':'Original built-in image_gen artwork; exact prompts retained in boss source directory. PNGs are flattened sources, not recovered layers.','license':'Original generated artwork supplied for this project; no third-party pack used; no exclusive copyright claim.','frameCount':len(frames),'canvas':canvas,'pivotPx':pivot,'origin':[pivot[0]/canvas[0],pivot[1]/canvas[1]],'sampling':'nearest','animations':list(animations),'sheet':'spritesheet.png','atlas':'atlas.json','animationData':'animations.json'}
    if extra: manifest.update(extra)
    save_json(directory/'manifest.json',manifest)
    # Static contact sheet only, never an animated recording.
    review=Image.new('RGB',sheet.size,(38,43,53))
    review.paste(sheet,(0,0),sheet)
    review.save(directory/'contact_sheet.png')

def actors():
    canvas,pivot=(144,128),(72,104)
    basics=cells(BOSS/'source/basic_attacks_v03.png',4)
    sweeps=cells(BOSS/'source/sweeps_v03.png',4)
    dirs=['down','left','right','up']
    frames=[]; animations={}
    state_rows=[('idle',0,[0,1],350,True),('hurt',0,[2,3],130,False),('walk',1,[0,1,2,3],110,True),('basic_attack',2,[0,1,2,3],90,False),('needle_cast',3,[0,1,2,3],140,False),('palm_channel',4,[0,1,2,3],220,False),('fast_sweep',5,[0,1,2,3],70,False),('summon_cast',6,[0,1,2,3],180,False),('death',7,[0,1,2,3],180,False)]
    for d_i,direction in enumerate(dirs):
        source=cells(BOSS/f'source/{direction}_source_v01.png',8)
        scale=56/source[0][0][0].height
        basic_scale=56/basics[d_i][0][0].height
        sweep_scale=56/sweeps[d_i][0][0].height
        for state,row,indices,duration,loop in state_rows:
            names=[]
            for i,col in enumerate(indices):
                item=source[row][col]; factor=scale
                if state=='basic_attack':
                    item=basics[d_i][i]; factor=basic_scale
                    # The generated left windup/recovery turned toward the right.
                    # Replace those two poses with newly authored left sweep poses.
                    if direction=='left' and i in (1,3):
                        item=sweeps[d_i][i];factor=sweep_scale
                    if direction=='up' and i==3:
                        item=source[0][1];factor=scale
                if state=='fast_sweep':
                    item=sweeps[d_i][i];factor=sweep_scale
                name=f'{state}_{direction}_{i}'
                image=place_actor(item,factor,canvas,pivot,name)
                frames.append((name,image,duration));names.append(name)
            animations[f'{state}_{direction}']={'frames':names,'durationsMs':[duration]*len(names),'loop':loop}
    pack(BOSS,frames,animations,canvas,pivot,'boss_ly_mac_sau',{'bodyHeightTargetPx':56,'directions':dirs,'channelHoldFrame':1,'channelReleaseFrame':2,'phase2':'Separate phase_two_activation VFX; no recolored body variant.'})

    frames=[];animations={};canvas,pivot=(112,112),(56,88)
    for filename,directions in [('down_right_source_v01.png',['down','right']),('left_up_source_v01.png',['left','up'])]:
        source=cells(MINION/'source'/filename,8)
        for half,direction in enumerate(directions):
            offset=half*4
            scale=44/source[offset][0][0].height
            for state,row,indices,duration,loop in [('idle',0,[0,1],350,True),('hurt',0,[2,3],130,False),('walk',1,[0,1,2,3],120,True),('basic_attack',2,[0,1,2,3],95,False),('death',3,[0,1,2,3],180,False)]:
                names=[]
                for i,col in enumerate(indices):
                    name=f'{state}_{direction}_{i}'
                    frames.append((name,place_actor(source[row+offset][col],scale,canvas,pivot,name),duration));names.append(name)
                animations[f'{state}_{direction}']={'frames':names,'durationsMs':[duration]*len(names),'loop':loop}
    pack(MINION,frames,animations,canvas,pivot,'summon_co_mo_am_binh',{'bodyHeightTargetPx':44,'spawnEffect':'co_mo_spawn','directions':['down','left','right','up']})

def effects():
    groups=[('bang_phach_source_v01.png',['needle_projectile','needle_spread','needle_poison_impact','poison_status','hp_drain','chilling_slow','needle_aoe_warning'],[0,195,470,735,995,1295,1470,1659]),('palm_sweep_source_v01.png',['palm_charge','palm_lane_warning','palm_projectile','palm_impact','sweep_cone_warning','duster_sweep_trail','melee_impact','basic_hit'],None),('summon_phase_source_v01.png',['co_mo_sigil','co_mo_spawn','phase_two_activation','edge_warning','edge_emission','ngu_doc_projectile','ngu_doc_impact','defeat_burst'],None)]
    frames=[];animations={};canvas=(160,160);pivot=(80,80)
    for filename,names,cuts in groups:
        source=cells(FX/'source'/filename,len(names),cuts)
        for row,name in enumerate(names):
            scale=min(112/max(x[0].width for x in source[row]),112/max(x[0].height for x in source[row]))
            ids=[]
            for i,(image,recipe) in enumerate(source[row]):
                image=image.resize((max(1,round(image.width*scale)),max(1,round(image.height*scale))),Image.Resampling.NEAREST)
                out=Image.new('RGBA',canvas)
                # Fixed logical VFX origin: row-scale is constant through all phases.
                xy=((canvas[0]-image.width)//2,(canvas[1]-image.height)//2)
                out.alpha_composite(image,xy)
                fid=f'{name}_{i}';ids.append(fid);frames.append((fid,out,100))
                RECIPES.append(dict(recipe,frame=fid,scale=scale,destination=xy,canvas=canvas,pivot=pivot))
            animations[name]={'frames':ids,'durationsMs':[100]*4,'loop':name in ['needle_projectile','poison_status','hp_drain','chilling_slow','palm_projectile','ngu_doc_projectile'],'canonicalDirection':'right' if name in ['needle_projectile','needle_spread','palm_lane_warning','palm_projectile','sweep_cone_warning','edge_warning','edge_emission','ngu_doc_projectile'] else None,'origin':[.5,.5]}
    pack(FX,frames,animations,canvas,pivot,'vfx_ly_mac_sau',{'projection':'Elevated orthographic; ground warnings are painted flattened shapes.','warningPlacement':'Canonical right points inward from west edge; mirror/rotate warning in later presentation only. Ground ellipse art must not be rotated as if a 3D plane.','channelHold':'palm_charge frame3 may be held as presentation while awaiting release event.'})

def environment():
    names=['male_founder_statue','female_founder_statue','tomb_school_arch','altar','lotus_pillar','faded_banner','jade_lantern','sword_rack','cave_wall_horizontal','cave_wall_vertical','cave_corner','stalagmites','stone_bench','funerary_urn','plum_vase','cave_rubble']
    source=cells(ENV/'source/props_source_v01.png',4,[0,357,700,978,1254])
    frames=[];props=[];canvas=(192,192);pivot=(96,168)
    for index,name in enumerate(names):
        item=source[index//4][index%4]
        # Uniform scenery-family source scale: full statues approximately110px tall.
        image=place_actor(item,.34,canvas,pivot,name)
        frames.append((name,image,0))
        image.save(ENV/f'{name}.png')
        props.append({'id':name,'file':f'{name}.png','canvas':canvas,'pivotPx':pivot,'collision':'Unspecified; later server/map author must define it.','occlusion':'Split foreground/canopy manually during integration if needed.'})
    pack(ENV,frames,{},canvas,pivot,'environment_co_mo_phai',{'props':props,'lighting':'upper-left, cool slate, faded crimson and jade lamps'})
    terrain=Image.open(ENV/'source/terrain_source_v01.png').convert('RGBA')
    tileset=Image.new('RGBA',(128,128));tile_names=['slab_clean_a','slab_clean_b','slab_clean_c','slab_clean_d','bedrock_a','bedrock_b','bedrock_c','bedrock_d','slab_damp','slab_moss','slab_fractured','slab_dust','lotus_engraving','border_horizontal','border_vertical','border_corner']
    tiles=[];(ENV/'tiles').mkdir(exist_ok=True)
    for i,name in enumerate(tile_names):
        c,r=i%4,i//4
        box=(round(c*terrain.width/4)+3,round(r*terrain.height/4)+3,round((c+1)*terrain.width/4)-3,round((r+1)*terrain.height/4)-3)
        tile=terrain.crop(box).resize((32,32),Image.Resampling.NEAREST)
        tile.save(ENV/'tiles'/f'{name}.png');tileset.alpha_composite(tile,(c*32,r*32))
        tiles.append({'id':i,'name':name,'file':f'tiles/{name}.png','sourceRect':list(box)})
    tileset.save(ENV/'terrain.png')
    save_json(ENV/'terrain.json',{'image':'terrain.png','tileWidth':32,'tileHeight':32,'columns':4,'tileCount':16,'sampling':'nearest','tiles':tiles,'seamStatus':'Authored tile candidates; exact inter-tile edge continuity is NOT certified. No automatic terrain transition masks.'})
    save_json(ENV/'terrain.tsj',{'type':'tileset','version':'1.10','name':'co_mo_phai','tilewidth':32,'tileheight':32,'tilecount':16,'columns':4,'image':'terrain.png','imagewidth':128,'imageheight':128,'margin':0,'spacing':0})

def layout():
    guide={'status':'art_layout_reference_only_not_a_playable_map','tileSize':32,'dimensionsTiles':[40,30],'origin':'top_left','projection':'square aligned elevated orthographic','centralCombatRectTiles':[6,6,28,18],'perimeterFiringLane':'Keep outer three walkable tiles on each arena edge clear.','bossSpawnTile':[20,14],'entranceExitTile':[20,28],'statueTiles':{'male':[9,3],'female':[31,3]},'altarTile':[20,3],'decorativeNoCombatBands':['north y0..4','west x0..3','east x36..39','south y26..29'],'edgeEmittersVisualGuide':{'west':[[4,8],[4,15],[4,22]],'east':[[35,8],[35,15],[35,22]],'north':[[10,5],[20,5],[30,5]],'south':[[10,25],[20,25],[30,25]]},'authoritativeGameplay':'Not defined. All collision, walkability, spawn rules, attack trajectories, timings and random selection remain for later server implementation.','layerProposal':['floor','ground_decals','wall_back','props_foot_sorted','actors_foot_sorted','foreground','warnings_and_effects'],'sourceOverview':'arena_overview_v01.png','overviewCaveat':'Concept-only scenic composition. Tiny illustrative figures in overview are not sprite sources or canonical weapon turnarounds.'}
    save_json(CONCEPT/'layout_guide.json',guide)
    # Static assembly from the actual exported art, not a runtime screenshot.
    preview=Image.new('RGBA',(1280,960),(26,29,37,255))
    for row in range(30):
        for col in range(40):
            tile_id=(row*7+col*3)%4 if 4<=col<=35 and 5<=row<=25 else 4+(row+col)%4
            tile=Image.open(ENV/'tiles'/f"{['slab_clean_a','slab_clean_b','slab_clean_c','slab_clean_d','bedrock_a','bedrock_b','bedrock_c','bedrock_d'][tile_id]}.png").convert('RGBA')
            preview.alpha_composite(tile,(col*32,row*32))
    for name,col,row in [('male_founder_statue',9,4),('female_founder_statue',31,4),('altar',20,4),('tomb_school_arch',20,29),('lotus_pillar',4,4),('lotus_pillar',35,4),('jade_lantern',4,11),('jade_lantern',35,11),('jade_lantern',4,21),('jade_lantern',35,21),('sword_rack',3,25),('stone_bench',36,25),('cave_corner',2,3),('cave_corner',38,3),('stalagmites',2,18),('stalagmites',38,18)]:
        prop=Image.open(ENV/f'{name}.png').convert('RGBA')
        preview.alpha_composite(prop,(col*32-96,row*32-168))
    for actor,path,col,row,pivot in [('boss',BOSS/'frames/idle_down_0.png',20,14,(72,104)),('minion',MINION/'frames/idle_down_0.png',15,17,(56,88)),('minion',MINION/'frames/idle_down_0.png',25,17,(56,88))]:
        image=Image.open(path).convert('RGBA');preview.alpha_composite(image,(col*32-pivot[0],row*32-pivot[1]))
    preview.convert('RGB').save(CONCEPT/'layout_asset_assembly_1x.png')

def main():
    actors();effects();environment();layout()
    save_json(BOSS/'source/extraction_recipes_v01.json',RECIPES)
    jobs=[]
    for file in sorted((BOSS/'source').glob('generation_prompts_*.json')):
        jobs.extend(json.loads(file.read_text(encoding='utf8')))
    save_json(BOSS/'source/generation_jobs_v01.json',jobs)
    print(json.dumps({'exported':'asset-only PNG/JSON/TSJ','bossFrames':128,'minionFrames':64,'vfxFrames':92,'props':16,'tiles':16,'recipes':len(RECIPES)}))

if __name__=='__main__':
    main()
