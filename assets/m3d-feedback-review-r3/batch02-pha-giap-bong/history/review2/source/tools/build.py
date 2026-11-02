"""Batch02 adapter of retained raster measurement/assembly; never rebuild batch01."""
from pathlib import Path
import sys,json,importlib.util
import numpy as np
import hashlib
from PIL import Image
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[5]
BASE=ROOT/'assets/m3d-feedback-review-r3/batch02-pha-giap-bong'
SRC=BASE/'source'
spec=importlib.util.spec_from_file_location('draft_helpers',ROOT/'assets/m3d-feedback-review-r3/source/tools/build-draft.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
b.mc.BASE=SRC;b.me.BASE=SRC
read=b.read;save=b.save;rel=b.rel

def ground_anchor(entry,direction,raw):
    x,y,w,h=entry['rect'];pixels=raw[y:y+h,x:x+w]
    owned=np.zeros((h,w),dtype=bool)
    for yy,l,r in entry['runs']:owned[yy-y,l-x:r-x]=True
    gold=owned&(pixels[:,:,0]>170)&(pixels[:,:,1]>105)&(pixels[:,:,3]>=220)
    if direction in ['right','left']:
        lo,hi=(int(w*.05),int(w*.20)) if direction=='right' else (int(w*.80),int(w*.95))
        ys,xs=np.where(gold[:,lo:hi]);assert len(ys)>=3,(direction,'missing ground seam')
        return [w*(.1 if direction=='right' else .9),float(np.median(ys))],len(ys)
    lo,hi=(int(h*.05),int(h*.20)) if direction=='down' else (int(h*.80),int(h*.95))
    ys,xs=np.where(gold[lo:hi,:]);assert len(xs)>=3,(direction,'missing ground seam')
    return [float(np.median(xs)),h*(.1 if direction=='down' else .9)],len(xs)

def build():
    selected_role=sys.argv[1] if len(sys.argv)>1 else None
    before=read(BASE/'previews/protected-before.json')
    for check in before['locks']:
        import hashlib
        for f,h in read(ROOT/check['lock'])['files'].items():
            assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h,f
    if selected_role=='validate':
        validate(read(BASE/'manifest.json')['components'])
        return
    body='pha_giap_body_v02';vfx='pha_giap_vfx_v01';spin='pha_giap_spin_v03'
    b.mc.measure('',body,4,5,44);b.mc.measure('',spin,4,6,44);b.me.measure('',vfx,4,5)
    chars=read(SRC/'character_measurements.json')[body]
    spin_chars=read(SRC/'character_measurements.json')[spin]
    effects=read(SRC/'effect_measurements.json')[vfx]
    raw_vfx=np.asarray(Image.open(SRC/'generated'/(vfx+'.png')).convert('RGBA'))
    ground_anchors=[]
    # Dark-shoe detector mistakes the staff tip for feet in the strike poses.
    # Measured planted shoe locations in the new source, not inferred gameplay.
    foot_overrides={3:[1046,263],8:[1075,506],13:[1114,740]}
    save(SRC/'foot-anchor-corrections.json',dict(source='generated/'+body+'.png',
        reason='Strike staff tip lies beyond shoes; use actual shoe baseline and center, not weapon endpoint',
        anchors={str(k):v for k,v in foot_overrides.items()}))
    prepared=[]
    for role,ident in [('character','b2_pha_giap_body'),('vfx','b2_pha_giap_vfx')]:
        dest=BASE/'exported'/ident;(dest/'frames').mkdir(parents=True,exist_ok=True)
        c=dict(id=ident,role=role,canvas=[256,192] if role=='character' else [384,384],
            pivot=[128,148] if role=='character' else [192,192],frames=[],clips=[],
            sourceFile=rel(SRC/(ident+'.aseprite')),individualDirectory=rel(dest/'frames'))
        if role=='character':
            im=Image.open(ROOT/'assets/exports/characters/hero_cai_bang.png').convert('RGBA')
            colors=[p[:3] for p in im.getdata() if p[3]>=220]
            q=Image.new('RGB',(len(colors),1));q.putdata(colors);pal=q.quantize(colors=128).getpalette()
            c['palette']=[pal[i:i+3] for i in range(0,384,3)]
        for row,direction in enumerate(['right','down','left','up']):
            phases=[('spin',[0,1,2,3,4,5,2,3]),('raise',[1]),('elongate',[2]),('strike',[3]),('recovery',[4])] if role=='character' else [('spin',[0,1]),('charge',[2]),('impact',[3]),('outro',[4])]
            for phase,columns in phases:
                names=[];durations=[];tag=phase+'_'+direction
                for frame_index,col in enumerate(columns):
                    index=row*5+col;name=tag+'_'+str(frame_index);duration=140 if role=='character' else 110
                    source_id=body if role=='character' else vfx
                    mirror=False
                    if role=='character':
                        if phase=='spin':
                            index=row*6+col
                            # Source left cel3 repeats the rising diagonal. Mirrored right
                            # cel1 supplies the missing falling diagonal, with real arm pose.
                            if direction=='left' and col==3:index=1;mirror=True
                            e=spin_chars['frames'][index];scale=spin_chars['scale'];foot=e['foot']
                            source_id=spin;duration=40
                        else:
                            e=chars['frames'][index];scale=chars['scale'];foot=foot_overrides.get(index,e['foot'])
                        x,y,r,bot=e['bounds'];rect=[x,y,r-x,bot-y]
                        anchor=[foot[0]-x,foot[1]-y]
                    else:
                        e=effects['frames'][index];rect=e['rect'];w,h=rect[2:]
                        scale=.22 if phase=='spin' else .18 if phase=='charge' else .42
                        anchor=[w/2,h/2]
                        if phase in ['impact','outro']:
                            anchor,count=ground_anchor(e,direction,raw_vfx)
                            ground_anchors.append(dict(tag=tag,sourceRect=rect,sourceAnchor=anchor,nearEndCorePixels=count))
                        if phase=='spin':duration=160
                    c['frames'].append(dict(source=rel(SRC/'generated'/(source_id+'.png')),
                        rect=rect,runs=e['runs'],anchor=anchor,scale=scale,threshold=220,kind=role,
                        pivot=c['pivot'],name=name,tag=tag,durationMs=duration,mirror=mirror))
                    names.append(name);durations.append(duration)
                offset=[0,0]
                if role=='vfx' and phase=='spin':offset=[0,-15]
                if role=='vfx' and phase=='charge':offset={'right':[49,-61],'down':[53,-44],'left':[-46,-60],'up':[44,-51]}[direction]
                if role=='vfx' and phase in ['impact','outro']:offset={'right':[16,6],'left':[-16,6],'down':[0,12],'up':[0,-12]}[direction]
                c['clips'].append(dict(name=tag,phase=phase,facing=direction,frames=names,
                    frameDurationsMs=durations,durationMsTotal=sum(durations),loop=phase=='spin' or (phase=='charge' and role=='vfx'),
                    placementOffsetFromFeet=offset,origin=[c['pivot'][0]/c['canvas'][0],c['pivot'][1]/c['canvas'][1]],status='keypose-draft-awaiting-director'))
        prepared.append(c)
    save(SRC/'measured-ground-anchors.json',dict(method='near-end bright ground seam median, owned source pixels; never bbox percentage Y',anchors=ground_anchors))
    save(SRC/'spin-selection.json',dict(source=spin+'.png',sourceCels=24,
        sequence=[0,1,2,3,4,5,2,3],durationMsPerFrame=40,
        note='Eight frame references use six authored poses per direction; last vertical/diagonal repeat for rotation continuity. Left source cel3 omitted; use mirrored right cel1 for the opposite diagonal. No whole-character rotation.'))
    save(SRC/'assembly_plan.json',{'components':prepared,'newCharacterPalette':[]})
    template=(ROOT/'assets/m3d-feedback-visual/source/tools/assemble.lua').read_text(encoding='utf-8')
    template=template.replace("local folder=root..'/assets/m3d-feedback-visual/source'","local folder=root..'/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/source'")
    (SRC/'tools/assemble.lua').write_text(template,encoding='utf-8')
    params=['--script-param','role='+selected_role] if selected_role else []
    b.run([b.ASE,'-b','--script-param','root='+ROOT.as_posix(),'--script-param','batch=02',*params,'--script',SRC/'tools/assemble.lua'])
    spec=importlib.util.spec_from_file_location('contacts',ROOT/'assets/m3d-feedback-visual/source/tools/build.py')
    contact=importlib.util.module_from_spec(spec);spec.loader.exec_module(contact);contact.PRE=BASE/'previews'
    components=[]
    for c in prepared:
        if selected_role and c['role']!=selected_role:
            components.append(next(x for x in read(BASE/'manifest.json')['components'] if x['id']==c['id']))
            continue
        dest=BASE/'exported'/c['id'];sheet=dest/(c['id']+'.png');atlas=dest/(c['id']+'.json')
        b.run([b.ASE,'-b',ROOT/c['sourceFile'],'--sheet-type','rows','--sheet-columns','5',
            '--border-padding','2','--shape-padding','2','--format','json-hash','--list-tags','--list-slices',
            '--filename-format','{tag}_{tagframe}','--sheet',sheet,'--data',atlas])
        meta=dict(id=c['id'],role=c['role'],canvas=c['canvas'],pivot=c['pivot'],sheet=rel(sheet),atlas=rel(atlas),
            sourceFile=c['sourceFile'],animations=c['clips'],status='keypose-draft-awaiting-director',
            directorApproved=False,productionIntegrated=False,phaserProductionVerified=False)
        save(dest/(c['id']+'.animations.json'),meta);components.append(meta)
        groups=[]
        for direction in ['right','down','left','up']:
            aa=[a for a in c['clips'] if a['facing']==direction]
            groups.append(dict(name=direction,frames=[n for a in aa for n in a['frames']],frameDurationsMs=[d for a in aa for d in a['frameDurationsMs']]))
        contact.contact({**c,'clips':groups},dest)
    save(BASE/'manifest.json',dict(revision='r3-batch02-pha-giap-bong-review2',skillId='pha_giap_bong',
        components=components,selectedTags={c['id']:[a['name'] for a in c['animations']] for c in components},
        status='keypose-draft-awaiting-director',directorApproved=False,productionIntegrated=False,
        phaserProductionVerified=False,timingAuthority='Cosmetic fixture only; no damage/range/cooldown derived from frames'))
    validate(components)

def validate(components):
    report={'status':'PASS','scope':'Static raster/source/atlas validation only','components':[],'groundSeams':[],'physicalSpin':[]}
    for c in components:
        atlas=read(ROOT/c['atlas']);im=Image.open(ROOT/c['sheet']).convert('RGBA')
        for a in c['animations']:
            hashes=set()
            for name in a['frames']:
                f=atlas['frames'][name]['frame'];crop=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                frame=Image.open(BASE/'exported'/c['id']/'frames'/(name+'.png')).convert('RGBA')
                assert crop.tobytes()==frame.tobytes(),name
                hashes.add(hashlib.sha256(crop.tobytes()).hexdigest())
                box=crop.getchannel('A').getbbox();assert box,name
                assert box[0]>0 and box[1]>0 and box[2]<c['canvas'][0] and box[3]<c['canvas'][1],('clipped',name,box)
                assert set(crop.getchannel('A').getdata())<={0,255},name
                if c['role']=='vfx' and a['phase'] in ['impact','outro'] and a['facing'] in ['left','right']:
                    px,py=c['pivot'];arr=np.asarray(crop);roi=arr[py-10:py+11,px-5:px+6]
                    yy,xx=np.where((roi[:,:,3]>220)&(roi[:,:,0]>170)&(roi[:,:,1]>105))
                    assert len(yy)>0,('missing exported seam',name)
                    seam_y=float(np.median(yy)+py-10)
                    assert abs(seam_y-py)<=3,('ground seam floats',name,seam_y,py)
                    report['groundSeams'].append(dict(tag=a['name'],medianY=seam_y,anchorY=py))
            if c['role']=='character' and a['phase']=='spin':
                assert len(a['frames'])==8 and len(hashes)>=4,('static staff spin',a['name'])
                report['physicalSpin'].append(dict(tag=a['name'],frameReferences=len(a['frames']),distinctRasterPoses=len(hashes)))
        report['components'].append(dict(id=c['id'],frames=len(atlas['frames']),tags=len(c['animations'])))
    save(BASE/'previews/static-validation.json',report);print(json.dumps(report))

if __name__=='__main__':build()
