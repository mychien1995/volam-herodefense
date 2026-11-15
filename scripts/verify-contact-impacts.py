"""Register the generated contact phases on the director-approved 64px pivots."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/skills/contact-impacts-v01'
EXPORT = ROOT / 'assets/exports/contact-impacts-v01'
FRAME = 64
COLS = 12
PHASES = ('peak', 'break', 'embers')
DESIGN = json.loads((SOURCE / 'design.json').read_text(encoding='utf-8'))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell(sheet: Image.Image, spec: dict, index: int, phase: str) -> Image.Image:
    cols, rows = spec['cols'], spec['rows']
    pitch_x, pitch_y = sheet.width / cols, sheet.height / rows
    col, row = index % cols, index // cols
    # The reference positions a 192px zoomed cel within a 224px cell.
    center_x, center_y = (col + 0.5) * pitch_x, (row + 0.5) * pitch_y
    rx, ry = pitch_x * 96 / 224, pitch_y * 96 / 224
    rect = tuple(round(v) for v in (center_x - rx, center_y - ry, center_x + rx, center_y + ry))
    raw = np.array(sheet.crop(rect))
    alpha = raw[:, :, 3]
    alpha[alpha < (22 if phase == 'embers' else 15)] = 0
    sprite = Image.fromarray(raw).resize((FRAME, FRAME), Image.Resampling.LANCZOS)
    pixels = np.array(sprite)
    matte = pixels[:, :, 3]
    matte[matte < 8] = 0
    if phase == 'embers':
        # Recover tiny downsampled particles while preserving the original RGB.
        matte[:] = np.minimum(matte.astype(np.uint16) * 2, 210).astype(np.uint8)
    pixels[matte == 0] = 0
    return Image.fromarray(pixels)


def measure(frame: Image.Image, label: str) -> dict:
    assert frame.size == (FRAME, FRAME) and frame.mode == 'RGBA', label
    assert (bounds := frame.getbbox()), f'{label} is empty'
    left, top, right, bottom = bounds
    assert min(left, top, FRAME - right, FRAME - bottom) >= 4, (
        label, 'alpha too close to frame edge', bounds,
    )
    matte = np.array(frame.getchannel('A'))
    assert (matte >= 24).sum() >= 3, (label, 'missing readable alpha')
    return {
        'alphaBounds': list(bounds),
        'opacitySum': int(matte.sum()),
        'rgbaSha256': hashlib.sha256(frame.tobytes()).hexdigest(),
    }


def build(check: bool) -> None:
    schools = DESIGN['schools']
    sources = {}
    sheets = {}
    for key in schools:
        sheets[key] = {}
        for phase in PHASES:
            name = f'{key}-{phase if phase != "peak" else "peaks"}'
            path = SOURCE / 'sheets' / f'{name}.png'
            sheets[key][phase] = Image.open(path).convert('RGBA')
            entry = {'file': path.relative_to(ROOT).as_posix(), 'sha256': digest(path)}
            if phase != 'peak':
                prompt = path.with_name(f'{name}-prompt.txt')
                entry['prompt'] = prompt.relative_to(ROOT).as_posix()
                entry['promptSha256'] = hashlib.sha256(
                    prompt.read_text(encoding='utf-8').encode('utf-8'),
                ).hexdigest()
            sources[name] = entry

    art = DESIGN['art']
    assert len(art) == 35
    entries = len(art) * len(PHASES)
    atlas = Image.new('RGBA', (COLS * FRAME, ((entries + COLS - 1) // COLS) * FRAME))
    frames = {}
    clips = {}
    identities = set()
    for i, (name, spec) in enumerate(art.items()):
        peak_path = SOURCE / 'peaks' / f'{name}.png'
        peak = Image.open(peak_path).convert('RGBA')
        approved = ROOT / 'assets/reviews/contact-impact-v01/cels' / f'{name}.png'
        if approved.is_file():
            assert digest(approved) == digest(peak_path), f'{name}: approved peak was edited'
        profile = {}
        for j, phase in enumerate(PHASES):
            label = f'{name}-{phase}'
            frame = peak if phase == 'peak' else cell(
                sheets[spec['school']][phase], schools[spec['school']], spec['index'], phase,
            )
            profile[phase] = stats = measure(frame, label)
            assert stats['rgbaSha256'] not in identities, f'{label} repeats another frame'
            identities.add(stats['rgbaSha256'])
            index = i * len(PHASES) + j
            x, y = index % COLS * FRAME, index // COLS * FRAME
            atlas.paste(frame, (x, y))
            frames[label] = {
                'frame': {'x': x, 'y': y, 'w': FRAME, 'h': FRAME},
                'rotated': False,
                'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': FRAME, 'h': FRAME},
                'sourceSize': {'w': FRAME, 'h': FRAME},
            }
        assert 0 < profile['embers']['opacitySum'] < profile['break']['opacitySum'], name
        clips[name] = {
            'school': spec['school'],
            'title': spec['title'],
            'approvedPeak': peak_path.relative_to(ROOT).as_posix(),
            'approvedPeakSha256': digest(peak_path),
            'frames': profile,
        }
    metadata = {
        'frames': frames,
        'meta': {'image': 'atlas.png', 'format': 'RGBA8888', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1'},
    }
    manifest = {
        'revision': 'contact-impacts-v01',
        'provenance': 'Original project VFX. OpenAI ImageGen host_image, using director-approved Preview V01 peaks as edit references. No third-party packs.',
        'approval': 'Preview V01 peak cels approved by the user; break and ember animation rendered for review.',
        'pivot': [32, 32],
        'frameMs': {'peak': 34, 'break': 34, 'embers': 38},
        'sources': sources,
        'clips': clips,
    }
    if check:
        assert Image.open(EXPORT / 'atlas.png').convert('RGBA').tobytes() == atlas.tobytes(), 'Atlas pixels differ from source'
        for file, expected in (('atlas.json', metadata), ('manifest.json', manifest)):
            assert json.loads((EXPORT / file).read_text(encoding='utf-8')) == expected, file
    else:
        EXPORT.mkdir(parents=True, exist_ok=True)
        atlas.save(EXPORT / 'atlas.png', optimize=True)
        for file, data in (('atlas.json', metadata), ('manifest.json', manifest)):
            (EXPORT / file).write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8',
            )
    print(f'Contact Impact V01: {len(clips)} clips, {len(frames)} unique cels, pivots 32×32, {atlas.width}×{atlas.height} atlas')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', action='store_true')
    build(not parser.parse_args().export)
