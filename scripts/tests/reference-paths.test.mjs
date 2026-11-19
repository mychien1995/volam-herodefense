import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('historical reference moves preserve exact identity/hash and fail closed on tampering or escaping paths', () => {
  const code = `
import sys, json, tempfile, hashlib
from pathlib import Path
sys.path.insert(0, str(Path('scripts').resolve()))
from reference_paths import resolve_reference_path
with tempfile.TemporaryDirectory(prefix='volam-reference-resolve-') as directory:
    root=Path(directory); refs=root/'assets/references'; refs.mkdir(parents=True)
    original='assets/references/old.png'; moved='assets/references/mood/correct.png'
    target=root/moved; target.parent.mkdir(); target.write_bytes(b'original PNG bytes')
    expected=hashlib.sha256(target.read_bytes()).hexdigest()
    entries=[dict(originalPath=original,path=moved,sha256=expected)]
    manifest=refs/'manifest.json'
    manifest.write_text(json.dumps(dict(images=entries)),encoding='utf-8')
    assert resolve_reference_path(root,original)==target
    assert resolve_reference_path(root,root/original)==target
    assert hashlib.sha256(resolve_reference_path(root,original).read_bytes()).hexdigest()==expected
    target.write_bytes(b'tampered PNG bytes')
    assert hashlib.sha256(resolve_reference_path(root,original).read_bytes()).hexdigest()!=expected
    assert resolve_reference_path(root,'assets/references/not-recorded.png')==root/'assets/references/not-recorded.png'
    direct=root/original; direct.write_bytes(b'old location exists')
    assert resolve_reference_path(root,original)==direct
    direct.unlink()
    entries[0]['path']='../outside.png'
    manifest.write_text(json.dumps(dict(images=entries)),encoding='utf-8')
    try: resolve_reference_path(root,original)
    except ValueError: pass
    else: raise AssertionError('escaped reference root')
    entries[0]['path']=moved
    manifest.write_text(json.dumps(dict(images=entries+entries)),encoding='utf-8')
    try: resolve_reference_path(root,original)
    except ValueError: pass
    else: raise AssertionError('ambiguous identity accepted')
print('PASS: moved/direct/unmapped/hash-tamper/path-escape/ambiguous reference cases')
`;
  const result = spawnSync('python', ['-X', 'utf8', '-c', code], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
});
