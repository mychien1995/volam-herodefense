from pathlib import Path
from PIL import Image, ImageDraw
from math import hypot
import json

source = Path('assets/source/loi-dai')
exports = Path('assets/exports/loi-dai')
exports.mkdir(parents=True, exist_ok=True)
map_art = Image.open(source / 'hong-moc.png').convert('RGBA').resize((836, 470), Image.Resampling.LANCZOS)
map_art.convert('RGB').save(exports / 'hong-moc.png', optimize=True)
rail_sections = {
    'north-rail': (170, [
        [(136,153),(700,153),(706,170),(130,170)],
        *[[(x-7,140),(x+7,140),(x+7,171),(x-7,171)] for x in [138,251,355,480,585,697]],
    ]),
    'south-rail': (388, [
        [(87,314),(103,315),(103,332),(345,332),(345,386),(77,386),(77,353)],
        [(490,332),(733,332),(733,316),(754,316),(759,386),(490,386)],
        [(332,357),(362,357),(362,404),(332,404)],
        [(474,357),(506,357),(506,404),(474,404)],
    ]),
}
layers=[]
for name,(depth, polygons) in rail_sections.items():
    alpha = Image.new('L',map_art.size)
    draw = ImageDraw.Draw(alpha)
    for shape in polygons: draw.polygon(shape,fill=255)
    box = alpha.getbbox()
    layer = map_art.copy()
    layer.putalpha(alpha)
    layer.crop(box).save(exports / f'{name}.png', optimize=True)
    layers.append({'id': name, 'x':box[0], 'y':box[1], 'depth':depth})
img = Image.open(source / 'victory-fireworks.png').convert('RGBA')
assert img.getchannel('A').getextrema()[0] == 0
# Subtle alpha haze in the concept is removed at game scale. Each ray keeps
# its authored RGB and gains a different reveal time based on its distance from the burst.
img = img.resize((151, 151), Image.Resampling.LANCZOS)
frames = 16
frame_size = 132
sheet = Image.new('RGBA', (frame_size * 4, frame_size * 4))
bursts = [(38, 41, 26, 2), (75, 68, 38, 0), (113, 38, 25, 4)]
for frame in range(frames):
    cel = Image.new('RGBA', (frame_size, frame_size))
    for y in range(11, 127):
        for x in range(9, 142):
            r,g,b,a = img.getpixel((x,y))
            if a < 25 or max(r,g,b) < 100:
                continue
            radius, burst = min((hypot(x-bx,y-by) / reach, (bx,by,reach,delay)) for bx,by,reach,delay in bursts)
            bx,by,reach,delay = burst
            age = frame - delay
            if age < 0 or radius > (age+1) * .25:
                continue
            fade = max(0.0, min(1.0, (12.5 - age - (1-radius)*3) / 4))
            opacity = int(a * fade)
            if opacity > 10 and x-9 < frame_size:
                cel.putpixel((x-9, y-10 + max(0, age-5)), (r,g,b,opacity))
    sheet.paste(cel, ((frame%4)*frame_size, (frame//4)*frame_size))
sheet.save(exports / 'fireworks.png', optimize=True)
manifest = {'width':836,'height':470,'layers':layers,'fireworks':{
    'frameWidth':frame_size,'frameHeight':frame_size,'frameCount':frames,'fps':14,
    'originX':0.5,'originY':1.0
}}
(exports/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
