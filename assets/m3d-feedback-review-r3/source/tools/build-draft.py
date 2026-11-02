"""Concept-only export adapter. Reuses retained alpha measurement and Aseprite assembly.

These are authored key poses for review, not completed production animation.
No game package, approved input, or production loader is modified.
"""
from pathlib import Path
import sys, json, hashlib, subprocess, importlib.util
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'assets/m3d-feedback-review-r3'
SRC = BASE / 'source'
TOOLS = ROOT / 'assets/source/skills/m3c3_feedback_v2_batches/tools'
sys.dont_write_bytecode = True
sys.path.insert(0, str(TOOLS))
import measure_characters as mc
import measure_effects as me

ASE = Path('C:/Program Files/Aseprite/Aseprite.exe')
mc.BASE = SRC
me.BASE = SRC

def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def rel(path):
    return path.relative_to(ROOT).as_posix()

def run(args):
    p = subprocess.run([str(a) for a in args], capture_output=True, text=True,
                       creationflags=subprocess.CREATE_NO_WINDOW)
    if p.returncode:
        raise RuntimeError(p.stdout + p.stderr)
    print(p.stdout.strip())

def build():
    body = 'ca_diep_body_keyposes_v01'
    ground = 'ca_diep_ground_keyposes_v01'
    mc.measure('', body, 4, 4, 44)
    me.measure('', ground, 4, 5)
    me.measure('', 'ca_diep_stun_keyposes_v01', 1, 4)
    bodies = read(SRC / 'character_measurements.json')[body]
    grounds = read(SRC / 'effect_measurements.json')[ground]
    prepared = []
    for role, ident, dims, pivot in [
        ('character', 'r3_ca_diep_body_keyposes', [160, 120], [80, 96]),
        ('vfx', 'r3_ca_diep_ground_keyposes', [128, 96], [64, 72]),
    ]:
        dest = BASE / 'exported' / ident
        (dest / 'frames').mkdir(parents=True, exist_ok=True)
        c = dict(id=ident, role=role, canvas=dims, pivot=pivot, frames=[], clips=[],
                 sourceFile=rel(SRC / (ident + '.aseprite')),
                 individualDirectory=rel(dest / 'frames'))
        if role == 'character':
            # Match the reviewed palette, never modify the protected source itself.
            palette_image = Image.open(ROOT / 'assets/exports/characters/hero_thieu_lam.png').convert('RGBA')
            colors = [p[:3] for p in palette_image.getdata() if p[3] >= 220]
            q = Image.new('RGB', (len(colors), 1)); q.putdata(colors)
            pal = q.quantize(colors=128).getpalette()
            c['palette'] = [pal[i:i+3] for i in range(0, 384, 3)]
        widths = [e['rect'][2] for e in grounds['frames'] if e['col'] in [1, 2]]
        effect_scale = 48 / sorted(widths)[len(widths)//2]
        for row, direction in enumerate(['right', 'down', 'left', 'up']):
            phases = ['anticipation', 'raise', 'contact', 'recovery'] if role == 'character' else ['birth', 'travel', 'impact', 'outro']
            groups = [[0], [1], [2], [3]] if role == 'character' else [[0], [1, 2], [3], [4]]
            for phase, cols in zip(phases, groups):
                tag = f'{phase}_{direction}'
                names = []
                durations = []
                for index, col in enumerate(cols):
                    name = f'{tag}_{index}'
                    duration = 180 if role == 'character' else 110
                    names.append(name); durations.append(duration)
                    if role == 'character':
                        e = bodies['frames'][row*4+col]
                        x, y, x1, y1 = e['bounds']
                        rect = [x, y, x1-x, y1-y]
                        anchor = [e['foot'][0]-x, e['foot'][1]-y]
                        scale = bodies['scale']
                    else:
                        e = grounds['frames'][row*5+col]
                        rect = e['rect']
                        anchor = [rect[2]/2, rect[3]*.82]
                        scale = effect_scale
                    c['frames'].append(dict(source=rel(SRC/'generated'/((body if role=='character' else ground)+'.png')),
                        rect=rect, runs=e['runs'], anchor=anchor, scale=scale,
                        threshold=220, kind=role, pivot=pivot, name=name, tag=tag, durationMs=duration))
                c['clips'].append(dict(name=tag, phase=phase, facing=direction,
                    frames=names, frameDurationsMs=durations, loop=phase=='travel',
                    durationMsTotal=sum(durations), origin=[pivot[0]/dims[0], pivot[1]/dims[1]],
                    status='keypose-draft-awaiting-concept-approval'))
        prepared.append(c)
    status = read(SRC/'effect_measurements.json')['ca_diep_stun_keyposes_v01']['frames']
    ident = 'r3_ca_diep_stun_keyposes'
    dest = BASE/'exported'/ident
    (dest/'frames').mkdir(parents=True, exist_ok=True)
    scale = 24/max(e['rect'][2] for e in status)
    frames = []
    for i, e in enumerate(status):
        rect = e['rect']
        frames.append(dict(source=rel(SRC/'generated/ca_diep_stun_keyposes_v01.png'), rect=rect,
            runs=e['runs'], anchor=[rect[2]/2,rect[3]/2], scale=scale, threshold=220,
            kind='vfx', pivot=[32,24], name=f'stun_loop_{i}', tag='stun_loop', durationMs=140))
    prepared.append(dict(id=ident,role='vfx',canvas=[64,48],pivot=[32,24],frames=frames,
        sourceFile=rel(SRC/(ident+'.aseprite')),individualDirectory=rel(dest/'frames'),
        clips=[dict(name='stun_loop',phase='status',facing='billboard',frames=[f['name'] for f in frames],
            frameDurationsMs=[140]*4,loop=True,durationMsTotal=560,origin=[.5,.5],
            status='keypose-draft-awaiting-concept-approval')]))
    save(SRC/'assembly_plan.json', {'components':prepared, 'newCharacterPalette':[]})
    original = (ROOT/'assets/m3d-feedback-visual/source/tools/assemble.lua').read_text(encoding='utf-8')
    adapted = original.replace("local folder=root..'/assets/m3d-feedback-visual/source'",
                                "local folder=root..'/assets/m3d-feedback-review-r3/source'")
    (SRC/'tools/assemble.lua').write_text(adapted, encoding='utf-8')
    run([ASE, '-b', '--script-param', 'root='+ROOT.as_posix(), '--script-param', 'batch=concept',
         '--script', SRC/'tools/assemble.lua'])
    # Reuse the r2 contact exporter, substituting only the output directory.
    spec = importlib.util.spec_from_file_location('r2_contact', ROOT/'assets/m3d-feedback-visual/source/tools/build.py')
    contact = importlib.util.module_from_spec(spec); spec.loader.exec_module(contact)
    contact.PRE = BASE/'previews'
    components = []
    for c in prepared:
        dest = BASE/'exported'/c['id']
        sheet = dest/(c['id']+'.png'); atlas = dest/(c['id']+'.json')
        run([ASE, '-b', ROOT/c['sourceFile'], '--sheet-type', 'rows', '--sheet-columns', '4',
            '--border-padding', '2', '--shape-padding', '2', '--format', 'json-hash',
            '--list-tags', '--list-slices', '--filename-format', '{tag}_{tagframe}',
            '--sheet', sheet, '--data', atlas])
        contact.contact(c, dest)
        meta = dict(id=c['id'], role=c['role'], canvas=c['canvas'], feetPivot=c['pivot'] if c['role']=='character' else None,
            effectAnchor=c['pivot'] if c['role']=='vfx' else None, pivot=c['pivot'],
            sheet=rel(sheet), atlas=rel(atlas), sourceFile=c['sourceFile'],
            animations=c['clips'], status='keypose-draft-awaiting-concept-approval',
            directorApproved=False, productionIntegrated=False, phaserProductionVerified=False,
            nativeBodyHeight=44 if c['role']=='character' else None,
            timingAuthority='All playback timing is a presentation fixture. Stats and hit contract pending.')
        save(dest/(c['id']+'.animations.json'), meta)
        components.append(meta)
    save(BASE/'manifest.json', dict(revision='r3-concept-batch-01', components=components,
        status='keypose-draft-awaiting-concept-approval', directorApproved=False,
        productionIntegrated=False, phaserProductionVerified=False,
        selectedTags={c['id']:[a['name'] for a in c['animations']] for c in components},
        excludes=['superseded sweeping-lunge Ca Diep design', 'production integration', 'gameplay stats'],
        pending=['director concept/pose approval', 'production in-between animation', 'remaining r3 inventory']))
    report = dict(status='PASS', scope='Static draft PNG/atlas consistency only', components=[])
    for c in components:
        a=read(ROOT/c['atlas']); im=Image.open(ROOT/c['sheet']).convert('RGBA')
        assert len(a['frames']) == sum(len(x['frames']) for x in c['animations'])
        for clip in c['animations']:
            for name in clip['frames']:
                f=a['frames'][name]['frame']; crop=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                frame=Image.open(BASE/'exported'/c['id']/'frames'/(name+'.png')).convert('RGBA')
                assert crop.tobytes()==frame.tobytes(),name
                assert crop.getchannel('A').getbbox(),name
                assert crop.size==tuple(c['canvas']),name
        report['components'].append(dict(id=c['id'], frames=len(a['frames']), tags=len(c['animations'])))
    save(BASE/'previews/static-validation.json', report)
    print(json.dumps(report))

if __name__ == '__main__':
    build()
