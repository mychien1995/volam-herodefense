
"""Slice the generated contact stills and match them to production hit captures."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
CAPTURE = REPO / "artifacts/collision-production/contact-v01-gameplay"
DESIGN = json.loads((ROOT / "design.json").read_text(encoding="utf-8-sig"))
SCHOOLS = DESIGN["schools"]
ART = DESIGN["art"]
CASES = DESIGN["cases"]
CELLS = ROOT / "cels"
CONTEXT = ROOT / "gameplay"
FRAME = 64
PIVOT = FRAME // 2
ALPHA_FLOOR = 8

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def sliced_assets() -> tuple[dict, dict]:
    CELLS.mkdir(exist_ok=True)
    built: dict = {}
    sources: dict = {}
    for school, spec in SCHOOLS.items():
        source = ROOT / "source" / f"{school}.png"
        original = Image.open(source).convert("RGBA")
        width, height = original.size
        cols, rows = spec["cols"], spec["rows"]
        sources[school] = {
            "file": source.relative_to(ROOT).as_posix(), "sha256": sha256(source),
            "prompt": f"source/{school}-prompt.txt", "size": [width, height],
            "route": "host_image · ChatGPT ImageGen",
        }
        for asset in ART.values():
            if asset["school"] != school:
                continue
            index = asset["index"]
            i, j = index % cols, index // cols
            rect = tuple(round(v) for v in (i*width/cols, j*height/rows, (i+1)*width/cols, (j+1)*height/rows))
            raw = np.array(original.crop(rect))
            alpha = raw[:, :, 3]
            alpha[alpha < ALPHA_FLOOR] = 0
            strong = Image.fromarray((alpha >= 48).astype(np.uint8) * 255).getbbox()
            if strong is None:
                raise ValueError(f"Empty generated cel {asset['id']}")
            x0, y0, x1, y1 = strong
            strength_margin = min(x0, y0, raw.shape[1]-x1, raw.shape[0]-y1)
            if strength_margin < 7:
                raise ValueError(f"Core of {asset['id']} is too close to a cell edge: {strength_margin}px")
            halo = max(4, round(max(x1-x0, y1-y0) * 0.08))
            bounds = (max(0,x0-halo),max(0,y0-halo),min(raw.shape[1],x1+halo),min(raw.shape[0],y1+halo))
            x0,y0,x1,y1 = bounds
            cropped = raw[y0:y1,x0:x1].copy()
            rgb = cropped[:,:,:3].astype(float) / 255
            matte = cropped[:,:,3].astype(float) / 255
            lightness = rgb.mean(axis=2)
            weight = matte**2 * np.maximum(0, lightness-.74)**2
            if weight.sum() < .01:
                weight = matte**3
            yy,xx = np.indices(matte.shape)
            origin_x = (xx*weight).sum()/weight.sum()
            origin_y = (yy*weight).sum()/weight.sum()
            scale = asset["span"] / max(strong[2]-strong[0],strong[3]-strong[1])
            new_size = (max(1, round((x1-x0)*scale)), max(1, round((y1-y0)*scale)))
            pw = Image.fromarray(cropped).resize(new_size, Image.Resampling.LANCZOS)
            px = PIVOT - round(origin_x * new_size[0] / (x1-x0))
            py = PIVOT - round(origin_y * new_size[1] / (y1-y0))
            if min(px,py) <= 0 or px+new_size[0] >= FRAME or py+new_size[1] >= FRAME:
                raise ValueError(f"Cel {asset['id']} is outside its fixed canvas")
            sprite = Image.new("RGBA",(FRAME,FRAME))
            sprite.alpha_composite(pw,(px,py))
            out = CELLS / f"{asset['id']}.png"
            sprite.save(out)
            rgba = np.asarray(sprite)
            if rgba[PIVOT,PIVOT,3] < 18 and not rgba[PIVOT-3:PIVOT+4,PIVOT-3:PIVOT+4,3].max() >= 48:
                raise ValueError(f"Core detached from pivot in {asset['id']}")
            built[asset["id"]] = {
                **asset, "file": out.relative_to(ROOT).as_posix(), "sha256": sha256(out),
                "canvas": [FRAME,FRAME], "pivot": [PIVOT,PIVOT], "sourceCell": list(rect),
                "sourceCoreInsetPx":strength_margin, "alphaBounds":list(sprite.getbbox()),
            }
    return built,sources

def case_key(case: dict) -> tuple[str,str]:
    id = case["ability"]
    if case["key"] == "F → A":
        return id,"F → A"
    if case["key"].startswith("A"):
        return id,"A"
    if id == "khang_long_huu_hoi":
        return id,"R"
    return id,case["key"][0]

def capture_evidence() -> dict:
    CONTEXT.mkdir(exist_ok=True)
    data = json.loads((CAPTURE / "observations.json").read_text(encoding="utf-8"))
    evidence = {}
    for row in data:
        if not row["verified"] and not any(t["local"].get("captures") for t in row["tries"]):
            continue
        phases = {}
        for t in row["tries"]:
            for snap in t["local"].get("captures", []):
                file = snap["file"]
                shutil.copy2(CAPTURE / file, CONTEXT / file)
                phases[snap["stage"]] = {
                    **snap, "file":f"gameplay/{file}", "hitConfirmedOnPeer": any(
                        event["id"]==snap["hit"]["id"] and event["damage"]==snap["hit"]["damage"]
                        for event in t["remote"]["events"]
                    )
                }
        if phases:
            key = (row["id"],row["key"])
            record = evidence.setdefault(key,{})
            record[row["kind"]] = phases
    return evidence

def label(text: str, at: tuple[int,int], size: int, color: str, *, bold: bool=False) -> None:
    path = Path(r"C:/Windows/Fonts/arialbd.ttf" if bold else r"C:/Windows/Fonts/arial.ttf")
    font = ImageFont.truetype(str(path),size)
    draw.text(at,text,font=font,fill=color,anchor="la")

def contact_sheet(built: dict) -> None:
    global draw
    board = Image.new("RGBA",(1520,806),"#11141c")
    draw = ImageDraw.Draw(board)
    label("Võ Lâm Hero Defense", (35,27),16,"#b7bbc8")
    label("Điểm chạm · Preview V01",(35,52),35,"#f3ede0",bold=True)
    label("35 nét chạm · 5 phái",(1193,65),18,"#ccd0dd")
    for row,(school,spec) in enumerate(SCHOOLS.items()):
        top = 118+row*132
        draw.rounded_rectangle((31,top,1489,top+116),radius=12,fill="#1a1e28",outline="#303747",width=1)
        label(spec["name"],(52,top+41),25,spec["color"],bold=True)
        school_arts=[a for a in built.values() if a["school"]==school]
        for i,a in enumerate(school_arts):
            x=227+i*155
            draw.rounded_rectangle((x,top+13,x+144,top+100),radius=9,fill="#10131b")
            ico=Image.open(ROOT/a["file"]).resize((126,126),Image.Resampling.NEAREST)
            board.alpha_composite(ico,(x+9,top-14))
            label(a["title"],(x+9,top+79),14,"#dbe0e9")
    board.convert("RGB").save(ROOT / "contact-sheet.png")

def emit() -> None:
    built,sources=sliced_assets()
    evidence=capture_evidence()
    contact_sheet(built)
    enriched = [
        {**case,"play":evidence.get(case_key(case),{})}
        for case in CASES
    ]
    manifest = {
        "status":"preview-artwork", "snapshot":"f7bf3032 · M3D production · protocol 42",
        "sources":sources, "cels":built, "schools":SCHOOLS, "cases":enriched,
        "qa":{"alphaFloor":ALPHA_FLOOR,"entries":len(enriched),"cels":len(built),
              "creep":sum("creep" in e["play"] for e in enriched),
              "boss":sum("ly_mac_sau" in e["play"] for e in enriched)},
    }
    (ROOT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (ROOT/"preview-data.js").write_text("window.contactPreview = "+json.dumps(manifest,ensure_ascii=False)+";\n",encoding="utf-8")
    print(json.dumps(manifest["qa"],ensure_ascii=False))

if __name__ == "__main__":
    emit()

