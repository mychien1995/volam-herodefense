"""Export only the focused v02 additions; retain all v01 bytes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib, math, ast, statistics
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def read(p): return json.loads(p.read_text(encoding='utf8'))
def write(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
# Reuse retained alpha-gap cell extraction, without executing the v01 exporter.
tree=ast.parse((ROOT/'assets/sprites/bosses/main/tay-doc/source/export_assets.py').read_text(encoding='utf8').replace('*.01','*.05'))
selected=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in {'clean','split_axis','row_cuts','cells','actor_islands'}]
exec(compile(ast.Module(body=selected,type_ignores=[]),'retained_extraction','exec'))
recipes=[]
def export(source,rows,names,targets,actor=False,repair=False):
    im=clean(Image.open(source),24 if actor else 40)
    cels=cells(im,4,rows); frames={}; anims={}
    if repair:
        # The long sweep occupies a wider third cell; literal quarter cuts would sever the staff.
        cels=[]
        for top,bottom in [(0,500),(500,im.height)]:
            for left,right in [(0,420),(420,850),(850,1420),(1420,im.width)]:
                box=(left,top,right,bottom); cel=im.crop(box); cels.append((cel,box,cel.getbbox()))
    folder=HERE/('actions_v02' if repair else 'cap_mo_v02' if actor else 'effects_v02'); folder.mkdir(exist_ok=True)
    size=(160,144) if actor else (256,256)
    sheet=Image.new('RGBA',(size[0]*4,size[1]*rows))
    for row,name in enumerate(names):
        rowc=cels[row*4:row*4+4]
        # One fixed actor scale for all new poses. Effects share row-wide scale.
        factor=.17 if repair else .19 if actor else targets[row]/max(max(b[2]-b[0],b[3]-b[1]) for _,_,b in rowc)
        ids=[]
        for col,(cel,box,bbox) in enumerate(rowc):
            if actor: cel=actor_islands(cel); bbox=cel.getbbox()
            art=cel.crop(bbox)
            art=art.resize((round(art.width*factor),round(art.height*factor)),Image.Resampling.NEAREST)
            out=Image.new('RGBA',size)
            if actor:
                # Stable feet ground plane, intentional airborne elevation belongs to timeline.
                xy=(80-art.width//2,116-art.height)
            elif row<3:
                xy=(128-art.width//2,178-art.height)
            else: xy=((256-art.width)//2,(256-art.height)//2)
            assert xy[0]>=2 and xy[1]>=2 and xy[0]+art.width<size[0]-2 and xy[1]+art.height<size[1]-2
            out.alpha_composite(art,xy)
            frame=name+'_'+str(col); ids.append(frame)
            (folder/'frames').mkdir(exist_ok=True); out.save(folder/'frames'/(frame+'.png'))
            x=col*size[0]; y=row*size[1]; sheet.alpha_composite(out,(x,y))
            frames[frame]=dict(frame=dict(x=x,y=y,w=size[0],h=size[1]),rotated=False,trimmed=False,spriteSourceSize=dict(x=0,y=0,w=size[0],h=size[1]),sourceSize=dict(w=size[0],h=size[1]))
            recipes.append(dict(frame=frame,source=source.relative_to(ROOT).as_posix(),cell=list(box),content=list(bbox),scale=factor,position=list(xy),sha256=sha(folder/'frames'/(frame+'.png'))))
        anims[name]=dict(frames=ids,durationsMs=[120 if actor else 120]*4,repeat=-1 if name in ['crawl_right','curse_mark'] else 0,role='character' if actor else 'summon' if row<3 else 'effect')
    sheet.save(folder/'spritesheet.png')
    write(folder/'atlas.json',dict(frames=frames,meta=dict(image='spritesheet.png',size=dict(w=sheet.width,h=sheet.height))))
    origin=[.5,116/144] if actor else [.5,.5]
    write(folder/'animations.json',dict(origin=origin,animations=anims))
    write(folder/'manifest.json',dict(status='prototype_pending_director_review',source=source.relative_to(ROOT).as_posix(),sourceSha256=sha(source),generator='built-in image_gen',license='Original AI-assisted raster art generated for this project; no external pack; no exclusive copyright claim.',canvas=list(size),pivot=[80,116] if actor else [128,128],directions=['right'] if actor else ['right','down','left','up'],runtimeIntegrated=False,directorApproved=False))
export(HERE/'source/cap_mo_actions.png',3,['crawl_right','hop_right','exhale_right'],[],True)
export(HERE/'source/curse_snakes_sweep.png',6,['snake_rise','snake_facing','snake_break','curse_mark','curse_burst','staff_sweep'],[80,80,80,44,190,125])
export(HERE/'source/staff_palm_repair.png',2,['staff_sweep_right','palm_attack_right'],[],True,True)
write(HERE/'extraction_recipes.json',recipes)
packages={}
for key,path in {
'p1':'assets/sprites/bosses/main/tay-doc/phase-1','p2':'assets/sprites/bosses/main/tay-doc/phase-2',
'transition':'assets/sprites/bosses/main/tay-doc/transition',
'fx1':'assets/effects/bosses/main/tay-doc/phase-1','fx2':'assets/effects/bosses/main/tay-doc/phase-2',
'fxt':'assets/effects/bosses/main/tay-doc/transition',
'newactor':'assets/reviews/tay_doc_v02/cap_mo_v02','newfx':'assets/reviews/tay_doc_v02/effects_v02',
'actions':'assets/reviews/tay_doc_v02/actions_v02',
'hero':'assets/exports/characters'}.items():
    p=ROOT/path; a=read(p/'animations.json') if (p/'animations.json').exists() else None
    if key=='hero':
        atlas=read(p/'hero_vo_dang.json')
        a=dict(origin=[.5,.8],animations={tag['name']:dict(frames=list(atlas['frames'])[tag['from']:tag['to']+1],durationsMs=[120]*(tag['to']-tag['from']+1),repeat=-1) for tag in atlas['meta']['frameTags']})
    packages[key]=dict(path='/'+path,image='hero_vo_dang.png' if key=='hero' else 'spritesheet.png',atlas='hero_vo_dang.json' if key=='hero' else 'atlas.json',**a)
write(HERE/'packages.json',packages)
# Review strips use exported gameplay cels, never concept crops.
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
board=Image.new('RGB',(1080,690),'#131e20'); draw=ImageDraw.Draw(board)
draw.text((24,16),'TAY DOC / v02 - retained identity + focused action rework',font=font,fill='#e8dca9')
items=[('P1 / sweep repair',HERE/'actions_v02','staff_sweep_right',160,144),
('P2 / palm repair',HERE/'actions_v02','palm_attack_right',160,144),
('P2 / low crawl',HERE/'cap_mo_v02','crawl_right',160,144),
('P2 / hop + landing',HERE/'cap_mo_v02','hop_right',160,144)]
for row,(label,path,tag,w,h) in enumerate(items):
    y=70+row*150; draw.text((20,y+35),label,font=font,fill='#bbd3c0')
    for i in range(4):
        cel=Image.open(path/'frames'/(tag+'_'+str(i)+'.png')).convert('RGBA')
        # Native gameplay raster at 2x nearest for director inspection.
        box=cel.getbbox(); cel=cel.crop(box); cel=cel.resize((cel.width*2,cel.height*2),Image.Resampling.NEAREST)
        board.paste(cel,(250+i*200,y+100-cel.height),cel)
board.save(HERE/'sprite_review.png')
print('Exported 20 actor cels + 24 VFX/summon cels; retained 448 v01 cels untouched.')
if (HERE/'feedback01/export_feedback.py').is_file():
    import runpy
    runpy.run_path(str(HERE/'feedback01/export_feedback.py'),run_name='__main__')

