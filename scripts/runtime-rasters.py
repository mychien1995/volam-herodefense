"""Lossless delivery copies; approved PNG sources are never modified."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import sys

from PIL import Image, features


def compile_rasters(source, output, cache, rasters):
    output.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    webp_supported = features.check("webp")

    def compile_one(entry):
        original = (source / entry["path"]).read_bytes()
        digest = sha256(original).hexdigest()
        if digest != entry["hash"]:
            raise ValueError(f"PNG changed during staging: {entry['path']}")
        with Image.open(BytesIO(original)) as image:
            rgba = image.convert("RGBA")
            # WebP cannot represent unusual PNG transfer functions or 16-bit data.
            compatible = image.mode in ("RGB", "RGBA", "P", "L", "LA") and not any(
                key in image.info for key in ("icc_profile", "gamma", "chromaticity")
            ) and max(image.size) <= 16383
        pixels = rgba.tobytes()
        candidate = None
        cached = cache / (digest + ".webp")
        if compatible and cached.exists():
            try:
                data = cached.read_bytes()
                with Image.open(BytesIO(data)) as restored:
                    if restored.size == rgba.size and restored.convert("RGBA").tobytes() == pixels:
                        candidate = data
            except (OSError, ValueError):
                pass
        if candidate is None and webp_supported and compatible:
            encoded = BytesIO()
            rgba.save(encoded, format="WEBP", lossless=True, quality=75, method=4, exact=True)
            data = encoded.getvalue()
            with Image.open(BytesIO(data)) as restored:
                if restored.size != rgba.size or restored.convert("RGBA").tobytes() != pixels:
                    raise ValueError(f"Lossless pixel verification failed: {entry['path']}")
            cached.write_bytes(data)
            candidate = data
        # Small or unsupported images retain their exact original PNG bytes.
        use_webp = candidate is not None and len(candidate) < len(original)
        delivered = candidate if use_webp else original
        extension = "webp" if use_webp else "png"
        filename = sha256(delivered).hexdigest() + "." + extension
        (output / filename).write_bytes(delivered)
        return digest, {
            "url": "/assets/immutable/" + filename,
            "sourceBytes": len(original),
            "bytes": len(delivered),
            "format": extension,
        }

    with ThreadPoolExecutor(max_workers=4) as workers:
        return dict(workers.map(compile_one, rasters))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    args = parser.parse_args()
    result = compile_rasters(args.source, args.output, args.cache, json.load(sys.stdin))
    print(json.dumps(result))
