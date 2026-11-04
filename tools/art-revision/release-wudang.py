"""Fit approved Võ Đang Kiếm cels into the runtime's existing frame rectangles."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'assets/exports/visual-improvement-approved'
WORK = ROOT / 'assets/source/visual-improvement-approved'
DONORS = ROOT / 'assets/exports/skills/vo-dang-kiem-v02'
CLIENT = ROOT / 'apps/game-client/src'
ROUTES = {
    'm3d_nhan_kiem_hop_nhat_vfx': ('nhan_kiem_hop_nhat', {
        'launch': 'release', 'flight_loop': 'flight', 'hold': 'hold',
        'recall_outro': 'recall',
    }),
    'bat_quai_kiem_tran_vfx': ('bat_quai_kiem_tran', {}),
    'toa_sat_bac_do_vfx': ('toa_sat_bac_do', {
        'received': 'received', 'counter': 'counter', 'ending': 'ending',
    }),
    'that_tinh_kiem_vfx': ('that_tinh_kiem', {}),
    'van_kiem_quy_tong_vfx': ('van_kiem_quy_tong', {}),
    'review_sword': ('van_kiem_quy_tong', {}),
}


def read(path):
    return json.loads(path.read_text(encoding='utf8'))


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf8')


def relative(path):
    return path.relative_to(ROOT).as_posix()


def rect(frame):
    return [frame['frame'][k] for k in ('x', 'y', 'w', 'h')]


def alpha(im, r):
    x, y, w, h = r
    return im.crop((x, y, x+w, y+h)).getchannel('A')


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    catalogues = [
        CLIENT / 'm3d-feedback-art.generated.json',
        CLIENT / 'approved-skill-assets.generated.json',
        ROOT / 'packages/game-data/src/skill-art.json',
    ]
    specs = {a['id']: a for p in catalogues for a in read(p)['assets']}
    plan, entries = [], []
    for key, (skill, phases) in ROUTES.items():
        entry = specs[key]
        sheet = entry['sheet']
        url = '/' + sheet.replace('assets/exports/', 'assets/', 1)
        original = ROOT / ('apps/game-client/public' + url)
        original_json = original.with_suffix('.json')
        atlas = read(original_json)['frames']
        base = Image.open(original).convert('RGBA')
        donor_file = DONORS / (skill + '_vfx.png')
        donor_frames = read(donor_file.with_suffix('.json'))['frames']
        donor = Image.open(donor_file).convert('RGBA')
        edits, used = [], set()
        for clip in entry['animations']:
            m = re.search(r'_(right|down|left|up)$', clip['name'])
            facing = m[1] if m else 'right'
            phase = clip['name'][:m.start()] if m else clip['name']
            source_phase = phases.get(phase) if phases else phase
            if not source_phase:
                continue
            for i, name in enumerate(clip['frames']):
                r = rect(atlas[name])
                if tuple(r) in used or atlas[name].get('rotated'):
                    continue
                mask = alpha(base, r)
                b = mask.getbbox()
                if not b:
                    continue
                frame = donor_frames[f'{source_phase}_{min(3, i*4//len(clip["frames"]))}']
                z = rect(frame)
                db = alpha(donor, z).getbbox()
                if not db:
                    continue
                x, y, w, h = db
                dw, dh = w-x, h-y
                if facing in ['up', 'down']:
                    dw, dh = dh, dw
                tw, th = b[2]-b[0], b[3]-b[1]
                scale = min(tw/dw, th/dh)
                edits.append(dict(
                    rect=r, box=b, inkBox=b, source=relative(donor_file),
                    sourceRect=[z[0]+x, z[1]+y, w-x, h-y], facing=facing,
                    sx=scale, sy=scale, peak=mask.getextrema()[1], alphaFloor=0,
                ))
                used.add(tuple(r))
        if not edits:
            raise ValueError(f'No matching cels for {key}')
        filename = key + '-wudang-v02.png'
        candidate = OUTPUT / filename
        plan.append(dict(
            original=relative(original), base=relative(original), protected=[],
            edits=edits, candidate=relative(candidate),
            source=relative(WORK / (key + '-wudang-v02.aseprite')),
        ))
        entries.append(dict(id=key, url=url, group='vo_dang_kiem', kind='vfx',
                            candidateUrl='/assets/visual-improvement-approved/' + filename, density=1))
    plan_path = WORK / 'wudang-retarget.json'
    write(plan_path, {'assets': plan, 'themes': {}})
    subprocess.run([
        'C:/Program Files/Aseprite/Aseprite.exe', '-b', '--script-param',
        f'root={ROOT.as_posix()}', '--script-param', f'plan={relative(plan_path)}',
        '--script', str(Path(__file__).with_name('vfx-redraw.lua')),
    ], check=True)
    path = CLIENT / 'approved-art.generated.json'
    manifest = read(path)
    by_url = {a['url']: a for a in manifest['assets']}
    for a, job in zip(entries, plan):
        a['sha256'] = hashlib.sha256((ROOT / job['candidate']).read_bytes()).hexdigest()
        by_url[a['url']] = a
    manifest['assets'] = list(by_url.values())
    write(path, manifest)
    print(f'Retargeted {len(entries)} Vo Dang Kiem atlases.')


if __name__ == '__main__':
    main()
