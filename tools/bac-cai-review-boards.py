"""Static PNG review layouts from retained artwork and actual Phaser captures. No recording."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
version=sys.argv[1] if len(sys.argv)>1 else 'v02'
assert version in ['v02','v03']
OUT=ROOT/f'docs/evidence/bac-cai-preview-{version}'
BASE=ROOT/'assets/sprites/bosses/main/bac-cai'
NEW=BASE/'rework-v02'
OUT.mkdir(parents=True,exist_ok=True)
fontpath=Path('C:/Windows/Fonts/segoeui.ttf')
def font(size):return ImageFont.truetype(str(fontpath),size)
def base(w,h,title,subtitle):
    im=Image.new('RGB',(w,h),'#142018');d=ImageDraw.Draw(im)
    d.rectangle((10,10,w-11,h-11),outline='#9e8548',width=2)
    d.text((32,22),title,font=font(34),fill='#ffe0a0')
    d.text((32,70),subtitle,font=font(18),fill='#c8ccb5')
    return im,d
def paste(im,path,cx,bottom,scale=2):
    cel=Image.open(path).convert('RGBA');cel=cel.resize((round(cel.width*scale),round(cel.height*scale)),Image.Resampling.NEAREST)
    im.paste(cel,(round(cx-cel.width/2),bottom-cel.height),cel)
im,d=base(1600,1250,f'BẮC CÁI · Sprite & VFX rework {version}',f'Concept / nhân vật gốc giữ nguyên · {56 if version=="v03" else 52} frame bổ sung · Bản mẫu chờ duyệt, chưa tích hợp combat server')
def heading(y,text):
    d.line((32,y-10,1568,y-10),fill='#526044',width=1);d.text((32,y),text,font=font(23),fill='#efce8d')
heading(110,'Nhân vật gốc · bốn hướng · cùng tỷ lệ pixel')
for i,direction in enumerate(['down','right','up','left']):
    paste(im,BASE/'frames'/f'idle_{direction}_0.png',220+i*380,345)
heading(340,'Đả Cẩu Bổng Kích · thu gậy → chọc ngang → duỗi gậy → thu thế')
for i in range(4):paste(im,NEW/'character/frames'/f'staff_thrust_right_{i}.png',220+i*380,565)
heading(560,'Uống rượu / nằm ngủ · Chó đen: chạy, cắn, bị thương và chết')
for i,(group,frame) in enumerate([('drink_down',1),('drink_down',2),('sleep_down',1),('sleep_down',2)]):paste(im,NEW/'character/frames'/f'{group}_{frame}.png',140+i*240,790)
for i,tag in enumerate(['walk_right','bite_right','hurt_right','death_right']):paste(im,NEW/'dog/frames'/f'{tag}_2.png',1070+(i%2)*260,690+(i//2)*105,2)
heading(800,'Tia kình khí dài · Dây nối · Vùng chữ Điền · Rồng lửa · Khói phân thân')
for i,tag in enumerate(['qi_beam','pair_tether','field_impact','fire_dragon','clone_smoke']):
    if tag=='qi_beam' and version=='v03':
        paste(im,BASE/'rework-v03/frames/qi_beam_1.png',175,1050,.38)
    else:paste(im,NEW/'vfx/frames'/f'{tag}_1.png',175+i*310,1145,1.5)
d.text((32,1180),'Pose chọc mới: hướng phải. Uống/ngủ: hướng xuống. Chó: hướng phải (trái lật ngang). Các hướng bổ sung chờ duyệt.',font=font(19),fill='#bac6ae')
im.save(OUT/'sprite-vfx-review-board.png')

captures=ROOT/('.cache/bac-cai-preview-captures-v03' if version=='v03' else '.cache/bac-cai-preview-captures')
tiles=[('entrance','Từ phương Bắc'),('staff','Đả Cẩu Bổng Pháp'),('palms','Hàng Long 18 Chưởng'),('beam','Đả Cẩu Bổng Kích'),('dogs','Bổng Đả Ác Khuyển'),('clones','Mục Hạ Vô Nhân'),('vortex','Thiên Hạ Vô Cẩu'),('tether','Kháng Long Hữu Hối'),('field','Kiến Long Tại Điền'),('spiral','Phi Long Tại Thiên'),('preferences','Sở thích / biểu quyết')]
if all((captures/(key+'.png')).exists() for key,_ in tiles):
    board,draw=base(1600,1510,'BẮC CÁI · Các pha trong demo Phaser','Ảnh chụp thật · arena chính hiện có · 6 nhân vật mẫu · Không phải kiểm thử combat / multiplayer của boss')
    for i,(key,title) in enumerate(tiles):
        x=28+(i%3)*520;y=115+(i//3)*340
        shot=Image.open(captures/(key+'.png')).convert('RGB').resize((504,284),Image.Resampling.NEAREST)
        board.paste(shot,(x,y+34));draw.text((x,y),title,font=font(21),fill='#ffe0a0')
    board.save(OUT/'phaser-demo-overview.png')
print('Saved review PNG layouts to',OUT)
