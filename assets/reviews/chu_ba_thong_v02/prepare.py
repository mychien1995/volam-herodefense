"""Offline review exports only; never writes game runtime files."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, math
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
BOSS=ROOT/'assets/sprites/bosses/chu-ba-thong'
FX=ROOT/'assets/effects/bosses/chu-ba-thong/skills'
ENV=ROOT/'assets/sprites/environment/toan-chan-truc-lam'
TILE=ROOT/'assets/tilesets/boss-arenas/toan-chan-truc-lam'
used=set()
def rel(p): return p.relative_to(ROOT).as_posix()
def load(p):
    used.add(p); return Image.open(p).convert('RGBA')
def dump(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def export(src, stem, names, size, pivot, bodyheight=None):
    im=load(src); cw=im.width/4; ch=im.height/len(names); frames={}; clips=[]; cuts=[]
    for r,name in enumerate(names):
        for c in range(4):
            box=(round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch))
            cel=im.crop(box); a=cel.getchannel('A').point(lambda a:255 if a>=128 else 0); cel.putalpha(a)
            bb=a.getbbox(); assert bb, (name,c)
            cuts.append((name,c,cel,bb,box))
    scale=(bodyheight/(sum(b[3]-b[1] for n,c,im,b,box in cuts[:4])/4)) if bodyheight else min((size[0]-12)/cw,(size[1]-12)/ch)
    sheet=Image.new('RGBA',(size[0]*4,size[1]*len(names)))
    observations=[]
    for n,c,cel,bb,box in cuts:
        r=names.index(n); cut=cel.crop(bb); celScale=scale
        if n=='spin' and c==3:
            correction=load(BOSS/'source/spin_left_correction_v02.png'); correction.putalpha(correction.getchannel('A').point(lambda a:255 if a>=128 else 0)); bb=correction.getbbox();cut=correction.crop(bb);celScale=56/cut.height;box=list(bb)
        cut=cut.resize((round(cut.width*celScale),round(cut.height*celScale)),Image.Resampling.NEAREST)
        x=round(pivot[0]-cut.width/2); y=round(pivot[1]-cut.height) if bodyheight else round((size[1]-cut.height)/2)
        assert x>=1 and y>=1 and x+cut.width<size[0] and y+cut.height<size[1], (n,c,cut.size,x,y)
        frame=Image.new('RGBA',size);frame.paste(cut,(x,y)); fn=f'{n}_{c}'
        sheet.paste(frame,(c*size[0],r*size[1]))
        frames[fn]={'frame':{'x':c*size[0],'y':r*size[1],'w':size[0],'h':size[1]},'duration':100,'sourceRect':box,'sourceOverride':'assets/sprites/bosses/chu-ba-thong/source/spin_left_correction_v02.png' if n=='spin' and c==3 else None,'bounds':frame.getbbox()}
        observations.append({'frame':fn,'bounds':frame.getbbox(),'uniqueHash':hashlib.sha256(frame.tobytes()).hexdigest()})
    for n in names:clips.append({'name':n,'frames':[f'{n}_{c}' for c in range(4)],'frameRate':10,'repeat':-1 if n=='spin' else 0})
    path=src.parent.parent/(stem+'.png') if bodyheight else src.parent/(stem+'.png')
    sheet.save(path)
    meta={'image':rel(path),'frames':frames,'origin':[pivot[0]/size[0],pivot[1]/size[1]],'animations':clips,'source':rel(src),'status':'prototype_pending_director_review','integrated':False}
    dump(path.with_suffix('.json'),meta);used.add(path);used.add(path.with_suffix('.json'))
    return meta,observations
boss,obs=export(BOSS/'source/review_actions_v02.png','boss_review_actions_v02',['sweep','punch_left','punch_right','spin'],(112,96),(56,80),56)
hands,hobs=export(FX/'song_thu_ho_bac/giant_hands_source_v02.png','giant_hands_v02',['yin_hand','yang_hand'],(224,224),(112,112))
# Assemble retained authored raster terrain/props. This is a review composition, not a runtime tilemap.
W,H=1280,720
floor=Image.new('RGBA',(W,H)); stone=load(TILE/'ancient_path_material.png'); moss=load(TILE/'bamboo_ground_material.png')
for y in range(0,H,128):
    for x in range(0,W,128):floor.paste(stone,(x,y))
# Authored forest/stone transitions remain raster art, not procedural scenery.
for y in range(0,H,128):
    floor.paste(moss,(0,y));floor.paste(moss,(1152,y))
# Use retained Wang transition tiles around an intentionally irregular terrace.
terrain=load(ROOT/'assets/exports/bamboo_forest/terrain.png')
def tile(gid):
    i=gid-1;return terrain.crop(((i%16)*32,(i//16)*32,(i%16+1)*32,(i//16+1)*32))
# Only outer lawn is replaced; the broad court and physical props remain independent layers.
for ty in range(23):
    for tx in range(40):
        edge=4 if ty<4 or ty>19 else 3
        if tx<edge or tx>=40-edge:floor.paste(tile(1+(tx+ty)%4),(tx*32,ty*32))
        elif tx==edge or tx==39-edge:
            # Authored mossy stone softens the lawn boundary.
            mat=load(TILE/'mossy_stone_material.png'); xx=tx*32;yy=ty*32;floor.paste(mat.crop(((tx%4)*32,(ty%4)*32,(tx%4+1)*32,(ty%4+1)*32)),(xx,yy))
platform=load(TILE/'yin_yang_platform.png');floor.alpha_composite(platform,(384,285))
placements=[]
def prop(n,x,y):
    p=ENV/(n+'.png');im=load(p);floor.alpha_composite(im,(round(x-im.width/2),round(y-im.height)));placements.append({'asset':rel(p),'feet':[x,y]})
# Roof/background first; center remains clear for boss attacks and six players.
prop('taoist_pavilion',640,202)
prop('wine_rest_table',300,175);prop('wine_storage_rack',1000,190)
prop('training_dummy',200,310);prop('training_dummy',255,305);prop('broken_practice_poles',240,365)
for x,y in [(160,235),(1120,235),(160,535),(1120,535)]:prop('taoist_banner',x,y)
for x,y in [(250,240),(1030,240),(230,600),(1050,600)]:prop('stone_lantern',x,y)
for x,y in [(70,650),(1210,650),(70,450),(1210,450),(60,235),(1220,235)]:
    prop('moss_rock',x,y);prop('bamboo_cluster',x,y-30)
for x in [160,230,300,980,1050,1120]:prop('bamboo_fence_low',x,690)
prop('entrance_gate',640,720)
floor.save(OUT/'arena_assembly.png')
# Import existing authored atlas metadata without changing any bytes.
bundles={'boss':boss,'hands':hands}
def bundle(key,folder,id):
    ap=folder/(id+'.json');an=folder/(id+'.animations.json');used.update([ap,an]);a=json.loads(ap.read_text(encoding='utf-8-sig'));b=json.loads(an.read_text(encoding='utf-8-sig'))
    img=folder/(id+'.png');used.add(img)
    bundles[key]={'image':rel(img),'frames':a['frames'],'origin':b['origin'],'animations':b['animations']}
bundle('base',BOSS,'boss_chu_ba_thong')
bundle('disciple',ROOT/'assets/sprites/summons/toan-chan-disciples','toan_chan_disciple')
for key,id in [('palm','khong_minh_quyen'),('dual','song_thu_ho_bac'),('trap','thai_cuc_am_duong_tran'),('spinfx','tuy_tien_bo'),('reflect','can_khon_phan_chan'),('ultimate','am_duong_nghich_chuyen')]:bundle(key,FX/id,'vfx_'+id)
# Existing approved player frame exports used as scale witnesses, never regenerated.
hero_candidates=list((ROOT/'assets/exports/characters').rglob('*idle_down*png'))
# Actual path resolved below if the repository uses another actor export convention.
if not hero_candidates:hero_candidates=list((ROOT/'assets/exports').rglob('*idle_down*png'))
hero_candidates=[ROOT/'assets/exports/characters/vo_dang_v01/quyen/frames/idle_down_0.png',ROOT/'assets/exports/characters/thien_son_v01/fan/frames/idle_down_0.png',ROOT/'assets/exports/characters/thieu_lam_v01/quyen/frames/idle_down_0.png']
heroes=[rel(p) for p in hero_candidates]
for p in hero_candidates:
    used.add(p)
    for direction in ['down','up','left','right']:
        for i in range(4):used.add(p.with_name(f'walk_{direction}_{i}.png'))
data={'bundles':bundles,'heroes':heroes,'arena':rel(OUT/'arena_assembly.png'),'placements':placements,'width':W,'height':H}
(OUT/'data.js').write_text('window.ART_DATA='+json.dumps(data,ensure_ascii=False)+';\n',encoding='utf8')
# Visual continuity evidence is distinct from Phaser runtime verification.
assert len(set(o['uniqueHash'] for o in obs))==16
assert len(set(o['uniqueHash'] for o in hobs))==8
contact=Image.new('RGBA',(112*4*2,96*4*2),(24,30,36,255));img=Image.open(ROOT/boss['image']);contact.alpha_composite(img.resize(contact.size,Image.Resampling.NEAREST));contact.save(OUT/'boss_actions_contact.png')
manifest={'id':'chu_ba_thong_review_v02','date':'2026-11-01','branch':'wip/m3d/chu-ba-thong','status':'prototype_pending_director_review','scope':'Standalone offline canvas review only. No Phaser, game-core, server or runtime registry edits.','provenance':'Retained original AI-assisted project rasters plus three new built-in image_gen sources. No third-party game art copied. No exclusive copyright assertion.','prompts':'generation_prompts.json','approval':'No new director approval claimed; old v01 approval metadata is retained historical data only.','runtimeVerified':False,'phaserVerified':False,'arena':'Authored retained metatiles and separate props assembled at native raster scale; not a flattened concept screenshot or runtime collision map.','newFrames':24,'bossPivot':[56,80],'handPivot':[112,112],'playbackFps':10,'frameObservations':obs+hobs,'usedAssets':[{'path':rel(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(used)],'limitations':['Supplementary attacks are front-facing art only. Baseline boss and disciple retain four facings.','Spin final left cel was corrected from a separate retained original source; scale continuity still awaits director review.','Arena is one-screen composition; repeated stone metatile transitions still need director review.','Standalone preview demonstrates visual rules only; no combat or multiplayer authority implemented.']}
dump(OUT/'manifest.json',manifest)
print(json.dumps({'exportedFrames':24,'retainedInputs':len(used),'heroes':heroes,'bossImage':boss['image'],'handImage':hands['image']},ensure_ascii=False))
