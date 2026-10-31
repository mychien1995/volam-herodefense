from pathlib import Path
from PIL import Image, ImageDraw
import json
base=Path(__file__).resolve().parent;root=base.parents[3];out=root/'assets/reviews/skills/thieu-lam'
m=json.loads((root/'assets/exports/skills/thieu-lam/production_manifest_v01.json').read_text(encoding='utf-8'))
characters=[a for a in m['assets'] if a['kind']=='character']
for start in range(0,13,5):
    selected=characters[start:start+5];sheet=Image.new('RGB',(1152,len(selected)*260),(37,49,58));draw=ImageDraw.Draw(sheet)
    for row,a in enumerate(selected):
        draw.text((6,row*260+4),a['skillId'],fill='white')
        for col,d in enumerate(['down','left','right','up']):
            p=root/a['sheet'];atlas=json.loads((root/a['atlas']).read_text(encoding='utf-8'));b=atlas['frames'][f'cast_{d}_2']['frame'];im=Image.open(p).convert('RGBA').crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
            im=im.resize((256,240),Image.Resampling.NEAREST);sheet.paste(im,(col*256+64,row*260+20),im)
        # Text/blank source canvas is cropped only on this evidence composition.
    sheet.save(out/f'contact_facings_{start//5+1:02d}_2x.png')
# Correct the recorded reference list to include the actual second tool input.
p=base/'prompts/dao_left_corrections_v01.json';r=json.loads(p.read_text(encoding='utf-8'))
r['referencePaths']=['assets/concepts/heroes/thieu-lam/thieu-lam-concept-v02.png','assets/exports/characters/hero_thieu_lam_dao.png'];r['unusedRows']=[3]
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=base/'verify_phaser.mjs';s=p.read_text(encoding='utf-8')
needle="  await open('dich_can_kinh','combined');await time(700);"
insert="""  const approvedBasicReuse=[];
  for(const [id,texture] of [['la_han_quyen','hero_thieu_lam'],['tru_ta','hero_thieu_lam_dao']]){
    for(const d of ['down','left','right','up']){
      await open(id,'basic',d);
      const frames=[];
      for(const t of [0,80,160,240,500]){
        const a=await time(t);assert(a.liveEffects===0,'Unapproved normal VFX');assert(a.actors[0].texture===texture,'Approved basic texture replaced');frames.push(a.actors[0].frame);
      }
      assert(new Set(frames.slice(0,4)).size===4 && frames[4].startsWith('idle_'),'Approved normal clip/recovery failed');
      approvedBasicReuse.push({id,d,texture,frames});
      if(d==='right')await page.screenshot({path:resolve(out,id+'_approved_basic_1280x720.png')});
    }
  }
""" + needle
if 'const approvedBasicReuse=[]' not in s:s=s.replace(needle,insert).replace("allFramesObserved:true,conditional","allFramesObserved:true,approvedBasicReuse,conditional")
p.write_text(s,encoding='utf-8')
print('Prepared static review contact sheets and approved normal-clip reuse assertions.')
