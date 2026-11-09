"""Pack the selected ImageGen artwork into the Phaser review atlas."""

import hashlib
import json
from pathlib import Path
import sys

from PIL import Image, ImageOps

SOURCE = Path(__file__).resolve().parent
REPO = SOURCE.parents[4]
DEST = REPO / "assets/exports/shaolin-dao-preview-v01"
FORGE = Path.home() / ".codex/skills/generate2dsprite/scripts"
sys.path.insert(0, str(FORGE))
from forge_matte import despill, key_still, matte_qa  # noqa: E402

FACINGS = ("down", "up", "left", "right")
POSES = ("idle", "walk_1", "walk_2", "strike")
BODY_ANCHORS = (
    ((145, 300), (484, 299), None, (1069, 302)),
    ((145, 608), (480, 607), None, (1079, 606)),
    ((144, 907), (479, 909), None, (1076, 906)),
    ((121, 1203), (499, 1203), None, (1044, 1203)),
)
ULTIMATE_ANCHORS = ((293, 623), (788, 623), (1377, 623), (1872, 623))
PIVOT = (84, 116)
BODY_SIZE = (168, 144)


def key_source(name, cols, rows):
    path = SOURCE / f"{name}.png"
    with Image.open(path) as raw:
        image, matte = key_still(raw.convert("RGBA"), quality="soft", key="#ff00ff")
    if name == "effects":
        pixels, _ = despill(image, mode="all", key="#ff00ff")
        image = Image.fromarray(pixels)
        matte["qa"] = matte_qa(image, "#ff00ff")
        assert matte["qa"]["outer_ring_spill_fraction"] <= 0.01
    cells = []
    for row in range(rows):
        for col in range(cols):
            bounds = (
                round(image.width * col / cols),
                round(image.height * row / rows),
                round(image.width * (col + 1) / cols),
                round(image.height * (row + 1) / rows),
            )
            cell = image.crop(bounds)
            alpha = cell.getchannel("A")
            visible = alpha.point(lambda a: 255 if a >= 20 else 0).getbbox()
            assert visible is not None, (name, col, row)
            assert visible[0] > 0 and visible[1] > 0, (name, col, row, visible)
            assert visible[2] < cell.width and visible[3] < cell.height, (name, col, row, visible)
            cells.append((cell.crop(visible), bounds[0] + visible[0], bounds[1] + visible[1]))
    provenance = {
        "file": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "size": list(image.size),
        "matte": matte["qa"],
    }
    return cells, provenance


def resample(image, width, height):
    return image.resize((width, height), Image.Resampling.LANCZOS)


def actor(cell, feet, scale):
    image, left, top = cell
    part = resample(image, round(image.width * scale), round(image.height * scale))
    x = PIVOT[0] + round((left - feet[0]) * scale)
    y = PIVOT[1] + round((top - feet[1]) * scale)
    assert x >= 2 and y >= 2 and x + part.width <= BODY_SIZE[0] - 2
    assert y + part.height <= BODY_SIZE[1] - 2
    frame = Image.new("RGBA", BODY_SIZE)
    frame.paste(part, (x, y))
    return frame


def main():
    body, body_source = key_source("body", 4, 4)
    ultimate, ultimate_source = key_source("ultimate", 4, 1)
    effects, effects_source = key_source("effects", 2, 2)
    frames = {}
    for row, pose in enumerate(POSES):
        for col, facing in enumerate(FACINGS):
            feet = BODY_ANCHORS[row][col]
            if feet is None:
                right = actor(body[row * 4 + 3], BODY_ANCHORS[row][3], 0.37)
                frame = ImageOps.mirror(right)
            else:
                frame = actor(body[row * 4 + col], feet, 0.37)
            frames[f"{pose}_{facing}"] = frame
    for col, facing in enumerate(FACINGS):
        frames[f"lotus_{facing}"] = actor(ultimate[col], ULTIMATE_ANCHORS[col], 0.195)
    for name, width, (image, _, _) in zip(
        ("crescent", "arhat", "sweep", "lotus_ring"), (100, 183, 174, 130), effects
    ):
        frames[name] = resample(image, width, round(width * image.height / image.width))

    atlas = Image.new("RGBA", (800, 960))
    records = {}
    for index, (name, image) in enumerate(frames.items()):
        x, y = (index % 4) * 200 + 2, (index // 4) * 160 + 2
        w, h = image.size
        assert w <= 196 and h <= 156
        assert image.getchannel("A").getextrema() == (0, 255)
        atlas.paste(image, (x, y))
        records[name] = {"frame": {"x": x, "y": y, "w": w, "h": h}}

    DEST.mkdir(parents=True, exist_ok=True)
    atlas.save(DEST / "review.png")
    (DEST / "review.json").write_text(
        json.dumps(
            {
                "frames": records,
                "meta": {
                    "image": "review.png",
                    "size": {"w": atlas.width, "h": atlas.height},
                    "actorPivot": {"x": PIVOT[0] / BODY_SIZE[0], "y": PIVOT[1] / BODY_SIZE[1]},
                    "walkFrameMs": 120,
                    "source": [body_source, ultimate_source, effects_source],
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf8",
    )
    print(f"{len(frames)} transparent frames, atlas {atlas.width}x{atlas.height}")


if __name__ == "__main__":
    main()
