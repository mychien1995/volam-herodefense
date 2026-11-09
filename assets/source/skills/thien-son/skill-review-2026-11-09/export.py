"""Register generated Thiên Sơn art on stable gameplay pivots."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ASSETS = next(p for p in SOURCE.parents if p.name == "assets")
OUTPUT = ASSETS / "exports/skills/thien-son" / SOURCE.name
CONCEPT = ASSETS / "concepts/heroes/thien-son/thien-son-concept-v01.png"
DAO = ASSETS / "exports/characters/visual_improvement_v02/hero_thien_son_dao_idle.png"
DIAGONALS = ("down_right", "down_left", "up_right", "up_left")
POSES = ("ready", "windup", "sweep", "follow")

# Pixel coordinates within each source cell, measured at the jade hub or
# intersection of the four inward cuts. Use one scale per effect.
SPECS = {
    "bao-vu-cuong-phong": {
        "status": "artwork-approved",
        "size": 88,
        "scale": 0.15,
        "anchors": [(334, 324), (292, 324), (334, 296), (293, 296)],
        "frames": ["spin_0", "spin_1", "spin_2", "spin_3"],
        "durations": [55, 55, 55, 55],
        "clips": {"spin": {"frames": [0, 1, 2, 3], "loop": True}},
        "references": [CONCEPT],
    },
    "bach-liet-thien-kich": {
        "size": 256,
        "scale": 0.40,
        "anchors": [(320, 305), (317, 310), (308, 302), (307, 303)],
        "frames": ["split", "cut_1", "cut_2", "recoil"],
        "durations": [140, 70, 70, 60],
        "clips": {
            "split": {"frames": [0], "loop": False},
            "flurry": {"frames": [1, 2, 3], "loop": True},
        },
        "references": [DAO, CONCEPT],
    },
    "bach-liet-thien-kich-v2": {
        "size": 272,
        "scale": 0.40,
        "source_margin": 8,
        "anchors": [(312, 276), (318, 279), (316, 290), (323, 280)],
        "frames": ["split", "cut_1", "cut_2", "recoil"],
        "durations": [140, 70, 70, 60],
        "clips": {
            "split": {"frames": [0], "loop": False},
            "flurry": {"frames": [1, 2, 3], "loop": True},
        },
        "references": [SOURCE / "bach-liet-thien-kich/generated.png"],
    },
    "bach-liet-x-bodies": {
        "grid": 4,
        "size": 80,
        "pivot": (40, 64),
        "scale": 0.25,
        "source_margin": 2,
        "anchors": [
            (181, 275), (167, 275), (150, 272), (125, 272),
            (183, 248), (158, 252), (154, 247), (158, 252),
            (176, 228), (162, 225), (151, 226), (139, 225),
            (183, 200), (161, 201), (152, 201), (151, 201),
        ],
        "frames": [f"{direction}_{pose}" for direction in DIAGONALS for pose in POSES],
        "durations": [36, 72, 50, 52] * 4,
        "clips": {
            direction: {"frames": list(range(i * 4, i * 4 + 4)), "loop": True}
            for i, direction in enumerate(DIAGONALS)
        },
        "references": [SOURCE / "bach-liet-thien-kich-v2/generated.png"],
    },
    "bach-liet-x-crescent": {
        "grid": 1,
        "size": 60,
        "scale": 0.043,
        "anchors": [(622, 626)],
        "frames": ["crescent"],
        "durations": [200],
        "clips": {"flight": {"frames": [0], "loop": False}},
        "references": [],
    },
    "bach-liet-x-flurry": {
        "size": 80,
        "pivot": (54, 40),
        "scale": 0.093,
        "anchors": [(477, 317), (523, 316), (503, 325), (498, 326)],
        "frames": ["slender", "heavy", "double_edge", "hooked"],
        "durations": [300] * 4,
        "clips": {
            name: {"frames": [i], "loop": False}
            for i, name in enumerate(("slender", "heavy", "double_edge", "hooked"))
        },
        "references": [SOURCE / "bach-liet-x-crescent/generated.png"],
    },
}


def fingerprint(path):
    return {
        "file": path.relative_to(ASSETS).as_posix(),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf8")


def export(effect, spec):
    src = SOURCE / effect / "generated.png"
    raw = Image.open(src)
    assert "A" in raw.getbands(), f"{effect}: source lacks native alpha"
    source_w, source_h = raw.size
    grid = spec.get("grid", 2)
    assert len(spec["frames"]) == grid * grid
    n, scale = spec["size"], spec["scale"]
    pivot_x, pivot_y = spec.get("pivot", (n // 2, n // 2))
    margin = spec.get("source_margin", 12)
    # The body atlas uses four directional rows. The older FX use one strip.
    sheet_size = (n * grid, n * grid) if grid > 2 else (n * len(spec["frames"]), n)
    sheet = Image.new("RGBA", sheet_size)
    atlas, bounds = {}, []
    for i, name in enumerate(spec["frames"]):
        col, row = i % grid, i // grid
        cell = raw.crop((
            col * source_w // grid, row * source_h // grid,
            (col + 1) * source_w // grid, (row + 1) * source_h // grid,
        )).convert("RGBA")
        w, h = cell.size
        alpha = cell.getchannel("A")
        box = alpha.point(lambda a: 255 if a >= 96 else 0).getbbox()
        assert box and margin <= box[0] < box[2] <= w - margin, (effect, name, box)
        assert margin <= box[1] < box[3] <= h - margin, (effect, name, box)
        # Discard low-opacity speckle while preserving painted soft wind edges.
        cell.putalpha(alpha.point(lambda a: a if a >= 40 else 0))
        cell = cell.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
        ax, ay = spec["anchors"][i]
        dx, dy = pivot_x - round(ax * scale), pivot_y - round(ay * scale)
        frame = Image.new("RGBA", (n, n))
        frame.alpha_composite(cell, (dx, dy))
        box = frame.getchannel("A").point(lambda a: 255 if a >= 96 else 0).getbbox()
        assert box and 2 <= box[0] < box[2] <= n - 2, (effect, name, box)
        assert 2 <= box[1] < box[3] <= n - 2, (effect, name, box)
        bounds.append(box)
        x, y = (col * n, row * n) if grid > 2 else (i * n, 0)
        sheet.alpha_composite(frame, (x, y))
        atlas[name] = {
            "frame": {"x": x, "y": y, "w": n, "h": n},
            "rotated": False,
            "trimmed": False,
            "sourceSize": {"w": n, "h": n},
            "spriteSourceSize": {"x": 0, "y": 0, "w": n, "h": n},
            "pivot": {"x": pivot_x / n, "y": pivot_y / n},
            "duration": spec["durations"][i],
        }
    png = OUTPUT / (effect + ".png")
    meta = png.with_suffix(".json")
    sheet.save(png)
    save_json(meta, {
        "frames": atlas,
        "meta": {"image": png.name, "size": {"w": sheet.width, "h": sheet.height}, "scale": "1"},
    })
    return {
        "status": spec.get("status", "candidate-awaiting-director-review"),
        "artSource": "host_image (OpenAI ImageGen)",
        "model": None,
        "estimateUsd": None,
        "source": fingerprint(src),
        "prompt": fingerprint(src.with_name("prompt.txt")),
        "references": [fingerprint(p) for p in spec["references"]],
        "atlas": fingerprint(meta),
        "png": fingerprint(png),
        "sourceSize": raw.size,
        "canvas": [n, n],
        "pivotPx": [pivot_x, pivot_y],
        "sourceAnchors": spec["anchors"],
        "alphaBounds": bounds,
        "frames": spec["frames"],
        "durationsMs": spec["durations"],
        "clips": {
            key: {"frames": [spec["frames"][i] for i in clip["frames"]], "loop": clip["loop"]}
            for key, clip in spec["clips"].items()
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("effects", choices=SPECS, nargs="*")
    selected = parser.parse_args().effects or SPECS
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = OUTPUT / "manifest.json"
    results = json.loads(manifest.read_text(encoding="utf8")) if manifest.exists() else {}
    for name, data in results.items():
        if data["status"] == "artwork-approved":
            for key in ("source", "prompt", "png", "atlas", "review"):
                if key not in data:
                    continue
                entry = data[key]
                assert fingerprint(ASSETS / entry["file"]) == entry, (name, key)
    for name in selected:
        if results.get(name, {}).get("status") == "artwork-approved":
            continue
        data = results[name] = export(name, SPECS[name])
        print(name, len(data["frames"]), data["canvas"], data["alphaBounds"])
    save_json(manifest, results)
