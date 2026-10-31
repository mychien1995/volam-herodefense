"""Offline PNG slicing/packing only. Never imports or starts the game.

Retained image_gen drawings are the artwork. This script exports those drawings;
it does not synthesize character poses or replace missing animation with transforms.
Run from the repository root after generation_jobs.json has been populated.
"""
from pathlib import Path
import hashlib
import json
import math
import statistics
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
BOSS = ROOT / 'assets/sprites/bosses/hoan-nhan-hong-liet'
FX = ROOT / 'assets/effects/bosses/hoan-nhan-hong-liet'
ENV = ROOT / 'assets/sprites/environment/mongolian-headquarters'
TILES = ROOT / 'assets/tilesets/boss-arenas/mongolian-headquarters'
CONCEPT = ROOT / 'assets/concepts/arenas/mongolian-headquarters'
JOBS = json.loads((BOSS / 'generation_jobs.json').read_text('utf-8'))
inventory = []
observations = []

def rel(p):
    return Path(p).relative_to(ROOT).as_posix()

def write_json(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', 'utf-8')

def save(im, p):
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p)
    return p

def source(job):
    return Image.open(ROOT / JOBS[job]['destination']).convert('RGBA')

def cells(job, cols, rows):
    im = source(job)
    return [im.crop((round(c*im.width/cols), round(r*im.height/rows),
                     round((c+1)*im.width/cols), round((r+1)*im.height/rows)))
            for r in range(rows) for c in range(cols)]

def components(im):
    """Connected alpha runs preserve complete weapon tips across nominal cells."""
    a = np.array(im.getchannel('A')) > 24
    runs, parent, boxes, areas = [], [], [], []
    previous = []
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for y, row in enumerate(a):
        edge = np.diff(np.pad(row.astype(np.int8), (1,1)))
        starts, ends = np.where(edge == 1)[0], np.where(edge == -1)[0]
        current = []
        pi = 0
        for x0, x1 in zip(starts.tolist(), ends.tolist()):
            i = len(parent)
            parent.append(i); boxes.append([x0,y,x1,y+1]); areas.append(x1-x0)
            runs.append((y,x0,x1,i)); current.append((x0,x1,i))
            while pi < len(previous) and previous[pi][1] < x0:
                pi += 1
            j = pi
            while j < len(previous) and previous[j][0] <= x1:
                aa, bb = find(i), find(previous[j][2])
                if aa != bb:
                    parent[bb] = aa
                j += 1
        previous = current
    groups = {}
    for y,x0,x1,i in runs:
        k = find(i)
        g = groups.setdefault(k, {'box':[x0,y,x1,y+1], 'area':0, 'runs':[]})
        b = g['box']; b[0]=min(b[0],x0); b[1]=min(b[1],y)
        b[2]=max(b[2],x1); b[3]=y+1
        g['area'] += x1-x0; g['runs'].append((y,x0,x1))
    return list(groups.values())

def actor_cells(job, cols, rows):
    im = source(job)
    cw, ch = im.width/cols, im.height/rows
    found = {}
    for g in components(im):
        x0,y0,x1,y1 = g['box']
        if g['area'] < cw*ch*.055 or y1-y0 < ch*.19:
            continue
        c = min(cols-1, max(0, int((x0+x1)/2/cw)))
        r = min(rows-1, max(0, int((y0+y1)/2/ch)))
        idx = r*cols+c
        if idx not in found or g['area'] > found[idx]['area']:
            found[idx] = g
    result = []
    for idx in range(cols*rows):
        r,c = divmod(idx,cols)
        g = found.get(idx)
        if g is None or g['box'][2]-g['box'][0] > cw*1.6 or g['box'][3]-g['box'][1] > ch*1.65:
            crop = im.crop((round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch)))
            box = crop.getbbox()
            if not box:
                raise ValueError(f'Empty actor cell {job} {idx}')
            x0,y0,x1,y1 = box
            result.append((crop.crop(box), {'xRoot':cw/2-x0, 'sourceBox':[round(c*cw)+x0,round(r*ch)+y0,round(c*cw)+x1,round(r*ch)+y1], 'extraction':'grid_fallback'}))
            observations.append(f'{job}:{idx}: grid fallback; inspect boundary continuity before integration')
        else:
            x0,y0,x1,y1 = g['box']
            crop = im.crop(g['box'])
            mask = Image.new('L',crop.size)
            ma = np.zeros((crop.height,crop.width),dtype=np.uint8)
            for y,xx0,xx1 in g['runs']:
                ma[y-y0,xx0-x0:xx1-x0]=255
            original = np.array(crop.getchannel('A'))
            crop.putalpha(Image.fromarray(np.minimum(original,ma)))
            result.append((crop, {'xRoot':(c+.5)*cw-x0,'sourceBox':g['box'],'extraction':'connected_alpha'}))
    return result

