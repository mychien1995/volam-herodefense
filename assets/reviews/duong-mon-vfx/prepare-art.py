"""Extract and register the original keyed concept poses used in the HTML review."""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
SIZE = 120
PIVOT = (60, 100)
FACINGS = ("down", "left", "right", "up")
WALK = [f"{pose}-{facing}" for pose in ("idle", "step-a", "step-b") for facing in FACINGS]
SHEETS = {
    "tuan-sa-walk": (3, WALK, [(52, .56), (52, .39), (52, .65), (52, .48)] * 3),
    "da-hanh-walk": (3, WALK, [(52, .58), (52, .35), (52, .67), (52, .48)] * 3),
    "tuan-sa-action": (2, ["ready", "release", "hover", "flight", "fold", "shell", "coil", "spin"],
                      [(47, .57), (53, .43), (53, .53), (45, .62), (54, .53), (53, .53), (47, .53), (50, .60)]),
    "da-hanh-action": (2, ["ready", "release", "alternate", "recover", "trap", "dash", "spin", "lunge"],
                      [(43, .54), (48, .47), (48, .48), (49, .52), (43, .54), (42, .54), (50, .51), (47, .52)]),
    "tuan-sa-vertical": (2, [f"{pose}-{direction}" for direction in ("down", "up") for pose in ("release", "hover", "shell", "spin")],
                        [(51, .5), (51, .5), (51, .5), (47, .5)] * 2),
    "da-hanh-vertical": (2, [f"{pose}-{direction}" for direction in ("down", "up") for pose in ("ready", "release", "dash", "spin")],
                        [(44, .5), (49, .5), (44, .5), (48, .5)] * 2),
    "vfx": (3, ["arrow", "feather", "water", "wood", "metal", "earth", "fire", "knife", "flower", "ice", "trap", "burst"],
            [(30, .5), (27, .5), (23, .5), (21, .5), (21, .5), (21, .5), (21, .5), (22, .5),
             (25, .5), (28, .5), (29, .5), (32, .5)]),
}


def remove_key(source):
    rgba = np.array(source.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    red, green, blue = np.moveaxis(rgb, 2, 0)
    keyed = (red > 105) & (blue > 105) & (green < 95) & (np.minimum(red, blue) - green > 72) & (abs(red - blue) < 145)
    rgba[keyed] = 0
    return rgba


def centers(rgba, rows, include_small):
    height, width = rgba.shape[:2]
    mask = rgba[:, :, 3] != 0
    labels, count = ndimage.label(mask)
    size = np.bincount(labels.ravel())
    boxes = ndimage.find_objects(labels)
    objects = []
    for label, box in enumerate(boxes, start=1):
        if size[label] < (18 if include_small else 65):
            continue
        y, x = box
        middle = (x.start + x.stop) / 2, (y.start + y.stop) / 2
        objects.append((label, middle, box))
    if not include_small:
        assert len(objects) >= rows * 4, (count, len(objects))
        main = sorted(objects, key=lambda item: size[item[0]], reverse=True)[:rows * 4]
        main.sort(key=lambda item: item[1][1])
        return [item for row in range(rows) for item in sorted(main[row*4:row*4+4], key=lambda item: item[1][0])], labels
    groups = [[] for _ in range(rows * 4)]
    for label, (x, y), box in objects:
        groups[int(y * rows / height) * 4 + int(x * 4 / width)].append((label, box))
    return groups, labels


def cut(rgba, group, labels):
    if isinstance(group, tuple):
        label, _, (y, x) = group
        pixels = rgba[y, x].copy()
        pixels[labels[y, x] != label] = 0
    else:
        assert group, "empty effect"
        y0 = min(box[0].start for _, box in group)
        y1 = max(box[0].stop for _, box in group)
        x0 = min(box[1].start for _, box in group)
        x1 = max(box[1].stop for _, box in group)
        pixels = rgba[y0:y1, x0:x1].copy()
        pixels[~np.isin(labels[y0:y1, x0:x1], [label for label, _ in group])] = 0
    return Image.fromarray(pixels)


def register(image, target, anchor, is_vfx):
    factor = target / (image.width if is_vfx else image.height)
    image = image.resize((round(image.width * factor), round(image.height * factor)), Image.Resampling.LANCZOS)
    pixels = np.array(image)
    pixels[pixels[:, :, 3] < 120] = 0
    pixels[pixels[:, :, 3] >= 120, 3] = 255
    image = Image.fromarray(pixels)
    x = PIVOT[0] - round(image.width * anchor)
    y = SIZE // 2 - image.height // 2 if is_vfx else PIVOT[1] - image.height
    assert x >= 0 and y >= 0 and x + image.width <= SIZE and y + image.height <= SIZE
    result = Image.new("RGBA", (SIZE, SIZE))
    result.paste(image, (x, y))
    assert result.getbbox(), "empty cel"
    return result


def main():
    metadata = {"cell": SIZE, "pivot": PIVOT, "sheets": {}}
    for name, (rows, names, targets) in SHEETS.items():
        source = SOURCE / f"{name}.png"
        with Image.open(source) as image:
            rgba = remove_key(image)
        is_vfx = name == "vfx"
        groups, labels = centers(rgba, rows, is_vfx)
        atlas = Image.new("RGBA", (4 * SIZE, rows * SIZE))
        for i, (group, (target, anchor)) in enumerate(zip(groups, targets, strict=True)):
            cel = register(cut(rgba, group, labels), target, anchor, is_vfx)
            atlas.paste(cel, (i % 4 * SIZE, i // 4 * SIZE))
        atlas.save(ROOT / f"{name}.png", optimize=True)
        metadata["sheets"][name] = {
            "frames": names, "size": atlas.size, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest()
        }
        print(name, len(names), atlas.size)
    (ROOT / "frames.js").write_text("const FRAMES = " + json.dumps(metadata, indent=2) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
