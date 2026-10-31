"""Static review layout only: copies real v2 pixels without redrawing character artwork."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[6]; SRC=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
REVIEW=ROOT/'assets/reviews/skills/cai-bang-bong-combo-v2'
try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
except OSError:font=ImageFont.load_default()
beats=['thrust','sweep','rising','overhead']; phases=['PREP','COIL','CONTACT','FOLLOW','RECOVER','LINK']
for direction in ['down','left','right','up']:
 im=Image.new('RGB',(752,480),(24,24,29)); draw=ImageDraw.Draw(im)
 draw.text((12,8),'CAI BANG BONG v2 / '+direction.upper()+' / CHARACTER ONLY',font=font,fill=(244,216,171))
 draw.text((12,30),'112x100 cells | feet 56,80 | runtime NOT approved',font=font,fill=(185,185,185))
 for col,name in enumerate(phases):draw.text((80+col*112,62),name,font=font,fill=(240,192,96))
 for row,beat in enumerate(beats):
  draw.text((4,96+row*96),str(row+1)+' '+beat.upper(),font=font,fill=(220,170,120))
  for col in range(6):
   frame=Image.open(OUT/'character_frames'/f'combo_{beat}_{direction}_{col}.png').convert('RGBA')
   # Minor 4px row overlap is only transparent padding; feet are consistently spaced96.
   im.paste(frame,(80+col*112,80+row*96),frame)
   x=80+col*112+56;y=80+row*96+80
   draw.line((x-2,y+2,x+2,y+2),fill=(70,165,170))
 im.save(REVIEW/f'character_contact_{direction}_1x.png')
 im.resize((1504,960),Image.Resampling.NEAREST).save(REVIEW/f'character_contact_{direction}_2x.png')
# Matched ground pivots compare existing approved baseline with newly drawn v2.
base=Image.open(ROOT/'assets/exports/characters/hero_cai_bang.png').convert('RGBA')
atlas=json.loads((ROOT/'assets/exports/characters/hero_cai_bang.json').read_text(encoding='utf-8'))
im=Image.new('RGB',(896,150),(24,24,29)); draw=ImageDraw.Draw(im)
for k,direction in enumerate(['down','left','right','up']):
 f=atlas['frames'][f'idle_{direction}_0']['frame']; old=base.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
 im.paste(old,(k*224+16,40),old)
 new=Image.open(OUT/'character_frames'/f'combo_thrust_{direction}_0.png').convert('RGBA');im.paste(new,(k*224+112,24),new)
 draw.text((k*224+8,5),direction+' OLD / v2',font=font,fill=(235,201,147))
im.save(REVIEW/'baseline_scale_comparison_1x.png');im.resize((1792,300),Image.Resampling.NEAREST).save(REVIEW/'baseline_scale_comparison_2x.png')
print('Wrote four native/2x character contact sheets + baseline scale comparison')

# Separate VFX / composed static contact sheets. No character pixels are redrawn.
fxmeta=json.loads((OUT/'cai_bang_bong_combo_v2_vfx.animations.json').read_text(encoding='utf-8'))
fxby={a['name']:a for a in fxmeta['animations']}
for direction in ['down','left','right','up']:
 for kind in ['vfx','combined']:
  im=Image.new('RGB',(1040,912),(24,24,29));draw=ImageDraw.Draw(im)
  draw.text((12,8),'CAI BANG BONG v2 / '+direction.upper()+' / '+kind.upper()+' / STATIC REVIEW',font=font,fill=(244,216,171))
  draw.text((12,30),'Native pixels; no runtime approval. Cyan ticks mark feet, not hitboxes.',font=font,fill=(185,185,185))
  for col,name in enumerate(phases):draw.text((80+col*160,62),name,font=font,fill=(240,192,96))
  for row,beat in enumerate(beats):
   draw.text((4,100+row*208),str(row+1)+' '+beat.upper(),font=font,fill=(220,170,120))
   for col in range(6):
    name=f'combo_{beat}_{direction}_{col}'
    x=80+col*160+80;y=80+row*208+152
    if kind=='combined':
     f=Image.open(OUT/'character_frames'/(name+'.png')).convert('RGBA')
     im.paste(f,(x-56,y-80),f)
    f=Image.open(OUT/'vfx_frames'/(name+'.png')).convert('RGBA')
    dx,dy=fxby['combo_'+beat+'_'+direction]['effectPlacementOffset'] if kind=='combined' else [0,-48]
    im.paste(f,(x+dx-80,y+dy-80),f)
    if kind=='combined':draw.line((x-2,y+3,x+2,y+3),fill=(70,165,170))
  im.save(REVIEW/(kind+'_contact_'+direction+'_1x.png'))
# True pixel montage: background preserved; only explicit sprite layers/labels are added.
background=Image.open(ROOT/'docs/evidence/m3c3/six-player-combat-1280.png').convert('RGB')
mock=background.copy();draw=ImageDraw.Draw(mock)
draw.rectangle((18,113,468,156),fill=(18,18,23))
draw.text((26,118),'BONG v2 PIXEL MOCKUP / NOT A GAME CAPTURE',font=font,fill=(255,218,145))
draw.text((26,137),'Original pixels, display 2x; runtime pending review',font=font,fill=(230,230,225))
placements=[('thrust','right',470,285),('sweep','down',690,285),('rising','left',960,280),('overhead','up',1080,370)]
for beat,direction,x,y in placements:
 name=f'combo_{beat}_{direction}_2';char=Image.open(OUT/'character_frames'/(name+'.png')).convert('RGBA')
 fx=Image.open(OUT/'vfx_frames'/(name+'.png')).convert('RGBA')
 dx,dy=fxby['combo_'+beat+'_'+direction]['effectPlacementOffset']
 char=char.resize((224,200),Image.Resampling.NEAREST);fx=fx.resize((320,320),Image.Resampling.NEAREST)
 mock.paste(char,(x-112,y-160),char);mock.paste(fx,(x+dx*2-160,y+dy*2-160),fx)
 draw.text((x-68,y+12),beat.upper()+' / '+direction,font=font,fill=(255,231,180),stroke_width=1,stroke_fill=(10,10,10))
mock.save(REVIEW/'gameplay_mockup_display_2x_1280.png')
mock.resize((640,360),Image.Resampling.NEAREST).save(REVIEW/'gameplay_mockup_logical_1x_640.png')
import shutil
shutil.copyfile(ROOT/'docs/evidence/m3c3/six-player-combat-1280.png',REVIEW/'reference_actual_gameplay_1280.png')
print('Separate VFX/combined contacts + true-pixel 1x/2x gameplay mockups written')
