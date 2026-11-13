"""Export the revised Cơ Quan VFX as a separate native-density atlas."""
from pathlib import Path
import json
import runpy

from PIL import Image

ROOT = Path(__file__).resolve().parent
BASE = runpy.run_path(str(ROOT / "prepare-art.py"))
SOURCE = ROOT / "source/co-quan-effects.png"
CELL = BASE["CELL"]
NAMES = ("charge", "laser", "contact", "blossom-blast", "shockwave", "needle")
WIDTHS = (46, 96, 62, 100, 108, 23)


def main():
    cels = BASE["regions"](BASE["open_matte"](SOURCE), 2, 3, [0, 428, 1132, 1536])
    atlas = Image.new("RGBA", (4 * CELL, 2 * CELL))
    frames = {}
    for index, (name, width, cel) in enumerate(zip(NAMES, WIDTHS, cels, strict=True)):
        registered = BASE["register"](cel, width, 0.5, True)
        x, y = index % 4 * CELL, index // 4 * CELL
        atlas.paste(registered, (x, y))
        frames[name] = {
            "frame": {"x": x, "y": y, "w": CELL, "h": CELL},
            "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
            "sourceSize": {"w": CELL, "h": CELL}, "duration": 100,
        }
    name = "co-quan-effects"
    atlas.save(ROOT / f"art/{name}.png", optimize=True)
    BASE["write_json"](ROOT / f"art/{name}.json", {"frames": frames, "meta": {
        "image": f"{name}.png", "size": {"w": atlas.width, "h": atlas.height},
        "pivotPixels": [CELL // 2, CELL // 2], "scale": "1",
        "sourceSha256": BASE["digest"](SOURCE),
    }})
    metadata = {"names": list(NAMES), "laserWidth": WIDTHS[1]}
    (ROOT / f"{name}.js").write_text("const CO_QUAN_FX = " + json.dumps(metadata) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
