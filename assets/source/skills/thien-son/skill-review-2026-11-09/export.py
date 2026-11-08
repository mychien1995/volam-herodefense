"""Register the generated 2x2 FX sheets on stable gameplay pivots."""
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ASSETS = next(p for p in SOURCE.parents if p.name == "assets")
OUTPUT = ASSETS / "exports/skills/thien-son" / SOURCE.name
CONCEPT = ASSETS / "concepts/heroes/thien-son/thien-son-concept-v01.png"
DAO = ASSETS / "exports/characters/visual_improvement_v02/hero_thien_son_dao_idle.png"

# Pixel coordinates within each source cell, measured at the jade hub or
# intersection of the four inward cuts. Use one scale per effect.
SPECS = {
    "bao-vu-cuong-phong": {
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
    w, h = raw.size
    assert w % 2 == h % 2 == 0, f"{effect}: source does not divide into 2x2"
    w, h = w // 2, h // 2
    n, scale = spec["size"], spec["scale"]
    sheet = Image.new("RGBA", (n * 4, n))
    atlas, bounds = {}, []
    for i, name in enumerate(spec["frames"]):
        x, y = (i % 2) * w, (i // 2) * h
        cell = raw.crop((x, y, x + w, y + h)).convert("RGBA")
        alpha = cell.getchannel("A")
        box = alpha.point(lambda a: 255 if a >= 96 else 0).getbbox()
        assert box and 12 <= box[0] < box[2] <= w - 12
        assert 12 <= box[1] < box[3] <= h - 12, (effect, name, box)
        # Discard low-opacity speckle while preserving painted soft wind edges.
        cell.putalpha(alpha.point(lambda a: a if a >= 40 else 0))
        cell = cell.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
        ax, ay = spec["anchors"][i]
        dx, dy = n // 2 - round(ax * scale), n // 2 - round(ay * scale)
        frame = Image.new("RGBA", (n, n))
        frame.alpha_composite(cell, (dx, dy))
        box = frame.getchannel("A").point(lambda a: 255 if a >= 96 else 0).getbbox()
        assert box and 2 <= box[0] < box[2] <= n - 2, (effect, name, box)
        assert 2 <= box[1] < box[3] <= n - 2, (effect, name, box)
        bounds.append(box)
        sheet.alpha_composite(frame, (i * n, 0))
        atlas[name] = {
            "frame": {"x": i * n, "y": 0, "w": n, "h": n},
            "rotated": False,
            "trimmed": False,
            "sourceSize": {"w": n, "h": n},
            "spriteSourceSize": {"x": 0, "y": 0, "w": n, "h": n},
            "pivot": {"x": 0.5, "y": 0.5},
            "duration": spec["durations"][i],
        }
    png = OUTPUT / (effect + ".png")
    meta = png.with_suffix(".json")
    sheet.save(png)
    save_json(meta, {
        "frames": atlas,
        "meta": {"image": png.name, "size": {"w": sheet.width, "h": n}, "scale": "1"},
    })
    return {
        "status": "candidate-awaiting-director-review",
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
        "pivotPx": [n // 2, n // 2],
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
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = {name: export(name, spec) for name, spec in SPECS.items()}
    save_json(OUTPUT / "manifest.json", results)
    for name, data in results.items():
        print(name, len(data["frames"]), data["canvas"], data["alphaBounds"])
