"""Export individual opaque icon backplates from the approved original UI concepts.

No illustration generation, screenshot-as-menu or animation is performed here.
Frames reuse retained ART-01 nine-slice PNGs; labels and state remain live DOM.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/concept/inventory-merchant-hud-v01'
DEST = ROOT / 'assets/exports/inventory_ui'
DEST.mkdir(parents=True, exist_ok=True)
manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
sources = {entry['file']: entry for entry in manifest['files']}
for name, entry in sources.items():
    assert hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() == entry['sha256'], name

# Tight artwork-only regions: no baked labels, counts, levels, or prices.
regions = {
    'weapon': ('04-inventory.png', (389, 264, 471, 335)),
    'armor': ('04-inventory.png', (390, 421, 468, 492)),
    'hat': ('04-inventory.png', (691, 265, 763, 331)),
    'boots': ('02-merchant-equipment.png', (656, 505, 778, 645)),
    'potion_hp': ('03-merchant-potions.png', (850, 301, 1002, 434)),
    'potion_mp': ('03-merchant-potions.png', (390, 531, 544, 673)),
    'thanh_tam': ('05-merchant-crafting.png', (380, 522, 487, 600)),
    'blink': ('05-merchant-crafting.png', (694, 515, 810, 600)),
    'needle': ('05-merchant-crafting.png', (1038, 517, 1145, 592)),
    'jade_pair': ('05-merchant-crafting.png', (725, 363, 794, 422)),
    'wheel': ('04-inventory.png', (974, 367, 1041, 436)),
}
exports = []
for name, (source, bounds) in regions.items():
    with Image.open(SOURCE / source) as image:
        tile = image.crop(bounds).convert('RGB')
        tile.save(DEST / f'{name}.png')
    path = DEST / f'{name}.png'
    exports.append({'id': name, 'file': path.name, 'source': source, 'bounds': bounds,
                    'size': list(tile.size), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
output = {
    'version': 1, 'date': '2026-11-02', 'source': 'assets/concept/inventory-merchant-hud-v01',
    'source_manifest': 'assets/concept/inventory-merchant-hud-v01/manifest.json',
    'provenance': 'Original built-in imagegen concepts; director approved concept and requested integration 2026-11-02. Deterministic artwork-only icon extraction, opaque textured backplates. Not gameplay screenshots or whole-window textures.',
    'status': 'runtime_approved_2026-11-02',
    'frame': 'Retained assets/exports/arena_art01/panel_frame.png nine-slice, unchanged',
    'animation': 'Static UI icons, no animation tags/pivots or authoritative effects',
    'files': exports,
}
(DEST / 'manifest.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Exported {len(exports)} approved-concept icon backplates to {DEST}')
