"""Asset-only export of original generated Tay Doc raster cels. No runtime imports."""
from pathlib import Path
from PIL import Image
import json, shutil, hashlib, statistics, math
ROOT=Path(__file__).resolve().parents[6]
BASE=ROOT/'assets/sprites/bosses/main/tay-doc'
DATA=json.loads((BASE/'source/generation_jobs.json').read_text(encoding='utf-8'))
def rel(p): return Path(p).relative_to(ROOT).as_posix()
def write(p,data):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(im,cut):
    im=im.convert('RGBA')
    a=im.getchannel('A').point(lambda v: 0 if v<cut else v)
    im.putalpha(a)
    return im
def actor_islands(cel):
    # Remove detached slivers from adjacent generated cells, retain body/weapon components.
    px=cel.load(); w,h=cel.size; seen=set(); components=[]
    for y in range(h):
        for x in range(w):
            if (x,y) in seen or px[x,y][3]==0: continue
            todo=[(x,y)]; seen.add((x,y)); component=[]
            while todo:
                qx,qy=todo.pop(); component.append((qx,qy))
                for ny in range(max(0,qy-1),min(h,qy+2)):
                    for nx in range(max(0,qx-1),min(w,qx+2)):
                        if (nx,ny) not in seen and px[nx,ny][3]>0:
                            seen.add((nx,ny)); todo.append((nx,ny))
            components.append(component)
    threshold=max(12,max(map(len,components))*.01)
    for component in components:
        if len(component)<threshold:
            for x,y in component: px[x,y]=(0,0,0,0)
    return cel
