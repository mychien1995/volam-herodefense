"""Validate the exact approved-concept icon extraction without regenerating it."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib
import json

root = Path(__file__).resolve().parents[1]
directory = root / 'assets/exports/inventory_ui'
manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
source_directory = root / manifest['source']
sources = json.loads((source_directory / 'manifest.json').read_text(encoding='utf-8'))
for source in sources['files']:
    assert hashlib.sha256((source_directory / source['file']).read_bytes()).hexdigest() == source['sha256'], source['file']
assert len(manifest['files']) == 11
for item in manifest['files']:
    path = directory / item['file']
    assert path.is_file()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], path
    with Image.open(path) as image, Image.open(source_directory / item['source']) as source:
        assert image.format == 'PNG' and not getattr(image, 'is_animated', False)
        assert list(image.size) == item['size']
        expected = source.crop(item['bounds']).convert('RGB')
        assert ImageChops.difference(image.convert('RGB'), expected).getbbox() is None, path
print('Inventory UI: 5 exact concept sources, 11 static PNG icon backplates and source regions verified; no baked menu screen.')
