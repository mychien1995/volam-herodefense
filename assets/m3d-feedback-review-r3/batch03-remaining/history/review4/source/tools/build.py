"""Review-only batch. Retained raster extractor + Aseprite export, no runtime imports."""
from pathlib import Path
import sys,json,hashlib,shutil,importlib.util
from PIL import Image
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[5]
BASE=ROOT/'assets/m3d-feedback-review-r3/batch03-remaining';SRC=BASE/'source'
spec=importlib.util.spec_from_file_location('draft_helpers',ROOT/'assets/m3d-feedback-review-r3/source/tools/build-draft.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
read=b.read;save=b.save;rel=b.rel
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def protected():
    records=[]
    locks=[ROOT/'assets/m3d-feedback-visual/approved_visual_r2.lock.json',*ROOT.glob('assets/approved_*.lock.json'),ROOT/'assets/m3d-feedback-review-r3/approved_ca_diep_batch01.lock.json',ROOT/'assets/m3d-feedback-review-r3/batch02-pha-giap-bong/approved_pha_giap_review3.lock.json']
    for p in locks:
        files=read(p)['files'];assert isinstance(files,dict),p
        for f,h in files.items():assert sha(ROOT/f)==h,(p,f)
        records.append(dict(path=rel(p),sha256=sha(p),files=len(files)))
    p=ROOT/'assets/reviews/ly_mac_sau_v02/art_approval_v02.json';j=read(p)
    for f in j['files']:assert sha(ROOT/f['path'])==f['sha256'],f['path']
    records.append(dict(path=rel(p),sha256=sha(p),files=len(j['files'])))
    p=ROOT/'assets/runtime/hoan_nhan_hong_liet_v04.json';j=read(p)
    for f,h in j['files'].items():assert sha(ROOT/f)==h,f
    assert read(ROOT/j['approvalRecord'])
    records.append(dict(path=rel(p),sha256=sha(p),files=len(j['files'])))
    approval=read(ROOT/'assets/m3d-feedback-visual/director_approval_r2.json')
    assert approval['visualApproved'] and approval['lockSha256']==sha(locks[0])
    out=dict(status='PASS',records=records)
    previous=BASE/'previews/protected-before.json'
    if previous.exists():assert read(previous)==out,'Protected approval/lock changed'
    else:save(previous,out)
    save(BASE/'previews/protected-after.json',out)
    return out

def new_art(only=None):
    b.me.BASE=SRC
    jobs=read(SRC/'generation_records.json')['records']
    for j in jobs:
        if 'rows' in j and (only is None or j['id']==only):
            if j.get('role')=='character':b.mc.BASE=SRC;b.mc.measure('',j['id'],j['rows'],j['cols'],j['height'])
            else:b.me.measure('',j['id'],j['rows'],j['cols'])
    measurements=read(SRC/'effect_measurements.json');prepared=[]
    def component(source,ident,entries,groups,width,pivot_mode='center',facing='billboard'):
        if only and source!=only:return
        dest=BASE/'exported'/ident;(dest/'frames').mkdir(parents=True,exist_ok=True)
        canvas=[256,256];pivot=[128,220] if pivot_mode=='feet' else [128,128]
        nonempty=[e for e in entries if e.get('runs')]
        assert nonempty,(source,ident)
        # Fixed scale for whole component, never fit individual cels.
        reference=[e['rect'][2] for e in nonempty if e['col'] in [1,2]] or [e['rect'][2] for e in nonempty]
        scale=width/sorted(reference)[len(reference)//2]
        c=dict(id=ident,role='vfx',canvas=canvas,pivot=pivot,frames=[],clips=[],sourceFile=rel(SRC/(ident+'.aseprite')),individualDirectory=rel(dest/'frames'))
        for phase,cols,loop in groups:
            chosen=[e for e in entries if e['col'] in cols and e.get('runs')]
            if not chosen:continue
            tag=phase+'_'+facing;names=[]
            for i,e in enumerate(chosen):
                name=f'{tag}_{i}';names.append(name);w,h=e['rect'][2:]
                anchor=[w/2,h*.9] if pivot_mode=='feet' else [w/2,h/2]
                if source=='whisk_ring':
                    centres=sorted(q['rect'][1]+q['rect'][3]/2 for q in entries if q['col'] in [2,3])
                    anchor=[w/2,centres[len(centres)//2]-e['rect'][1]]
                c['frames'].append(dict(source=rel(SRC/'generated'/(source+'.png')),rect=e['rect'],runs=e['runs'],anchor=anchor,scale=scale,threshold=220,kind='vfx',pivot=pivot,name=name,tag=tag,durationMs=110))
            c['clips'].append(dict(name=tag,phase=phase,facing=facing,frames=names,frameDurationsMs=[110]*len(names),loop=loop,origin=[pivot[0]/256,pivot[1]/256]))
        prepared.append(c)
    for source,width in [('tornado',48),('foot_force',44),('crescent',68),('hhl_blade',55)]:
        if only and source!=only:continue
        frames=measurements[source]['frames']
        for row,d in enumerate(['right','down','left','up']):
            component(source,'r3_'+source+'_'+d,frames[row*4:row*4+4],[('birth',[0],False),('travel',[1,2],True),('impact',[3],False)],width,'feet' if source=='tornado' else 'center',d)
    for row,(name,width,mode) in enumerate([('buddha',100,'feet'),('sky_palm',150,'feet'),('sanskrit',170,'center'),('palm_impact',190,'center')]):
        component('niet_ban','r3_'+name,measurements['niet_ban']['frames'][row*4:row*4+4],[('intro',[0],False),('loop',[1,2],True),('outro',[3],False)],width,mode)
    for row,(name,width,mode) in enumerate([('lion_head',88,'feet'),('roar_wave',210,'center')]):
        component('lion_roar','r3_'+name,measurements['lion_roar']['frames'][row*4:row*4+4],[('intro',[0],False),('roar',[1,2],False),('outro',[3],False)],width,mode)
    component('whisk_ring','r3_whisk_ring',measurements['whisk_ring']['frames'],[('sweep',[0,1,2,3],False),('outro',[4,5],False)],170)
    component('round_wheel','r3_round_wheel',measurements['round_wheel']['frames'],[('spin',list(range(6)),True)],42)
    if only is None or only=='kim_hand_chop':
        data=read(SRC/'character_measurements.json')['kim_hand_chop'];ident='r3_kim_hand_chop';dest=BASE/'exported'/ident;(dest/'frames').mkdir(parents=True,exist_ok=True)
        c=dict(id=ident,role='character',canvas=[160,160],pivot=[80,128],frames=[],clips=[],sourceFile=rel(SRC/(ident+'.aseprite')),individualDirectory=rel(dest/'frames'))
        # Generator delivered a valid but different row order: observed back/right/front/left.
        for row,d in enumerate(['up','right','down','left']):
            for col,phase in enumerate(['anticipation','raise','chop','recovery']):
                e=data['frames'][row*4+col];x,y,x1,y1=e['bounds'];name=f'{phase}_{d}_0';tag=f'{phase}_{d}'
                c['frames'].append(dict(source=rel(SRC/'generated/kim_hand_chop.png'),rect=[x,y,x1-x,y1-y],runs=e['runs'],anchor=[e['foot'][0]-x,e['foot'][1]-y],scale=data['scale'],threshold=220,kind='character',pivot=c['pivot'],name=name,tag=tag,durationMs=150))
                c['clips'].append(dict(name=tag,phase=phase,facing=d,frames=[name],frameDurationsMs=[150],loop=False,origin=[.5,.8]))
        prepared.append(c)
    previous=read(SRC/'assembly_plan.json')['components'] if (SRC/'assembly_plan.json').exists() else []
    save(SRC/'assembly_plan.json',dict(components=prepared,newCharacterPalette=[]))
    original=(ROOT/'assets/m3d-feedback-visual/source/tools/assemble.lua').read_text('utf-8')
    (SRC/'tools/assemble.lua').write_text(original.replace("local folder=root..'/assets/m3d-feedback-visual/source'","local folder=root..'/assets/m3d-feedback-review-r3/batch03-remaining/source'"),'utf-8')
    b.run([b.ASE,'-b','--script-param','root='+ROOT.as_posix(),'--script-param','batch=all-remaining','--script',SRC/'tools/assemble.lua'])
    output=[]
    for c in prepared:
        dest=BASE/'exported'/c['id'];sheet=dest/(c['id']+'.png');atlas=dest/(c['id']+'.json')
        b.run([b.ASE,'-b',ROOT/c['sourceFile'],'--sheet-type','rows','--sheet-columns','4','--border-padding','2','--shape-padding','2','--format','json-hash','--list-tags','--list-slices','--filename-format','{tag}_{tagframe}','--sheet',sheet,'--data',atlas])
        meta={k:c[k] for k in ['id','role','canvas','pivot']};meta.update(sheet=rel(sheet),atlas=rel(atlas),sourceFile=c['sourceFile'],animations=c['clips'],status='candidate-awaiting-director-review',directorApproved=False)
        save(dest/(c['id']+'.animations.json'),meta);output.append(meta)
    if only:save(SRC/'assembly_plan.json',dict(components=[c for c in previous if c['id'] not in {x['id'] for x in prepared}]+prepared,newCharacterPalette=[]))
    return output

def retain():
    output=[];copies=[]
    def cp(p):
        p=Path(p);p=p if p.is_absolute() else ROOT/p
        dest=BASE/'support'/p.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
        copies.append(dict(source=rel(p),copy=rel(dest),sha256=sha(p)));return rel(dest)
    def standard(p,ident):
        p=ROOT/p;j=read(p);j['sheet']=j.get('sheet',j.get('image'))
        for key in ['sheet','atlas']:
            if not (ROOT/j[key]).exists():j[key]=rel(p.parent/j[key])
        atlas=read(ROOT/j['atlas']);first=next(iter(atlas['frames'].values()))['frame']
        canvas=j.get('canvas',j.get('frameDimensions',[first['w'],first['h']]))
        if isinstance(canvas,int):canvas=[canvas,canvas]
        pivot=j.get('pivot',j.get('feetPivot',j.get('effectAnchor')))
        if not pivot:pivot=[canvas[0]*j.get('origin',[.5,.5])[0],canvas[1]*j.get('origin',[.5,.5])[1]]
        clips=[]
        for a in j['animations']:
            durations=a.get('frameDurationsMs',a.get('durationsMs',[round(1000/a.get('frameRate',10))]*len(a['frames'])))
            clips.append(dict(name=a['name'],frames=a['frames'],frameDurationsMs=durations,loop=a.get('loop',False),facing=a.get('facing',a.get('direction','billboard')),phase=a.get('phase',a.get('stage',a['name'])),placementOffsetFromFeet=a.get('placementOffsetFromFeet',a.get('effectPlacementOffset',[0,0]))))
        output.append(dict(id=ident,sheet=cp(j['sheet']),atlas=cp(j['atlas']),canvas=canvas,pivot=pivot,animations=clips,sourceMetadata=rel(p),sourceMetadataSha256=sha(p),kind='retained-authored-raster'))
    specs=[
      ('assets/m3d-feedback-visual/exported/m3d_thieu_lam_quyen_character/m3d_thieu_lam_quyen_character.animations.json','shaolin_a'),
      ('assets/m3d-feedback-visual/exported/m3d_thieu_lam_quyen_vfx/m3d_thieu_lam_quyen_vfx.animations.json','shaolin_a_fx'),
      ('assets/m3d-feedback-visual/exported/m3d_thien_son_dao_character/m3d_thien_son_dao_character.animations.json','ts_dao'),
      ('assets/m3d-feedback-visual/exported/m3d_thien_son_dao_vfx/m3d_thien_son_dao_vfx.animations.json','ts_dao_fx'),
      ('assets/m3d-feedback-visual/exported/m3d_thieu_lam_skill_vfx/m3d_thieu_lam_skill_vfx.animations.json','shaolin_skill_fx'),
      ('assets/sprites/bosses/chu-ba-thong/boss_chu_ba_thong.animations.json','cbt'),
    ]
    for skill in ['vo_anh_cuoc','toan_phong_thoai','nhu_lai_niet_ban','tam_gioi_quy_thien','tru_ta','kim_quang_ho_tran']:
        for role in ['character','vfx']:specs.append((f'assets/exports/skills/thieu-lam/{skill}/{skill}_{role}.animations.json',skill+'_'+role))
    for role in ['character','ground','aura','projectile']:specs.append((f'assets/exports/skills/m3c3_feedback_v2_batches/01_cai_bang/thien_ha_vo_cau_dogs_v2/thien_ha_vo_cau_dogs_v2_{role}.animations.json','vo_cau_'+role))
    specs.append(('assets/m3d-feedback-visual/exported/m3d_liet_phong_ground_vfx_r2/m3d_liet_phong_ground_vfx_r2.animations.json','ts_ground'))
    specs.append(('assets/effects/bosses/chu-ba-thong/skills/thai_cuc_am_duong_tran/vfx_thai_cuc_am_duong_tran.animations.json','cbt_trap'))
    for skill in ['tuy_tien_bo','can_khon_phan_chan','am_duong_nghich_chuyen','khong_minh_quyen']:
        specs.append((f'assets/effects/bosses/chu-ba-thong/skills/{skill}/vfx_{skill}.animations.json','cbt_'+skill))
    for p,ident in specs:standard(p,ident)
    school_sheet='assets/exports/characters/hero_thieu_lam_dao.png';school_atlas='assets/exports/characters/hero_thieu_lam_dao.json'
    school_data=read(ROOT/school_atlas);school_frame=next(iter(school_data['frames'].values()))['frame'];school_feet=next(s for s in school_data['meta']['slices'] if s['name']=='feet')['keys'][0]['pivot']
    school_clips=[dict(name=state+'_'+d,frames=[f'{state}_{d}_{i}' for i in range(2 if state=='idle' else 4)],frameDurationsMs=[220 if state=='idle' else 110]*(2 if state=='idle' else 4),loop=True,facing=d,phase=state) for d in ['right','down','left','up'] for state in ['idle','walk']]
    output.append(dict(id='school_dao',sheet=cp(school_sheet),atlas=cp(school_atlas),canvas=[school_frame['w'],school_frame['h']],pivot=[school_feet['x'],school_feet['y']],animations=school_clips,sourceMetadata=school_atlas,kind='retained-approved-school-raster',nativeBodyHeight=44))
    runtime_chu=read(ROOT/'apps/game-client/src/chu-art.generated.json')['bundles']['boss']
    first=next(iter(runtime_chu['frames'].values()))['frame'];dims=[first['w'],first['h']]
    output.append(dict(id='cbt_runtime_actions',sheet=cp(runtime_chu['image']),atlas=cp(Path(runtime_chu['image']).with_suffix('.json')),canvas=dims,pivot=[dims[0]*runtime_chu['origin'][0],dims[1]*runtime_chu['origin'][1]],animations=[dict(name=a['name'],frames=a['frames'],frameDurationsMs=[round(1000/a['frameRate'])]*len(a['frames']),loop=True,facing='billboard',phase=a['name']) for a in runtime_chu['animations']],sourceMetadata='apps/game-client/src/chu-art.generated.json',kind='retained-current-runtime-raster'))
    def special(folder,ident):
        folder=ROOT/folder;m=read(folder/'manifest.json');aa=read(folder/'animations.json')['animations']
        sheet=m.get('sheet',m.get('spritesheet'));atlas=m.get('atlas')
        if not sheet:sheet=rel(next(x for x in folder.glob('*.png') if x.name not in ['contact.png']))
        if not atlas:atlas=rel(folder/'atlas.json')
        if not (ROOT/sheet).exists():sheet=rel(folder/sheet)
        if not (ROOT/atlas).exists():atlas=rel(folder/atlas)
        first=next(iter(read(ROOT/atlas)['frames'].values()))['frame'];canvas=[first['w'],first['h']]
        pivot=m.get('pivotPx',m.get('footPivot',m.get('pivot',[canvas[0]/2,canvas[1]/2])))
        if isinstance(pivot,dict):pivot=list(pivot.values())
        clips=[]
        for k,a in aa.items():clips.append(dict(name=k,frames=a['frames'],frameDurationsMs=a.get('durationsMs',[100]*len(a['frames'])),loop=a.get('loop',False),facing=a.get('direction',a.get('canonicalDirection','billboard')),phase=k))
        output.append(dict(id=ident,sheet=cp(sheet),atlas=cp(atlas),canvas=canvas,pivot=pivot,animations=clips,sourceMetadata=rel(folder/'animations.json'),kind='retained-authored-raster'))
    for folder,ident in [('assets/sprites/bosses/ly-mac-sau','lms'),('assets/sprites/summons/co-mo-am-binh','co_mo_minion'),('assets/effects/bosses/ly-mac-sau','lms_fx'),('assets/effects/bosses/ly-mac-sau/purple_v02','lms_purple')]:special(folder,ident)
    data=read(ROOT/'assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json');selected=read(ROOT/'assets/approved_kim_luan_phap_vuong.lock.json')['selectedFrames']
    for ident in ['kim_luan_base','kim_luan_actions','kim_luan_fx','hoac_do_base','hoac_do_actions','hoac_do_fx','dat_nhi_ba_base','dat_nhi_ba_actions','dat_nhi_ba_fx','hero']:
        v=data['bundles'][ident];first=next(iter(v['frames'].values()))['frame'];canvas=[first['w'],first['h']];clips=[]
        for a in v['clips']:
            frames=[f for f in a['frames'] if f in selected.get(ident,[]) or ident=='hero']
            if not frames:continue
            # Approved boss actions are down-facing only; do not invent missing facings.
            clips.append(dict(name=a['name'],frames=frames,frameDurationsMs=[round(1000/a.get('fps',10))]*len(frames),loop=a.get('repeat')==-1,facing='down' if 'actions' in ident else 'billboard',phase=a['name']))
        output.append(dict(id=ident,sheet=cp(v['image']),atlas=cp(v['atlas']),canvas=canvas,pivot=[canvas[0]*v['origin'][0],canvas[1]*v['origin'][1]],animations=clips,sourceMetadata='assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json',kind='retained-approved-selected-raster'))
    runtime=read(ROOT/'assets/runtime/hoan_nhan_hong_liet_v04.json')
    for ident in ['boss_locomotion','boss_basics','boss_thrust_vertical','vfx_basics']:
        folder=ROOT/'assets/exports/bosses/hoan_nhan_hong_liet_v01';atlas=read(folder/(ident+'.json'));first=next(iter(atlas['frames'].values()))['frame'];canvas=[first['w'],first['h']]
        groups={}
        for f in runtime['selectedFrames'][ident]:groups.setdefault(f.rsplit('_',1)[0],[]).append(f)
        output.append(dict(id='hhl_'+ident,sheet=cp(folder/(ident+'.png')),atlas=cp(folder/(ident+'.json')),canvas=canvas,pivot=[canvas[0]*.5,canvas[1]*(.8 if ident.startswith('boss') else .5)],animations=[dict(name=k,frames=v,frameDurationsMs=[100]*len(v),loop='idle' in k or 'walk' in k,facing=k.split('_')[0],phase=k) for k,v in groups.items()],sourceMetadata='assets/runtime/hoan_nhan_hong_liet_v04.json',kind='retained-approved-selected-raster'))
    save(BASE/'support-copy-manifest.json',dict(files=copies))
    return output

def validate(components):
    rows=[]
    for c in components:
        a=read(ROOT/c['atlas'])['frames'];im=Image.open(ROOT/c['sheet']).convert('RGBA');count=0
        for clip in c['animations']:
            assert len(clip['frames'])==len(clip['frameDurationsMs']) and clip['frames'],(c['id'],clip['name'])
            for name in clip['frames']:
                f=a[name]['frame'];assert [f['w'],f['h']]==c['canvas'],(c['id'],name,'metadata canvas mismatch');assert f['x']>=0 and f['y']>=0 and f['x']+f['w']<=im.width and f['y']+f['h']<=im.height
                crop=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));assert crop.getchannel('A').getbbox(),(c['id'],name)
                if c.get('sourceFile'):
                    expected=Image.open(BASE/'exported'/c['id']/'frames'/(name+'.png')).convert('RGBA');assert crop.tobytes()==expected.tobytes(),name
                count+=1
        rows.append(dict(id=c['id'],frames=count,tags=len(c['animations'])))
    for c in read(BASE/'support-copy-manifest.json')['files']:assert sha(ROOT/c['source'])==sha(ROOT/c['copy'])==c['sha256']
    save(BASE/'previews/static-validation.json',dict(status='PASS',components=rows,frameReferences=sum(x['frames'] for x in rows),tags=sum(x['tags'] for x in rows)))

if __name__=='__main__':
    protected()
    if len(sys.argv)>1 and sys.argv[1]=='validate':validate(read(BASE/'manifest.json')['components'])
    else:
        if len(sys.argv)>2 and sys.argv[1]=='source':
            changed=new_art(sys.argv[2]);components=[read(p) for p in sorted((BASE/'exported').glob('*/*.animations.json')) if p.parent.name not in {c['id'] for c in changed}]+changed+retain()
        else:components=([read(p) for p in sorted((BASE/'exported').glob('*/*.animations.json'))] if len(sys.argv)>1 and sys.argv[1]=='retain' else new_art())+retain()
        excluded=[]
        for c in components:
            if not c.get('sourceFile'):continue
            c['feetPivot']=c['pivot'] if c['role']=='character' else None
            c['effectAnchor']=c['pivot'] if c['role']=='vfx' else None
            if c['role']=='character':c['nativeBodyHeight']=60
            atlas=read(ROOT/c['atlas'])['frames'];im=Image.open(ROOT/c['sheet']).convert('RGBA')
            clips=[]
            for a in c['animations']:
                pairs=[]
                for n,d in zip(a['frames'],a['frameDurationsMs']):
                    f=atlas[n]['frame'];crop=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                    if crop.getchannel('A').getbbox():pairs.append((n,d))
                    else:excluded.append(dict(component=c['id'],frame=n,reason='Soft-alpha source exported empty at opaque pixel-art threshold; use separate renderer fade, never select blank cel'))
                if pairs:a['frames']=[x[0] for x in pairs];a['frameDurationsMs']=[x[1] for x in pairs];clips.append(a)
            c['animations']=clips;save(BASE/'exported'/c['id']/(c['id']+'.animations.json'),c)
        save(SRC/'excluded-cels.json',dict(excluded=excluded))
        save(BASE/'manifest.json',dict(revision='r3-batch03-all-remaining',directorApproved=False,productionIntegrated=False,phaserProductionVerified=False,components=components,selectedTags={c['id']:[a['name'] for a in c['animations']] for c in components},timingAuthority='Independent presentation fixtures only; never authoritative gameplay',pending='Director art review; exact stats; production Phaser/state/event integration'))
        validate(components)
    print('Batch03 static checks PASS')
