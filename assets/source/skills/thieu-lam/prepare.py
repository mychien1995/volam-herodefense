"""Measured preparation of generated raster cels; no replacement artwork is painted."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, hashlib
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
EXPORT=ROOT/'assets/exports/skills/thieu-lam'
REVIEW=ROOT/'assets/reviews/skills/thieu-lam'
DIRS=['down','left','right','up']
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,v):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rel(p):return p.relative_to(ROOT).as_posix()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for lockpath in ROOT.glob('assets/approved_*.lock.json'):
    for p,h in read(lockpath)['files'].items():assert sha(ROOT/p)==h,('Protected art changed',p)
skills=read(BASE/'production_brief_v01.json')['skills']
assets=[];icons=[];placements=[]
def cells(path):
    im=Image.open(path).convert('RGBA');im.putalpha(im.getchannel('A').point(lambda v:255 if v>=220 else 0))
    mask=im.getchannel('A');ys=[0]
    for row in range(1,4):
        mid=im.height*row//4
        ys.append(min(range(mid-32,mid+33),key=lambda y:(sum(mask.crop((0,y,im.width,y+1)).getdata()),abs(y-mid))))
    ys.append(im.height)
    return [[(im.crop((c*im.width//4,ys[r],(c+1)*im.width//4,ys[r+1])),[c*im.width//4,ys[r],(c+1)*im.width//4,ys[r+1]]) for c in range(4)] for r in range(4)]
def clean_character(im):
    # Remove only tiny disconnected alpha debris introduced around generated cels.
    # All retained color pixels come from the original source; no artwork is painted.
    im=im.copy();alpha=im.getchannel('A');w,h=im.size
    todo={i for i,a in enumerate(alpha.getdata()) if a};removed=[]
    while todo:
        first=todo.pop();stack=[first];component=[first]
        while stack:
            i=stack.pop();x=i%w
            for n in ([i-w] if i>=w else [])+([i+w] if i+w<w*h else [])+([i-1] if x else [])+([i+1] if x<w-1 else []):
                if n in todo:todo.remove(n);stack.append(n);component.append(n)
        if len(component)<64:removed.extend(component)
    for i in removed:im.putpixel((i%w,i//w),(0,0,0,0))
    return im
def foot(im):
    b=im.getbbox();px=im.load();points=[]
    for y in range(max(b[1],int(im.height*.55)),b[3]):
        xs=[x for x in range(b[0],b[2]) if px[x,y][3] and max(px[x,y][:3])<140]
        if len(xs)>=4:points.append((y,xs))
    assert points,('No boots',b)
    bottom=points[-1][0];xs=[x for y,row in points if y>=bottom-8 for x in row]
    return [(min(xs)+max(xs))/2,bottom+1]
def scalp(im):
    px=im.load();b=im.getbbox()
    for y in range(b[1],int(im.height*.7)):
        count=sum(1 for x in range(im.width) if px[x,y][3] and px[x,y][0]>160 and px[x,y][1]>100 and px[x,y][2]>55 and px[x,y][0]-px[x,y][1]>15 and px[x,y][1]-px[x,y][2]>15)
        if count>=im.width*.14:return y
    return b[1]
def align(im,scale,anchor,canvas,pivot):
    b=im.getbbox();assert b
    crop=im.crop(b);size=[max(1,round(crop.width*scale)),max(1,round(crop.height*scale))]
    crop=crop.resize(size,Image.Resampling.NEAREST)
    x=round(pivot[0]-(anchor[0]-b[0])*scale);y=round(pivot[1]-(anchor[1]-b[1])*scale)
    assert x>0 and y>0 and x+size[0]<canvas[0] and y+size[1]<canvas[1],('Clipping',x,y,size,canvas)
    out=Image.new('RGBA',canvas);out.paste(crop,(x,y));return out
def component(s,kind,canvas,pivot,raw):
    folder=BASE/s['id']/kind;(folder/'frames').mkdir(parents=True,exist_ok=True);(EXPORT/s['id']).mkdir(parents=True,exist_ok=True)
    a=dict(id=s['id']+'_'+kind,skillId=s['id'],kind=kind,canvas=canvas,pivot=pivot,sourceFolder=rel(folder),exportFolder=rel(EXPORT/s['id']),rawSource=rel(raw),animations=[],reuseNotes=[],artMethod='Original image_gen raster cels; binary-alpha cleanup, removal of tiny disconnected alpha debris, measured fixed-scale nearest sampling and anchor alignment. No procedural substitute illustration.')
    assets.append(a);return a
def tag(a,name,frames,ms,direction,stage,placement,loop=False,offset=None):
    paths=[]
    for i,im in enumerate(frames):
        p=ROOT/a['sourceFolder']/'frames'/f'{name}_{i}.png';im.save(p);paths.append(rel(p))
    a['animations'].append(dict(name=name,frames=paths,durationMs=ms,loop=loop,direction=direction,stage=stage,placement=placement,effectPlacementOffset=offset or [0,0]))
for s in skills:
    sid=s['id'];raw=BASE/'generated'/f'{sid}_character_v01.png'
    if (BASE/'generated'/f'{sid}_character_v02.png').exists():raw=BASE/'generated'/f'{sid}_character_v02.png'
    if not raw.exists():continue
    rows=cells(raw);a=component(s,'character',[128,120],[64,96],raw)
    for row,d in enumerate(DIRS):
        selected=rows[row]; selected_raw=raw
        if d=='left':
            index=next(i for i,k in enumerate(skills) if k['id']==sid)
            if index<8:
                correction=BASE/'generated'/f'quyen_left_corrections_{1+index//4:02d}_v01.png'
                if correction.exists():
                    selected=cells(correction)[index%4];selected_raw=correction
                    a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Left facing uses four newly drawn direction-correction cels. Incorrect original row excluded; no character mirror transforms.')
        if d=='left' and sid in ['tru_ta','tam_gioi_quy_thien','nhu_lai_thien_diep']:
            correction=BASE/'generated'/'dao_left_corrections_v01.png'
            if correction.exists():
                selected=cells(correction)[['tru_ta','tam_gioi_quy_thien','nhu_lai_thien_diep'].index(sid)];selected_raw=correction
                a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Left attack uses four newly drawn right-hand-dao correction cels; original inconsistent left row excluded.')
        if d=='left' and sid=='bat_dong_minh_vuong':
            correction=BASE/'generated'/'kim_quang_ho_tran_character_v02.png'
            selected=cells(correction)[1];selected_raw=correction
            a['correctionSources']=[rel(correction)];a['reuseNotes'].append('Four left-facing support-channel cels explicitly shared from new Kim Quang Ho Tran support cast to correct facing; this skill retains separate healing VFX and other12 own cels. No approved basic clips altered.')
        selected=[(clean_character(im),rect) for im,rect in selected]
        reference=selected[3 if sid=='nhu_lai_niet_ban' else 0][0];scale=44/(foot(reference)[1]-scalp(reference));frames=[]
        for col,(im,rect) in enumerate(selected):
            anchor=foot(im);frame=align(im,scale,anchor,a['canvas'],a['pivot'])
            lift=-2 if sid=='vo_anh_cuoc' and col==1 else -1 if sid=='vo_anh_cuoc' and col==2 else 0
            if lift:
                shifted=Image.new('RGBA',a['canvas']);shifted.paste(frame,(0,lift));frame=shifted
            frames.append(frame)
            placements.append(dict(asset=a['id'],direction=d,index=col,sourceRectPx=rect,sourceFootPx=anchor,constantRowScale=scale,rawSource=rel(selected_raw),mirrorX=False,bodyReferenceHeightPx=44,intentionalAirborneArtOffsetPx=[0,lift]))
        ms=110 if sid in ['nhu_lai_niet_ban','nhu_lai_thien_diep','kim_cang_bat_hoai','kim_quang_ho_tran','bat_dong_minh_vuong'] else 90
        tag(a,'cast_'+d,frames,ms,d,'cast','character_feet')
    raw=BASE/'generated'/f'{sid}_vfx_v01.png'
    if not raw.exists():continue
    rows=cells(raw);radial=sid in ['kim_quang_ho_tran','bat_dong_minh_vuong','nhu_lai_niet_ban'];canvas=[256,256] if radial else [192,192] if sid=='nhu_lai_thien_diep' else [128,128]
    a=component(s,'vfx',canvas,[canvas[0]//2,canvas[1]//2],raw)
    a['reuseNotes']=['Directional VFX use exact integer quarter-turn variants of the authored RIGHT-facing raster stage. Non-directional stages share one elevated-view drawing across facings. Character directions are separately drawn, never mirrored.']
    for row,(stage,directional,placement) in enumerate(s['stages']):
        source=rows[row];maxw=max(im.getbbox()[2]-im.getbbox()[0] for im,_ in source);maxh=max(im.getbbox()[3]-im.getbbox()[1] for im,_ in source)
        width=144 if placement=='ground' and radial else 92 if sid=='nhu_lai_thien_diep' and directional else 64 if placement in ['caster_front','caster_body'] else 16 if placement in ['target_above_head','target_feet'] else 42
        if stage.startswith('empowered'):width=58
        scale=min(width/maxw,(canvas[1]-8)/maxh);frames=[]
        for col,(im,rect) in enumerate(source):
            b=im.getbbox();anchor=[(b[0]+b[2])/2,b[1]+(b[3]-b[1])*(.82 if placement in ['ground','caster_feet','target_feet'] else .5)];frames.append(align(im,scale,anchor,canvas,a['pivot']))
            placements.append(dict(asset=a['id'],stage=stage,index=col,sourceRectPx=rect,sourceCenterPx=anchor,constantStageScale=scale))
        variants=[('right',None),('down',Image.Transpose.ROTATE_270),('left',Image.Transpose.ROTATE_180),('up',Image.Transpose.ROTATE_90)] if directional else [('none',None)]
        for d,rotation in variants:
            images=[im.transpose(rotation) if rotation is not None else im for im in frames]
            offset=[0,-22] if placement=='caster_body' else [0,-52] if placement=='target_above_head' else [0,0]
            if placement in ['caster_hand','caster_front']:
                dx,dy={'right':(1,0),'left':(-1,0),'down':(0,1),'up':(0,-1)}[d];offset=[dx*(18 if placement=='caster_hand' else 28),dy*12-22]
                if sid=='nhu_lai_thien_diep' and placement=='caster_front':offset=[dx*46,dy*72-22]
            tag(a,stage+('_'+d if directional else ''),images,100 if stage in ['loop','travel'] else 70,d,stage,placement,stage in ['loop','travel'],offset)
def icon_crop(im):
    # Detect the specifically generated square icon's long golden top/bottom frame, in the lower-right panel.
    px=im.load();runs=[]
    for y in range(im.height//2,im.height-12):
        xs=[x for x in range(im.width//2,im.width-12) if px[x,y][0]>175 and px[x,y][1]>120 and px[x,y][0]>px[x,y][2]*1.4]
        if len(xs)>im.width*.29:runs.append((y,xs))
    assert runs,'Icon frame not found'
    top=runs[0][0];bottom=runs[-1][0];xs=runs[0][1]+runs[-1][1];left=min(xs);right=max(xs)
    return [left,top,right+1,bottom+1]
for s in skills+[dict(id='dich_can_kinh',nameVi='Dịch Cân Kinh')]:
    sid=s['id'];concept=ROOT/f'assets/concepts/skills/thieu-lam/{sid}/{sid}_concept_v01.png'
    if not concept.exists():continue
    im=Image.open(concept).convert('RGBA');rect=icon_crop(im) if sid!='dich_can_kinh' else [0,0,im.width,im.height]
    out=im.crop(rect).resize((64,64),Image.Resampling.NEAREST);folder=BASE/sid/'icon';folder.mkdir(parents=True,exist_ok=True);p=folder/'icon.png';out.save(p);(EXPORT/sid).mkdir(parents=True,exist_ok=True)
    icons.append(dict(id=sid,nameVi=s['nameVi'],source=rel(p),editableSource=rel(folder/'icon.aseprite'),path=rel(EXPORT/sid/'icon.png'),dimensionsPx=[64,64],concept=rel(concept),sourceRectPx=rect,processing='Specifically drawn icon panel extracted and sampled to64px; character concepts are never used as animation cels.',status='prototype_approval_gate_waived'))
write(BASE/'recipe.json',dict(assets=assets,icons=icons))
write(BASE/'frame_placements_v01.json',dict(alphaThreshold=220,placements=placements,policy='Alignment/cropping/nearest source sampling only. No painted replacement art. New128x120 character canvas retains44px body and foot pivot64,96; normalized origin0.5,0.8.'))
REVIEW.mkdir(parents=True,exist_ok=True)
print(f'Prepared {len(assets)} components and {len(icons)} icons. Approved baselines unchanged.')