def atlas(folder, identifier, animations, canvas, pivot, sources, extra=None):
    folder.mkdir(parents=True,exist_ok=True)
    frames, tags, records = {}, [], []
    flat = [(tag, i, im, duration) for tag,(ims,duration,loop) in animations.items() for i,im in enumerate(ims)]
    columns = 8
    sheet = Image.new('RGBA',(canvas[0]*columns, canvas[1]*math.ceil(len(flat)/columns)))
    n=0
    for tag,(ims,duration,loop) in animations.items():
        start=n
        for i,im in enumerate(ims):
            name=f'{tag}_{i}'
            x,y=(n%columns)*canvas[0],(n//columns)*canvas[1]
            sheet.alpha_composite(im,(x,y))
            save(im,folder/'frames'/f'{name}.png')
            frames[name]={'frame':{'x':x,'y':y,'w':canvas[0],'h':canvas[1]},'rotated':False,'trimmed':False,
                          'spriteSourceSize':{'x':0,'y':0,'w':canvas[0],'h':canvas[1]},
                          'sourceSize':{'w':canvas[0],'h':canvas[1]},'duration':duration,'pivot':{'x':pivot[0]/canvas[0],'y':pivot[1]/canvas[1]}}
            n+=1
        tags.append({'name':tag,'from':start,'to':n-1,'direction':'forward','repeat':0 if loop else 1})
        records.append({'id':tag,'frames':[f'{tag}_{i}' for i in range(len(ims))], 'frameDurationMs':duration,'loop':loop})
        hashes={hashlib.sha256(im.tobytes()).hexdigest() for im in ims}
        if len(ims)>1 and len(hashes)<2:
            raise ValueError(f'Repeated static animation: {identifier}:{tag}')
    save(sheet,folder/'spritesheet.png')
    data={'frames':frames,'meta':{'app':'offline authored-PNG export','version':'1','image':'spritesheet.png','format':'RGBA8888',
          'size':{'w':sheet.width,'h':sheet.height},'scale':'1','frameTags':tags,
          'slices':[{'name':'feet' if pivot[1]>.6*canvas[1] else 'center','keys':[{'frame':0,'bounds':{'x':0,'y':0,'w':canvas[0],'h':canvas[1]},'pivot':{'x':pivot[0],'y':pivot[1]}}]}]}}
    write_json(folder/'atlas.json',data)
    entry={'id':identifier,'status':'prototype','productionStatus':'produced_unintegrated','conceptApproval':'automatic_for_this_task',
           'runtimeVerified':False,'runtimeApproved':False,'image':rel(folder/'spritesheet.png'),'atlas':rel(folder/'atlas.json'),
           'frameSize':canvas,'footAnchorPx':pivot,'animations':records,'sourceJobs':sources,
           'provenance':'Original AI artwork generated with built-in image_gen for this task; PNG source retained. No third-party sprite copied.',
           'licenseNote':'AI-generated output; subject to applicable OpenAI terms. No external licensed asset claim.',
           'sourceFormat':'Flattened PNG drawings; no recovered layered Aseprite source.', **(extra or {})}
    write_json(folder/'manifest.json',entry); inventory.append(entry)

def actor_export():
    dirs=['down','up','left','right']
    raw={d:actor_cells('boss_'+d,4,8) for d in dirs}
    low=actor_cells('lowHp',4,4)
    # Generator outputs have different raster sizes. Normalize whole authored
    # sheets, never individual poses, to the same standing-body scale.
    scales={d:64/statistics.median([raw[d][i][0].height for i in (0,1)]) for d in dirs}
    anim={}; extraction=[]
    def place(item, size, pivot, factor, death=False):
        im,meta=item
        out=Image.new('RGBA',size)
        # One fixed scale per actor, never independently fit or stretch a pose.
        scaled=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.NEAREST)
        x=round(pivot[0]-meta['xRoot']*factor)
        y=pivot[1]-scaled.height
        if x<0 or y<0 or x+scaled.width>size[0] or y+scaled.height>size[1]:
            raise ValueError(f'Export would clip a sprite: {meta}')
        out.alpha_composite(scaled,(x,y)); extraction.append({**meta,'destinationOffset':[x,y],'exportScale':factor})
        return out
    for di,d in enumerate(dirs):
        ims=[place(it,(128,128),(64,104),scales[d]) for it in raw[d]]
        for state,idx,dur,loop in [('idle',[0,1],350,True),('hurt',[2,3],120,False),('walk',list(range(4,8)),150,True),
              ('basic_attack',list(range(8,12)),110,False),('ground_slam',list(range(12,16)),140,False),
              ('lava_cast',list(range(16,20)),160,False),('command',list(range(20,24)),180,False),
              ('ultimate_charge',list(range(24,28)),220,False),('death',list(range(28,32)),180,False)]:
            anim[f'{state}_{d}']=([ims[i] for i in idx],dur,loop)
        low_scale=64/statistics.median([it[0].height for it in low[di*4:di*4+4]])
        lims=[place(it,(128,128),(64,104),low_scale) for it in low[di*4:di*4+4]]
        anim[f'low_hp_idle_{d}']=(lims,250,True)
    atlas(BOSS,'boss_hoan_nhan_hong_liet',anim,[128,128],[64,104],['boss_'+d for d in dirs]+['lowHp'],{'bodyHeightTargetPx':64,'wholeSheetScales':scales})
    write_json(BOSS/'extraction.json',extraction)
    for kind,height in [('footman',48),('archer',46)]:
        raw=actor_cells(kind,8,8)
        factor=height/statistics.median([raw[di*16+i][0].height for di in range(4) for i in (0,1)])
        anim={}
        for di,d in enumerate(dirs):
            ims=[place(it,(96,96),(48,76),factor) for it in raw[di*16:di*16+16]]
            defs=[('idle',[0,1],350,True),('walk',[2,3,4,5],120,True),('hurt',[6,7],110,False),('death',[12,13,14],170,False),('arrival',[15],150,False)]
            if kind=='footman':
                defs += [('basic_attack',[8,9,10],100,False),('shield_guard',[11],180,True)]
            else:
                defs += [('bow_draw',[8,9],160,False),('arrow_release',[10,11],100,False)]
            for state,idx,dur,loop in defs:
                anim[f'{state}_{d}']=([ims[i] for i in idx],dur,loop)
        folder=ROOT/f'assets/sprites/summons/mongolian-{kind}'
        atlas(folder,'mongolian_'+kind,anim,[96,96],[48,76],[kind],{'bodyHeightTargetPx':height,'exportScale':factor,
              'arrivalNote':'One authored arrival keypose plus separately animated arrival_dust; not a fabricated multi-frame character arrival.'})

