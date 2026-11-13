"""Package the longer-hammer artwork and violet effects for the local art review."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import label

SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE.with_name("con_luan_thien_su_v01")))
import prepare as base

ROOT = base.ROOT
STAGING = ROOT / ".cache/con-luan-thien-su-v02"
OUTPUT = ROOT / "assets/exports/characters/con_luan_thien_su_v02"
BODY_SIZE, FEET = (224, 176), (112, 132)
FX_SIZE, FX_ORIGIN = (256, 256), (128, 128)
REACH = 105
BONG = ROOT / "assets/exports/skills/cai-bang/bong-combo-review"
ROWS = {
    "right": (0, 314, 628, 942, 1254),
    "left_fixed": (0, 314, 628, 942, 1254),
    "down_fixed": (0, 314, 628, 950, 1254),
    "up": (0, 314, 628, 942, 1254),
    "burst": (0, 724),
}
SEAMS = {
    ("left_fixed", 0): (0, 314, 628, 910, 1254),
    ("up", 2): (0, 289, 628, 942, 1254),
}
# Source-space coordinates sampled at boot contact and at the copper inset
# on the 1254px ImageGen sheets. Pose order is row-major.
BOOT = {
    "right": [(163,285),(471,285),(784,285),(1091,285),(173,593),(468,594),(789,595),(1095,595),
              (125,903),(452,904),(744,904),(1048,904),(152,1216),(458,1216),(771,1216),(1076,1217)],
    "left": [(159,285),(469,285),(784,285),(1092,285),(157,596),(471,595),(774,596),(1096,595),
             (185,903),(488,904),(828,904),(1126,904),(157,1215),(497,1215),(822,1215),(1086,1216)],
    "down": [(158,290),(471,290),(782,290),(1100,291),(155,602),(466,600),(780,603),(1099,604),
             (153,918),(468,908),(766,908),(1095,904),(156,1224),(471,1224),(780,1224),(1098,1224)],
    "up": [(153,285),(468,285),(781,285),(1077,285),(152,582),(466,589),(777,590),(1096,591),
           (163,904),(488,905),(763,904),(1060,905),(153,1217),(453,1216),(771,1216),(1089,1215)],
}
HEAD = {
    "right": [(209,281),(525,277),(683,88),(1126,289),(196,587),(525,582),(881,581),(1165,580),
              (289,804),(598,832),(896,668),(1215,889),(74,1042),(612,1073),(921,1086),(1024,1059)],
    "left": [(42,252),(345,253),(669,97),(948,261),(41,546),(362,547),(669,548),(998,556),
             (25,803),(345,831),(692,663),(964,891),(53,1063),(342,1071),(667,1085),(985,1062)],
    "down": [(49,282),(366,281),(699,73),(974,283),(52,583),(373,587),(688,582),(1006,585),
             (157,917),(610,821),(874,656),(1093,916),(67,1041),(441,1205),(741,1219),(1024,1043)],
    "up": [(223,129),(544,129),(859,63),(1210,274),(248,555),(556,537),(871,557),(1173,559),
           (159,655),(327,797),(879,647),(1211,882),(237,1000),(509,963),(837,969),(1175,1037)],
}
POSES = (
    ("idle", (0, 1), (350, 350)),
    ("walk", (4, 5, 6, 7), (115, 105, 115, 105)),
    ("melee_1", (3, 8, 1), (95, 100, 115)),
    ("melee_2", (8, 9, 1), (100, 105, 115)),
    ("melee_3", (3, 10, 2), (95, 105, 115)),
    ("melee_4", (10, 11, 1), (135, 110, 130)),
    ("ranged", (12, 13, 14, 15), (105, 90, 85, 130)),
)
CARDINAL = {"down": (0, 1), "left": (-1, 0), "right": (1, 0), "up": (0, -1)}
BEATS = ("thrust", "sweep", "rising", "overhead")


def sheet_cells(name, *, fx=False):
    pixels = np.asarray(Image.open(SOURCE / "generated" / f"{name}.png").convert("RGB"))
    red, green, blue = pixels.astype(np.int16).transpose(2, 0, 1)
    mask = ~((green > 80) & (green - np.maximum(red, blue) > 24))
    rows = ROWS[name]
    for row, (y0, y1) in enumerate(zip(rows, rows[1:])):
        cols = SEAMS.get((name, row), tuple(round(i * pixels.shape[1] / 4) for i in range(5)))
        for col, (x0, x1) in enumerate(zip(cols, cols[1:])):
            cell_mask = mask[y0:y1, x0:x1].copy()
            if not fx:
                components, _ = label(cell_mask, structure=np.ones((3, 3)))
                sizes = np.bincount(components.ravel())
                sizes[0] = 0
                if np.count_nonzero(sizes >= 80) != 1:
                    raise ValueError(f"{name} {row},{col}: weapon/body must be one component")
                cell_mask = components == sizes.argmax()
            if not cell_mask.any() or any(edge.any() for edge in (
                cell_mask[0], cell_mask[-1], cell_mask[:, 0], cell_mask[:, -1]
            )):
                raise ValueError(f"{name} {row},{col}: invalid cell margin")
            rgba = np.zeros((*cell_mask.shape, 4), dtype=np.uint8)
            rgba[cell_mask, :3] = pixels[y0:y1, x0:x1][cell_mask]
            rgba[cell_mask, 3] = 255
            yield Image.fromarray(rgba), (x0, y0)


def body_clips():
    clips = []
    sockets = {}
    for direction in base.DIRECTIONS:
        name = direction + "_fixed" if direction in ("left", "down") else direction
        cells = list(sheet_cells(name))
        first, (_, y0) = cells[0]
        scale = 88 / (BOOT[direction][0][1] - y0 - first.getbbox()[1])
        images = []
        heads = []
        for (cel, (x0, y0)), (foot_x, foot_y), (head_x, head_y) in zip(
            cells, BOOT[direction], HEAD[direction], strict=True
        ):
            hx, hy = head_x - x0, head_y - y0
            if not cel.getpixel((hx, hy))[3]:
                raise ValueError(f"{direction}: head socket not on art at {(head_x, head_y)}")
            ax, ay = foot_x - x0, foot_y - y0
            left, top, _, _ = cel.getbbox()
            head = (round((hx - left) * scale) - round((ax - left) * scale),
                    round((hy - top) * scale) - round((ay - top) * scale))
            images.append(base.register(cel, BODY_SIZE, FEET, (ax, ay), scale))
            if not images[-1].getpixel((FEET[0] + head[0], FEET[1] + head[1]))[3]:
                raise ValueError(f"{direction}: registered head socket not on artwork")
            heads.append(head)
        for pose, indices, durations in POSES:
            tag = f"{pose}_{direction}"
            clips.append((tag, [images[i] for i in indices], durations))
            for n, i in enumerate(indices):
                sockets[f"{tag}_{n}"] = heads[i]
    return clips, sockets


def violet(image):
    """Shift luminous source colors to amethyst, retaining exact alpha."""
    image = image.convert("RGBA")
    value = np.asarray(image)[:, :, :3].max(axis=2)
    knots = [0, 70, 145, 200, 255]
    palette = [(18, 6, 33), (57, 15, 110), (116, 40, 206),
               (175, 88, 253), (235, 199, 255)]
    result = np.array(image)
    for i, channel in enumerate(zip(*palette)):
        result[:, :, i] = np.interp(value, knots, channel).astype(np.uint8)
    result[result[:, :, 3] == 0] = 0
    return Image.fromarray(result)


def bong_clips():
    atlas = json.loads((BONG / "trail.json").read_text(encoding="utf8"))["frames"]
    sheet = Image.open(BONG / "trail.png").convert("RGBA")
    offsets = {"thrust": (44, -8), "sweep": (17, 7), "rising": (25, 3)}
    overhead = {"right": (34, 1), "left": (-35, 1), "down": (16, 5), "up": (18, -66)}
    for direction, (dx, dy) in CARDINAL.items():
        for beat in BEATS:
            images = []
            source_dir = direction if beat == "overhead" or dx else "right"
            offset = overhead[direction] if beat == "overhead" else (
                offsets[beat][0] * (-1 if source_dir == "left" else 1), offsets[beat][1])
            for index in range(4):
                rect = atlas[f"combo_{beat}_{source_dir}_{index}"]["frame"]
                x, y, w, h = (rect[field] for field in ("x", "y", "w", "h"))
                image = violet(sheet.crop((x, y, x + w, y + h)))
                canvas = Image.new("RGBA", FX_SIZE)
                canvas.paste(image, (128 + offset[0] - 64, 128 + offset[1] - 76))
                if source_dir != direction:
                    canvas = canvas.rotate(90 if direction == "up" else -90)
                images.append(canvas)
            def leading_edge(image):
                ys, xs = np.where(np.asarray(image.getchannel("A")) >= 40)
                return int(((xs - 128) * dx + (ys - 128) * dy).max())
            lead = max(map(leading_edge, images))
            if lead <= 0:
                raise ValueError(f"Missing leading edge: {beat}/{direction}")
            scale = min(2.25, REACH / lead)
            shift = round(REACH - lead * scale)
            scaled = [
                image.transform(FX_SIZE, Image.Transform.AFFINE, (
                    1 / scale if dx else 1, 0, 128 - (128 + dx * shift) / scale if dx else 0,
                    0, 1 / scale if dy else 1, 128 - (128 + dy * shift) / scale if dy else 0,
                ), resample=Image.Resampling.BILINEAR)
                for image in images
            ]
            if abs(max(map(leading_edge, scaled)) - REACH) > 2:
                raise ValueError(f"Trail extent differs from Cái Bang Bổng: {beat}/{direction}")
            yield f"trail_{beat}_{direction}", scaled, (65, 65, 65, 70)


def effect_clips():
    # Keep the old bolt's shape and the coil's palette. The requested violet
    # palette applies to the strike and the Cái Bang-derived trails.
    cells = previous_vfx_cells()
    height = max(cel.getbbox()[3] - cel.getbbox()[1] for cel in cells[1][:3])
    bolt = []
    for cel in cells[1]:
        left, _, right, bottom = cel.getbbox()
        bolt.append(violet(base.register(cel, FX_SIZE, FX_ORIGIN, ((left + right) / 2, bottom), 115 / height)))
    yield "bolt", bolt, (50, 90, 75, 80)
    coil = []
    for cel in cells[2]:
        left, top, right, bottom = cel.getbbox()
        coil.append(base.register(cel, FX_SIZE, FX_ORIGIN, ((left + right) / 2, (top + bottom) / 2),
                                  32 / max(right - left, bottom - top)))
    yield "coil", coil, (75, 75, 75, 75)
    burst = []
    for cel, _ in sheet_cells("burst", fx=True):
        burst.append(base.register(cel, FX_SIZE, FX_ORIGIN, (cel.width / 2, 374), .22))
    yield "slam", burst, (55, 90, 95, 115)
    yield from bong_clips()


def previous_vfx_cells():
    current = base.SOURCE
    base.SOURCE = SOURCE.with_name("con_luan_thien_su_v01")
    try:
        return base.read_grid("vfx", 3, 4, permit_flecks=True)
    finally:
        base.SOURCE = current


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    args = parser.parse_args()
    base.SOURCE = SOURCE
    body, sockets = body_clips()
    body_layout = base.emit(STAGING / "body", base.BODY_ID, BODY_SIZE, FEET, body)
    fx_layout = base.emit(STAGING / "fx", base.VFX_ID, FX_SIZE, FX_ORIGIN, effect_clips())
    result = [base.export(args.aseprite, STAGING / "body", body_layout, OUTPUT),
              base.export(args.aseprite, STAGING / "fx", fx_layout, OUTPUT, allow_soft_alpha=True)]
    (OUTPUT / "hammer-sockets.json").write_text(json.dumps(sockets, indent=2) + "\n", encoding="utf8")
    (STAGING / "asset-check.json").write_text(json.dumps(result, indent=2), encoding="utf8")
