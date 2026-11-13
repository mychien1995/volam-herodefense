"""Export native-density preview assets from authored source sheets."""
from pathlib import Path
import hashlib
import json
import runpy

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
LEGACY = runpy.run_path(str(ROOT.parent / "duong-mon-vfx/prepare-art.py"))
DENSITY = 2
CELL = LEGACY["SIZE"] * DENSITY
PIVOT = tuple(point * DENSITY for point in LEGACY["PIVOT"])
PROPS = {"wall": 246, "pillar": 82, "tree": 184, "rocks": 102, "bush": 66, "dummy": 65}


def matte(source):
    """Remove chroma and retain partial coverage on the outline after reduction."""
    rgb = np.asarray(source.convert("RGB"), dtype=np.float32)
    red, green, blue = np.moveaxis(rgb, 2, 0)
    excess = np.minimum(red, blue) - green
    magenta = (red > 94) & (blue > 94) & (red > green + 18) & (blue > green + 18) & (abs(red - blue) < 116)
    alpha = np.where(magenta, 1 - np.clip((excess - 34) / 113, 0, 1), 1)
    alpha[alpha < 0.035] = 0
    edges = magenta & (alpha < 1) & (alpha > 0)
    rgb[edges, 0] = np.minimum(red[edges], green[edges] + 22)
    rgb[edges, 2] = np.minimum(blue[edges], green[edges] + 46)
    pixels = np.dstack((rgb, alpha * 255)).astype(np.uint8)
    pixels[pixels[:, :, 3] == 0] = 0
    return pixels


def resize(image, factor):
    size = tuple(max(1, round(axis * factor)) for axis in image.size)
    rgba = np.array(image.resize(size, Image.Resampling.LANCZOS))
    rgba[rgba[:, :, 3] < 5] = 0
    return Image.fromarray(rgba)


def regions(rgba, rows, cols, divisions=None):
    mask = rgba[:, :, 3] >= 96
    height, width = mask.shape
    if divisions is None:
        divisions = [round(col * width / cols) for col in range(cols + 1)]
    result = []
    for row in range(rows):
        for col in range(cols):
            y0, y1 = round(row * height / rows), round((row + 1) * height / rows)
            x0, x1 = divisions[col:col + 2]
            pixels = rgba[y0:y1, x0:x1].copy()
            main, n = ndimage.label(mask[y0:y1, x0:x1], structure=np.ones((3, 3)))
            assert n, (row, col)
            counts = np.bincount(main.ravel())
            keep = np.flatnonzero(counts >= 22)
            keep = keep[keep != 0]
            silhouette = ndimage.binary_dilation(np.isin(main, keep), iterations=3)
            pixels[~silhouette] = 0
            cel = Image.fromarray(pixels)
            bounds = cel.getbbox()
            assert bounds, (row, col)
            assert bounds[0] > 0 and bounds[1] > 0 and bounds[2] < cel.width and bounds[3] < cel.height, (row, col, bounds)
            result.append(cel.crop(bounds))
    return result


def open_matte(path):
    with Image.open(path) as image:
        return matte(image)


def largest_objects(rgba, rows):
    """Group full character silhouettes by their measured centers, not cell seams."""
    core = rgba[:, :, 3] >= 128
    labels, count = ndimage.label(core, structure=np.ones((3, 3)))
    counts = np.bincount(labels.ravel(), minlength=count + 1)
    counts[0] = 0
    ordered = np.argsort(counts)[-rows * 4:]
    bounds = ndimage.find_objects(labels)
    assert np.min(counts[ordered]) > 1000
    by_y = sorted(ordered, key=lambda k: bounds[k - 1][0].start + bounds[k - 1][0].stop)
    result = []
    for row in range(rows):
        group = sorted(by_y[row * 4:row * 4 + 4], key=lambda k: bounds[k - 1][1].start + bounds[k - 1][1].stop)
        for k in group:
            y, x = bounds[k - 1]
            assert x.start > 3 and y.start > 3 and x.stop < core.shape[1] - 3 and y.stop < core.shape[0] - 3
            ys, xs = slice(y.start - 3, y.stop + 3), slice(x.start - 3, x.stop + 3)
            crop = rgba[ys, xs].copy()
            edge = ndimage.binary_dilation(labels[ys, xs] == k, iterations=3)
            crop[~edge] = 0
            cel = Image.fromarray(crop)
            result.append(cel.crop(cel.getbbox()))
    return result


