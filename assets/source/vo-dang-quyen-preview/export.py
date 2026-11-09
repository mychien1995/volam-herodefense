"""Export the approved Võ Đang Quyền art study as native-density Phaser textures."""

import json
from hashlib import sha256
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageDraw, ImageOps


SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parents[1] / "exports" / SOURCE.name
RESAMPLE = Image.Resampling.LANCZOS
PUNCH_CELL = (192, 160)
PUNCH_PIVOT = (96, 124)


def source(name):
    with Image.open(SOURCE / (name + ".png")) as image:
        return image.convert("RGBA")


def matte(image, floor=8):
    # Keep partial coverage on edges while discarding the sparse generated matte.
    image.putalpha(image.getchannel("A").point(lambda a: a if a >= floor else 0))
    return image


def grid(image, rows, cols):
    for row in range(rows):
        for col in range(cols):
            yield image.crop((
                round(col * image.width / cols), round(row * image.height / rows),
                round((col + 1) * image.width / cols), round((row + 1) * image.height / rows),
            ))


def fit(image, scale):
    size = tuple(round(n * scale) for n in image.size)
    return image.resize(size, RESAMPLE)


def save_json(name, value):
    (OUTPUT / (name + ".json")).write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8",
    )


def write_atlas(name, images, width):
    # Leave four transparent pixels between packed regions for linear filtering.
    x, y, row_height = 4, 4, 0
    frames = {}
    for tag, image in images.items():
        if x + image.width + 4 > width:
            x, y, row_height = 4, y + row_height + 4, 0
        frames[tag] = {
            "frame": {"x": x, "y": y, "w": image.width, "h": image.height},
            "rotated": False,
            "trimmed": False,
        }
        row_height = max(row_height, image.height)
        x += image.width + 4
    sheet = Image.new("RGBA", (width, y + row_height + 4))
    for tag, image in images.items():
        frame = frames[tag]["frame"]
        sheet.paste(image, (frame["x"], frame["y"]))
    assert sheet.width <= 2048 and sheet.height <= 2048, sheet.size
    sheet.save(OUTPUT / (name + ".png"), optimize=True)
    save_json(name, {"frames": frames, "meta": {"size": {"w": sheet.width, "h": sheet.height}}})


def body_cels(name, rows, cols):
    cels = [matte(image) for image in grid(source(name), rows, cols)]
    heights = [cel.getbbox()[3] - cel.getbbox()[1] for cel in cels]
    return cels, 88 / median(heights)


def register_body(cel, scale):
    left, top, right, bottom = cel.getbbox()
    height = bottom - top
    # Estimate the support midpoint from the boot band, excluding the hand and ribbons.
    feet = cel.crop((0, bottom - round(height * .13), cel.width, bottom)).getbbox()
    anchor_x = (feet[0] + feet[2]) / 2
    rendered = fit(cel.crop((left, top, right, bottom)), scale)
    frame = Image.new("RGBA", PUNCH_CELL)
    offset = (PUNCH_PIVOT[0] - round((anchor_x - left) * scale), PUNCH_PIVOT[1] - rendered.height + 1)
    frame.paste(rendered, offset)
    bounds = frame.getbbox()
    assert bounds[0] > 3 and bounds[1] > 3 and bounds[2] < PUNCH_CELL[0] - 3
    assert abs(bounds[3] - PUNCH_PIVOT[1]) <= 2
    return frame


def reflect_body(frame):
    return ImageChops.offset(ImageOps.mirror(frame), 1, 0)


def export_punch():
    cels, scale = body_cels("punch-source", 3, 4)
    frames = {}
    for row, direction in enumerate(("right", "down", "up")):
        for index in range(4):
            cel = cels[row * 4 + index]
            if (direction, index) == ("down", 1):
                cel = matte(source("front-jab-source"), 12)
            height = cel.getbbox()[3] - cel.getbbox()[1]
            cel_scale = scale if abs(height * scale - 88) < 4 else 88 / height
            frame = register_body(cel, cel_scale)
            frames[f"{direction}_{index}"] = frame
            if direction == "right":
                frames[f"left_{index}"] = reflect_body(frame)
    write_atlas("punch", frames, 788)


