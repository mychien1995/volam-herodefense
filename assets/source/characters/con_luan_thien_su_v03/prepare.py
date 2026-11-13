"""Export the Thiền Sư v03 two-handed raster prototype."""
import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import label

SOURCE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "previous", SOURCE.with_name("con_luan_thien_su_v02") / "prepare.py"
)
previous = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(previous)
base = previous.base
OUTPUT = previous.OUTPUT.with_name("con_luan_thien_su_v03")
STAGING = previous.STAGING.with_name("con-luan-thien-su-v03")
FX_SIZE, FX_ORIGIN = (320, 320), (160, 160)
BODY_SIZE, FEET = previous.BODY_SIZE, previous.FEET

ROWS = {
    "down": (0, 328, 618, 954, 1254),
    "left_fixed": (0, 322, 612, 952, 1254),
    "right": (0, 333, 621, 950, 1254),
    "up_fixed": (0, 326, 611, 923, 1254),
    "guard": (0, 445, 887),
    "burst": (0, 724),
    "vfx": (0, 314, 628, 942, 1254),
}
COLS = {
    ("down", 2): (0, 314, 645, 950, 1254),
    ("left_fixed", 0): (0, 300, 625, 897, 1254),
    ("left_fixed", 1): (0, 314, 625, 942, 1254),
    ("left_fixed", 2): (0, 304, 628, 930, 1254),
    ("left_fixed", 3): (0, 295, 626, 930, 1254),
    ("right", 3): (0, 314, 656, 961, 1254),
    ("up_fixed", 2): (0, 285, 628, 942, 1254),
}
# Head centers and boot anchors are measured on the revised ImageGen cels.
HEADS = {
    "down": [(54,275),(371,272),(699,62),(975,273),(54,580),(378,579),(687,577),(1005,579),
             (157,904),(604,817),(874,650),(1094,911),(67,1040),(440,1205),(740,1213),(1024,1037)],
    "left": [(44,247),(343,249),(670,94),(948,257),(43,542),(362,545),(665,544),(1000,551),
             (31,799),(347,832),(691,659),(973,888),(54,1060),(336,1071),(665,1085),(984,1061)],
    "right": [(211,276),(526,274),(681,85),(1118,284),(198,578),(530,578),(875,573),(1166,573),
              (285,800),(589,829),(886,666),(1208,886),(73,1041),(610,1078),(918,1086),(1019,1057)],
    "up": [(224,122),(543,123),(862,55),(1211,268),(248,551),(557,536),(872,552),(1180,554),
           (238,654),(324,785),(878,660),(1212,875),(237,992),(507,959),(830,964),(1175,1031)],
}
CONTACT_FEET = {
    "down": [(153,918),(469,908),(766,908),(1095,904)],
    "left": [(185,903),(488,904),(828,904),(1126,904)],
    "right": [(125,903),(452,904),(744,904),(1048,904)],
    "up": [(163,904),(489,904),(763,904),(1060,904)],
}
# The source lays out east before west in both guard rows.
GUARDS = {
    "down": (0, (221, 403), (361, 300), (222, 843), (326, 542)),
    "right": (1, (660, 403), (793, 299), (662, 843), (568, 537)),
    "left": (2, (1105, 403), (1227, 298), (1105, 843), (1202, 538)),
    "up": (3, (1545, 403), (1690, 297), (1550, 843), (1644, 536)),
}


def sheet_cells(name, *, effect=False):
    with Image.open(SOURCE / "generated" / f"{name}.png") as sheet:
        pixels = np.asarray(sheet.convert("RGB"))
    red, green, blue = pixels.astype(np.int16).transpose(2, 0, 1)
    keyed = (green > 80) & (green - np.maximum(red, blue) > 24)
    rows = ROWS[name]
    for row, (y0, y1) in enumerate(zip(rows, rows[1:])):
        columns = COLS.get((name, row), tuple(round(i * pixels.shape[1] / 4) for i in range(5)))
        for col, (x0, x1) in enumerate(zip(columns, columns[1:])):
            alpha = ~keyed[y0:y1, x0:x1]
            if not effect:
                components, _ = label(alpha, structure=np.ones((3, 3)))
                sizes = np.bincount(components.ravel())
                sizes[0] = 0
                if np.count_nonzero(sizes >= 80) != 1:
                    raise ValueError(f"{name} {row},{col}: separated body or weapon")
                alpha = components == sizes.argmax()
            edges = (alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1])
            if not alpha.any() or any(edge.any() for edge in edges):
                raise ValueError(f"{name} {row},{col}: art touches its cell boundary")
            rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
            rgba[alpha, :3] = pixels[y0:y1, x0:x1][alpha]
            rgba[alpha, 3] = 255
            yield Image.fromarray(rgba), (x0, y0)


