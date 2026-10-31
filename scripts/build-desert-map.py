"""Compose retained authored desert tiles/props; does not generate artwork."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W, H, TILE = 48, 32, 32
terrain = json.loads((ROOT / 'assets/tilesets/desert/desert-terrain.json').read_text())
scenery = json.loads((ROOT / 'assets/sprites/environment/desert/desert-scenery.json').read_text())
layers = []
next_id = 1


def group(name, objects):
    global next_id
    for obj in objects:
        obj.update(id=next_id, rotation=0, visible=True)
        next_id += 1
    layers.append(dict(id=len(layers)+1, name=name, type='objectgroup', objects=objects,
                       opacity=1, visible=True, x=0, y=0, draworder='topdown'))


def marker(name, x, y, kind='spawn', width=0, height=0, **extra):
    return dict(name=name, type=kind, x=x, y=y, width=width, height=height, **extra)


def material_at(x, y):
    # Broad continuous approach and court, surrounded by irregular dunes/rock.
    if ((x-24)/12)**2 + ((y-15)/8)**2 < 1 or (21 <= x <= 27 and y >= 15):
        return 'sandstone_path'
    if x < 6 or x > 42 or y < 5:
        return 'rocky_ground'
    if (x-9)**2 + (y-23)**2 < 45 or (x-39)**2 + (y-23)**2 < 55:
        return 'dune_sand'
    if (x-12)**2 + (y-12)**2 < 30:
        return 'cracked_dry_earth'
    return 'rough_sand' if y < 24 else 'smooth_sand'


data = []
for y in range(H):
    for x in range(W):
        phase = x % 2 + 2 * (y % 2)
        corners = [material_at(x, y), material_at(x+1, y),
                   material_at(x+1, y+1), material_at(x, y+1)]
        # Every family transitions back to the common sand material.
        family = corners[0]
        if family == 'smooth_sand':
            family = next((m for m in corners if m != 'smooth_sand'), family)
        if family == 'smooth_sand':
            index = phase
        else:
            mask = sum(1 << i for i, m in enumerate(corners) if m == family)
            index = terrain['groups']['sand_to_' + family]['firstId'] + mask * 4 + phase
        data.append(index + 1)  # Tiled GIDs are one-based.
for name, values in [('ground', data), ('paving', [0]*(W*H)), ('details', [0]*(W*H))]:
    layers.append(dict(id=len(layers)+1, name=name, type='tilelayer', width=W,
                       height=H, x=0, y=0, opacity=1, visible=True, data=values))

props, collisions = [], []


def prop(name, x, y, footprint=None, ground=False):
    props.append(marker(name, x, y, 'scenery', properties=[
        dict(name='renderLayer', type='string', value='ground' if ground else 'feet')]))
    if footprint:
        dx, dy, width, height = footprint
        collisions.append(marker(name + '_footprint', x+dx, y+dy, 'solid', width, height))


# Enclose the usable ruins with authored cliffs, retaining an open central fight.
for x in range(80, 1536, 144):
    prop('cliff_straight', x, 112, (-64, -22, 128, 26))
for y in range(240, 950, 128):
    for x in [72, 1464]:
        prop('sandstone_rocks', x, y, (-34, -22, 68, 28))
prop('abandoned_temple', 768, 236, (-64, -30, 128, 38))
prop('ancient_monument', 432, 320, (-28, -18, 56, 24))
prop('ruined_gateway', 1104, 320, (-65, -18, 38, 28))
collisions.append(marker('ruined_gateway_right_footprint', 1131, 302, 'solid', 38, 28))
prop('guardian_lion_ruin', 672, 288, (-24, -20, 48, 28))
prop('guardian_lion_ruin', 864, 288, (-24, -20, 48, 28))
for x, y in [(352,448),(1184,448),(352,672),(1184,672),(512,832),(1024,832)]:
    prop('broken_pillar', x, y, (-18, -12, 36, 20))
for x, y in [(256,352),(1280,352),(288,736),(1248,736)]:
    prop('ruin_wall_horizontal', x, y, (-50, -14, 100, 20))
for x, y in [(192,512),(1344,512),(224,864),(1312,864)]:
    prop('dead_tree', x, y, (-12, -10, 24, 16))
for x, y in [(304,560),(1200,592),(464,264),(1072,256),(416,880),(1120,896)]:
    prop('sandstone_rocks', x, y, (-30, -18, 60, 24))
for x, y in [(288,464),(1248,464),(576,288),(960,288),(448,768),(1088,768)]:
    prop('desert_crate' if x % 3 else 'desert_barrel', x, y, (-16, -15, 32, 22))
for y in range(192, 980, 96):
    for x in range(168, 1420, 112):
        if (x//16 + y//16) % 3 == 0:
            prop('pebble_scatter', x+12, y+18, ground=True)
        elif x < 400 or x > 1150:
            prop('dry_bush', x, y, ground=True)
prop('gate_steps_base', 768, 944, ground=True)
prop('dungeon_entrance', 608, 944, (-48, -20, 96, 24))
# The functional exit is rendered separately at this same authoritative marker.
markers = [marker('hero_spawn', 768, 832), marker('exit_portal', 768, 944, 'portal')]
for i, (x, y) in enumerate([(640,512),(768,512),(896,512),(608,608),(768,608),(928,608),
                            (576,688),(704,688),(832,688),(960,688),(640,752),(896,752)]):
    markers.append(marker('creep_spawn_' + str(i), x, y))
group('scenery', props)
group('collision', collisions)
group('markers', markers)
result = dict(type='map', version='1.10', tiledversion='1.11.2', orientation='orthogonal',
              renderorder='right-down', width=W, height=H, tilewidth=TILE, tileheight=TILE,
              infinite=False, nextlayerid=len(layers)+1, nextobjectid=next_id, layers=layers,
              tilesets=[dict(firstgid=1, name='desert_terrain', tilewidth=32, tileheight=32,
                             tilecount=344, columns=16, margin=0, spacing=0,
                             image='../assets/tilesets/desert/desert-terrain.png',
                             imagewidth=512, imageheight=704)])
dest = ROOT / 'maps/creep_desert.tmj'
dest.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf8')
print(f'Composed {dest.name}: {len(props)} props, {len(collisions)} authoritative footprints')
