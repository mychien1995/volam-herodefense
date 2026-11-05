"""Read original registrations and authored sources; emit Aseprite instructions only."""
import json,re,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v3'
read=lambda p:json.loads((root/p).read_text('utf8'))
records=read('assets/source/renovation-v3/components.json');jobs=read('assets/source/renovation-v3/generation-jobs.json')['jobs']+read('assets/source/renovation-v3/extra-jobs.json')['jobs']
grids={j['id']:j['grid'] for j in jobs};grids['chiet_mai_clean']=[2,2]
skillIds=list(read('assets/source/renovation-v3/skills.json')['progression']['skills']);schoolNew={j['id'] for j in jobs if j['kind']=='vfx'}
v2=read('apps/game-client/src/renovation-skills.generated.json');v2ByUrl={a['url']:a for a in v2['assets']};approved={a['url']:a for a in read('apps/game-client/src/approved-art.generated.json')['assets']}
def input_url(url):
    p=url.lstrip('/').replace('assets/','assets/exports/',1)
    return p if (root/p).exists() else 'apps/game-client/public/'+url.lstrip('/')
def school(a,t):
    cid=a['id'];full=(cid+' '+t).lower()
    if cid=='cai_bang_bong_combo_v2_vfx':return ('hoanh_tao_bong' if 'sweep' in t else 'pha_giap_bong' if 'overhead' in t else 'truy_phong_bong',0,None)
    if cid=='m3d_vo_dang_basic_vfx':return ('huyen_am_chuong' if 'left' in t.split('_fist')[0] else 'duong_khi_kich',0,None)
    if cid=='review3_shaolin_skill_fx' or cid=='thieu_lam_dao_v2_aura':return ('tru_ta',0,None)
    if cid=='review3_ts_dao_fx':return ('bach_liet_thien_kich' if 'bach_liet' in t else 'liet_phong_dao' if 'liet_phong' in t else 'phi_anh_tram',0,None)
    if cid=='review3_ts_ground':return ('bach_liet_thien_kich',0,2)
    if cid=='shared_fire_vfx':return ('hoa_van_chuong',0,None)
    if 'plum_' in t or 'chiet_mai' in full:return ('chiet_mai_clean',0,None)
    if 'dog_run' in t:return ('fire_dog',0,None)
    if 'm3d_pha_giap_bong_vfx'==cid and 'reach_' in t:return ('staff_extension',0,None)
    if 'm3d_khang_long_burn' in cid:return ('khang_long_huu_hoi',0,None)
    if 'nhu_lai' in full or any(s in cid for s in ['r3_buddha','r3_sky_palm','r3_palm_impact','r3_sanskrit']):
        if 'thien_diep' in full:return ('nhu_lai_thien_diep',0,2 if re.search('blade|projectile|travel|leaf',t) else 3 if 'impact' in t else 1)
        return ('nhu_lai_niet_ban',0,3 if re.search('sanskrit|sutra|field|ground|formation',full) else 2 if re.search('sky_palm|palm_impact|heaven|palm_fall|impact',full) else 1 if re.search('buddha|apparition|halo',full) else 0)
    for sid in sorted(skillIds,key=len,reverse=True):
        if sid in full and sid in schoolNew:return (sid,0,None)
    if 'bong_controls' in cid:return ('cam_long_cong' if 'claw' in t else 'pha_giap_bong' if 'slam' in t else 'hoanh_tao_bong' if 'radial' in t else 'truy_phong_bong',0,None)
    if 'cai_bang_chuong_dragon' in cid:return ('hoa_van_chuong' if 'hoa_van' in t or 'release' in t else 'hang_long_hoa_vu',0,None)
    if 'vo_cau' in cid:return ('pha_giap_bong' if 'smash' in t else 'hoanh_tao_bong',0,2 if 'smash' in t else None)
    if 'vo_dang_hands' in cid or 'vo_dang_sonic' in cid:
        if 'sword' in t:return None
        return ('huyen_am_chuong' if 'huyen_am' in t else 'duong_khi_kich' if 'duong_khi' in t or 'mana_refund' in t else 'luong_nghi_thu',0,None)
    if 'shield_formation' in cid:return ('thai_cuc_tran' if 'ground' in cid or 'formation' in t or 'inward' in t else 'thai_cuc_than_cong',0,None)
    if 'thien_son_dao' in cid:return ('truy_hon_dao' if 'qi_blade' in t or 'slow_contact' in t else 'phong_anh_hoan_vi' if 'counter' in t or 'ghost' in t else 'phi_anh_tram',0,None)
    if 'hands_combo' in cid:
        if 'regen' in t:return ('bat_dong_minh_vuong',0,None)
        return ('la_han_quyen',0,None)
    if 'r3_ca_diep_ground' in cid:return ('hoanh_tao_cuoc',0,None)
    if 'r3_foot_force' in cid:return ('vo_anh_cuoc',0,None)
    if 'r3_tornado' in cid:return ('toan_phong_thoai',0,None)
    if 'r3_crescent' in cid:return ('tru_ta',0,None)
    if 'lion_head' in cid:return ('tam_gioi_quy_thien',0,1)
    if 'roar_wave' in cid:return ('tam_gioi_quy_thien',0,2)
    if 'shaolin_a_fx' in cid or cid=='m3d_thieu_lam_quyen_vfx':return ('vo_anh_cuoc' if 'front_kick' in t else 'tru_ta' if 'roundhouse' in t else 'la_han_quyen',0,None)
    if cid=='review_palm':return ('dai_luc_kim_cuong_chuong',0,None)
    if a['skillId'] in schoolNew:return (a['skillId'],0,None)
    return None