def register_body(cell, foot, head, scale):
    cel, (x0, y0) = cell
    ax, ay = foot[0] - x0, foot[1] - y0
    hx, hy = head[0] - x0, head[1] - y0
    if not cel.getpixel((hx, hy))[3]:
        raise ValueError(f"Hammer center falls outside art: {head}")
    left, top, _, _ = cel.getbbox()
    socket = (round((hx - left) * scale) - round((ax - left) * scale),
              round((hy - top) * scale) - round((ay - top) * scale))
    frame = base.register(cel, BODY_SIZE, FEET, (ax, ay), scale)
    if not frame.getpixel((FEET[0] + socket[0], FEET[1] + socket[1]))[3]:
        raise ValueError(f"Hammer center lost on export: {head}")
    return frame, socket


def body_clips():
    clips = []
    sockets = {}
    guard = list(sheet_cells("guard"))
    for direction in base.DIRECTIONS:
        name = direction + "_fixed" if direction in ("left", "up") else direction
        cells = list(sheet_cells(name))
        feet = previous.BOOT[direction][:8] + CONTACT_FEET[direction] + previous.BOOT[direction][12:]
        scale = 88 / (feet[0][1] - cells[0][0].getbbox()[1])
        images = [register_body(cel, foot, head, scale)
                  for cel, foot, head in zip(cells, feet, HEADS[direction], strict=True)]
        col, low_foot, low_head, high_foot, high_head = GUARDS[direction]
        images.append(register_body(guard[col], low_foot, low_head, 88 / 341))
        images.append(register_body(guard[col + 4], high_foot, high_head, 88 / 275))
        two_handed = [(16, 8, 16), (16, 9, 16), (16, 10, 17), (17, 11, 16)]
        for pose, indices, durations in previous.POSES:
            if pose.startswith("melee_"):
                indices = two_handed[int(pose[-1]) - 1]
            tag = f"{pose}_{direction}"
            clips.append((tag, [images[i][0] for i in indices], durations))
            for n, i in enumerate(indices):
                sockets[f"{tag}_{n}"] = images[i][1]
    return clips, sockets


def previous_effect(tag):
    prefix = previous.OUTPUT / (base.VFX_ID + ".json")
    atlas = json.loads(prefix.read_text(encoding="utf8"))["frames"]
    with Image.open(prefix.with_suffix(".png")) as sheet:
        for index in range(4):
            rect = atlas[f"{tag}_{index}"]["frame"]
            x, y, w, h = (rect[k] for k in ("x", "y", "w", "h"))
            yield sheet.crop((x, y, x + w, y + h)).convert("RGBA")


def leading_edge(frame, vector):
    ys, xs = np.where(np.asarray(frame.getchannel("A")) >= 40)
    dx, dy = vector
    return int(((xs - FX_ORIGIN[0]) * dx + (ys - FX_ORIGIN[1]) * dy).max())


def ground_extension(cells, direction, x, y):
    # Extend the slam on the ground beyond the head using the same authored
    # forked electricity. North/south converge toward the facing line.
    dx, dy = previous.CARDINAL[direction]
    ox, oy = FX_ORIGIN
    peak = cells[1].getbbox()
    scale = 75 / (peak[2] - peak[0])
    local = [base.register(cel, FX_SIZE, FX_ORIGIN, (151, 166), scale) for cel in cells]
    angle = {"right": 0, "left": 180, "up": 90, "down": -90}[direction]
    local = [frame.rotate(angle) for frame in local]
    source_lo = -max(leading_edge(frame, (-dx, -dy)) for frame in local)
    source_hi = max(leading_edge(frame, (dx, dy)) for frame in local)
    start = max(0, dx * x + dy * y - 6)
    stretch = (previous.REACH - start) / (source_hi - source_lo)
    shift = previous.REACH - source_hi * stretch
    side = dy * x
    slope = -side * .72 / (previous.REACH - start) if dy else 0
    # Inverse transform for nearest-neighbor raster placement.
    if dx:
        transform = (1 / stretch, 0, ox - (ox + dx * shift) / stretch, 0, 1, -y)
    else:
        transform = (1, -slope, -x + slope * (oy + dy * start),
                     0, 1 / stretch, oy - (oy + dy * shift) / stretch)
    result = []
    for frame in local:
        placed = frame.transform(FX_SIZE, Image.Transform.AFFINE, transform,
                                 resample=Image.Resampling.NEAREST)
        placed.putalpha(placed.getchannel("A").point(lambda a: round(a * .64)))
        result.append(placed)
    return result


