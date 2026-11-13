"""Assemble the two Côn Luân art-review atlases from keyed original cels."""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE.with_name("con_luan_thien_su_v01")))
import prepare as base

EXPORT = base.ROOT / "assets/exports/characters/con_luan_skill_preview"
CACHE = base.ROOT / ".cache/con-luan-skill-preview"
DIRECTIONS = ("down", "left", "right", "up")
BODY, FEET = (224, 176), (112, 132)
FX, CENTER = (384, 320), (192, 160)


def cells(name, rows, border=3):
    with Image.open(SOURCE / "generated" / f"{name}.png") as sheet:
        pixels = np.asarray(sheet.convert("RGB"))
    height, width = pixels.shape[:2]
    for row in range(rows):
        top, bottom = round(row * height / rows), round((row + 1) * height / rows)
        for col in range(4):
            left, right = round(col * width / 4), round((col + 1) * width / 4)
            rgb = pixels[top+border:bottom-border, left+border:right-border]
            r, g, b = rgb.astype(np.int16).transpose(2, 0, 1)
            mask = ~((g > 80) & (g - np.maximum(r, b) > 24))
            if not mask.any() or any(edge.any() for edge in (mask[0], mask[-1], mask[:, 0], mask[:, -1])):
                raise ValueError(f"{name} {row},{col}: blank or cropped")
            rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
            rgba[mask, :3] = rgb[mask]
            rgba[mask, 3] = 255
            yield Image.fromarray(rgba)


def place(cel, target, size, origin, anchor="center", scale=None):
    left, top, right, bottom = cel.getbbox()
    ax = (left + right) / 2
    ay = bottom if anchor == "feet" else (top + bottom) / 2
    if anchor == "feet":
        mask = np.asarray(cel.getchannel("A")) > 0
        # Plant the sprite on the boots rather than on hair or a raised hand.
        ys, xs = np.where(mask[max(top, bottom-24):bottom])
        ax = float(np.median(xs))
    crop = cel.crop((left, top, right, bottom))
    if scale is None:
        scale = target / max(crop.size)
    dimensions = [round(n * scale) for n in crop.size]
    cropped = crop.resize(dimensions, Image.Resampling.LANCZOS)
    pixels = np.array(cropped)
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 135, 255, 0)
    pixels[pixels[:, :, 3] == 0] = 0
    x = origin[0] - round((ax - left) * scale)
    y = origin[1] - round((ay - top) * scale)
    if x < 1 or y < 1 or x + dimensions[0] >= size[0] or y + dimensions[1] >= size[1]:
        raise ValueError(f"Registered frame cropped: {size}, {x}, {y}, {dimensions}")
    output = Image.new("RGBA", size)
    output.paste(Image.fromarray(pixels), (x, y))
    return output


def body_clips():
    body = list(cells("body", 4))
    revised = list(cells("steps", 4))
    for row, direction in enumerate(("down", "right", "left", "up")):
        poses = [body[row*4], body[row*4+1], revised[row*4+2], body[row*4+3]]
        left, top, right, bottom = poses[0].getbbox()
        scale = 88 / (bottom - top)
        idle, first, second, cast = [place(pose, 88, BODY, FEET, "feet", scale) for pose in poses]
        yield f"idle_{direction}", [idle], [380]
        yield f"walk_{direction}", [first, idle, second, idle], [115, 95, 115, 95]
        yield f"cast_{direction}", [cast], [220]


def monk_clips():
    throwing = list(cells("throw", 2))
    chaos = list(cells("chaos", 1))
    for col, direction in enumerate(DIRECTIONS):
        # The source put the east pose in both profile cells.
        released = throwing[2].transpose(Image.Transpose.FLIP_LEFT_RIGHT) if col == 1 else throwing[col]
        form = chaos[2].transpose(Image.Transpose.FLIP_LEFT_RIGHT) if col == 1 else chaos[col]
        for tag, cel, height in (("throw", released, 88), ("chaos", form, 118)):
            top, bottom = cel.getbbox()[1::2]
            yield f"{tag}_{direction}", [place(cel, height, BODY, FEET, "feet", height / (bottom-top))], [240]


def effects():
    sword = list(cells("sword_fx", 3))
    hammer = list(cells("hammer_fx", 2, border=8))
    thrown = list(cells("throw", 2))[4:]
    spec = (
        ("jian", 53, "feet"), ("anchor", 68, "feet"),
        ("orb", 41, "center"), ("blade", 93, "center"),
        ("field", 205, "center"), ("violet_impact", 70, "feet"),
        ("violet_bolt", 135, "feet"), None,
        ("dash", 108, "center"), ("violet_ring", 145, "center"),
        ("edge", 170, "center"), ("violet_stagger", 28, "center"),
    )
    for cel, definition in zip(sword, spec, strict=True):
        if definition is None:
            with Image.open(SOURCE / "generated" / "dragon-head-v02.png") as dragon:
                dragon = dragon.convert("RGBA")
                dragon.putalpha(dragon.getchannel("A").point(lambda a: 0 if a < 135 else a))
                yield "dragon_head", [place(dragon, 128, FX, CENTER)], [130]
            continue
        key, size, anchor = definition
        yield key, [place(cel, size, FX, CENTER, anchor)], [130]
    for col, direction in enumerate(DIRECTIONS):
        yield "hammer_" + direction, [place(thrown[col], 75, FX, CENTER)], [130]
    for index, key, size in ((4,"gold_ring",205),(5,"gold_ring_fade",205),
                             (6,"chaos_aura",144),(7,"gold_stagger",25),(3,"gold_ember",29)):
        yield key, [place(hammer[index], size, FX, CENTER)], [130]
    burst = [place(hammer[i], size, FX, CENTER, anchor) for i, size, anchor in
             ((0,86,"feet"), (1,162,"center"), (2,175,"center"), (3,105,"center"))]
    yield "gold_burst", burst, [65, 95, 95, 95]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    args = parser.parse_args()
    base.SOURCE = SOURCE
    definitions = (
        ("kiem_ton", BODY, FEET, body_clips()),
        ("thien_su_extra", BODY, FEET, monk_clips()),
        ("con_luan_spell_fx", FX, CENTER, effects()),
    )
    reports = {}
    for key, size, origin, clips in definitions:
        stage = CACHE / key
        layout = base.emit(stage, key, size, origin, clips)
        reports[key] = base.export(args.aseprite, stage, layout, EXPORT)
    (EXPORT / "validation.json").write_text(json.dumps(reports, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