def boss(a,t):
    full=(a['id']+' '+t).lower();group=a['group']
    if 'note' in t:return None # QTE reading glyphs retain their distinct meanings.
    if 'vuong' in group:
        m=re.match(r'(?:element|impact)([0-4])$',t)
        # Runtime order is Kim/Moc/Thuy/Hoa/Tho; the authored sheet is Wood/Fire/Earth/Metal/Water.
        if m:return ('vuong_elements',[3,0,4,1,2][int(m[1])],2 if t.startswith('impact') else 1)
        if re.search('thrust1|slash1|shield|crack|lightning|star|shatter|warning1|line1|yin',t):return ('vuong_trung_duong_p1_effects',1 if 'lightning' in t else 2 if re.search('star|shield|yin',t) else 0,None)
        return ('vuong_trung_duong_p2_effects',3 if 'rain' in t or t=='sword' else 2 if re.search('pulse|eye|warning2',t) else 0 if 'thrust2' in t else 1,None)
    if 'dong_ta' in group:
        if 'maifx' in full:return ('mai_sieu_phong_effects',3 if 'suction' in t else 2 if re.search('poison',t) else 0 if re.search('claw_left|claw_right',t) else 1,None)
        if 'hoangfx' in full or 'heal' in t:return ('hoang_dung_effects',2 if 'trail' in t else 1,None)
        return ('dong_ta_effects',3 if re.search('flute|summon|spawn',t) else 2 if re.search('petal|blossom',t) else 1 if 'pebble' in t else 0,None)
    if 'tay_doc' in group or re.search('tay_doc|poison_bolt|snake_bolt',a['id']):
        p2='fx2' in full or 'fxt' in full
        if p2:return ('tay_doc_cap_mo_effects',1 if re.search('lunge|shockwave',t) else 2 if re.search('eruption|explosion|particles',t) else 0,None)
        return ('tay_doc_effects',0 if 'staff' in t else 1 if 'needle' in t else 2 if re.search('cloud|poison_status|damage_tick',t) else 3,None)
    if 'nam_de' in group or re.search('nam_de|gold_bolt|spotlight',a['id']):return ('nam_de_effects',0 if 'palm' in full else 3 if re.search('sky|ultimate|spotlight|ray',full) else 2 if re.search('ring|light|healing|meditation|aura',full) else 1,None)
    if 'bac_cai' in group:return ('bac_cai_effects',2 if 'beam' in full else 0 if 'staff' in full else 1 if re.search('dragon|palm',full) else 3,None)
    if 'chu' in group:return ('chu_ba_thong_effects',1 if 'hands' in full or 'fist' in full else 3 if re.search('spin|trail|reflect',full) else 2 if re.search('trap|formation|warning|pattern|field',full) else 0,None)
    if 'hong_liet' in group:return ('hoan_nhan_hong_liet_effects',2 if 'arrow' in full else 3 if 'meteor' in full else 1 if re.search('lava|stomp|volcano',full) else 0,None)
    if 'kim_luan' in group:return ('kim_luan_effects',3 if re.search('cage|ward',full) else 2 if re.search('fissure|boulder|stomp|shockwave',full) else 1 if re.search('gust|nail|whirlwind|slash',full) else 0,None)
    if 'ly_mac_sau' in group:return ('ly_mac_sau_effects',0 if 'needle' in t else 2 if re.search('duster|sweep|melee|basic',t) else 3 if re.search('ngu_doc|purple|poison|hp_drain',full) else 1,None)
    return None
def source(a,t):
    # These r3 entries are skill VFX despite the registry sharing a school pack.
    if a['id'].startswith('review3_'):
        s=a['id']
        owner='ly_mac_sau' if re.search('lms_fx|whisk_ring',s) else 'hong_liet' if re.search('hhl_blade|hhl_vfx',s) else 'chu' if re.search('cbt_',s) else 'kim_luan' if re.search('hoac_do_fx|dat_nhi_ba_fx|round_wheel',s) else None
        if owner:return boss({**a,'group':'boss:'+owner},t)
    return boss(a,t) if a['group'].startswith('boss:') else school(a,t)