def trail_clips(sockets):
    source = list(sheet_cells("vfx", effect=True))
    for direction, (dx, dy) in previous.CARDINAL.items():
        for index, beat in enumerate(previous.BEATS):
            cells = [cel for cel, _ in source[index * 4 : index * 4 + 4]]
            peak = cells[1].getbbox()
            scale = (85 if beat == "overhead" else 83) / (peak[2] - peak[0])
            anchors = [(151, 166), (151, 207), (151, 143), (151, 150)]
            if beat == "overhead":
                # Keep the falling arc above the point where the head lands.
                anchors = [(217, 159), (242, 228), (244, 215), (226, 211)]
            frames = [base.register(cel, FX_SIZE, FX_ORIGIN, anchor, scale)
                      for cel, anchor in zip(cells, anchors, strict=True)]
            x, y = sockets[f"melee_{index + 1}_{direction}_1"]
            if direction == "left":
                frames = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in frames]
            elif dy and beat in ("thrust", "sweep"):
                # Lay the horizontal thrust and the shallow ground sweep into the north/south view.
                frames = [frame.rotate(90 if dy < 0 else -90) for frame in frames]
            if beat == "overhead":
                shift_x, shift_y = x, y + 5
            else:
                # The visible outer edge inherits the 105-unit Cái Bang reference.
                delta = previous.REACH - max(leading_edge(f, (dx, dy)) for f in frames)
                shift_x, shift_y = (dx * delta, y) if dx else (x, dy * delta)
            shifted = []
            for frame in frames:
                left, top, right, bottom = frame.getbbox()
                bounds = (left + shift_x, top + shift_y, right + shift_x, bottom + shift_y)
                if min(bounds[:2]) <= 0 or max(bounds[2:]) >= FX_SIZE[0]:
                    raise ValueError(f"Clipped {beat}/{direction} lightning: {bounds}")
                positioned = Image.new("RGBA", FX_SIZE)
                positioned.paste(frame, (shift_x, shift_y))
                shifted.append(positioned)
            if beat == "overhead":
                forks = ground_extension([cel for cel, _ in source[:4]], direction, x, y + 5)
                shifted = [Image.alpha_composite(fork, arc) for fork, arc in zip(forks, shifted, strict=True)]
            reach = max(leading_edge(frame, (dx, dy)) for frame in shifted)
            if abs(reach - previous.REACH) > 2:
                raise ValueError(f"Unexpected reach: {beat}/{direction} {reach}")
            windup = previous.POSES[2 + index][2][0]
            yield f"trail_{beat}_{direction}", shifted, (windup, 60, 60, 70)


def effects(sockets):
    cells = previous.previous_vfx_cells()
    max_height = max(cel.getbbox()[3] - cel.getbbox()[1] for cel in cells[1][:3])
    bolt = []
    for cel in cells[1]:
        left, _, right, bottom = cel.getbbox()
        bolt.append(base.register(cel, FX_SIZE, FX_ORIGIN, ((left + right) / 2, bottom), 115 / max_height))
    yield "bolt", bolt, (50, 90, 75, 80)
    coil = []
    for frame in previous_effect("coil"):
        canvas = Image.new("RGBA", FX_SIZE)
        padding = FX_ORIGIN[0] - previous.FX_ORIGIN[0]
        canvas.paste(frame, (padding, padding))
        coil.append(canvas)
    yield "coil", coil, (75, 75, 75, 75)
    burst = [base.register(cel, FX_SIZE, FX_ORIGIN, (cel.width / 2, 374), .22)
             for cel, _ in sheet_cells("burst", effect=True)]
    yield "slam", burst, (55, 90, 95, 115)
    yield from trail_clips(sockets)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    args = parser.parse_args()
    base.SOURCE = SOURCE
    body, sockets = body_clips()
    body_layout = base.emit(STAGING / "body", base.BODY_ID, BODY_SIZE, FEET, body)
    fx_layout = base.emit(STAGING / "fx", base.VFX_ID, FX_SIZE, FX_ORIGIN, effects(sockets))
    results = [base.export(args.aseprite, STAGING / "body", body_layout, OUTPUT),
               base.export(args.aseprite, STAGING / "fx", fx_layout, OUTPUT, allow_soft_alpha=True)]
    (OUTPUT / "hammer-sockets.json").write_text(json.dumps(sockets, indent=2) + "\n", encoding="utf8")
    (STAGING / "asset-check.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf8")