def split_axis(counts,n):
    length=len(counts); cuts=[0]
    for i in range(1,n):
        expected=length*i/n
        low=max(cuts[-1]+1,round(expected-length/n*.13))
        high=min(length-1,round(expected+length/n*.13))
        minimum=min(counts[low:high+1])
        candidates=[k for k in range(low,high+1) if counts[k]==minimum]
        # Choose middle of the minimum-coverage gap nearest expected.
        runs=[]; start=prev=candidates[0]
        for k in candidates[1:]:
            if k>prev+1: runs.append((start,prev)); start=k
            prev=k
        runs.append((start,prev))
        a,b=min(runs,key=lambda ab:abs(sum(ab)/2-expected))
        cuts.append((a+b)//2)
    return cuts+[length]
def row_cuts(counts,n):
    # Generated art uses uneven row spacing; preserve whole poses between alpha gaps.
    gaps=[]; start=None
    for i,v in enumerate(counts+[999999]):
        if v<=2 and start is None: start=i
        if v>2 and start is not None:
            if start>0 and i<len(counts) and i-start>=5: gaps.append((start,i))
            start=None
    if len(gaps)>=n-1:
        chosen=sorted(sorted(gaps,key=lambda x:x[1]-x[0],reverse=True)[:n-1])
        return [0]+[(a+b)//2 for a,b in chosen]+[len(counts)]
    return split_axis(counts,n)
def cells(im,cols,rows):
    a=im.getchannel('A')
    mask=a.point(lambda v:255 if v>=64 else 0)
    px=mask.load(); w,h=im.size
    yc=row_cuts([sum(px[x,y]>0 for x in range(w)) for y in range(h)],rows)
    result=[]
    for row in range(rows):
        top,bottom=yc[row:row+2]
        xc=split_axis([sum(px[x,y]>0 for y in range(top,bottom)) for x in range(w)],cols)
        for col in range(cols):
            box=(xc[col],top,xc[col+1],bottom)
            cel=im.crop(box); bbox=cel.getchannel('A').getbbox()
            if not bbox: raise ValueError(('empty source',row,col))
            result.append((cel,box,bbox))
    return result
groups={}
recipes=[]
source_entries=[]
issues=[]
STATES={
'phase-1':['idle','walk','basic_attack','poison_cast','large_spell_cast','hurt','death'],
'phase-2':['idle','walk','palm_attack','lunge_attack','dual_hand_cast','aoe_charge','hurt','death'],
'transition':['staff_release','cap_mo_crouch','cap_mo_charge','energy_eruption']}
DUR={'idle':350,'walk':120,'basic_attack':90,'poison_cast':140,'large_spell_cast':180,
'hurt':120,'death':180,'palm_attack':90,'lunge_attack':85,'dual_hand_cast':150,
'aoe_charge':200,'staff_release':150,'cap_mo_crouch':150,'cap_mo_charge':160,'energy_eruption':110}
TARGET={'poison_bolt':40,'staff_impact':52,'poison_needle':32,'needle_fan':92,'needle_impact':32,
'poison_status':64,'cloud_expand':152,'cloud_loop':152,'poison_damage_tick':40,
'serpent_charge':88,'serpent_wave':168,'serpent_impact':152,'poison_particles':40,
'palm_trail':96,'palm_impact':104,'lunge_impact':136,'lunge_shockwave':176,
'giant_palm_projectile':144,'poison_explosion':160,'circular_eruption':224,'toxic_particles':56,
'staff_release_sparks':48,'cap_mo_charge':112,'poison_aura':104,'transition_shockwave':208,
'phase_2_activation':176,'body_poison_mist':88}
LOOPS={'idle','walk','poison_status','cloud_loop','poison_aura','body_poison_mist'}
for job in DATA['jobs']:
    dest=ROOT/job['target']
    source=Path(job['path']) if 'path' in job else ROOT/job['sourcePath']
    if dest.exists() and sha(source)!=sha(dest): raise FileExistsError('Refusing changed source: '+str(dest))
    dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists(): shutil.copyfile(source,dest)
    job['sourcePath']=rel(dest)
    source_entries.append({'id':job['id'],'path':rel(dest),'sha256':sha(dest),'method':'built-in image_gen',
                           'promptId':job['id']})
    if not job.get('kind'): continue
    kind=job['kind']; cutoff=16 if kind=='character' else 80 if kind=='warning' else 24
    im=clean(Image.open(dest),cutoff)
    cels=cells(im,job['cols'],job['rows'])
    if kind=='character':
        phase=job['phase']; direction=job['direction']; folder=BASE/phase
        firstrow=[bbox[3]-bbox[1] for _,_,bbox in cels[:4]]
        scale=(54 if phase=='phase-2' else 64)/statistics.median(firstrow)
        key=rel(folder); group=groups.setdefault(key,{'folder':folder,'kind':'character','size':(160,144),'pivot':(80,116),'clips':{}})
        for i,(cel,box,bbox) in enumerate(cels):
            cel=actor_islands(cel); bbox=cel.getchannel('A').getbbox()
            state=STATES[phase][i//4]; index=i%4; tag=state+'_'+direction
            art=cel.crop(bbox); aw,ah=art.size
            # Dark shoe/ground anchor, excluding the bright green staff head.
            ap=art.load(); candidates=[]
            for y in range(max(0,round(ah*.76)),ah):
                for x in range(aw):
                    r,g,b,a=ap[x,y]
                    if a>=100 and max(r,g,b)<100 and max(r,g,b)-min(r,g,b)<38:
                        candidates.append((x,y))
            foot_y=max((p[1] for p in candidates),default=ah-1)
            shoe_x=sorted(x for x,y in candidates)
            foot_x=(shoe_x[round((len(shoe_x)-1)*.05)]+shoe_x[round((len(shoe_x)-1)*.95)])/2 if shoe_x else aw/2
            resized=art.resize((max(1,round(aw*scale)),max(1,round(ah*scale))),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',group['size'])
            lift=6 if state=='lunge_attack' and index==2 else 0
            dx=round(80-foot_x*scale); dy=round(116-foot_y*scale)-lift
            if dx<2 or dy<2 or dx+resized.width>158 or dy+resized.height>142:
                raise ValueError(('canvas clearance',job['id'],state,index,dx,dy,resized.size))
            frame.alpha_composite(resized,(dx,dy))
            name=f'{tag}_{index}'
            group['clips'].setdefault(tag,[]).append({'name':name,'image':frame,'duration':DUR[state],
                'loop':state in LOOPS,'source':{'path':rel(dest),'cellRect':list(box),'contentRect':list(bbox),
                'scale':scale,'sourceFoot': [foot_x+bbox[0],foot_y+bbox[1]],'airborneLiftPx':lift}})
    elif kind in ('vfx','warning'):
        for row,name in enumerate(job['groups']):
            phase='transition' if name=='transition_circle_warning' else job['phase']
            folder=ROOT/'assets/effects/bosses/main/tay-doc'/phase
            key=rel(folder); group=groups.setdefault(key,{'folder':folder,'kind':'effects','size':(256,256),'pivot':(128,128),'clips':{}})
            rowc=cels[row*4:row*4+4]
            maxw=max(b[2]-b[0] for _,_,b in rowc); maxh=max(b[3]-b[1] for _,_,b in rowc)
            target=208 if kind=='warning' else TARGET[name]
            scale=target/max(maxw,maxh)
            for index,(cel,box,bbox) in enumerate(rowc):
                art=cel.crop(bbox); aw,ah=art.size
                if kind=='warning':
                    size=(round(maxw*scale),round(maxh*scale)) # constant visual footprint across warning pulses
                    if name=='eruption_circle_warning': size=(size[0],round(size[0]*.60))
                else: size=(max(1,round(aw*scale)),max(1,round(ah*scale)))
                art=art.resize(size,Image.Resampling.NEAREST)
                opacity=.34 if name in ('cloud_expand','cloud_loop') else .30 if name=='body_poison_mist' else .65 if name in ('poison_status','poison_aura') else 1
                if opacity!=1: art.putalpha(art.getchannel('A').point(lambda v:round(v*opacity)))
                frame=Image.new('RGBA',group['size']); frame.alpha_composite(art,((256-art.width)//2,(256-art.height)//2))
                group['clips'].setdefault(name,[]).append({'name':f'{name}_{index}','image':frame,
                  'duration':140 if kind=='warning' else 100,'loop':kind=='warning' or name in LOOPS,
                  'warning':kind=='warning','source':{'path':rel(dest),'cellRect':list(box),'contentRect':list(bbox),
                  'scale':scale,'opacityMultiplier':opacity,'constantWarningFootprint':kind=='warning'}})
    elif kind=='icons':
        folder=ROOT/'assets/icons/bosses/tay-doc'; entries=[]
        for i,(cel,box,bbox) in enumerate(cels):
            name=job['groups'][i]; side=128 if name.startswith('portrait') else 64
            art=cel.crop(bbox); scale=(side-4)/max(art.size)
            art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(side,side)); frame.alpha_composite(art,((side-art.width)//2,(side-art.height)//2))
            path=folder/(name+'.png'); frame.save(path)
            entries.append({'id':'tay_doc_'+name,'path':rel(path),'size':[side,side],'sha256':sha(path),
             'source':{'path':rel(dest),'cellRect':list(box),'contentRect':list(bbox),'scale':scale}})
        write(folder/'manifest.json',{'id':'tay-doc-icons','status':'produced_asset_only','entries':entries})
all_groups=[]
for key,g in groups.items():
    folder=g['folder']; folder.mkdir(parents=True,exist_ok=True)
    frames=[f for clip in g['clips'].values() for f in clip]; fw,fh=g['size']; cols=8
    sheet=Image.new('RGBA',(cols*fw,math.ceil(len(frames)/cols)*fh))
    atlas={}; animations={}; tags=[]; idx=0; hashes=[]
    for tag,clip in g['clips'].items():
        start=idx
        for f in clip:
            x=(idx%cols)*fw; y=(idx//cols)*fh
            sheet.alpha_composite(f['image'],(x,y))
            path=folder/'frames'/(f['name']+'.png'); path.parent.mkdir(exist_ok=True); f['image'].save(path)
            atlas[f['name']]={'frame':{'x':x,'y':y,'w':fw,'h':fh},'rotated':False,'trimmed':False,
              'spriteSourceSize':{'x':0,'y':0,'w':fw,'h':fh},'sourceSize':{'w':fw,'h':fh},
              'duration':f['duration'],'pivot':{'x':g['pivot'][0]/fw,'y':g['pivot'][1]/fh}}
            recipes.append({'export':rel(path),'source':f['source'],'sha256':sha(path)})
            hashes.append(hashlib.sha256(f['image'].tobytes()).hexdigest())
            idx+=1
        animations[tag]={'frames':[f['name'] for f in clip],'durationsMs':[f['duration'] for f in clip],
           'repeat':-1 if clip[0]['loop'] else 0,'direction':'forward','role':'warning' if clip[0].get('warning') else 'character' if g['kind']=='character' else 'effect'}
        tags.append({'name':tag,'from':start,'to':idx-1,'direction':'forward'})
    sheet.save(folder/'spritesheet.png')
    meta={'app':'Tay Doc offline raster export','version':'1','image':'spritesheet.png','format':'RGBA8888',
      'size':{'w':sheet.width,'h':sheet.height},'scale':'1','frameTags':tags,'slices':[{'name':'feet' if g['kind']=='character' else 'center','keys':[{'frame':0,
        'bounds':{'x':0,'y':0,'w':fw,'h':fh},'pivot':{'x':g['pivot'][0],'y':g['pivot'][1]}}]}]}
    write(folder/'atlas.json',{'frames':atlas,'meta':meta})
    write(folder/'animations.json',{'assetId':('boss_' if g['kind']=='character' else 'vfx_')+'tay_doc_'+folder.name.replace('-','_'),'sheet':'spritesheet.png','origin':[g['pivot'][0]/fw,g['pivot'][1]/fh],
       'animations':animations,'timingScope':'Presentation suggestions only; never damage/phase timing.'})
    manifest={'id':'tay-doc-'+folder.name+'-'+g['kind'],'status':'produced_asset_only_candidate',
      'integrated':False,'runtimeVerified':False,'conceptApproval':'automatic_by_explicit_user_instruction_2026-10-31',
      'canvas':[fw,fh],'pivotPx':list(g['pivot']),'origin':[g['pivot'][0]/fw,g['pivot'][1]/fh],'sampling':'nearest',
      'frameCount':len(frames),'animationCount':len(animations),'sheet':'spritesheet.png','atlas':'atlas.json','animationData':'animations.json',
      'animations':list(animations),'directionConvention':'down/front, left, right, up/back for actors; screen-right canonical projectiles',
      'sourceKind':'Original generated raster cels, flattened PNG; no recovered layers or Aseprite source claimed.'}
    write(folder/'manifest.json',manifest); all_groups.append({'path':key,**manifest})
# Replace host-only generation paths with portable project paths after the copies.
portable_jobs=[]
for j in DATA['jobs']:
    portable_jobs.append({k:v for k,v in j.items() if k not in ('path','supersededOpaqueSource','rejectedOpaqueAttempts')})
write(BASE/'source/generation_jobs.json',{'jobs':portable_jobs,'prompts':DATA['prompts']})
write(BASE/'source/extraction_recipes.json',{'method':'Source cel extraction; low-alpha cleanup; constant sheet/facing actor scale; nearest-neighbor export; dark feet anchor; per-warning fixed extent. Not procedurally drawn art.','recipes':recipes})
write(BASE/'package_manifest.json',{'id':'tay-doc','nameVi':'Tây Độc — Âu Dương Phong','category':'main_arena_invasion_boss','date':'2026-10-31',
 'conceptApproval':'automatic_by_explicit_user_instruction','productionStatus':'produced_asset_only_candidate',
 'integrated':False,'runtimeVerified':False,
 'provenance':{'generator':'built-in image_gen','sourceType':'Original AI-assisted generated raster artwork',
 'rights':'Generated for this project; no third-party sprite pack or reference pixels copied. No exclusive copyright asserted.',
 'prompts':'assets/sprites/bosses/main/tay-doc/source/generation_jobs.json',
 'exporter':'assets/sprites/bosses/main/tay-doc/source/export_assets.py',
 'sourceAssets':source_entries},
 'concepts':[j['target'] for j in DATA['jobs'] if not j.get('kind')],
 'groups':all_groups,'icons':'assets/icons/bosses/tay-doc/manifest.json',
 'staticVerification':'pending final lightweight verification',
 'runtimeIsolation':'No Phaser, JS, loader, public runtime folder, gameplay, configuration, map, minion or loot changes.'})
print(json.dumps({'exportedGroups':[{ 'path':g['path'],'frames':g['frameCount'],'animations':g['animationCount']} for g in all_groups],
 'totalAnimationFrames':sum(g['frameCount'] for g in all_groups),'icons':12,'concepts':3},indent=2))

