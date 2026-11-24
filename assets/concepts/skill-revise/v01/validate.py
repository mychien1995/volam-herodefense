"""Validate only this static concept bundle; does not validate gameplay or motion."""
from pathlib import Path
import hashlib
import json
import re
from PIL import Image

bundle = Path(__file__).resolve().parent
root = bundle.parents[3]
manifest_path = bundle / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
assert len(manifest['items']) == 10
assert manifest['status'] == 'PENDING_DIRECTOR_REVIEW'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

items = []
for entry in manifest['items']:
    path = bundle / entry['file']
    source = Path(entry['source_path'])
    prompt = bundle / entry['prompt']
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        size, mode = list(image.size), image.mode
        assert image.format == 'PNG', path
        assert size == [1536, 1024], (path, size)
    assert sha(path) == sha(source), f'Copy differs from generated original: {path}'
    assert prompt.read_text(encoding='utf-8').startswith('Use case: stylized-concept.')
    entry['sha256'] = sha(path)
    entry['dimensions'] = size
    entry['mode'] = mode
    entry['prompt_sha256'] = sha(prompt)
    entry['reference_hashes'] = [
        {'path': ref, 'sha256': sha(Path(ref))}
        for ref in entry['identity_references']
    ]
    items.append({'id': entry['id'], 'dimensions': size, 'mode': mode,
                  'source_copy_equal': True, 'status': 'PENDING_DIRECTOR_REVIEW'})

links = []
for document in [bundle / 'README.md', root / 'docs/SKILL_REVISE_2026_11_22.md']:
    content = document.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^)]+)\)', content):
        if '://' in target or target.startswith('#'):
            continue
        resolved = document.parent / target.split('#')[0]
        assert resolved.exists(), f'Broken link {target} in {document}'
        links.append(target)

manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
report = {'scope': 'PNG decode, dimensions, SHA256/source copy, prompt and reference metadata, documentation links',
          'result': 'PASS', 'png_count': len(items), 'links_checked': len(links), 'items': items,
          'animation_checked': False, 'runtime_checked': False, 'director_approved': False}
(bundle / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'result': 'PASS', 'png_count': len(items), 'links_checked': len(links),
                  'scope': report['scope'], 'director_approved': False}, ensure_ascii=False))
