"""Build the self-contained Phaser review from retained art and two candidate sheets."""

import base64
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation


HERE = Path(__file__).resolve().parent
ROOT = next(parent for parent in HERE.parents if (parent / "pnpm-workspace.yaml").exists())
PUBLIC = ROOT / "apps/game-client/public/assets"
ART = ROOT / "assets"
RESAMPLING = Image.Resampling
ACTORS = (
    "forest_truc_xa", "forest_doc_chu", "forest_son_vien", "forest_moc_linh",
    "desert_xac_uop", "desert_cu_nhan_sa_thach", "beach_cua_khong_lo",
    "beach_hai_tac_hoa_phao", "beach_hai_vu", "hell_xich_quy",
)
EFFECTS = {
    "forest": (
        "truc_xa_venom_release", "truc_xa_venom_projectile_right",
        "truc_xa_venom_impact", "doc_chu_web_projectile_right",
        "doc_chu_web_impact", "son_vien_windup_dust", "son_vien_slam_impact",
        "son_vien_pebble_scatter", "moc_linh_root_emerge",
    ),
    "beach": (
        "pincer_impact", "muzzle_flash", "cannon_projectile", "cannon_impact",
        "water_splash", "water_droplets",
    ),
}
NEW_SHEETS = {
    "hazard-source.png": (
        ("geyser", 0.53, [239, 239, 263, 263]),
        ("firetrap", 0.51, [244, 244, 245, 245]),
        ("quicksand", 0.64, [167, 167, 167, 167]),
        ("dart", 0.29, [150, 150, 150, 150]),
    ),
    "combat-source.png": (
        ("curse", 0.50, [187, 187, 187, 187]),
        ("sandstone", 0.42, [214, 214, 214, 214]),
        ("tide", 0.48, [205, 205, 205, 205]),
        ("claw", 0.44, [151, 151, 151, 151]),
    ),
}

