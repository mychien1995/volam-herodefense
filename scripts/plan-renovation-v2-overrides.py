"""Measure placement against legacy metadata; write instructions, never raster edits."""
import json,math,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];src=root/'assets/source/renovation-v2'
records=json.loads((src/'components.json').read_text('utf8'));plan=[]
def load(p):return json.loads((root/p).read_text('utf8'))
def bbox(image,level=40):return image.getchannel('A').point(lambda a:255 if a>=level else 0).getbbox()
def body_source(name,direction,index):
    p=f'assets/exports/renovation-v2/{name}.png';a=load(f'assets/exports/renovation-v2/{name}.json')['frames'][f'{direction}_{index}']['frame'];return p,[a[k] for k in ['x','y','w','h']]
def effect_source(name,index):
    p=f'assets/source/renovation-v2/raw/{name}.png';im=Image.open(root/p);w,h=im.size;x=round(w*(index%2)/2);y=round(h*(index//2)/2);x1=round(w*(index%2+1)/2);y1=round(h*(index//2+1)/2);return p,[x,y,x1-x,y1-y]
for component in records:
    atlas=load(component['inputAtlas']);old=Image.open(root/component['input']).convert('RGBA');mapping={}
    for tag in component.get('animations',[]):
        for i,name in enumerate(tag['frames']):mapping[name]=(tag,i,len(tag['frames']))
    frames=[]
    for name,f in atlas['frames'].items():
        r=f['frame'];w,h=f.get('sourceSize',{}).get('w',r['w']),f.get('sourceSize',{}).get('h',r['h'])
        tag,i,count=mapping.get(name,({'name':name,'origin':component.get('origin',[.5,.8]),'direction':next((d for d in ['down','left','right','up'] if d in name),'right')},0,1))
        t=tag['name'];direction=tag.get('direction','right');direction=direction if direction in ['down','left','right','up'] else next((d for d in ['down','left','right','up'] if '_'+d in t),'right');index=min(3,i*4//max(1,count));phase=t+' '+name;kind=component['kind'];skill=component.get('skillId','');cid=component['id'];source=None;rotation=0
        if kind=='character':
            school='thien_son' if 'thien_son' in cid or skill.startswith(('lien_hoa','luc_duong','luu_phong','chiet_mai','bach_phien')) else 'vo_dang'
            if cid.startswith('hero_') and not name.startswith('basic_attack'):pass
            elif cid=='vo_dang_shield_formation_v2_character' and 'bat_quai_kiem_tran' not in phase:pass
            elif school=='thien_son':
                if 'throw' in phase or 'catch' in phase or cid=='hero_thien_son':source=body_source('thien_son_throw',direction,(3-index if 'catch' in phase else index))
                else:
                    pose=1 if 'luu_phong' in phase else 2 if 'chiet_mai' in phase else 3 if 'luc_duong' in phase or 'phong_bao' in phase else 0
                    if 'luc_duong' in phase and 'spin' in phase:direction=['right','down','left','up'][(['right','down','left','up'].index(direction)+index)%4]
                    source=body_source('thien_son_cast',direction,pose)
            else:
                if cid=='r2_hero_vo_dang':
                    a=load('assets/exports/renovation-v1/hero_vo_dang.json')['frames'];key=('walk' if 'walk' in phase else 'idle')+'_'+direction+'_'+str(index if 'walk' in phase else 0);r2=a[key]['frame'];source=('assets/exports/renovation-v1/hero_vo_dang.png',[r2[k] for k in ['x','y','w','h']])
                elif 'basic_attack' in phase or 'that_tinh' in cid or 'counter' in phase:source=body_source('vo_dang_attack',direction,index)
                else:source=body_source('vo_dang_cast',direction,1 if 'nhan_kiem' in cid or 'nhan_kiem' in phase else 3 if 'toa_sat' in cid else 2)
        else:
            effect=skill
            if cid=='review_lotus':effect='lien_hoa_phien'
            elif cid=='review_sword':effect='that_tinh_kiem' if 'impact' in phase else 'van_kiem_quy_tong'
            elif cid.startswith('thien_son_fan_v2'):effect='fan_projectile' if 'projectile' in cid else 'bach_phien_phong_bao' if 'aura' in cid else 'chiet_mai_thu'
            elif cid.startswith('thien_son_wind_actions'):effect='lien_hoa_phien' if 'lien_hoa' in phase else 'luu_phong_bo' if 'luu_phong' in phase else 'chiet_mai_thu' if 'plum' in phase else 'luc_duong_chuong'
            elif cid.startswith('vo_dang_shield_formation'):
                if not 'bat_quai_kiem' in phase:effect=None
                else:effect='bat_quai_kiem_tran'
            elif cid=='renovated_toa_guard':effect='toa_sat_bac_do'
            elif cid=='m3d_vo_dang_basic_vfx':effect='that_tinh_kiem' if 'sword' in phase else None
            if effect and (src/'raw'/(effect+'.png')).exists():
                if any(v in phase for v in ['impact','ending','expiry','recall','dissolve']):index=3
                elif any(v in phase for v in ['loop','sustain','hold','whirl','travel','flight']):index=1+i%2
                if effect=='toa_sat_bac_do':index=3 if any(v in phase for v in ['ending','outro']) else 2 if 'counter' in phase else 0+i%2
                if effect=='nhan_kiem_hop_nhat' and any(v in phase for v in ['blink','recall']):effect='toa_sat_bac_do';index=3
                source=effect_source(effect,index)
                if effect in ['nhan_kiem_hop_nhat','van_kiem_quy_tong','fan_projectile','that_tinh_kiem','luu_phong_bo']:
                    rotation={'right':0,'down':90,'left':180,'up':270}[direction]
        rectangle=[r[k] for k in ['x','y','w','h']]
        cel={'name':name,'size':[w,h],'old':rectangle,'source':source,'kind':kind,'rotation':rotation,'origin':tag.get('origin',component.get('origin',[.5,.8]))}
        if source:
            if kind=='character':cel['pivot']=[160,224];cel['target']=[round(w*cel['origin'][0]*2),round(h*cel['origin'][1]*2)]
            else:
                cut=old.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));b=bbox(cut)
                if b:
                    ss=f.get('spriteSourceSize',{'x':0,'y':0});cel['box']=[(b[0]+ss.get('x',0))*2,(b[1]+ss.get('y',0))*2,(b[2]-b[0])*2,(b[3]-b[1])*2]
                else:cel['source']=None
        frames.append(cel)
    if not any(f['source'] for f in frames):continue
    plan.append({'id':component['id'],'url':component['url'],'atlasUrl':component['atlasUrl'],'input':component['input'],'inputAtlas':component['inputAtlas'],'baselineSha256':hashlib.sha256((root/component['input']).read_bytes()).hexdigest(),'frames':frames})
(src/'override-plan.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf8');print('Planned',len(plan),'atlases,',sum(bool(f['source']) for a in plan for f in a['frames']),'replacements')
