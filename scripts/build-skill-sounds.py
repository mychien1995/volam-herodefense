"""Original deterministic school sound design. No sampled third-party audio.

Requires numpy/scipy and ffmpeg (audio-only Vorbis export). --pilot builds the
representative Thiền Sư A / Chaos slice before the remaining kit is produced.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import wave

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/audio/con-luan-v01"
EXPORT = ROOT / "assets/sounds/skills/con-luan-v01"
SR = 48000

# duration, material, pitch, weight; all timing here is audio design, not combat.
RECIPES = {
    "monk-thrust": (.25, "swing", 210, .65),
    "monk-sweep": (.32, "swing", 155, .75),
    "monk-rising": (.34, "rise", 185, .7),
    "monk-overhead": (.42, "swing", 105, .95),
    "monk-bolt": (.32, "electric", 470, .75),
    "orb": (.23, "electric", 760, .48),
    "sword": (.38, "blade", 390, .8),
    "hit-metal": (.3, "impact", 175, .6),
    "hit-electric": (.28, "impact", 620, .5),
    "stance-ranged": (.48, "rise", 510, .5),
    "stance-melee": (.42, "impact", 145, .5),
    "slam-windup": (.16, "swing", 120, .5),
    "slam-impact": (.85, "thunder", 72, 1),
    "ring": (.65, "ring", 430, .72),
    "hammer-launch": (.38, "swing", 125, .8),
    "hammer-explosion": (.75, "thunder", 88, .9),
    "chaos-start": (1.35, "transform", 75, 1),
    "chaos-loop": (2, "loop", 95, .26),
    "chaos-end": (.65, "dissolve", 140, .52),
    "plant": (.55, "plant", 340, .62),
    "detonate-trigger": (.18, "electric", 850, .45),
    "detonate-impact": (.75, "thunder", 190, .86),
    "dash": (.28, "blade", 640, .6),
    "fan-sweep": (.15, "blade", 780, .48),
    "dragon-launch": (.72, "dragon", 195, .85),
    "dragon-hit": (.7, "thunder", 225, .85),
    "star-windup": (.5, "rise", 370, .65),
    "star-open": (.95, "star", 300, .95),
    "star-loop": (2, "loop", 240, .22),
    "star-pulse": (.38, "ring", 550, .4),
    "star-end": (.8, "dissolve", 460, .5),
}
VARIANTS = {"monk-thrust", "monk-sweep", "monk-rising", "monk-overhead",
            "monk-bolt", "orb", "sword", "hit-metal", "hit-electric", "fan-sweep"}
PILOT = {"monk-thrust", "monk-sweep", "monk-rising", "monk-overhead",
         "hit-metal", "chaos-start", "chaos-loop", "chaos-end"}

OTHER_RECIPES = {
    "ngu-doc": {
        "palm": (.28, "poison", 220, .6), "toxic-palm": (.32, "poison", 320, .72),
        "skull": (.3, "wisp", 370, .6), "poison-hit": (.32, "poison", 190, .52),
        "palm-on": (.5, "poison", 460, .58), "palm-off": (.38, "dissolve", 280, .45),
        "pool-open": (.65, "poison", 145, .72), "pool-loop": (2, "poison-loop", 115, .2),
        "pool-end": (.55, "dissolve", 170, .4),
        "aura-on": (.6, "wisp", 260, .6), "aura-loop": (2, "poison-loop", 180, .18),
        "aura-off": (.45, "dissolve", 210, .4), "counter": (.24, "poison", 650, .38),
        "hands-windup": (.3, "summon", 130, .65), "hands-open": (.85, "summon", 82, .9),
        "hands-loop": (2, "poison-loop", 95, .26), "hands-end": (.75, "wisp", 165, .48),
        "worms": (.5, "swarm", 720, .65), "worm-hit": (.35, "poison", 420, .56),
        "jiangshi-call": (.6, "summon", 125, .72), "jiangshi-emerge": (.45, "poison", 95, .55),
        "jiangshi-attack": (.24, "impact", 110, .45), "jiangshi-fade": (.38, "wisp", 180, .36),
        "mark-launch": (.45, "swarm", 580, .62), "mark-attach": (.25, "poison", 760, .42),
        "mark-detonate": (.72, "poison", 95, .9), "mark-return": (.5, "wisp", 660, .5),
        "zombie-emerge": (.44, "summon", 90, .5), "zombie-attack": (.23, "impact", 90, .38),
        "zombie-fade": (.4, "wisp", 140, .32),
        "reaper-call": (1.15, "summon", 67, .95), "reaper-emerge": (.8, "wisp", 95, .7),
        "reaper-sweep": (.55, "blade", 115, .7), "reaper-wave": (.65, "poison", 155, .72),
        "reaper-slam": (.85, "summon", 62, .9), "reaper-hit": (.28, "poison", 170, .45),
        "reaper-death": (.95, "wisp", 85, .65),
    },
    "duong-mon": {
        "bolt": (.22, "mechanism", 460, .55), "feather": (.25, "blade", 850, .55),
        **{f"needles-{rank}": (.24 + rank * .015, "needle", 980 + rank * 95, .46 + rank * .035) for rank in range(5)},
        "hit-metal": (.23, "impact", 540, .45), "hit-water": (.27, "needle", 1300, .45),
        "hit-wood": (.25, "poison", 550, .4), "hit-earth": (.29, "impact", 190, .5),
        "hit-fire": (.38, "fire", 125, .6),
        "arrows": (.4, "mechanism", 680, .7),
        "flight-open": (.6, "mechanism", 240, .7), "flight-loop": (2, "machine-loop", 165, .18),
        "flight-close": (.45, "mechanism", 190, .55),
        "laser-charge": (.44, "rise", 720, .6), "laser-release": (.48, "laser", 1250, .85),
        "shell-close": (.45, "mechanism", 135, .7), "shell-loop": (2, "machine-loop", 85, .16),
        "shell-open": (.5, "mechanism", 285, .6),
        "flowers-cast": (.35, "mechanism", 310, .65), "flowers-scatter": (.7, "needle", 800, .72),
        "flowers-burst": (.9, "fire", 260, .92),
        "trap-set": (.22, "mechanism", 270, .35), "trap-burst": (.6, "fire", 90, .8),
        "knives-ready": (.2, "mechanism", 450, .45), "knife-shot": (.2, "blade", 930, .5),
        "evade": (.32, "blade", 560, .58), "evade-end": (.32, "dissolve", 620, .35),
        "storm-ready": (.3, "mechanism", 350, .65), "storm-slow": (.45, "needle", 880, .68),
        "storm-poison": (.24, "needle", 1150, .5), "storm-water": (.6, "needle", 1650, .85),
    },
}
OTHER_VARIANTS = {
    "ngu-doc": {"palm", "toxic-palm", "skull", "poison-hit", "worms", "worm-hit", "jiangshi-attack", "zombie-attack"},
    "duong-mon": {"bolt", "feather", "hit-metal", "knife-shot", *[f"needles-{rank}" for rank in range(5)]},
}


def band(x, low, high):
    return signal.sosfilt(signal.butter(2, [low, high], btype="bandpass", fs=SR, output="sos"), x)


def synth(cue, variant):
    duration, material, pitch, weight = RECIPES[cue]
    seed = int.from_bytes(hashlib.sha256(f"{cue}:{variant}".encode()).digest()[:4], "little")
    rng = np.random.default_rng(seed)
    n = round(duration * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    pitch *= 1 + (variant - 1) * .035
    # Smooth, band-limited air plus inharmonic metal modes, never a single beep.
    air = band(noise, 350, 6500)
    rumble = band(noise, 35, 550)
    spark = band(noise, 1700, 10500)
    metal = sum(np.sin(2 * np.pi * pitch * ratio * t + rng.uniform(-.1, .1))
                * np.exp(-t * decay) * amp
                for ratio, decay, amp in [(1, 12, .33), (2.71, 18, .16), (4.13, 25, .10)])
    phase = 2 * np.pi * np.cumsum(pitch * (1.6 * np.exp(-t * 16) + .55)) / SR
    body = np.sin(phase) * np.exp(-t * 17)
    if material.endswith("loop"):
        # Periodic Fourier noise + integral-cycle modes give a seamless loop.
        bins = np.fft.rfftfreq(n, 1 / SR)
        spectrum = np.fft.rfft(noise)
        spectrum *= np.exp(-bins / 1700) * (1 - np.exp(-bins / 90))
        bed = np.fft.irfft(spectrum, n)
        pulse = .7 + .3 * np.sin(2 * np.pi * 2 * t)
        x = bed * pulse + .12 * np.sin(2 * np.pi * round(pitch * duration) / duration * t)
        if material == "poison-loop":
            x += .04 * np.sin(2 * np.pi * 257 * t) * np.sin(2 * np.pi * 13 * t)
        if material == "machine-loop":
            x += .1 * np.sin(2 * np.pi * 61 * t) * (1 + np.sin(2 * np.pi * 7 * t))
        x /= max(np.max(np.abs(x)), 1e-9)
        return x * weight * .55
    if material in {"swing", "blade", "rise"}:
        peak = duration * (.68 if material == "rise" else .27)
        env = np.exp(-((t - peak) / (duration * .24)) ** 2)
        chirp = signal.chirp(t, pitch * (.6 if material == "rise" else 3), duration,
                             pitch * (3 if material == "rise" else .7), method="logarithmic")
        x = air * env * .8 + chirp * env * .12 + metal * .25
    elif material in {"poison", "swarm", "wisp", "summon"}:
        bubbles = band(noise, 180, 1800) * (1 + np.sin(2 * np.pi * (37 if material == "swarm" else 17) * t))
        drift = signal.chirp(t, pitch * 2.4, duration, pitch * .42, method="logarithmic")
        envelope = np.minimum(1, t / .018) * np.exp(-t * (3 if material in {"summon", "wisp"} else 8))
        x = (bubbles * .7 + air * .18 + drift * .18) * envelope + body * .25
        if material == "summon":
            x += (rumble * .9 + np.sin(2 * np.pi * pitch * t) * .2) * envelope
        if material == "swarm":
            x += spark * np.maximum(0, np.sin(2 * np.pi * 32 * t)) ** 6 * np.exp(-t * 6) * .7
        if material == "wisp":
            x += band(noise, 550, 4500) * np.sin(np.pi * t / duration) * .5
    elif material in {"mechanism", "needle", "laser", "fire"}:
        x = metal * 1.1 + air * np.exp(-t * 18) * .6
        if material == "mechanism":
            for when in [0, .035, .075]:
                u = np.maximum(0, t - when)
                x += (t >= when) * (spark * .3 + np.sin(2 * np.pi * pitch * 1.7 * u) * .2) * np.exp(-u * 55)
        elif material == "needle":
            x += spark * (.25 + .75 * np.sin(2 * np.pi * 47 * t) ** 8) * np.exp(-t * 9) * .8
        elif material == "laser":
            env = np.minimum(1, t / .006) * np.exp(-t * 8)
            x += (signal.chirp(t, 2500, duration, 700) * .3 + spark * .65) * env
        else:
            x += rumble * np.exp(-t * 7) * 1.8 + body * .8 + spark * np.exp(-t * 30)
    elif material == "electric":
        crackle = spark * np.exp(-t * 23) * (.5 + .5 * np.sin(2 * np.pi * 91 * t) ** 2)
        x = crackle + metal * .65 + body * .18
    elif material in {"impact", "plant"}:
        x = air * np.exp(-t * 38) * .65 + metal * 1.2 + body * .8 + rumble * np.exp(-t * 15)
    elif material in {"thunder", "transform", "star", "dragon"}:
        lead = .11 if material == "transform" else .025
        u = np.maximum(0, t - lead)
        x = rumble * np.exp(-u * (4 if material == "transform" else 7)) * 1.7
        x += spark * np.exp(-u * 32) * .8 + metal * .65 + body * .8
        x *= np.minimum(1, t / max(lead, .004))
        # Delayed cracks and inharmonic electric arcs lend size without speech.
        for when, freq in [(.075, 690), (.145, 1130), (.24, 420)]:
            u = np.maximum(0, t - when)
            x += (t >= when) * (.16 * np.sin(2 * np.pi * freq * u) + spark * .2) * np.exp(-u * 22)
        if material == "dragon":
            x += band(noise, 180, 1500) * np.sin(2 * np.pi * 43 * t) * np.exp(-t * 5) * .9
        if material == "star":
            for i in range(5):
                u = np.maximum(0, t - i * .026)
                x += (t >= i * .026) * np.sin(2 * np.pi * (pitch + i * 83) * u) * np.exp(-u * 15) * .15
    elif material == "ring":
        env = np.sin(np.pi * np.minimum(t / duration, 1)) * np.exp(-t * 3)
        x = air * env + signal.chirp(t, pitch * 2.3, duration, pitch * .65) * env * .3
    else:  # dissolve
        x = air * np.exp(-t * 7) * .5 + metal * .9
    # Short early reflections, high-pass removal of DC, and clean endpoints.
    dry = x.copy()
    for delay, gain in [(.027, .16), (.053, .10), (.089, .06)]:
        offset = round(delay * SR)
        x[offset:] += dry[:-offset] * gain
    x = signal.sosfilt(signal.butter(2, 32, btype="highpass", fs=SR, output="sos"), x)
    x = np.tanh(x * 1.25)
    x *= np.minimum(1, t / .003) * np.minimum(1, (duration - t) / .025)
    x /= max(np.max(np.abs(x)), 1e-9)
    return x * weight * .72


def main():
    global RECIPES, VARIANTS, SOURCE, EXPORT
    parser = argparse.ArgumentParser()
    parser.add_argument("--pilot", action="store_true")
    parser.add_argument("--school", choices=["con-luan", "ngu-doc", "duong-mon"], default="con-luan")
    args = parser.parse_args()
    if args.school != "con-luan":
        RECIPES = OTHER_RECIPES[args.school]
        VARIANTS = OTHER_VARIANTS[args.school]
    SOURCE = ROOT / "assets/source/audio" / f"{args.school}-v01"
    EXPORT = ROOT / "assets/sounds/skills" / f"{args.school}-v01"
    SOURCE.mkdir(parents=True, exist_ok=True)
    EXPORT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "status": "candidate-awaiting-listening-review",
                "origin": "Original deterministic additive/subtractive synthesis; no third-party samples or model output.",
                "generator": "scripts/build-skill-sounds.py",
                "generatorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "sampleRate": SR,
                "channels": 1, "masterFormat": "PCM16 WAV", "runtimeFormat": "Ogg Vorbis q5",
                "school": args.school, "pilot": args.pilot, "clips": []}
    for cue in RECIPES:
        pilot = PILOT if args.school == "con-luan" else ({"palm", "toxic-palm", "palm-on", "palm-off", "hands-windup", "hands-open", "hands-loop", "hands-end", "poison-hit"} if args.school == "ngu-doc" else {"bolt", "flowers-cast", "flowers-scatter", "flowers-burst", "hit-metal"})
        if args.pilot and cue not in pilot:
            continue
        for variant in range(2 if cue in VARIANTS else 1):
            key = f"{cue}-{variant + 1}" if cue in VARIANTS else cue
            samples = synth(cue, variant)
            wav = SOURCE / f"{key}.wav"
            ogg = EXPORT / f"{key}.ogg"
            memory = io.BytesIO()
            with wave.open(memory, "wb") as out:
                out.setnchannels(1)
                out.setsampwidth(2)
                out.setframerate(SR)
                out.writeframes(np.round(samples * 32767).astype("<i2").tobytes())
            content = memory.getvalue()
            unchanged = wav.exists() and wav.read_bytes() == content
            if not unchanged:
                wav.write_bytes(content)
            if not unchanged or not ogg.exists():
                subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", str(wav),
                                "-c:a", "libvorbis", "-q:a", "5", str(ogg)], check=True)
            manifest["clips"].append({"key": key, "cue": cue, "loop": RECIPES[cue][1].endswith("loop"),
                                      "duration": len(samples) / SR,
                                      "peak": round(float(np.max(np.abs(samples))), 6),
                                      "rms": round(float(np.sqrt(np.mean(samples ** 2))), 6),
                                      "wavSha256": hashlib.sha256(wav.read_bytes()).hexdigest(),
                                      "oggSha256": hashlib.sha256(ogg.read_bytes()).hexdigest(),
                                      "bytes": ogg.stat().st_size})
    (EXPORT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"pilot": args.pilot, "clips": len(manifest["clips"]),
                      "oggBytes": sum(x["bytes"] for x in manifest["clips"])}))


if __name__ == "__main__":
    main()
