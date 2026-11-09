"""Register the approved-for-review source sheets for the standalone canvas."""

from pathlib import Path
from statistics import median

from PIL import Image


SOURCE = Path(__file__).resolve().parent
ASSETS = SOURCE.parents[3]
OUT = ASSETS / "exports" / "skills" / "thien-son" / SOURCE.name
NEAREST = Image.Resampling.NEAREST


def clean(image):
    alpha = image.getchannel("A")
    image.putalpha(alpha.point(lambda value: value if value >= 40 else 0))
    return image


def core_box(image):
    return image.getchannel("A").point(lambda value: 255 if value >= 128 else 0).getbbox()


def trimmed(image):
    return image.crop(core_box(image))


def thickness(image, guard_x):
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 192 else 0)
    length = alpha.getbbox()[2] - guard_x
    cols = range(guard_x + round(length * 0.4), guard_x + round(length * 0.6))
    boxes = [alpha.crop((x, 0, x + 1, alpha.height)).getbbox() for x in cols]
    return median(bottom - top for _, top, _, bottom in boxes)


def weapon_comparison():
    original = clean(Image.open(
        ASSETS / "source/characters/thien-son-dao-weapon-options-2026-11-09/a-han-nguyet.png"
    ))
    polished = clean(Image.open(SOURCE / "polished-dao.png"))
    old_box = core_box(original)
    new_box = core_box(polished)
    old_guard, new_guard = 816, 796
    old_height = old_box[3] - old_box[1]
    new_height = new_box[3] - new_box[1]
    body_scale = new_height / old_height

    blade = polished.crop((new_guard, 487, new_box[2], 673))
    blade_width = round((old_box[2] - old_guard) * 1.5 * body_scale)
    blade_y_scale = thickness(original, old_guard) * 1.2 * body_scale / thickness(polished, new_guard)
    blade_height = round(blade.height * blade_y_scale)
    # Keep the blade rooted at the midpoint of the jade guard.
    anchor_y = 620
    blade_y = anchor_y - round((anchor_y - 487) * blade_y_scale)
    assembled = Image.new("RGBA", polished.size)
    assembled.alpha_composite(polished.crop((0, 0, new_guard, polished.height)))
    assembled.alpha_composite(blade.resize((blade_width, blade_height), NEAREST), (new_guard, blade_y))

    for name, image, box, foot_x in (
        ("blade-a", original, old_box, 645),
        ("blade-polished", assembled, new_box, 622),
    ):
        crop = trimmed(image)
        scale = 220 / (box[3] - box[1])
        tile = Image.new("RGBA", (440, 258))
        tile.alpha_composite(
            crop.resize((round(crop.width * scale), round(crop.height * scale)), NEAREST),
            (147 - round((foot_x - box[0]) * scale), 20),
        )
        tile.save(OUT / f"{name}.png")


def poses():
    sheet = clean(Image.open(SOURCE / "poses.png"))
    atlas = Image.new("RGBA", (160 * 4, 144 * 4))
    rows = [0, 313, 614, 950, 1254]
    cols = [
        [0, 312, 619, 961, 1254],
        [0, 310, 606, 955, 1254],
        [0, 311, 614, 953, 1254],
        [0, 290, 625, 954, 1254],
    ]
    # Sole positions in the generated sheet. The overhead blade can extend
    # above the bun, and the downward blade can extend below the soles.
    feet = [
        [(157, 286), (465, 285), (775, 285), (1084, 285)],
        [(155, 595), (464, 596), (788, 597), (1114, 597)],
        [(158, 916), (466, 916), (776, 916), (1075, 916)],
        [(152, 1216), (465, 1218), (785, 1219), (1094, 1206)],
    ]
    scale = 0.335
    for row, boundaries in enumerate(cols):
        for col, (left, right) in enumerate(zip(boundaries, boundaries[1:])):
            cell = sheet.crop((left, rows[row], right, rows[row + 1]))
            x0, y0, x1, y1 = core_box(cell)
            x, y = feet[row][col]
            sprite = cell.crop((x0, y0, x1, y1))
            atlas.alpha_composite(
                sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), NEAREST),
                (col * 160 + 80 - round((x - left - x0) * scale),
                 row * 144 + 112 - round((y - rows[row] - y0) * scale)),
            )
    atlas.save(OUT / "poses.png")


def effects():
    sheet = clean(Image.open(SOURCE / "effects.png"))
    regions = {
        "sweep-right": (0, 0, 625, 610),
        "sweep-left": (654, 0, 1261, 610),
        "sweep-down": (0, 610, 625, 1247),
        "peach-wind": (625, 610, 1261, 1247),
    }
    for name, box in regions.items():
        effect = trimmed(sheet.crop(box))
        effect.thumbnail((320, 128), NEAREST)
        effect.save(OUT / f"{name}.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    weapon_comparison()
    poses()
    effects()
    trimmed(clean(Image.open(SOURCE / "hud-icon.png"))).resize((72, 72), NEAREST).save(OUT / "hud-icon.png")
