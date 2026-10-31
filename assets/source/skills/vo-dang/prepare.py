"""Prepare original generated raster cels for Aseprite; never paint replacement art."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json, hashlib, os

ROOT = Path(__file__).resolve().parents[4]
BASE = Path(__file__).resolve().parent
EXPORT = ROOT / 'assets/exports/skills/vo-dang'
REVIEW = ROOT / 'assets/reviews/skills/vo-dang'
REL = BASE.relative_to(ROOT).as_posix()
DIRS = ['down', 'left', 'right', 'up']
THRESHOLD = 220

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def write(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def relative(p): return p.relative_to(ROOT).as_posix()

lock = read(ROOT / 'assets/approved_vo_dang.lock.json')
for name, checksum in lock['files'].items():
    assert digest(ROOT / name) == checksum, f'Approved character changed: {name}'
prior = EXPORT / 'production_manifest_v01.json'
if prior.exists() and read(prior).get('productionArtApproved'):
    raise RuntimeError('Approved production exists; use a separately reviewed revision.')
approval = read(BASE / 'concept_approval_v01.json')
for entry in approval['entries']:
    for key in ['skillConcept', 'iconConcept']:
        item = entry[key]
        if item['status'] == 'approved':
            assert digest(ROOT / item['path']) == item['sha256']
    assert entry['iconConcept']['status'] == 'approved'
    if entry['id'] not in ['vo_dang_quyen', 'vo_dang_kiem', 'thai_cuc_tam_phap']:
        assert entry['skillConcept']['status'] == 'approved'
briefs = read(BASE / 'production_briefs_v01.json')
LIMIT=os.environ.get('VOLAM_ART_COMPONENT')
previous=read(BASE/'recipe.json') if LIMIT else None
assets=[a for a in previous['assets'] if a['id']!=LIMIT] if LIMIT else []
placements=[p for p in read(BASE/'frame_placements_v01.json')['placements'] if p['asset']!=LIMIT] if LIMIT else []

def source_cells(path):
    im = Image.open(path).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a:255 if a >= THRESHOLD else 0))
    mask = im.getchannel('A')
    ys = [0]
    for row in range(1, 4):
        target = im.height * row // 4
        boundary = min(range(target-36,target+37), key=lambda y:(sum(mask.crop((0,y,im.width,y+1)).getdata()),abs(y-target)))
        ys.append(boundary)
    ys.append(im.height)
    rows = []
    for row in range(4):
        cells=[]
        for col in range(4):
            rect=(col*im.width//4,ys[row],(col+1)*im.width//4,ys[row+1])
            cell=im.crop(rect)
            assert cell.getbbox(), (path,row,col)
            cells.append((cell,rect))
        rows.append(cells)
    return rows

def feet(im):
    """Ground contact from the two dark boots, excluding thin silver blade tips."""
    box=im.getbbox(); px=im.load()
    candidates=[]
    for y in range(max(box[1],int(im.height*.60)),box[3]):
        xs=[x for x in range(72,min(312,im.width)) if px[x,y][3] and max(px[x,y][:3])<135]
        if len(xs)>=4:candidates.append((y,xs))
    assert candidates, box
    bottom=candidates[-1][0]
    xs=[x for y,xx in candidates if y>=bottom-15 for x in xx]
    return [(min(xs)+max(xs))/2,bottom+1]

def align(cell, scale, anchor, canvas, pivot, mirror=False):
    bbox=cell.getbbox(); assert bbox
    crop=cell.crop(bbox)
    w,h=max(1,round(crop.width*scale)),max(1,round(crop.height*scale))
    crop=crop.resize((w,h),Image.Resampling.NEAREST)
    x=round(pivot[0]-(anchor[0]-bbox[0])*scale)
    y=round(pivot[1]-(anchor[1]-bbox[1])*scale)
    assert x>0 and y>0 and x+w<canvas[0] and y+h<canvas[1], ('clipping',x,y,w,h,canvas)
    frame=Image.new('RGBA',canvas)
    frame.paste(crop,(x,y))
    if mirror: frame=ImageOps.mirror(frame)
    return frame

def baseline_frame(style, state, direction, index):
    return Image.open(ROOT/f'assets/exports/characters/vo_dang_v01/{style}/frames/{state}_{direction}_{index}.png').convert('RGBA')

def component(sid, kind, canvas, pivot, method):
    folder=BASE/sid/kind; (folder/'frames').mkdir(parents=True,exist_ok=True)
    (EXPORT/sid).mkdir(parents=True,exist_ok=True)
    a={'id':sid+'_'+kind,'skillId':sid,'kind':kind,'canvas':canvas,'pivot':pivot,
       'sourceFolder':relative(folder),'exportFolder':relative(EXPORT/sid),
       'artMethod':method,'animations':[]}
    assets.append(a); return a

def tag(a, name, frames, ms, direction, stage, placement, loop=False, offset=None):
    paths=[]
    for index,im in enumerate(frames):
        path=ROOT/a['sourceFolder']/'frames'/f'{name}_{index}.png'
        im.save(path); paths.append(relative(path))
    a['animations'].append({'name':name,'frames':paths,'durationMs':ms,'loop':loop,
       'direction':direction,'stage':stage,'placement':placement,'effectPlacementOffset':offset or [0,0]})

# Generator-facing errors are corrected explicitly; no sword hand is mirrored.
row_map={'luong_nghi_thu':{'down':0,'left':2,'right':1,'up':3},
         'duong_khi_kich':{'down':0,'left':2,'right':1,'up':3}}
for index, spec in enumerate(briefs['characters']):
    sid=spec['id'];style='quyen' if index<5 else 'kiem'
    if LIMIT and LIMIT!=sid+'_character':continue
    canvas=[80,80] if style=='quyen' else [96,80];pivot=[canvas[0]//2,64]
    source=BASE/'generated'/f'{sid}_character_v01.png';rows=source_cells(source)
    a=component(sid,'character',canvas,pivot,'Fresh original image_gen poses; hard alpha cleanup, measured boot alignment, fixed body scale per facing; explicit corrections/reuse below.')
    a['rawSource']=relative(source);a['reuseNotes']=[]
    for direction in DIRS:
        row=row_map.get(sid,dict(zip(DIRS,range(4))))[direction]
        cells=rows[row]; reference=cells[3 if sid=='bat_quai_kiem_tran' else 0][0]
        body_box=reference.getbbox();foot=feet(reference)
        scale=44/(foot[1]-body_box[1])
        frames=[]
        for col,(cell,rect) in enumerate(cells):
            anchor=feet(cell)
            mirrored=(sid=='duong_khi_kich' and direction=='left')
            frame=align(cell,scale,anchor,canvas,pivot,mirrored)
            frames.append(frame)
            placements.append({'asset':a['id'],'direction':direction,'index':col,'rawSource':relative(source),
                'sourceRectPx':list(rect),'sourceFootPx':anchor,'constantRowScale':scale,'mirrorX':mirrored,'outputCanvasPx':canvas,'footPivotPx':pivot})
        if sid=='duong_khi_kich' and direction=='left':a['reuseNotes'].append('Left unarmed facing uses exact horizontal mirror of newly authored palm poses; no sword artwork mirrored.')
        if sid=='nhan_kiem_hop_nhat' and direction=='left':
            frames=[baseline_frame(style,'basic_attack',direction,i) for i in range(4)]
            a['reuseNotes'].append('Left thrust uses four unchanged approved Kiếm basic frames; incorrect raw right-facing row excluded.')
        if sid=='van_kiem_quy_tong' and direction=='left':
            frames[1]=baseline_frame(style,'basic_attack',direction,1)
            frames[2]=baseline_frame(style,'basic_attack',direction,2)
            a['reuseNotes'].append('Left release/contact reuse approved Kiếm basic frames1/2; new preparation/recovery retained.')
        if sid=='toa_sat_bac_do' and direction=='left':
            frames[2]=baseline_frame(style,'basic_attack',direction,2)
            a['reuseNotes'].append('Left retaliation contact reuses approved Kiếm contact frame2 to preserve heading/weapon hand.')
        if sid=='thai_cuc_than_cong' and direction=='left':
            frames[3]=baseline_frame(style,'idle',direction,0)
            a['reuseNotes'].append('Left recovery uses unchanged approved unarmed idle to correct raw facing drift.')
        ms=100 if sid in ['thai_cuc_tran','bat_quai_kiem_tran'] else 90 if sid in ['thai_cuc_than_cong','van_kiem_quy_tong'] else 80
        tag(a,'cast_'+direction,frames,ms,direction,'cast','character_feet')
        if sid=='toa_sat_bac_do':
            tag(a,'ready_'+direction,[frames[0]],100,direction,'readiness','character_feet',True)
            tag(a,'counter_'+direction,frames[1:],80,direction,'triggered_counter','character_feet')

# stage, target width, cardinal transform, loop, placement
stages=[
 [('release',32,True,False,'caster_hand'),('impact',28,True,False,'target'),('weakening',12,False,True,'target_above_head'),('ending',30,True,False,'caster_hand')],
 [('release',42,True,False,'caster_hand'),('travel',50,True,True,'projectile'),('slow',14,False,True,'target_feet'),('impact',38,True,False,'target')],
 [('release',26,True,False,'caster_hand'),('impact',26,True,False,'target'),('mana_return',22,True,False,'caster_body'),('ending',22,True,False,'target')],
 [('activation',60,False,False,'caster_body'),('loop',64,False,True,'caster_body'),('absorption',70,False,False,'caster_body'),('ending',60,False,False,'caster_body')],
 [('activation',158,False,False,'ground'),('loop',158,False,True,'ground'),('pulse',158,False,False,'ground'),('ending',158,False,False,'ground')],
 [('slash_a',50,True,False,'caster_front'),('slash_b',50,True,False,'caster_front'),('impact',22,True,False,'target'),('ending',38,True,False,'caster_front')],
 [('release',38,True,False,'caster_hand'),('travel',64,True,True,'projectile'),('impact',30,True,False,'target'),('ending',48,True,False,'projectile')],
 [('activation',158,False,False,'ground'),('loop',158,False,True,'ground'),('pulse',158,False,False,'ground'),('ending',158,False,False,'ground')],
 [('readiness',16,True,True,'caster_hand'),('received',18,True,False,'caster_body'),('counter',50,True,False,'caster_front'),('ending',36,True,False,'caster_front')],
 [('preparation',32,False,False,'caster_body'),('release',60,True,False,'caster_hand'),('travel',64,True,True,'projectile'),('impact',36,True,False,'target')],
]
for index,spec in enumerate(briefs['effects']):
    sid=spec['id']
    if LIMIT and LIMIT!=sid+'_vfx':continue
    source=BASE/'generated'/f'{sid}_vfx_v01.png'
    if sid=='bat_quai_kiem_tran' and (BASE/'generated'/f'{sid}_vfx_v02.png').exists():source=BASE/'generated'/f'{sid}_vfx_v02.png'
    rows=source_cells(source)
    canvas=[192,192] if sid in ['thai_cuc_tran','bat_quai_kiem_tran'] else [112,112] if sid=='thai_cuc_than_cong' else [96,96]
    pivot=[canvas[0]//2,canvas[1]//2]
    a=component(sid,'vfx',canvas,pivot,'Fresh original image_gen stage drawings; binary-alpha cleanup and one constant scale per stage; exact quarter-turn cardinal variants.')
    a['rawSource']=relative(source)
    for row,(stage,width,directional,loop,placement) in enumerate(stages[index]):
        cells=rows[row];maxwidth=max(c.getbbox()[2]-c.getbbox()[0] for c,_ in cells)
        scale=width/maxwidth
        frames=[]
        for col,(cell,rect) in enumerate(cells):
            b=cell.getbbox();anchor=[(b[0]+b[2])/2,(b[1]+b[3])/2]
            frames.append(align(cell,scale,anchor,canvas,pivot))
            placements.append({'asset':a['id'],'stage':stage,'index':col,'rawSource':relative(source),
                'sourceRectPx':list(rect),'sourceCenterPx':anchor,'constantStageScale':scale,'outputCanvasPx':canvas,'pivotPx':pivot})
        directions=[('right',None),('down',Image.Transpose.ROTATE_270),('left',Image.Transpose.ROTATE_180),('up',Image.Transpose.ROTATE_90)] if directional else [('none',None)]
        for direction,rotation in directions:
            images=[f.transpose(rotation) if rotation is not None else f for f in frames]
            offset=[0,-22] if placement=='caster_body' else [0,-52] if placement=='target_above_head' else [0,0]
            if placement in ['caster_hand','caster_front']:
                dx,dy={'right':(1,0),'left':(-1,0),'up':(0,-1),'down':(0,1)}[direction]
                offset=[dx*(18 if placement=='caster_hand' else 28),dy*12-22]
            tag(a,stage+('_'+direction if directional else ''),images,100 if loop else 65,direction,stage,placement,loop,offset)

# Static icons derive from explicitly approved icon artwork, not action/reference crops.
icon_records=previous['icons'] if LIMIT else []
template=Image.open(ROOT/approval['entries'][0]['iconConcept']['path']).convert('RGBA').resize((64,64),Image.Resampling.NEAREST)
for entry in ([] if LIMIT else approval['entries']):
    sid=entry['id'];src=ROOT/entry['iconConcept']['path'];im=Image.open(src).convert('RGBA')
    inset=round(im.width*.045)
    art=im.crop((inset,inset,im.width-inset,im.height-inset)).resize((54,54),Image.Resampling.NEAREST)
    icon=template.copy();icon.paste(art,(5,5))
    folder=BASE/sid/'icon';folder.mkdir(parents=True,exist_ok=True)
    raw=folder/'icon.png';icon.save(raw)
    (EXPORT/sid).mkdir(parents=True,exist_ok=True);icon.save(EXPORT/sid/'icon.png')
    icon_records.append({'id':sid,'nameVi':entry['nameVi'],'source':relative(raw),'editableSource':relative(folder/'icon.aseprite'),
        'path':relative(EXPORT/sid/'icon.png'),'dimensionsPx':[64,64],'approvedIconConcept':entry['iconConcept'],
        'processing':'Nearest-neighbor54px inner art plus uniform5px raster frame from approved Lưỡng Nghi icon; no generated lettering/hotkeys.',
        'status':'prototype_pending_final_approval','sha256':digest(EXPORT/sid/'icon.png')})

write(BASE/'recipe.json',{'assets':assets,'icons':icon_records})
write(BASE/'frame_placements_v01.json',{'alphaThreshold':THRESHOLD,'placements':placements,
    'policy':'Only source-pixel cleanup, cropping, fixed-scale nearest sampling, measured anchor alignment and exact cardinal transforms. No procedural replacement illustration.'})
write(BASE/'icons_v01.json',icon_records)
REVIEW.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGB',(960,10*180),'#263743');draw=ImageDraw.Draw(sheet)
for row,a in enumerate([a for a in assets if a['kind']=='character']):
    draw.text((4,row*180+3),a['skillId'],fill='white')
    for j,anim in enumerate([n for n in a['animations'] if n['name'].startswith('cast_')]):
        for k,path in enumerate(anim['frames']):
            im=Image.open(ROOT/path).convert('RGBA').resize((a['canvas'][0]*2,a['canvas'][1]*2),Image.Resampling.NEAREST)
            # One action per facing in a shared strip; full four-frame strips are retained separately.
            if k==1:sheet.paste(im,(j*240+24,row*180+20),im)
sheet.save(REVIEW/'character_facings_2x.png')
print(f'Prepared{len(assets)} character/VFX components,{len(icon_records)} icons; protected character hashes unchanged.')
