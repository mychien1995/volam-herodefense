"""Register the versioned Thiền Sư Chaos, W and E cels."""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE.with_name("con_luan_thien_su_v01")))
import prepare as base

EXPORT = base.ROOT / "assets/exports/characters/con_luan_skill_renovation"
CACHE = base.ROOT / ".cache/con-luan-skill-renovation"
DIRECTIONS = ("down", "left", "right", "up")
BODY, FEET = (224, 176), (112, 132)
FX, CENTER = (640, 400), (320, 200)
RING_WIDTH, RING_HEIGHT = (600, 332)


def keyed_grid(name, rows, cols):
    with Image.open(SOURCE / "generated" / (name + ".png")) as image:
        pixels = np.asarray(image.convert("RGB"))
    height, width = pixels.shape[:2]
    for row in range(rows):
        for col in range(cols):
            rgb = pixels[round(row*height/rows):round((row+1)*height/rows),
                         round(col*width/cols):round((col+1)*width/cols)]
            r, g, b = rgb.astype(np.int16).transpose(2, 0, 1)
            # Retain coverage around amber/white edges while removing the green matte.
            alpha = np.clip(255 - 2.5 * np.maximum(0, g - np.maximum(r, b) - 12), 0, 255)
            alpha[alpha < 24] = 0
            rgba = np.dstack((rgb[:, :, 0], np.minimum(g, np.maximum(r, b) + 18), rgb[:, :, 2], alpha)).astype(np.uint8)
            rgba[alpha == 0] = 0
            cel = Image.fromarray(rgba)
            bbox = cel.getbbox()
            if not bbox or bbox[0] < 2 or bbox[1] < 2 or bbox[2] > cel.width-2 or bbox[3] > cel.height-2:
                raise ValueError(f"{name} cell {row},{col} has no gutter: {bbox}")
            yield cel.crop(bbox)


def place(cel, size, anchor, origin, canvas):
    out = Image.new("RGBA", canvas)
    x = round(origin[0] - anchor[0] * size[0] / cel.width)
    y = round(origin[1] - anchor[1] * size[1] / cel.height)
    if min(x, y) < 1 or x + size[0] >= canvas[0] or y + size[1] >= canvas[1]:
        raise ValueError(f"Cel exceeds {canvas}: {x}, {y}, {size}")
    out.paste(cel.resize(size, Image.Resampling.LANCZOS), (x, y))
    return out


def register_body(cel, x_fraction, height):
    # The torso stays on the same x across strides; feet, not the hammer, define y.
    return place(cel, (round(cel.width * height / cel.height), height),
                 (cel.width * x_fraction, cel.height), FEET, BODY)


def body_clips():
    source = list(keyed_grid("chaos", 3, 4))
    alternate = list(keyed_grid("opposite", 1, 3))
    flip = Image.Transpose.FLIP_LEFT_RIGHT
    # Front and both profiles use one replacement stride. The generated left
    # column faces east, so keep a consistent mirror of the east pass.
    poses = {
        "down": ((source[0], .53, 118), (source[4], .55, 118), (alternate[0], .64, 122)),
        "right": ((source[2], .45, 118), (source[6], .52, 118), (alternate[1], .52, 116)),
        "up": ((source[3], .44, 118), (source[7], .47, 118), (source[11], .47, 118)),
    }
    poses["left"] = tuple((im.transpose(flip), 1-x, h) for im, x, h in poses["right"])
    for direction in DIRECTIONS:
        idle, stride_a, stride_b = [register_body(*spec) for spec in poses[direction]]
        yield f"chaos_{direction}", [idle], [260]
        yield f"chaos_walk_{direction}", [stride_a, idle, stride_b, idle], [105, 80, 105, 80]


def fx_clips():
    frames = list(keyed_grid("lightning", 2, 4))
    slam = []
    for cel, width, y in zip(frames[:4], (140, 260, 280, 295), (.91, .80, .55, .5), strict=True):
        size = width, round(cel.height * width / cel.width)
        slam.append(place(cel, size, (cel.width / 2, cel.height * y), CENTER, FX))
    ring = [place(cel, (RING_WIDTH, RING_HEIGHT), (cel.width / 2, cel.height / 2), CENTER, FX) for cel in frames[4:]]
    yield "hammer_contact", slam, [55, 100, 110, 115]
    yield "lightning_ring", ring, [150, 150, 165, 170]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    args = parser.parse_args()
    base.SOURCE = SOURCE
    reports = {}
    for key, size, origin, clips in (
        ("thien_su_chaos_walk", BODY, FEET, body_clips()),
        ("thien_su_lightning", FX, CENTER, fx_clips()),
    ):
        stage = CACHE / key
        layout = base.emit(stage, key, size, origin, clips)
        reports[key] = base.export(args.aseprite, stage, layout, EXPORT, allow_soft_alpha=True)
    (EXPORT / "validation.json").write_text(json.dumps(reports, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
