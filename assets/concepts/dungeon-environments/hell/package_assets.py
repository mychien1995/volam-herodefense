"""Hell asset-only packaging recipe. No game imports, servers, loaders or runtime mutations."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json, math, shutil, hashlib, statistics, sys
ROOT=Path(__file__).resolve().parents[4]
ENV=ROOT/'assets/concepts/dungeon-environments/hell'
CON=ROOT/'assets/concepts/dungeon-creeps/hell'
TILES=ROOT/'assets/tilesets/hell'
PROPS=ROOT/'assets/sprites/environment/hell'
CREEPS=ROOT/'assets/sprites/creeps/dungeons/hell'
VFX=ROOT/'assets/effects/dungeons/hell'
def rel(p): return p.relative_to(ROOT).as_posix()
def write(p,obj): p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def cell(im,col,row,nx=8,ny=8,inset=0):
    x0=round(col*im.width/nx); y0=round(row*im.height/ny)
    x1=round((col+1)*im.width/nx); y1=round((row+1)*im.height/ny)
    return im.crop((x0+inset,y0+inset,x1-inset,y1-inset))
def rgba(im):
    im=im.convert('RGBA')
    # Preserve genuine generated alpha; discard only near-invisible noise.
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a<20 else a))
    return im
def sprite_cells(im,nx,ny):
    """Group connected alpha silhouettes by source-cell centroid; preserve art crossing nominal boundaries."""
    from collections import deque
    w,h=im.size; alpha=im.getchannel('A')
    mask=bytearray(1 if v>=20 else 0 for v in alpha.tobytes())
    groups=[[] for _ in range(nx*ny)]
    for seed in range(w*h):
        if not mask[seed]: continue
        mask[seed]=0; queue=deque([seed]); points=[]; sx=sy=0
        while queue:
            p=queue.popleft(); points.append(p); x=p%w; y=p//w; sx+=x; sy+=y
            if x and mask[p-1]: mask[p-1]=0; queue.append(p-1)
            if x+1<w and mask[p+1]: mask[p+1]=0; queue.append(p+1)
            if y and mask[p-w]: mask[p-w]=0; queue.append(p-w)
            if y+1<h and mask[p+w]: mask[p+w]=0; queue.append(p+w)
        cx=sx/len(points); cy=sy/len(points)
        col=min(nx-1,max(0,int(cx*nx/w))); row=min(ny-1,max(0,int(cy*ny/h)))
        groups[row*nx+col].extend(points)
    results=[]
    for i,points in enumerate(groups):
        if not points:
            results.append(cell(im,i%nx,i//nx,nx,ny)); continue
        xs=[p%w for p in points]; ys=[p//w for p in points]
        x0,y0,x1,y1=min(xs),min(ys),max(xs)+1,max(ys)+1
        selected=Image.new('L',(x1-x0,y1-y0)); data=bytearray(selected.width*selected.height)
        for p in points: data[(p//w-y0)*selected.width+p%w-x0]=255
        selected.frombytes(bytes(data))
        crop=im.crop((x0,y0,x1,y1))
        crop.putalpha(ImageChops.multiply(crop.getchannel('A'),selected))
        results.append(crop)
    return results
def frame_record(x,y,w,h,duration):
    return dict(frame=dict(x=x,y=y,w=w,h=h),rotated=False,trimmed=False,
      spriteSourceSize=dict(x=0,y=0,w=w,h=h),sourceSize=dict(w=w,h=h),duration=duration)
def atlas_meta(image,w,h,tags,pivot):
    return dict(app='Hell asset-only PNG packaging',version='1.0',image=image,format='RGBA8888',
      size=dict(w=w,h=h),scale='1',frameTags=tags,
      slices=[dict(name='feet',color='#ff0000ff',keys=[dict(frame=0,
       bounds=dict(x=0,y=0,w=w,h=h),pivot=dict(x=pivot[0],y=pivot[1]))])])
def export_grid(frames,names,durations,folder,fw,fh,pivot,tags,columns=8):
    folder.mkdir(parents=True,exist_ok=True); (folder/'frames').mkdir(exist_ok=True)
    sheet=Image.new('RGBA',(fw*columns,fh*math.ceil(len(frames)/columns)))
    data={}
    for i,(im,name,dur) in enumerate(zip(frames,names,durations)):
        x=i%columns*fw; y=i//columns*fh
        sheet.paste(im,(x,y)); im.save(folder/'frames'/f'{name}.png')
        data[name]=frame_record(x,y,fw,fh,dur)
    sheet.save(folder/'spritesheet.png')
    meta=atlas_meta('spritesheet.png',*sheet.size,tags,pivot)
    meta['slices'][0]['keys'][0]['bounds']=dict(x=0,y=0,w=fw,h=fh)
    write(folder/'atlas.json',dict(frames=data,meta=meta))
    return sheet.size
job_names=json.loads((ENV/'generation_jobs.json').read_text(encoding='utf-8-sig'))
generated_root=Path(sys.argv[1])
jobs={k:str(generated_root/v) for k,v in job_names.items()}
for folder in [ENV,CON,TILES,PROPS,CREEPS,VFX]: folder.mkdir(parents=True,exist_ok=True)
# Copy generator originals unchanged. Paths are supplied only at execution, not retained in project metadata.
for key,dst in [('overview',ENV/'dungeon_overview.png'),('bestiary',CON/'enemy_bestiary.png'),
 ('terrain',TILES/'source_terrain.png'),('props',PROPS/'source_props.png'),('vfx',VFX/'source_vfx.png')]:
    shutil.copyfile(jobs[key],dst)
bestiary=Image.open(CON/'enemy_bestiary.png')
bounds=[0,149,297,472,642,817,1024]
enemies=[
 ('xich_quy','Xích Quỷ',36,(80,80),(40,64)),
 ('dia_nguc_khuyen','Địa Ngục Khuyển',42,(128,96),(64,76)),
 ('dung_nham_linh','Dung Nham Linh',50,(112,112),(56,90)),
 ('hac_viem_phap_su','Hắc Viêm Pháp Sư',54,(128,112),(64,90)),
 ('hac_dien_nguu_ma','Hắc Diện Ngưu Ma',76,(192,160),(96,134)),
 ('dung_nham_cu_nhan','Dung Nham Cự Nhân',100,(224,192),(112,164))]
for i,(eid,name,body,size,pivot) in enumerate(enemies):
    bestiary.crop((0,bounds[i],bestiary.width,bounds[i+1])).save(CON/f'{eid}_concept.png')
# Crop-only concept derivatives retain original palettes, turnarounds, signature pose and hero scale.
write(CON/'concept_manifest.json',dict(status='concept_approved_by_task_instruction',
 approval='User explicitly instructed automatic concept approval for this asset-production-only batch.',
 bestiary=rel(CON/'enemy_bestiary.png'),individuals=[dict(id=e[0],nameVi=e[1],
 path=rel(CON/f'{e[0]}_concept.png')) for e in enemies],runtimeApproval=False))
# Authored terrain extraction + periodic edge conditioning using generated source pixels.
terrain=Image.open(TILES/'source_terrain.png').convert('RGB')
materials=['obsidian_floor','cracked_volcanic_stone','ash_ground','burnt_earth',
 'dark_stone_path','infernal_temple_floor','lava','molten_cracks']
tiles=[]; tile_entries=[]
def periodic(im):
    # Stitch opposite boundaries; artwork interior remains the generated texture.
    out=im.copy(); p=out.load()
    for y in range(32):
        a=tuple((p[0,y][c]+p[31,y][c])//2 for c in range(3)); p[0,y]=p[31,y]=a
    for x in range(32):
        a=tuple((p[x,0][c]+p[x,31][c])//2 for c in range(3)); p[x,0]=p[x,31]=a
    corner=tuple(sum(p[x,y][c] for x,y in [(0,0),(31,0),(0,31),(31,31)])//4 for c in range(3))
    for xy in [(0,0),(31,0),(0,31),(31,31)]: p[xy]=corner
    return out
for row,material in enumerate(materials):
    group=[]
    for col in range(8):
        group.append(periodic(cell(terrain,col,row,inset=3).resize((32,32),Image.Resampling.NEAREST)))
    # Shared dark walking-material perimeter permits variant adjacency without grid lines.
    if row<6:
        edge=group[0]
        for im in group:
            for y in range(32):
                im.putpixel((0,y),edge.getpixel((0,y))); im.putpixel((31,y),edge.getpixel((31,y)))
            for x in range(32):
                im.putpixel((x,0),edge.getpixel((x,0))); im.putpixel((x,31),edge.getpixel((x,31)))
    for col,im in enumerate(group):
        tiles.append(im); tile_entries.append(dict(id=len(tiles)-1,material=material,phase=col if row>=6 else None,variant=col))
def corner_mask(bits):
    im=Image.new('L',(32,32)); p=im.load()
    a,b,c,d=[bool(bits&(1<<n)) for n in range(4)] # NW NE SW SE, 1 means foreground material.
    for y in range(32):
        for x in range(32):
            u=x/31; v=y/31; value=a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v
            p[x,y]=255 if value>=0.5 else 0
    return im
# Lava/stone transitions: 16 four-corner masks, each with eight authored lava phases.
for mask in range(16):
    for phase in range(8):
        im=Image.composite(tiles[0],tiles[48+phase],corner_mask(mask))
        tiles.append(im); tile_entries.append(dict(id=len(tiles)-1,material='lava_to_stone',cornerMask=mask,phase=phase))
for row in [1,2,3,4,5]:
    for mask in range(16):
        tiles.append(Image.composite(tiles[row*8],tiles[0],corner_mask(mask)))
        tile_entries.append(dict(id=len(tiles)-1,material=f'obsidian_to_{materials[row]}',cornerMask=mask))
sheet=Image.new('RGB',(512,math.ceil(len(tiles)/16)*32))
(TILES/'tiles').mkdir(exist_ok=True)
for i,im in enumerate(tiles):
    sheet.paste(im,(i%16*32,i//16*32)); im.save(TILES/'tiles'/f'hell_tile_{i:03}.png')
sheet.save(TILES/'terrain.png')
animated=[]
for base in [48,56]+[64+mask*8 for mask in range(15)]:
    animated.append(dict(id=base,animation=[dict(tileid=base+i,duration=140) for i in range(8)]))
ts=dict(type='tileset',version='1.10',tiledversion='1.11.2',name='hell_terrain',tilewidth=32,tileheight=32,
 tilecount=len(tiles),columns=16,image='terrain.png',imagewidth=sheet.width,imageheight=sheet.height,
 margin=0,spacing=0,tiles=animated)
write(TILES/'terrain.tsj',ts)
write(TILES/'terrain_metadata.json',dict(tileSize=[32,32],columns=16,tiles=tile_entries,
 animationDurationMs=140,sampling='nearest',cornerBits=['NW','NE','SW','SE'],
 transitionStart=64,staticTransitionStart=192,
 source='source_terrain.png',processing='Grid extraction, nearest sampling, opposite-edge stitching, source-texture corner composites.',
 limitations=['Generated lava phases are distinct source drawings; integration must review temporal smoothness.',
 '32px edge equality is measured; tiled visual continuity at gameplay zoom remains an integration review.']))
# Environment production sprites, no floor baked into prop PNGs.
prop_defs=[
 ('volcanic_rocks',(96,96)),('obsidian_cliff',(160,144)),('stone_spikes',(96,112)),('demonic_pillar',(80,160)),
 ('fortress_wall',(160,112)),('temple_gateway',(192,192)),('cursed_altar',(144,112)),('guardian_statue',(112,160)),
 ('burning_brazier',(64,96)),('hanging_chains',(96,128)),('iron_gate',(176,128)),('charred_tree',(144,160)),
 ('skeletal_remains',(96,64)),('cursed_banner',(80,144)),('fire_pit',(96,80)),('hell_entrance',(192,192)),
 ('hell_exit_portal',(160,176)),('charred_decorations',(96,64)),('fortress_wall_north',(160,128)),('stone_bridge',(192,144))]
source=rgba(Image.open(PROPS/'source_props.png'))
prop_sheet=Image.new('RGBA',(4*224,5*208)); prop_frames={}; prop_records=[]
for i,(pid,size) in enumerate(prop_defs):
    im=cell(source,i%4,i//4,4,5)
    bb=im.getchannel('A').getbbox()
    cropped=im.crop(bb)
    scale=min((size[0]-8)/cropped.width,(size[1]-8)/cropped.height)
    cropped=cropped.resize((max(1,round(cropped.width*scale)),max(1,round(cropped.height*scale))),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',size); px=(size[0]-cropped.width)//2; py=size[1]-4-cropped.height
    canvas.paste(cropped,(px,py))
    canvas.save(PROPS/f'{pid}.png')
    x=i%4*224+4; y=i//4*208+4; prop_sheet.paste(canvas,(x,y))
    prop_frames[pid]=frame_record(x,y,*size,0)
    prop_records.append(dict(id='hell_'+pid,file=rel(PROPS/f'{pid}.png'),dimensions=list(size),
     footPivot=[0.5,(size[1]-4)/size[1]],groundAnchorPx=[size[0]//2,size[1]-4],
     layer='feet_y_sort',collision='Separate ground-footprint proposal; not sprite rectangle.',
     source='source_props.png',sourceCell=[i%4,i//4]))
prop_sheet.save(PROPS/'props_atlas.png')
write(PROPS/'props_atlas.json',dict(frames=prop_frames,meta=dict(image='props_atlas.png',size=dict(w=prop_sheet.width,h=prop_sheet.height),scale='1')))
write(PROPS/'props_metadata.json',dict(assets=prop_records,sampling='nearest',foreground='Split roof/upper foliage during integration where actor passage is needed. Hanging chains are foreground-only.'))
# Dedicated four-facing locomotion and attack sources; shared authored hit/death.
enemy_records=[]
for eid,name,body,(fw,fh),pivot in enemies:
    folder=CREEPS/eid; folder.mkdir(exist_ok=True); (folder/'source').mkdir(exist_ok=True)
    for suffix,filename in [('', 'initial_animation_source.png'),('_attack','attack_source.png'),('_locomotion','locomotion_source.png')]:
        shutil.copyfile(jobs[eid+suffix],folder/'source'/filename)
    initial=rgba(Image.open(folder/'source/initial_animation_source.png'))
    loc=rgba(Image.open(folder/'source/locomotion_source.png'))
    atk=rgba(Image.open(folder/'source/attack_source.png'))
    loc_raw=sprite_cells(loc,6,4)
    initial_cells=sprite_cells(initial,8,8)
    if eid=='xich_quy':
        # Initial cardinal strips retain facing more consistently than the later locomotion attempt.
        loc_raw=[initial_cells[r*8+c] for r in [0,2,4,6] for c in range(6)]
    atk_raw=sprite_cells(atk,4,4)
    if eid in ['xich_quy','dung_nham_cu_nhan']:
        # The generated lateral contact cels were exchanged; select each actual facing.
        atk_raw[6],atk_raw[10]=atk_raw[10],atk_raw[6]
    windup=None
    if eid=='dung_nham_cu_nhan':
        shutil.copyfile(jobs[eid+'_windup'],folder/'source'/'front_windup_source.png')
        windup=rgba(Image.open(folder/'source/front_windup_source.png'))
    old_raw=initial_cells
    reaction_raw=None
    if eid=='dung_nham_cu_nhan':
        shutil.copyfile(jobs[eid+'_reactions'],folder/'source'/'reaction_source.png')
        reaction=rgba(Image.open(folder/'source/reaction_source.png'))
        reaction_raw=sprite_cells(reaction,3,2)
    def source_metrics(frames,indices):
        boxes=[frames[i].getchannel('A').getbbox() for i in indices]
        boxes=[bb for bb in boxes if bb]
        return statistics.median(bb[3]-bb[1] for bb in boxes),statistics.median(bb[3] for bb in boxes)
    lh,la=source_metrics(loc_raw,[r*6+c for r in range(4) for c in [0,1]])
    ah,aa=source_metrics(atk_raw,[r*4+3 for r in range(4)])
    oh,oa=source_metrics(old_raw,[r*8+c for r in [0,2,4,6] for c in [0,1]])
    if reaction_raw: oh,oa=source_metrics(reaction_raw,[0,1])
    allframes=[]; names=[]; durs=[]; tags=[]; animations=[]; index=0
    def add_clip(state,direction,sourceframes,height,anchor,duration,repeat):
        global index
        begin=index; anames=[]; scale=body/height
        for k,sourceframe in enumerate(sourceframes):
            im=sourceframe.resize((round(sourceframe.width*scale),round(sourceframe.height*scale)),Image.Resampling.NEAREST)
            foot_band=sourceframe.getchannel('A').crop((0,round(sourceframe.height*0.94),sourceframe.width,sourceframe.height)).getbbox()
            foot_x=(foot_band[0]+foot_band[2])/2 if foot_band else sourceframe.width/2
            x=round(pivot[0]-foot_x*scale); y=pivot[1]-im.height
            out=Image.new('RGBA',(fw,fh)); out.paste(im,(x,y))
            if windup is not None and state=='basic_attack' and direction=='down' and k==1:
                bb=windup.getchannel('A').getbbox(); crop=windup.crop(bb)
                # Ground feet are anchored from the lowest opaque pixels, independently of raised arm extent.
                feet_box=crop.getchannel('A').crop((0,round(crop.height*0.94),crop.width,crop.height)).getbbox()
                foot_x=(feet_box[0]+feet_box[2])/2 if feet_box else crop.width/2
                wscale=150/crop.height
                replacement=crop.resize((round(crop.width*wscale),150),Image.Resampling.NEAREST)
                out=Image.new('RGBA',(fw,fh)); out.paste(replacement,(round(pivot[0]-foot_x*wscale),pivot[1]-150))
            fname=f'{state}_{direction}_{k}'
            allframes.append(out); names.append(fname); durs.append(duration); anames.append(fname); index+=1
        tags.append(dict(name=f'{state}_{direction}',**{'from':begin,'to':index-1},direction='forward',repeat=repeat))
        animations.append(dict(state=state,direction=direction,frames=anames,frameRate=1000/duration,repeat=repeat))
    for di,direction in enumerate(['down','left','right','up']):
        add_clip('idle',direction,loc_raw[di*6:di*6+2],lh,la,350,-1)
        add_clip('walk',direction,loc_raw[di*6+2:di*6+6],lh,la,100,-1)
        add_clip('basic_attack',direction,atk_raw[di*4:di*4+4],ah,aa,75,0)
        if eid=='hac_viem_phap_su':
            attack=animations[-1]
            for state,offset in [('cast',0),('projectile_release',2)]:
                animations.append(dict(state=state,direction=direction,frames=attack['frames'][offset:offset+2],frameRate=1000/75,repeat=0))
                tags.append(dict(name=f'{state}_{direction}',**{'from':index-4+offset,'to':index-3+offset},direction='forward'))
    add_clip('hurt','shared',reaction_raw[:2] if reaction_raw else [old_raw[6],old_raw[7]],oh,oa,120,0)
    add_clip('death','shared',reaction_raw[2:] if reaction_raw else [old_raw[12+i] for i in range(4)],oh,oa,150,0)
    export_grid(allframes,names,durs,folder,fw,fh,pivot,tags)
    rec=dict(id='hell_'+eid,nameVi=name,status='produced_pending_integration_review',sourceConcept=rel(CON/f'{eid}_concept.png'),
      sheet='spritesheet.png',atlas='atlas.json',sources=['source/locomotion_source.png','source/attack_source.png','source/initial_animation_source.png'],
      frameWidth=fw,frameHeight=fh,bodyHeight=body,footPivot=[pivot[0]/fw,pivot[1]/fh],
      groundAnchorPx=list(pivot),directions=['down','left','right','up'],authoredStates=['idle','walk','basic_attack','hurt','death'],
      sharedStates=['hurt','death'],animations=animations,frameCount=len(allframes),sampling='nearest',
      sourceNormalization=dict(locomotion=dict(scale=body/lh,anchorY=la),attack=dict(scale=body/ah,anchorY=aa),sharedReactions=dict(scale=body/oh,anchorY=oa)),
      integrated=False,runtimeVerified=False,
      animationAuthority='Presentation only; server determines all actions, trajectories, damage and timing.',
      authoring='46 unique drawn cels:24 locomotion,16 facing attacks,2 shared hurt,4 shared death. No static idle substitutions. Alpha silhouettes are grouped by source-cell centroid to preserve whole poses crossing nominal grid boundaries; lower opaque feet are aligned to a fixed export pivot. Initial sheet retained as reaction source; unused pose groups are superseded.',
      integrationReview=['Check continuity between separately generated locomotion, attack and reaction sources.',
       'Shared hurt/death are deliberate non-directional clips; do not pretend they have four authored facings.'])
    if eid=='dung_nham_cu_nhan':
        rec['sources'].extend(['source/reaction_source.png','source/front_windup_source.png'])
        rec['sourceCorrections']=['Horned initial colossus rejected; dedicated hornless sources used.','Left/right contact cels selected by actual facing.','Front raised fist replaced with unclipped dedicated cel; feet anchor retained.']
        rec['unusedSourceNotice']='Initial sheet incorrectly resembles a horned bull; retained for provenance only, never exported into this character.'
    if eid=='xich_quy': rec['contactCelCorrection']='Left/right strike cels exchanged to match actual facing.'
    if eid=='xich_quy': rec['locomotionSource']='source/initial_animation_source.png; even rows0,2,4,6, columns0..5'
    write(folder/'manifest.json',rec); enemy_records.append(dict(id=rec['id'],nameVi=name,manifest=rel(folder/'manifest.json')))
# Sixteen shared four-cel effect animations.
effect_ids=['ember_particles','crimson_slash','fiery_bite','ember_trail','molten_projectile','lava_impact',
 'black_flame_projectile','violet_black_impact','dark_sigil','heavy_impact','stone_fragments','crimson_weapon_trail',
 'lava_splash','molten_shockwave','infernal_death_particles','fire_impact']
src=rgba(Image.open(VFX/'source_vfx.png')); effects=[]
allframes=[]; names=[]; durations=[]; tags=[]
for i,eid in enumerate(effect_ids):
    frames=[]; enames=[]
    for phase in range(4):
        im=cell(src,i%2*4+phase,i//2).resize((96,96),Image.Resampling.NEAREST)
        out=Image.new('RGBA',(112,112)); out.paste(im,(8,8)); frames.append(out)
        fname=f'{eid}_{phase}'; enames.append(fname)
        allframes.append(out); names.append(fname); durations.append(90)
    tags.append(dict(name=eid,**{'from':i*4,'to':i*4+3},direction='forward'))
    effects.append(dict(id='hell_'+eid,frames=enames,frameRate=1000/90,repeat=0,origin=[0.5,0.5],
      projectileDirection='right' if 'projectile' in eid else None,presentationOnly=True))
export_grid(allframes,names,durations,VFX,112,112,(56,56),tags)
write(VFX/'effects_metadata.json',dict(effects=effects,enemyBindings={
 'hell_xich_quy':['hell_crimson_slash','hell_ember_particles'],
 'hell_dia_nguc_khuyen':['hell_fiery_bite','hell_ember_trail'],
 'hell_dung_nham_linh':['hell_molten_projectile','hell_lava_impact','hell_ember_particles'],
 'hell_hac_viem_phap_su':['hell_black_flame_projectile','hell_violet_black_impact','hell_dark_sigil'],
 'hell_hac_dien_nguu_ma':['hell_heavy_impact','hell_stone_fragments','hell_crimson_weapon_trail'],
 'hell_dung_nham_cu_nhan':['hell_lava_splash','hell_molten_shockwave','hell_stone_fragments']},source='source_vfx.png',sampling='nearest',
 comment='Presentation only. Straight projectiles may rotate to the server-provided direction; no homing or damage logic.'))
# Standalone orthogonal Tiled map proposal; never registered with server/client.
W,H=60,40
def land(x,y):
    return ((3<=x<=20 and 14<=y<=29) or (22<=x<=39 and 13<=y<=31)
       or (41<=x<=57 and 14<=y<=29) or (20<=x<=42 and 19<=y<=25)
       or (23<=x<=38 and 3<=y<=14))
ground=[]
for y in range(H):
    for x in range(W):
        if land(x,y):
            row=5 if y<12 else 4 if (19<=y<=25 or 27<=x<=34) else 0
            tid=row*8+(x*3+y*5)%8
        else: tid=48
        bits=sum((1<<n) for n,(dx,dy) in enumerate([(-0.5,-0.5),(0.5,-0.5),(-0.5,0.5),(0.5,0.5)]) if land(x+dx,y+dy))
        if 0<bits<15: tid=64+bits*8
        ground.append(tid+1)
layers=[dict(id=1,name='ground',type='tilelayer',visible=True,opacity=1,width=W,height=H,x=0,y=0,data=ground)]
oid=1
def obj(name,typ,x,y,w=0,h=0,props=None):
    global oid
    d=dict(id=oid,name=name,type=typ,x=x,y=y,width=w,height=h,rotation=0,visible=True)
    if not w and not h: d['point']=True
    if props: d['properties']=[dict(name=k,type='string',value=str(v)) for k,v in props.items()]
    oid+=1; return d
def objectlayer(name,objects,visible=False):
    layers.append(dict(id=len(layers)+1,name=name,type='objectgroup',visible=visible,opacity=1,x=0,y=0,draworder='topdown',objects=objects))
objectlayer('player_spawn',[obj(f'player_spawn_{i}','player_spawn',(8+i%3)*32,(20+i//3*2)*32) for i in range(6)])
objectlayer('enemy_spawn',[obj(f'enemy_spawn_{i}','enemy_spawn',x*32,y*32,props={'group':'existing_wave_slots','proposalOnly':'true'})
 for i,(x,y) in enumerate([(15,17),(16,23),(13,26),(28,17),(34,18),(35,27),(27,28),(45,17),(52,18),(52,27),(46,27),(30,9)])])
objectlayer('portal',[obj('hell_exit','portal',52*32,22*32,props={'assetId':'hell_hell_exit_portal','destination':'arena','proposalOnly':'true'})])
objectlayer('combat_clearings',[obj(n,'clearing',x*32,y*32,w*32,h*32) for n,x,y,w,h in
 [('entry_court',5,16,14,12),('central_court',24,15,14,15),('exit_court',43,16,13,12),('temple_court',25,5,12,8)]])
placements=[('hell_entrance',5,21),('hell_exit_portal',52,22),('temple_gateway',30,5),('guardian_statue',25,7),
 ('guardian_statue',36,7),('cursed_altar',30,4),('fortress_wall',24,4),('fortress_wall',36,4),
 ('demonic_pillar',4,15),('demonic_pillar',20,15),('demonic_pillar',40,15),('demonic_pillar',56,15),
 ('burning_brazier',21,19),('burning_brazier',40,19),('charred_tree',4,28),('charred_tree',56,28),
 ('volcanic_rocks',23,30),('stone_spikes',38,30),('cursed_banner',26,5),('cursed_banner',35,5),
 ('skeletal_remains',19,28),('fire_pit',44,29),('hanging_chains',29,2),('obsidian_cliff',15,32)]
objectlayer('props',[obj(f'{pid}_{i}','environment_prop',x*32,y*32,props={'assetId':'hell_'+pid,'anchor':'feet','proposalOnly':'true'})
 for i,(pid,x,y) in enumerate(placements)],True)
# Collision suggestions use horizontal runs of nonwalkable cells, never lava damage.
colliders=[]
for y in range(H):
    x=0
    while x<W:
        if land(x,y): x+=1; continue
        start=x
        while x<W and not land(x,y): x+=1
        colliders.append(obj(f'boundary_{y}_{start}','solid',start*32,y*32,(x-start)*32,32,{'proposalOnly':'true','damage':'none'}))
objectlayer('collision',colliders)
layout=dict(compressionlevel=-1,width=W,height=H,tilewidth=32,tileheight=32,infinite=False,orientation='orthogonal',
 renderorder='right-down',type='map',version='1.10',tiledversion='1.11.2',nextlayerid=len(layers)+1,nextobjectid=oid,
 layers=layers,tilesets=[dict(firstgid=1,source='../../../tilesets/hell/terrain.tsj')],
 properties=[dict(name='status',type='string',value='asset-only proposal; not registered'),
 dict(name='gameplay',type='string',value='Existing wave progression only; no lava damage, boss, triggers or new mechanics.'),
 dict(name='authority',type='string',value='Reconcile collision/spawns against server map before integration.')])
write(ENV/'hell_layout.tmj',layout)
write(ENV/'layout_notes.json',dict(worldSize=[W*32,H*32],tileSize=32,routeWidthTiles=6,
 playerCapacity=6,clearings='Three spacious connected main courts plus northern temple court.',
 layoutStatus='Standalone authoring proposal, not a replacement for an authoritative game map.',
 lava='Art and proposed solid boundary only; no damage or status effects.',
 integration='Adapt physical exit, wave slots and collision to separately authorized Hell dungeon configuration.'))
manifest=dict(schemaVersion=1,id='hell_dungeon_phase_2d',date='2026-10-31',scope='Asset production only; no bosses or integration.',
 status='produced_pending_asset_verification',conceptApproval='Automatic approval explicitly authorized by task.',
 provenance=dict(tool='OpenAI built-in image_gen.imagegen',method='Original raster generation, PNG cel extraction, nearest sampling, metadata packaging.',
  license='Original AI-assisted project artwork. No external commercial pack imported; no separate third-party license or exclusive copyright asserted.',
  promptFile=rel(ENV/'generation_prompts.json'),sourceFiles=[Path(v).name for v in jobs.values()],
  referencesInspected=['assets/concept/arena-v2-approved.png','assets/concepts/dungeon-environments/bamboo-forest/dungeon-overview.png',
  'assets/exports/bamboo_forest/terrain.png','assets/exports/bamboo_forest/scenery.png','assets/exports/characters/hero_vo_dang_idle.png',
  'assets/references/vo_dang_character_reference.png','assets/references/hell_dungeon_reference.png',
  'assets/concepts/arena-creeps/waves-13-16/arena_creeps_13_16_concept_sheet.png',
  'assets/concepts/arena-creeps/waves-09-12/thach_nhan_concept.png',
  'assets/concepts/arena-creeps/waves-01-04/arena_creeps_01_04_master_v1.png'],
  unavailableReferences=['Bamboo creep package absent','Desert directories empty at inspection','Beach art package absent',
  'assets/references/vo_dang_art_direction_reference.png absent; used actual vo_dang_character_reference.png']),
 environment=dict(overview=rel(ENV/'dungeon_overview.png'),tileset=rel(TILES/'terrain.tsj'),terrain=rel(TILES/'terrain.png'),
 tileCount=len(tiles),props=rel(PROPS/'props_metadata.json'),propCount=len(prop_defs),layout=rel(ENV/'hell_layout.tmj')),
 enemies=enemy_records,effects=dict(metadata=rel(VFX/'effects_metadata.json'),animationCount=16),
 integrated=False,runtimeVerified=False)
write(ENV/'hell_asset_manifest.json',manifest)
print(json.dumps(dict(packaged=True,terrainTiles=len(tiles),props=len(prop_defs),enemies=len(enemies),creepCels=276,vfxCels=64)))

