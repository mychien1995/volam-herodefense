"""Diagnostic comparisons only: never used as game artwork."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,statistics
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'assets/reviews/visual_improvement_v02'
manifest=json.loads((ROOT/'assets/exports/characters/visual_improvement_v02/manifest.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16)
board=Image.new('RGB',(1140,860),'#263039');draw=ImageDraw.Draw(board)
draw.text((20,10),'Cai Bang quality reference / original -> revised, 1x and 2x nearest',font=font,fill='white')
reference=Image.open(ROOT/'assets/exports/characters/hero_cai_bang_idle.png').convert('RGBA')
board.paste(reference,(20,55),reference)
board.paste(reference.resize((reference.width*2,reference.height*2),Image.Resampling.NEAREST),(120,35),reference.resize((reference.width*2,reference.height*2),Image.Resampling.NEAREST))
for i,a in enumerate(manifest['assets']):
    x=20+(i%3)*375;y=220+(i//3)*310
    draw.text((x,y),a['id'],font=font,fill='white')
    atlas=json.loads((ROOT/a['atlas']).read_text());r=atlas['frames']['idle_down_0']['frame']
    new=Image.open(ROOT/a['sheet']).convert('RGBA').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
    old=Image.open(ROOT/f"assets/source/characters/visual_improvement_v02/{a['id']}__original.png").convert('RGBA')
    for col,im in enumerate([old,new]):
        draw.text((x+col*180,y+28),'original' if col==0 else 'revised',font=font,fill='white')
        board.paste(im,(x+col*180,y+50),im)
        im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
        board.paste(im,(x+col*180,y+135),im)
board.save(OUT/'six-variants-before-after.png')
directions=Image.new('RGB',(1140,6*175),'#263039');d=ImageDraw.Draw(directions)
for row,a in enumerate(manifest['assets']):
    d.text((10,row*175+10),a['id'],font=font,fill='white')
    atlas=json.loads((ROOT/a['atlas']).read_text());sheet=Image.open(ROOT/a['sheet']).convert('RGBA')
    for col,direction in enumerate(['down','left','right','up']):
        r=atlas['frames'][f'idle_{direction}_0']['frame'];im=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
        im=im.resize((im.width*2,160),Image.Resampling.NEAREST);directions.paste(im,(270+col*210,row*175),im)
directions.save(OUT/'six-variants-four-facings-2x.png')
requests=[json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'assets/source/characters/visual_improvement_v02/requests').glob('*.json')]
from datetime import datetime
durations=[(datetime.fromisoformat(r['ended'].replace('Z','+00:00'))-datetime.fromisoformat(r['started'].replace('Z','+00:00'))).total_seconds() for r in requests]
(OUT/'production-timings.json').write_text(json.dumps({'directionalRequests':len(requests),'medianGenerationSeconds':statistics.median(durations),'summedRequestSeconds':sum(durations),'note':'Requests overlap; durations include tool/save queue. Pilot and monk master excluded.'},indent=2)+'\n')

# Inventory only. These skill bodies are deliberately not repainted in Stage B.
catalog=[]
for file in ['packages/game-data/src/skill-art.json',
             'apps/game-client/src/feedback-art.generated.json',
             'apps/game-client/src/m3d-feedback-art.generated.json',
             'apps/game-client/src/m3d-r3-art.generated.json']:
    for a in json.loads((ROOT/file).read_text(encoding='utf-8'))['assets']:
        id=a['id'];source_id=a.get('sourceId',id);sheet=a.get('sheet','')
        baseline=a.get('kind')=='character' and any('/'+s+'/' in sheet for s in ['thien-son','vo-dang','thieu-lam'])
        family=any(s in id for s in ['thien_son','vo_dang','thieu_lam']) and (a.get('kind')=='character' or a.get('role')=='character')
        extra=source_id in ['r3_ca_diep_body_keyposes','ts_dao','shaolin_a','vo_anh_cuoc_character','nhu_lai_niet_ban_character','tru_ta_character','kim_quang_ho_tran_character','tam_gioi_quy_thien_character']
        retained=id in ['r2_retained_la_han','r2_retained_vi_da','r2_retained_nhu_lai','r2_retained_bach_liet']
        if baseline or family or extra or retained:
            catalog.append({'id':id,'sourceId':source_id,'sheet':sheet,'atlas':a.get('atlas'),
                'catalogue':file,'action':'future character-body synchronization; keep effect geometry/timing unchanged',
                'note':'Layer precedence varies by skill; catalogue membership does not mean every atlas is active.'})
(OUT/'skill-body-sync-register.json').write_text(json.dumps({'status':'inventory only; no skill artwork changed','assets':catalog},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