def fx_export():
    definitions={
      'basicVfx':['saber_slash','weapon_impact_dust_sparks'],
      'lavaVfx':[None,None,'traveling_fissure','lava_eruption','molten_splash','burning_ground','lava_wall_rise','lava_wall_dissipate'],
      'militaryVfx':['military_signal','normal_arrow','flaming_arrow','arrow_impact','arrival_dust','expanding_shockwave','ultimate_eruption','ultimate_ending'],
      'telegraphs':['fissure_warning','eruption_warning','wall_warning','safe_gap_boundaries','volley_warning','rally_formation','ultimate_warning_cross','ultimate_warning_sectors'],
      'passiveVfx':['armor_glow','defense_impact','ground_rumble','burning_impact']}
    anim={}
    row_bounds={
        'lavaVfx':[0,246,510,696,1024,1253,1419,1582,1774],
        'militaryVfx':[0,333,496,684,919,1117,1302,1595,1774],
        'telegraphs':[0,200,425,607,787,992,1211,1434,1774]}
    for job, names in definitions.items():
        original=source(job)
        bounds=row_bounds.get(job,[round(r*original.height/len(names)) for r in range(len(names)+1)])
        ims=[original.crop((round(c*original.width/4),bounds[r],round((c+1)*original.width/4),bounds[r+1]))
             for r in range(len(names)) for c in range(4)]
        factor=128/(original.width/4)
        for row,name in enumerate(names):
            if name is None:
                continue
            # Grid-space resampling preserves effect centers and expansion, rather
            # than independently normalizing each frame's changing bounds.
            frames=[]
            for im in ims[row*4:row*4+4]:
                out=Image.new('RGBA',(256,256))
                scaled=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.NEAREST)
                # Quantize effectively invisible generated alpha noise to true
                # transparency. Preserve all visible authored edge/glow pixels.
                pixels=np.array(scaled)
                pixels[pixels[:,:,3]<=2]=0
                scaled=Image.fromarray(pixels)
                centered=job=='telegraphs' or name in ['normal_arrow','flaming_arrow','armor_glow','defense_impact','weapon_impact_dust_sparks','saber_slash']
                y=128-scaled.height//2 if centered else 208-scaled.height
                out.alpha_composite(scaled,(128-scaled.width//2,y))
                frames.append(out)
            loop=('warning' in name or name in ['armor_glow','burning_ground','normal_arrow','flaming_arrow','safe_gap_boundaries','rally_formation'])
            anim[name]=(frames,120 if loop else 90,loop)
    atlas(FX,'hoan_nhan_hong_liet_vfx',anim,[256,256],[128,128],list(definitions),
          {'groundAnchorPx':[128,208], 'projectileDirection':'right','sourceRowBoundsPx':row_bounds,'exportAlphaNoiseCutoff':2,
           'unusedSourceRows':{'lavaVfx':[0,1]},
           'unusedReason':'Generator baked character art into two VFX rows; replaced by effects-only basicVfx source.',
           'telegraphSafety':'Warning alpha is artwork, never an authoritative collision mask. Open pattern gaps are intentional; validate against server shapes when integrating.'})

def environment_export():
    names=['command_tent','watchtower','palisade_horizontal','palisade_vertical','military_gate','yurt','soldier_tent','return_portal']
    props=['army_banner','signal_pennant','saber_shield_rack','bow_quiver_rack','supply_crate','open_supply_crate','barrel','supply_sacks',
           'burning_brazier','military_drum','saddle_trestle','horse_tack_rack','volcanic_rocks','ash_basalt_rock','boundary_lava_rock','command_horn_carpet']
    anim={}; assets=[]
    for job,cols,rows,ids in [('structures',4,2,names),('props',4,4,props)]:
        original=source(job)
        groups=[g for g in components(original) if g['area']>original.width*original.height/(cols*rows)*.055]
        ordered=[]
        for row in range(rows):
            candidates=[g for g in groups if min(rows-1,int((g['box'][1]+g['box'][3])/2/(original.height/rows)))==row]
            candidates=sorted(sorted(candidates,key=lambda g:g['area'],reverse=True)[:4],key=lambda g:g['box'][0])
            if len(candidates)!=4:
                raise ValueError(f'Expected four isolated props in {job} row{row}, found{len(candidates)}')
            ordered.extend(candidates)
        factor=(320/(ordered[0]['box'][2]-ordered[0]['box'][0])) if job=='structures' else 96/(original.width/4)
        for name,g in zip(ids,ordered):
            im=original.crop(g['box'])
            mask=np.zeros((im.height,im.width),dtype=np.uint8)
            for y,x0,x1 in g['runs']:
                mask[y-g['box'][1],x0-g['box'][0]:x1-g['box'][0]]=255
            im.putalpha(Image.fromarray(np.minimum(np.array(im.getchannel('A')),mask)))
            im=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.NEAREST)
            size=[math.ceil((im.width+16)/32)*32,math.ceil((im.height+16)/32)*32]
            individual=Image.new('RGBA',size);individual.alpha_composite(im,((size[0]-im.width)//2,size[1]-8-im.height))
            save(individual,ENV/f'{name}.png')
            out=Image.new('RGBA',(384,384)); out.alpha_composite(im,((384-im.width)//2,368-im.height))
            anim[name]=([out],100,False)
            assets.append({'id':name,'file':rel(ENV/f'{name}.png'),'dimensions':size,
                           'groundAnchorPx':[size[0]//2,size[1]-8], 'layer':'feet_y_sort', 'sourceJob':job,'sourceBox':g['box'],'exportScale':factor,
                           'collision':'No gameplay collision authored; future server ground footprint required.'})
    atlas(ENV,'mongolian_headquarters_props',anim,[384,384],[192,368],['structures','props'])
    write_json(ENV/'props_metadata.json',{'assets':assets,'note':'Tall structure roofs may need future occlusion masks/layer splits; no false layered-source claim.'})
    portrait=source('portrait').resize((256,256),Image.Resampling.NEAREST)
    save(portrait,BOSS/'portrait.png')

def terrain_export():
    im=source('terrain').convert('RGB')
    material_names=['dirt','ash','courtyard_stone','volcanic_ground']
    materials=[]
    for i,name in enumerate(material_names):
        x,y=i%2,i//2
        tex=im.crop((round(x*im.width/2),round(y*im.height/2),round((x+1)*im.width/2),round((y+1)*im.height/2)))
        tex=tex.resize((128,128),Image.Resampling.NEAREST)
        # Wrap blending is restricted to matching texture sample boundaries;
        # all visible surface detail comes from the retained generated painting.
        arr=np.array(tex).astype(np.float32)
        for k in range(4):
            t=(4-k)/8
            mixed=(arr[:,k,:]+arr[:,-1-k,:])/2
            arr[:,k,:]=arr[:,k,:]*(1-t)+mixed*t
            arr[:,-1-k,:]=arr[:,-1-k,:]*(1-t)+mixed*t
        for k in range(4):
            t=(4-k)/8
            mixed=(arr[k,:,:]+arr[-1-k,:,:])/2
            arr[k,:,:]=arr[k,:,:]*(1-t)+mixed*t
            arr[-1-k,:,:]=arr[-1-k,:,:]*(1-t)+mixed*t
        arr[:,0,:]=arr[:,-1,:]=(arr[:,0,:]+arr[:,-1,:])/2
        arr[0,:,:]=arr[-1,:,:]=(arr[0,:,:]+arr[-1,:,:])/2
        tex=Image.fromarray(arr.astype(np.uint8)).convert('RGBA')
        save(tex,TILES/f'{name}_material.png'); materials.append(tex)
    tiles=[]; groups={}
    for name,tex in zip(material_names,materials):
        first=len(tiles)
        for r in range(4):
            for c in range(4):
                tiles.append(tex.crop((c*32,r*32,c*32+32,r*32+32)))
        groups[name]={'firstId':first,'count':16,'kind':'4x4_material_patch','repeatsAsPatch':True}
    yy,xx=np.mgrid[0:32,0:32]
    # Marching-square masks over authored textures: TL=1 TR=2 BR=4 BL=8.
    for a,b in [(0,1),(0,2),(1,3)]:
        first=len(tiles)
        for mask in range(16):
            q=[bool(mask&(1<<i)) for i in range(4)]
            u,v=xx/31,yy/31
            field=(1-u)*(1-v)*q[0]+u*(1-v)*q[1]+u*v*q[2]+(1-u)*v*q[3]
            alpha=Image.fromarray(np.where(field>=.5,255,0).astype(np.uint8))
            tile=Image.composite(materials[b].crop((0,0,32,32)),materials[a].crop((0,0,32,32)),alpha)
            tiles.append(tile)
        groups[material_names[a]+'_to_'+material_names[b]]={'firstId':first,'count':16,'kind':'corner_mask','maskBits':['top_left','top_right','bottom_right','bottom_left']}
    sheet=Image.new('RGBA',(16*32,math.ceil(len(tiles)/16)*32))
    for i,tile in enumerate(tiles):
        sheet.alpha_composite(tile,((i%16)*32,(i//16)*32));save(tile,TILES/'tiles'/f'headquarters_tile_{i:03}.png')
    save(sheet,TILES/'terrain.png')
    write_json(TILES/'terrain.json',{'image':'terrain.png','tileWidth':32,'tileHeight':32,'columns':16,'tileCount':len(tiles),'margin':0,'spacing':0,
              'groups':groups,'status':'produced_unintegrated','source':JOBS['terrain']['destination'],
              'note':'Material variants are a coherent4x4 patch; transition masks are offline texture composites, not terrain gameplay or collision.'})

def handoff_data():
    write_json(CONCEPT/'layout_reference.json',{
      'status':'standalone_art_layout_proposal_not_runtime_map','overview':'arena_overview.png','coordinateSystem':'normalized x right,y down',
      'logicalSizeProposalPx':[1536,1536],'tileSizePx':32,
      'markers':{'boss_spawn':[.5,.27],'player_entrance':[.5,.91],'soldier_entry_west':[.12,.51],'soldier_entry_east':[.88,.51],
                 'footman_staging':[.16,.38],'archer_staging':[.84,.38],'exit_return_portal':[.87,.76]},
      'centralClearCombatRect':[.23,.31,.77,.76], 'permanentLava':'Outside palisade/perimeter only; no central hazard baked into terrain.',
      'structures':{'command_tent':[.5,.14],'watchtower_west':[.12,.1],'watchtower_east':[.88,.1]},
      'sixPlayerNote':'Spacious layout art proposal; actual movement, collision and safe-area reachability require future server design and Phaser validation.'})
    mappings={
      'dai_mac_chien_dao':{'nameVi':'Đại Mạc Chiến Đao','character':'basic_attack_{direction}','vfx':['saber_slash','weapon_impact_dust_sparks']},
      'dung_nham_liet_dia':{'nameVi':'Dung Nham Liệt Địa','character':'ground_slam_{direction}','vfx':['fissure_warning','ground_rumble','traveling_fissure','lava_eruption','burning_impact']},
      'hoa_son_bao_phat':{'nameVi':'Hỏa Sơn Bạo Phát','character':'lava_cast_{direction}','vfx':['eruption_warning','ground_rumble','lava_eruption','molten_splash','burning_ground']},
      'liet_diem_phong_toa':{'nameVi':'Liệt Diễm Phong Tỏa','character':'lava_cast_{direction}','vfx':['wall_warning','safe_gap_boundaries','lava_wall_rise','lava_wall_dissipate']},
      'hoa_tien_te_phat':{'nameVi':'Hỏa Tiễn Tề Phát','character':'command_{direction}','vfx':['military_signal','volley_warning','flaming_arrow','arrow_impact','burning_ground']},
      'thiet_ky_trieu_binh':{'nameVi':'Thiết Kỵ Triệu Binh','character':'command_{direction}','vfx':['military_signal','arrival_dust','rally_formation']},
      'van_ly_nham_hoa':{'nameVi':'Vạn Lý Nham Hỏa','character':'ultimate_charge_{direction}','vfx':['ultimate_warning_cross','ultimate_warning_sectors','ultimate_eruption','expanding_shockwave','burning_ground','ultimate_ending']},
      'hac_nham_chien_giap':{'nameVi':'Hắc Nham Chiến Giáp','character':'low_hp_idle_{direction}','vfx':['armor_glow','defense_impact']}}
    write_json(FX/'ability_asset_map.json',{'attackSetCount':7,'passiveSetCount':1,'abilities':mappings,
              'reuseDisclosures':['Skills2 and3 share lava_cast character animation.','Skills4 and5 share command character animation.',
                                  'Footman impact reuses weapon_impact_dust_sparks.','Archer normal/flaming arrows and arrow_impact use the boss army VFX atlas.'],
              'balanceValues':None,'authority':'Presentation only. No trigger, damage, cooldown, movement or collision logic.'})
    write_json(BOSS/'package_manifest.json',{'id':'phase_3b_hoan_nhan_hong_liet','status':'produced_unintegrated',
              'conceptsAutomaticallyApproved':True,'runtimeVerified':False,'runtimeApproved':False,'components':inventory,
              'generationMethod':'Built-in image_gen; exact prompts and retained source destinations in generation_jobs.json.',
              'exportMethod':'Pillow/NumPy offline extraction, uniform nearest resampling, RGBA atlas packing and texture masks; no generated pose transforms.',
              'observations':observations, 'sourceLimitations':['Flattened PNG source; no artist-layered Aseprite files.','No Phaser, motion, multiplayer zoom or authoritative telegraph validation performed by instruction.']})

if __name__ == '__main__':
    actor_export(); fx_export(); environment_export(); terrain_export(); handoff_data()
    print(json.dumps({'exportedComponents':len(inventory),'observations':observations},ensure_ascii=False))
