"""Validate this revision's files and retained reference bytes, not motion/gameplay."""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image

bundle = Path(__file__).resolve().parent
root = bundle.parents[3]
path = bundle / 'manifest.json'
manifest = json.loads(path.read_text(encoding='utf-8'))
old = json.loads((bundle.parent / 'v01/manifest.json').read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert len(manifest['items']) == 2
assert manifest['status'] == 'PENDING_DIRECTOR_REVIEW'
checked = []
for item in manifest['items'] + manifest['iterations']:
    image_path = bundle / item['file']
    with Image.open(image_path) as image:
        image.verify()
    with Image.open(image_path) as image:
        assert image.format == 'PNG'
        assert image.size == (1536, 1024)
        item['dimensions'] = list(image.size)
        item['mode'] = image.mode
    item['sha256'] = sha(image_path)
    assert item['sha256'] == sha(item['source_path'])
    if 'prompt' in item:
        item['prompt_sha256'] = sha(bundle / item['prompt'])
        item['reference_sha256'] = sha(item['reference'])
        old_item = next(x for x in old['items'] if x['id'] == item['id'])
        assert item['reference_sha256'] == old_item['sha256'], 'V01 reference changed'
    checked.append(item['file'])
correction = manifest['correction']
correction['prompt_sha256'] = sha(bundle / correction['prompt'])
correction['reference_sha256'] = sha(bundle / correction['reference'])
links = 0
for document in [bundle / 'README.md', bundle.parent / 'v01/README.md', root / 'docs/SKILL_REVISE_2026_11_22.md']:
    for target in re.findall(r'\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
        if '://' not in target and not target.startswith('#'):
            assert (document.parent / target.split('#')[0]).exists(), target
            links += 1
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
report = {'result': 'PASS', 'scope': 'PNG decode/dimensions, source-copy SHA256, unchanged v01 image hashes, prompts, reference metadata and documentation links',
          'final_images': 2, 'retained_iteration_images': 1, 'links_checked': links,
          'files': checked, 'animation_checked': False, 'runtime_checked': False,
          'director_approved': False}
(bundle / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