def register(image, desired, anchor, effect):
    factor = desired * DENSITY / (image.width if effect else image.height)
    cel = resize(image, factor)
    x = PIVOT[0] - round(cel.width * anchor)
    y = (CELL - cel.height) // 2 if effect else PIVOT[1] - cel.height
    assert x >= 4 and y >= 4 and x + cel.width <= CELL - 4 and y + cel.height <= CELL - 4
    canvas = Image.new("RGBA", (CELL, CELL))
    canvas.paste(cel, (x, y))
    return canvas


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    output = ROOT / "art"
    output.mkdir(exist_ok=True)
    metadata = {"cell": CELL, "density": DENSITY, "pivot": PIVOT, "sheets": {}, "props": list(PROPS)}
    provenance = {}
    for name, (rows, names, sizing) in LEGACY["SHEETS"].items():
        path = SOURCE / f"{name}.png"
        rgba = open_matte(path)
        effect = name == "vfx"
        cels = regions(rgba, rows, 4) if effect else largest_objects(rgba, rows)
        if name.endswith("-walk"):
            idle_id = "tuan-idle" if name.startswith("tuan") else "da-idle"
            idle_path = SOURCE / f"{idle_id}.png"
            idle = Image.fromarray(open_matte(idle_path))
            cels[0] = idle.crop(idle.getbbox())
            provenance[idle_path.name] = digest(idle_path)
        atlas = Image.new("RGBA", (4 * CELL, rows * CELL))
        frames = {}
        for i, (cel, (target, anchor)) in enumerate(zip(cels, sizing, strict=True)):
            if name.endswith("-walk") and i == 0:
                anchor = .5 if name.startswith("tuan") else .55
            registered = register(cel, target, anchor, effect)
            x, y = i % 4 * CELL, i // 4 * CELL
            atlas.paste(registered, (x, y))
            duration = 100 if names[i].startswith("step") or effect else 160
            frames[names[i]] = {"frame": {"x": x, "y": y, "w": CELL, "h": CELL}, "rotated": False,
                                "trimmed": False, "sourceSize": {"w": CELL, "h": CELL},
                                "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL}, "duration": duration}
        atlas.save(output / f"{name}.png", optimize=True)
        write_json(output / f"{name}.json", {"frames": frames, "meta": {
            "image": f"{name}.png", "size": {"w": atlas.width, "h": atlas.height},
            "pivotPixels": [CELL // 2, CELL // 2] if effect else PIVOT, "scale": "1"}})
        metadata["sheets"][name] = {"frames": names, "size": atlas.size}
        provenance[path.name] = digest(path)
        print(f"{name}: {len(frames)} cels, {atlas.width}x{atlas.height}")
    prop_path = SOURCE / "props.png"
    for (name, target), prop in zip(PROPS.items(), regions(open_matte(prop_path), 2, 3, [0, 551, 985, 1536]), strict=True):
        resize(prop, target / prop.width).save(output / f"{name}.png")
    provenance[prop_path.name] = digest(prop_path)
    arena = SOURCE / "arena.png"
    with Image.open(arena) as image:
        image.convert("RGB").save(output / "arena.png", optimize=True)
    provenance[arena.name] = digest(arena)
    (ROOT / "frames.js").write_text("const FRAMES = " + json.dumps(metadata, indent=2) + ";\n", encoding="utf-8")
    write_json(SOURCE / "manifest.json", {"status": "preview pending motion approval",
        "origin": "Original ImageGen art produced for Võ Lâm Hero Defense. See prompts.md.",
        "sourceSha256": provenance, "actorPivotPixels": PIVOT, "density": DENSITY,
        "authoring": "Original raster; keyed with soft edge, Lanczos reduction, and registered in Aseprite."})


if __name__ == "__main__":
    main()
