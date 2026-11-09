
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

root = Path(__file__).resolve().parents[1]
base = root / 'assets/concepts/skills/thieu-lam'
output = root / 'assets/exports/skills/thieu-lam/quyen-rework'
client = root / 'apps/game-client/src/shaolin-quyen-art.json'
refs = [
    base / 'm3d-rework-v02/la_han_quyen_v02.png',
    base / 'm3d-rework-v02/thieu_lam_quyen_basic_v02.png',
    base / 'm3d-rework-v03/vo_anh_cuoc_v03.png',
    base / 'm3d-rework-v02/thieu_lam_quyen_basic_vertical_v02.png',
]
for path in refs:
    manifest = json.loads((path.parent / 'manifest.json').read_text(encoding='utf-8'))
    approved = next(a['sha256'] for a in manifest['assets'] if a['file'] == path.name)
    assert sha256(path.read_bytes()).hexdigest() == approved, path
la, basic, vo, vertical = [Image.open(path).convert('RGBA') for path in refs]
output.mkdir(parents=True, exist_ok=True)
components = []

def write(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

def crop(image, box, exclude=None):
    frame = image.crop(box)
    alpha = frame.getchannel('A').point(lambda x: 0 if x < 18 else x)
    if exclude:
        mask = Image.new('L', frame.size, 255)
        ImageDraw.Draw(mask).rectangle(tuple(v - box[i % 2] for i, v in enumerate(exclude)), fill=0)
        from PIL import ImageChops
        alpha = ImageChops.multiply(alpha, mask.filter(ImageFilter.GaussianBlur(2)))
    frame.putalpha(alpha)
    return frame

def compose(image, box, size, anchor, target, factor, exclude=None):
    frame = crop(image, box, exclude)
    frame = frame.resize(tuple(round(v * factor) for v in frame.size), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    x = round(target[0] + (box[0] - anchor[0]) * factor)
    y = round(target[1] + (box[1] - anchor[1]) * factor)
    assert x >= 0 and y >= 0 and x + frame.width <= size[0] and y + frame.height <= size[1], (box, size, x, y, frame.size)
    canvas.paste(frame, (x, y))
    return canvas

def export(key, size, clips, skill, kind='vfx'):
    frames, tags, cels = {}, [], []
    for name, art, ticks, origin in clips:
        names = []
        for index, frame in enumerate(art):
            assert frame.size == size and frame.getchannel('A').getbbox()
            assert frame.getchannel('A').getextrema()[0] == 0
            slot = len(cels)
            x, y = (slot % 4) * size[0], (slot // 4) * size[1]
            filename = f'{name}_{index}'
            frames[filename] = {
                'frame': dict(x=x, y=y, w=size[0], h=size[1]),
                'rotated': False, 'trimmed': False,
                'spriteSourceSize': dict(x=0, y=0, w=size[0], h=size[1]),
                'sourceSize': dict(w=size[0], h=size[1]),
            }
            cels.append((frame, (x, y)))
            names.append(filename)
        tags.append({
            'name': name, 'frames': names, 'frameRate': 10, 'repeat': 0, 'loop': False,
            'direction': name.rsplit('_', 1)[-1] if name.endswith(('_left','_right','_up','_down')) else 'right',
            'origin': origin, 'frameDimensions': size, 'stage': name, 'placement': 'world',
            'effectPlacementOffset': [0, 0], 'frameDurationsMs': ticks, 'durationMsTotal': sum(ticks),
        })
    atlas = Image.new('RGBA', (size[0] * 4, size[1] * ((len(cels) + 3) // 4)))
    for frame, xy in cels:
        atlas.paste(frame, xy)
    atlas.save(output / f'{key}.png')
    write(output / f'{key}.json', {'frames': frames, 'meta': {'image': key+'.png', 'size': dict(w=atlas.width,h=atlas.height), 'scale':'1'}})
    rel = output.relative_to(root).as_posix()
    components.append(dict(id=key, sourceId=key, skillId=skill, kind=kind, sheet=f'{rel}/{key}.png',
                           atlas=f'{rel}/{key}.json', origin=[.5,.5], frameDimensions=size, animations=tags))

def directions(name, frames, times, origin):
    return [(name+'_right', frames, times, origin),
            (name+'_left', [ImageOps.mirror(f) for f in frames], times, [1-origin[0],origin[1]])]

stages = ['left_fist','right_fist','front_kick','roundhouse_kick']
poses = [
    [((102,75,300,345),(202,329)),((101,438,340,712),(205,697))],
    [((440,75,637,345),(541,329)),((438,433,684,713),(544,696))],
    [((774,65,950,346),(863,330)),((776,423,1003,714),(864,694))],
    [((1115,65,1339,351),(1230,332)),((1084,422,1391,717),(1202,699))],
]
clips = []
for stage, pair in zip(stages, poses):
    art = [compose(basic, box, (86,72), anchor, (43,62), .21) for box,anchor in pair]
    clips += directions(stage, [*art, art[0]], [58,95,47], [43/86,62/72])
for direction, top, foot in [('down', 51, 388), ('up', 500, 835)]:
    for index, (left, right, x) in enumerate([(110,350,224), (553,798,669), (998,1245,1116), (1398,1680,1540)]):
        frame = compose(vertical, (left, top, right, foot + 8), (86,72), (x,foot), (43,62), .16)
        # Both generated fist poses share a striking arm. Mirror the second
        # contact cel around its foot anchor to recover the alternating punch.
        origin = [43/86,62/72]
        if index == 1:
            frame = ImageOps.mirror(frame)
            origin[0] = 1-origin[0]
        clips.append((stages[index]+'_'+direction,[frame],[200],origin))
export('shaolin_quyen_body', (86,72), clips, 'thieu_lam_quyen', 'character')

def fit(image, box, size, width, height):
    frame = crop(image, box)
    frame.thumbnail((width,height), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.paste(frame, ((size[0]-frame.width)//2,(size[1]-frame.height)//2))
    return canvas
boxes = [(115,860,281,968),(453,838,624,971),(793,844,979,981),(1156,825,1337,1009)]
fx = [(s, [fit(basic,b,(72,72), *( (61,65) if i==3 else (49,37) ))], [130],[.5,.5]) for i,(s,b) in enumerate(zip(stages,boxes))]
fx += [('foot', [fit(vo,(1175,70,1466,183),(72,72),61,38)], [100],[.61,.5]),
       ('heel', [fit(basic,boxes[3],(72,72),43,54)],[100],[.5,.5])]
export('shaolin_quyen_ki', (72,72), fx, 'thieu_lam_quyen')

poses = [
    ((0,0,286,389),(190,464),(107,275,274,398)),
    ((440,6,956,400),(606,464),(516,272,699,406)),
    ((969,5,1512,398),(1115,464),(1032,272,1200,405)),
    ((0,512,532,888),(180,939),(99,750,277,897)),
    ((522,518,839,844),(726,939),(640,747,814,848)),
]
ghost = [compose(la, box, (170,133), anchor, (52,122), .25, remove) for box,anchor,remove in poses]
export('shaolin_la_han', (170,133), directions('apparition',[ghost[0],ghost[1],ghost[0],ghost[2],ghost[0],ghost[3],ghost[4]],[150,135,85,135,85,155,175],[52/170,122/133]), 'la_han_quyen')
ground=fit(la,(1140,767,1531,957),(112,55),104,51)
export('shaolin_la_han_ground', (112,55), [('impact',[ground],[160],[.5,.73])], 'la_han_quyen')

flying = compose(vo,(113,540,572,928),(110,92),(288,923),(46,75),.177,(351,856,575,932))
grounded = compose(vo,(230,106,516,446),(110,92),(340,439),(46,79),.166,(406,405,530,450))
export('shaolin_vo_anh_body', (110,92),
       directions('fly',[flying],[100],[46/110,84/92])+directions('cast',[grounded],[100],[46/110,79/92]),'vo_anh_cuoc','character')
dust=fit(vo,(533,832,974,942),(115,40),108,35)
export('shaolin_vo_anh_dust', (115,40), [('gust',[dust],[120],[.72,.57])], 'vo_anh_cuoc')
write(client, {'assets': components})
print('Exported', len(components), 'Shaolin atlas layers')
