"""Export Hắc Thiết combat poses and 64 px skill icons from retained source PNGs."""
import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
pipeline_spec = importlib.util.spec_from_file_location(
    "con_luan_renovation", SOURCE.with_name("con_luan_skill_renovation") / "prepare.py")
pipeline = importlib.util.module_from_spec(pipeline_spec)
pipeline_spec.loader.exec_module(pipeline)
base = pipeline.base
EXPORT = base.ROOT / "assets/exports/characters/con_luan_hac_thiet_v04"
CACHE = base.ROOT / ".cache/con-luan-hac-thiet-v04"
BODY, FEET = pipeline.BODY, pipeline.FEET

MONK_ICONS = (
    "con_luan_thien_su", "ngu_loi_chinh_phap_the", "cuong_loi_chan_dia",
    "ngu_loi_chinh_phap_vong", "thien_loi_tran_nhac", "vo_cuc_phong_loi_quyet",
    "huyen_thien_vo_cuc_cong", "con_luan_thien_loi",
)
SWORD_ICONS = (
    "con_luan_kiem_ton", "kinh_loi", "loi_dong_thien_dia",
    "dien_quang_loi_anh", "bao_loi_kiem_canh", "loi_long_thien_tuong",
    "con_luan_kiem_tran",
)


def export_icons():
    output = EXPORT / "icons"
    output.mkdir(parents=True, exist_ok=True)
    for name, ids, rows in (
        ("monk", MONK_ICONS, (0, 418, 800, 1254)),
        ("sword", SWORD_ICONS, (0, 418, 781, 1254)),
    ):
        with Image.open(SOURCE / "generated" / (name + ".png")) as sheet:
            for index, icon in enumerate(ids):
                row, col = divmod(index, 3)
                x0, x1 = col * 418 + 5, (col + 1) * 418 - 5
                y0, y1 = rows[row] + 5, rows[row + 1] - 5
                tile = sheet.crop((x0, y0, x1, y1)).convert("RGBA")
                tile.resize((64, 64), Image.Resampling.LANCZOS).save(output / (icon + ".png"))
    return len(MONK_ICONS) + len(SWORD_ICONS)


def melee_clips():
    pipeline.SOURCE = SOURCE
    raw = list(pipeline.keyed_grid("melee", 3, 4))
    axis = list(pipeline.keyed_grid("axis", 1, 4))
    # Socket positions were measured at the midpoint of the planted boots in
    # each source. Scale stays fixed within each facing, even on raised poses.
    fractions = {
        "right": (.58, .30, .49, .34),
        "down": (.59, .35, .43, .36),
        "up": (.59, .30, .42, .33),
    }
    boots = {"right": (1, 1, 1, .96), "down": (1, 1, 1, .95), "up": (1, 1, 1, 1)}
    rows = {}
    for row, direction in enumerate(fractions):
        cels = raw[row*4:row*4+4]
        scale = 87 / cels[0].height
        rows[direction] = [
            pipeline.place(cel, (round(cel.width*scale), round(cel.height*scale)),
                           (cel.width*x, cel.height*y), FEET, BODY)
            for cel, x, y in zip(cels, fractions[direction], boots[direction], strict=True)
        ]
    for direction, index, cel, pivot, height in (
        ("down", 1, axis[0], (.50, .91), 95),
        ("up", 1, axis[1], (.50, 1), 110),
        ("right", 3, axis[2], (.61, 1), 87),
        ("down", 3, axis[3], (.63, 1), 87),
    ):
        scale = height / cel.height
        rows[direction][index] = pipeline.place(
            cel, (round(cel.width*scale), height),
            (cel.width*pivot[0], cel.height*pivot[1]), FEET, BODY)
    rows["left"] = [cel.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for cel in rows["right"]]
    for direction in pipeline.DIRECTIONS:
        chamber, thrust, raise_hammer, sweep = rows[direction]
        # The active silhouette is shown from the accepted attack tick.
        yield f"melee_1_{direction}", [thrust, chamber], [120, 115]
        yield f"melee_2_{direction}", [sweep, raise_hammer], [135, 100]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--aseprite", required=True)
    args = parser.parse_args()
    EXPORT.mkdir(parents=True, exist_ok=True)
    base.SOURCE = SOURCE
    name = "thien_su_melee"
    stage = CACHE / name
    layout = base.emit(stage, name, BODY, FEET, melee_clips())
    report = base.export(args.aseprite, stage, layout, EXPORT, allow_soft_alpha=True)
    report["skillIcons"] = export_icons()
    (EXPORT / "validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
