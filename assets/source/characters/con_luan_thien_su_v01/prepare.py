"""Key and register ImageGen raster cels for the Thiền Sư art-only preview."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import label

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
STAGING = ROOT / ".cache" / "con-luan-thien-su"
OUTPUT = ROOT / "assets" / "exports" / "characters" / "con_luan_thien_su_v01"
DIRECTIONS = ("down", "left", "right", "up")
BODY_SIZE = (176, 144)
FEET = (88, 120)
REST_HEIGHT = 88
BODY_ID = "hero_con_luan_thien_su"
VFX_ID = "con_luan_thien_su_fx"
PREVIEW_CELS = (
    ("idle", ((0, 0), (0, 1)), (350, 350)),
    ("walk", ((1, 0), (1, 1), (1, 2), (1, 3)), (115, 105, 115, 105)),
    ("melee_1", ((0, 3), (2, 0), (0, 1)), (95, 100, 115)),
    ("melee_2", ((0, 2), (2, 1), (0, 1)), (110, 90, 115)),
    ("melee_3", ((0, 3), (2, 2), (0, 1)), (95, 105, 115)),
    ("melee_4", ((0, 2), (2, 3), (0, 1)), (135, 110, 130)),
    ("ranged", ((3, 0), (3, 1), (3, 2), (3, 3)), (105, 90, 85, 130)),
)


def read_grid(name, rows, cols, *, permit_flecks=False):
    with Image.open(SOURCE / "generated" / f"{name}.png") as image:
        pixels = np.asarray(image.convert("RGB"))
    red, green, blue = pixels.astype(np.int16).transpose(2, 0, 1)
    key = (green > 80) & (green - np.maximum(red, blue) > 24)
    # Keep disconnected authored sparks in the VFX sheet. For the body sheet,
    # a second substantial component signals a broken weapon or a stray prop.
    cells = []
    for row, band in enumerate(np.array_split(np.arange(pixels.shape[0]), rows)):
        row_cells = []
        columns = np.array_split(np.arange(pixels.shape[1]), cols)
        # The west-facing sweep overhangs the nominal center gutter by 5 source pixels.
        if name == "left" and row == 2:
            seam = 609
            columns[1] = np.arange(columns[1][0], seam)
            columns[2] = np.arange(seam, columns[2][-1] + 1)
        for col, strip in enumerate(columns):
            raw = pixels[band[0] : band[-1] + 1, strip[0] : strip[-1] + 1]
            mask = ~key[band[0] : band[-1] + 1, strip[0] : strip[-1] + 1]
            mask = mask.copy()
            if not permit_flecks:
                components, _ = label(mask, structure=np.ones((3, 3)))
                counts = np.bincount(components.ravel())
                counts[0] = 0
                if (counts >= 80).sum() != 1:
                    raise ValueError(f"{name} [{row},{col}] has separated body artwork")
                mask = components == counts.argmax()
            if not mask.any() or any(edge.any() for edge in (mask[0], mask[-1], mask[:, 0], mask[:, -1])):
                raise ValueError(f"{name} [{row},{col}] has missing or crossed cell artwork")
            rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
            rgba[mask, :3] = raw[mask]
            rgba[mask, 3] = 255
            row_cells.append(Image.fromarray(rgba))
        cells.append(row_cells)
    return cells


def contact(cel):
    mask = np.asarray(cel.getchannel("A")) > 0
    _, top, _, bottom = cel.getbbox()
    # Sample the boots inside the art cell, using the inner silhouette so
    # a low hammer head does not drag the pivot sideways on the slam.
    left, right = round(cel.width * .28), round(cel.width * .72)
    band_top = bottom - max(10, round((bottom - top) * .18))
    ys, xs = np.where(mask[band_top:bottom, left:right])
    if xs.size == 0:
        raise ValueError("Could not locate boots")
    return (float(np.median(xs)) + left, int(ys.max()) + band_top + 1)


def register(cel, size, pivot, anchor, scale):
    left, top, right, bottom = cel.getbbox()
    crop = cel.crop((left, top, right, bottom)).resize(
        (max(1, round((right - left) * scale)), max(1, round((bottom - top) * scale))),
        Image.Resampling.LANCZOS,
    )
    array = np.array(crop)
    array[:, :, 3] = np.where(array[:, :, 3] >= 140, 255, 0)
    array[array[:, :, 3] == 0] = 0
    crop = Image.fromarray(array)
    x = pivot[0] - round((anchor[0] - left) * scale)
    y = pivot[1] - round((anchor[1] - top) * scale)
    if min(x, y) < 1 or x + crop.width >= size[0] or y + crop.height >= size[1]:
        raise ValueError(f"Registered art clips the canvas: {(x, y, crop.width, crop.height, size)}")
    frame = Image.new("RGBA", size)
    frame.paste(crop, (x, y))
    return frame


def emit(folder, name, size, pivot, clips):
    folder.mkdir(parents=True, exist_ok=True)
    data = {"size": size, "pivot": pivot, "id": name, "clips": []}
    for tag, images, durations in clips:
        names = []
        for index, image in enumerate(images):
            filename = f"{tag}_{index}.png"
            if image.getbbox() is None:
                raise ValueError(filename)
            image.save(folder / filename)
            names.append(filename)
        data["clips"].append({"tag": tag, "files": names, "durations": durations})
    (folder / "layout.json").write_text(json.dumps(data, indent=2), encoding="utf8")
    return data


def body_clips(directions):
    for direction in directions:
        cells = read_grid(direction, 4, 4)
        revisions = {
            "down": ((1, 2), (1, 3)),
            "up": ((1, 2), (1, 3), (3, 1), (3, 2)),
        }
        if direction in revisions:
            revised = read_grid(f"{direction}_refinement", 4, 4)
            for row, col in revisions[direction]:
                cells[row][col] = revised[row][col]
        idle = cells[0][0]
        scale = REST_HEIGHT / (contact(idle)[1] - idle.getbbox()[1])
        registered = [
            [register(cel, BODY_SIZE, FEET, contact(cel), scale) for cel in row]
            for row in cells
        ]
        for state, cels, durations in PREVIEW_CELS:
            yield f"{state}_{direction}", [registered[row][col] for row, col in cels], durations


def effect_clips():
    cells = read_grid("vfx", 3, 4, permit_flecks=True)
    groups = []
    for index, cel in enumerate(cells[0]):
        l, t, r, b = cel.getbbox()
        groups.append((f"swing_{index + 1}", [register(cel, (160, 208), (80, 160),
                      ((l + r) / 2, (t + b) / 2), 67 / max(r - l, b - t))], [100]))
    heights = [cel.getbbox()[3] - cel.getbbox()[1] for cel in cells[1][:3]]
    bolt_scale = 115 / max(heights)
    bolts = []
    for cel in cells[1]:
        l, _, r, b = cel.getbbox()
        bolts.append(register(cel, (160, 208), (80, 160), ((l + r) / 2, b), bolt_scale))
    groups.append(("bolt", bolts, [50, 70, 75, 80]))
    coils = []
    for cel in cells[2]:
        l, t, r, b = cel.getbbox()
        coils.append(register(cel, (160, 208), (80, 160), ((l + r) / 2, (t + b) / 2),
                              32 / max(r - l, b - t)))
    groups.append(("coil", coils, [75, 75, 75, 75]))
    return groups


def export(aseprite, folder, layout, output, *, allow_soft_alpha=False):
    output.mkdir(parents=True, exist_ok=True)
    art = SOURCE / f"{layout['id']}.aseprite"
    atlas = output / f"{layout['id']}.json"
    png = output / f"{layout['id']}.png"
    subprocess.run([aseprite, "-b", "--script-param", f"folder={folder.as_posix()}",
                    "--script-param", f"output={art.as_posix()}",
                    "--script", str(SOURCE / "assemble.lua")], check=True)
    subprocess.run([aseprite, "-b", str(art), "--list-tags", "--list-slices",
                    "--sheet-type", "packed", "--format", "json-hash",
                    "--filename-format", "{tag}_{tagframe}",
                    "--data", str(atlas), "--sheet", str(png)], check=True)
    if not art.exists() or not atlas.exists() or not png.exists():
        raise ValueError("Aseprite did not write the expected files")
    metadata = json.loads(atlas.read_text(encoding="utf8"))
    expected = {Path(filename).stem: (filename, ms)
                for clip in layout["clips"]
                for filename, ms in zip(clip["files"], clip["durations"], strict=True)}
    if set(metadata["frames"]) != expected.keys():
        raise ValueError(f"Exported frame names differ: {metadata['frames'].keys()}")
    offset = 0
    tags = {tag["name"]: tag for tag in metadata["meta"]["frameTags"]}
    if set(tags) != {clip["tag"] for clip in layout["clips"]}:
        raise ValueError("Exported tag names differ")
    for clip in layout["clips"]:
        tag = tags[clip["tag"]]
        limit = offset + len(clip["files"])
        keys = list(metadata["frames"])[tag["from"] : tag["to"] + 1]
        if (tag["from"], tag["to"]) != (offset, limit - 1) or keys != [
            Path(filename).stem for filename in clip["files"]
        ]:
            raise ValueError(f"Exported tag range differs: {tag}")
        offset = limit
    distinct = set()
    with Image.open(png) as atlas_image:
        for key, entry in metadata["frames"].items():
            rect = entry["frame"]
            x, y, w, h = (rect[field] for field in ("x", "y", "w", "h"))
            if not (0 <= x <= atlas_image.width - w and 0 <= y <= atlas_image.height - h):
                raise ValueError(key)
            image = atlas_image.crop((x, y, x + w, y + h)).convert("RGBA")
            filename, duration = expected[key]
            with Image.open(folder / filename) as original:
                if image.tobytes() != original.tobytes() or entry["duration"] != duration:
                    raise ValueError(f"Pixels or timing changed on export: {key}")
            alpha = set(image.getchannel("A").getdata())
            if 0 not in alpha or not (alpha - {0}) or (not allow_soft_alpha and alpha != {0, 255}):
                raise ValueError(f"Bad alpha: {key}")
            distinct.add(hashlib.sha256(image.tobytes()).hexdigest())
    print(f"{layout['id']}: {len(expected)} atlas entries, {len(distinct)} unique cels, "
          f"{len(layout['clips'])} tags, pixel and timing parity verified")
    return {"frames": len(expected), "uniqueCels": len(distinct), "clips": len(layout["clips"]),
            "size": layout["size"], "pivot": layout["pivot"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    parser.add_argument("--pilot", action="store_true")
    options = parser.parse_args()
    if options.pilot:
        layout = emit(STAGING / "pilot", "pilot_thien_su", BODY_SIZE, FEET, body_clips(("right",)))
        export(options.aseprite, STAGING / "pilot", layout, STAGING)
    else:
        body = emit(STAGING / "body", BODY_ID, BODY_SIZE, FEET, body_clips(DIRECTIONS))
        vfx = emit(STAGING / "vfx", VFX_ID, (160, 208), (80, 160), effect_clips())
        results = [export(options.aseprite, STAGING / "body", body, OUTPUT),
                   export(options.aseprite, STAGING / "vfx", vfx, OUTPUT)]
        (STAGING / "asset-check.json").write_text(json.dumps(results, indent=2), encoding="utf8")
