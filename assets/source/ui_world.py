"""Original pixel-authored environment/UI studies for the v1.5 UI refactor.
Pillow is an optional authoring tool; committed PNG exports run without Python.
All artwork remains PROTOTYPE, not reference-quality or director-approved art.
No reference image pixels are sampled or included in runtime exports.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import random, json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/exports/presentation';OUT.mkdir(parents=True,exist_ok=True)
assets=[]
def export(name,im,pivot=(.5,1)):
    im.save(OUT/(name+'.png'))
    assets.append(dict(id=name,category='presentation',status='prototype',source='assets/source/ui_world.py',sheet='presentation/'+name+'.png',frameWidth=im.width,frameHeight=im.height,footPivot=list(pivot),license='Original project artwork; no third-party content',attribution='Original pixel-authored UI/environment study; not approved final art'))
def canvas(w,h):
    im=Image.new('RGBA',(w,h));return im,ImageDraw.Draw(im)
rng=random.Random(15029)
# Neutral warm paving and quiet grass; the four existing Tiled IDs are unchanged.
terrain,td=canvas(128,32)
for tile in range(4):
    x0=tile*32;td.rectangle((x0,0,x0+31,31),fill='#476748' if tile!=2 else '#aaa581')
    if tile==2:
        for row in range(4):
            offset=8 if row%2 else 0
            for col in range(-1,3):
                x=x0+col*16+offset;y=row*8
                if x+15<x0 or x>x0+31:continue
                td.rectangle((max(x0,x),y,min(x0+31,x+15),y+7),fill=rng.choice(['#b8b08b','#b1ab86','#a6a480']),outline='#8d9474')
                if x>=x0 and x<x0+30:td.line((x+1,y+1,min(x+13,x0+31),y+1),fill='#c4bc95')
        for _ in range(30):
            x=x0+rng.randrange(32);y=rng.randrange(32);td.point((x,y),fill=rng.choice(['#999d79','#bdba94','#a2a480']))
    else:
        for _ in range(70):
            x=x0+rng.randrange(32);y=rng.randrange(32);td.line((x,y,x+1,y),fill=rng.choice(['#3e6146','#50734c','#597c50','#688653']))
        if tile==3:
            for x,y in [(7,9),(21,25),(26,6)]:
                td.line((x0+x,y+2,x0+x,y+5),fill='#345441');td.rectangle((x0+x-1,y,x0+x+1,y+1),fill='#c9b979');td.point((x0+x,y),fill='#ede0aa')
terrain.save(ROOT/'assets/exports/tilesets/terrain.png')
# Existing 96x112 tree footprint/pivot retained. Individual pixel leaf clusters.
def tree(pink=False):
    im,d=canvas(96,112);d.ellipse((8,91,88,109),fill=(15,36,27,70))
    d.polygon([(39,103),(45,73),(34,55),(42,51),(51,68),(64,46),(69,50),(56,77),(58,102)],fill='#303f30')
    d.polygon([(43,101),(47,75),(39,57),(42,55),(52,73),(64,52),(61,67),(53,79),(54,103)],fill='#77724a')
    d.line((48,80,47,100),fill='#a28a57',width=2)
    colors=['#343d48','#7a4d61','#a26578','#c78898','#e6abba'] if pink else ['#203f34','#315440','#4a7048','#678750','#8fa362']
    clusters=[(27,48,26),(66,51,27),(46,32,28),(23,68,20),(70,70,23),(46,64,28)]
    for x,y,r in clusters:
        d.ellipse((x-r,y-r//2-7,x+r,y+r//2+7),fill=colors[0])
        d.ellipse((x-r+2,y-r//2-9,x+r-2,y+r//2+2),fill=colors[1])
        for _ in range(95):
            px=x+rng.randrange(-r+3,r-2);py=y+rng.randrange(-r//2-6,r//2+1)
            if ((px-x)/r)**2+((py-y+3)/(r*.68))**2<.8:
                color=rng.choice(colors[2:]);d.rectangle((px,py,px+rng.randrange(1,4),py+1),fill=color)
    return im
normal=tree();normal.save(ROOT/'assets/exports/scenery/tree.png');export('blossom',tree(True))
# Frontal roof planes and layered eaves, aligned to an orthogonal ground plane.
im,d=canvas(144,138)
d.ellipse((8,119,137,137),fill=(14,27,25,80));d.rectangle((22,77,122,126),fill='#594c35')
for x in range(26,122,12):d.rectangle((x,80,x+7,123),fill='#8b714a');d.line((x+1,81,x+1,122),fill='#b59c68')
d.rectangle((29,91,109,112),fill='#263a31');d.rectangle((35,95,104,108),fill='#ba9a53')
for x in range(39,106,9):d.rectangle((x,94,x+3,108),fill='#574d32')
d.rectangle((15,118,129,124),fill='#c0ad79');d.rectangle((20,125,124,130),fill='#665e43')
# Three-quarter roof, horizontal ridge with flared eaves.
d.polygon([(8,78),(23,65),(37,40),(107,40),(120,65),(136,78),(129,83),(14,83)],fill='#1e3234')
for y in range(44,77,5):
    inset=int((77-y)*.43);d.line((14+inset,y,130-inset,y),fill='#597276',width=2);d.line((14+inset,y+2,130-inset,y+2),fill='#344f56')
for x in range(25,126,10):d.line((int(72+(x-72)*.65),43,x,77),fill='#8c9c90')
d.line((9,79,135,79),fill='#b0a478',width=2);d.line((35,39,109,39),fill='#b4a87e',width=3)
for x in (27,116):
    d.line((x,81,x,93),fill='#baa174');d.rectangle((x-5,92,x+5,106),fill='#a15135');d.rectangle((x-3,94,x+3,103),fill='#e0a65c');d.line((x,107,x,113),fill='#cca764')
# Counter wares are illustration only, not items or economy.
for x,c in [(39,'#8aa59c'),(54,'#bfa96a'),(69,'#b76e47'),(86,'#728e88')]:
    d.rectangle((x,110,x+5,116),fill=c);d.rectangle((x+1,108,x+4,110),fill='#3b4634')
export('merchant_stall',im)
im,d=canvas(96,125);d.ellipse((6,108,90,123),fill=(20,42,33,80))
d.ellipse((20,20,77,104),fill='#203d45');d.ellipse((27,26,70,96),fill='#3e7583');d.ellipse((31,29,66,94),fill='#203745')
for r in range(21,4,-4):d.ellipse((48-r,65-r*1.3,48+r,65+r*1.3),outline=['#6ea8aa','#93d2ca','#4c909a'][r%3],width=2)
for side in [14,71]:
    for y in range(38,104,12):d.rectangle((side,y,side+11,y+10),fill='#687d70',outline='#263f38');d.line((side+2,y+1,side+9,y+1),fill='#9eab89')
for x,y in [(20,31),(29,22),(40,17),(52,18),(64,25)]:d.rectangle((x,y,x+12,y+13),fill='#8b9476',outline='#3a5647')
d.rectangle((9,104,88,111),fill='#a2a57e');d.rectangle((15,112,82,118),fill='#5c7058');export('dungeon_gate',im)
im,d=canvas(96,112);d.ellipse((6,94,89,110),fill=(24,41,32,65))
for y,w,c in [(100,80,'#596b58'),(94,68,'#929a77'),(87,54,'#727f64')]:d.rectangle((48-w//2,y,48+w//2,y+7),fill=c,outline='#3e5547')
d.polygon([(32,85),(37,58),(32,41),(37,27),(58,27),(62,41),(58,58),(68,85)],fill='#3f554a')
d.polygon([(38,83),(43,53),(38,37),(42,30),(55,30),(57,42),(53,58),(61,83)],fill='#9caa8b')
d.ellipse((39,12,59,34),fill='#5f7765');d.rectangle((42,18,55,33),fill='#b5bda0');d.polygon([(38,16),(46,9),(57,14),(61,21),(38,21)],fill='#566b5b')
d.line((49,39,42,71),fill='#d2c9a3',width=2);d.polygon([(36,44),(29,61),(41,64),(52,49)],fill='#7d9275');d.line((60,35,70,84),fill='#b9b292',width=3)
export('statue_study',im)
im,d=canvas(24,67);d.ellipse((0,59,23,66),fill=(15,26,20,70));d.rectangle((9,25,14,61),fill='#485648');d.rectangle((6,58,17,62),fill='#9b9368');d.rectangle((3,13,20,30),fill='#463f2a');d.rectangle((6,16,17,27),fill='#edb461');d.rectangle((9,17,14,26),fill='#fce1a0');d.polygon([(0,13),(5,8),(18,8),(23,13)],fill='#2c4240');d.line((1,12,22,12),fill='#ad9d64');export('lantern',im)
im,d=canvas(44,96)
for x,h in [(8,65),(18,90),(30,78),(36,55)]:
    d.line((x,94,x-3,94-h),fill='#264c3a',width=4);d.line((x-1,93,x-4,95-h),fill='#7a9960',width=1)
    for y in range(96-h,90,14):
        d.line((x-4,y,x+1,y),fill='#a4ac69')
        d.polygon([(x,y+3),(x-14,y-9),(x-5,y-5)],fill='#46734a');d.polygon([(x,y+5),(x+13,y-4),(x+5,y-4)],fill='#698b53')
export('bamboo',im)
# Ground ornaments are deliberately non-blocking; server geometry is unchanged.
im,d=canvas(256,256)
for r in range(118,20,-10):
    d.ellipse((128-r,128-r,128+r,128+r),outline='#92997b' if r%20 else '#c1b58b',width=6)
    for a in range(0,360,30):
        import math
        x=128+int(math.cos(math.radians(a))*r);y=128+int(math.sin(math.radians(a))*r);d.rectangle((x-1,y-2,x+1,y+2),fill='#6c8062')
export('courtyard_seal',im,(.5,.5))
im,d=canvas(32,32);d.rectangle((0,0,31,31),fill='#346f70')
for y in [5,15,26]:
    d.line((3,y,15,y),fill='#5b9b8b');d.line((20,y+2,29,y+2),fill='#417f7b')
export('water',im,(0,0))
im,d=canvas(104,64)
d.rectangle((1,8,102,58),fill='#4a5940')
for y in range(10,58,6):d.rectangle((3,y,100,y+4),fill='#b5a16c');d.line((5,y+1,99,y+1),fill='#d4be80')
for x in [2,98]:
    d.rectangle((x,3,x+3,54),fill='#7c7c50')
    for y in [2,27,52]:d.rectangle((x-2,y,x+5,y+6),fill='#c6b782')
export('bridge',im,(.5,.5))
# Original small scene studies for menu cards; never use supplied references as assets.
thumbs,td=canvas(512,80)
for i,(base,light) in enumerate([('#264f3e','#718c56'),('#a9874e','#d5b370'),('#387c87','#9ad0bb'),('#352d32','#d16b37')]):
    x0=i*128;td.rectangle((x0,0,x0+127,79),fill=base)
    for _ in range(140):
        x=x0+rng.randrange(128);y=rng.randrange(80);td.rectangle((x,y,x+2,y+1),fill=light)
    td.polygon([(x0+49,80),(x0+83,80),(x0+70,0),(x0+61,0)],fill=light)
    if i==0:
        td.rectangle((x0,40,x0+127,51),fill='#397f7c');td.rectangle((x0+43,38,x0+84,53),fill='#ad9a62')
        for x,y in [(x0+20,17),(x0+102,26),(x0+23,68)]:
            td.rectangle((x,y,x+3,y+12),fill='#766a42');td.ellipse((x-14,y-16,x+17,y+5),fill='#1f4036');td.ellipse((x-12,y-18,x+15,y),fill='#678551')
    elif i==1:
        for x in [x0+19,x0+92]:td.rectangle((x,15,x+10,66),fill='#6d6848');td.rectangle((x-3,15,x+13,20),fill='#d1b278')
    elif i==2:
        td.rectangle((x0,55,x0+127,79),fill='#c6ba85')
        for y in range(7,54,9):td.line((x0+6,y,x0+120,y),fill='#74bdb4')
    else:
        for x in [x0+16,x0+104]:td.rectangle((x,10,x+9,68),fill='#1c2930');td.rectangle((x+2,15,x+6,52),fill='#f1aa4e')
export('destinations',thumbs,(0,0))
# Original UI icon atlas, not final inventory content or skill art.
keys=['staff','flame','dragon','lock','bag','gold','scroll','portal','shop','swords','party','robe','jade','potion','ore','leaf']
sheet,sd=canvas(512,32)
for i,key in enumerate(keys):
    im,d=canvas(32,32);edge='#182b24';gold='#edcd83'
    if key in ['staff','swords']:
        d.line((8,26,24,6),fill=edge,width=6);d.line((8,26,24,6),fill='#d6ba77',width=3);d.line((17,19,23,24),fill='#927647',width=3)
        if key=='swords':d.line((7,6,25,26),fill='#b3d1cb',width=3);d.line((7,23,13,18),fill=gold,width=3)
    elif key in ['flame','dragon']:
        d.polygon([(5,25),(7,17),(13,13),(17,3),(18,15),(24,9),(27,22),(22,28),(10,29)],fill='#8c4027');d.polygon([(8,24),(15,15),(17,8),(20,21),(24,17),(23,26),(12,27)],fill='#f1a547');d.polygon([(12,25),(17,18),(20,26)],fill='#fff0ac')
        if key=='dragon':d.arc((3,9,29,28),0,270,fill=gold,width=2);d.rectangle((22,9,27,13),fill=gold)
    elif key=='lock':
        d.arc((9,4,23,21),180,360,fill='#859780',width=3);d.rectangle((7,14,25,28),fill='#64725c',outline=gold);d.rectangle((15,19,17,24),fill=edge)
    elif key=='bag':
        d.polygon([(11,10),(7,19),(6,26),(13,29),(23,28),(27,23),(23,12)],fill='#6d4f32',outline=edge);d.polygon([(13,10),(9,21),(11,26),(22,26),(24,22),(20,10)],fill='#b58c53');d.polygon([(9,3),(25,3),(20,10),(13,10)],fill='#d0a873');d.line((10,11,23,11),fill='#782f28',width=2)
    elif key=='gold':
        d.ellipse((4,5,28,28),fill='#92753e',outline=edge,width=2);d.ellipse((6,5,27,26),fill='#e8c471');d.ellipse((10,9,23,22),fill='#ac873b',outline='#ffdfa0',width=2);d.rectangle((15,13,19,18),fill=edge)
    elif key=='scroll':
        d.polygon([(8,6),(25,4),(23,26),(6,28)],fill='#d7c492',outline='#7c6c44');d.rectangle((5,5,11,9),fill=gold,outline='#80633c');d.rectangle((20,24,26,28),fill=gold,outline='#80633c')
        for y in [12,16,20]:d.line((12,y,20,y-1),fill='#725a3b')
    elif key=='portal':
        d.ellipse((6,2,26,30),fill='#718a79',outline=edge);d.ellipse((10,6,23,27),fill='#346974');d.arc((11,8,22,25),20,300,fill='#a4ddd0',width=2);d.arc((14,11,20,22),70,330,fill='#81b6ba',width=2)
    elif key=='shop':
        d.rectangle((7,15,25,28),fill='#a28a55');d.rectangle((10,18,21,25),fill='#253d31');d.polygon([(3,16),(8,7),(24,7),(29,16)],fill='#5a7b77',outline='#c1b879');d.line((4,15,28,15),fill=gold,width=2)
    elif key=='party':
        for x,y,c in [(8,15,'#78aaa2'),(24,15,'#78aaa2'),(16,8,'#ead1a0')]:d.ellipse((x-3,y-4,x+3,y+2),fill=c);d.polygon([(x-4,y+3),(x+4,y+3),(x+6,y+12),(x-6,y+12)],fill=c)
    elif key=='robe':
        d.polygon([(10,6),(22,6),(29,14),(25,20),(22,17),(24,28),(8,28),(10,17),(7,20),(3,14)],fill='#779a99',outline='#bdd0b2');d.line((12,7,20,20),fill=gold,width=2);d.rectangle((9,20,23,23),fill='#d0b77c')
    elif key=='jade':
        d.ellipse((5,5,25,26),fill='#2f7359',outline='#91c6a0',width=2);d.ellipse((10,10,20,21),fill=edge);d.line((24,20,28,30),fill='#b9513d',width=3)
    elif key=='potion':
        d.rectangle((12,3,20,10),fill='#bda474');d.ellipse((7,9,25,29),fill='#68908d',outline='#b0c5ab');d.ellipse((10,15,23,26),fill='#b4533c');d.line((10,15,10,21),fill='#ead3a1',width=2)
    elif key=='ore':
        d.polygon([(3,24),(10,9),(22,5),(29,22),(21,29)],fill='#89968b',outline='#c7c9ac');d.polygon([(10,9),(19,15),(22,5)],fill='#d3d1af');d.polygon([(19,15),(29,22),(21,29)],fill='#496259')
    else:d.polygon([(5,27),(10,10),(27,4),(23,22)],fill='#8eae67',outline='#bfca87');d.line((5,27,23,9),fill='#42664d',width=2)
    sheet.paste(im,(i*32,0))
export('ui_icons',sheet,(0,0))
assets[-1].update(frameWidth=32,frameHeight=32,columns=16,frames=keys)
for asset in assets:
    if asset['id']=='destinations':asset.update(frameWidth=128,frameHeight=80,columns=4,frames=['forest','desert','sea','hell'])
p=ROOT/'assets/manifest.json';manifest=json.loads(p.read_text(encoding='utf-8'))
for asset in manifest['assets']:
    if asset['id'] in ['tree','terrain']:asset['source']='assets/source/ui_world.py';asset['attribution']='Original pixel-authored environment prototype; unapproved'
manifest['assets']=[a for a in manifest['assets'] if a['category']!='presentation']+assets
p.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+chr(10),encoding='utf-8')
print('Exported 11 original UI/environment studies; actor sheets and server map unchanged.')
