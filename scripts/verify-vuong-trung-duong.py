"""Verify final boss source integrity and renderer-ready isolated raster cels."""
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "assets/source/bosses/vuong-trung-duong"
exports = root / "assets/exports/vuong-trung-duong"
manifest = json.loads((source / "provenance.json").read_text(encoding="utf-8"))

for file, digest in manifest["references"].items():
    assert sha256((root / file).read_bytes()).hexdigest() == digest, file
assert {entry["file"] for entry in manifest["sources"]} == {p.name for p in source.glob("*.png")}
for entry in manifest["sources"]:
    path = source / entry["file"]
    assert sha256(path.read_bytes()).hexdigest() == entry["sha256"], path
    with Image.open(path) as image:
        assert image.mode == "RGBA" and image.size == tuple(entry["size"]), path
        assert sum(image.getchannel("A").histogram()[:48]) >= image.width * image.height * 0.26, path

animation = json.loads((exports / "animation.json").read_text(encoding="utf-8"))
for key, count in (("body", 48), ("effects", 36)):
    atlas = json.loads((exports / f"{key}.json").read_text(encoding="utf-8"))
    names = set(atlas["frames"])
    assert names == set(animation[key]["frames"]) and len(names) == count, key
    image = Image.open(exports / f"{key}.png")
    assert image.mode == "RGBA" and image.size == tuple(atlas["meta"]["size"][k] for k in ("w", "h"))
    for frame, entry in atlas["frames"].items():
        box = entry["frame"]
        x, y, w, h = (box[k] for k in ("x", "y", "w", "h"))
        assert (w, h) == tuple(animation[key]["canvas"]), frame
        assert 0 <= x <= image.width - w and 0 <= y <= image.height - h, frame
        cel = image.crop((x, y, x + w, y + h))
        bounds = cel.getbbox()
        assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < w and bounds[3] < h, (frame, bounds)
        if key == "body":
            assert 89 <= bounds[3] <= 90, (frame, bounds)
    print(f"Vuong Trung Duong {key}: {count} verified RGBA cels")
assert animation["body"]["feet"] == [64, 90]
