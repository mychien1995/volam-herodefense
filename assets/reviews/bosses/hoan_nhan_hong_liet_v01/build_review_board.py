"""Pack actual selected export cels into a static review board; no art synthesis."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).resolve().parents[4]
out=Image.new('RGB',(1536,1100),'#151c22');d=ImageDraw.Draw(out)
manifest=json.loads((root/'assets/exports/bosses/hoan_nhan_hong_liet_v01/manifest.json').read_text(encoding='utf-8'))
selection=[('boss_locomotion','down_idle_a'),('boss_locomotion','up_idle_a'),('boss_locomotion','left_walk_a'),('boss_locomotion','right_walk_c'),('boss_basics','right_thrust_2'),('boss_basics','down_sweep_2'),('boss_casts','down_stomp_1'),('boss_casts','down_command_1'),('boss_thrust_vertical','down_thrust_2'),('minion_archer','left_attack_0'),('minion_infantry','right_attack_1'),('cannon_clean','recoil_left')]
for i,(aid,name) in enumerate(selection):
 a=next(a for a in manifest['assets'] if a['id']==aid);atlas=json.loads((root/a['atlas']).read_text());f=atlas['frames'][name]['frame']
 im=Image.open(root/a['sheet']).crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
 bbox=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox();im=im.crop(bbox)
 im=im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST)
 x=(i%4)*384;y=(i//4)*350
 out.paste(im,(x+(384-im.width)//2,y+60),im);d.text((x+16,y+20),aid,fill='#ebc68f');d.text((x+16,y+40),name+' / 3x export',fill='#dadada')
out.save(Path(__file__).with_name('sprite_review_board.png'))
