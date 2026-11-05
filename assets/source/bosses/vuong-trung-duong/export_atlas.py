"""Pack isolated ImageGen cels into Phaser hash atlases at gameplay scale."""
from pathlib import Path
import json
from PIL import Image

SOURCE = Path(__file__).resolve().parent
EXPORT = SOURCE.parents[3] / "assets" / "exports" / "vuong-trung-duong"
EXPORT.mkdir(parents=True, exist_ok=True)


def cels(file, columns, rows):
    image = Image.open(SOURCE / file).convert("RGBA")
    w, h = image.size
    if sum(image.getchannel('A').histogram()[:48]) < w * h * 0.26:
        raise ValueError(f'{file}: expected isolated art and transparent gutters')
    # Fine golden note outlines need a stronger matte to suppress generated glow in the gutters.
    cutoff = 160 if file == 'notes-source.png' else 48
    for row in range(rows):
        for col in range(columns):
            cel = image.crop((col * w // columns, row * h // rows,
                              (col + 1) * w // columns, (row + 1) * h // rows))
            alpha = cel.getchannel("A")
            cel.putalpha(alpha.point(lambda value: value if value >= cutoff else 0))
            box = cel.getbbox()
            if box is None:
                raise ValueError(f"{file}: empty cell {col}, {row}")
            yield cel.crop(box)


def write_atlas(key, entries, cell_size):
    w, h = cell_size
    columns = min(len(entries), 8)
    rows = (len(entries) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns * w, rows * h))
    frames = {}
    for i, (name, cel) in enumerate(entries.items()):
        x, y = (i % columns) * w, (i // columns) * h
        atlas.paste(cel, (x, y))
        frames[name] = {"frame": {"x": x, "y": y, "w": w, "h": h}}
    atlas.save(EXPORT / f"{key}.png", optimize=True)
    (EXPORT / f"{key}.json").write_text(
        json.dumps({"frames": frames, "meta": {"image": f"{key}.png", "size": {
            "w": atlas.width, "h": atlas.height}, "scale": "1"}}, indent=2) + "\n",
        encoding="utf-8",
    )


def body(file, rows, columns=4, nominal_height=360):
    for name, cel in zip(rows, cels(file, columns, len(rows) // columns), strict=True):
        # Bottom-most footwear is a more stable horizontal anchor than the
        # center of the silhouette, which changes with the extended jian.
        w, h = cel.size
        feet = cel.crop((0, max(0, h - max(8, h // 16)), w, h)).getbbox()
        assert feet
        cx = (feet[0] + feet[2]) / 2
        scale = min(60 / nominal_height, 104 / w, 88 / h)
        small = cel.resize((round(w * scale), round(h * scale)), Image.Resampling.NEAREST)
        frame = Image.new("RGBA", (128, 112))
        frame.paste(small, (64 - round(cx * scale), 90 - small.height))
        yield name, frame


def effects(file, columns, rows, names):
    for name, cel in zip(names, cels(file, columns, rows), strict=True):
        cel.thumbnail((148, 148), Image.Resampling.NEAREST)
        frame = Image.new("RGBA", (160, 160))
        frame.paste(cel, ((160 - cel.width) // 2, (160 - cel.height) // 2))
        yield name, frame


poses = ["idle", "windup", "release", "recover"]
body_entries = dict(body("side-attack-source.png", [
    f"p{phase}_right_{pose}" for phase in (1, 2) for pose in poses
]))
for phase in (1, 2):
    body_entries.update(body(f'p{phase}-vertical-source.png', [
        f'p{phase}_{facing}_{pose}' for facing in ('down', 'up') for pose in poses
    ]))
    body_entries.update(body(f'p{phase}-walk-source.png', [
        f'p{phase}_{facing}_walk_{step}' for facing in ('right', 'down', 'up') for step in (0, 1)
    ] + [f'p{phase}_right_hurt', 'p1_right_raise' if phase == 1 else 'p2_right_defeat'], nominal_height=380))
body_entries.update(body('vertical-release-source.png', [
    f'p{phase}_{facing}_release' for phase in (1, 2) for facing in ('down', 'up')
], columns=2, nominal_height=550))
body_entries.update(body('transition-source.png', [
    f'{clip}_{step}' for clip in ('transition', 'defeat') for step in range(4)
]))
write_atlas("body", body_entries, (128, 112))

fx_entries = {}
for name, columns, rows, labels in (
    ("blades-source.png", 2, 2, ["thrust1", "slash1", "thrust2", "slash2"]),
    ("storm-source.png", 4, 2, ["shield", "crack1", "crack2", "lightning", "warning1", "yin", "shatter", "line1"]),
    ("elements-source.png", 5, 2, [f"{prefix}{i}" for prefix in ("element", "impact") for i in range(5)]),
    ("formations-source.png", 4, 2, ["star", "eye", "line2", "pulse", "sword", "finger", "rain", "warning2"]),
    ("notes-source.png", 3, 2, [f"note{i}" for i in range(6)]),
):
    fx_entries.update(effects(name, columns, rows, labels))
write_atlas("effects", fx_entries, (160, 160))
(EXPORT / 'animation.json').write_text(json.dumps({
    'status': 'runtime candidate',
    'body': {'canvas': [128, 112], 'feet': [64, 90], 'walkFps': 5,
             'left': 'right frames mirrored', 'recoveryMs': 190,
             'transitionMs': 1100, 'defeatMs': 900,
             'attack': 'server windup and release tick', 'frames': list(body_entries)},
    'effects': {'canvas': [160, 160], 'origin': [80, 80],
                'timing': 'server warning, release and expiry ticks', 'frames': list(fx_entries)},
}, indent=2) + '\n', encoding='utf-8')
print(f"Vuong Trung Duong atlas: {len(body_entries)} body cels, {len(fx_entries)} FX cels")