frames = {}
clips = {}
sources = {}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def track(path, usage):
    try:
        display = path.relative_to(ROOT).as_posix()
    except ValueError:
        display = str(path)
    sources[display] = {"usage": usage, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def add(name, image, anchor, duration):
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise ValueError(f"Empty cel: {name}")
    if name in frames:
        raise ValueError(f"Duplicate cel: {name}")
    cropped = image.crop(bounds)
    frames[name] = (cropped, (anchor[0] - bounds[0], anchor[1] - bounds[1]))
    return [name, duration]


def atlas_cel(image, atlas_row):
    box = atlas_row["frame"]
    x, y, w, h = (box[key] for key in ("x", "y", "w", "h"))
    if atlas_row.get("rotated"):
        raise ValueError("Unexpected rotated source frame")
    if x < 0 or y < 0 or x + w > image.width or y + h > image.height:
        raise ValueError("Source atlas frame out of bounds")
    cropped = image.crop((x, y, x + w, y + h))
    if not atlas_row.get("trimmed"):
        return cropped
    size = atlas_row["sourceSize"]
    offset = atlas_row["spriteSourceSize"]
    expanded = Image.new("RGBA", (size["w"], size["h"]))
    expanded.paste(cropped, (offset["x"], offset["y"]))
    return expanded


def extract_clip(key, image, atlas, prefix, pivot):
    matches = sorted(
        ((name, row) for name, row in atlas.items() if name.startswith(prefix + "_")),
        key=lambda pair: int(Path(pair[0]).stem.rsplit("_", 1)[-1]),
    )
    if not matches:
        raise ValueError(f"No source frames for {key}")
    clips[key] = []
    for name, row in matches:
        cel = atlas_cel(image, row)
        anchor = (round(cel.width * pivot[0]), round(cel.height * pivot[1]))
        clips[key].append(add(f"{key}/{name}", cel, anchor, row.get("duration", 95)))


def import_retained():
    release = read_json(ART / "reviews/creeps/motion-v08/integration.json")
    definitions = {entry["id"]: entry for entry in release["assets"]}
    manifests = {
        "forest": PUBLIC / "forest_creep_review/runtime-manifest.json",
        **{zone: PUBLIC / zone / "manifest.json" for zone in ("desert", "beach", "hell")},
    }
    pivots = {
        row["id"]: row["footPivot"]
        for path in manifests.values() for row in read_json(path)["assets"]
    }
    for actor in ACTORS:
        definition = definitions[actor]
        raster = ROOT / definition["raster"]
        atlas_path = ROOT / definition["atlas"]
        for path, digest in ((raster, "sha256"), (atlas_path, "atlasSha256")):
            track(path, "Motion v08, retained body cels")
            if sources[path.relative_to(ROOT).as_posix()]["sha256"] != definition[digest]:
                raise ValueError(f"Approved Motion v08 hash mismatch: {path}")
        image = Image.open(raster).convert("RGBA")
        atlas = read_json(atlas_path)["frames"]
        for pose in ("idle", "basic_attack"):
            source_pose = "attack" if actor.startswith("desert_") and pose == "basic_attack" else pose
            extract_clip(f"{actor}.{pose}", image, atlas, f"{source_pose}_right", pivots[actor])

    runtime = ART / "exports/renovation-v1/runtime"
    hero_image = runtime / "hero_thien_son_dao.png"
    hero_atlas = runtime / "hero_thien_son_dao.json"
    track(hero_image, "Retained Thiên Sơn Đao used as the target in preview")
    track(hero_atlas, "Retained hero frame rectangles")
    image = Image.open(hero_image).convert("RGBA")
    atlas = read_json(hero_atlas)["frames"]
    for pose, direction in (("idle", "left"), ("idle", "down"), ("walk", "right"), ("walk", "down")):
        extract_clip(f"hero.{pose}.{direction}", image, atlas, f"{pose}_{direction}", (0.5, 224 / 256))

    for zone, sequences in EFFECTS.items():
        directory = ART / "effects/dungeons" / zone
        raster, atlas_path = directory / "spritesheet.png", directory / "atlas.json"
        track(raster, "Retained dungeon VFX")
        track(atlas_path, "Retained dungeon VFX metadata")
        image = Image.open(raster).convert("RGBA")
        atlas = read_json(atlas_path)["frames"]
        for sequence in sequences:
            extract_clip(sequence, image, atlas, sequence, (0.5, 0.5))


def chroma_key(image, tone):
    pixels = np.array(image.convert("RGB"), dtype=np.int16)
    r, g, b = np.moveaxis(pixels, 2, 0)
    key = (r >= 207) & (b >= 159) & (g < 99) & (np.abs(r - b) < 87)
    # Remove chroma contamination only near the keyed edge, keeping interior violet detail.
    edge = binary_dilation(key, iterations=3) & ~key
    magenta_fringe = edge & (r > 110) & (b > 130) & (np.minimum(r, b) - g > 18)
    key |= magenta_fringe
    spill = binary_dilation(key, iterations=3) & ~key
    if tone != "cool":
        pixels[:, :, 2] = np.where(spill & (r > g + 10), np.minimum(b, g + 5), b)
    if tone != "warm":
        pixels[:, :, 0] = np.where(spill & (b > g + 5), np.minimum(r, g + 9), r)
    rgba = np.dstack((pixels, np.where(key, 0, 255))).astype(np.uint8)
    rgba[key] = 0
    return Image.fromarray(rgba)


def import_candidates():
    for filename, rows in NEW_SHEETS.items():
        path = HERE / filename
        track(path, "New VFX concept cels via Codex ImageGen, pending approval")
        sheet = Image.open(path)
        for row_index, (key, scale, anchor_rows) in enumerate(rows):
            clips[key] = []
            for col in range(4):
                x0, x1 = (round(sheet.width * n / 4) for n in (col, col + 1))
                y0, y1 = (round(sheet.height * n / 4) for n in (row_index, row_index + 1))
                tone = "cool" if key in ("geyser", "tide") else "neutral" if key == "dart" else "warm"
                cel = chroma_key(sheet.crop((x0, y0, x1, y1)), tone)
                bounds = cel.getchannel("A").getbbox()
                if not bounds or min(bounds[0], bounds[1], cel.width - bounds[2], cel.height - bounds[3]) < 4:
                    raise ValueError(f"Bad gutter or empty source cel: {filename} {key}/{col}: {bounds}")
                size = (round(cel.width * scale), round(cel.height * scale))
                resized = cel.resize(size, RESAMPLING.NEAREST)
                clips[key].append(add(f"{key}/{col}", resized, (size[0] // 2, round(anchor_rows[col] * scale)), 95))

        if filename == "combat-source.png":
            # Reuse the detached left-hand chunk from the sandstone design at throw scale.
            chunk = chroma_key(sheet.crop((667, 452, 714, 493)), "warm")
            chunk = chunk.resize((23, 20), RESAMPLING.NEAREST)
            clips["rock"] = [add("rock/0", chunk, (11, 10), 100)]


def import_ground():
    views = {
        "forest": (328, 124), "desert": (320, 126), "sea": (464, 198),
        "hell": (323, 122), "arena": (305, 135),
    }
    for zone, (x, y) in views.items():
        version = "v2" if zone == "arena" else "v1"
        path = ART / f"exports/renovation-{version}/{zone}-ground.png"
        track(path, "Retained ground texture, cropped to preview")
        ground = Image.open(path).convert("RGBA").crop((x, y, x + 824, y + 448))
        add(f"ground/{zone}", ground, (0, 0), 0)


def pack():
    packed = Image.new("RGBA", (2048, 2048))
    definitions, anchors = {}, {}
    x, y, row_height = 2, 2, 0
    for key, (cel, anchor) in sorted(frames.items(), key=lambda item: -item[1][0].height):
        w, h = cel.size
        if x + w + 2 > packed.width:
            x, y, row_height = 2, y + row_height + 2, 0
        if y + h + 2 > packed.height:
            raise ValueError("Review atlas exceeded 2048px")
        packed.paste(cel, (x, y))
        definitions[key] = {"frame": {"x": x, "y": y, "w": w, "h": h}}
        anchors[key] = [anchor[0] / w, anchor[1] / h]
        x += w + 2
        row_height = max(row_height, h)
    buffer = io.BytesIO()
    packed.crop((0, 0, packed.width, y + row_height + 2)).save(buffer, format="PNG", optimize=True)
    return {
        "atlas": {"frames": definitions},
        "image": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii"),
        "anchors": anchors,
        "clips": clips,
    }


def main():
    import_retained()
    import_candidates()
    import_ground()
    data = pack()
    phaser_path = ROOT / "apps/game-client/node_modules/phaser/dist/phaser.min.js"
    phaser = phaser_path.read_text(encoding="utf-8").split("//# sourceMappingURL=")[0]
    if "</script" in phaser.lower():
        raise ValueError("Unexpected closing HTML script tag in local Phaser build")
    html = (HERE / "preview.template.html").read_text(encoding="utf-8")
    for marker, value in (
        ("/*__PHASER__*/", phaser),
        ("/*__ASSETS__*/", json.dumps(data, ensure_ascii=False, separators=(",", ":"))),
        ("/*__PREVIEW__*/", (HERE / "preview.js").read_text(encoding="utf-8")),
    ):
        if html.count(marker) != 1:
            raise ValueError(f"Missing or duplicate marker: {marker}")
        html = html.replace(marker, value)
    (HERE / "index.html").write_text(html, encoding="utf-8")
    manifest = {
        "status": "Preview candidate, awaiting director approval",
        "sourceRoute": "Codex ImageGen for two candidate sheets; retained repository raster for existing art",
        "playback": "Scripted Phaser 4.2.1, local/offline, no gameplay or network simulation",
        "viewport": [824, 448],
        "frameCount": len(frames),
        "clipCount": len(clips),
        "clips": clips,
        "sources": sources,
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Packed {len(frames)} atlas frames, {len(clips)} clips, {len(sources)} source files")


if __name__ == "__main__":
    main()
