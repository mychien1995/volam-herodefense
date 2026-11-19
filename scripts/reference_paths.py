"""Locate an original reference after a documented move; never replace its identity.

Historical prompts/locks keep their original names and expected hashes. Callers
must still verify those hashes. Missing/unmapped images continue to fail.
"""
import json
from pathlib import Path


def resolve_reference_path(root, path):
    root = Path(root).resolve()
    original = Path(path)
    if not original.is_absolute():
        original = root / original
    if original.exists():
        return original
    try:
        relative = original.relative_to(root).as_posix()
    except ValueError:
        return original
    if not relative.startswith('assets/references/'):
        return original
    inventory = root / 'assets/references/manifest.json'
    if not inventory.is_file():
        return original
    entries = json.loads(inventory.read_text(encoding='utf-8'))['images']
    matches = [entry for entry in entries if entry['originalPath'] == relative]
    if not matches:
        return original
    if len(matches) != 1:
        raise ValueError('Ambiguous historical reference: ' + relative)
    target = (root / matches[0]['path']).resolve()
    target.relative_to((root / 'assets/references').resolve())
    return target
