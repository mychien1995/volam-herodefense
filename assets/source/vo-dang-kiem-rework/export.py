"""Register the reviewed sword poses and raster effects for the Phaser client."""

import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageOps


SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parents[1] / "exports" / SOURCE.name
BODY = (208, 160)
PIVOT = (104, 124)
POSES = ("thrust", "cut_left", "cut_right", "cut_down", "cut_up", "aim")
FEET = {
    "right": [(183, 405), (729, 407), (1217, 406), (187, 916), (708, 917), (1197, 916)],
    "down": [(257, 408), (759, 421), (1281, 411), (258, 931), (775, 934), (1277, 934)],
    "up": [(245, 448), (763, 444), (1287, 444), (218, 926), (744, 933), (1278, 931)],
}


def source(name, body=False):
    with Image.open(SOURCE / f"{name}.png") as original:
        image = original.convert("RGBA")
    floor = 122 if body else 12
    alpha = image.getchannel("A")
    # Body sources have a low-alpha halo. Keep partial coverage along the real silhouette.
    image.putalpha(alpha.point(lambda a: min(255, round((a - floor) * 255 / (239 - floor)))
                               if body and a > floor else a if not body and a >= floor else 0))
    return image


def scale_image(image, scale):
    return image.resize(
        tuple(max(1, round(axis * scale)) for axis in image.size), Image.Resampling.LANCZOS
    )


def write_atlas(name, images, width):
    x, y, height = 4, 4, 0
    frames = {}
    for tag, image in images.items():
        if x + image.width + 4 > width:
            x, y, height = 4, y + height + 4, 0
        frames[tag] = {"frame": dict(x=x, y=y, w=image.width, h=image.height),
                       "rotated": False, "trimmed": False}
        x += image.width + 4
        height = max(height, image.height)
    sheet = Image.new("RGBA", (width, y + height + 4))
    assert max(sheet.size) <= 2048
    for tag, image in images.items():
        frame = frames[tag]["frame"]
        sheet.paste(image, (frame["x"], frame["y"]))
    sheet.save(OUTPUT / f"{name}.png", optimize=True)
    (OUTPUT / f"{name}.json").write_text(
        json.dumps({"frames": frames, "meta": {"size": dict(w=sheet.width, h=sheet.height)}},
                   ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def body_frames():
    frames = {}
    for facing, anchors in FEET.items():
        sheet = source(f"body-{facing}", body=True)
        width, height = sheet.width // 3, sheet.height // 2
        cells = []
        for index, (foot_x, foot_y) in enumerate(anchors):
            x, y = (index % 3) * width, (index // 3) * height
            cell = sheet.crop((x, y, x + width, y + height))
            box = cell.getbbox()
            assert box and min(box[0], box[1], width - box[2], height - box[3]) > 3
            cells.append((cell.crop(box), foot_x - x - box[0], foot_y - y - box[1]))
        scale = 88 / median(foot_y for _, _, foot_y in cells)
        for pose, (image, foot_x, foot_y) in zip(POSES, cells):
            frame = Image.new("RGBA", BODY)
            frame.paste(scale_image(image, scale), (PIVOT[0] - round(foot_x * scale),
                                                    PIVOT[1] - round(foot_y * scale)))
            left, top, right, bottom = frame.getbbox()
            assert min(left, top, BODY[0] - right, BODY[1] - bottom) > 2
            frames[f"{facing}_{pose}"] = frame
            if facing == "right":
                frames[f"left_{pose}"] = ImageOps.mirror(frame)
    return frames


def effect_frames():
    frames = {}
    cuts = source("cuts")
    for row, columns in enumerate(((0, 444, 887, 1330, 1774), (0, 444, 887, 1368, 1774))):
        for col in range(4):
            tile = cuts.crop((columns[col], row * 444, columns[col + 1], min(cuts.height, (row + 1) * 444)))
            image = tile.crop(tile.getbbox())
            tag = "impact" if (row, col) == (1, 3) else f"cut_{row * 4 + col}"
            frames[tag] = scale_image(image, min(256 / image.width, 192 / image.height))
    sky = source("sky-sword")
    for index, tag in enumerate(("blade", "marker")):
        tile = sky.crop((index * 887, 0, (index + 1) * 887, sky.height))
        image = tile.crop(tile.getbbox())
        frames[tag] = scale_image(image, 96 / image.height if index == 0 else 208 / image.width)
    return frames


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_atlas("body", body_frames(), 852)
    write_atlas("effects", effect_frames(), 1024)
