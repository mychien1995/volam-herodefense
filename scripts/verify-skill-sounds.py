"""Validate original masters and decoded runtime audio (no recordings)."""
import argparse
import hashlib
import json
import runpy
from pathlib import Path
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def verify(school):
    export = ROOT / "assets/sounds/skills" / f"{school}-v01"
    manifest = json.loads((export / "manifest.json").read_text(encoding="utf8"))
    assert not manifest["pilot"], "Full delivery must contain the entire kit"
    design = runpy.run_path(str(ROOT / manifest["generator"]))
    recipes = design["RECIPES"] if school == "con-luan" else design["OTHER_RECIPES"][school]
    variants = design["VARIANTS"] if school == "con-luan" else design["OTHER_VARIANTS"][school]
    expected = {f"{cue}-{v + 1}" if cue in variants else cue for cue in recipes for v in range(2 if cue in variants else 1)}
    assert {clip["key"] for clip in manifest["clips"]} == expected, "Incomplete sound inventory"
    assert {file.stem for file in export.glob("*.ogg")} == expected
    assert len({clip["key"] for clip in manifest["clips"]}) == len(manifest["clips"])
    assert hashlib.sha256((ROOT / manifest["generator"]).read_bytes()).hexdigest() == manifest["generatorSha256"]
    report = []
    for clip in manifest["clips"]:
        wav = ROOT / "assets/source/audio" / f"{school}-v01" / (clip["key"] + ".wav")
        ogg = export / (clip["key"] + ".ogg")
        assert hashlib.sha256(wav.read_bytes()).hexdigest() == clip["wavSha256"], wav
        assert hashlib.sha256(ogg.read_bytes()).hexdigest() == clip["oggSha256"], ogg
        with wave.open(str(wav), "rb") as master:
            assert (master.getnchannels(), master.getsampwidth(), master.getframerate()) == (1, 2, 48000), wav
            assert abs(master.getnframes() / 48000 - clip["duration"]) < .001, wav
            samples = np.frombuffer(master.readframes(master.getnframes()), dtype="<i2") / 32768
        assert np.max(np.abs(samples)) < .9 and np.sqrt(np.mean(samples ** 2)) > .005, wav
        if clip["loop"]:
            assert abs(float(samples[0] - samples[-1])) < .03, f"Loop seam: {wav}"
        else:
            assert max(abs(float(samples[0])), abs(float(samples[-1]))) < .002, f"Endpoint click: {wav}"
        info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=duration,sample_rate", "-of", "json", str(ogg)], check=True, capture_output=True, text=True).stdout)["streams"][0]
        assert int(info["sample_rate"]) == 48000 and abs(float(info["duration"]) - clip["duration"]) < .001, ogg
        # ffmpeg can expose terminal Vorbis packet padding on raw export.
        raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(ogg), "-t", str(clip["duration"]), "-f", "f32le", "-ac", "1", "-ar", "48000", "pipe:1"], check=True, capture_output=True).stdout
        decoded = np.frombuffer(raw, dtype="<f4")
        assert abs(len(decoded) / 48000 - clip["duration"]) < .015, ogg
        peak = float(np.max(np.abs(decoded)))
        rms = float(np.sqrt(np.mean(decoded ** 2)))
        assert np.all(np.isfinite(decoded)) and .005 < rms and peak < .98, ogg
        report.append({"key": clip["key"], "decodedPeak": round(peak, 5), "decodedRms": round(rms, 5)})
    return {"school": school, "status": "PASS", "clips": len(report), "oggBytes": sum(c["bytes"] for c in manifest["clips"]), "maxDecodedPeak": max(r["decodedPeak"] for r in report)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--school", choices=["con-luan", "ngu-doc", "duong-mon"])
    args = parser.parse_args()
    for school in ([args.school] if args.school else ["con-luan", "ngu-doc", "duong-mon"]):
        print(json.dumps(verify(school)))