def export_casts():
    palms, palm_scale = body_cels("palm-source", 3, 4)
    form, form_scale = body_cels("taichi-source", 2, 3)
    frames = {}
    for row, direction in enumerate(("right", "down", "up")):
        for index in range(4):
            frame = register_body(palms[row * 4 + index], palm_scale)
            # Rear wave one leads with the opposite hand from rear wave two.
            frames[f"palm_{direction}_{index}"] = reflect_body(frame) if (direction, index) == ("up", 1) else frame
            if direction == "right":
                frames[f"palm_left_{index}"] = reflect_body(frame)
    for index, cel in enumerate(form):
        frame = register_body(cel, form_scale)
        # Keep the two cloud-hand steps on opposite sides of the character.
        frames[f"taichi_{index}"] = reflect_body(frame) if index == 1 else frame
    write_atlas("casts", frames, 788)
    rim, _ = isolate(source("rim-source"), (1086, 360), 134, 310, 6)
    rim.save(OUTPUT / "formation-rim.png", optimize=True)


def isolate(image, pivot, display_width, max_width, padding=4):
    image = matte(image)
    left, top, right, bottom = image.getbbox()
    left, top = max(0, left - padding), max(0, top - padding)
    right, bottom = min(image.width, right + padding), min(image.height, bottom + padding)
    image = image.crop((left, top, right, bottom))
    origin = [(pivot[0] - left) / image.width, (pivot[1] - top) / image.height]
    assert all(0 <= item <= 1 for item in origin), origin
    scale = min(1, max_width / image.width)
    return fit(image, scale), {"origin": origin, "width": display_width}


def glyphs():
    image = source("fortune-source")
    assert image.size == (1774, 887), image.size
    names = ("can", "khon", "doai", "ton", "kham", "can-nui", "chan", "ly")
    for index, name in enumerate(names):
        row, col = divmod(index, 4)
        x = (180, 480, 781, 1081)[col]
        y = (259, 613)[row]
        cropped = image.crop((x - 148, y - 148, x + 148, y + 148))
        # Circular ink medallion isolated from the approved opaque review board.
        alpha = Image.new("L", cropped.size)
        ImageDraw.Draw(alpha).ellipse((4, 3, 291, 292), fill=255)
        cropped.putalpha(alpha)
        yield name, isolate(cropped, (148, 148), 42, 92, 3)


def fortune_buffs():
    widths = {"can": 65, "khon": 100, "ton": 78, "kham": 90}
    for (name, width), image in zip(widths.items(), grid(source("buff-source"), 2, 2)):
        left, top, right, bottom = matte(image).getbbox()
        x = (left + right) / 2
        y = bottom - 4 if name == "can" else (top + bottom) / 2
        yield "buff-" + name, isolate(image, (x, y), width, width * 2, 5)


def export_effects():
    wave, seal, ink, doai = grid(source("effects-source"), 2, 2)
    effects = {
        "formation": isolate(source("formation-source"), (835, 442), 768, 1590, 12),
        "shield": isolate(source("shield-source"), (625, 626), 149, 320, 9),
        "sonic": isolate(wave, (281, 249), 64, 168),
        "seal": isolate(seal, (354, 241), 54, 125),
        "ink": isolate(ink, (378, 365), 109, 235),
        "doai-ring": isolate(doai, (352, 244), 378, 690, 6),
        **dict(glyphs()),
        **dict(fortune_buffs()),
    }
    for image, placement in effects.values():
        assert image.width >= placement["width"], (image.size, placement)
        assert image.getchannel("A").getextrema()[0] == 0
    write_atlas("effects", {name: item[0] for name, item in effects.items()}, 2048)
    save_json("placement", {name: item[1] for name, item in effects.items()})


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    export_punch()
    export_effects()
    export_casts()
    for path in sorted(OUTPUT.iterdir()):
        print(path.name, path.stat().st_size, sha256(path.read_bytes()).hexdigest())
