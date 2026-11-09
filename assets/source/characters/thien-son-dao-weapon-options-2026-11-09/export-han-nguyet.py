"""Register the Hàn Nguyệt pose sheets at one native body scale."""
import hashlib
import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageOps

SOURCE = Path(__file__).resolve().parent
ASSETS = next(parent for parent in SOURCE.parents if parent.name == "assets")
OUT = ASSETS / "exports/characters/thien-son-han-nguyet"
WIDTH, HEIGHT = 160, 144
PIVOT_X, PIVOT_Y = 80, 112
SCALE = 1 / 3
DIRECTIONS = ("down", "left", "right", "up")
GRIDS = {
    "locomotion": ([0, 313, 627, 940, 1254], (
        (172, 167, 159, 160), (155, 167, 166, 162),
        (162, 162, 155, 150), (160, 167, 163, 150),
    )),
    "attack": ([0, 313, 624, 961, 1254], (
        (174, 160, 153, 148), (174, 155, 116, 137),
        (178, 152, 132, 145), (160, 159, 132, 140),
    )),
}
Y_EDGES = [0, 310, 621, 930, 1254]
POLISHED = ASSETS / "source/skills/thien-son/tam-lien-tram-2026-11-09/polished-dao.png"


def blade_thickness(alpha, length):
    core = alpha.point(lambda a: 255 if a >= 192 else 0)
    boxes = [core.crop((x, 0, x + 1, core.height)).getbbox()
             for x in range(round(length * .4), round(length * .6))]
    return median(box[3] - box[1] for box in boxes if box)


def polished_locomotion(sprite, polished, left):
    # Isolate the outboard blade at the jade guard. Work in a right-facing
    # crop so the left-facing cels use the same guard and width rules.
    if left:
        sprite = ImageOps.mirror(sprite)
    guard = []
    for y in range(65, 99):
        for x in range(83, 108):
            r, g, b, alpha = sprite.getpixel((x, y))
            if alpha > 180 and 45 <= r <= 198 and g >= r and r - b >= 11 and g - b >= 18:
                guard.append((x, y))
    edge_x = max(x for x, _ in guard) + 1
    center_y = round(median(y for _, y in guard))
    bounds = (edge_x, center_y - 14, WIDTH, center_y + 9)
    old = sprite.crop(bounds).getchannel("A")
    length = old.point(lambda a: 255 if a >= 128 else 0).getbbox()[2]
    seam = old.crop((2, 7, 5, 21)).point(lambda a: 255 if a >= 128 else 0).getbbox()
    attach_y = bounds[1] + 7 + round((seam[1] + seam[3]) / 2)
    scale_y = blade_thickness(old, length) * 1.2 / blade_thickness(polished.getchannel("A"), polished.width)
    blade = polished.resize((round(length * 1.5), round(polished.height * scale_y)), Image.Resampling.NEAREST)
    sprite.paste((0, 0, 0, 0), bounds)
    sprite.alpha_composite(blade, (edge_x, attach_y - round((620 - 487) * scale_y)))
    return ImageOps.mirror(sprite) if left else sprite


def record(path):
    return {
        "file": path.relative_to(ASSETS).as_posix(),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (WIDTH * 8, HEIGHT * 4))
    frames = {}
    sources = []
    polished = Image.open(POLISHED).crop((796, 487, 1434, 673))
    polished.putalpha(polished.getchannel("A").point(lambda a: a if a >= 64 else 0))
    for group, (x_edges, feet_x) in GRIDS.items():
        source = SOURCE / f"han-nguyet-{group}.png"
        raw = Image.open(source)
        assert raw.mode == "RGBA" and raw.size == (1254, 1254)
        sources.append({"png": record(source), "prompt": record(source.with_suffix(".prompt.txt"))})
        for row, direction in enumerate(DIRECTIONS):
            for col in range(4):
                cel = raw.crop((x_edges[col], Y_EDGES[row], x_edges[col + 1], Y_EDGES[row + 1]))
                alpha = cel.getchannel("A")
                bounds = alpha.point(lambda a: 255 if a >= 100 else 0).getbbox()
                assert bounds and 0 < bounds[0] < bounds[2] < cel.width
                assert 0 < bounds[1] < bounds[3] < cel.height
                ax, ay = feet_x[row][col], bounds[3]
                cel.putalpha(alpha.point(lambda a: a if a >= 32 else 0))
                # The generator drew the second attack row facing right.
                # Mirror that complete row together with its blade.
                if group == "attack" and direction == "left":
                    cel = ImageOps.mirror(cel)
                    ax = cel.width - ax
                cel = cel.resize((round(cel.width * SCALE), round(cel.height * SCALE)), Image.Resampling.LANCZOS)
                sprite = Image.new("RGBA", (WIDTH, HEIGHT))
                sprite.alpha_composite(cel, (PIVOT_X - round(ax * SCALE), PIVOT_Y - round(ay * SCALE)))
                if group == "locomotion":
                    sprite = polished_locomotion(sprite, polished, direction == "left")
                box = sprite.getchannel("A").point(lambda a: 255 if a >= 100 else 0).getbbox()
                assert box and 2 <= box[0] and box[2] <= WIDTH - 2 and 2 <= box[1] and box[3] <= HEIGHT - 2
                x = (col + (4 if group == "attack" else 0)) * WIDTH
                y = row * HEIGHT
                sheet.alpha_composite(sprite, (x, y))
                tag = (f"attack_{direction}_{col}" if group == "attack" else
                       f"idle_{direction}" if col == 0 else f"walk_{direction}_{col - 1}")
                frames[tag] = {
                    "frame": {"x": x, "y": y, "w": WIDTH, "h": HEIGHT},
                    "rotated": False, "trimmed": False,
                    "sourceSize": {"w": WIDTH, "h": HEIGHT},
                    "spriteSourceSize": {"x": 0, "y": 0, "w": WIDTH, "h": HEIGHT},
                    "pivot": {"x": PIVOT_X / WIDTH, "y": PIVOT_Y / HEIGHT},
                }
    png, atlas = OUT / "han-nguyet.png", OUT / "han-nguyet.json"
    sheet.save(png)
    atlas.write_text(json.dumps({"frames": frames, "meta": {
        "image": png.name, "size": {"w": sheet.width, "h": sheet.height}, "scale": "1",
    }}, indent=2) + "\n", encoding="utf8")
    (OUT / "provenance.json").write_text(json.dumps({
        "artSource": "OpenAI ImageGen",
        "approvedConcept": record(SOURCE / "a-han-nguyet.png"),
        "sources": sources, "png": record(png), "atlas": record(atlas),
        "pivotPx": [PIVOT_X, PIVOT_Y], "scale": 0.5,
        "polishedBladeSource": record(POLISHED),
        "transforms": {
            "attack_left": "mirrored right-facing row 2",
            "locomotion": "generated polished blade, 1.5x reach and 1.2x middle-blade width",
        },
    }, indent=2) + "\n", encoding="utf8")
    print(f"Hàn Nguyệt: {len(frames)} cels, four directions, fixed feet origin")


if __name__ == "__main__":
    main()