plan=[];unmapped=[];mapped=[]
for a in records:
    atlas=read(a['inputAtlas']);image=Image.open(root/a['input']).convert('RGBA');tags={};unions={}
    for tag in a['animations']:
        boxes=[]
        for i,name in enumerate(tag['frames']):
            if name not in atlas['frames']:continue
            tags[name]=(tag,i,len(tag['frames']));f=atlas['frames'][name];r=f['frame'];s=f.get('spriteSourceSize',{'x':0,'y':0});b=image.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])).getchannel('A').point(lambda v:255 if v>=32 else 0).getbbox()
            if b:boxes.append([b[0]+s.get('x',0),b[1]+s.get('y',0),b[2]+s.get('x',0),b[3]+s.get('y',0)])
        if boxes:unions[tag['name']]=[min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
    selected=v2ByUrl.get(a['url']) or approved.get(a['url']);copyInput=input_url(selected['candidateUrl']) if selected else a['input'];density=selected.get('density',1) if selected else 1
    copyAtlas=read(input_url(v2['atlases'][a['atlasUrl']])) if a['atlasUrl'] in v2['atlases'] else atlas
    frames=[]
    for name,f in atlas['frames'].items():
        tag,i,n=tags.get(name,({'name':name,'origin':a['origin']},0,1));t=tag['name'];r=f['frame'];ss=f.get('sourceSize',{'w':r['w'],'h':r['h']});cf=copyAtlas['frames'].get(name,f);cr=cf['frame'];cs=cf.get('spriteSourceSize',{'x':0,'y':0})
        cel={'name':name,'size':[ss['w'],ss['h']],'duration':f.get('duration'),'copy':{'path':copyInput,'rect':[cr['x']*density,cr['y']*density,cr['w']*density,cr['h']*density],'target':[cs.get('x',0)*2,cs.get('y',0)*2],'density':density}}
        route=source(a,t)
        if route and t in unions:
            job,row,fixed=route;path='assets/source/renovation-v3/chiet_mai_clean.png' if job=='chiet_mai_clean' else 'assets/source/renovation-v3/raw/'+job+'.png'
            assert (root/path).exists(),('Missing generated source',job,a['id'],t)
            phase=min(3,i*4//max(1,n));phase=3 if re.search('ending|outro|fade|off|dissipate',t) else 2 if re.search('impact|contact|hit',t) else 1+i%2 if re.search('loop|travel|flight|beam|sustain',t) else phase
            if fixed is not None:phase=fixed
            gx,gy=grids[job];im=Image.open(root/path);idx=row*4+phase if gx==4 else phase;cx,cy=idx%gx,idx//gx;x,y,x1,y1=round(im.width*cx/gx),round(im.height*cy/gy),round(im.width*(cx+1)/gx),round(im.height*(cy+1)/gy)
            direction=tag.get('direction') or next((d for d in ['right','down','left','up'] if re.search(r'(?:^|_)'+d+r'(?:_|$)',t)),'right')
            rotate={'right':0,'down':90,'left':180,'up':270}.get(direction,0)
            upright=re.search('ring|aura|shield|formation|field|ground|buddha|sky|rune|sanskrit|lion|roar|cloud|pool|healing|eruption|explosion|shockwave|warning|impact|outro|ending|halo',t) or job in ['toan_phong_thoai','thai_cuc_tran','thai_cuc_than_cong'] or fixed is not None
            if upright:rotate=0
            b=unions[t];left=max(0,min(ss['w']-1,b[0]));top=max(0,min(ss['h']-1,b[1]));right=min(ss['w'],b[2]);bottom=min(ss['h'],b[3])
            cel.update({'source':[path,[x,y,x1-x,y1-y]],'box':[left*2,top*2,max(1,right-left)*2,max(1,bottom-top)*2],'rotation':rotate,'job':job,'origin':tag.get('origin',a['origin'])})
            mapped.append([a['id'],t,job])
        elif route is None:unmapped.append([a['id'],t])
        frames.append(cel)
    if not any('source' in f for f in frames):continue
    plan.append({**{k:a[k] for k in ['id','url','atlasUrl','textureKeys','inline','input','inputAtlas','group','skillId']},'baselineSha256':hashlib.sha256((root/a['input']).read_bytes()).hexdigest(),'frames':frames})
(src/'fx-plan.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf8');(src/'mapping-audit.json').write_text(json.dumps({'mapped':sorted({tuple(x) for x in mapped}),'retained':sorted({tuple(x) for x in unmapped})},indent=2)+'\n',encoding='utf8');print('V3 planned',len(plan),'atlases;',sum('source' in f for a in plan for f in a['frames']),'new frame references')
